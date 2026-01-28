import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. 사용자 생성
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      name: '관리자',
      role: 'ADMIN'
    }
  });

  const planner = await prisma.user.upsert({
    where: { email: 'planner@company.com' },
    update: {},
    create: {
      email: 'planner@company.com',
      name: '생산계획담당자',
      role: 'PLANNER'
    }
  });

  const materialManager = await prisma.user.upsert({
    where: { email: 'material@company.com' },
    update: {},
    create: {
      email: 'material@company.com',
      name: '자재담당자',
      role: 'MATERIAL'
    }
  });

  // 2. 회사 생성 (서로 다른 등급)
  const companyS = await prisma.company.upsert({
    where: { code: 'COMP-S001' },
    update: {},
    create: {
      name: '삼성전자',
      code: 'COMP-S001',
      rank: 'S',
      priority: 1,
      contactInfo: {
        phone: '02-1234-5678',
        email: 'order@samsung.com',
        address: '서울시 강남구'
      }
    }
  });

  const companyA = await prisma.company.upsert({
    where: { code: 'COMP-A001' },
    update: {},
    create: {
      name: 'LG전자',
      code: 'COMP-A001',
      rank: 'A',
      priority: 2,
      contactInfo: {
        phone: '02-2345-6789',
        email: 'order@lg.com',
        address: '서울시 서초구'
      }
    }
  });

  const companyB = await prisma.company.upsert({
    where: { code: 'COMP-B001' },
    update: {},
    create: {
      name: '현대자동차',
      code: 'COMP-B001',
      rank: 'B',
      priority: 3,
      contactInfo: {
        phone: '02-3456-7890',
        email: 'order@hyundai.com',
        address: '서울시 강서구'
      }
    }
  });

  // 3. 제품 생성
  const productA = await prisma.product.upsert({
    where: { code: 'PROD-A001' },
    update: {},
    create: {
      name: '전자부품 A타입',
      code: 'PROD-A001',
      description: '고성능 전자부품',
      unitPrice: 15000
    }
  });

  const productB = await prisma.product.upsert({
    where: { code: 'PROD-B001' },
    update: {},
    create: {
      name: '전자부품 B타입',
      code: 'PROD-B001',
      description: '표준 전자부품',
      unitPrice: 12000
    }
  });

  const productC = await prisma.product.upsert({
    where: { code: 'PROD-C001' },
    update: {},
    create: {
      name: '자동차부품 C타입',
      code: 'PROD-C001',
      description: '자동차용 특수부품',
      unitPrice: 25000
    }
  });

  // 4. 원자재 생성
  const materials = [
    { name: '구리선', code: 'MAT-001', unit: 'kg', unitCost: 8000 },
    { name: '플라스틱 수지', code: 'MAT-002', unit: 'kg', unitCost: 3000 },
    { name: '실리콘', code: 'MAT-003', unit: 'kg', unitCost: 12000 },
    { name: '철강', code: 'MAT-004', unit: 'kg', unitCost: 2500 },
    { name: '알루미늄', code: 'MAT-005', unit: 'kg', unitCost: 4500 },
  ];

  const createdMaterials = [];
  for (const material of materials) {
    const created = await prisma.material.upsert({
      where: { code: material.code },
      update: {},
      create: material
    });
    createdMaterials.push(created);
  }

  // 5. 재고 생성
  const inventoryData = [
    { materialId: createdMaterials[0].id, onHand: 500, onOrder: 200, leadTimeDays: 7, safetyStock: 100 },
    { materialId: createdMaterials[1].id, onHand: 800, onOrder: 0, leadTimeDays: 5, safetyStock: 150 },
    { materialId: createdMaterials[2].id, onHand: 50, onOrder: 100, leadTimeDays: 14, safetyStock: 80 }, // 부족 상황
    { materialId: createdMaterials[3].id, onHand: 1200, onOrder: 300, leadTimeDays: 10, safetyStock: 200 },
    { materialId: createdMaterials[4].id, onHand: 300, onOrder: 150, leadTimeDays: 8, safetyStock: 120 },
  ];

  for (const inventory of inventoryData) {
    await prisma.inventory.upsert({
      where: { materialId: inventory.materialId },
      update: inventory,
      create: {
        ...inventory,
        nextInboundDate: inventory.onOrder > 0 
          ? new Date(Date.now() + inventory.leadTimeDays * 24 * 60 * 60 * 1000)
          : null
      }
    });
  }

  // 6. BOM 생성
  const bomData = [
    // 제품 A의 BOM
    { productId: productA.id, materialId: createdMaterials[0].id, quantity: 0.5 }, // 구리선 0.5kg
    { productId: productA.id, materialId: createdMaterials[1].id, quantity: 0.3 }, // 플라스틱 0.3kg
    { productId: productA.id, materialId: createdMaterials[2].id, quantity: 0.1 }, // 실리콘 0.1kg
    
    // 제품 B의 BOM
    { productId: productB.id, materialId: createdMaterials[0].id, quantity: 0.3 },
    { productId: productB.id, materialId: createdMaterials[1].id, quantity: 0.4 },
    
    // 제품 C의 BOM
    { productId: productC.id, materialId: createdMaterials[3].id, quantity: 1.2 }, // 철강 1.2kg
    { productId: productC.id, materialId: createdMaterials[4].id, quantity: 0.8 }, // 알루미늄 0.8kg
  ];

  for (const bom of bomData) {
    await prisma.bOM.upsert({
      where: {
        productId_materialId: {
          productId: bom.productId,
          materialId: bom.materialId
        }
      },
      update: {},
      create: bom
    });
  }

  // 7. Shift 모델 생성 (예시 모델들)
  const shiftModels = [
    {
      name: '풀 2교대 - 고속',
      shiftsPerDay: 2,
      minutesPerShift: 480, // 8시간
      cleanupMinutes: 60,
      changeoverMinutes: 30,
      speedPerMinute: 150,
      defectRate: 0.05,
      isActive: true
    },
    {
      name: '풀 2교대 - 표준',
      shiftsPerDay: 2,
      minutesPerShift: 480,
      cleanupMinutes: 60,
      changeoverMinutes: 30,
      speedPerMinutes: 120,
      defectRate: 0.03,
      isActive: false
    },
    {
      name: '3교대 - 연속',
      shiftsPerDay: 3,
      minutesPerShift: 480,
      cleanupMinutes: 90,
      changeoverMinutes: 45,
      speedPerMinute: 100,
      defectRate: 0.07,
      isActive: false
    }
  ];

  const createdShifts = [];
  for (const shift of shiftModels) {
    const created = await prisma.shiftModel.create({
      data: shift
    });
    createdShifts.push(created);
  }

  // 8. 생산 요청 생성
  const requests = [
    {
      requestNumber: 'REQ-20241201-001',
      companyId: companyS.id,
      productId: productA.id,
      requestedQty: 5000,
      availableNow: 1000, // BOM 기준으로 계산된 값
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2주 후
      priority: 'HIGH',
      status: 'APPROVED',
      notes: '긴급 주문건',
      createdBy: planner.id
    },
    {
      requestNumber: 'REQ-20241201-002',
      companyId: companyA.id,
      productId: productB.id,
      requestedQty: 3000,
      availableNow: 2000,
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3주 후
      priority: 'MEDIUM',
      status: 'PENDING',
      notes: '정기 주문',
      createdBy: planner.id
    },
    {
      requestNumber: 'REQ-20241201-003',
      companyId: companyB.id,
      productId: productC.id,
      requestedQty: 1500,
      availableNow: 250, // 재료 부족으로 제한
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 한달 후
      priority: 'LOW',
      status: 'PENDING',
      notes: '분할 생산 가능',
      createdBy: planner.id
    }
  ];

  const createdRequests = [];
  for (const request of requests) {
    const created = await prisma.productionRequest.create({
      data: request
    });
    createdRequests.push(created);
  }

  // 9. 생산 일정 생성
  const schedules = [
    {
      requestId: createdRequests[0].id,
      scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3일 후
      plannedQty: 1000,
      effectiveCapacityQty: 9500, // 계산된 일일 용량
      overtimeMinutes: 0,
      workStage: 'MIXING',
      status: 'PLANNED',
      notes: '첫 번째 배치'
    },
    {
      requestId: createdRequests[0].id,
      scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5일 후
      plannedQty: 2000,
      effectiveCapacityQty: 9500,
      overtimeMinutes: 0,
      workStage: 'MIXING',
      status: 'PLANNED',
      notes: '두 번째 배치'
    },
    {
      requestId: createdRequests[1].id,
      scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 일주일 후
      plannedQty: 2000,
      actualQty: 1950, // 실제 생산량
      effectiveCapacityQty: 9500,
      overtimeMinutes: 0,
      workStage: 'PACKAGING',
      status: 'COMPLETED',
      notes: '완료된 배치'
    }
  ];

  for (const schedule of schedules) {
    await prisma.productionSchedule.create({
      data: schedule
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });