# Ecount ERP API 연동 가이드

## 📋 개요

생산 일정 관리 시스템과 Ecount ERP의 API 연동을 위한 완전한 코드 세트가 구현되었습니다.

### 🔑 제공된 인증 정보
- **Company ID**: LIVING53
- **API Key**: 44ef38cddd7b74de1af7d559340a49e8b3
- **유효기간**: 2025년 9월 3일 ~ 2025년 9월 17일
- **테스트 URL**: http://sboapi.ecount.com

## 📁 생성된 파일 구조

```
apps/server/src/
├── config/
│   └── ecount.config.ts          # API 설정 및 엔드포인트 정의
├── services/
│   └── ecountService.ts          # 기본 API 통신 서비스
├── utils/
│   └── ecountIntegration.ts      # 생산 시스템과의 통합 유틸리티
├── routes/
│   └── ecountRoutes.ts           # REST API 라우터
└── tests/
    ├── ecountTest.ts             # 기본 API 테스트
    ├── directEcountTest.ts       # 직접 URL 테스트
    └── integrationTest.ts        # 통합 테스트
```

## 🔧 주요 기능

### 1. EcountService (기본 API 통신)
```typescript
const ecountService = new EcountService({
  baseURL: 'http://sboapi.ecount.com',
  companyId: 'LIVING53',
  apiKey: '44ef38cddd7b74de1af7d559340a49e8b3'
});

// 연결 테스트
await ecountService.testConnection();

// 상품 목록 조회
await ecountService.getProducts({ PageNo: 1, PageSize: 20 });
```

### 2. EcountIntegrationService (통합 서비스)
```typescript
const integration = new EcountIntegrationService('test');

// 전체 데이터 동기화
const results = await integration.fullSync();

// 생산 계획 전송
await integration.sendProductionPlan({
  productCode: 'PROD001',
  quantity: 100,
  planDate: '2024-09-15'
});
```

### 3. REST API 엔드포인트
- `GET /api/ecount/test-connection` - 연결 테스트
- `GET /api/ecount/products` - 상품 목록
- `GET /api/ecount/inventory` - 재고 조회
- `GET /api/ecount/orders` - 주문 목록
- `POST /api/ecount/production-plan` - 생산 계획 등록

## 🚨 현재 상태

### ❌ 테스트 결과
현재 로컬 환경에서 **HTTP 407 프록시 인증 오류** 발생:
```
You must be authenticated by a proxy before the Web server can process your request.
```

이는 네트워크 프록시 설정 때문이며, 실제 서버 환경에서는 정상 작동할 것으로 예상됩니다.

## 🔄 실제 서버에서 테스트 방법

### 1. 서버 라우터에 API 추가
```typescript
// apps/server/src/app.ts 또는 main router 파일에 추가
import ecountRoutes from './routes/ecountRoutes';
app.use('/api/ecount', ecountRoutes);
```

### 2. 환경변수 설정 (.env)
```env
# Ecount API 설정
ECOUNT_COMPANY_ID=LIVING53
ECOUNT_API_KEY=44ef38cddd7b74de1af7d559340a49e8b3
```

### 3. 서버 배포 후 테스트 명령어
```bash
# 1. 연결 테스트
curl -X GET "http://localhost:3001/api/ecount/test-connection"

# 2. 상품 목록 조회
curl -X GET "http://localhost:3001/api/ecount/products?pageNo=1&pageSize=10"

# 3. 재고 조회
curl -X GET "http://localhost:3001/api/ecount/inventory"

# 4. 생산 계획 등록
curl -X POST "http://localhost:3001/api/ecount/production-plan" \
  -H "Content-Type: application/json" \
  -d '{
    "productCode": "TEST001",
    "qty": 100,
    "planDate": "2024-09-15",
    "memo": "테스트 생산계획"
  }'
```

## 🎯 API 검증 및 정식 발급 절차

### 1. API 검증 단계
테스트 인증키를 사용하여 필요한 API들을 호출하면 자동으로 검증됩니다:
- ✅ BasicInfo/GetCompanyInfo
- ✅ Product/GetProductList  
- ✅ Inventory/GetInventoryList
- ✅ Order/GetOrderList
- ✅ Production/InsertProductionPlan

### 2. 검증 확인
Ecount 로그인 → Self-Customizing → 정보관리 → API인증키발급 → API인증현황에서 확인

### 3. 정식 API 키 발급
검증 완료 후 실제 운영용 API 키 발급받아 환경변수에 설정

## 📊 통합 데이터 흐름

### 1. Ecount → 생산 시스템
```
쇼핑몰 주문 → Ecount ERP → API → 생산 일정 시스템
상품 정보 → Ecount ERP → API → BOM 관리
재고 정보 → Ecount ERP → API → 자재 관리
```

### 2. 생산 시스템 → Ecount
```
생산 계획 → API → Ecount ERP → 생산 관리
완료 수량 → API → Ecount ERP → 재고 업데이트
```

## 🔧 추가 개발 권장사항

### 1. 에러 처리 강화
- 재시도 로직 구현
- 로그 시스템 연동
- 알림 시스템 연동

### 2. 데이터 동기화 스케줄링
```typescript
// cron job으로 주기적 동기화
import cron from 'node-cron';

// 매시간 데이터 동기화
cron.schedule('0 * * * *', async () => {
  const integration = new EcountIntegrationService('production');
  await integration.fullSync();
});
```

### 3. 캐싱 구현
```typescript
// Redis를 활용한 API 응답 캐싱
const cachedProducts = await redis.get('ecount:products');
if (!cachedProducts) {
  const products = await ecountService.getProducts();
  await redis.setex('ecount:products', 300, JSON.stringify(products));
}
```

## 📝 정식 운영을 위한 체크리스트

- [ ] 서버 환경에서 연결 테스트 성공
- [ ] 필요한 모든 API 검증 완료  
- [ ] 정식 API 키 발급 및 적용
- [ ] 프로덕션 환경변수 설정
- [ ] 에러 로깅 시스템 구축
- [ ] 모니터링 및 알림 설정
- [ ] 데이터 동기화 스케줄 설정
- [ ] 보안 설정 (API 키 암호화 등)

## 🚀 다음 단계

1. **즉시**: 실제 서버 환경에서 연결 테스트
2. **단기**: API 검증 및 정식 키 발급
3. **중기**: 자동화된 데이터 동기화 구현
4. **장기**: 양방향 실시간 연동 및 모니터링 시스템 구축