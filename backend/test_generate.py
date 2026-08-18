import requests, csv, io
url = 'http://127.0.0.1:8000/forecast/generate'
# Create in-memory CSV
data = [
    ['date', 'category', 'units'],
    ['2023-01-01', 'A', '10'],
    ['2023-01-02', 'A', '12'],
    ['2023-01-03', 'A', '9'],
    ['2023-01-04', 'A', '11'],
    ['2023-01-05', 'A', '13'],
    ['2023-01-06', 'A', '8'],
    ['2023-01-07', 'A', '15'],
    ['2023-01-08', 'A', '14']
]
csv_io = io.StringIO()
writer = csv.writer(csv_io)
writer.writerows(data)
csv_bytes = csv_io.getvalue().encode('utf-8')
files = {
    'file': ('test_data.csv', csv_bytes, 'text/csv')
}
payload = {
    'category': 'A',
    'date_col': 'date',
    'category_col': 'category',
    'units_col': 'units',
    'time_grouping': 'Daily',
    'horizon': '1',
    'upcoming_promotion': 'false',
    'marketing_campaign': 'false',
    'new_product_launch': 'false',
    'availability_issues': 'false',
    'price_change': 'Same',
    'supply_chain_disruption': 'false',
    'regulatory_changes': 'false',
    'logistics_constraints': 'false',
    'economic_uncertainty': 'None',
    'region': 'India',
    'country': 'IN'
}
response = requests.post(url, data=payload, files=files)
print('Status:', response.status_code)
print('Response JSON:', response.json())
