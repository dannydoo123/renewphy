import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { setupRoutes } from './routes';
import { setupSocket } from './socket';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { productSyncService } from './services/productSyncService';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic auth middleware (simple implementation)
app.use((req, res, next) => {
  req.user = { id: 'default-user', role: 'ADMIN' }; // Mock user
  next();
});

setupRoutes(app);
setupSocket(io);

app.use(errorHandler);

// 서버 시작 시 초기화 작업
const initializeServer = async () => {
  try {
    // 제품 캐시 동기화
    logger.info('🔄 서버 시작 시 제품 캐시 동기화 시작...');
    const syncResult = await productSyncService.syncProducts();
    
    if (syncResult.success) {
      logger.info(`✅ 제품 캐시 동기화 완료: ${syncResult.count}개 제품`);
    } else {
      logger.warn(`⚠️ 제품 캐시 동기화 실패: ${syncResult.message}`);
    }
  } catch (error) {
    logger.error('❌ 서버 초기화 중 오류:', error);
  }
};

server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  
  // 비동기적으로 초기화 작업 실행 (서버 시작을 블록하지 않음)
  setTimeout(initializeServer, 1000); // 1초 후 실행
});

export { io };