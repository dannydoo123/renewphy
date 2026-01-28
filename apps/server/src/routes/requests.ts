import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { bomService } from '../services/bomService';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const requests = await prisma.productionRequest.findMany({
      include: {
        company: true,
        product: true,
        user: true,
        schedules: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { companyId, productId, requestedQty, dueDate, priority, notes, createdBy } = req.body;
    
    const availableNow = await bomService.calculateAvailableQuantity(productId, requestedQty);
    
    const request = await prisma.productionRequest.create({
      data: {
        requestNumber: `REQ-${Date.now()}`,
        companyId,
        productId,
        requestedQty,
        availableNow,
        dueDate: new Date(dueDate),
        priority,
        notes,
        createdBy
      },
      include: {
        company: true,
        product: true
      }
    });
    
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});

export { router as requestsRouter };