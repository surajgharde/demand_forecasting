import requests, json, sys
url = 'http://127.0.0.1:8000/forecast/predict'
payload = {
    "dates": ["2023-01-01", "2023-01-02", "2023-01-03"],
    "sales": [10, 12, 9]
}
try:
    resp = requests.post(url, json=payload)
    print('Status:', resp.status_code)
    print('Response:', resp.json())
except Exception as e:
    print('Error:', e)
    sys.exit(1)
