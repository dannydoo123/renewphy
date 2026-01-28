# 생산 일정 관리 시스템

React + Node.js + PostgreSQL 기반의 풀스택 생산 일정 관리 웹 애플리케이션입니다.

## 주요 기능

### 생산 일정 관리
- 생산 일정 CRUD (생성, 조회, 수정, 삭제)
- 일정 변경 이력 추적 및 타임라인 표시
- 주문 계획(Order Plan) 관리

### 생산 용량 계산
- Shift 모델 기반 일일 생산용량 자동 계산
- 교대 수, 가동분, 청소시간, 잡체인지 시간 조합
- 설비 속도(개/분), 불량률 기반 effectiveCapacityQty 산출

### BOM 및 재고 관리
- BOM과 Inventory 연동으로 자재 소진 분석
- 자재/재고 조회
- 제품 검색 및 자동완성

### ECOUNT ERP 연동
- 제품, 재고, 주문, BOM 정보 조회
- 쇼핑몰 주문 및 생산계획 연동
- Python 스크립트를 통한 발주서, 위치별 재고, 자재관리 API

### 파일 업로드 및 AI 파싱
- Excel/CSV 파일 업로드 및 미리보기 (SheetJS)
- OpenAI GPT-4o-mini 기반 스마트 컬럼 매핑
- 업로드 데이터에서 생산 일정 자동 추출

### 승인 워크플로우
- 오버타임, 일정 변경, 용량 오버라이드 승인 요청/처리
- 다우오피스 전자결재 연동 (API 설정 시 활성화)

### 대시보드
- 생산 현황 통계
- 활동 로그 추적

## 기술 스택

### Frontend
- **Vite + React 18 + TypeScript**
- **Tailwind CSS** (반응형 디자인)
- **FullCalendar** (캘린더 UI 컴포넌트)
- **Recharts** (차트)
- React Query, React Hook Form + Zod
- SheetJS (Excel 처리)

### Backend
- **Node.js + Express + TypeScript**
- **Prisma ORM** (PostgreSQL)
- Socket.IO (기본 연결 구성)
- Multer (파일 업로드)
- OpenAI SDK (AI 파싱)

### Infrastructure
- **모노레포**: pnpm workspace + Turbo
- **컨테이너화**: Docker + Docker Compose
- **웹 서버**: Nginx (리버스 프록시, rate limiting, gzip)
- **데이터베이스**: PostgreSQL 15
- **캐시**: Redis 7 (Docker 구성됨)

## 설치 및 실행

### 전제 조건
- Node.js 18+
- pnpm 8+
- PostgreSQL 15+
- Docker & Docker Compose (선택사항)

### 로컬 개발 환경 설정

1. **저장소 클론 및 의존성 설치**
```bash
git clone <repository-url>
cd renewphy
pnpm install
```

2. **환경 변수 설정**
```bash
cp .env.sample .env
# .env 파일을 편집하여 데이터베이스 연결 정보 등을 설정
```

주요 환경 변수:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
OPENAI_API_KEY=your-openai-key        # AI 파싱 기능용
DOUOFFICE_API_KEY=your-api-key         # 다우오피스 연동 시
```

3. **데이터베이스 설정**
```bash
cd apps/server
pnpm db:migrate
pnpm db:generate
pnpm db:seed
```

4. **개발 서버 시작**
```bash
# 루트 디렉터리에서
pnpm dev
```

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3001

### Docker Compose로 실행

```bash
docker-compose up --build -d
docker-compose logs -f    # 로그 확인
docker-compose down       # 중지
```

접속: http://localhost (Nginx 경유)

## API 엔드포인트

### 생산 관리
- `GET/POST /api/schedules` - 일정 조회/생성
- `PUT/DELETE /api/schedules/:id` - 일정 수정/삭제
- `GET /api/schedules/:id/changes` - 변경 이력 조회
- `GET/POST/PUT/DELETE /api/order-plans` - 주문 계획 관리

### 자재 및 재고
- `GET /api/materials` - 자재 목록
- `GET /api/inventory` - 재고 현황
- `GET /api/bom` - BOM 조회
- `GET /api/products` - 제품 목록 및 검색

### ECOUNT 연동
- `GET /api/ecount/products` - ERP 제품 조회
- `GET /api/ecount/inventory` - ERP 재고 조회
- `GET /api/ecount-python/purchase-orders` - 발주서 조회
- `GET /api/ecount-python/inventory-by-location` - 위치별 재고

### 회사 관리
- `GET/POST/PUT/DELETE /api/companies` - 회사 CRUD

### 승인
- `GET/POST /api/approvals` - 승인 요청 조회/생성
- `PUT /api/approvals/:id/approve` - 승인 처리

### 파일 업로드
- `POST /api/uploads/import` - Excel/CSV 업로드
- `POST /api/uploads/ai-parse` - AI 기반 데이터 파싱

### 기타
- `GET /api/dashboard/stats` - 대시보드 통계
- `GET/POST /api/activity-logs` - 활동 로그
- `GET /api/users/me` - 현재 사용자 정보
- `GET /api/health` - 헬스 체크

## 데이터 모델

### 핵심 엔티티
- **User**: 역할(ADMIN, MANAGER, PLANNER, MATERIAL, USER)
- **Company**: 영업등급(S/A/B/C), 우선순위
- **Product / Material / BOM**: 제품, 자재, 자재명세서
- **Inventory**: 보유량, 발주량, 리드타임, 다음 입고일
- **ProductionSchedule**: 계획/실제 생산량, 용량, 오버타임
- **ScheduleChange**: 변경 이력 추적
- **ShiftModel / ShiftCapacity**: 교대 모델 및 용량 계산
- **Approval**: 승인 워크플로우
- **OrderPlan**: 주문 계획
- **ActivityLog**: 활동 기록

## 라이센스

MIT License
