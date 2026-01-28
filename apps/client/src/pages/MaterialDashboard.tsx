import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  ExclamationTriangleIcon, 
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MaterialItem {
  prodCd: string;        // 품목코드
  prodDes: string;       // 품목명
  whCd: string;          // 창고코드  
  balQty: number;        // 재고수량
}

type SortField = 'prodCd' | 'prodDes' | 'whCd' | 'balQty';
type SortOrder = 'asc' | 'desc';
type StockFilter = 'all' | 'low' | 'normal' | 'out';

const MaterialDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [showZeroStock, setShowZeroStock] = useState(true);
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('prodCd');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // 오늘 날짜 (YYYYMMDD 형식)
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const { data: materialsData, isLoading, error, refetch } = useQuery(
    ['materials-management', today],
    () => {
      console.log('🔍 자재 관리 API 호출 시작');
      return api.getMaterialsManagement(today);
    },
    {
      onSuccess: (data) => {
        console.log('✅ 자재 관리 API 응답 성공:', data);
      },
      onError: (error) => {
        console.error('❌ 자재 관리 조회 오류:', error);
      },
      staleTime: 5 * 60 * 1000, // 5분
      cacheTime: 10 * 60 * 1000, // 10분
    }
  );

  // 데이터 변환
  const materials: MaterialItem[] = useMemo(() => {
    if (!materialsData?.data) return [];
    
    return materialsData.data.map((item: any[], index: number) => ({
      prodCd: item[0] || '',
      prodDes: item[1] || '',
      whCd: item[2] || '',
      balQty: parseFloat(item[3]) || 0,
    }));
  }, [materialsData]);

  // 고유한 창고 목록
  const warehouses = useMemo(() => {
    const uniqueWarehouses = Array.from(new Set(materials.map(item => item.whCd).filter(Boolean)));
    return uniqueWarehouses.sort();
  }, [materials]);

  // 정렬 핸들러
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 필터링 및 정렬된 데이터
  const filteredAndSortedMaterials = useMemo(() => {
    let filtered = materials.filter(item => {
      // 검색어 필터
      const matchesSearch = !searchTerm || 
        item.prodCd.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.prodDes.toLowerCase().includes(searchTerm.toLowerCase());

      // 창고 필터
      const matchesWarehouse = !warehouseFilter || item.whCd === warehouseFilter;

      // 재고 상태 필터
      let matchesStockFilter = true;
      if (stockFilter === 'low') {
        matchesStockFilter = item.balQty > 0 && item.balQty <= 10; // 임계값 가정
      } else if (stockFilter === 'normal') {
        matchesStockFilter = item.balQty > 10;
      } else if (stockFilter === 'out') {
        matchesStockFilter = item.balQty === 0;
      }

      // 재고 0 표시 옵션
      const matchesZeroStock = showZeroStock || item.balQty > 0;

      return matchesSearch && matchesWarehouse && matchesStockFilter && matchesZeroStock;
    });

    // 정렬
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'balQty') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [materials, searchTerm, warehouseFilter, stockFilter, showZeroStock, sortField, sortOrder]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredAndSortedMaterials.length / pageSize);
  const paginatedMaterials = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedMaterials; // 모두 보기
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedMaterials.slice(start, start + pageSize);
  }, [filteredAndSortedMaterials, currentPage, pageSize]);

  // 통계
  const stats = useMemo(() => {
    const totalItems = materials.length;
    const zeroStock = materials.filter(item => item.balQty === 0).length;
    const lowStock = materials.filter(item => item.balQty > 0 && item.balQty <= 10).length;
    const normalStock = materials.filter(item => item.balQty > 10).length;

    return { totalItems, zeroStock, lowStock, normalStock };
  }, [materials]);

  // 재고 상태별 색상 클래스
  const getStockStatusClass = (balQty: number) => {
    if (balQty === 0) return 'bg-red-50 text-red-900';
    if (balQty <= 10) return 'bg-yellow-50 text-yellow-900';
    return 'bg-green-50 text-green-900';
  };

  // 정렬 아이콘
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowsUpDownIcon className="h-4 w-4" />;
    return sortOrder === 'asc' ? 
      <ArrowUpIcon className="h-4 w-4" /> : 
      <ArrowDownIcon className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full flex-col">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600">자재 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full flex-col">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-4" />
        <p className="text-red-600 mb-2">자재 데이터를 불러오는 중 오류가 발생했습니다.</p>
        <p className="text-gray-500 text-sm mb-4">{(error as any)?.message || '알 수 없는 오류'}</p>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold">전</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">총 자재 품목</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-semibold">품</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600">품절 자재</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.zeroStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 font-semibold">부</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-600">부족 자재</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.lowStock}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-semibold">충</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">충분한 자재</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.normalStock}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 자재 목록 테이블 */}
      <div className="bg-white rounded-lg shadow">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900">자재 현황</h3>
              <div className="text-sm text-gray-500">
                마지막 업데이트: {materialsData?.lastUpdated ? 
                  format(new Date(materialsData.lastUpdated), 'HH:mm:ss', { locale: ko }) : 
                  '로딩 중...'
                }
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* 검색 */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="품목코드 또는 품목명 검색..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* 창고 필터 */}
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">모든 창고</option>
              {warehouses.map(wh => (
                <option key={wh} value={wh}>{wh}</option>
              ))}
            </select>

            {/* 재고 상태 필터 */}
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            >
              <option value="all">모든 상태</option>
              <option value="out">품절</option>
              <option value="low">부족</option>
              <option value="normal">충분</option>
            </select>

            {/* 재고 0 표시 체크박스 */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showZeroStock}
                onChange={(e) => setShowZeroStock(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-200"
              />
              <span className="text-sm text-gray-700">재고 0 표시</span>
            </label>

            {/* 페이지 사이즈 */}
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={20}>20개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
              <option value={-1}>모두보기</option>
            </select>

            {/* 필터 초기화 */}
            {(searchTerm || warehouseFilter || stockFilter !== 'all' || !showZeroStock) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setWarehouseFilter('');
                  setStockFilter('all');
                  setShowZeroStock(true);
                }}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:text-red-800"
              >
                <XCircleIcon className="h-4 w-4" />
                <span>초기화</span>
              </button>
            )}
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('prodCd')}
                >
                  <div className="flex items-center space-x-1">
                    <span>품목코드</span>
                    {getSortIcon('prodCd')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('prodDes')}
                >
                  <div className="flex items-center space-x-1">
                    <span>품목명</span>
                    {getSortIcon('prodDes')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('whCd')}
                >
                  <div className="flex items-center space-x-1">
                    <span>창고코드</span>
                    {getSortIcon('whCd')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('balQty')}
                >
                  <div className="flex items-center space-x-1">
                    <span>재고수량</span>
                    {getSortIcon('balQty')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedMaterials.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    조건에 맞는 자재가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedMaterials.map((item, index) => (
                  <tr key={`${item.prodCd}-${item.whCd}-${index}`} className={`hover:bg-gray-50 ${getStockStatusClass(item.balQty)}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {item.prodCd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.prodDes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.whCd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      {item.balQty.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {pageSize !== -1 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                전체 {filteredAndSortedMaterials.length}개 중 {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedMaterials.length)}-{Math.min(currentPage * pageSize, filteredAndSortedMaterials.length)}개 표시
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  이전
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialDashboard;