import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { format } from 'date-fns';
import { changeTracker } from '../services/changeTracker';

const router = Router();

// Prisma client 초기화 함수
let prisma: PrismaClient | null = null;
let prismaInitialized = false;

async function initPrisma() {
  if (prismaInitialized) return prisma;
  
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
    console.log('Prisma 클라이언트 초기화 성공');
    prismaInitialized = true;
    return prisma;
  } catch (error) {
    console.log('데이터베이스 연결 실패, 메모리 저장소 사용');
    prisma = null;
    prismaInitialized = true;
    return null;
  }
}

// 안전한 Prisma 접근 헬퍼
async function safePrismaCall<T>(operation: (prisma: PrismaClient) => Promise<T>): Promise<T | null> {
  try {
    await initPrisma();
    if (prisma) {
      return await operation(prisma);
    }
    return null;
  } catch (error) {
    console.log('Prisma 작업 실패, 메모리 저장소로 fallback');
    return null;
  }
}

// 초기화 실행
initPrisma();

// 임시 메모리 저장소 (데이터베이스 연결 문제 시 사용)
declare global {
  var memoryOrderPlans: any[] | undefined;
  var orderIdCounter: number | undefined;
  var memoryActivityLogs: any[] | undefined;
}

if (!global.memoryOrderPlans) {
  global.memoryOrderPlans = [];
}
if (!global.orderIdCounter) {
  global.orderIdCounter = 1;
}
if (!global.memoryActivityLogs) {
  global.memoryActivityLogs = [];
}

