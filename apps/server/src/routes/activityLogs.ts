import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 임시 메모리 저장소 (외부에서 접근 가능하도록)
declare global {
  var memoryActivityLogs: any[] | undefined;
}

if (!global.memoryActivityLogs) {
  global.memoryActivityLogs = [];
}

// 활동 로그 목록 조회
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '50', 
      type,
      startDate,
      endDate 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let activityLogs: any[];
    let totalCount: number;

    try {
      // 데이터베이스 시도
      // 필터 조건
      let where: any = {};
      
      if (type) {
        where.type = type;
      }
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }

      // 전체 개수 조회
      totalCount = await prisma.activityLog.count({ where });

      // 활동 로그 조회
      activityLogs = await prisma.activityLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limitNum
      });
    } catch (dbError) {
      console.log('데이터베이스 연결 실패, 메모리 저장소 사용');
      // 메모리 저장소 사용
      let logs = [...(global.memoryActivityLogs || [])];

      // 필터링
      if (type) {
        logs = logs.filter(log => log.type === type);
      }
      if (startDate || endDate) {
        logs = logs.filter(log => {
          const logDate = new Date(log.createdAt);
          if (startDate && logDate < new Date(startDate as string)) return false;
          if (endDate && logDate > new Date(endDate as string)) return false;
          return true;
        });
      }

      // 정렬 및 페이지네이션
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      totalCount = logs.length;
      activityLogs = logs.slice(offset, offset + limitNum);
    }

    res.json({
      success: true,
      data: {
        logs: activityLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('활동 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '활동 로그를 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 활동 로그 생성 (내부 API용)
router.post('/', async (req, res) => {
  try {
    const { type, title, description, data } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다.'
      });
    }

    const activityLog = await prisma.activityLog.create({
      data: {
        type,
        title,
        description,
        data: data || null
      }
    });

    res.status(201).json({
      success: true,
      data: activityLog
    });
  } catch (error) {
    console.error('활동 로그 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '활동 로그를 생성하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 활동 로그 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const activityLog = await prisma.activityLog.findUnique({
      where: { id: parseInt(id) }
    });

    if (!activityLog) {
      return res.status(404).json({
        success: false,
        message: '활동 로그를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: activityLog
    });
  } catch (error) {
    console.error('활동 로그 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '활동 로그를 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 활동 로그 통계
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate as string);
      }
    }

    // 타입별 통계
    const typeStats = await prisma.activityLog.groupBy({
      by: ['type'],
      where: dateFilter,
      _count: {
        type: true
      }
    });

    // 최근 24시간 활동
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const recentActivity = await prisma.activityLog.count({
      where: {
        ...dateFilter,
        createdAt: {
          gte: last24Hours
        }
      }
    });

    // 전체 통계
    const totalLogs = await prisma.activityLog.count({
      where: dateFilter
    });

    res.json({
      success: true,
      data: {
        totalLogs,
        recentActivity,
        typeStats: typeStats.map(stat => ({
          type: stat.type,
          count: stat._count.type
        }))
      }
    });
  } catch (error) {
    console.error('활동 로그 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '활동 로그 통계를 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

export default router;