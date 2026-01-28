import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        material: true
      }
    });
    res.json(inventory);
  } catch (error) {
    next(error);
  }
});

router.put('/:materialId', async (req, res, next) => {
  try {
    const { onHand, onOrder, leadTimeDays, nextInboundDate, safetyStock } = req.body;
    
    const inventory = await prisma.inventory.upsert({
      where: { materialId: req.params.materialId },
      update: {
        onHand: onHand || 0,
        onOrder: onOrder || 0,
        leadTimeDays: leadTimeDays || 7,
        nextInboundDate: nextInboundDate ? new Date(nextInboundDate) : null,
        safetyStock: safetyStock || 0
      },
      create: {
        materialId: req.params.materialId,
        onHand: onHand || 0,
        onOrder: onOrder || 0,
        leadTimeDays: leadTimeDays || 7,
        nextInboundDate: nextInboundDate ? new Date(nextInboundDate) : null,
        safetyStock: safetyStock || 0
      },
      include: {
        material: true
      }
    });
    
    res.json(inventory);
  } catch (error) {
    next(error);
  }
});

export { router as inventoryRouter };