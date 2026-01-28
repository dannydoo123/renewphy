import { Router } from 'express';
import EcountService from '../services/ecountService';

const router = Router();

// Ecount 서비스 인스턴스 생성
const ecountService = new EcountService({
  baseURL: 'http://sboapi.ecount.com',
  companyId: 'LIVING53',
  apiKey: '44ef38cddd7b74de1af7d559340a49e8b3'
});

// API 연결 테스트
router.get('/test-connection', async (req, res) => {
  try {
    const isConnected = await ecountService.testConnection();
    res.json({
      success: isConnected,
      message: isConnected ? 'Ecount API 연결 성공' : 'Ecount API 연결 실패'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'API 연결 테스트 중 오류 발생',
      error: error.message
    });
  }
});

// 상품 목록 조회
router.get('/products', async (req, res) => {
  try {
    const { pageNo = 1, pageSize = 20 } = req.query;
    const result = await ecountService.getProducts({
      PageNo: Number(pageNo),
      PageSize: Number(pageSize)
    });
    
    res.json({
      success: result.Status === 1,
      message: result.Message,
      data: result.Data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '상품 목록 조회 실패',
      error: error.message
    });
  }
});

// 재고 조회
router.get('/inventory', async (req, res) => {
  try {
    const { productCode, whouseCode } = req.query;
    const result = await ecountService.getInventory({
      ProductCode: productCode as string,
      WhouseCode: whouseCode as string
    });
    
    res.json({
      success: result.Status === 1,
      message: result.Message,
      data: result.Data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '재고 조회 실패',
      error: error.message
    });
  }
});

// 주문 목록 조회
router.get('/orders', async (req, res) => {
  try {
    const { startDate, endDate, pageNo = 1, pageSize = 20 } = req.query;
    const result = await ecountService.getOrders({
      StartDate: startDate as string,
      EndDate: endDate as string,
      PageNo: Number(pageNo),
      PageSize: Number(pageSize)
    });
    
    res.json({
      success: result.Status === 1,
      message: result.Message,
      data: result.Data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '주문 목록 조회 실패',
      error: error.message
    });
  }
});

// 쇼핑몰 주문 조회
router.get('/mall-orders', async (req, res) => {
  try {
    const { startDate, endDate, mallCode } = req.query;
    const result = await ecountService.getShoppingMallOrders({
      StartDate: startDate as string,
      EndDate: endDate as string,
      MallCode: mallCode as string
    });
    
    res.json({
      success: result.Status === 1,
      message: result.Message,
      data: result.Data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '쇼핑몰 주문 조회 실패',
      error: error.message
    });
  }
});

// BOM 조회
router.get('/bom/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    const result = await ecountService.getBOM(productCode);
    
    res.json({
      success: result.Status === 1,
      message: result.Message,
      data: result.Data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'BOM 조회 실패',
      error: error.message
    });
  }
});

// 생산 계획 등록
router.post('/production-plan', async (req, res) => {
  try {
    const { productCode, qty, planDate, memo } = req.body;
    const result = await ecountService.createProductionPlan({
      ProductCode: productCode,
      Qty: qty,
      PlanDate: planDate,
      Memo: memo
    });
    
    res.json({
      success: result.Status === 1,
      message: result.Message,
      data: result.Data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '생산 계획 등록 실패',
      error: error.message
    });
  }
});

export default router;