import EcountService from '../services/ecountService';

// 테스트 설정 - 실제 제공된 인증 정보 사용
const ecountConfig = {
  baseURL: 'http://sboapi.ecount.com',
  companyId: 'LIVING53',
  apiKey: '44ef38cddd7b74de1af7d559340a49e8b3'
};

const ecountService = new EcountService(ecountConfig);

async function runEcountTests() {
  console.log('=== Ecount API 테스트 시작 ===\n');
  
  try {
    // 1. 연결 테스트
    console.log('1. API 연결 테스트...');
    const connectionResult = await ecountService.testConnection();
    console.log(`연결 상태: ${connectionResult ? '성공' : '실패'}\n`);

    if (!connectionResult) {
      console.log('API 연결 실패로 인해 추가 테스트를 중단합니다.');
      return;
    }

    // 2. 상품 목록 조회 테스트
    console.log('2. 상품 목록 조회 테스트...');
    try {
      const productsResult = await ecountService.getProducts({
        PageNo: 1,
        PageSize: 10
      });
      console.log('상품 목록 응답:', JSON.stringify(productsResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('상품 목록 조회 실패:', error);
      console.log('');
    }

    // 3. 재고 조회 테스트
    console.log('3. 재고 조회 테스트...');
    try {
      const inventoryResult = await ecountService.getInventory();
      console.log('재고 응답:', JSON.stringify(inventoryResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('재고 조회 실패:', error);
      console.log('');
    }

    // 4. 주문 목록 조회 테스트
    console.log('4. 주문 목록 조회 테스트...');
    try {
      const ordersResult = await ecountService.getOrders({
        StartDate: '2024-01-01',
        EndDate: '2024-12-31',
        PageNo: 1,
        PageSize: 10
      });
      console.log('주문 목록 응답:', JSON.stringify(ordersResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('주문 목록 조회 실패:', error);
      console.log('');
    }

    // 5. 쇼핑몰 주문 조회 테스트
    console.log('5. 쇼핑몰 주문 조회 테스트...');
    try {
      const mallOrdersResult = await ecountService.getShoppingMallOrders({
        StartDate: '2024-01-01',
        EndDate: '2024-12-31'
      });
      console.log('쇼핑몰 주문 응답:', JSON.stringify(mallOrdersResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('쇼핑몰 주문 조회 실패:', error);
      console.log('');
    }

    // 6. API 검증 상태 확인
    console.log('6. 추가 API 메서드 테스트...');
    
    // BOM 조회 테스트 (샘플 상품코드 필요)
    console.log('6-1. BOM 조회 테스트...');
    try {
      const bomResult = await ecountService.getBOM('SAMPLE001');
      console.log('BOM 응답:', JSON.stringify(bomResult, null, 2));
      console.log('');
    } catch (error) {
      console.log('BOM 조회 실패 (정상 - 샘플 상품코드 없음):', error);
      console.log('');
    }

  } catch (error) {
    console.error('테스트 실행 중 오류 발생:', error);
  }

  console.log('=== Ecount API 테스트 완료 ===');
}

// 직접 실행용
if (require.main === module) {
  runEcountTests();
}

export { runEcountTests };