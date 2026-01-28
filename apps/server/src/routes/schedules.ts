import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { capacityService } from '../services/capacityService';
import { io } from '../index';
import { emitToAll } from '../socket';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    // Temporary mock data for demo purposes (no database required)
    const mockSchedules = [
      {
        id: 'mock-1',
        scheduledDate: '2025-08-21',
        workStage: '오븐',
        status: 'PLANNED',
        plannedQty: 500,
        actualQty: null,
        notes: 'Sample oven schedule',
        request: {
          company: { name: '데모 회사' },
          product: { name: '샘플 제품 1' }
        },
        changes: []
      },
      {
        id: 'mock-2',
        scheduledDate: '2025-08-22',
        workStage: '합조',
        status: 'PLANNED',
        plannedQty: 300,
        actualQty: null,
        notes: 'Sample mixing schedule',
        request: {
          company: { name: '데모 회사' },
          product: { name: '샘플 제품 2' }
        },
        changes: []
      }
    ];
    
    res.json(mockSchedules);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const schedule = await prisma.productionSchedule.findUnique({
      where: { id: req.params.id },
      include: {
        request: {
          include: {
            company: true,
            product: true
          }
        },
        changes: {
          include: {
            user: true
          },
          orderBy: {
            timestamp: 'desc'
          }
        },
        shiftCapacities: {
          include: {
            shiftModel: true
          }
        }
      }
    });
    
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    res.json(schedule);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { requestId, scheduledDate, plannedQty, workStage, shiftModelId, notes } = req.body;
    
    const effectiveCapacity = await capacityService.calculateEffectiveCapacity(
      shiftModelId, 
      new Date(scheduledDate)
    );
    
    if (plannedQty > effectiveCapacity) {
      return res.status(400).json({
        error: 'Planned quantity exceeds capacity',
        capacity: effectiveCapacity,
        suggestion: effectiveCapacity
      });
    }
    
    const schedule = await prisma.productionSchedule.create({
      data: {
        requestId,
        scheduledDate: new Date(scheduledDate),
        plannedQty,
        effectiveCapacityQty: effectiveCapacity,
        workStage,
        notes
      },
      include: {
        request: {
          include: {
            company: true,
            product: true
          }
        }
      }
    });
    
    emitToAll(io, 'schedule:created', schedule);
    
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { plannedQty, actualQty, workStage, status, notes, overtimeMinutes } = req.body;
    const userId = req.user?.id || 'system';
    
    const existingSchedule = await prisma.productionSchedule.findUnique({
      where: { id: req.params.id }
    });
    
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    const updatedSchedule = await prisma.$transaction(async (tx) => {
      const schedule = await tx.productionSchedule.update({
        where: { id: req.params.id },
        data: {
          plannedQty,
          actualQty,
          workStage,
          status,
          notes,
          overtimeMinutes: overtimeMinutes || 0
        },
        include: {
          request: {
            include: {
              company: true,
              product: true
            }
          }
        }
      });
      
      if (plannedQty !== existingSchedule.plannedQty) {
        await tx.scheduleChange.create({
          data: {
            scheduleId: req.params.id,
            userId,
            field: 'plannedQty',
            oldValue: existingSchedule.plannedQty.toString(),
            newValue: plannedQty.toString(),
            reason: 'Quantity adjustment'
          }
        });
      }
      
      if (actualQty && actualQty !== existingSchedule.actualQty) {
        await tx.scheduleChange.create({
          data: {
            scheduleId: req.params.id,
            userId,
            field: 'actualQty',
            oldValue: existingSchedule.actualQty?.toString() || 'null',
            newValue: actualQty.toString(),
            reason: 'Actual production recorded'
          }
        });
      }
      
      return schedule;
    });
    
    emitToAll(io, 'schedule:updated', updatedSchedule);
    
    res.json(updatedSchedule);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/changes', async (req, res, next) => {
  try {
    const changes = await prisma.scheduleChange.findMany({
      where: { scheduleId: req.params.id },
      include: {
        user: true
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
    
    res.json(changes);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.productionSchedule.delete({
      where: { id: req.params.id }
    });
    
    emitToAll(io, 'schedule:deleted', { id: req.params.id });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as schedulesRouter };