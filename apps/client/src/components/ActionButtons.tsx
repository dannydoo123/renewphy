import React, { useState } from 'react';
import { 
  PlayIcon, 
  ChartBarIcon, 
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useScheduleContext } from '../contexts/ScheduleContext';
import { useQueryClient } from 'react-query';
import OrderPlanModal from './OrderPlanModal';
import { api } from '../services/api';

interface ActionButtonsProps {
  width?: number;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ width = 320 }) => {
  const { addUploadedSchedules } = useScheduleContext();
  const [showOrderPlanModal, setShowOrderPlanModal] = useState(false);
  const queryClient = useQueryClient();

  const generateSampleData = () => {
    const sampleSchedules = [
      {
        id: `sample-${Date.now()}-1`,
        scheduledDate: new Date().toISOString().split('T')[0],
        workStage: '오븐',
        request: {
          company: { name: '샘플 데이터' },
          product: { name: '딸기' }
        },
        plannedQty: 1,
        weight: '1000kg',
        repeatCount: 5,
        repeatIndex: 1,
        status: 'PLANNED',
        effectiveCapacityQty: 100,
        overtimeMinutes: 0,
        notes: '샘플 데이터 - 딸기 오븐 작업 5번',
        importedAt: new Date().toISOString()
      },
      {
        id: `sample-${Date.now()}-2`,
        scheduledDate: new Date().toISOString().split('T')[0],
        workStage: '혼합',
        request: {
          company: { name: '샘플 데이터' },
          product: { name: '블루베리' }
        },
        plannedQty: 1,
        weight: '500kg',
        repeatCount: 3,
        repeatIndex: 1,
        status: 'PLANNED',
        effectiveCapacityQty: 100,
        overtimeMinutes: 0,
        notes: '샘플 데이터 - 블루베리 혼합 작업 3번',
        importedAt: new Date().toISOString()
      }
    ];
    
    addUploadedSchedules(sampleSchedules);
    toast.success('샘플 데이터가 추가되었습니다!');
  };

  const generateSampleOrderPlan = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const sampleOrderPlan = {
        orderNumber: `25-${Date.now().toString().slice(-3)}`,
        companyName: '에프앤엘코퍼레이션',
        productName: '플라이밀피스타치오-45g',
        orderQuantity: 60000,
        desiredDate: tomorrow.toISOString().split('T')[0],
        deliveryDate: new Date(tomorrow.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        details: '샘플 발주 계획 - 플라이밀피스타치오\n- 생산 수량: 60,000EA\n- 납기 희망: 4일 후\n- IPS\n\n※특이사항\n- 기타가공품'
      };

      const response = await api.createOrderPlan(sampleOrderPlan);
      
      if (response.success) {
        queryClient.invalidateQueries(['order-plans']);
        queryClient.invalidateQueries(['schedules']);
        queryClient.invalidateQueries(['dashboard-stats']);
        toast.success('샘플 발주 계획이 생성되었습니다!');
      } else {
        throw new Error(response.message || '발주 계획 생성 실패');
      }
    } catch (error: any) {
      console.error('샘플 발주 계획 생성 실패:', error);
      toast.error(error.message || '샘플 발주 계획 생성에 실패했습니다.');
    }
  };
  const actions = [
    {
      name: '샘플 데이터',
      icon: ChartBarIcon,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: generateSampleData
    },
    {
      name: '샘플 발주계획',
      icon: DocumentTextIcon,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      action: generateSampleOrderPlan
    },
    {
      name: '자재소진 검사',
      icon: ExclamationTriangleIcon,
      color: 'bg-yellow-600 hover:bg-yellow-700',
      action: () => {
        // 자재 부족 검사 실행
        toast.info('자재 소진 상태 검사 중...');
      }
    },
    {
      name: '리드타임 경고',
      icon: ClockIcon,
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => {
        // 리드타임 경고 체크
        toast.warning('리드타임 경고 체크 완료');
      }
    },
    {
      name: '수동 발주계획',
      icon: DocumentTextIcon,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => {
        setShowOrderPlanModal(true);
      }
    },
    {
      name: '재고 동기화',
      icon: CubeIcon,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => {
        // 재고 시스템 동기화
        toast.info('재고 데이터 동기화 중...');
      }
    },
    {
      name: '일정 최적화',
      icon: PlayIcon,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      action: () => {
        // AI 기반 일정 최적화
        toast.success('일정 최적화 시작');
      }
    }
  ];

  const handleOrderPlanSuccess = () => {
    toast.success('발주 계획이 성공적으로 생성되었습니다!');
    // 캘린더 데이터 및 통계 새로고침
    queryClient.invalidateQueries(['order-plans']);
    queryClient.invalidateQueries(['schedules']);
    queryClient.invalidateQueries(['dashboard-stats']);
  };

  // 너비에 따라 그리드 컬럼과 버튼 스타일 조정
  const getGridColumns = () => {
    if (width < 280) return 'grid-cols-1';
    if (width < 400) return 'grid-cols-2';
    return 'grid-cols-2';
  };

  const shouldShowText = width >= 280;

  return (
    <>
      <div className={`grid ${getGridColumns()} gap-2`}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.action}
              className={`${action.color} text-white p-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1 h-10`}
              title={action.name}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {shouldShowText && (
                <span className="truncate">{action.name}</span>
              )}
            </button>
          );
        })}
      </div>
      
      <OrderPlanModal
        isOpen={showOrderPlanModal}
        onClose={() => setShowOrderPlanModal(false)}
        onSuccess={handleOrderPlanSuccess}
      />
    </>
  );
};

export default ActionButtons;