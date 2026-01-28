interface ChangeRecord {
  id: string;
  timestamp: Date;
  type: 'ORDER_PLAN_UPDATED' | 'ORDER_PLAN_CREATED' | 'ORDER_PLAN_DELETED';
  entityId: string;
  entityName: string; // 회사명 - 제품명
  changes: FieldChange[];
  summary: string; // 자연어 요약
  isRead: boolean; // 읽음 상태
}

interface FieldChange {
  field: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  description: string;
}

class ChangeTracker {
  private changeBuffer: ChangeRecord[] = [];
  private maxBufferSize = 1000; // 최대 1000개 변경사항 저장

  // 필드 라벨 매핑
  private fieldLabels = {
    workType: '작업 유형',
    status: '상태',
    weight: '중량',
    repeatProgress: '진행 횟수',
    repeatCount: '총 반복 횟수',
    desiredDate: '예정 날짜',
    deliveryDate: '납기 날짜',
    orderQuantity: '발주 수량',
    companyName: '회사명',
    productName: '제품명'
  };

  // 값 변환 매핑
  private valueMap = {
    workType: {
      'OVEN': '오븐',
      'MIXING': '혼합', 
      'PACKAGING': '포장',
      'SORTING': '선별'
    },
    status: {
      'PLANNED': '계획됨',
      'IN_PRODUCTION': '생산 진행중',
      'PRODUCTION_COMPLETED': '생산 완료',
      'INSPECTION': '검수',
      'SHIPPING': '출고',
      'DELIVERY_COMPLETED': '납품 완료'
    }
  };

  // 발주 계획 변경사항 추적
  trackOrderPlanChanges(
    orderPlanId: string,
    companyName: string,
    productName: string,
    oldData: any,
    newData: any,
    type: 'ORDER_PLAN_UPDATED' | 'ORDER_PLAN_CREATED' = 'ORDER_PLAN_UPDATED'
  ): string {
    const changes: FieldChange[] = [];
    
    // 각 필드별 변경사항 검사 - 실제 값이 다른 경우만 추적
    Object.keys(newData).forEach(field => {
      if (this.fieldLabels[field]) {
        const oldVal = oldData[field];
        const newVal = newData[field];
        const hasChanged = this.hasActualChange(oldVal, newVal);
        
        if (hasChanged) {
          const change: FieldChange = {
            field,
            fieldLabel: this.fieldLabels[field],
            oldValue: oldVal,
            newValue: newVal,
            description: this.generateFieldDescription(field, oldVal, newVal)
          };
          changes.push(change);
        }
      }
    });

    // 변경사항이 없으면 빈 ID 반환
    if (changes.length === 0 && type !== 'ORDER_PLAN_CREATED') {
      return '';
    }

    // 변경사항 요약 생성
    const summary = this.generateSummary(changes, type);
    
    const changeRecord: ChangeRecord = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      entityId: orderPlanId,
      entityName: `${companyName} - ${productName}`,
      changes,
      summary,
      isRead: false
    };

    // 버퍼에 추가
    this.changeBuffer.unshift(changeRecord);
    
    // 버퍼 크기 제한
    if (this.changeBuffer.length > this.maxBufferSize) {
      this.changeBuffer = this.changeBuffer.slice(0, this.maxBufferSize);
    }

