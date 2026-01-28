import EcountIntegrationService from '../utils/ecountIntegration';

async function runIntegrationTest() {
  console.log('=== Ecount ERP 통합 테스트 시작 ===\n');
  
  // 테스트 환경으로 초기화
  const integration = new EcountIntegrationService('test');
  
  try {
    // 1. 연결 테스트
    console.log('1. API 연결 확인...');
    const isConnected = await integration.checkConnection();
    if (!isConnected) {
      console.log('❌ API 연결 실패 - 프록시나 네트워크 문제로 추정됩니다.');
      console.log('   실제 서버 환경에서 테스트가 필요합니다.\n');
    } else {
      console.log('✅ API 연결 성공\n');
    }
    
    // 2. 전체 동기화 테스트 (연결 실패해도 진행)
    console.log('2. 전체 데이터 동기화 테스트...');
    const syncResults = await integration.fullSync();
    
    console.log('동기화 결과:');
    console.log(`- 연결 상태: ${syncResults.connection ? '✅ 성공' : '❌ 실패'}`);
    console.log(`- 상품 데이터: ${syncResults.products ? '✅ 성공' : '❌ 실패'}`);
    console.log(`- 재고 데이터: ${syncResults.inventory ? '✅ 성공' : '❌ 실패'}`);
    console.log(`- 주문 데이터: ${syncResults.orders ? '✅ 성공' : '❌ 실패'}`);
    
    if (syncResults.errors.length > 0) {
      console.log('\n오류 목록:');
      syncResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    // 3. 생산 계획 전송 테스트 (연결 실패 시 스킵)
    if (isConnected) {
      console.log('\n3. 생산 계획 전송 테스트...');
      try {
        const productionPlan = {
          productCode: 'TEST001',
          quantity: 100,
          planDate: '2024-09-15',
          memo: '테스트 생산 계획'
        };
        
        const result = await integration.sendProductionPlan(productionPlan);
        console.log('✅ 생산 계획 전송 성공:', result);
      } catch (error: any) {
        console.log('❌ 생산 계획 전송 실패:', error.message);
      }
    }
    
    console.log('\n=== 실제 서버 배포 후 테스트 방법 ===');
    console.log('1. 서버 환경에서 다음 명령어 실행:');
    console.log('   curl -X GET "http://localhost:3001/api/ecount/test-connection"');
    console.log('');
    console.log('2. 전체 동기화 테스트:');
    console.log('   curl -X POST "http://localhost:3001/api/ecount/sync"');
    console.log('');
    console.log('3. 상품 목록 가져오기:');
    console.log('   curl -X GET "http://localhost:3001/api/ecount/products"');
    
  } catch (error: any) {
    console.error('통합 테스트 실행 중 오류:', error.message);
  }
  
  console.log('\n=== Ecount ERP 통합 테스트 완료 ===');
}

// 직접 실행용
if (require.main === module) {
  runIntegrationTest();
}

export { runIntegrationTest };