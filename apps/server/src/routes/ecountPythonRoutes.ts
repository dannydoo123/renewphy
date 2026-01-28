import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = Router();

// Python 경로 찾기 유틸리티 함수
const findPythonCommand = (): string => {
  // 시스템 Python 사용
  return 'python';
};

// Python 프로세스 생성 헬퍼 함수
const createPythonProcess = (args: string[], options: any = {}): any => {
  const pythonCommand = findPythonCommand();
  console.log(`Using Python command: ${pythonCommand}`);
  
  // Windows에서는 shell 옵션 제거
  const spawnOptions = {
    env: { 
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      LANG: 'en_US.UTF-8'
    },
    ...options
  };
  
  return spawn(pythonCommand, args, spawnOptions);
};

// Python 스크립트 실행 헬퍼 함수
const executePythonScript = (functionName: string, args: any = {}): Promise<any> => {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(__dirname, '../../../../test.py');
    
    // Python 스크립트 실행
    const pythonProcess = createPythonProcess([
      pythonScriptPath,
      functionName,
      JSON.stringify(args)
    ]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Python에서 JSON 형태로 출력된다고 가정
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          // JSON 파싱 실패 시 원본 데이터 반환
          resolve({ success: true, data: stdout, raw: true });
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(error);
    });
  });
};

