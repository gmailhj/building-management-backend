import requests
from requests.cookies import RequestsCookieJar

data = {
    'name': 'Bicholi Apartments',
    'address': 'Bicholi',
    'flats': {
        'FLAT-101': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'},
        'FLAT-102': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'},
        'FLAT-103': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'},
        'FLAT-104': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'},
        'FLAT-105': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'},
        'FLAT-106': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'}
    }
}

# Create a session to maintain cookies
session = requests.Session()

# Configure session
session.headers.update({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'http://127.0.0.1:3000'
})

# Create cookie jar with proper settings
cookies = RequestsCookieJar()
cookies.set('SameSite', 'None')
session.cookies = cookies

# Log in first
login_data = {
    'username': 'admin',
    'password': 'admin123'
}

# Make requests with verify=False to handle local development
login_response = session.post('http://localhost:5000/api/auth/login', json=login_data, verify=False)
print("Login response:", login_response.text)

# Update the building
update_response = session.put('http://localhost:5000/api/buildings/1', json=data, verify=False)
print("\nUpdate response:", update_response.text)

# Get building details to verify
get_response = session.get('http://localhost:5000/api/buildings/1', verify=False)
print("\nGet response:", get_response.text) 