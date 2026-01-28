#라이브러리 import
import requests
import pprint
import json
import time

# --- Configuration (edit as needed) ---
COM_CODE = 61813
USER_ID = "LIVING53"
API_CERT_KEY = "44ef38cddd7b74de1af7d559340a49e8b3"
DEFAULT_ZONE = "CB"
USE_TEST_API = True  # True => use sboapi (test), False => use oapi (production)

def get_zone_info(com_code_value, use_test=True):
    # url = 'https://oapi.ecount.com/OAPI/V2/Zone' # production url
    url = 'https://sboapi.ecount.com/OAPI/V2/Zone' if use_test else 'https://oapi.ecount.com/OAPI/V2/Zone'
    payload = {
        "COM_CODE": com_code_value
    }
    response = requests.post(url, json=payload)
    contents = json.loads(response.text)
    status = contents.get('Status')
    data = contents.get('Data') or {}
    error = contents.get('Error') or {}
    if status == '200' and isinstance(data, dict):
        print(f"Zone API: Status {status}, ZONE={data.get('ZONE')}, DOMAIN={data.get('DOMAIN')}")
        return data
    else:
        print(f"Zone API error: Status={status}, Code={error.get('Code')}, Message={error.get('Message')}")
        return {}

def api_login_oapilogin(com_code_value, user_id_value, api_cert_key_value, zone_value, use_test=True):
    base = 'sboapi' if use_test else 'oapi'
    url = f'https://{base}{zone_value}.ecount.com/OAPI/V2/OAPILogin'
    payload = {
        "COM_CODE": com_code_value,
        "USER_ID": user_id_value,
        "API_CERT_KEY": api_cert_key_value,
        "LAN_TYPE": "ko-KR",
        "ZONE": zone_value
    }
    response = requests.post(url, json=payload)
    contents = json.loads(response.text)
    status = contents.get('Status')
    if status != '200':
        err = contents.get('Error') or {}
        raise RuntimeError(f"Login API error: Status={status}, Code={err.get('Code')}, Message={err.get('Message')}")
    data = contents.get('Data') or {}
    datas = data.get('Datas') or {}
    session_id_local = datas.get('SESSION_ID')
    if not session_id_local:
        raise RuntimeError("Login API did not return SESSION_ID")
    print(f"Logged in. SESSION_ID prefix: {session_id_local[:8]}...")
    return session_id_local

def run_inventory_lookup(session_id, zone):
    url = f'https://sboapi{zone}.ecount.com/OAPI/V2/InventoryBalance/GetListInventoryBalanceStatusByLocation?SESSION_ID={session_id}'
    datas = {
        "PROD_CD": "", 
        "WH_CD": "", 
        "BASE_DATE": "20230115"
        }
    response = requests.post(url, json=datas)
    contents = json.loads(response.text)

    data_container = contents.get('Data', None)
    items = []
    if isinstance(data_container, list):
        items = data_container
    elif isinstance(data_container, dict):
        candidate_keys = ['Datas', 'List', 'Items', 'rows', 'Row', 'RESULT', 'Result', 'Details', 'DETAILS']
        for key in candidate_keys:
            value = data_container.get(key)
            if isinstance(value, list):
                items = value
                break
        if not items:
            for value in data_container.values():
                if isinstance(value, list) and value and isinstance(value[0], dict) and 'PROD_CD' in value[0]:
                    items = value
                    break

    ttt = [[
        m.get('PROD_CD'),
        m.get('BAL_QTY'),
        m.get('PROD_DES'),
        m.get('WH_CD'),
        m.get('WH_DES')
    ] for m in items]

    print(f"Inventory rows: {len(ttt)}")
    if ttt:
        pprint.pprint(ttt[:5])
    return ttt

