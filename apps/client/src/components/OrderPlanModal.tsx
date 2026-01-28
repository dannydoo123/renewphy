import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import ProductAutocomplete from './ProductAutocomplete';

interface OrderPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const OrderPlanModal: React.FC<OrderPlanModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    orderNumber: '',
    companyName: '',
    productName: '',
    orderQuantity: '',
    desiredDate: '',
    deliveryDate: '',
    details: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (isOpen) {
      // 폼 초기화
      setFormData({
        orderNumber: '',
        companyName: '',
        productName: '',
        orderQuantity: '',
        desiredDate: '',
        deliveryDate: '',
        details: ''
      });
      setErrors({});
      setError(null);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.orderNumber.trim()) {
      newErrors.orderNumber = '발주번호를 입력해주세요.';
    }

    if (!formData.companyName.trim()) {
      newErrors.companyName = '회사명을 입력해주세요.';
    }

    if (!formData.productName.trim()) {
      newErrors.productName = '제품명을 입력해주세요.';
    }

    if (!formData.orderQuantity) {
      newErrors.orderQuantity = '발주수량을 입력해주세요.';
    } else {
      const quantity = parseInt(formData.orderQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        newErrors.orderQuantity = '올바른 수량을 입력해주세요.';
      }
    }

    if (!formData.desiredDate) {
      newErrors.desiredDate = '생산 희망 날짜를 입력해주세요.';
    }

    if (!formData.deliveryDate) {
      newErrors.deliveryDate = '납기 희망 날짜를 입력해주세요.';
    }

    // 날짜 검증 - 납기일이 생산일보다 이후여야 함
    if (formData.desiredDate && formData.deliveryDate) {
      const desiredDate = new Date(formData.desiredDate);
      const deliveryDate = new Date(formData.deliveryDate);
      if (deliveryDate < desiredDate) {
        newErrors.deliveryDate = '납기일은 생산 희망일 이후여야 합니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 에러 메시지 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 발주번호도 포함해서 전달
      const orderPlanData = {
        ...formData,
        orderNumber: formData.orderNumber
      };
      
      const response = await api.createOrderPlan(orderPlanData);
      
      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.message || '발주 계획 생성에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('발주 계획 생성 실패:', err);
      setError(err.response?.data?.message || '발주 계획을 생성하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">발주 계획 생성</h2>
            <p className="text-sm text-gray-600 mt-1">
              새로운 발주 계획을 등록해주세요
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* 발주번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                발주번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.orderNumber}
                onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                placeholder="예: 25-1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.orderNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.orderNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.orderNumber}</p>
              )}
            </div>

            {/* 회사명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회사명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="예: 에프앤엘코퍼레이션"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.companyName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.companyName && (
                <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>
              )}
            </div>

            {/* 제품명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제품명 <span className="text-red-500">*</span>
              </label>
              <ProductAutocomplete
                value={formData.productName}
                onChange={(value) => handleInputChange('productName', value)}
                placeholder="예: 플라이밀피스타치오-45g"
                error={!!errors.productName}
                disabled={isLoading}
              />
              {errors.productName && (
                <p className="text-red-500 text-xs mt-1">{errors.productName}</p>
              )}
            </div>

            {/* 발주수량 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                발주수량 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.orderQuantity}
                onChange={(e) => handleInputChange('orderQuantity', e.target.value)}
                placeholder="예: 60000"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.orderQuantity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.orderQuantity && (
                <p className="text-red-500 text-xs mt-1">{errors.orderQuantity}</p>
              )}
            </div>

            {/* 날짜 입력 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  생산 희망 날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.desiredDate}
                  onChange={(e) => handleInputChange('desiredDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.desiredDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.desiredDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.desiredDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  납기 희망 날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.deliveryDate ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {errors.deliveryDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.deliveryDate}</p>
                )}
              </div>
            </div>

            {/* 특이사항 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                특이사항
              </label>
              <textarea
                rows={4}
                value={formData.details}
                onChange={(e) => handleInputChange('details', e.target.value)}
                placeholder={`예: *플라이밀피스타치오 25-2
 - 생산 수량 : 60,000EA  
 - 생산 희망 : 11-03일 주간 희망
 - 납기 희망 : 11-07(금)
 - IPS

※특이사항
 - 기타가공품`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  처리 중...
                </>
              ) : (
                '발주 접수'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderPlanModal;