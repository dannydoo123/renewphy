import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const KAKAOWORK_WEBHOOK = process.env.KAKAOWORK_WEBHOOK_URL;

export const notificationService = {
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type as any,
          title: data.title,
          message: data.message,
          data: data.data || {}
        }
      });
      
      await this.sendWebhookNotification(data.title, data.message);
      
      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  },
  
  async sendWebhookNotification(title: string, message: string) {
    const promises = [];
    
    if (SLACK_WEBHOOK) {
      promises.push(this.sendSlackNotification(title, message));
    }
    
    if (KAKAOWORK_WEBHOOK) {
      promises.push(this.sendKakaoWorkNotification(title, message));
    }
    
    await Promise.allSettled(promises);
  },
  
  async sendSlackNotification(title: string, message: string) {
    try {
      await axios.post(SLACK_WEBHOOK!, {
        text: `*${title}*\n${message}`,
        username: "생산일정시스템"
      });
      logger.info('Slack notification sent');
    } catch (error) {
      logger.error('Failed to send Slack notification:', error);
    }
  },
  
  async sendKakaoWorkNotification(title: string, message: string) {
    try {
      await axios.post(KAKAOWORK_WEBHOOK!, {
        text: `${title}\n${message}`
      });
      logger.info('KakaoWork notification sent');
    } catch (error) {
      logger.error('Failed to send KakaoWork notification:', error);
    }
  },
  
  async notifyScheduleChange(scheduleId: string, change: any) {
    try {
      const schedule = await prisma.productionSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          request: {
            include: {
              company: true,
              product: true
            }
          }
        }
      });
      
      if (!schedule) return;
      
      const title = '생산 일정 변경 알림';
      const message = `${schedule.request.company.name} - ${schedule.request.product.name}\n` +
                     `일정: ${schedule.scheduledDate.toLocaleDateString()}\n` +
                     `변경사항: ${change.field} (${change.oldValue} → ${change.newValue})`;
      
      await this.sendWebhookNotification(title, message);
    } catch (error) {
      logger.error('Failed to notify schedule change:', error);
    }
  },
  
  async notifyMaterialShortage(materialId: string, required: number, available: number) {
    try {
      const material = await prisma.material.findUnique({
        where: { id: materialId }
      });
      
      if (!material) return;
      
      const title = '자재 부족 경고';
      const message = `자재: ${material.name} (${material.code})\n` +
                     `필요량: ${required} ${material.unit}\n` +
                     `보유량: ${available} ${material.unit}\n` +
                     `부족량: ${required - available} ${material.unit}`;
      
      await this.sendWebhookNotification(title, message);
    } catch (error) {
      logger.error('Failed to notify material shortage:', error);
    }
  }
};