def run_orderlist_lookup(session_id, zone, date_from="20230101", date_to="20230131"):
    """발주서 조회 API
    
    Args:
        session_id: 로그인 후 받은 세션 ID
        zone: Zone 정보
        date_from: 검색 시작일 (YYYYMMDD 형식)
        date_to: 검색 종료일 (YYYYMMDD 형식, date_from으로부터 최대 30일)
    """
    url = f'https://sboapi{zone}.ecount.com/OAPI/V2/Purchases/GetPurchasesOrderList?SESSION_ID={session_id}'
    datas = {
        "PROD_CD": "",      # 품목코드 (전체 조회를 위해 빈값)
        "CUST_CD": "",      # 거래처코드 (전체 조회를 위해 빈값)
        "ListParam": {
            "PAGE_CURRENT": 1,
            "PAGE_SIZE": 100,
            "BASE_DATE_FROM": date_from,
            "BASE_DATE_TO": date_to
        }
    }
    
    response = requests.post(url, json=datas)
    contents = json.loads(response.text)
    
    print(f"Purchase Order API Response Status: {contents.get('Status')}")
    
    if contents.get('Status') != '200':
        error = contents.get('Error', {})
        print(f"Purchase Order API error: Status={contents.get('Status')}, Message={error.get('Message')}")
        return []

    data_container = contents.get('Data', None)
    items = []
    
    if isinstance(data_container, dict):
        # Result 키에서 데이터 추출
        result_data = data_container.get('Result', [])
        if isinstance(result_data, list):
            items = result_data
        else:
            # 다른 가능한 키들도 시도
            candidate_keys = ['Datas', 'List', 'Items', 'rows', 'Row']
            for key in candidate_keys:
                value = data_container.get(key)
                if isinstance(value, list):
                    items = value
                    break
    elif isinstance(data_container, list):
        items = data_container

    # 발주서 관련 필드들 추출
    order_data = []
    for m in items:
        order_row = [
            m.get('ORD_NO'),          # 발주번호
            m.get('ORD_DATE'),        # 발주일자  
            m.get('CUST_DES'),        # 거래처명
            m.get('PROD_DES'),        # 품목명
            m.get('QTY'),             # 수량
            m.get('BUY_AMT'),         # 공급가액
            m.get('VAT_AMT'),         # 부가세
            m.get('TTL_CTT'),         # 제목
            m.get('TIME_DATE'),       # 납기일자
            m.get('EDMS_APP_TYPE')    # 전자결재상태
        ]
        order_data.append(order_row)

    print(f"Purchase Order rows: {len(order_data)}")
    if order_data:
        print("Sample data (first 3 rows):")
        pprint.pprint(order_data[:3])
        
    print(f"Total Count from API: {data_container.get('TotalCnt') if isinstance(data_container, dict) else 'N/A'}")
    
    return order_data

