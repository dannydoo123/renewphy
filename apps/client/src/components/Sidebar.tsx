import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  CalendarIcon, 
  CubeIcon, 
  DocumentArrowUpIcon,
  PlayIcon,
  ChartBarIcon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import FileUpload from './FileUpload';
import ActionButtons from './ActionButtons';
import { useScheduleContext } from '../contexts/ScheduleContext';
import { api } from '../services/api';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, width = 320 }) => {
  const location = useLocation();
  const [showFileUpload, setShowFileUpload] = useState(false);
  const { addUploadedSchedules } = useScheduleContext();

  const { data: unreadCountData } = useQuery(
    'unread-notification-count',
    () => api.getUnreadChangesCount(),
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    }
  );

  const unreadCount = unreadCountData?.data?.count || 0;

  const navigation = [
    { name: '대시보드', href: '/', icon: ChartBarIcon },
    { name: '생산 일정', href: '/schedule', icon: CalendarIcon },
    { name: '자재 관리', href: '/materials', icon: CubeIcon },
    { name: '발주서 현황', href: '/purchase-orders', icon: ClipboardDocumentListIcon },
    { name: '알림', href: '/notifications', icon: BellIcon },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Sidebar */}
      <div 
        className="h-full bg-white flex flex-col"
        style={{ width: `${width}px` }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 truncate">메뉴</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 lg:hidden flex-shrink-0 ml-2"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isNotificationItem = item.href === '/notifications';
              const showBadge = isNotificationItem && unreadCount && unreadCount > 0;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className={`truncate ${width < 280 ? 'hidden' : ''}`}>{item.name}</span>
                  </div>
                  {showBadge && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[20px]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* File Upload Section */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={() => setShowFileUpload(true)}
              className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              파일 추가/메인 지정
            </button>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-gray-200 p-4">
            <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${width < 280 ? 'hidden' : ''}`}>빠른 실행</h3>
            <ActionButtons width={width} />
          </div>
        </div>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUpload 
          onClose={() => setShowFileUpload(false)} 
          onUploadComplete={(schedules) => {
            addUploadedSchedules(schedules);
            setShowFileUpload(false);
          }}
        />
      )}
    </>
  );
};

export default Sidebar;