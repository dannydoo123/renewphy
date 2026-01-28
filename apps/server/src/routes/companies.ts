import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(companies);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        productionRequests: {
          include: {
            product: true,
            schedules: true
          }
        }
      }
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json(company);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, code, rank, priority, contactInfo } = req.body;
    
    const company = await prisma.company.create({
      data: {
        name,
        code,
        rank,
        priority: priority || 1,
        contactInfo
      }
    });
    
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, code, rank, priority, contactInfo } = req.body;
    
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: {
        name,
        code,
        rank,
        priority,
        contactInfo
      }
    });
    
    res.json(company);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.company.delete({
      where: { id: req.params.id }
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as companiesRouter };