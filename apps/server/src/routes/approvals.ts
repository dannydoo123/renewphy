import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { douOfficeService } from '../services/douOfficeService';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const approvals = await prisma.approval.findMany({
      include: {
        requester: true,
        approver: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(approvals);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { type, referenceId, requesterId, overtimeMinutes, reason } = req.body;
    
    const approval = await prisma.approval.create({
      data: {
        type,
        referenceId,
        requesterId,
        overtimeMinutes,
        reason
      }
    });
    
    if (type === 'OVERTIME') {
      const taskId = await douOfficeService.createOvertimeApproval({
        approvalId: approval.id,
        overtimeMinutes,
        reason,
        requesterId
      });
      
      await prisma.approval.update({
        where: { id: approval.id },
        data: { douofficeTaskId: taskId }
      });
    }
    
    res.status(201).json(approval);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/approve', async (req, res, next) => {
  try {
    const { approverId } = req.body;
    
    const approval = await prisma.approval.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approverId,
        approvedAt: new Date()
      }
    });
    
    res.json(approval);
  } catch (error) {
    next(error);
  }
});

export { router as approvalsRouter };