def run_product_basic_lookup(session_id, zone, prod_cd="", prod_type=""):
    """품목 기본정보 조회 API
    
    Args:
        session_id: 로그인 후 받은 세션 ID
        zone: Zone 정보
        prod_cd: 품목코드 (빈값이면 전체 조회)
        prod_type: 품목구분 (0:원재료, 1:제품, 2:반제품, 3:상품, 4:부재료, 7:무형상품)
    """
    url = f'https://sboapi{zone}.ecount.com/OAPI/V2/InventoryBasic/GetBasicProductsList?SESSION_ID={session_id}'
    datas = {
        "PROD_CD": prod_cd,
        "PROD_TYPE": prod_type
    }
    
    response = requests.post(url, json=datas)
    contents = json.loads(response.text)
    
    print(f"Product Basic API Response Status: {contents.get('Status')}")
    
    if contents.get('Status') != '200':
        error = contents.get('Error', {})
        print(f"Product Basic API error: Status={contents.get('Status')}, Message={error.get('Message')}")
        return []

    data_container = contents.get('Data', None)
    items = []
    
    if isinstance(data_container, dict):
        # Result 키에서 데이터 추출 - 이 API는 Result가 문자열로 된 JSON 배열일 수 있음
        result_data = data_container.get('Result')
        if isinstance(result_data, str):
            # JSON 문자열을 파싱
            try:
                items = json.loads(result_data)
            except:
                print("Result를 JSON으로 파싱할 수 없습니다.")
                items = []
        elif isinstance(result_data, list):
            items = result_data
        else:
            # 다른 가능한 키들도 시도
            candidate_keys = ['Datas', 'List', 'Items', 'rows', 'Row']
            for key in candidate_keys:
                value = data_container.get(key)
                if isinstance(value, list):
                    items = value
                    break
    elif isinstance(data_container, list):
        items = data_container

    # 품목 기본정보 관련 필드들 추출
    product_data = []
    for m in items:
        product_row = [
            m.get('PROD_CD'),         # 품목코드
            m.get('PROD_DES'),        # 품목명
            m.get('SIZE_DES'),        # 규격명
            m.get('UNIT'),            # 단위
            m.get('PROD_TYPE'),       # 품목구분 (0:원재료, 1:제품, 2:반제품, 3:상품, 4:부재료, 7:무형상품)
            m.get('IN_PRICE'),        # 입고단가
            m.get('OUT_PRICE'),       # 출고단가
            m.get('BAL_FLAG'),        # 재고수량관리여부 (0:제외, 1:대상)
            m.get('SET_FLAG'),        # 세트여부
            m.get('CLASS_CD'),        # 그룹코드1
            m.get('CLASS_CD2'),       # 그룹코드2
            m.get('BAR_CODE'),        # 바코드
            m.get('VAT_YN'),          # 부가세율구분
            m.get('SAFE_QTY'),        # 안전재고수량
            m.get('MIN_QTY')          # 최소구매단위
        ]
        product_data.append(product_row)

    print(f"Product Basic rows: {len(product_data)}")
    if product_data:
        print("Sample data (first 3 rows):")
        for i, row in enumerate(product_data[:3]):
            print(f"  품목 {i+1}: {row[0]} | {row[1]} | {row[2]} | {row[3]} | 구분:{row[4]}")
        
    return product_data

