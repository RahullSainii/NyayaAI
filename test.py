import urllib.request, json
from urllib.error import HTTPError

req = urllib.request.Request(
    'http://localhost:8000/chat',
    data=json.dumps({'query': 'is cheating a bailable offense?', 'law_filter': 'ALL'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    res = urllib.request.urlopen(req)
    print(res.read().decode('utf-8'))
except HTTPError as e:
    print('Error', e.code)
    print(e.read().decode('utf-8'))
