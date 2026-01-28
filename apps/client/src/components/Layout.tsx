import React, { useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320); // 기본 320px (w-80)
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const minWidth = 240; // 최소 너비
  const maxWidth = 600; // 최대 너비

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return '생산 일정 관리 시스템';
      case '/schedule':
        return '생산 일정';
      case '/materials':
        return '자재 관리';
      case '/purchase-orders':
        return '발주서 현황';
      case '/notifications':
        return '알림';
      default:
        return '생산 일정 관리 시스템';
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    let animationFrameId: number | null = null;

    // CSS 커스텀 프로퍼티를 직접 업데이트하는 함수
    const updateSidebarWidth = (newWidth: number) => {
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      
      // CSS 커스텀 프로퍼티로 즉시 업데이트 (DOM 직접 조작)
      document.documentElement.style.setProperty('--sidebar-width', `${constrainedWidth}px`);
      
      // React 상태도 업데이트 (디바운스 없이)
      setSidebarWidth(constrainedWidth);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        const newWidth = startWidth + (e.clientX - startX);
        updateSidebarWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // 최종 상태를 CSS 커스텀 프로퍼티에서 제거하고 인라인 스타일로 적용
      document.documentElement.style.removeProperty('--sidebar-width');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth, minWidth, maxWidth]);

  React.useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <div 
        className={`relative bg-white shadow-xl transition-all duration-300 ${
          sidebarOpen ? '' : '-translate-x-full'
        } ${isResizing ? 'transition-none' : ''}`}
        style={{ 
          width: sidebarOpen ? (isResizing ? 'var(--sidebar-width, ' + sidebarWidth + 'px)' : `${sidebarWidth}px`) : '0px',
          minWidth: sidebarOpen ? `${minWidth}px` : '0px'
        }}
      >
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          width={sidebarWidth}
        />
        
        {/* Resize Handle */}
        {sidebarOpen && (
          <div
            ref={resizeRef}
            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors ${
              isResizing ? 'bg-blue-500' : 'bg-transparent'
            }`}
            onMouseDown={handleMouseDown}
            style={{ 
              right: '-2px', 
              width: '4px',
              zIndex: 1000
            }}
          />
        )}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">
                {getPageTitle(location.pathname)}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-600">실시간 연결됨</span>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
      
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;