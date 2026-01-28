import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { productSyncService } from '../services/productSyncService';
import { memoryProductService } from '../services/memoryProductService';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        boms: {
          include: {
            material: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// 제품 검색 엔드포인트 (자동완성용) - 메모리 서비스 사용
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    const searchTerm = q as string;
    const maxResults = limit ? parseInt(limit as string) : 15;

    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.json([]);
    }

    console.log(`🔍 제품 검색 요청: "${searchTerm}"`);
    
    // 메모리 기반 제품 데이터에서 검색
    const products = memoryProductService.searchProducts(searchTerm, maxResults);

    console.log(`📦 검색 결과: ${products.length}개 제품 발견`);
    if (products.length > 0) {
      console.log('첫 번째 결과:', products[0]);
    }

    res.json(products);
  } catch (error) {
    console.error('제품 검색 오류:', error);
    // 에러 발생 시 빈 배열 반환
    res.json([]);
  }
});

// 제품 캐시 수동 동기화 엔드포인트 (메모리 기반)
router.post('/sync', async (req, res, next) => {
  try {
    console.log('🔄 메모리 제품 데이터 수동 새로고침 시작...');
    const result = await memoryProductService.refresh();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        count: result.count
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('제품 동기화 오류:', error);
    res.status(500).json({
      success: false,
      message: '제품 동기화 중 오류가 발생했습니다.'
    });
  }
});

// 제품 캐시 상태 확인 엔드포인트 (메모리 기반)
router.get('/cache-status', async (req, res, next) => {
  try {
    const status = memoryProductService.getStatus();
    res.json({
      success: true,
      data: {
        totalProducts: status.productCount,
        isLoaded: status.isLoaded,
        isLoading: status.isLoading,
        lastSyncedAt: null // 메모리 기반이므로 null
      }
    });
  } catch (error) {
    console.error('캐시 상태 확인 오류:', error);
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        boms: {
          include: {
            material: {
              include: {
                inventory: true
              }
            }
          }
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, code, description, unitPrice } = req.body;
    
    const product = await prisma.product.create({
      data: {
        name,
        code,
        description,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null
      }
    });
    
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { name, code, description, unitPrice } = req.body;
    
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        code,
        description,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null
      }
    });
    
    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id }
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as productsRouter };