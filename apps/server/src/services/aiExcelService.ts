import OpenAI from 'openai';

// Initialize OpenAI client dynamically to ensure env vars are loaded
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({
    apiKey: apiKey,
  });
}

interface ParsedSchedule {
  date: string;
  workType: string;
  productName: string;
}

export class AIExcelService {
  
  static convertExcelDataToText(excelData: any[][]): string {
    if (!excelData || excelData.length === 0) return '';
    
    // 엑셀 데이터를 읽기 쉬운 텍스트로 변환
    let text = '';
    
    excelData.forEach((row, rowIndex) => {
      const rowText = row.map((cell, colIndex) => {
        const columnLetter = String.fromCharCode(65 + colIndex); // A, B, C...
        return `${columnLetter}: ${cell || ''}`;
      }).join(' | ');
      
      text += `Row ${rowIndex + 1}: ${rowText}\n`;
    });
    
    return text;
  }

  static async parseExcelWithAI(
    excelData: any[][], 
    fileName: string
  ): Promise<ParsedSchedule[]> {
    try {
      console.log('=== AI 파싱 시작 ===');
      console.log('파일명:', fileName);
      console.log('엑셀 데이터 행 수:', excelData.length);
      console.log('첫 5행 샘플:', excelData.slice(0, 5));
      
      const excelText = this.convertExcelDataToText(excelData);
      console.log('변환된 텍스트 길이:', excelText.length);
      console.log('변환된 텍스트 미리보기:', excelText.substring(0, 500));
      
      const prompt = `
다음은 생산 일정이 담긴 엑셀 데이터입니다. 파일명: ${fileName}

엑셀 데이터:
${excelText}

이 데이터에서 생산 일정 정보를 추출해주세요. 다음 규칙을 따라주세요:

1. 날짜: 1~31 숫자가 있는 행을 찾아 날짜로 인식
2. 작업 유형: 오븐, 혼합, 포장, 선별, 풍력, 믹싱, 노링 등의 키워드
3. 제품명: 작업 유형과 함께 있는 제품 정보 (중량, 개수, 횟수 포함)
4. 파일명에서 연도/월 정보를 추출하여 정확한 날짜 계산

응답은 반드시 다음 JSON 배열 형태로만 해주세요:
[
  {
    "date": "2024-01-15",
    "workType": "오븐",
    "productName": "한손한끼플러스더블초코 990kg 5번"
  }
]

다른 설명이나 텍스트 없이 JSON만 응답해주세요.
`;

      console.log('OpenAI API 호출 중...');
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "당신은 엑셀 생산 일정 데이터를 분석하는 전문가입니다. JSON 형태로만 응답하세요."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const response = completion.choices[0]?.message?.content;
      console.log('AI 응답:', response);
      
      if (!response) {
        throw new Error('AI 응답을 받지 못했습니다');
      }

      // JSON 파싱 - 마크다운 코드 블록에서 JSON 추출
      let jsonString = response.trim();
      
      // ```json으로 시작하고 ```로 끝나는 마크다운 형태 처리
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsedData = JSON.parse(jsonString) as ParsedSchedule[];
      console.log('파싱된 데이터:', parsedData);
      console.log('=== AI 파싱 완료 ===');
      
      return parsedData;

    } catch (error) {
      console.error('=== AI 엑셀 파싱 오류 ===');
      console.error('에러:', error);
      console.error('에러 메시지:', (error as Error).message);
      console.error('에러 스택:', (error as Error).stack);
      throw new Error(`AI 파싱 실패: ${(error as Error).message}`);
    }
  }

  static convertToScheduleFormat(parsedData: ParsedSchedule[]) {
    return parsedData.map((item, index) => ({
      id: `ai-excel-${Date.now()}-${index}`,
      scheduledDate: item.date,
      workStage: item.workType,
      request: {
        company: { name: '엑셀 데이터' },
        product: { name: item.productName }
      },
      weight: '',
      status: 'PLANNED',
      notes: `${item.workType} - ${item.productName}`,
      source: 'ai-excel'
    }));
  }
}