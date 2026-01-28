import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { XMarkIcon, DocumentArrowUpIcon, CheckIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  onClose: () => void;
  onUploadComplete?: (schedules: any[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onClose, onUploadComplete }) => {
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [mapping, setMapping] = useState<any>({});
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'complete'>('upload');
  const [parsedData, setParsedData] = useState<any[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Excel 파일 읽기
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('파일에 데이터가 없습니다');
      }

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);
      const preview = dataRows.slice(0, 3); // 미리보기용 첫 3행

      const result = {
        fileName: file.name,
        totalRows: dataRows.length,
        headers,
        preview,
        data: dataRows
      };
      
      setUploadResult(result);
      setParsedData(dataRows);
      setStep('mapping');
      toast.success('파일 업로드 완료!');
    } catch (error) {
      toast.error('파일 업로드 실패: ' + (error as Error).message);
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false,
    disabled: isUploading
  });


  // 시트명에서 연도와 월 추출
  const extractDateFromFileName = (fileName: string) => {
    const match = fileName.match(/(\d{2})년\s*(\d{1,2})/);
    if (match) {
      const year = 2000 + parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // JavaScript Date는 0부터 시작
      return { year, month };
    }
    
    // 현재 날짜 기본값
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  };

  // 월 경계 처리가 포함된 실제 날짜 계산
  const calculateActualDate = (dateNum: number, baseYear: number, baseMonth: number) => {
    // 날짜가 20~31 범위이고 기준월이 1월(0)이면 이전년 12월로 처리
    if (dateNum >= 20 && dateNum <= 31 && baseMonth === 0) {
      return new Date(baseYear - 1, 11, dateNum); // 이전년 12월
    }
    
    // 날짜가 1~10 범위이고 기준월이 12월(11)이면 다음년 1월로 처리  
    if (dateNum >= 1 && dateNum <= 10 && baseMonth === 11) {
      return new Date(baseYear + 1, 0, dateNum); // 다음년 1월
    }
    
    // 일반적인 경우
    return new Date(baseYear, baseMonth, dateNum);
  };


  const handleMappingSubmit = async () => {
    try {
      setIsUploading(true);
      
      // 엑셀 데이터를 AI API로 직접 전송
      const response = await api.post('/uploads/ai-parse-data', {
        excelData: parsedData,
        fileName: uploadResult.fileName
      });
      
      const { schedules } = response.data;
      console.log('AI 파싱된 스케줄:', schedules);
      
      // 생성된 스케줄을 상위 컴포넌트로 전달
      if (onUploadComplete) {
        onUploadComplete(schedules);
      }
      
      setStep('complete');
      toast.success(`AI 파싱 완료! ${schedules.length}개 일정이 생성되었습니다.`);
    } catch (error) {
      toast.error('AI 파싱 실패: ' + (error as any).response?.data?.details || (error as Error).message);
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetAsMain = async () => {
    try {
      toast.success('메인 파일로 설정되었습니다!');
      onClose();
    } catch (error) {
      toast.error('메인 파일 설정 실패');
      console.error(error);
    }
  };

  const fieldOptions = [
    { value: 'auto', label: '자동 처리' },
    { value: 'ignore', label: '무시' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'upload' ? '파일 업로드' : 
             step === 'mapping' ? '컬럼 매핑' : '업로드 완료'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary-400 bg-primary-50' : 
                  isUploading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                <input {...getInputProps()} />
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-lg font-medium text-gray-900">
                  {isUploading ? '업로드 중...' :
                   isDragActive ? '파일을 놓아주세요' : '파일을 드래그하거나 클릭하여 선택'}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Excel (.xlsx, .xls) 또는 CSV 파일만 지원됩니다
                </p>
              </div>

              {isUploading && (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              )}
            </div>
          )}

          {step === 'mapping' && uploadResult && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900">파일 정보</h3>
                <p className="text-sm text-blue-700 mt-1">
                  파일명: {uploadResult.fileName}<br/>
                  총 {uploadResult.totalRows}행의 데이터가 있습니다.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">컬럼 매핑</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Excel 컬럼
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          매핑할 필드
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          미리보기
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadResult.headers.map((header: string, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {header}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={mapping[index] || 'ignore'}
                              onChange={(e) => setMapping({...mapping, [index]: e.target.value})}
                              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                            >
                              {fieldOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {uploadResult.preview[0] && uploadResult.preview[0][index]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  뒤로
                </button>
                <button
                  onClick={handleMappingSubmit}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  매핑 완료
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">업로드 완료!</h3>
                <p className="text-gray-600 mt-2">
                  파일이 성공적으로 업로드되고 매핑되었습니다.
                </p>
              </div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                >
                  닫기
                </button>
                <button
                  onClick={handleSetAsMain}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  메인 파일로 지정
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;