// 발주 계획 목록 조회
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    let orderPlans;
    
    try {
      // 안전한 데이터베이스 조회
      let where = {};
      if (start && end) {
        where = {
          desiredDate: {
            gte: new Date(start as string),
            lte: new Date(end as string)
          }
        };
      }

      orderPlans = await safePrismaCall(async (prisma) => {
        return await prisma.orderPlan.findMany({
          where,
          orderBy: {
            desiredDate: 'asc'
          }
        });
      });

      if (!orderPlans) {
        throw new Error('Database operation failed');
      }
    } catch (dbError) {
      console.log('데이터베이스 연결 실패, 메모리 저장소 사용');
      // 메모리 저장소 사용
      orderPlans = (global.memoryOrderPlans || []).filter(plan => {
        if (!start || !end) return true;
        const planDate = new Date(plan.desiredDate);
        return planDate >= new Date(start as string) && planDate <= new Date(end as string);
      }).sort((a, b) => new Date(a.desiredDate).getTime() - new Date(b.desiredDate).getTime());
    }

    res.json({
      success: true,
      data: orderPlans
    });
  } catch (error) {
    console.error('발주 계획 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '발주 계획을 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 발주 계획 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let orderPlan;
    
    try {
      // Prisma 초기화 확인
      await initPrisma();
      
      if (prisma) {
        orderPlan = await prisma.orderPlan.findUnique({
          where: { id: parseInt(id) }
        });
      } else {
        throw new Error('Prisma client not available');
      }
    } catch (dbError) {
      console.log('데이터베이스 연결 실패, 메모리 저장소 사용');
      // 메모리 저장소에서 조회
      orderPlan = (global.memoryOrderPlans || []).find(plan => plan.id === parseInt(id));
    }

    if (!orderPlan) {
      return res.status(404).json({
        success: false,
        message: '발주 계획을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: orderPlan
    });
  } catch (error) {
    console.error('발주 계획 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '발주 계획을 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 다음 발주번호 조회
router.get('/next-order-number', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear().toString().slice(-2); // 25 for 2025
    
    // 현재 연도의 마지막 발주번호 조회
    const lastOrder = await prisma.orderPlan.findFirst({
      where: {
        orderNumber: {
          startsWith: currentYear + '-'
        }
      },
      orderBy: {
        orderNumber: 'desc'
      }
    });

    let nextNumber = 1;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.orderNumber.split('-')[1]);
      nextNumber = lastNumber + 1;
    }

    const nextOrderNumber = `${currentYear}-${nextNumber}`;

    res.json({
      success: true,
      data: { nextOrderNumber }
    });
  } catch (error) {
    console.error('다음 발주번호 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '다음 발주번호를 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 발주 계획 생성
router.post('/', async (req, res) => {
  try {
    const {
      orderNumber,
      companyName,
      productName,
      orderQuantity,
      desiredDate,
      deliveryDate,
      details
    } = req.body;

    // 유효성 검사
    if (!orderNumber || !companyName || !productName || !orderQuantity || !desiredDate || !deliveryDate) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다.'
      });
    }

    let orderPlan;
    
    try {
      // Prisma 초기화 확인
      await initPrisma();
      
      // 데이터베이스 시도 (Prisma 클라이언트가 있을 때만)
      if (prisma) {
        // 발주번호 중복 체크
        const existingOrder = await prisma.orderPlan.findFirst({
          where: { orderNumber }
        });

        if (existingOrder) {
          return res.status(400).json({
            success: false,
            message: '이미 존재하는 발주번호입니다.'
          });
        }
      } else {
        throw new Error('Prisma client not available');
      }

      // 발주 계획 생성
      if (prisma) {
        orderPlan = await prisma.orderPlan.create({
          data: {
            orderNumber,
            companyName,
            productName,
            orderQuantity: parseInt(orderQuantity),
            desiredDate: new Date(desiredDate),
            deliveryDate: new Date(deliveryDate),
            details: details || null
          }
        });

        // 활동 로그 생성
        await prisma.activityLog.create({
          data: {
            type: 'ORDER_PLAN_CREATED',
            title: '발주 계획이 생성되었습니다',
            description: `${companyName} - ${productName} (${orderNumber})`,
            data: {
              orderPlanId: orderPlan.id,
              orderNumber: orderPlan.orderNumber,
              companyName,
              productName,
              orderQuantity
            }
          }
        });
      }
    } catch (dbError) {
      console.log('데이터베이스 연결 실패, 메모리 저장소 사용');
      // 메모리 저장소 사용
      // 발주번호 중복 체크
      const existingOrder = (global.memoryOrderPlans || []).find(plan => plan.orderNumber === orderNumber);
      if (existingOrder) {
        return res.status(400).json({
          success: false,
          message: '이미 존재하는 발주번호입니다.'
        });
      }

      // 발주 계획 생성
      orderPlan = {
        id: global.orderIdCounter++,
        orderNumber,
        companyName,
        productName,
        orderQuantity: parseInt(orderQuantity),
        workType: 'MIXING',
        status: 'PLANNED',
        desiredDate: new Date(desiredDate).toISOString(),
        deliveryDate: new Date(deliveryDate).toISOString(),
        details: details || null,
        weight: null,
        repeatProgress: 0,
        repeatCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      global.memoryOrderPlans.push(orderPlan);

      // 활동 로그 생성
      const activityLog = {
        id: (global.memoryActivityLogs?.length || 0) + 1,
        type: 'ORDER_PLAN_CREATED',
        title: '발주 계획이 생성되었습니다',
        description: `${companyName} - ${productName} (${orderNumber})`,
        data: {
          orderPlanId: orderPlan.id,
          orderNumber: orderPlan.orderNumber,
          companyName,
          productName,
          orderQuantity
        },
        createdAt: new Date().toISOString()
      };
      
      if (!global.memoryActivityLogs) {
        global.memoryActivityLogs = [];
      }
      global.memoryActivityLogs.push(activityLog);
    }

    res.status(201).json({
      success: true,
      data: orderPlan,
      message: '발주 계획이 성공적으로 생성되었습니다.'
    });
  } catch (error) {
    console.error('발주 계획 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '발주 계획을 생성하는 중 오료가 발생했습니다.',
      error: error.message
    });
  }
});

// 발주 계획 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('받은 업데이트 데이터:', updateData);

    // 기존 데이터 조회
    let existingOrderPlan = await safePrismaCall(async (prisma) => {
      return await prisma.orderPlan.findUnique({
        where: { id: parseInt(id) }
      });
    });

    if (!existingOrderPlan) {
      // 메모리 저장소에서 조회
      existingOrderPlan = (global.memoryOrderPlans || []).find(plan => plan.id === parseInt(id));
    }

    if (!existingOrderPlan) {
      return res.status(404).json({
        success: false,
        message: '발주 계획을 찾을 수 없습니다.'
      });
    }
    
    console.log('기존 데이터:', existingOrderPlan);

    // 날짜 필드 변환
    const processedData = {};
    
    // 각 필드를 명시적으로 처리
    if (updateData.workType !== undefined) {
      processedData.workType = updateData.workType;
    }
    if (updateData.status !== undefined) {
      processedData.status = updateData.status;
    }
    if (updateData.desiredDate !== undefined) {
      processedData.desiredDate = new Date(updateData.desiredDate);
    }
    if (updateData.deliveryDate !== undefined) {
      processedData.deliveryDate = new Date(updateData.deliveryDate);
    }
    if (updateData.orderQuantity !== undefined) {
      processedData.orderQuantity = parseInt(updateData.orderQuantity);
    }
    if (updateData.weight !== undefined) {
      processedData.weight = updateData.weight ? parseInt(updateData.weight) : null;
    }
    if (updateData.repeatProgress !== undefined) {
      processedData.repeatProgress = parseInt(updateData.repeatProgress);
    }
    if (updateData.repeatCount !== undefined) {
      processedData.repeatCount = parseInt(updateData.repeatCount);
    }
    
    console.log('처리된 데이터:', processedData);

    // 발주 계획 수정
    // 변경사항 추적
    const changeId = changeTracker.trackOrderPlanChanges(
      id,
      existingOrderPlan.companyName,
      existingOrderPlan.productName,
      existingOrderPlan,
      processedData
    );

    let updatedOrderPlan = await safePrismaCall(async (prisma) => {
      const updated = await prisma.orderPlan.update({
        where: { id: parseInt(id) },
        data: processedData
      });

      // 변경사항이 있을 때만 활동 로그 생성
      if (changeId) {
        const changeRecord = changeTracker.getChangeById(changeId);
        
        await prisma.activityLog.create({
          data: {
            type: 'ORDER_PLAN_UPDATED',
            title: '발주 계획이 수정되었습니다',
            description: `${updated.companyName} - ${updated.productName}\n${changeRecord?.summary || '변경사항이 기록되었습니다.'}`,
            data: {
              orderPlanId: updated.id,
              orderNumber: updated.orderNumber,
              companyName: updated.companyName,
              productName: updated.productName,
              changeId: changeId,
              changeRecord: changeRecord
            }
          }
        });
      }

      return updated;
    });

    if (!updatedOrderPlan) {
      // 메모리 저장소에서 수정
      const planIndex = (global.memoryOrderPlans || []).findIndex(plan => plan.id === parseInt(id));
      if (planIndex !== -1) {
        global.memoryOrderPlans[planIndex] = { 
          ...global.memoryOrderPlans[planIndex], 
          ...processedData,
          updatedAt: new Date().toISOString()
        };
        updatedOrderPlan = global.memoryOrderPlans[planIndex];
        
        // 변경사항이 있을 때만 메모리 활동 로그 생성
        if (changeId) {
          const changeRecord = changeTracker.getChangeById(changeId);
          
          if (!global.memoryActivityLogs) {
            global.memoryActivityLogs = [];
          }
          const activityLog = {
            id: (global.memoryActivityLogs?.length || 0) + 1,
            type: 'ORDER_PLAN_UPDATED',
            title: '발주 계획이 수정되었습니다',
            description: `${updatedOrderPlan.companyName} - ${updatedOrderPlan.productName}\n${changeRecord?.summary || '변경사항이 기록되었습니다.'}`,
            data: {
              orderPlanId: updatedOrderPlan.id,
              orderNumber: updatedOrderPlan.orderNumber,
              companyName: updatedOrderPlan.companyName,
              productName: updatedOrderPlan.productName,
              changeId: changeId,
              changeRecord: changeRecord
            },
            createdAt: new Date().toISOString()
          };
          global.memoryActivityLogs.push(activityLog);
        }
      }
    }

    res.json({
      success: true,
      data: updatedOrderPlan,
      message: '발주 계획이 성공적으로 수정되었습니다.'
    });
  } catch (error) {
    console.error('발주 계획 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '발주 계획을 수정하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 발주 계획 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let orderPlan;
    
    // Prisma 초기화 확인
    await initPrisma();
    
    // 기존 데이터 조회 및 삭제
    if (prisma) {
      orderPlan = await prisma.orderPlan.findUnique({
        where: { id: parseInt(id) }
      });

      if (!orderPlan) {
        return res.status(404).json({
          success: false,
          message: '발주 계획을 찾을 수 없습니다.'
        });
      }

      await prisma.orderPlan.delete({
        where: { id: parseInt(id) }
      });

      // 활동 로그 생성
      await prisma.activityLog.create({
        data: {
          type: 'ORDER_PLAN_DELETED',
          title: '발주 계획이 삭제되었습니다',
          description: `${orderPlan.companyName} - ${orderPlan.productName} (${orderPlan.orderNumber})`,
          data: {
            orderPlanId: orderPlan.id,
            orderNumber: orderPlan.orderNumber
          }
        }
      });
    } else {
      // 메모리 저장소에서 조회 및 삭제
      const planIndex = (global.memoryOrderPlans || []).findIndex(plan => plan.id === parseInt(id));
      if (planIndex === -1) {
        return res.status(404).json({
          success: false,
          message: '발주 계획을 찾을 수 없습니다.'
        });
      }
      
      orderPlan = global.memoryOrderPlans[planIndex];
      global.memoryOrderPlans.splice(planIndex, 1);
      
      // 활동 로그 생성 (메모리)
      if (!global.memoryActivityLogs) {
        global.memoryActivityLogs = [];
      }
      const activityLog = {
        id: (global.memoryActivityLogs?.length || 0) + 1,
        type: 'ORDER_PLAN_DELETED',
        title: '발주 계획이 삭제되었습니다',
        description: `${orderPlan.companyName} - ${orderPlan.productName} (${orderPlan.orderNumber})`,
        data: {
          orderPlanId: orderPlan.id,
          orderNumber: orderPlan.orderNumber
        },
        createdAt: new Date().toISOString()
      };
      global.memoryActivityLogs.push(activityLog);
    }

    res.json({
      success: true,
      message: '발주 계획이 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('발주 계획 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '발주 계획을 삭제하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

export default router;