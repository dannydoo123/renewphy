import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const bomService = {
  async calculateAvailableQuantity(productId: string, requestedQty: number): Promise<number> {
    const bom = await prisma.bOM.findMany({
      where: { productId },
      include: {
        material: {
          include: {
            inventory: true
          }
        }
      }
    });
    
    if (bom.length === 0) {
      return 0;
    }
    
    let maxProducible = requestedQty;
    
    for (const bomItem of bom) {
      const inventory = bomItem.material.inventory;
      if (!inventory) {
        return 0;
      }
      
      const requiredMaterial = Number(bomItem.quantity) * requestedQty;
      const availableMaterial = inventory.onHand;
      const possibleQty = Math.floor(availableMaterial / Number(bomItem.quantity));
      
      maxProducible = Math.min(maxProducible, possibleQty);
    }
    
    return Math.max(0, maxProducible);
  },
  
  async getMaterialRequirements(productId: string, quantity: number): Promise<any[]> {
    const bom = await prisma.bOM.findMany({
      where: { productId },
      include: {
        material: {
          include: {
            inventory: true
          }
        }
      }
    });
    
    return bom.map(bomItem => {
      const required = Number(bomItem.quantity) * quantity;
      const available = bomItem.material.inventory?.onHand || 0;
      const shortage = Math.max(0, required - available);
      
      return {
        materialId: bomItem.materialId,
        materialName: bomItem.material.name,
        materialCode: bomItem.material.code,
        required,
        available,
        shortage,
        unit: bomItem.material.unit
      };
    });
  },
  
  async updateMaterialConsumption(productId: string, actualQty: number): Promise<void> {
    const bom = await prisma.bOM.findMany({
      where: { productId },
      include: {
        material: {
          include: {
            inventory: true
          }
        }
      }
    });
    
    for (const bomItem of bom) {
      const consumed = Number(bomItem.quantity) * actualQty;
      const inventory = bomItem.material.inventory;
      
      if (inventory) {
        await prisma.inventory.update({
          where: { materialId: bomItem.materialId },
          data: {
            onHand: Math.max(0, inventory.onHand - consumed)
          }
        });
      }
    }
  }
};