def run_inventory_balance_status(session_id, zone, base_date="", wh_cd="", prod_cd=""):
    """재고현황 조회 API (창고별 재고 현황과는 다른 API)
    
    Args:
        session_id: 로그인 후 받은 세션 ID
        zone: Zone 정보
        base_date: 검색 일시 (YYYYMMDD 형식, 필수)
        wh_cd: 창고코드 (빈값이면 전체 창고)
        prod_cd: 품목코드 (빈값이면 전체 품목)
    """
    if not base_date:
        from datetime import datetime
        base_date = datetime.now().strftime("%Y%m%d")
    
    url = f'https://sboapi{zone}.ecount.com/OAPI/V2/InventoryBalance/GetListInventoryBalanceStatus?SESSION_ID={session_id}'
    datas = {
        "PROD_CD": prod_cd,      # 품목코드
        "WH_CD": wh_cd,          # 창고코드  
        "BASE_DATE": base_date,  # 기준일자 (필수)
        "ZERO_FLAG": "Y",        # 재고수량0포함 (Y:포함, N:제외)
        "BAL_FLAG": "N",         # 수량관리제외품목포함 (Y:포함, N:제외)
        "DEL_GUBUN": "N",        # 사용중단품목포함 (Y:포함, N:제외)
        "SAFE_FLAG": "N"         # 안전재고미만표시 (Y:표시, N:미표시)
    }
    
    response = requests.post(url, json=datas)
    contents = json.loads(response.text)
    
    print(f"Inventory Balance Status API Response Status: {contents.get('Status')}")
    print(f"Full API Response: {json.dumps(contents, ensure_ascii=False, indent=2)}")
    
    if contents.get('Status') != '200':
        error = contents.get('Error', {})
        print(f"Inventory Balance Status API error: Status={contents.get('Status')}, Message={error.get('Message')}")
        return []

    data_container = contents.get('Data', None)
    print(f"Data container type: {type(data_container)}")
    print(f"Data container keys: {list(data_container.keys()) if isinstance(data_container, dict) else 'Not a dict'}")
    
    # TotalCnt 확인
    if isinstance(data_container, dict):
        total_cnt = data_container.get('TotalCnt', 'NOT_FOUND')
        print(f"TotalCnt: {total_cnt}")
    
    items = []
    
    if isinstance(data_container, dict):
        # Result 키에서 데이터 추출
        result_data = data_container.get('Result', [])
        print(f"Result data type: {type(result_data)}, length: {len(result_data) if isinstance(result_data, list) else 'Not a list'}")
        
        if isinstance(result_data, list):
            items = result_data
            if result_data:
                print(f"First result item: {result_data[0]}")
        else:
            # 다른 가능한 키들도 시도
            candidate_keys = ['Datas', 'List', 'Items', 'rows', 'Row']
            for key in candidate_keys:
                value = data_container.get(key)
                if isinstance(value, list):
                    items = value
                    print(f"Found data in '{key}' key, length: {len(value)}")
                    if value:
                        print(f"First item from '{key}': {value[0]}")
                    break
    elif isinstance(data_container, list):
        items = data_container

    # 재고현황 관련 필드들 추출 (창고별 재고와는 다른 구조)
    balance_data = []
    for m in items:
        balance_row = [
            m.get('PROD_CD'),         # 품목코드
            m.get('BAL_QTY'),         # 재고수량
            # 추가 필드가 있다면 여기에 추가
        ]
        balance_data.append(balance_row)

    print(f"Inventory Balance Status rows: {len(balance_data)}")
    if balance_data:
        print("Sample data (first 5 rows):")
        for i, row in enumerate(balance_data[:5]):
            print(f"  품목 {i+1}: 코드={row[0]} | 재고수량={row[1]}")
        
    print(f"Total Count from API: {data_container.get('TotalCnt') if isinstance(data_container, dict) else 'N/A'}")
    print(f"기준일자: {base_date}")
    
    return balance_data

def test_all_apis():
    """모든 API를 테스트하는 함수"""
    try:
        print("=== ECOUNT API 테스트 시작 ===")
        
        # 1. Zone 정보 및 로그인
        zone_info = get_zone_info(COM_CODE, use_test=USE_TEST_API)
        zone_value = zone_info.get('ZONE') if zone_info.get('ZONE') else DEFAULT_ZONE
        session_id_value = api_login_oapilogin(COM_CODE, USER_ID, API_CERT_KEY, zone_value, use_test=USE_TEST_API)
        time.sleep(1)
        
        print("\n=== 1. 재고 조회 테스트 ===")
        inventory_result = run_inventory_lookup(session_id_value, zone_value)
        
        print("\n=== 2. 발주서 조회 테스트 ===")
        # 최근 30일간의 발주서 조회
        from datetime import datetime, timedelta
        end_date = datetime.now()
        start_date = end_date - timedelta(days=29)  # 29일 전부터 (30일 제한)
        
        date_from = start_date.strftime("%Y%m%d")
        date_to = end_date.strftime("%Y%m%d")
        
        print(f"조회 기간: {date_from} ~ {date_to}")
        order_result = run_orderlist_lookup(session_id_value, zone_value, date_from, date_to)
        
        print("\n=== 3. 품목 기본정보 조회 테스트 ===")
        print("전체 품목 조회:")
        product_basic_result = run_product_basic_lookup(session_id_value, zone_value)
        
        print("\n제품만 조회 (PROD_TYPE=1):")
        product_only_result = run_product_basic_lookup(session_id_value, zone_value, prod_type="1")
        
        print("\n=== 4. 재고현황 조회 테스트 ===")
        from datetime import datetime
        today = datetime.now().strftime("%Y%m%d")
        print(f"오늘 날짜({today}) 기준 재고현황 조회:")
        balance_status_result = run_inventory_balance_status(session_id_value, zone_value, base_date=today)
        
        print("\n=== 테스트 결과 요약 ===")
        print(f"창고별 재고 조회 결과: {len(inventory_result)}개 창고별 품목")
        print(f"발주서 조회 결과: {len(order_result)}개 발주서")
        print(f"품목 기본정보 조회 결과: {len(product_basic_result)}개 품목")
        print(f"제품만 조회 결과: {len(product_only_result)}개 제품")
        print(f"재고현황 조회 결과: {len(balance_status_result)}개 품목")
        
    except Exception as e:
        print(f"테스트 중 오류 발생: {e}")

