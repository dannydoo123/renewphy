import EcountService from '../services/ecountService';

// 테스트 설정
const ecountConfig = {
  baseURL: 'http://sboapi.ecount.com',
  companyId: 'LIVING53',
  apiKey: '44ef38cddd7b74de1af7d559340a49e8b3'
};

const ecountService = new EcountService(ecountConfig);

async function runDirectTest() {
  console.log('=== 직접 URL 테스트 시작 ===\n');
  
  try {
    // 직접 URL 테스트
    const result = await ecountService.testDirectUrl();
    console.log('직접 URL 테스트 결과:', result);
    
    // 수동으로 curl 명령어 생성
    const curlCommand = `curl -X GET "http://sboapi.ecount.com/BasicInfo/GetCompanyInfo?CompanyId=LIVING53&Key=44ef38cddd7b74de1af7d559340a49e8b3" -H "Content-Type: application/x-www-form-urlencoded" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`;
    
    console.log('\n=== 수동 테스트용 curl 명령어 ===');
    console.log(curlCommand);
    console.log('\n위 명령어를 명령프롬프트에서 실행해보세요.');
    
  } catch (error) {
    console.error('테스트 실행 중 오류:', error);
  }
  
  console.log('\n=== 직접 테스트 완료 ===');
}

// 직접 실행용
if (require.main === module) {
  runDirectTest();
}

export { runDirectTest };