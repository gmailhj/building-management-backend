import requests

# Create a session to maintain cookies
session = requests.Session()

# Log in
login_data = {
    'username': 'admin',
    'password': 'admin123'
}
login_response = session.post('http://localhost:5000/api/auth/login', json=login_data)
print("Login response:", login_response.text)

# Update building with flats
building_data = {
    'name': 'Bicholi Apartments',
    'address': 'Bicholi',
    'flats': {
        '101': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'},
        '102': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'},
        '103': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'}
    }
}
update_response = session.put('http://localhost:5000/api/buildings/1', json=building_data)
print("\nUpdate response:", update_response.text)

# Get building details
get_response = session.get('http://localhost:5000/api/buildings/1')
print("\nGet response:", get_response.text) 