def run_purchase_orders_json(date_from="", date_to=""):
    """발주서 조회하여 JSON 형태로 반환"""
    import sys
    import io
    
    # stdout을 UTF-8로 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    try:
        zone_info = get_zone_info(COM_CODE, use_test=USE_TEST_API)
        zone_value = zone_info.get('ZONE') if zone_info.get('ZONE') else DEFAULT_ZONE
        session_id_value = api_login_oapilogin(COM_CODE, USER_ID, API_CERT_KEY, zone_value, use_test=USE_TEST_API)
        time.sleep(1)
        
        # 기본값 설정
        if not date_from:
            from datetime import datetime, timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=29)
            date_from = start_date.strftime("%Y%m%d")
            date_to = end_date.strftime("%Y%m%d")
        
        order_data = run_orderlist_lookup(session_id_value, zone_value, date_from, date_to)
        
        result = {
            "success": True,
            "data": order_data,
            "count": len(order_data),
            "dateRange": {"from": date_from, "to": date_to}
        }
        
        print("JSON_RESULT_START")
        print(json.dumps(result, ensure_ascii=False, indent=None))
        print("JSON_RESULT_END")
        sys.stdout.flush()
        
        return result
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "data": []
        }
        print("JSON_RESULT_START")
        print(json.dumps(error_result, ensure_ascii=False, indent=None))
        print("JSON_RESULT_END")
        sys.stdout.flush()
        return error_result

def run_inventory_balance_status_json(base_date="", wh_cd="", prod_cd=""):
    """재고현황 조회하여 JSON 형태로 반환"""
    import sys
    import io
    
    # stdout을 UTF-8로 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    try:
        zone_info = get_zone_info(COM_CODE, use_test=USE_TEST_API)
        zone_value = zone_info.get('ZONE') if zone_info.get('ZONE') else DEFAULT_ZONE
        session_id_value = api_login_oapilogin(COM_CODE, USER_ID, API_CERT_KEY, zone_value, use_test=USE_TEST_API)
        time.sleep(1)
        
        # 기본값 설정
        if not base_date:
            from datetime import datetime
            base_date = datetime.now().strftime("%Y%m%d")
        
        inventory_data = run_inventory_balance_status(session_id_value, zone_value, base_date, wh_cd, prod_cd)
        
        result = {
            "success": True,
            "data": inventory_data,
            "count": len(inventory_data),
            "baseDate": base_date
        }
        
        print("JSON_RESULT_START")
        print(json.dumps(result, ensure_ascii=False, indent=None))
        print("JSON_RESULT_END")
        sys.stdout.flush()
        
        return result
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "data": []
        }
        print("JSON_RESULT_START")
        print(json.dumps(error_result, ensure_ascii=False, indent=None))
        print("JSON_RESULT_END")
        sys.stdout.flush()
        return error_result

