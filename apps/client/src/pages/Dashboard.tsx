import React, { useEffect, useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery } from 'react-query';
import { CalendarIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';
import ScheduleModal from '../components/ScheduleModal';
import { format, startOfDay, endOfDay, isBefore, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useScheduleContext } from '../contexts/ScheduleContext';
import { CapacitySettingsModal } from '../components/CapacitySettingsModal';

interface ScheduleEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    schedule: any;
  };
}

const Dashboard: React.FC = () => {
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [dailyCapacity, setDailyCapacity] = useState(() => {
    const saved = localStorage.getItem('dailyCapacity');
    return saved ? Number(saved) : 100000;
  });
  const { uploadedSchedules } = useScheduleContext();

  function getEventColor(status: string, workStage: string): string {
    if (status === 'COMPLETED') return '#10b981';
    if (status === 'IN_PROGRESS') return '#f59e0b';
    if (status === 'DELAYED') return '#ef4444';
    
    // 작업 유형에 따른 색상 분류
    switch (workStage) {
      case '오븐':
      case 'OVEN': return '#dc2626'; // 빨간색
      case '혼합':
      case 'MIXING': return '#3b82f6'; // 파란색
      case '포장':
      case 'PACKAGING': return '#8b5cf6'; // 보라색
      case '선별':
      case 'SORTING': return '#06b6d4'; // 청록색
      case '믹싱': return '#0ea5e9'; // 하늘색
      case '노링': return '#84cc16'; // 녹색
      case '제조': return '#f97316'; // 주황색
      case '검사':
      case 'QA': return '#a855f7'; // 자주색
      default: return '#6b7280'; // 회색
    }
  }

  function getEventBorderColor(status: string): string {
    if (status === 'DELAYED') return '#dc2626';
    return 'transparent';
  }

  const { data: schedules, isLoading, refetch } = useQuery(
    ['schedules', currentDate],
    () => {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return api.getSchedules(start.toISOString(), end.toISOString());
    },
    {
      refetchInterval: 5000, // 5초마다 새로고침
      refetchOnWindowFocus: true,
    }
  );

  // 발주 계획 데이터 가져오기
  const { data: orderPlans, refetch: refetchOrderPlans } = useQuery(
    ['order-plans', currentDate],
    () => {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return api.getOrderPlans(start.toISOString(), end.toISOString());
    },
    {
      refetchInterval: 5000, // 5초마다 새로고침  
      refetchOnWindowFocus: true,
    }
  );

  // DB 기반 통계 조회
  const { data: dbStats, refetch: refetchStats } = useQuery(
    'dashboard-stats',
    api.getDashboardStats,
    {
      refetchInterval: 5000, // 5초마다 새로고침
      refetchOnWindowFocus: true,
    }
  );

  // 용량 사용률 계산 (클라이언트 측 용량 설정 반영)
  const calculatedStats = useMemo(() => {
    if (!dbStats?.data) {
      return {
        todaySchedules: 0,
        completionRate: 0,
        delayedSchedules: 0,
        capacityUtilization: 0,
        todayTotalQuantity: 0
      };
    }

    const { todayTotalQuantity } = dbStats.data;
    const capacityUsage = dailyCapacity > 0
      ? Math.min(Math.round((todayTotalQuantity / dailyCapacity) * 100), 999)
      : 0;

    console.log('Dashboard Stats:', {
      ...dbStats.data,
      dailyCapacity,
      capacityUsage
    });

    return {
      todaySchedules: dbStats.data.todaySchedules,
      completionRate: dbStats.data.completionRate,
      delayedSchedules: dbStats.data.delayedSchedules,
      capacityUtilization: capacityUsage,
      todayTotalQuantity
    };
  }, [dbStats, dailyCapacity]);

  // 서버 데이터와 업로드된 데이터 합치기
  const allSchedules = [...(schedules || []), ...uploadedSchedules];
  
  // 발주 계획을 캘린더 이벤트로 변환
  const orderPlanEvents: ScheduleEvent[] = (orderPlans?.data || []).map((orderPlan: any) => {
    const title = `${orderPlan.workType || '혼합'} | ${orderPlan.productName} | 1/1번`;
    
    return {
      id: `order-plan-${orderPlan.id}`,
      title: title,
      start: orderPlan.desiredDate,
      backgroundColor: getEventColor('PLANNED', orderPlan.workType || 'MIXING'),
      borderColor: getEventBorderColor('PLANNED'),
      extendedProps: {
        schedule: {
          id: orderPlan.id,
          scheduledDate: orderPlan.desiredDate,
          workStage: orderPlan.workType || '혼합',
          request: {
            company: { name: orderPlan.companyName },
            product: { name: orderPlan.productName }
          },
          plannedQty: orderPlan.orderQuantity,
          weight: orderPlan.weight ? `${orderPlan.weight}kg` : '',
          repeatCount: 1,
          repeatIndex: orderPlan.repeatProgress || 1,
          status: orderPlan.status || 'PLANNED',
          notes: orderPlan.details,
          orderNumber: orderPlan.orderNumber,
          deliveryDate: orderPlan.deliveryDate,
          isOrderPlan: true
        },
        workType: orderPlan.workType || '혼합',
        productName: orderPlan.productName,
        weight: orderPlan.weight ? `${orderPlan.weight}kg` : '',
        repeatInfo: `${orderPlan.repeatProgress || 1}/1`
      }
    };
  });
  
  const events: ScheduleEvent[] = [...allSchedules.map((schedule: any) => {
    // 3컴럼 형식으로 제목 구성
    const workType = schedule.workStage || '기타';
    const productName = schedule.request?.product?.name || '미지정';
    const weight = schedule.weight || '';
    const repeatInfo = schedule.repeatIndex ? `${schedule.repeatIndex}/${schedule.repeatCount}` : '1/1';
    
    const title = `${workType} | ${productName} ${weight} | ${repeatInfo}번`;
    
    return {
      id: schedule.id,
      title: title,
      start: schedule.scheduledDate,
      backgroundColor: getEventColor(schedule.status, schedule.workStage),
      borderColor: getEventBorderColor(schedule.status),
      extendedProps: {
        schedule,
        workType,
        productName,
        weight,
        repeatInfo
      }
    };
  }), ...orderPlanEvents];

  const handleEventClick = (info: any) => {
    setSelectedSchedule(info.event.extendedProps.schedule);
    setShowModal(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    // 날짜 클릭 시 일간 보기로 전환
    const selectedDate = new Date(selectInfo.start);
    setCurrentDate(selectedDate);
    setView('day');
  };

  const handleDateClick = (info: any) => {
    // 캘린더의 날짜 클릭 시 일간 보기로 전환
    const clickedDate = new Date(info.date);
    setCurrentDate(clickedDate);
    setView('day');
  };

  const handleCapacitySave = (capacity: number) => {
    setDailyCapacity(capacity);
    localStorage.setItem('dailyCapacity', capacity.toString());
  };

  return (
    <div className="h-full flex flex-col">
      {/* 상단 통계 카드 */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">오늘 일정</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {calculatedStats.todaySchedules}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">완료율</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {calculatedStats.completionRate}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">지연 일정</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {calculatedStats.delayedSchedules}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="bg-purple-50 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors"
            onClick={() => setShowCapacityModal(true)}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">%</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">용량 사용률</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {calculatedStats.capacityUtilization}%
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  {calculatedStats.todayTotalQuantity.toLocaleString()} / {dailyCapacity.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
          </div>
          
          <div className="text-sm text-gray-600">
            마지막 업데이트: {format(new Date(), 'HH:mm:ss', { locale: ko })}
          </div>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow-sm h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
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
              events={events}
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

      {/* 일정 상세 모달 */}
      {showModal && selectedSchedule && (
        <ScheduleModal
          schedule={selectedSchedule}
          onClose={() => {
            setShowModal(false);
            setSelectedSchedule(null);
          }}
          onSave={() => {
            refetch();
            refetchOrderPlans();
            refetchStats(); // 통계 새로고침
            setShowModal(false);
            setSelectedSchedule(null);
          }}
        />
      )}

      {/* 용량 설정 모달 */}
      <CapacitySettingsModal
        isOpen={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        currentCapacity={dailyCapacity}
        onSave={handleCapacitySave}
      />
    </div>
  );
};

export default Dashboard;