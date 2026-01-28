import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const capacityService = {
  async calculateEffectiveCapacity(shiftModelId: string, date: Date): Promise<number> {
    const shiftModel = await prisma.shiftModel.findUnique({
      where: { id: shiftModelId }
    });
    
    if (!shiftModel) {
      throw new Error('Shift model not found');
    }
    
    const totalMinutes = shiftModel.shiftsPerDay * shiftModel.minutesPerShift;
    const productiveMinutes = totalMinutes - shiftModel.cleanupMinutes - shiftModel.changeoverMinutes;
    const grossProduction = productiveMinutes * shiftModel.speedPerMinute;
    const effectiveProduction = grossProduction * (1 - Number(shiftModel.defectRate));
    
    return Math.floor(effectiveProduction);
  },
  
  async getDefaultShiftModel(): Promise<any> {
    return await prisma.shiftModel.findFirst({
      where: { isActive: true }
    });
  },
  
  async createShiftModel(data: any): Promise<any> {
    return await prisma.shiftModel.create({
      data: {
        name: data.name,
        shiftsPerDay: data.shiftsPerDay,
        minutesPerShift: data.minutesPerShift,
        cleanupMinutes: data.cleanupMinutes || 60,
        changeoverMinutes: data.changeoverMinutes || 30,
        speedPerMinute: data.speedPerMinute,
        defectRate: data.defectRate || 0.05,
        isActive: data.isActive ?? true
      }
    });
  },
  
  async calculateDailyCapacities(startDate: Date, endDate: Date): Promise<Map<string, number>> {
    const capacities = new Map<string, number>();
    const defaultShift = await this.getDefaultShiftModel();
    
    if (!defaultShift) {
      return capacities;
    }
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const capacity = await this.calculateEffectiveCapacity(defaultShift.id, current);
      capacities.set(dateKey, capacity);
      current.setDate(current.getDate() + 1);
    }
    
    return capacities;
  },
  
  async checkCapacityOverload(date: Date, additionalQty: number): Promise<{
    isOverloaded: boolean;
    currentLoad: number;
    capacity: number;
    suggestion?: number;
  }> {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    const existingSchedules = await prisma.productionSchedule.findMany({
      where: {
        scheduledDate: {
          gte: dateStart,
          lte: dateEnd
        },
        status: {
          not: 'CANCELLED'
        }
      }
    });
    
    const currentLoad = existingSchedules.reduce((sum, schedule) => sum + schedule.plannedQty, 0);
    const defaultShift = await this.getDefaultShiftModel();
    
    if (!defaultShift) {
      return {
        isOverloaded: false,
        currentLoad: 0,
        capacity: 0
      };
    }
    
    const capacity = await this.calculateEffectiveCapacity(defaultShift.id, date);
    const totalLoad = currentLoad + additionalQty;
    
    return {
      isOverloaded: totalLoad > capacity,
      currentLoad,
      capacity,
      suggestion: totalLoad > capacity ? Math.max(0, capacity - currentLoad) : undefined
    };
  }
};