def get_materials_management():
    """자재관리 데이터에서 제품 정보를 조회하여 반환 - Memory Product Service용"""
    import sys
    import io
    
    # stdout을 UTF-8로 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    try:
        zone_info = get_zone_info(COM_CODE, use_test=USE_TEST_API)
        zone_value = zone_info.get('ZONE') if zone_info.get('ZONE') else DEFAULT_ZONE
        session_id_value = api_login_oapilogin(COM_CODE, USER_ID, API_CERT_KEY, zone_value, use_test=USE_TEST_API)
        time.sleep(1)
        
        # 모든 제품 정보 조회 (prod_cd="", prod_type="" = 전체 조회)
        product_basic_result = run_product_basic_lookup(session_id_value, zone_value, "", "")
        
        # Memory Product Service에서 요구하는 형태로 변환 (prodCd, prodNm)
        products = []
        for item_array in product_basic_result:
            if len(item_array) >= 2 and item_array[0] and item_array[1]:
                products.append({
                    'prodCd': item_array[0],    # 품목코드
                    'prodNm': item_array[1]     # 품목명
                })
        
        result = {
            "success": True,
            "data": products,
            "count": len(products)
        }
        
        return result
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "data": [],
            "message": f"제품 정보 조회 실패: {str(e)}"
        }
        return error_result

def run_product_basic_lookup_json(prod_cd="", prod_type=""):
    """품목 기본정보 조회하여 JSON 형태로 반환"""
    import sys
    import io
    
    # stdout을 UTF-8로 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    try:
        zone_info = get_zone_info(COM_CODE, use_test=USE_TEST_API)
        zone_value = zone_info.get('ZONE') if zone_info.get('ZONE') else DEFAULT_ZONE
        session_id_value = api_login_oapilogin(COM_CODE, USER_ID, API_CERT_KEY, zone_value, use_test=USE_TEST_API)
        time.sleep(1)
        
        product_data = run_product_basic_lookup(session_id_value, zone_value, prod_cd, prod_type)
        
        result = {
            "success": True,
            "data": product_data,
            "count": len(product_data)
        }
        
        print("JSON_RESULT_START")
        print(json.dumps(result, ensure_ascii=False, indent=None))
        print("JSON_RESULT_END")
        sys.stdout.flush()
        
        return result
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "data": []
        }
        print("JSON_RESULT_START")
        print(json.dumps(error_result, ensure_ascii=False, indent=None))
        print("JSON_RESULT_END")
        sys.stdout.flush()
        return error_result

if __name__ == "__main__":
    import sys
    import io
    
    # stdout을 UTF-8로 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    # 명령행 인수 확인
    if len(sys.argv) > 1:
        if sys.argv[1] == "purchase_orders_json":
            date_from = sys.argv[2] if len(sys.argv) > 2 else ""
            date_to = sys.argv[3] if len(sys.argv) > 3 else ""
            run_purchase_orders_json(date_from, date_to)
        elif sys.argv[1] == "inventory_balance_json":
            base_date = sys.argv[2] if len(sys.argv) > 2 else ""
            wh_cd = sys.argv[3] if len(sys.argv) > 3 else ""
            prod_cd = sys.argv[4] if len(sys.argv) > 4 else ""
            run_inventory_balance_status_json(base_date, wh_cd, prod_cd)
        elif sys.argv[1] == "product_basic_json":
            prod_cd = sys.argv[2] if len(sys.argv) > 2 else ""
            prod_type = sys.argv[3] if len(sys.argv) > 3 else ""
            run_product_basic_lookup_json(prod_cd, prod_type)
    else:
        # 기본 실행: 재고 조회만
        zone_info = get_zone_info(COM_CODE, use_test=USE_TEST_API)
        zone_value = zone_info.get('ZONE') if zone_info.get('ZONE') else DEFAULT_ZONE
        session_id_value = api_login_oapilogin(COM_CODE, USER_ID, API_CERT_KEY, zone_value, use_test=USE_TEST_API)
        time.sleep(1)
        run_inventory_lookup(session_id_value, zone_value)
        
        # 전체 테스트 실행을 원하면 아래 주석 해제
        # test_all_apis()