// 더 간단한 방식: 직접 Python 함수를 import해서 사용
const callPythonFunction = async (functionName: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    const pythonCode = `
import sys
sys.path.append('${path.dirname(path.join(__dirname, '../../../../test.py'))}')
from test import ${functionName}, get_zone_info, api_login_oapilogin, COM_CODE, USER_ID, API_CERT_KEY, DEFAULT_ZONE, USE_TEST_API
import json
import time

try:
    # Zone 정보 및 로그인
    zone_info = get_zone_info(COM_CODE, use_test=USE_TEST_API)
    zone_value = zone_info.get('ZONE') if zone_info.get('ZONE') else DEFAULT_ZONE
    session_id_value = api_login_oapilogin(COM_CODE, USER_ID, API_CERT_KEY, zone_value, use_test=USE_TEST_API)
    time.sleep(1)
    
    # 함수 실행
    result = ${functionName}(session_id_value, zone_value, *${JSON.stringify(args)})
    print(json.dumps({"success": True, "data": result}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;

    const pythonProcess = createPythonProcess(['-c', pythonCode], {
      env: { 
        ...process.env, 
        PYTHONIOENCODING: 'utf-8',
        LANG: 'ko_KR.UTF-8'
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString('utf8');
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);
          resolve(result);
        } catch (error) {
          resolve({ success: false, error: 'Failed to parse Python output', output: stdout });
        }
      } else {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
      }
    });
  });
};

// 발주서 조회 API (실제 Python 스크립트 호출)
router.get('/purchase-orders', async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // 기본값: 최근 30일
    let fromDate = dateFrom as string;
    let toDate = dateTo as string;
    
    if (!fromDate || !toDate) {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      
      fromDate = startDate.toISOString().slice(0, 10).replace(/-/g, '');
      toDate = now.toISOString().slice(0, 10).replace(/-/g, '');
    }

    console.log(`Purchase orders API called with dateFrom: ${fromDate}, dateTo: ${toDate}`);

    // Python 스크립트 JSON 형태로 호출
    const pythonScriptPath = path.resolve(__dirname, '../../../../test.py');
    console.log(`Python script path: ${pythonScriptPath}`);
    
    const pythonProcess = createPythonProcess([
      pythonScriptPath, 
      'purchase_orders_json', 
      fromDate, 
      toDate
    ], {
      cwd: path.dirname(pythonScriptPath),
      env: { 
        ...process.env, 
        PYTHONIOENCODING: 'utf-8',
        LANG: 'ko_KR.UTF-8'
      }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString('utf8');
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString('utf8');
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // JSON_RESULT_START와 JSON_RESULT_END 사이의 JSON 추출
          const jsonStart = stdout.indexOf('JSON_RESULT_START');
          const jsonEnd = stdout.indexOf('JSON_RESULT_END');
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = stdout.substring(
              jsonStart + 'JSON_RESULT_START'.length, 
              jsonEnd
            ).trim();
            
            const result = JSON.parse(jsonStr);
            console.log(`✅ Python에서 ${result.data?.length || 0}개 발주서 조회 성공`);
            
            res.json({
              success: result.success,
              data: result.data || [],
              message: result.success ? 
                `발주서 조회 성공 (${result.data?.length || 0}개)` : 
                `발주서 조회 실패: ${result.error}`,
              dateRange: { from: fromDate, to: toDate }
            });
          } else {
            console.log('JSON 마커를 찾을 수 없음. Python 전체 출력:', stdout);
            res.status(500).json({
              success: false,
              message: 'Python 응답에서 JSON 데이터를 찾을 수 없습니다.',
              pythonOutput: stdout
            });
          }
        } catch (error) {
          console.error('JSON 파싱 오류:', error);
          console.log('Python 출력:', stdout);
          res.status(500).json({
            success: false,
            message: 'Python 응답 JSON 파싱 실패',
            error: error.message,
            pythonOutput: stdout
          });
        }
      } else {
        console.error(`Python script failed with code ${code}:`, stderr);
        res.status(500).json({
          success: false,
          message: 'Python 스크립트 실행 실패',
          error: stderr,
          code: code
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Python process error:', error);
      res.status(500).json({
        success: false,
        message: 'Python 프로세스 오류',
        error: error.message
      });
    });
    
  } catch (error) {
    console.error('Purchase orders API error:', error);
    res.status(500).json({
      success: false,
      message: '발주서 조회 중 오류 발생',
      error: error.message
    });
  }
});

// 재고 조회 API (창고별)
router.get('/inventory-by-location', async (req: Request, res: Response) => {
  try {
    const result = await callPythonFunction('run_inventory_lookup');
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: '창고별 재고 조회 성공'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '창고별 재고 조회 실패',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Inventory by location API error:', error);
    res.status(500).json({
      success: false,
      message: '창고별 재고 조회 중 오류 발생',
      error: error.message
    });
  }
});

// 품목 기본정보 조회 API
router.get('/product-basic', async (req: Request, res: Response) => {
  try {
    const { prodCd, prodType } = req.query;
    
    const result = await callPythonFunction(
      'run_product_basic_lookup',
      prodCd || '',
      prodType || ''
    );
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: '품목 기본정보 조회 성공'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '품목 기본정보 조회 실패',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Product basic API error:', error);
    res.status(500).json({
      success: false,
      message: '품목 기본정보 조회 중 오류 발생',
      error: error.message
    });
  }
});

// 재고현황 조회 API
router.get('/inventory-balance', async (req: Request, res: Response) => {
  try {
    const { baseDate, whCd, prodCd } = req.query;
    
    // 기본값: 오늘 날짜
    let date = baseDate as string;
    if (!date) {
      date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
    
    const result = await callPythonFunction(
      'run_inventory_balance_status',
      date,
      whCd || '',
      prodCd || ''
    );
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: '재고현황 조회 성공'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '재고현황 조회 실패',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Inventory balance API error:', error);
    res.status(500).json({
      success: false,
      message: '재고현황 조회 중 오류 발생',
      error: error.message
    });
  }
});

// 자재 관리용 통합 API (재고현황 + 품목정보)
router.get('/materials-management', async (req: Request, res: Response) => {
  try {
    const { baseDate, whCd, prodCd } = req.query;
    
    // 기본값: 오늘 날짜
    let date = baseDate as string;
    if (!date) {
      date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
    
    console.log(`Materials management API called with baseDate: ${date}, whCd: ${whCd}, prodCd: ${prodCd}`);
    
    // Python 스크립트 직접 실행
    const pythonScriptPath = path.resolve(__dirname, '../../../../test.py');
    console.log(`Python script path: ${pythonScriptPath}`);
    
    // 재고현황 조회 (Python 직접 실행)
    const inventoryProcess = createPythonProcess([
      pythonScriptPath,
      'inventory_balance_json',
      date,
      whCd || '',
      prodCd || ''
    ], {
      cwd: path.dirname(pythonScriptPath),
      env: { 
        ...process.env, 
        PYTHONIOENCODING: 'utf-8',
        LANG: 'ko_KR.UTF-8'
      }
    });

    let inventoryStdout = '';
    let inventoryStderr = '';

    inventoryProcess.stdout.on('data', (data) => {
      inventoryStdout += data.toString('utf8');
    });

    inventoryProcess.stderr.on('data', (data) => {
      inventoryStderr += data.toString('utf8');
    });

    inventoryProcess.on('close', async (code) => {
      if (code === 0) {
        try {
          // JSON_RESULT_START와 JSON_RESULT_END 사이의 JSON 추출
          const jsonStart = inventoryStdout.indexOf('JSON_RESULT_START');
          const jsonEnd = inventoryStdout.indexOf('JSON_RESULT_END');
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = inventoryStdout.substring(
              jsonStart + 'JSON_RESULT_START'.length,
              jsonEnd
            ).trim();
            
            const inventoryResult = JSON.parse(jsonStr);
            
            if (inventoryResult.success) {
              // 품목 기본정보 조회
              const productProcess = createPythonProcess([
                pythonScriptPath,
                'product_basic_json',
                '',
                ''
              ], {
                cwd: path.dirname(pythonScriptPath),
                env: { 
                  ...process.env, 
                  PYTHONIOENCODING: 'utf-8',
                  LANG: 'ko_KR.UTF-8'
                }
              });

              let productStdout = '';
              let productStderr = '';

              productProcess.stdout.on('data', (data) => {
                productStdout += data.toString('utf8');
              });

              productProcess.stderr.on('data', (data) => {
                productStderr += data.toString('utf8');
              });

              productProcess.on('close', (productCode) => {
                try {
                  let materialsData = inventoryResult.data;
                  
                  if (productCode === 0) {
                    const productJsonStart = productStdout.indexOf('JSON_RESULT_START');
                    const productJsonEnd = productStdout.indexOf('JSON_RESULT_END');
                    
                    if (productJsonStart !== -1 && productJsonEnd !== -1) {
                      const productJsonStr = productStdout.substring(
                        productJsonStart + 'JSON_RESULT_START'.length,
                        productJsonEnd
                      ).trim();
                      
                      const productResult = JSON.parse(productJsonStr);
                      
                      if (productResult.success) {
                        // 품목정보를 맵으로 변환 (PROD_CD -> PROD_DES 매핑)
                        const productMap = new Map();
                        productResult.data.forEach((product: any[]) => {
                          if (product[0]) { // PROD_CD가 있는 경우
                            productMap.set(product[0], product[1] || ''); // PROD_CD -> PROD_DES
                          }
                        });
                        
                        // 재고 데이터에 품목명 추가
                        materialsData = inventoryResult.data.map((item: any[]) => {
                          const prodCd = item[0] || '';
                          const prodDes = productMap.get(prodCd) || '';
                          
                          return [
                            item[0], // PROD_CD (품목코드)
                            prodDes, // PROD_DES (품목명) - 추가
                            '', // WH_CD (창고코드) - ECOUNT에서 제공하지 않으므로 빈 값
                            item[1], // BAL_QTY (재고수량) - 실제로는 두 번째 필드
                            ...item.slice(2) // 나머지 데이터
                          ];
                        });
                      }
                    }
                  }
                  
                  console.log(`✅ 자재관리 데이터 조회 성공: ${materialsData.length}개 품목`);
                  
                  res.json({
                    success: true,
                    data: materialsData,
                    message: `자재 관리 데이터 조회 성공 (${materialsData.length}개 품목)`,
                    lastUpdated: new Date().toISOString(),
                    baseDate: date
                  });
                  
                } catch (error) {
                  console.error('Product data parsing error:', error);
                  res.status(500).json({
                    success: false,
                    message: '품목 정보 처리 중 오류 발생',
                    error: error.message
                  });
                }
              });

            } else {
              res.status(500).json({
                success: false,
                message: '재고현황 조회 실패',
                error: inventoryResult.error
              });
            }
          } else {
            console.log('JSON 마커를 찾을 수 없음. Python 전체 출력:', inventoryStdout);
            res.status(500).json({
              success: false,
              message: 'Python 응답에서 JSON 데이터를 찾을 수 없습니다.',
              pythonOutput: inventoryStdout
            });
          }
        } catch (error) {
          console.error('JSON 파싱 오류:', error);
          console.log('Python 출력:', inventoryStdout);
          res.status(500).json({
            success: false,
            message: 'Python 응답 JSON 파싱 실패',
            error: error.message,
            pythonOutput: inventoryStdout
          });
        }
      } else {
        console.error(`Python script failed with code ${code}:`, inventoryStderr);
        res.status(500).json({
          success: false,
          message: 'Python 스크립트 실행 실패',
          error: inventoryStderr,
          code: code
        });
      }
    });

    inventoryProcess.on('error', (error) => {
      console.error('Python process error:', error);
      res.status(500).json({
        success: false,
        message: 'Python 프로세스 오류',
        error: error.message
      });
    });
    
  } catch (error) {
    console.error('Materials management API error:', error);
    res.status(500).json({
      success: false,
      message: '자재 관리 데이터 조회 중 오류 발생',
      error: error.message
    });
  }
});

export default router;