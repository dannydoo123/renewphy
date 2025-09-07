# 멀티 스테이지 빌드
FROM node:18-alpine AS base

# pnpm 설치
RUN npm install -g pnpm turbo

# 의존성 설치 스테이지
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

RUN pnpm install --frozen-lockfile

# 빌드 스테이지
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma 생성
RUN cd apps/server && pnpm db:generate

# 빌드
RUN pnpm build

# 프로덕션 스테이지
FROM base AS runner
WORKDIR /app

# 프로덕션 사용자 추가
RUN addgroup --system --gid 1001 production
RUN adduser --system --uid 1001 production

# 필요한 파일들 복사
COPY --from=builder --chown=production:production /app/package.json ./
COPY --from=builder --chown=production:production /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=production:production /app/turbo.json ./
COPY --from=builder --chown=production:production /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=production:production /app/apps/server/package.json ./apps/server/
COPY --from=builder --chown=production:production /app/apps/server/prisma ./apps/server/prisma
COPY --from=builder --chown=production:production /app/apps/client/dist ./apps/client/dist
COPY --from=builder --chown=production:production /app/node_modules ./node_modules

# 업로드 디렉터리 생성
RUN mkdir -p /app/uploads && chown production:production /app/uploads

USER production

EXPOSE 3001

# 서버 시작
CMD ["node", "apps/server/dist/index.js"]