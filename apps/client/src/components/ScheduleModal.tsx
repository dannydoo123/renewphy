import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface ScheduleModalProps {
  schedule: any;
  onClose: () => void;
  onSave: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ schedule, onClose, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    workType: '',
    weight: '',
    status: '',
    repeatProgress: 0,
    scheduledDate: '',
    totalRepeatCount: 5
  });

  // 발주 계획인지 확인
  const isOrderPlan = schedule?.isOrderPlan || false;
  
  // 작업 유형 옵션
  const workTypeOptions = [
    { value: 'OVEN', label: '오븐' },
    { value: 'MIXING', label: '혼합' },
    { value: 'PACKAGING', label: '포장' },
    { value: 'SORTING', label: '선별' }
  ];
  
  // 상태 옵션 (발주 계획용)
  const statusOptions = [
    { value: 'PLANNED', label: '계획됨' },
    { value: 'IN_PRODUCTION', label: '생산 진행중' },
    { value: 'PRODUCTION_COMPLETED', label: '생산 완료' },
    { value: 'INSPECTION', label: '검수' },
    { value: 'SHIPPING', label: '출고' },
    { value: 'DELIVERY_COMPLETED', label: '납품 완료' }
  ];

  useEffect(() => {
    if (schedule && isOrderPlan) {
      setEditData({
        workType: schedule.workStage || 'MIXING',
        weight: schedule.weight ? schedule.weight.replace('kg', '') : '',
        status: schedule.status || 'PLANNED',
        repeatProgress: schedule.repeatIndex || 0,
        scheduledDate: schedule.scheduledDate || '',
        totalRepeatCount: schedule.repeatCount || 5
      });
    }
  }, [schedule, isOrderPlan]);

  const handleSave = async () => {
    if (!isOrderPlan) {
      onSave();
      return;
    }

    setIsSaving(true);
    try {
      const updatePayload = {
        workType: editData.workType,
        weight: editData.weight ? parseInt(editData.weight) : null,
        status: editData.status,
        repeatProgress: editData.repeatProgress,
        desiredDate: editData.scheduledDate,
        repeatCount: editData.totalRepeatCount
      };

      const response = await api.updateOrderPlan(schedule.id.toString(), updatePayload);
      
      // 서버 응답으로 schedule 객체 업데이트
      if (response.success && response.data) {
        // schedule 객체를 업데이트된 데이터로 변경
        schedule.workStage = response.data.workType || editData.workType;
        schedule.weight = response.data.weight ? `${response.data.weight}kg` : editData.weight ? `${editData.weight}kg` : '';
        schedule.status = response.data.status || editData.status;
        schedule.repeatIndex = response.data.repeatProgress || editData.repeatProgress;
        schedule.repeatCount = response.data.repeatCount || editData.totalRepeatCount;
        schedule.scheduledDate = response.data.desiredDate || editData.scheduledDate;
      }
      
      toast.success('발주 계획이 성공적으로 수정되었습니다!');
      setIsEditing(false);
      
      // onSave 콜백 호출하여 부모 컴포넌트 새로고침
      onSave();
    } catch (error: any) {
      console.error('발주 계획 수정 실패:', error);
      toast.error(error.response?.data?.message || '수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED': return 'bg-gray-100 text-gray-800';
      case 'IN_PRODUCTION': return 'bg-yellow-100 text-yellow-800';
      case 'PRODUCTION_COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'INSPECTION': return 'bg-purple-100 text-purple-800';
      case 'SHIPPING': return 'bg-orange-100 text-orange-800';
      case 'DELIVERY_COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const getWorkTypeLabel = (workType: string) => {
    const option = workTypeOptions.find(opt => opt.value === workType);
    return option ? option.label : workType;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {getWorkTypeLabel(schedule.workStage)} - {schedule.request?.product?.name}
              {isOrderPlan && (
                <span className="ml-2 text-sm text-blue-600 font-medium">
                  ({schedule.orderNumber})
                </span>
              )}
            </h2>
            <div className="flex items-center space-x-2 mt-2">
              <p className="text-sm text-gray-600">
                {format(new Date(schedule.scheduledDate), 'PPP', { locale: ko })}
              </p>
              {schedule.weight && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  {schedule.weight}
                </span>
              )}
              {schedule.repeatIndex && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                  {schedule.repeatIndex}/{schedule.repeatCount}번
                </span>
              )}
              {isOrderPlan && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                  발주계획
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isOrderPlan && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                편집
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">작업 정보</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">작업 유형</label>
                  {isEditing && isOrderPlan ? (
                    <select
                      value={editData.workType}
                      onChange={(e) => setEditData(prev => ({ ...prev, workType: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {workTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-1 text-gray-900 font-semibold">{getWorkTypeLabel(schedule.workStage)}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">제품명</label>
                  <p className="mt-1 text-gray-900">{schedule.request?.product?.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">중량 (kg)</label>
                  {isEditing && isOrderPlan ? (
                    <input
                      type="number"
                      min="0"
                      value={editData.weight}
                      onChange={(e) => setEditData(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="중량 입력"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 font-medium text-blue-600">
                      {schedule.weight || '미입력'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">상태</label>
                  {isEditing && isOrderPlan ? (
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(schedule.status)}`}>
                      {isOrderPlan ? getStatusLabel(schedule.status) : (
                        schedule.status === 'PLANNED' ? '계획됨' :
                        schedule.status === 'IN_PROGRESS' ? '진행중' :
                        schedule.status === 'COMPLETED' ? '완료' :
                        schedule.status === 'DELAYED' ? '지연' : '취소'
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">일정 정보</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">예정 날짜</label>
                  {isEditing && isOrderPlan ? (
                    <input
                      type="date"
                      value={editData.scheduledDate}
                      onChange={(e) => setEditData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900">
                      {format(new Date(schedule.scheduledDate), 'yyyy년 MM월 dd일', { locale: ko })}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">반복 진행</label>
                  {isEditing && isOrderPlan ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600">총 횟수:</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={editData.totalRepeatCount}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            setEditData(prev => ({ 
                              ...prev, 
                              totalRepeatCount: value,
                              repeatProgress: Math.min(prev.repeatProgress, value)
                            }));
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-xs text-gray-600">회</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-600">현재 진행:</label>
                        <input
                          type="number"
                          min="0"
                          max={editData.totalRepeatCount}
                          value={editData.repeatProgress}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setEditData(prev => ({ 
                              ...prev, 
                              repeatProgress: Math.min(value, prev.totalRepeatCount)
                            }));
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-xs text-gray-600">/ {editData.totalRepeatCount}회</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex bg-gray-200 rounded-md h-8 overflow-hidden">
                          {Array.from({ length: editData.totalRepeatCount }, (_, i) => (
                            <div
                              key={i}
                              className={`flex-1 border-r border-white last:border-r-0 transition-colors duration-300 ${
                                i < editData.repeatProgress
                                  ? 'bg-green-500'
                                  : 'bg-gray-300'
                              }`}
                              onClick={() => setEditData(prev => ({ ...prev, repeatProgress: i + 1 }))}
                              style={{ cursor: 'pointer' }}
                              title={`${i + 1}회차`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {editData.repeatProgress} / {editData.totalRepeatCount}회 완료 ({Math.round((editData.repeatProgress / editData.totalRepeatCount) * 100)}%)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-gray-900">
                          {schedule.repeatIndex || editData.repeatProgress || 0} / {schedule.repeatCount || editData.totalRepeatCount || 5}회
                        </span>
                      </div>
                      <div className="flex bg-gray-200 rounded-md h-6 overflow-hidden">
                        {Array.from({ length: schedule.repeatCount || editData.totalRepeatCount || 5 }, (_, i) => (
                          <div
                            key={i}
                            className={`flex-1 border-r border-white last:border-r-0 ${
                              i < (schedule.repeatIndex || editData.repeatProgress || 0)
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                            title={`${i + 1}회차`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {Math.round(((schedule.repeatIndex || editData.repeatProgress || 0) / (schedule.repeatCount || editData.totalRepeatCount || 5)) * 100)}% 완료
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">계획 수량</label>
                  <p className="mt-1 text-gray-900">{schedule.plannedQty || 1}개</p>
                </div>
              </div>
            </div>
          </div>

          {/* 메모 */}
          {schedule.notes && (
            <div>
              <label className="text-sm font-medium text-gray-700">상세 정보</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-gray-900 whitespace-pre-wrap">{schedule.notes}</p>
              </div>
            </div>
          )}

          {/* 발주 계획 추가 정보 */}
          {isOrderPlan && schedule.deliveryDate && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">발주 정보</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <span className="font-medium">발주번호:</span> {schedule.orderNumber}
                </div>
                <div>
                  <span className="font-medium">납기일:</span> {format(new Date(schedule.deliveryDate), 'PPP', { locale: ko })}
                </div>
                <div>
                  <span className="font-medium">회사명:</span> {schedule.request?.company?.name}
                </div>
                <div>
                  <span className="font-medium">발주수량:</span> {schedule.plannedQty?.toLocaleString()}개
                </div>
              </div>
            </div>
          )}

          {/* 업로드 정보 */}
          {schedule.importedAt && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">업로드 정보</h4>
              <p className="text-sm text-gray-700">
                업로드 시간: {format(new Date(schedule.importedAt), 'PPpp', { locale: ko })}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
          >
            닫기
          </button>
          {isEditing && isOrderPlan ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    저장 중...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-1" />
                    저장
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              저장
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;