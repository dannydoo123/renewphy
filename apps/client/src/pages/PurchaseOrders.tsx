import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from 'react-query';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';
import PurchaseOrderModal from '../components/PurchaseOrderModal';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface PurchaseOrder {
  ORD_NO: string | number;
  ORD_DATE: string;
  CUST_DES: string;
  PROD_DES: string;
  QTY: string | number;
  BUY_AMT: string | number;
  VAT_AMT: string | number;
  TTL_CTT: string;
  TIME_DATE: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    purchaseOrder: PurchaseOrder;
  };
}

const PurchaseOrders: React.FC = () => {
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showOtherOrders, setShowOtherOrders] = useState(false);

  // 날짜 범위 계산 (최근 30일)
  const getDateRange = () => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 29);
    
    const formatDate = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '');
    
    return {
      from: formatDate(startDate),
      to: formatDate(now)
    };
  };

  const dateRange = getDateRange();

  const { data: purchaseOrdersData, isLoading, refetch, error } = useQuery(
    ['purchase-orders', dateRange],
    () => {
      console.log('🔍 발주서 API 호출 시작:', dateRange);
      return api.getPurchaseOrders(dateRange.from, dateRange.to);
    },
    {
      refetchInterval: 300000, // 5분마다 새로고침
      onSuccess: (data) => {
        console.log('✅ 발주서 API 응답 성공:', data);
      },
      onError: (error) => {
        console.error('❌ 발주서 조회 오류:', error);
      }
    }
  );

  // 디버깅용 로그
  console.log('📊 Purchase Orders 컴포넌트 상태:', {
    isLoading,
    error,
    hasData: !!purchaseOrdersData,
    dataLength: purchaseOrdersData?.data?.length || 0,
    dateRange
  });

  // 발주서 데이터를 캘린더 이벤트로 변환
  const { calendarEvents, ordersWithoutDate } = React.useMemo(() => {
    if (!purchaseOrdersData?.data) {
      return { calendarEvents: [], ordersWithoutDate: [] };
    }

    const events: CalendarEvent[] = [];
    const withoutDate: PurchaseOrder[] = [];

    purchaseOrdersData.data.forEach((orderArray: any[], index: number) => {
      const purchaseOrder: PurchaseOrder = {
        ORD_NO: orderArray[0] || '',
        ORD_DATE: orderArray[1] || '',
        CUST_DES: orderArray[2] || '',
        PROD_DES: orderArray[3] || '',
        QTY: orderArray[4] || 0,
        BUY_AMT: orderArray[5] || 0,
        VAT_AMT: orderArray[6] || 0,
        TTL_CTT: orderArray[7] || '',
        TIME_DATE: orderArray[8] || '',
      };

      // TIME_DATE가 있으면 캘린더 이벤트로, 없으면 별도 목록으로
      if (purchaseOrder.TIME_DATE && purchaseOrder.TIME_DATE !== '') {
        // YYYYMMDD 형식을 YYYY-MM-DD로 변환
        const timeDate = purchaseOrder.TIME_DATE;
        let eventDate = '';
        if (timeDate.length === 8) {
          eventDate = `${timeDate.slice(0, 4)}-${timeDate.slice(4, 6)}-${timeDate.slice(6, 8)}`;
        } else {
          eventDate = timeDate;
        }

        events.push({
          id: `po-${index}`,
          title: purchaseOrder.PROD_DES || '품목명 미정',
          start: eventDate,
          backgroundColor: getPurchaseOrderColor(purchaseOrder),
          borderColor: getPurchaseOrderBorderColor(purchaseOrder),
          extendedProps: {
            purchaseOrder
          }
        });
      } else {
        withoutDate.push(purchaseOrder);
      }
    });

    return { calendarEvents: events, ordersWithoutDate: withoutDate };
  }, [purchaseOrdersData]);

  // 발주서 색상 설정
  function getPurchaseOrderColor(order: PurchaseOrder): string {
    // 납기일 기준으로 색상 구분
    const today = new Date();
    const timeDate = order.TIME_DATE;
    
    if (timeDate && timeDate.length === 8) {
      const dueDate = new Date(`${timeDate.slice(0, 4)}-${timeDate.slice(4, 6)}-${timeDate.slice(6, 8)}`);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return '#ef4444'; // 지연 - 빨간색
      if (diffDays <= 3) return '#f59e0b'; // 임박 - 주황색
      if (diffDays <= 7) return '#eab308'; // 1주일 내 - 노란색
      return '#10b981'; // 여유 - 녹색
    }
    
    return '#6b7280'; // 기본 - 회색
  }

  function getPurchaseOrderBorderColor(order: PurchaseOrder): string {
    const today = new Date();
    const timeDate = order.TIME_DATE;
    
    if (timeDate && timeDate.length === 8) {
      const dueDate = new Date(`${timeDate.slice(0, 4)}-${timeDate.slice(4, 6)}-${timeDate.slice(6, 8)}`);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return '#dc2626'; // 지연 - 진한 빨간색
    }
    
    return 'transparent';
  }

  const handleEventClick = (info: any) => {
    setSelectedPurchaseOrder(info.event.extendedProps.purchaseOrder);
    setShowModal(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    const selectedDate = new Date(selectInfo.start);
    setCurrentDate(selectedDate);
    setView('day');
  };

  const handleDateClick = (info: any) => {
    const clickedDate = new Date(info.date);
    setCurrentDate(clickedDate);
    setView('day');
  };

  return (
    <div className="h-full flex flex-col">
      {/* 뷰 전환 버튼 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'month'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              월간 보기
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'week'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              주간 보기
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                view === 'day'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              일간 보기
            </button>
            
            {/* 나머지 항목 보기 */}
            <button
              onClick={() => setShowOtherOrders(!showOtherOrders)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showOtherOrders
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              나머지 ({ordersWithoutDate.length})
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            마지막 업데이트: {format(new Date(), 'HH:mm:ss', { locale: ko })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* 캘린더 */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm h-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full flex-col">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-gray-600">발주서 데이터를 불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full flex-col">
                <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-4" />
                <p className="text-red-600 mb-2">발주서 데이터를 불러오는 중 오류가 발생했습니다.</p>
                <p className="text-gray-500 text-sm mb-4">{error?.message || '알 수 없는 오류'}</p>
                <button 
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  다시 시도
                </button>
              </div>
            ) : !purchaseOrdersData?.data?.length ? (
              <div className="flex items-center justify-center h-full flex-col">
                <ClockIcon className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500">해당 기간에 발주서가 없습니다.</p>
                <p className="text-gray-400 text-sm mt-1">
                  기간: {dateRange.from.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')} ~ {dateRange.to.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
                </p>
              </div>
            ) : (
              <FullCalendar
                key={`${view}-${currentDate.getTime()}`}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={
                  view === 'month' ? 'dayGridMonth' :
                  view === 'week' ? 'timeGridWeek' :
                  'timeGridDay'
                }
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: ''
                }}
                events={calendarEvents}
                eventClick={handleEventClick}
                dateClick={handleDateClick}
                selectable={true}
                selectMirror={true}
                select={handleDateSelect}
                height="100%"
                locale="ko"
                dayMaxEvents={false}
                moreLinkClick="popover"
                eventDisplay="block"
                displayEventTime={false}
                initialDate={currentDate}
              />
            )}
          </div>
        </div>

        {/* 나머지 항목 사이드바 */}
        {showOtherOrders && (
          <div className="w-80 bg-white shadow-lg border-l border-gray-200 p-4">
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">납기일자 미정</h3>
            </div>
            
            <div className="space-y-2 max-h-full overflow-y-auto">
              {ordersWithoutDate.length > 0 ? (
                ordersWithoutDate.map((order, index) => (
                  <div
                    key={`other-${index}`}
                    className="bg-orange-50 rounded-lg p-3 cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => {
                      setSelectedPurchaseOrder(order);
                      setShowModal(true);
                    }}
                  >
                    <div className="font-medium text-gray-900 text-sm">
                      {order.PROD_DES || '품목명 미정'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      발주번호: {order.ORD_NO || '-'}
                    </div>
                    <div className="text-xs text-gray-600">
                      거래처: {order.CUST_DES || '-'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>납기일자 미정인 발주서가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 발주서 상세 모달 */}
      {showModal && selectedPurchaseOrder && (
        <PurchaseOrderModal
          purchaseOrder={selectedPurchaseOrder}
          onClose={() => {
            setShowModal(false);
            setSelectedPurchaseOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default PurchaseOrders;