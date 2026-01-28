export const EcountConfig = {
  // 테스트 환경
  test: {
    baseURL: 'http://sboapi.ecount.com',
    companyId: 'LIVING53',
    apiKey: '44ef38cddd7b74de1af7d559340a49e8b3', // 테스트 키 (2025년 9월 17일까지)
  },
  
  // 프로덕션 환경 (정식 API 키 발급 후 사용)
  production: {
    baseURL: 'http://sboapi.ecount.com',
    companyId: process.env.ECOUNT_COMPANY_ID || 'LIVING53',
    apiKey: process.env.ECOUNT_API_KEY || '', // 실제 발급받은 키로 교체
  },
  
  // API 엔드포인트 목록
  endpoints: {
    // 기본 정보
    companyInfo: 'BasicInfo/GetCompanyInfo',
    
    // 상품 관리
    productList: 'Product/GetProductList',
    productInfo: 'Product/GetProductInfo',
    bomList: 'Product/GetBOMList',
    
    // 재고 관리
    inventoryList: 'Inventory/GetInventoryList',
    inventoryInfo: 'Inventory/GetInventoryInfo',
    
    // 주문 관리
    orderList: 'Order/GetOrderList',
    orderInfo: 'Order/GetOrderInfo',
    orderInsert: 'Order/InsertOrder',
    
    // 쇼핑몰 연동
    mallOrderList: 'ShoppingMall/GetOrderList',
    mallOrderSync: 'ShoppingMall/SyncOrder',
    
    // 생산 관리
    productionPlanList: 'Production/GetProductionPlanList',
    productionPlanInsert: 'Production/InsertProductionPlan',
    productionPlanUpdate: 'Production/UpdateProductionPlan',
    
    // 창고 관리
    warehouseList: 'Warehouse/GetWarehouseList',
    
    // 고객 관리
    customerList: 'Customer/GetCustomerList',
    customerInfo: 'Customer/GetCustomerInfo',
  },
  
  // API 요청 옵션
  requestOptions: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
  }
};