import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { 
  BellIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const Notifications: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 페이지 진입 시 모든 알림을 읽음으로 표시
  useEffect(() => {
    const markNotificationsAsRead = async () => {
      try {
        await api.markAllChangesAsRead();
        // 읽지 않은 개수 캐시 무효화
        queryClient.invalidateQueries('unread-notification-count');
      } catch (error) {
        console.error('알림 읽음 처리 실패:', error);
      }
    };

    markNotificationsAsRead();
  }, [queryClient]);

  // 활동 로그 데이터 조회
  const { data: activityData, isLoading, refetch } = useQuery(
    ['activity-logs', currentPage, pageSize, selectedType, dateRange],
    () => api.getActivityLogs({
      page: currentPage,
      limit: pageSize,
      type: selectedType || undefined,
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined
    }),
    {
      refetchInterval: 30000, // 30초마다 새로고침
    }
  );

  // 변경사항 버퍼 데이터 조회
  const { data: changesData, refetch: refetchChanges } = useQuery(
    ['changes', currentPage, pageSize],
    () => api.getChanges({
      page: currentPage,
      limit: pageSize
    }),
    {
      refetchInterval: 10000, // 10초마다 새로고침
    }
  );

  // 통계 데이터 조회
  const { data: statsData } = useQuery(
    ['activity-stats', dateRange],
    () => api.getActivityLogStats(
      dateRange.startDate || undefined,
      dateRange.endDate || undefined
    ),
    {
      refetchInterval: 60000, // 1분마다 새로고침
    }
  );

  const activityTypes = [
    { value: '', label: '전체' },
    { value: 'ORDER_PLAN_CREATED', label: '발주 계획 생성' },
    { value: 'ORDER_PLAN_UPDATED', label: '발주 계획 수정' },
    { value: 'ORDER_PLAN_STATUS_CHANGED', label: '발주 상태 변경' },
    { value: 'PURCHASE_ORDER_UPDATED', label: '발주서 업데이트' },
    { value: 'MATERIAL_UPDATED', label: '자재 업데이트' },
    { value: 'SYSTEM_EVENT', label: '시스템 이벤트' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ORDER_PLAN_CREATED':
      case 'ORDER_PLAN_UPDATED':
        return DocumentTextIcon;
      case 'ORDER_PLAN_STATUS_CHANGED':
        return CheckCircleIcon;
      case 'PURCHASE_ORDER_UPDATED':
        return CalendarIcon;
      case 'MATERIAL_UPDATED':
        return CubeIcon;
      case 'SYSTEM_EVENT':
        return InformationCircleIcon;
      default:
        return BellIcon;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'ORDER_PLAN_CREATED':
        return 'text-green-600 bg-green-50';
      case 'ORDER_PLAN_UPDATED':
        return 'text-blue-600 bg-blue-50';
      case 'ORDER_PLAN_STATUS_CHANGED':
        return 'text-purple-600 bg-purple-50';
      case 'PURCHASE_ORDER_UPDATED':
        return 'text-orange-600 bg-orange-50';
      case 'MATERIAL_UPDATED':
        return 'text-cyan-600 bg-cyan-50';
      case 'SYSTEM_EVENT':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const handleDateRangeChange = (field: string, value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // 페이지를 첫 번째로 리셋
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1); // 페이지를 첫 번째로 리셋
  };

  const totalPages = activityData?.data?.pagination?.totalPages || 1;

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">알림</h1>
            <p className="text-gray-600 text-sm mt-1">
              시스템 활동 및 변경사항을 확인할 수 있습니다
            </p>
          </div>
          <button
            onClick={() => {
              refetch();
              refetchChanges();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      {statsData?.success && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <BellIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">총 알림</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {statsData.data.totalLogs?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">최근 24시간</p>
                  <p className="text-2xl font-bold text-green-900">
                    {statsData.data.recentActivity?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">발주 계획</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {statsData.data.typeStats
                      ?.filter(stat => stat.type.includes('ORDER_PLAN'))
                      ?.reduce((sum, stat) => sum + stat.count, 0) || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <CubeIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">자재 업데이트</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {statsData.data.typeStats
                      ?.find(stat => stat.type === 'MATERIAL_UPDATED')?.count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">유형:</label>
            <select
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {activityTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">기간:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">~</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">페이지 크기:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
          </div>
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : activityData?.data?.logs?.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {activityData.data.logs.map((log: any) => {
                const Icon = getActivityIcon(log.type);
                const colorClass = getActivityColor(log.type);
                
                return (
                  <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {log.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(log.createdAt), 'PPp', { locale: ko })}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                          {log.description}
                        </p>
                        {/* 변경사항 버퍼에서 자세한 정보 표시 */}
                        {log.data && log.data.changeId && (() => {
                          const changeRecord = changesData?.data?.changes?.find(c => c.id === log.data.changeId);
                          if (changeRecord) {
                            return (
                              <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                                <p className="text-sm text-blue-900 font-medium mb-2">
                                  {changeRecord.summary}
                                </p>
                                {/* 변경된 항목만 표시 */}
                                {changeRecord.changes && changeRecord.changes.length > 0 && (
                                  <div className="text-xs text-blue-700">
                                    {changeRecord.changes.length === 1 ? (
                                      // 하나만 변경된 경우 깔끔하게 표시
                                      <span>{changeRecord.changes[0].description}</span>
                                    ) : (
                                      // 여러 항목이 변경된 경우 목록으로 표시
                                      <div className="space-y-1">
                                        {changeRecord.changes.map((change, idx) => (
                                          <div key={idx}>
                                            • {change.description}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {/* 기존 changeDescription 표시 (fallback) */}
                        {log.data && log.data.changeDescription && !log.data.changeId && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                            <p className="text-sm text-blue-900">
                              {log.data.changeDescription}
                            </p>
                          </div>
                        )}
                        {log.data && log.type === 'ORDER_PLAN_CREATED' && (
                          <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-200">
                            <div className="text-sm text-green-900">
                              <p>발주번호: {log.data.orderNumber}</p>
                              <p>발주수량: {log.data.orderQuantity?.toLocaleString()}개</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">알림이 없습니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 페이지네이션 */}
      {activityData?.data?.pagination && totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {activityData.data.pagination.total}개 중{' '}
              {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, activityData.data.pagination.total)}개 표시
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="text-sm text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;