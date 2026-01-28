import axios from 'axios';

// ecount API 설정
interface EcountConfig {
  baseURL: string;
  companyId: string;
  apiKey: string;
}

interface EcountApiResponse<T = any> {
  Status: number;
  Message: string;
  Data?: T;
}

class EcountService {
  private config: EcountConfig;

  constructor(config: EcountConfig) {
    this.config = config;
  }

  // 기본 API 요청 메서드
  private async makeRequest<T = any>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<EcountApiResponse<T>> {
    try {
      const url = `${this.config.baseURL}/${endpoint}`;
      
      // ecount API 요청 파라미터
      const params = {
        CompanyId: this.config.companyId,
        Key: this.config.apiKey,
        ...data
      };

      console.log(`요청 URL: ${url}`);
      console.log('요청 파라미터:', params);

      const response = await axios({
        method,
        url,
        params: method === 'GET' ? params : undefined,
        data: method === 'POST' ? params : undefined,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 30000,
        // 프록시 관련 설정 추가
        proxy: false,
        // HTTP 에이전트 설정
        httpAgent: new (require('http').Agent)({
          keepAlive: true,
          timeout: 30000,
        }),
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 500; // 407도 처리하도록
        }
      });

      console.log(`응답 상태: ${response.status}`);
      console.log('응답 데이터:', response.data);

      if (response.status === 407) {
        throw new Error('프록시 인증이 필요합니다. 다른 네트워크에서 시도해보세요.');
      }

      return response.data;
    } catch (error: any) {
      console.error('Ecount API Error:', error.message);
      if (error.response) {
        console.error('응답 상태:', error.response.status);
        console.error('응답 데이터:', error.response.data);
      }
      throw new Error(`Ecount API request failed: ${error.message}`);
    }
  }

  // API 연결 테스트 (간단한 엔드포인트)
  async testConnection(): Promise<boolean> {
    try {
      // BasicInfo/GetCompanyInfo 대신 더 간단한 엔드포인트 시도
      const result = await this.makeRequest('GET', 'BasicInfo/GetCompanyInfo');
      return result.Status === 1;
    } catch (error: any) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  }

  // 상품 목록 조회
  async getProducts(params?: {
    PageNo?: number;
    PageSize?: number;
    StartDate?: string;
    EndDate?: string;
  }): Promise<EcountApiResponse> {
    return this.makeRequest('GET', 'Product/GetProductList', params);
  }

  // 재고 조회
  async getInventory(params?: {
    ProductCode?: string;
    WhouseCode?: string;
  }): Promise<EcountApiResponse> {
    return this.makeRequest('GET', 'Inventory/GetInventoryList', params);
  }

  // 주문 목록 조회
  async getOrders(params?: {
    StartDate?: string;
    EndDate?: string;
    PageNo?: number;
    PageSize?: number;
  }): Promise<EcountApiResponse> {
    return this.makeRequest('GET', 'Order/GetOrderList', params);
  }

  // 생산 계획 등록
  async createProductionPlan(data: {
    ProductCode: string;
    Qty: number;
    PlanDate: string;
    Memo?: string;
  }): Promise<EcountApiResponse> {
    return this.makeRequest('POST', 'Production/InsertProductionPlan', data);
  }

  // BOM 조회
  async getBOM(productCode: string): Promise<EcountApiResponse> {
    return this.makeRequest('GET', 'Product/GetBOMList', {
      ProductCode: productCode
    });
  }

  // 쇼핑몰 주문 조회
  async getShoppingMallOrders(params?: {
    StartDate?: string;
    EndDate?: string;
    MallCode?: string;
  }): Promise<EcountApiResponse> {
    return this.makeRequest('GET', 'ShoppingMall/GetOrderList', params);
  }

  // 직접 URL 테스트 (디버깅용)
  async testDirectUrl(): Promise<string> {
    try {
      const testUrl = `${this.config.baseURL}/BasicInfo/GetCompanyInfo?CompanyId=${this.config.companyId}&Key=${this.config.apiKey}`;
      console.log('테스트 URL:', testUrl);
      
      const response = await axios.get(testUrl, {
        timeout: 30000,
        proxy: false,
        validateStatus: () => true // 모든 상태 코드 허용
      });
      
      return `상태: ${response.status}, 데이터: ${JSON.stringify(response.data)}`;
    } catch (error: any) {
      return `오류: ${error.message}`;
    }
  }
}

export default EcountService;