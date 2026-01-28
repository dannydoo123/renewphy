import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CapacitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCapacity: number;
  onSave: (capacity: number) => void;
}

export function CapacitySettingsModal({
  isOpen,
  onClose,
  currentCapacity,
  onSave
}: CapacitySettingsModalProps) {
  const [capacity, setCapacity] = useState(currentCapacity);

  useEffect(() => {
    setCapacity(currentCapacity);
  }, [currentCapacity]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(capacity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">일일 생산 용량 설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            최대 생산 용량 (개)
          </label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 100000"
          />
          <p className="mt-2 text-sm text-gray-500">
            하루 최대 생산 가능한 제품 개수를 입력하세요
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}