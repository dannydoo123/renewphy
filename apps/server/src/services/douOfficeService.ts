import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const DOUOFFICE_API_BASE = process.env.DOUOFFICE_API_BASE;
const DOUOFFICE_API_KEY = process.env.DOUOFFICE_API_KEY;

export const douOfficeService = {
  async createOvertimeApproval(data: {
    approvalId: string;
    overtimeMinutes: number;
    reason: string;
    requesterId: string;
  }): Promise<string | null> {
    try {
      if (!DOUOFFICE_API_BASE || !DOUOFFICE_API_KEY) {
        logger.warn('DouOffice API not configured, using mock response');
        return `MOCK-TASK-${Date.now()}`;
      }
      
      const response = await axios.post(`${DOUOFFICE_API_BASE}/api/approvals/overtime`, {
        externalId: data.approvalId,
        overtimeHours: Math.ceil(data.overtimeMinutes / 60),
        reason: data.reason,
        requesterId: data.requesterId,
        webhookUrl: `${process.env.SERVER_URL}/api/webhooks/douoffice`
      }, {
        headers: {
          'Authorization': `Bearer ${DOUOFFICE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.taskId;
    } catch (error) {
      logger.error('Failed to create DouOffice approval:', error);
      return null;
    }
  },
  
  async handleApprovalWebhook(data: any): Promise<void> {
    try {
      const { externalId, status, taskId } = data;
      
      const approval = await prisma.approval.update({
        where: { id: externalId },
        data: {
          status: status.toUpperCase(),
          approvedAt: status === 'approved' ? new Date() : null
        }
      });
      
      if (status === 'approved' && approval.type === 'OVERTIME') {
        await this.updateScheduleWithOvertime(approval.referenceId, approval.overtimeMinutes || 0);
      }
      
      logger.info(`DouOffice approval ${externalId} ${status}`);
    } catch (error) {
      logger.error('Failed to handle DouOffice webhook:', error);
    }
  },
  
  async updateScheduleWithOvertime(scheduleId: string, overtimeMinutes: number): Promise<void> {
    const prisma = require('@prisma/client').PrismaClient;
    const db = new prisma();
    
    try {
      await db.productionSchedule.update({
        where: { id: scheduleId },
        data: {
          overtimeMinutes,
          effectiveCapacityQty: {
            increment: Math.floor(overtimeMinutes * 150 / 60) // 150 units per hour
          }
        }
      });
    } catch (error) {
      logger.error('Failed to update schedule with overtime:', error);
    } finally {
      await db.$disconnect();
    }
  }
};