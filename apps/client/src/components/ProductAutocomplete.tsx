import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';

interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface ProductAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
}

const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
  value,
  onChange,
  placeholder = '제품명을 입력하세요...',
  className = '',
  disabled = false,
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 실시간 검색 (한 글자부터)
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmedValue = inputValue.trim();
      if (trimmedValue.length >= 1) { // 한 글자부터 검색
        searchProducts(trimmedValue);
      } else {
        setProducts([]);
        setIsOpen(false);
      }
    }, 150); // 디바운스 시간을 150ms로 단축

    return () => clearTimeout(timer);
  }, [inputValue]);

  // 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 상위 컴포넌트에서 value가 변경되면 inputValue도 업데이트
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const searchProducts = async (searchTerm: string) => {
    if (searchTerm.length < 1) {
      setProducts([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const results = await api.searchProducts(searchTerm, 15); // 결과 수를 15개로 증가
      setProducts(results);
      setIsOpen(results.length > 0);
      setSelectedIndex(-1); // 검색 결과 변경 시 선택 인덱스 초기화
    } catch (error) {
      console.error('제품 검색 오류:', error);
      setProducts([]);
      setIsOpen(false);
      setSelectedIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleProductSelect = (product: Product) => {
    setInputValue(product.name);
    onChange(product.name);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (inputValue.trim().length >= 1 && products.length > 0) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < products.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : products.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < products.length) {
          handleProductSelect(products[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed' : ''} ${className}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* 드롭다운 */}
      {isOpen && products.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-64 overflow-y-auto"
        >
          {products.map((product, index) => {
            const isSelected = index === selectedIndex;
            const searchTerm = inputValue.toLowerCase();
            const productName = product.name;
            
            // 검색어 하이라이트를 위한 텍스트 분할
            const highlightText = (text: string, search: string) => {
              if (!search) return text;
              const parts = text.split(new RegExp(`(${search})`, 'gi'));
              return parts.map((part, i) => 
                part.toLowerCase() === search.toLowerCase() ? 
                  <mark key={i} className="bg-yellow-200 px-0 font-semibold">{part}</mark> : 
                  part
              );
            };

            return (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                  isSelected 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                  {highlightText(productName, searchTerm)}
                </div>
                {product.code && (
                  <div className={`text-sm mt-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                    코드: {highlightText(product.code, searchTerm)}
                  </div>
                )}
                {product.description && (
                  <div className={`text-xs mt-1 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                    {product.description}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* 검색 결과 개수 표시 */}
          <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
            {products.length}개 제품 검색됨
            {products.length >= 15 && " (더 구체적인 검색어로 결과를 줄여보세요)"}
          </div>
        </div>
      )}
      
      {/* 검색 중이지만 결과가 없을 때 */}
      {isOpen && !loading && inputValue.trim().length >= 1 && products.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl p-4"
        >
          <div className="text-center text-gray-500">
            <div className="text-sm">검색 결과가 없습니다</div>
            <div className="text-xs mt-1">'{inputValue}'와 일치하는 제품이 없습니다</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAutocomplete;