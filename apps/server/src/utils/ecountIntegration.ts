import EcountService from '../services/ecountService';
import { EcountConfig } from '../config/ecount.config';

// 생산 관리 시스템과 Ecount ERP 연동 유틸리티
export class EcountIntegrationService {
  private ecountService: EcountService;
  
  constructor(environment: 'test' | 'production' = 'test') {
    const config = environment === 'production' ? EcountConfig.production : EcountConfig.test;
    this.ecountService = new EcountService(config);
  }

  // 1. 상품 정보 동기화
  async syncProducts() {
    try {
      console.log('Ecount에서 상품 정보 가져오는 중...');
      const response = await this.ecountService.getProducts({
        PageNo: 1,
        PageSize: 100
      });
      
      if (response.Status === 1 && response.Data) {
        console.log(`${response.Data.length}개 상품 정보 가져옴`);
        return response.Data;
      }
      
      throw new Error(`상품 정보 가져오기 실패: ${response.Message}`);
    } catch (error: any) {
      console.error('상품 동기화 실패:', error.message);
      throw error;
    }
  }

  // 2. 재고 정보 동기화
  async syncInventory() {
    try {
      console.log('Ecount에서 재고 정보 가져오는 중...');
      const response = await this.ecountService.getInventory();
      
      if (response.Status === 1 && response.Data) {
        console.log(`재고 정보 가져옴`);
        return response.Data;
      }
      
      throw new Error(`재고 정보 가져오기 실패: ${response.Message}`);
    } catch (error: any) {
      console.error('재고 동기화 실패:', error.message);
      throw error;
    }
  }

  // 3. 쇼핑몰 주문 정보 가져오기
  async syncShoppingMallOrders(startDate: string, endDate: string) {
    try {
      console.log(`쇼핑몰 주문 정보 가져오는 중 (${startDate} ~ ${endDate})...`);
      const response = await this.ecountService.getShoppingMallOrders({
        StartDate: startDate,
        EndDate: endDate
      });
      
      if (response.Status === 1 && response.Data) {
        console.log(`${response.Data.length}개 주문 정보 가져옴`);
        return response.Data;
      }
      
      throw new Error(`주문 정보 가져오기 실패: ${response.Message}`);
    } catch (error: any) {
      console.error('주문 동기화 실패:', error.message);
      throw error;
    }
  }

  // 4. 생산 계획을 Ecount로 전송
  async sendProductionPlan(productionData: {
    productCode: string;
    quantity: number;
    planDate: string;
    memo?: string;
  }) {
    try {
      console.log('생산 계획을 Ecount로 전송 중...');
      const response = await this.ecountService.createProductionPlan({
        ProductCode: productionData.productCode,
        Qty: productionData.quantity,
        PlanDate: productionData.planDate,
        Memo: productionData.memo
      });
      
      if (response.Status === 1) {
        console.log('생산 계획 전송 성공');
        return response.Data;
      }
      
      throw new Error(`생산 계획 전송 실패: ${response.Message}`);
    } catch (error: any) {
      console.error('생산 계획 전송 실패:', error.message);
      throw error;
    }
  }

  // 5. BOM 정보 가져오기
  async getBOMInfo(productCode: string) {
    try {
      console.log(`제품 ${productCode}의 BOM 정보 가져오는 중...`);
      const response = await this.ecountService.getBOM(productCode);
      
      if (response.Status === 1 && response.Data) {
        console.log('BOM 정보 가져옴');
        return response.Data;
      }
      
      throw new Error(`BOM 정보 가져오기 실패: ${response.Message}`);
    } catch (error: any) {
      console.error('BOM 정보 가져오기 실패:', error.message);
      throw error;
    }
  }

  // 6. 연결 상태 확인
  async checkConnection() {
    try {
      const isConnected = await this.ecountService.testConnection();
      console.log(`Ecount API 연결 상태: ${isConnected ? '성공' : '실패'}`);
      return isConnected;
    } catch (error: any) {
      console.error('연결 확인 실패:', error.message);
      return false;
    }
  }

  // 7. 전체 데이터 동기화
  async fullSync() {
    const results = {
      connection: false,
      products: null,
      inventory: null,
      orders: null,
      errors: [] as string[]
    };

    try {
      // 연결 확인
      results.connection = await this.checkConnection();
      if (!results.connection) {
        throw new Error('Ecount API 연결 실패');
      }

      // 상품 동기화
      try {
        results.products = await this.syncProducts();
      } catch (error: any) {
        results.errors.push(`상품 동기화 실패: ${error.message}`);
      }

      // 재고 동기화
      try {
        results.inventory = await this.syncInventory();
      } catch (error: any) {
        results.errors.push(`재고 동기화 실패: ${error.message}`);
      }

      // 최근 7일간 주문 동기화
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      try {
        results.orders = await this.syncShoppingMallOrders(startDate, endDate);
      } catch (error: any) {
        results.errors.push(`주문 동기화 실패: ${error.message}`);
      }

      console.log('전체 동기화 완료');
      return results;
      
    } catch (error: any) {
      console.error('전체 동기화 실패:', error.message);
      results.errors.push(`전체 동기화 실패: ${error.message}`);
      return results;
    }
  }
}

export default EcountIntegrationService;