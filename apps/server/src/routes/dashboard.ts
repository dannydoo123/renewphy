import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Dashboard 통계 조회
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    console.log('Dashboard stats calculation for date range:', {
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString()
    });

    // 모든 발주 계획 조회 (오늘 날짜)
    const orderPlansQuery = await prisma.orderPlan.findMany({
      where: {
        desiredDate: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    console.log('Found order plans for today:', orderPlansQuery.length);

    // 오늘 일정 수 = 발주 계획 개수
    const todaySchedules = orderPlansQuery.length;

    // 완료율 계산 (생산완료 상태인 발주 계획의 비율)
    const completedOrders = orderPlansQuery.filter(order => 
      order.status === 'COMPLETED' || order.status === '생산완료'
    );
    const completionRate = todaySchedules > 0 
      ? Math.round((completedOrders.length / todaySchedules) * 100)
      : 0;

    // 지연 일정 계산 (오늘 이전 날짜의 미완료 발주 계획)
    const delayedOrdersQuery = await prisma.orderPlan.findMany({
      where: {
        desiredDate: {
          lt: todayStart
        },
        status: {
          notIn: ['COMPLETED', '생산완료']
        }
      }
    });
    
    console.log('Found delayed orders:', delayedOrdersQuery.length);
    const delayedSchedules = delayedOrdersQuery.length;

    // 오늘 용량 사용률 계산
    const todayTotalQuantity = orderPlansQuery.reduce((sum, order) => {
      const quantity = parseInt(order.orderQuantity?.toString() || '0') || 0;
      return sum + quantity;
    }, 0);

    // 기본 용량 (로컬스토리지에서 설정하므로 기본값 사용)
    const defaultCapacity = 100000; // 기본 10만개
    const capacityUtilization = Math.min(
      Math.round((todayTotalQuantity / defaultCapacity) * 100), 
      999
    );

    const stats = {
      todaySchedules,
      completionRate,
      delayedSchedules,
      capacityUtilization,
      todayTotalQuantity,
      lastUpdated: new Date().toISOString()
    };

    console.log('Dashboard stats result:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: '대시보드 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 용량 설정 저장을 위한 엔드포인트 (선택적)
router.post('/capacity', async (req: Request, res: Response) => {
  try {
    const { capacity } = req.body;
    
    // 여기서는 간단히 응답만. 실제로는 DB나 설정 파일에 저장 가능
    res.json({
      success: true,
      message: `용량이 ${capacity}로 설정되었습니다.`,
      capacity: parseInt(capacity)
    });
  } catch (error) {
    console.error('Capacity setting error:', error);
    res.status(500).json({
      success: false,
      message: '용량 설정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

export default router;