# 생산 일정 관리 시스템

React + Node.js + PostgreSQL 기반의 풀스택 생산 일정 관리 웹 애플리케이션입니다.

## 주요 기능

### 📅 생산 일정 관리
- **FullCalendar 기반 월간/주간 생산일정 시각화**
- 실시간 일정 업데이트 (Socket.IO)
- 일정 변경 이력 추적 및 타임라인 표시
- 하루/이벤트 단위 diff 비교 뷰

### 🏭 생산 용량 계산
- **Shift 모델 기반 일일 생산용량 자동 계산**
- 교대 수, 가동분, 청소시간, 잡체인지 시간 조합
- 설비 속도(개/분), 불량률 가정으로 effectiveCapacityQty 산출
- 용량 초과 시 경고 및 자동 보정 제안

### 📊 BOM 및 재고 관리
- **생산 가능수량(availableNow) 실시간 계산**
- BOM과 Inventory 연동으로 자재 소진 분석
- 월별 자재 사용량 추적 및 발주 권고
- 리드타임 기반 예상 소진일 계산

### 🔄 승인 워크플로우
- **다우오피스 전자결재 연동**
- 오버타임 요청 시 자동 결재 프로세스 트리거
- 승인 완료 웹훅 수신으로 실시간 상태 업데이트
- overtimeMinutes 자동 반영으로 용량 재계산

### 📤 파일 업로드 시스템
- **Excel/CSV 파일 업로드 및 컬럼 매핑 마법사**
- SheetJS 기반 미리보기 제공
- 날짜, 제품, 공정단계, 수량 등 필드 매핑
- "메인 파일 지정" 기능으로 기준 데이터 관리

### 🔔 실시간 알림
- **Slack/KakaoWork 웹훅 연동**
- 일정 변경, 자재 부족, 용량 경고 등 자동 알림
- 사용자별 개인화된 알림 시스템

## 기술 스택

### Frontend
- **Vite + React 18 + TypeScript**
- **Tailwind CSS** (반응형 디자인)
- **FullCalendar** (캘린더 UI)
- React Query (상태 관리)
- Socket.IO Client (실시간 통신)
- React Hook Form + Zod (폼 관리)
- SheetJS (Excel 처리)

### Backend
- **Node.js + Express + TypeScript**
- **Prisma ORM** (타입 안전한 DB 액세스)
- **Socket.IO** (실시간 업데이트)
- **PostgreSQL** (관계형 데이터베이스)
- JWT 인증, Multer (파일 업로드)
- Nodemailer (이메일 발송)

### Infrastructure
- **모노레포**: pnpm workspace + Turbo
- **컨테이너화**: Docker + Docker Compose
- **웹 서버**: Nginx (리버스 프록시)
- **캐싱**: Redis
- **CI/CD**: GitHub Actions (예정)

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
cd production-scheduler
pnpm install
```

2. **환경 변수 설정**
```bash
cp .env.sample .env
# .env 파일을 편집하여 데이터베이스 연결 정보 등을 설정
```

3. **데이터베이스 설정**
```bash
# PostgreSQL 서버가 실행 중인지 확인 후
cd apps/server
pnpm db:migrate    # 마이그레이션 실행
pnpm db:generate   # Prisma 클라이언트 생성
pnpm db:seed      # 시드 데이터 로드
```

4. **개발 서버 시작**
```bash
# 루트 디렉터리에서
pnpm dev
```

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3001

### Docker Compose로 전체 스택 실행

```bash
# 프로덕션 빌드 및 실행
docker-compose up --build -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

접속: http://localhost (Nginx를 통해 프론트엔드 서빙)

## API 엔드포인트

### 생산 관리
- `GET /api/schedules` - 일정 목록 조회
- `POST /api/schedules` - 새 일정 생성
- `PUT /api/schedules/:id` - 일정 수정
- `GET /api/schedules/:id/changes` - 변경 이력 조회

### 자재 및 재고
- `GET /api/materials` - 자재 목록 조회
- `GET /api/inventory` - 재고 현황 조회
- `GET /api/bom/product/:id` - 제품별 BOM 조회

### 회사 및 제품
- `GET /api/companies` - 회사 목록 조회
- `GET /api/products` - 제품 목록 조회

### 승인 및 알림
- `POST /api/approvals` - 승인 요청 생성
- `PUT /api/approvals/:id/approve` - 승인 처리
- `GET /api/notifications/user/:id` - 사용자 알림 조회

### 파일 업로드
- `POST /api/uploads/import` - 파일 업로드
- `POST /api/uploads/validate` - 매핑 검증
- `PUT /api/uploads/:id/main` - 메인 파일 지정

## 데이터 모델

### 핵심 엔티티
- **Company**: 영업등급(S/A/B/C), 우선순위 포함
- **Product**: 제품 정보 및 BOM 연결
- **Material**: 원부자재 정보
- **Inventory**: 보유량, 발주량, 리드타임, 다음 입고일
- **ProductionSchedule**: 계획/실제 생산량, 용량, 오버타임
- **ShiftModel**: 교대 모델 및 용량 계산 로직

### 트랜잭션 처리
모든 데이터 변경은 Prisma 트랜잭션으로 처리되며, 용량계산/우선순위/가용수량/리드타임 로직은 services 레이어로 모듈화되어 있습니다.

## 외부 연동

### 다우오피스 API
```javascript
// 오버타임 승인 요청 예시
const approval = await douOfficeService.createOvertimeApproval({
  approvalId: 'approval-id',
  overtimeMinutes: 120,
  reason: '생산 용량 초과',
  requesterId: 'user-id'
});
```

### Slack/KakaoWork 웹훅
```javascript
// 알림 발송 예시
await notificationService.sendWebhookNotification(
  '생산 일정 변경 알림',
  '삼성전자 - 전자부품 A타입\n일정: 2024-12-15\n수량: 5000 → 4500개'
);
```

## 테스트

### 단위 테스트
```bash
cd apps/server
pnpm test              # Jest 단위 테스트
pnpm test:watch        # 워치 모드
```

### E2E 테스트 (예정)
```bash
pnpm test:e2e         # Playwright E2E 테스트
```

## 시드 데이터

초기 데이터에는 다음이 포함됩니다:
- **3개 등급별 회사**: 삼성전자(S), LG전자(A), 현대자동차(B)
- **Shift 모델**: 2교대 고속(110,000개/일), 표준(100,000개/일), 3교대 연속(90,000개/일)
- **자재 및 BOM**: 구리선, 플라스틱, 실리콘 등 5종 자재
- **샘플 생산 요청**: 긴급/일반 주문 포함

## 배포

### 환경별 설정
- **개발**: `pnpm dev` (Hot reload)
- **스테이징**: `docker-compose -f docker-compose.staging.yml up`
- **프로덕션**: `docker-compose up -d`

### 환경 변수
프로덕션 환경에서는 다음 환경변수를 반드시 설정하세요:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=secure-random-string
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DOUOFFICE_API_KEY=your-api-key
SMTP_HOST=your-smtp-server
```

## 라이센스

MIT License

## 기여 방법

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 스크린샷 및 데모

### 메인 대시보드
![Dashboard Screenshot](docs/screenshots/dashboard.png)

### 캘린더 일정 관리
![Calendar Screenshot](docs/screenshots/calendar.png)

### 자재 관리 대시보드
![Materials Screenshot](docs/screenshots/materials.png)

### 엑셀 업로드 마법사
![Upload Screenshot](docs/screenshots/upload-wizard.png)

---

**🚀 프로덕션 레디 풀스택 생산관리 시스템 - 실시간 모니터링부터 AI 기반 최적화까지!**