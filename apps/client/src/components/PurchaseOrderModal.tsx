import React from 'react';
import { XMarkIcon, CalendarIcon, CurrencyDollarIcon, TruckIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

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

interface PurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
}

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ 
  purchaseOrder, 
  onClose 
}) => {
  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    
    // YYYYMMDD 형태를 YYYY-MM-DD로 변환
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  };

  // 금액 포맷팅 함수
  const formatAmount = (amount: string | number): string => {
    if (!amount || amount === '0' || amount === 0) return '0';
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0';
    
    return new Intl.NumberFormat('ko-KR').format(numAmount);
  };

  // 수량 포맷팅 함수
  const formatQuantity = (qty: string | number): string => {
    if (!qty) return '0';
    
    const numQty = typeof qty === 'string' ? parseFloat(qty) : qty;
    if (isNaN(numQty)) return '0';
    
    return new Intl.NumberFormat('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    }).format(numQty);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">발주서 상세정보</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* 발주 기본정보 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">발주 기본정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-blue-700">발주번호</label>
                <p className="text-lg font-mono text-gray-900">{purchaseOrder.ORD_NO || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-blue-700">발주일자</label>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 text-blue-600 mr-1" />
                  <p className="text-gray-900">{formatDate(purchaseOrder.ORD_DATE)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 거래처 정보 */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-3">거래처 정보</h3>
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-lg text-gray-900">{purchaseOrder.CUST_DES || '-'}</p>
            </div>
          </div>

          {/* 품목 정보 */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">품목 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-purple-700">품목명</label>
                <p className="text-lg text-gray-900">{purchaseOrder.PROD_DES || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-purple-700">수량</label>
                <p className="text-xl font-semibold text-gray-900">{formatQuantity(purchaseOrder.QTY)}</p>
              </div>
            </div>
          </div>

          {/* 금액 정보 */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">금액 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-yellow-700">공급가액</label>
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-4 w-4 text-yellow-600 mr-1" />
                  <p className="text-lg font-semibold text-gray-900">{formatAmount(purchaseOrder.BUY_AMT)}원</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-yellow-700">부가세</label>
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-4 w-4 text-yellow-600 mr-1" />
                  <p className="text-lg font-semibold text-gray-900">{formatAmount(purchaseOrder.VAT_AMT)}원</p>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-yellow-700">총 금액</label>
                <div className="flex items-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-xl font-bold text-gray-900">
                    {formatAmount(
                      (parseFloat(purchaseOrder.BUY_AMT?.toString() || '0') + 
                       parseFloat(purchaseOrder.VAT_AMT?.toString() || '0'))
                    )}원
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 납기 정보 */}
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-900 mb-3">납기 정보</h3>
            <div className="flex items-center">
              <TruckIcon className="h-5 w-5 text-red-600 mr-2" />
              <div>
                <label className="text-sm font-medium text-red-700">납기일자</label>
                <p className="text-lg text-gray-900">{formatDate(purchaseOrder.TIME_DATE)}</p>
              </div>
            </div>
          </div>

          {/* 제목/메모 */}
          {purchaseOrder.TTL_CTT && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">제목</h3>
              <p className="text-gray-700 whitespace-pre-line">{purchaseOrder.TTL_CTT}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderModal;