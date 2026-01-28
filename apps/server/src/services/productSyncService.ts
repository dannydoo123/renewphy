import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface EcountProduct {
  prodCd: string;
  prodNm: string;
  [key: string]: any;
}

interface EcountApiResponse {
  success: boolean;
  data?: {
    data?: EcountProduct[];
  };
  message?: string;
}

class ProductSyncService {
  private readonly ECOUNT_API_BASE = process.env.ECOUNT_API_BASE || 'http://localhost:3001/api';

  async syncProducts(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log('🔄 제품 동기화 시작...');
      
      // ECOUNT API에서 제품 데이터 가져오기
      const products = await this.fetchProductsFromEcount();
      
      if (!products || products.length === 0) {
        console.log('⚠️ ECOUNT에서 제품 데이터를 가져올 수 없습니다.');
        return {
          success: false,
          message: 'ECOUNT에서 제품 데이터를 가져올 수 없습니다.'
        };
      }

      console.log(`📦 ${products.length}개의 제품 데이터를 가져왔습니다.`);

      // 기존 캐시 데이터 삭제 및 새 데이터 삽입 (upsert 대신 replace 방식)
      await prisma.$transaction(async (tx) => {
        // 기존 데이터 삭제
        await tx.productCache.deleteMany();
        
        // 새 데이터 삽입
        const cacheData = products.map(product => ({
          productCode: product.prodCd,
          productName: product.prodNm,
          syncedAt: new Date()
        }));

        // 배치 삽입 (성능 최적화)
        const batchSize = 100;
        for (let i = 0; i < cacheData.length; i += batchSize) {
          const batch = cacheData.slice(i, i + batchSize);
          await tx.productCache.createMany({
            data: batch,
            skipDuplicates: true
          });
        }
      });

      console.log(`✅ ${products.length}개 제품이 캐시에 동기화되었습니다.`);
      
      return {
        success: true,
        message: `${products.length}개 제품이 성공적으로 동기화되었습니다.`,
        count: products.length
      };

    } catch (error) {
      console.error('❌ 제품 동기화 실패:', error);
      return {
        success: false,
        message: `제품 동기화 실패: ${error.message}`
      };
    }
  }

  private async fetchProductsFromEcount(): Promise<EcountProduct[]> {
    try {
      // ECOUNT API 호출
      const response = await axios.get<EcountApiResponse>(
        `${this.ECOUNT_API_BASE}/ecount-python/product-basic`,
        {
          timeout: 30000, // 30초 타임아웃
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'ECOUNT API 호출 실패');
      }

      return response.data.data?.data || [];
    } catch (error) {
      if (error.response) {
        console.error('ECOUNT API 응답 오류:', error.response.status, error.response.data);
        throw new Error(`ECOUNT API 오류 (${error.response.status}): ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('ECOUNT API 요청 오류:', error.message);
        throw new Error('ECOUNT API에 연결할 수 없습니다. 네트워크를 확인해주세요.');
      } else {
        console.error('제품 동기화 오류:', error.message);
        throw error;
      }
    }
  }

  // 캐시된 제품 검색 (자동완성용) - 성능 최적화
  async searchProducts(searchTerm: string, limit: number = 10): Promise<Array<{id: number; productCode: string; productName: string}>> {
    try {
      // 검색어가 너무 짧으면 빈 결과 반환
      if (!searchTerm || searchTerm.trim().length < 1) {
        return [];
      }

      const trimmedTerm = searchTerm.trim();
      
      // 정확히 일치하는 것들을 먼저 찾고, 그 다음 포함하는 것들 찾기
      const exactMatches = await prisma.productCache.findMany({
        where: {
          OR: [
            {
              productName: {
                startsWith: trimmedTerm,
                mode: 'insensitive'
              }
            },
            {
              productCode: {
                startsWith: trimmedTerm,
                mode: 'insensitive'
              }
            }
          ]
        },
        select: {
          id: true,
          productCode: true,
          productName: true,
        },
        orderBy: [
          {
            productName: 'asc'
          }
        ],
        take: limit
      });

      // 정확 일치 결과가 충분하면 그것만 반환
      if (exactMatches.length >= limit) {
        return exactMatches;
      }

      // 부족하면 포함 검색으로 추가 결과 가져오기
      const remainingLimit = limit - exactMatches.length;
      const exactMatchIds = exactMatches.map(p => p.id);
      
      const containsMatches = await prisma.productCache.findMany({
        where: {
          AND: [
            {
              id: {
                notIn: exactMatchIds // 이미 찾은 것들 제외
              }
            },
            {
              OR: [
                {
                  productName: {
                    contains: trimmedTerm,
                    mode: 'insensitive'
                  }
                },
                {
                  productCode: {
                    contains: trimmedTerm,
                    mode: 'insensitive'
                  }
                }
              ]
            }
          ]
        },
        select: {
          id: true,
          productCode: true,
          productName: true,
        },
        orderBy: [
          {
            productName: 'asc'
          }
        ],
        take: remainingLimit
      });

      // 정확 일치 + 포함 일치 결과 합치기
      return [...exactMatches, ...containsMatches];
    } catch (error) {
      console.error('제품 검색 오류:', error);
      throw error;
    }
  }

  // 캐시 상태 확인
  async getCacheStatus(): Promise<{totalProducts: number; lastSyncedAt: Date | null}> {
    try {
      const totalProducts = await prisma.productCache.count();
      const latestSync = await prisma.productCache.findFirst({
        orderBy: {
          syncedAt: 'desc'
        },
        select: {
          syncedAt: true
        }
      });

      return {
        totalProducts,
        lastSyncedAt: latestSync?.syncedAt || null
      };
    } catch (error) {
      console.error('캐시 상태 확인 오류:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
export const productSyncService = new ProductSyncService();