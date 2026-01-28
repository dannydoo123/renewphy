import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/product/:productId', async (req, res, next) => {
  try {
    const bom = await prisma.bOM.findMany({
      where: { productId: req.params.productId },
      include: {
        material: {
          include: {
            inventory: true
          }
        }
      }
    });
    res.json(bom);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { productId, materialId, quantity } = req.body;
    
    const bomItem = await prisma.bOM.create({
      data: {
        productId,
        materialId,
        quantity: parseFloat(quantity)
      },
      include: {
        material: true,
        product: true
      }
    });
    
    res.status(201).json(bomItem);
  } catch (error) {
    next(error);
  }
});

export { router as bomRouter };