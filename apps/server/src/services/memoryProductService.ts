import { spawn } from 'child_process';
import path from 'path';

interface ProductData {
  prodCd: string;    // 제품코드
  prodNm: string;    // 제품명
}

class MemoryProductService {
  private products: ProductData[] = [];
  private isLoaded = false;
  private isLoading = false;

  constructor() {
    // 서버 시작 시 자동으로 제품 데이터 로드 (실제 데이터)
    setTimeout(() => {
      this.loadProductsFromPython();
    }, 3000);
  }

  // 임시 목업 데이터 로딩 (테스트용)
  private loadMockData(): void {
    console.log('🔄 임시 목업 데이터 로딩...');
    this.products = [
      { prodCd: 'A00322', prodNm: '크런치그래놀라(벌크)' },
      { prodCd: 'B00123', prodNm: '크림치즈케이크' },
      { prodCd: 'C00456', prodNm: '크로와상' },
      { prodCd: 'D00789', prodNm: '크래커' },
      { prodCd: 'E00101', prodNm: '플라이밀피스타치오-45g' },
      { prodCd: 'F00202', prodNm: '초콜릿쿠키' },
      { prodCd: 'G00303', prodNm: '바닐라케이크' },
      { prodCd: 'H00404', prodNm: '딸기잼' },
    ];
    this.isLoaded = true;
    console.log(`✅ ${this.products.length}개 목업 제품 데이터 로드 완료`);
    console.log('샘플:', this.products.slice(0, 3));
  }

  // Python 스크립트에서 제품 데이터 로드
  async loadProductsFromPython(): Promise<{ success: boolean; message: string; count?: number }> {
    if (this.isLoading) {
      return { success: false, message: '이미 로딩 중입니다.' };
    }

    this.isLoading = true;
    console.log('🔄 Python에서 제품 데이터 로딩 시작...');

    try {
      // test.py는 code 디렉토리에 있으므로 상위 디렉토리로 이동
      const rootDir = path.join(process.cwd(), '..', '..');
      const scriptPath = path.join(rootDir, 'test.py');
      
      // Python 스크립트 실행 - 자재관리 데이터에서 제품 정보 가져오기
      const pythonCode = `
import sys
import os
import json

# test.py가 있는 루트 디렉토리 경로 설정
working_dir = r'${rootDir.replace(/\\/g, '/')}'
sys.path.insert(0, working_dir)

try:
    # test.py 파일을 직접 실행하여 함수들을 사용 가능하게 만듦
    test_py_path = os.path.join(working_dir, 'test.py')
    if os.path.exists(test_py_path):
        exec(open(test_py_path).read())
        
        # get_materials_management 함수 호출
        result = get_materials_management()
        
        if result and result.get('success') and result.get('data'):
            products = []
            for item in result['data']:
                if 'prodCd' in item and 'prodNm' in item:
                    products.append({
                        'prodCd': item['prodCd'],
                        'prodNm': item['prodNm']
                    })
            
            print(json.dumps({
                'success': True,
                'data': products,
                'count': len(products)
            }, ensure_ascii=False))
        else:
            print(json.dumps({'success': False, 'message': '데이터를 가져올 수 없습니다.'}, ensure_ascii=False))
    else:
        print(json.dumps({'success': False, 'message': f'test.py 파일을 찾을 수 없습니다: {test_py_path}'}, ensure_ascii=False))
        
except Exception as e:
    import traceback
    print(json.dumps({'success': False, 'message': f'Python 스크립트 오류: {str(e)}', 'traceback': traceback.format_exc()}, ensure_ascii=False))
`;

      const pythonProcess = spawn('python', ['-c', pythonCode], {
        cwd: process.cwd(),
        encoding: 'utf8'
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      return new Promise((resolve) => {
        pythonProcess.on('close', (code) => {
          this.isLoading = false;

          if (code !== 0) {
            console.error('❌ Python 스크립트 실행 실패:', stderr);
            resolve({
              success: false,
              message: `Python 스크립트 실행 실패 (코드: ${code}): ${stderr}`
            });
            return;
          }

          try {
            const result = JSON.parse(stdout.trim());
            
            if (result.success && result.data) {
              this.products = result.data;
              this.isLoaded = true;
              console.log(`✅ ${result.count}개 제품 데이터 메모리 로딩 완료`);
              
              // 샘플 데이터 확인
              const sampleProducts = this.products.slice(0, 3);
              console.log('📦 샘플 제품 데이터:', sampleProducts);
              
              resolve({
                success: true,
                message: `${result.count}개 제품이 성공적으로 로드되었습니다.`,
                count: result.count
              });
            } else {
              console.error('❌ Python에서 데이터 처리 실패:', result.message);
              resolve({
                success: false,
                message: result.message || '데이터 처리 실패'
              });
            }
          } catch (parseError) {
            console.error('❌ JSON 파싱 오류:', parseError);
            console.error('Raw stdout:', stdout);
            resolve({
              success: false,
              message: `JSON 파싱 오류: ${parseError.message}`
            });
          }
        });
      });

    } catch (error) {
      this.isLoading = false;
      console.error('❌ 제품 데이터 로딩 오류:', error);
      return {
        success: false,
        message: `제품 데이터 로딩 실패: ${error.message}`
      };
    }
  }

  // 제품 검색 (자동완성용)
  searchProducts(searchTerm: string, limit: number = 15): Array<{id: string; productCode: string; productName: string}> {
    if (!this.isLoaded || !searchTerm || searchTerm.trim().length < 1) {
      return [];
    }

    const trimmedTerm = searchTerm.trim().toLowerCase();
    
    // 검색 알고리즘: 시작하는 것 우선, 포함하는 것 나중
    const startsWith = this.products.filter(product => 
      product.prodNm.toLowerCase().startsWith(trimmedTerm) ||
      product.prodCd.toLowerCase().startsWith(trimmedTerm)
    );

    const contains = this.products.filter(product => 
      !startsWith.includes(product) && (
        product.prodNm.toLowerCase().includes(trimmedTerm) ||
        product.prodCd.toLowerCase().includes(trimmedTerm)
      )
    );

    // 결과 합치기 및 제한
    const results = [...startsWith, ...contains].slice(0, limit);
    
    // API 형식에 맞게 변환
    return results.map((product, index) => ({
      id: `${product.prodCd}_${index}`,
      productCode: product.prodCd,
      productName: product.prodNm
    }));
  }

  // 로딩 상태 확인
  getStatus(): { isLoaded: boolean; isLoading: boolean; productCount: number } {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      productCount: this.products.length
    };
  }

  // 수동 새로고침
  async refresh(): Promise<{ success: boolean; message: string; count?: number }> {
    this.isLoaded = false;
    this.products = [];
    return this.loadProductsFromPython();
  }

  // 특정 제품 검색 (디버깅용)
  findProduct(searchTerm: string): ProductData | null {
    const term = searchTerm.toLowerCase();
    return this.products.find(p => 
      p.prodNm.toLowerCase().includes(term) || 
      p.prodCd.toLowerCase().includes(term)
    ) || null;
  }
}

// 싱글톤 인스턴스
export const memoryProductService = new MemoryProductService();