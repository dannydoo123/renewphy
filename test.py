#라이브러리 import
import requests
import pprint
import json
import time

def test():
    com_code = 61813
    user_id = "LIVING53"
    api_cert_key = "44ef38cddd7b74de1af7d559340a49e8b3"
    zone = "CB"


    # Using provided session ID
    session_id = "36313831337c4c4956494e473533:CB-ASh7KMgxcCVch"

    url = f'https://sboapi{zone}.ecount.com/OAPI/V2/InventoryBalance/GetListInventoryBalanceStatusByLocation?SESSION_ID={session_id}'
    datas = {
        "PROD_CD": "", 
        "WH_CD": "", 
        "BASE_DATE": "20230115"
        }
    response = requests.post(url, json=datas)
    contents = json.loads(response.text)
    result = contents
    print(result)
    
    # Extract data from the API response
    if 'Data' in result and 'Datas' in result['Data']:
        data_list = result['Data']['Datas']
        ttt = list([m['PROD_CD'], m['BAL_QTY'],m['PROD_DES'],m['WH_CD'],m['WH_DES']] for m in data_list) #PROD_CD개수
        print(ttt)
    else:
        print("No data found in response")

test()