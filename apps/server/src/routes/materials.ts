import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const materials = await prisma.material.findMany({
      include: {
        inventory: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(materials);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, code, unit, unitCost, description } = req.body;
    
    const material = await prisma.material.create({
      data: {
        name,
        code,
        unit,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        description
      }
    });
    
    res.status(201).json(material);
  } catch (error) {
    next(error);
  }
});

export { router as materialsRouter };