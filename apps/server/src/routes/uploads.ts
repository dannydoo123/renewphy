import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import path from 'path';
import { AIExcelService } from '../services/aiExcelService';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    res.json({
      importId: `temp-${Date.now()}`,
      headers: jsonData[0] || [],
      preview: jsonData.slice(1, 6),
      totalRows: jsonData.length - 1
    });
  } catch (error) {
    next(error);
  }
});

router.post('/validate', async (req, res, next) => {
  try {
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/main', async (req, res, next) => {
  try {
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
});

router.post('/ai-parse', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // 엑셀 파일 읽기
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // AI로 파싱
    const parsedSchedules = await AIExcelService.parseExcelWithAI(
      jsonData as any[][],
      req.file.originalname
    );
    
    // 스케줄 형태로 변환
    const schedules = AIExcelService.convertToScheduleFormat(parsedSchedules);
    
    res.json({
      success: true,
      schedules,
      totalSchedules: schedules.length,
      fileName: req.file.originalname
    });
    
  } catch (error) {
    console.error('AI 파싱 오류:', error);
    res.status(500).json({ 
      error: 'AI 파싱 실패',
      details: (error as Error).message 
    });
  }
});

router.post('/ai-parse-data', async (req, res, next) => {
  try {
    const { excelData, fileName } = req.body;
    
    if (!excelData || !Array.isArray(excelData)) {
      return res.status(400).json({ error: 'Invalid excel data' });
    }
    
    // AI로 파싱
    const parsedSchedules = await AIExcelService.parseExcelWithAI(
      excelData,
      fileName || 'unknown.xlsx'
    );
    
    // 스케줄 형태로 변환
    const schedules = AIExcelService.convertToScheduleFormat(parsedSchedules);
    
    res.json({
      success: true,
      schedules,
      totalSchedules: schedules.length,
      fileName: fileName || 'unknown.xlsx'
    });
    
  } catch (error) {
    console.error('AI 데이터 파싱 오류:', error);
    res.status(500).json({ 
      error: 'AI 파싱 실패',
      details: (error as Error).message 
    });
  }
});

export { router as uploadsRouter };