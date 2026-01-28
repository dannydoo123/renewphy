import requests
import json
import pprint

def test_ecount_api():
    # 제공받은 정보
    com_code = '61813'
    user_id = 'LIVING53'
    api_cert_key = '44ef38cddd7b74de1af7d559340a49e8b3'
    zone = 'CB'  # Zone 정보에서 추출
    
    print("=== Ecount OpenAPI 직접 테스트 시작 ===\n")
    
    def get_zone():
        """Zone 정보 가져오기"""
        try:
            print("1. Zone 정보 가져오는 중...")
            url = 'https://oapi.ecount.com/OAPI/V2/Zone'
            data = {
                "COM_CODE": com_code,
                "USER_ID": user_id,
                "API_CERT_KEY": api_cert_key
            }
            
            response = requests.post(url, json=data, timeout=30)
            result = response.json()
            
            print(f"Zone API 응답 상태: {response.status_code}")
            print("Zone 정보:")
            pprint.pprint(result)
            
            if result.get('Data') and result['Data'].get('ZONE'):
                zone_code = result['Data']['ZONE']
                print("Zone 코드:", zone_code)
                return zone_code
            else:
                print("Zone 정보를 가져올 수 없습니다.")
                return None
                
        except Exception as e:
            print("Zone API 호출 실패:", str(e))
            return None
    
    def login(zone_code):
        """로그인 및 세션 ID 획득"""
        try:
            print("2. 로그인 중...")
            url = f'https://oapi{zone_code}.ecount.com/OAPI/V2/OAPILogin'
            data = {
                "COM_CODE": com_code,
                "USER_ID": user_id,
                "API_CERT_KEY": api_cert_key,
                "LAN_TYPE": "ko-KR",
                "ZONE": zone_code
            }
            
            response = requests.post(url, json=data, timeout=30)
            result = response.json()
            
            print(f"로그인 API 응답 상태: {response.status_code}")
            print("로그인 응답:")
            pprint.pprint(result)
            
            if result.get('Data') and result['Data'].get('Datas') and result['Data']['Datas'].get('SESSION_ID'):
                session_id = result['Data']['Datas']['SESSION_ID']
                print("로그인 성공 - 세션 ID:", session_id)
                return session_id
            else:
                print("로그인 실패")
                return None
                
        except Exception as e:
            print("로그인 API 호출 실패:", str(e))
            return None
    
    def test_products_list(zone_code, session_id):
        """품목 목록 조회 테스트"""
        try:
            print("3. 품목 목록 조회 테스트...")
            url = f'https://oapi{zone_code}.ecount.com/OAPI/V2/InventoryBasic/GetBasicProductsList'
            
            params = {
                'SESSION_ID': session_id,
                'start_date': '2024-01-01',
                'end_date': '2024-12-31',
                'page_no': 1,
                'page_size': 10
            }
            
            response = requests.get(url, params=params, timeout=30)
            result = response.json()
            
            print(f"품목 목록 API 응답 상태: {response.status_code}")
            print("품목 목록 응답:")
            pprint.pprint(result)
            
            if response.status_code == 200:
                print("품목 목록 조회 성공")
            else:
                print("품목 목록 조회 실패")
                
        except Exception as e:
            print("품목 목록 조회 실패:", str(e))
    
    def test_inventory_status(zone_code, session_id):
        """재고 현황 조회 테스트"""
        try:
            print("4. 재고 현황 조회 테스트...")
            url = f'https://oapi{zone_code}.ecount.com/OAPI/V2/InventoryBalance/GetListInventoryBalanceStatus'
            
            params = {
                'SESSION_ID': session_id,
                'base_date': '2024-09-07'
            }
            
            response = requests.get(url, params=params, timeout=30)
            result = response.json()
            
            print(f"재고 현황 API 응답 상태: {response.status_code}")
            print("재고 현황 응답:")
            pprint.pprint(result)
            
            if response.status_code == 200:
                print("재고 현황 조회 성공")
            else:
                print("재고 현황 조회 실패")
                
        except Exception as e:
            print("재고 현황 조회 실패:", str(e))
    
    # 실제 테스트 실행
    try:
        # Zone 정보 가져오기 (이미 알고 있지만 테스트용)
        zone_code = get_zone()
        if not zone_code:
            zone_code = zone  # 알고 있는 Zone 코드 사용
            print(f"기본 Zone 코드 사용: {zone_code}\n")
        
        # 로그인
        session_id = login(zone_code)
        if not session_id:
            print("로그인 실패로 테스트 중단")
            return
        
        # API 테스트들
        test_products_list(zone_code, session_id)
        test_inventory_status(zone_code, session_id)
        
        print("=== 테스트 완료 ===")
        print("API 검증이 성공하면 Ecount에서 자동으로 인식됩니다.")
        print("정식 API 키 발급을 위해 Self-Customizing > 정보관리 > API인증키발급에서 확인하세요.")
        
    except Exception as e:
        print(f"전체 테스트 실행 중 오류: {e}")

if __name__ == "__main__":
    test_ecount_api()