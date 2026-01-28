import { Router } from 'express';
import { changeTracker } from '../services/changeTracker';

const router = Router();

// 최근 변경사항 조회
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    const startIndex = (page - 1) * limit;
    
    const allChanges = changeTracker.getRecentChanges();
    const paginatedChanges = allChanges.slice(startIndex, startIndex + limit);
    
    res.json({
      success: true,
      data: {
        changes: paginatedChanges,
        pagination: {
          total: allChanges.length,
          page,
          limit,
          totalPages: Math.ceil(allChanges.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('변경사항 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '변경사항을 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 특정 엔티티의 변경사항 조회
router.get('/entity/:entityId', (req, res) => {
  try {
    const { entityId } = req.params;
    const changes = changeTracker.getChangesForEntity(entityId);
    
    res.json({
      success: true,
      data: changes
    });
  } catch (error) {
    console.error('엔티티 변경사항 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '엔티티 변경사항을 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 변경사항 ID로 상세 조회
router.get('/:changeId', (req, res) => {
  try {
    const { changeId } = req.params;
    const change = changeTracker.getChangeById(changeId);
    
    if (!change) {
      return res.status(404).json({
        success: false,
        message: '변경사항을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: change
    });
  } catch (error) {
    console.error('변경사항 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '변경사항을 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 변경사항 통계
router.get('/stats/summary', (req, res) => {
  try {
    const stats = changeTracker.getChangeStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('변경사항 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '변경사항 통계를 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 읽지 않은 변경사항 개수 조회
router.get('/unread/count', (req, res) => {
  try {
    const unreadCount = changeTracker.getUnreadCount();
    
    res.json({
      success: true,
      data: { count: unreadCount }
    });
  } catch (error) {
    console.error('읽지 않은 변경사항 개수 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '읽지 않은 변경사항 개수를 조회하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 모든 변경사항을 읽음으로 표시
router.post('/mark-all-read', (req, res) => {
  try {
    changeTracker.markAllAsRead();
    
    res.json({
      success: true,
      message: '모든 변경사항이 읽음으로 표시되었습니다.'
    });
  } catch (error) {
    console.error('변경사항 읽음 표시 오류:', error);
    res.status(500).json({
      success: false,
      message: '변경사항을 읽음으로 표시하는 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

export default router;