    return changeRecord.id;
  }

  // 실제 변경사항 확인 (타입과 값 모두 비교)
  private hasActualChange(oldValue: any, newValue: any): boolean {
    // 완전히 동일한 값인 경우 (===)
    if (oldValue === newValue) return false;
    
    // 둘 다 null/undefined/empty인 경우
    const isEmpty = (val: any) => val === null || val === undefined || val === '';
    if (isEmpty(oldValue) && isEmpty(newValue)) return false;
    
    // 숫자 비교
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      return oldValue !== newValue;
    }
    
    // 문자열 비교 (trim 적용)
    if (typeof oldValue === 'string' && typeof newValue === 'string') {
      return oldValue.trim() !== newValue.trim();
    }
    
    // 숫자와 문자열 혼합 (문자열을 숫자로 변환 가능한 경우)
    if ((typeof oldValue === 'number' && typeof newValue === 'string') ||
        (typeof oldValue === 'string' && typeof newValue === 'number')) {
      const oldNum = typeof oldValue === 'number' ? oldValue : parseFloat(oldValue);
      const newNum = typeof newValue === 'number' ? newValue : parseFloat(newValue);
      
      if (!isNaN(oldNum) && !isNaN(newNum)) {
        return oldNum !== newNum;
      }
    }
    
    // 날짜 비교 (날짜 형태인 경우)
    if (this.isDateField(oldValue, newValue)) {
      return !this.isSameDate(oldValue, newValue);
    }
    
    // Boolean 비교
    if (typeof oldValue === 'boolean' && typeof newValue === 'boolean') {
      return oldValue !== newValue;
    }
    
    // 나머지 경우는 문자열로 변환하여 비교
    const oldStr = oldValue?.toString() || '';
    const newStr = newValue?.toString() || '';
    return oldStr !== newStr;
  }

  // 날짜 필드 여부 확인
  private isDateField(oldValue: any, newValue: any): boolean {
    const isDateLike = (value: any) => {
      if (value instanceof Date) return true;
      if (typeof value === 'string' && !isNaN(Date.parse(value))) return true;
      return false;
    };
    return isDateLike(oldValue) || isDateLike(newValue);
  }

  // 같은 날짜인지 확인 (시간 무시)
  private isSameDate(date1: any, date2: any): boolean {
    if (!date1 && !date2) return true;
    if (!date1 || !date2) return false;
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // 유효하지 않은 날짜인 경우
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return String(date1) === String(date2);
    }
    
    // 연, 월, 일만 비교 (시간 무시)
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // 필드별 변경 설명 생성
  private generateFieldDescription(field: string, oldValue: any, newValue: any): string {
    const formatValue = (field: string, value: any): string => {
      if (value === null || value === undefined) return '미입력';
      
      if (this.valueMap[field] && this.valueMap[field][value]) {
        return this.valueMap[field][value];
      }
      
      switch (field) {
        case 'weight':
          return value ? `${value}kg` : '미입력';
        case 'desiredDate':
        case 'deliveryDate':
          return new Date(value).toLocaleDateString('ko-KR', { 
            month: 'long', 
            day: 'numeric' 
          });
        case 'orderQuantity':
          return `${value?.toLocaleString()}개`;
        case 'repeatProgress':
        case 'repeatCount':
          return `${value}회`;
        default:
          return value?.toString() || '미입력';
      }
    };

    const oldFormatted = formatValue(field, oldValue);
    const newFormatted = formatValue(field, newValue);
    const fieldLabel = this.fieldLabels[field];

    return `${fieldLabel}이(가) ${oldFormatted}에서 ${newFormatted}로 변경`;
  }

  // 전체 변경사항 요약 생성
  private generateSummary(changes: FieldChange[], type: string): string {
    if (type === 'ORDER_PLAN_CREATED') {
      return '새로운 발주 계획이 생성되었습니다.';
    }

    if (changes.length === 0) {
      return '변경사항이 없습니다.';
    }

    if (changes.length === 1) {
      // 단일 변경사항은 "되었습니다" 중복 제거
      return changes[0].description + '되었습니다.';
    }

    // 여러 변경사항을 깔끔하게 나열
    const descriptions = changes.map(c => {
      // "되었습니다" 부분 제거하고 • 불릿 포인트로 정리
      const cleanDesc = c.description.replace(/되었습니다\.?$/, '');
      return `• ${cleanDesc}`;
    });
    
    return descriptions.join('\n') + '\n변경되었습니다.';
  }

  // 최근 변경사항 조회
  getRecentChanges(limit: number = 50): ChangeRecord[] {
    return this.changeBuffer.slice(0, limit);
  }

  // 특정 엔티티의 변경사항 조회
  getChangesForEntity(entityId: string): ChangeRecord[] {
    return this.changeBuffer.filter(record => record.entityId === entityId);
  }

  // 변경사항 ID로 조회
  getChangeById(changeId: string): ChangeRecord | null {
    return this.changeBuffer.find(record => record.id === changeId) || null;
  }

  // 변경사항 통계
  getChangeStats() {
    const total = this.changeBuffer.length;
    const byType = this.changeBuffer.reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recent24h = this.changeBuffer.filter(
      record => new Date().getTime() - record.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length;

    return {
      total,
      byType,
      recent24h
    };
  }

  // 읽지 않은 변경사항 개수 조회
  getUnreadCount(): number {
    return this.changeBuffer.filter(record => !record.isRead).length;
  }

  // 모든 변경사항을 읽음으로 표시
  markAllAsRead(): void {
    this.changeBuffer.forEach(record => {
      record.isRead = true;
    });
  }

  // 특정 변경사항을 읽음으로 표시
  markAsRead(changeId: string): boolean {
    const record = this.changeBuffer.find(r => r.id === changeId);
    if (record) {
      record.isRead = true;
      return true;
    }
    return false;
  }

  // 버퍼 정리 (오래된 항목 제거)
  cleanup(olderThanHours: number = 24) {
    const cutoffTime = new Date().getTime() - (olderThanHours * 60 * 60 * 1000);
    this.changeBuffer = this.changeBuffer.filter(
      record => record.timestamp.getTime() > cutoffTime
    );
  }
}

// 싱글톤 인스턴스
export const changeTracker = new ChangeTracker();
export { ChangeRecord, FieldChange };