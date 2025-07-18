from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from flask_cors import CORS
import json
from datetime import datetime, UTC, timezone, timedelta
import os
from functools import wraps
import secrets

app = Flask(__name__, static_folder='pwa-app')

# Session configuration
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Changed from None to Lax
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_DOMAIN'] = None  # Allow all domains in development
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)  # Make session last for 1 day
app.config['SESSION_COOKIE_PATH'] = '/'  # Ensure cookie is available for all paths

# CORS configuration
CORS(app, 
     resources={r"/*": {
         "origins": [
             "http://127.0.0.1:5000", 
             "http://localhost:5000", 
             "http://localhost:3000",
             "https://web-production-06288.up.railway.app",
             "https://*.vercel.app",
             "https://*.railway.app"
         ],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True,
         "expose_headers": ["Set-Cookie", "Content-Type"]
     }},
     supports_credentials=True)

# File to store buildings data
BUILDINGS_FILE = 'buildings.json'
TENANTS_FILE = 'tenants.json'
BILLS_FILE = 'bills.json'
MESSAGES_FILE = 'messages.json'
PREVIOUS_TENANTS_FILE = 'previous_tenants.json'

# Constants for new features
MAINTENANCE_REQUESTS_FILE = 'data/maintenance_requests.json'
EXPENSES_FILE = 'data/expenses.json'
ANALYTICS_FILE = 'data/analytics.json'

# File to store SMS settings and notification history
SMS_SETTINGS_FILE = 'data/sms_settings.json'
NOTIFICATION_HISTORY_FILE = 'data/notification_history.json'

# Add new constant for message templates file
MESSAGE_TEMPLATES_FILE = 'data/message_templates.json'

# Add new constants
USERS_FILE = 'data/users.json'
SECRET_KEY = secrets.token_hex(32)  # Generate a random secret key

# Add new constant for flat settings file
FLAT_SETTINGS_FILE = 'data/flat_settings.json'

# Predefined flats information
FLATS = {
    'FLAT-101': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant', 'link_id': '101A'},
    'FLAT-102': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant', 'link_id': '102A'},
    'FLAT-103': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant', 'link_id': '103A'},
    'FLAT-104': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant', 'link_id': '104A'},
    'FLAT-105': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant', 'link_id': '105A'},
    'FLAT-106': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant', 'link_id': '106A'}
}

# SMS Configuration
SMS_CONFIG = {
    'enabled': False,  # Set to True to enable SMS
    'provider': 'twilio',  # Current supported provider
    'twilio': {
        'account_sid': os.environ.get('TWILIO_ACCOUNT_SID', ''),
        'auth_token': os.environ.get('TWILIO_AUTH_TOKEN', ''),
        'from_number': os.environ.get('TWILIO_FROM_NUMBER', '')
    }
}

# Default message templates with enhanced variables
DEFAULT_TEMPLATES = {
    'rent_due': "Dear {tenant_name}, your rent of Rs. {amount} for {flat_no} is due today. Your payment trend is {payment_trend}. Total dues: Rs. {total_dues}. Please ensure timely payment.",
    'rent_reminder': "Reminder: Your rent of Rs. {amount} for {flat_no} is due in {days_until_due} days. Last payment was on {last_payment_date}. Current payment status: {payment_status}.",
    'rent_overdue': "OVERDUE NOTICE: Your rent of Rs. {amount} for {flat_no} is overdue by {days_until_due} days. Total pending amount: Rs. {total_dues}. Please clear dues immediately.",
    'bill_due_soon': "Dear {tenant_name}, your utility bill of Rs. {electricity_amount} for {flat_no} is due soon. Total bill dues: Rs. {total_bill_dues}. Last bill status: {last_bill_status}.",
    'bill_overdue': "OVERDUE NOTICE: Your utility bill payment of Rs. {electricity_amount} for {flat_no} is pending. Total bill dues: Rs. {total_bill_dues}. Please clear immediately."
}

# Initialize the app with the secret key
app.config['SECRET_KEY'] = SECRET_KEY

# Initialize users file if it doesn't exist
if not os.path.exists(USERS_FILE):
    default_owner = {
        'username': 'admin',
        'password': 'admin123',  # In production, this should be hashed
        'role': 'owner'
    }
    with open(USERS_FILE, 'w') as f:
        json.dump({'users': [default_owner]}, f, indent=2)

# Initialize flat settings file if it doesn't exist
if not os.path.exists(FLAT_SETTINGS_FILE):
    with open(FLAT_SETTINGS_FILE, 'w') as f:
        json.dump({}, f, indent=2)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

def owner_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session or session['user'].get('role') != 'owner':
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return redirect('/pwa-app/login.html')

def load_buildings():
    try:
        with open(BUILDINGS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_buildings(buildings):
    with open(BUILDINGS_FILE, 'w') as f:
        json.dump(buildings, f, indent=4)

@app.route('/api/buildings', methods=['GET'])
def get_buildings():
    buildings = load_buildings()
    search = request.args.get('search', '').lower()
    if search:
        buildings = [b for b in buildings if search in b['name'].lower() or search in b['address'].lower()]
    return jsonify(buildings)

@app.route('/api/buildings', methods=['POST'])
def add_building():
    buildings = load_buildings()
    data = request.get_json()
    
    new_building = {
        'id': len(buildings) + 1,
        'name': data['name'],
        'address': data['address'],
        'flats': data.get('flats', {}),
        'status': 'active',
        'created_at': datetime.now(UTC).isoformat()
    }
    
    buildings.append(new_building)
    save_buildings(buildings)
    return jsonify(new_building), 201

@app.route('/api/buildings/<int:building_id>', methods=['DELETE'])
def delete_building(building_id):
    buildings = load_buildings()
    buildings = [b for b in buildings if b['id'] != building_id]
    save_buildings(buildings)
    return '', 204

@app.route('/api/buildings/<int:building_id>', methods=['PUT'])
def update_building(building_id):
    buildings = load_buildings()
    data = request.get_json()
    
    for building in buildings:
        if building['id'] == building_id:
            building['name'] = data.get('name', building['name'])
            building['address'] = data.get('address', building['address'])
            building['status'] = data.get('status', building['status'])
            save_buildings(buildings)
            return jsonify(building)
    
    return jsonify({'error': 'Building not found'}), 404

@app.route('/api/buildings/<int:building_id>', methods=['GET'])
@login_required
def get_building(building_id):
    buildings = load_buildings()
    building = next((b for b in buildings if b['id'] == building_id), None)
    
    if building is None:
        return jsonify({'error': 'Building not found'}), 404
    
    # If flats are not defined in the building, initialize with default FLATS
    if not building.get('flats'):
        building['flats'] = FLATS.copy()
        
    # Update the status of flats based on tenant occupancy
    tenants = load_data(TENANTS_FILE)
    active_tenants = [t for t in tenants if t['building_id'] == building_id and t['status'] == 'active']
    
    for flat_no, flat_info in building['flats'].items():
        tenant = next((t for t in active_tenants if t['flat_no'] == flat_no), None)
        flat_info['status'] = 'occupied' if tenant else 'vacant'
        
    return jsonify(building)

@app.route('/api/buildings/<int:building_id>/flats', methods=['GET'])
def get_building_flats(building_id):
    buildings = load_buildings()
    building = next((b for b in buildings if b['id'] == building_id), None)
    
    if building is None:
        return jsonify({'error': 'Building not found'}), 404
        
    return jsonify(building.get('flats', {}))

@app.route('/api/tenants', methods=['GET'])
@login_required
def get_tenants():
    tenants = load_data(TENANTS_FILE)
    
    # If user is a tenant, only return their own information
    if session['user']['role'] == 'tenant':
        tenants = [t for t in tenants if t['id'] == session['user'].get('tenant_id')]
    
    building_id = request.args.get('building_id')
    flat_no = request.args.get('flat_no')
    
    if building_id:
        tenants = [t for t in tenants if t['building_id'] == int(building_id)]
    if flat_no:
        tenants = [t for t in tenants if t['flat_no'] == flat_no]
    return jsonify(tenants)

@app.route('/api/tenants', methods=['POST'])
@login_required
def add_tenant():
    tenants = load_data(TENANTS_FILE)
    data = request.get_json()
    
    new_tenant = {
        'id': len(tenants) + 1,
        'building_id': data['building_id'],
        'flat_no': data['flat_no'],
        'name': data['name'],
        'contact_no': data['contact_no'],
        'aadhar_no': data['aadhar_no'],
        'rent_amount': data['rent_amount'],
        'rent_due_day': data.get('rent_due_day', 5),  # Default to 5th of every month
        'reminder_days': data.get('reminder_days', 5),  # Default to 5 days before
        'reminder_method': data.get('reminder_method', 'notification'),  # Default to in-app notification
        'move_in_date': data['move_in_date'],
        'previous_meter_reading': data.get('previous_meter_reading', 0),
        'current_meter_reading': data.get('current_meter_reading', 0),
        'agreement_file': data.get('agreement_file', ''),
        'status': 'active',
        'created_at': datetime.now(UTC).isoformat()
    }
    
    # Update the flat status in the building
    buildings = load_buildings()
    building = next((b for b in buildings if b['id'] == data['building_id']), None)
    if building and building.get('flats'):
        if data['flat_no'] in building['flats']:
            building['flats'][data['flat_no']]['status'] = 'occupied'
            save_buildings(buildings)
    
    tenants.append(new_tenant)
    save_data(tenants, TENANTS_FILE)
    return jsonify(new_tenant), 201

@app.route('/api/tenants/<int:tenant_id>', methods=['PUT'])
@login_required
def update_tenant(tenant_id):
    tenants = load_data(TENANTS_FILE)
    tenant = next((t for t in tenants if t['id'] == tenant_id), None)
    
    if not tenant:
        return jsonify({'error': 'Tenant not found'}), 404
    
    data = request.get_json()
    allowed_fields = ['name', 'contact_no', 'rent_amount', 'rent_due_day', 'reminder_days', 'reminder_method', 'status', 'aadhar_no', 'previous_meter_reading', 'current_meter_reading', 'agreement_file']
    
    for field in allowed_fields:
        if field in data:
            tenant[field] = data[field]
    
    save_data(tenants, TENANTS_FILE)
    return jsonify(tenant)

@app.route('/api/bills', methods=['GET'])
def get_bills():
    bills = load_data(BILLS_FILE)
    tenant_id = request.args.get('tenant_id')
    month = request.args.get('month')
    
    if tenant_id:
        bills = [b for b in bills if b['tenant_id'] == int(tenant_id)]
    if month:
        bills = [b for b in bills if b['month'] == month]
    return jsonify(bills)

@app.route('/api/bills', methods=['POST'])
def add_bill():
    bills = load_data(BILLS_FILE)
    data = request.get_json()
    
    new_bill = {
        'id': len(bills) + 1,
        'tenant_id': data['tenant_id'],
        'month': data['month'],
        'year': data['year'],
        'rent_amount': data['rent_amount'],
        'electricity_amount': data['electricity_amount'],
        'maid_charges': data['maid_charges'],
        'status': 'pending',
        'due_date': data['due_date'],
        'created_at': datetime.now(UTC).isoformat()
    }
    
    bills.append(new_bill)
    save_data(bills, BILLS_FILE)
    return jsonify(new_bill), 201

@app.route('/api/bills/<int:bill_id>', methods=['GET', 'PUT'])
def get_bill(bill_id):
    try:
        with open(BILLS_FILE, 'r') as f:
            bills = json.load(f)
            bill = next((b for b in bills if b['id'] == bill_id), None)
            
            if not bill:
                return jsonify({'message': 'Bill not found'}), 404
                
            if request.method == 'PUT':
                data = request.get_json()
                bill['status'] = data.get('status', bill['status'])
                bill['payment_date'] = data.get('payment_date')
                save_data(bills, BILLS_FILE)
                
            return jsonify(bill)
    except FileNotFoundError:
        return jsonify({'message': 'No bills found'}), 404
    except Exception as e:
        return jsonify({'message': str(e)}), 500

def send_sms(phone_number, message):
    """Send SMS using configured provider"""
    if not SMS_CONFIG['enabled']:
        print(f"SMS would be sent to {phone_number}: {message}")
        save_notification({
            'type': 'sms_disabled',
            'message': message,
            'phone_number': phone_number,
            'status': 'simulated'
        })
        return True
        
    try:
        if SMS_CONFIG['provider'] == 'twilio':
            from twilio.rest import Client
            client = Client(
                SMS_CONFIG['twilio']['account_sid'],
                SMS_CONFIG['twilio']['auth_token']
            )
            message = client.messages.create(
                body=message,
                from_=SMS_CONFIG['twilio']['from_number'],
                to=phone_number
            )
            save_notification({
                'type': 'sms_sent',
                'message': message.body,
                'phone_number': phone_number,
                'status': 'sent',
                'provider_message_id': message.sid
            })
            return True
    except Exception as e:
        print(f"Error sending SMS: {str(e)}")
        save_notification({
            'type': 'sms_error',
            'message': message,
            'phone_number': phone_number,
            'status': 'error',
            'error': str(e)
        })
        return False

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    try:
        current_date = datetime.now(timezone.utc)
        notifications = []
        
        # Load bills and tenants
        bills = load_data(BILLS_FILE)
        tenants = load_data(TENANTS_FILE)
        
        # Check for pending and overdue bills
        for bill in bills:
            due_date = datetime.fromisoformat(bill['due_date']).replace(tzinfo=timezone.utc)
            if current_date > due_date and bill['status'] == 'pending':
                tenant = next((t for t in tenants if t['id'] == bill['tenant_id']), None)
                flat_info = f"Flat {tenant['flat_no']}" if tenant else f"Bill ID {bill['id']}"
                notification = {
                    'type': 'bill_overdue',
                    'message': f"Bill for {flat_info} is overdue (Due: {due_date.strftime('%Y-%m-%d')})",
                    'date': due_date.isoformat(),
                    'tenant_id': bill['tenant_id'],
                    'flat_no': tenant['flat_no'] if tenant else None
                }
                notifications.append(notification)
                
                # Send SMS for overdue bills if configured
                if tenant and tenant.get('reminder_method') in ['sms', 'both']:
                    send_sms(tenant['contact_no'], notification['message'])
                    
            elif bill['status'] == 'pending':
                days_until_due = (due_date - current_date).days
                if days_until_due <= 5:
                    tenant = next((t for t in tenants if t['id'] == bill['tenant_id']), None)
                    flat_info = f"Flat {tenant['flat_no']}" if tenant else f"Bill ID {bill['id']}"
                    notification = {
                        'type': 'bill_due_soon',
                        'message': f"Bill for {flat_info} is due in {days_until_due} days",
                        'date': due_date.isoformat(),
                        'tenant_id': bill['tenant_id'],
                        'flat_no': tenant['flat_no'] if tenant else None
                    }
                    notifications.append(notification)
                    
                    # Send SMS for upcoming bills if configured
                    if tenant and tenant.get('reminder_method') in ['sms', 'both']:
                        send_sms(tenant['contact_no'], notification['message'])
        
        # Check for upcoming rent due dates
        for tenant in tenants:
            if tenant['status'] != 'active':
                continue
                
            # Calculate next rent due date
            today = current_date.date()
            rent_due_day = tenant['rent_due_day']
            next_due_date = datetime(today.year, today.month, rent_due_day, tzinfo=timezone.utc)
            
            # If we're past this month's due date, look at next month
            if today.day > rent_due_day:
                if today.month == 12:
                    next_due_date = datetime(today.year + 1, 1, rent_due_day, tzinfo=timezone.utc)
                else:
                    next_due_date = datetime(today.year, today.month + 1, rent_due_day, tzinfo=timezone.utc)
            
            days_until_due = (next_due_date.date() - today).days
            reminder_days = tenant.get('reminder_days', 5)
            reminder_method = tenant.get('reminder_method', 'notification')
            
            # Add reminder based on tenant's preferences
            if 0 < days_until_due <= reminder_days:
                notification = {
                    'type': 'rent_reminder',
                    'message': f"Rent for Flat {tenant['flat_no']} is due in {days_until_due} days (Due: {next_due_date.strftime('%Y-%m-%d')})",
                    'date': next_due_date.isoformat(),
                    'tenant_id': tenant['id'],
                    'flat_no': tenant['flat_no'],
                    'reminder_method': reminder_method
                }
                notifications.append(notification)
                
                # Send SMS if configured
                if reminder_method in ['sms', 'both']:
                    send_sms(tenant['contact_no'], notification['message'])
                    
            elif days_until_due == 0:
                notification = {
                    'type': 'rent_due',
                    'message': f"Rent for Flat {tenant['flat_no']} is due today",
                    'date': next_due_date.isoformat(),
                    'tenant_id': tenant['id'],
                    'flat_no': tenant['flat_no'],
                    'reminder_method': reminder_method
                }
                notifications.append(notification)
                
                # Send SMS if configured
                if reminder_method in ['sms', 'both']:
                    send_sms(tenant['contact_no'], notification['message'])
                    
            elif days_until_due < 0:
                notification = {
                    'type': 'rent_overdue',
                    'message': f"Rent for Flat {tenant['flat_no']} is overdue by {abs(days_until_due)} days",
                    'date': next_due_date.isoformat(),
                    'tenant_id': tenant['id'],
                    'flat_no': tenant['flat_no'],
                    'reminder_method': reminder_method
                }
                notifications.append(notification)
                
                # Send SMS if configured
                if reminder_method in ['sms', 'both']:
                    send_sms(tenant['contact_no'], notification['message'])
        
        # Sort notifications by date
        notifications.sort(key=lambda x: x['date'], reverse=True)
        return jsonify(notifications)
    except Exception as e:
        print(f"Error in get_notifications: {str(e)}")
        return jsonify({'error': 'Failed to load notifications'}), 500

@app.route('/api/messages/<int:tenant_id>', methods=['GET'])
def get_tenant_messages(tenant_id):
    messages = load_data(MESSAGES_FILE)
    tenant_messages = [msg for msg in messages if msg['tenant_id'] == tenant_id]
    return jsonify(tenant_messages)

@app.route('/api/messages', methods=['POST'])
def create_message():
    data = request.json
    messages = load_data(MESSAGES_FILE)
    
    new_message = {
        'id': len(messages) + 1,
        'tenant_id': data['tenant_id'],
        'subject': data['subject'],
        'content': data['content'],
        'created_at': datetime.now(timezone.utc).isoformat(),
        'is_read': False
    }
    
    messages.append(new_message)
    save_data(messages, MESSAGES_FILE)
    return jsonify(new_message), 201

@app.route('/api/messages/<int:message_id>', methods=['PUT'])
def update_message(message_id):
    messages = load_data(MESSAGES_FILE)
    message = next((msg for msg in messages if msg['id'] == message_id), None)
    
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    data = request.json
    message['is_read'] = data.get('is_read', message['is_read'])
    
    save_data(messages, MESSAGES_FILE)
    return jsonify(message)

@app.route('/api/tenants/<int:tenant_id>', methods=['GET'])
@login_required
def get_tenant(tenant_id):
    # Check if user has access to this tenant's information
    if session['user']['role'] == 'tenant' and session['user'].get('tenant_id') != tenant_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    tenants = load_data(TENANTS_FILE)
    buildings = load_data(BUILDINGS_FILE)
    
    tenant = next((t for t in tenants if t['id'] == tenant_id), None)
    if not tenant:
        return jsonify({'error': 'Tenant not found'}), 404
    
    # Add building name to tenant info
    building = next((b for b in buildings if b['id'] == tenant['building_id']), None)
    if building:
        tenant['building_name'] = building['name']
    
    # Add payment history
    payment_info = get_payment_history(tenant_id)
    tenant['payment_history'] = payment_info
    
    return jsonify(tenant)

@app.route('/api/flats/<string:link_id>/bill', methods=['GET', 'POST'])
def flat_bill(link_id):
    # Find the flat with matching link_id
    flat_no = None
    for no, info in FLATS.items():
        if info['link_id'] == link_id:
            flat_no = no
            break
    
    if not flat_no:
        return jsonify({'error': 'Invalid flat link'}), 404
    
    # Get building and tenant info for this flat
    buildings = load_data(BUILDINGS_FILE)
    tenants = load_data(TENANTS_FILE)
    
    # Find the building and tenant for this flat
    building = None
    tenant = None
    
    for b in buildings:
        if flat_no in b.get('flats', {}):
            building = b
            break
    
    if building:
        tenant = next((t for t in tenants 
                      if t['building_id'] == building['id'] 
                      and t['flat_no'] == flat_no 
                      and t['status'] == 'active'), None)
    
    if request.method == 'GET':
        flat_info = {
            'flat_no': flat_no,
            'type': FLATS[flat_no]['type'],
            'rent_amount': FLATS[flat_no]['rent_amount'],
            'building_name': building['name'] if building else None,
            'tenant_name': tenant['name'] if tenant else None,
            'tenant_id': tenant['id'] if tenant else None
        }
        return jsonify(flat_info)
    
    # POST method - generate bill
    if not tenant:
        return jsonify({'error': 'No active tenant found for this flat'}), 404
    
    data = request.json
    new_bill = {
        'tenant_id': tenant['id'],
        'flat_no': flat_no,
        'month': data['month'],
        'year': data['year'],
        'electricity_reading': data['electricity_reading'],
        'electricity_amount': data['electricity_reading'] * data.get('rate', 8),  # Default rate 8/unit
        'rent_amount': FLATS[flat_no]['rent_amount'],
        'status': 'pending',
        'due_date': data['due_date'],
        'created_at': datetime.now(UTC).isoformat()
    }
    
    bills = load_data(BILLS_FILE)
    new_bill['id'] = len(bills) + 1
    bills.append(new_bill)
    save_data(bills, BILLS_FILE)
    
    return jsonify(new_bill), 201

@app.route('/api/flats/<string:link_id>/info', methods=['GET'])
def get_flat_info(link_id):
    # Find the flat with matching link_id
    flat_no = None
    for no, info in FLATS.items():
        if info['link_id'] == link_id:
            flat_no = no
            break
    
    if not flat_no:
        return jsonify({'error': 'Invalid flat link'}), 404
    
    # Get building and tenant info for this flat
    buildings = load_data(BUILDINGS_FILE)
    tenants = load_data(TENANTS_FILE)
    
    # Find the building and tenant for this flat
    building = None
    tenant = None
    
    for b in buildings:
        if flat_no in b.get('flats', {}):
            building = b
            break
    
    if building:
        tenant = next((t for t in tenants 
                      if t['building_id'] == building['id'] 
                      and t['flat_no'] == flat_no 
                      and t['status'] == 'active'), None)
    
    flat_info = {
        'flat_no': flat_no,
        'type': FLATS[flat_no]['type'],
        'rent_amount': FLATS[flat_no]['rent_amount'],
        'status': FLATS[flat_no]['status'],
        'building_name': building['name'] if building else None,
        'building_id': building['id'] if building else None,
        'tenant_id': tenant['id'] if tenant else None
    }
    
    return jsonify(flat_info)

@app.route('/api/flats/<string:link_id>/bills', methods=['GET'])
def get_flat_bills(link_id):
    # Find the flat with matching link_id
    flat_no = None
    for no, info in FLATS.items():
        if info['link_id'] == link_id:
            flat_no = no
            break
    
    if not flat_no:
        return jsonify({'error': 'Invalid flat link'}), 404
    
    # Get all bills for this flat
    bills = load_data(BILLS_FILE)
    flat_bills = [bill for bill in bills if bill['flat_no'] == flat_no]
    
    # Sort bills by date (newest first)
    flat_bills.sort(key=lambda x: (x['year'], x['month']), reverse=True)
    
    return jsonify(flat_bills)

@app.route('/api/flats/<string:flat_id>', methods=['GET'])
def get_flat_details(flat_id):
    # Split the flat_id into building_id and flat_number
    try:
        building_id, flat_number = flat_id.split('_')
        building_id = int(building_id)
    except ValueError:
        return jsonify({'error': 'Invalid flat ID format'}), 400

    # Load buildings data
    buildings = load_buildings()
    
    # Find the building
    building = next((b for b in buildings if b['id'] == building_id), None)
    if not building:
        return jsonify({'error': 'Building not found'}), 404
        
    # Find the flat
    flat = building['flats'].get(flat_number)
    if not flat:
        return jsonify({'error': 'Flat not found'}), 404
        
    # Add building info to flat details
    flat_details = {
        'building_name': building['name'],
        'building_address': building['address'],
        'flat_number': flat_number,
        **flat
    }
    
    return jsonify(flat_details)

@app.route('/api/flats/<string:flat_id>/previous-tenants', methods=['GET'])
def get_previous_tenants(flat_id):
    try:
        building_id, flat_number = flat_id.split('_')
        building_id = int(building_id)
        
        # Load previous tenants data
        previous_tenants = load_data(PREVIOUS_TENANTS_FILE)
        
        # Filter tenants for this flat
        flat_previous_tenants = [
            tenant for tenant in previous_tenants 
            if tenant['building_id'] == building_id and tenant['flat_no'] == flat_number
        ]
        
        # Sort by move out date, most recent first
        flat_previous_tenants.sort(key=lambda x: x['move_out_date'], reverse=True)
        
        return jsonify(flat_previous_tenants)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Ensure maintenance requests file exists
if not os.path.exists(MAINTENANCE_REQUESTS_FILE):
    with open(MAINTENANCE_REQUESTS_FILE, 'w') as f:
        json.dump([], f)

@app.route('/api/maintenance-requests', methods=['GET'])
def get_maintenance_requests():
    try:
        with open(MAINTENANCE_REQUESTS_FILE, 'r') as f:
            requests = json.load(f)
        return jsonify(requests)
    except Exception as e:
        print(f"Error loading maintenance requests: {str(e)}")
        return jsonify({'error': 'Failed to load maintenance requests'}), 500

@app.route('/api/maintenance-requests', methods=['POST'])
def create_maintenance_request():
    try:
        data = request.json
        required_fields = ['flat_id', 'title', 'description', 'priority']
        
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
            
        with open(MAINTENANCE_REQUESTS_FILE, 'r') as f:
            requests = json.load(f)
            
        new_request = {
            'id': len(requests) + 1,
            'flat_id': data['flat_id'],
            'title': data['title'],
            'description': data['description'],
            'priority': data['priority'],
            'status': 'pending',
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        requests.append(new_request)
        
        with open(MAINTENANCE_REQUESTS_FILE, 'w') as f:
            json.dump(requests, f, indent=4)
            
        return jsonify(new_request), 201
    except Exception as e:
        print(f"Error creating maintenance request: {str(e)}")
        return jsonify({'error': 'Failed to create maintenance request'}), 500

@app.route('/api/maintenance-requests/<int:request_id>', methods=['PUT'])
def update_maintenance_request(request_id):
    try:
        data = request.json
        with open(MAINTENANCE_REQUESTS_FILE, 'r') as f:
            requests = json.load(f)
            
        request_to_update = next((r for r in requests if r['id'] == request_id), None)
        if not request_to_update:
            return jsonify({'error': 'Maintenance request not found'}), 404
            
        allowed_updates = ['status', 'priority', 'notes']
        for field in allowed_updates:
            if field in data:
                request_to_update[field] = data[field]
                
        request_to_update['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        with open(MAINTENANCE_REQUESTS_FILE, 'w') as f:
            json.dump(requests, f, indent=4)
            
        return jsonify(request_to_update)
    except Exception as e:
        print(f"Error updating maintenance request: {str(e)}")
        return jsonify({'error': 'Failed to update maintenance request'}), 500

# Ensure data directory exists
if not os.path.exists('data'):
    os.makedirs('data')

# Initialize files if they don't exist
for file_path in [MAINTENANCE_REQUESTS_FILE, EXPENSES_FILE, ANALYTICS_FILE, SMS_SETTINGS_FILE, NOTIFICATION_HISTORY_FILE, MESSAGE_TEMPLATES_FILE]:
    if not os.path.exists(os.path.dirname(file_path)):
        os.makedirs(os.path.dirname(file_path))
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            json.dump([] if file_path == NOTIFICATION_HISTORY_FILE else DEFAULT_TEMPLATES if file_path == MESSAGE_TEMPLATES_FILE else {}, f, indent=2)

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    try:
        building_id = request.args.get('building_id')
        category = request.args.get('category')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        with open(EXPENSES_FILE, 'r') as f:
            expenses = json.load(f)
        
        # Apply filters
        if building_id:
            expenses = [e for e in expenses if e['building_id'] == int(building_id)]
        if category:
            expenses = [e for e in expenses if e['category'] == category]
        if start_date:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            expenses = [e for e in expenses if datetime.fromisoformat(e['date']) >= start]
        if end_date:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            expenses = [e for e in expenses if datetime.fromisoformat(e['date']) <= end]
            
        return jsonify(expenses)
    except Exception as e:
        print(f"Error getting expenses: {str(e)}")
        return jsonify({'error': 'Failed to load expenses'}), 500

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    try:
        data = request.json
        required_fields = ['building_id', 'category', 'amount', 'description']
        
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
            
        with open(EXPENSES_FILE, 'r') as f:
            expenses = json.load(f)
            
        new_expense = {
            'id': len(expenses) + 1,
            'building_id': data['building_id'],
            'category': data['category'],
            'amount': float(data['amount']),
            'description': data['description'],
            'date': datetime.now(timezone.utc).isoformat(),
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        if 'receipt_url' in data:
            new_expense['receipt_url'] = data['receipt_url']
            
        expenses.append(new_expense)
        
        with open(EXPENSES_FILE, 'w') as f:
            json.dump(expenses, f, indent=4)
            
        return jsonify(new_expense), 201
    except Exception as e:
        print(f"Error adding expense: {str(e)}")
        return jsonify({'error': 'Failed to add expense'}), 500

@app.route('/api/analytics/dashboard', methods=['GET'])
def get_dashboard_analytics():
    try:
        building_id = request.args.get('building_id')
        
        # Load all required data
        buildings = load_buildings()
        with open(EXPENSES_FILE, 'r') as f:
            expenses = json.load(f)
        with open(BILLS_FILE, 'r') as f:
            bills = json.load(f)
        tenants = load_data(TENANTS_FILE)
        
        # Filter by building if specified
        if building_id:
            building_id = int(building_id)
            buildings = [b for b in buildings if b['id'] == building_id]
            expenses = [e for e in expenses if e['building_id'] == building_id]
            bills = [b for b in bills if b['building_id'] == building_id]
            tenants = [t for t in tenants if t['building_id'] == building_id]
        
        # Calculate analytics
        current_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month = (current_month - timedelta(days=1)).replace(day=1)
        
        analytics = {
            'occupancy_rate': calculate_occupancy_rate(buildings, tenants),
            'revenue': {
                'current_month': calculate_revenue(bills, current_month),
                'last_month': calculate_revenue(bills, last_month),
                'yearly': calculate_yearly_revenue(bills)
            },
            'expenses': {
                'current_month': calculate_expenses(expenses, current_month),
                'last_month': calculate_expenses(expenses, last_month),
                'by_category': calculate_expenses_by_category(expenses)
            },
            'maintenance': {
                'pending_requests': count_pending_maintenance(),
                'completed_requests': count_completed_maintenance()
            },
            'tenant_statistics': calculate_tenant_statistics(tenants)
        }
        
        return jsonify(analytics)
    except Exception as e:
        print(f"Error getting analytics: {str(e)}")
        return jsonify({'error': 'Failed to load analytics'}), 500

# Helper functions for analytics calculations
def calculate_occupancy_rate(buildings, tenants):
    total_flats = sum(len(b.get('flats', {})) for b in buildings)
    occupied_flats = len([t for t in tenants if t['status'] == 'active'])
    return round((occupied_flats / total_flats * 100) if total_flats > 0 else 0, 2)

def calculate_revenue(bills, month):
    month_bills = [b for b in bills if datetime.fromisoformat(b['created_at']).replace(tzinfo=timezone.utc).strftime('%Y-%m') == month.strftime('%Y-%m')]
    return sum(b['rent_amount'] + b.get('electricity_amount', 0) for b in month_bills)

def calculate_yearly_revenue(bills):
    current_year = datetime.now(timezone.utc).year
    year_bills = [b for b in bills if datetime.fromisoformat(b['created_at']).replace(tzinfo=timezone.utc).year == current_year]
    return sum(b['rent_amount'] + b.get('electricity_amount', 0) for b in year_bills)

def calculate_expenses(expenses, month):
    month_expenses = [e for e in expenses if datetime.fromisoformat(e['date']).replace(tzinfo=timezone.utc).strftime('%Y-%m') == month.strftime('%Y-%m')]
    return sum(e['amount'] for e in month_expenses)

def calculate_expenses_by_category(expenses):
    categories = {}
    for expense in expenses:
        category = expense['category']
        amount = expense['amount']
        categories[category] = categories.get(category, 0) + amount
    return categories

def count_pending_maintenance():
    try:
        with open(MAINTENANCE_REQUESTS_FILE, 'r') as f:
            requests = json.load(f)
        return len([r for r in requests if r['status'] == 'pending'])
    except Exception:
        return 0

def count_completed_maintenance():
    try:
        with open(MAINTENANCE_REQUESTS_FILE, 'r') as f:
            requests = json.load(f)
        return len([r for r in requests if r['status'] == 'completed'])
    except Exception:
        return 0

def calculate_tenant_statistics(tenants):
    total_tenants = len([t for t in tenants if t['status'] == 'active'])
    avg_rent = sum(t['rent_amount'] for t in tenants if t['status'] == 'active') / total_tenants if total_tenants > 0 else 0
    return {
        'total_active': total_tenants,
        'average_rent': round(avg_rent, 2)
    }

@app.route('/api/settings/sms', methods=['GET'])
def get_sms_settings():
    try:
        if os.path.exists(SMS_SETTINGS_FILE):
            with open(SMS_SETTINGS_FILE, 'r') as f:
                return jsonify(json.load(f))
        return jsonify(SMS_CONFIG)
    except Exception as e:
        print(f"Error loading SMS settings: {str(e)}")
        return jsonify({'error': 'Failed to load SMS settings'}), 500

@app.route('/api/settings/sms', methods=['POST'])
def update_sms_settings():
    try:
        data = request.get_json()
        with open(SMS_SETTINGS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
            
        # Update runtime configuration
        SMS_CONFIG.update(data)
        return jsonify({'message': 'SMS settings updated successfully'})
    except Exception as e:
        print(f"Error updating SMS settings: {str(e)}")
        return jsonify({'error': 'Failed to update SMS settings'}), 500

@app.route('/api/settings/sms/test', methods=['POST'])
def test_sms():
    try:
        data = request.get_json()
        success = send_sms(data['phone_number'], data['message'])
        if success:
            return jsonify({'message': 'Test SMS sent successfully'})
        return jsonify({'error': 'Failed to send test SMS'}), 500
    except Exception as e:
        print(f"Error sending test SMS: {str(e)}")
        return jsonify({'error': 'Failed to send test SMS'}), 500

@app.route('/api/notifications/history', methods=['GET'])
def get_notification_history():
    try:
        with open(NOTIFICATION_HISTORY_FILE, 'r') as f:
            history = json.load(f)
        return jsonify(history)
    except Exception as e:
        print(f"Error loading notification history: {str(e)}")
        return jsonify({'error': 'Failed to load notification history'}), 500

def save_notification(notification):
    """Save notification to history"""
    try:
        history = []
        if os.path.exists(NOTIFICATION_HISTORY_FILE):
            with open(NOTIFICATION_HISTORY_FILE, 'r') as f:
                history = json.load(f)
        
        # Add timestamp to notification
        notification['created_at'] = datetime.now(timezone.utc).isoformat()
        history.append(notification)
        
        # Keep only last 100 notifications
        if len(history) > 100:
            history = history[-100:]
        
        with open(NOTIFICATION_HISTORY_FILE, 'w') as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"Error saving notification: {str(e)}")

@app.route('/api/settings/templates', methods=['GET'])
def get_message_templates():
    try:
        if os.path.exists(MESSAGE_TEMPLATES_FILE):
            with open(MESSAGE_TEMPLATES_FILE, 'r') as f:
                return jsonify(json.load(f))
        return jsonify(DEFAULT_TEMPLATES)
    except Exception as e:
        print(f"Error loading message templates: {str(e)}")
        return jsonify({'error': 'Failed to load message templates'}), 500

@app.route('/api/settings/templates', methods=['POST'])
def update_message_templates():
    try:
        templates = request.get_json()
        with open(MESSAGE_TEMPLATES_FILE, 'w') as f:
            json.dump(templates, f, indent=2)
        return jsonify({'message': 'Message templates updated successfully'})
    except Exception as e:
        print(f"Error updating message templates: {str(e)}")
        return jsonify({'error': 'Failed to update message templates'}), 500

@app.route('/api/settings/templates/reset', methods=['POST'])
def reset_templates():
    """Reset message templates to default values"""
    try:
        with open(MESSAGE_TEMPLATES_FILE, 'w') as f:
            json.dump(DEFAULT_TEMPLATES, f, indent=4)
        return jsonify({'message': 'Templates reset successfully'}), 200
    except Exception as e:
        app.logger.error(f'Error resetting templates: {str(e)}')
        return jsonify({'error': 'Failed to reset templates'}), 500

def format_message(template, context):
    """Format a message template with enhanced context variables"""
    try:
        # Add payment trend calculation
        if 'payment_history' in context:
            history = context['payment_history']
            on_time_payments = sum(1 for p in history if p.get('status') == 'on_time')
            total_payments = len(history)
            if total_payments > 0:
                ratio = on_time_payments / total_payments
                if ratio >= 0.9:
                    context['payment_trend'] = 'Excellent'
                elif ratio >= 0.75:
                    context['payment_trend'] = 'Good'
                elif ratio >= 0.6:
                    context['payment_trend'] = 'Fair'
                else:
                    context['payment_trend'] = 'Poor'
            else:
                context['payment_trend'] = 'No history'

        # Format the message with all available variables
        return template.format(**context)
    except KeyError as e:
        app.logger.error(f'Missing template variable: {str(e)}')
        return template  # Return unformatted template if variables are missing
    except Exception as e:
        app.logger.error(f'Error formatting message: {str(e)}')
        return template

def get_payment_history(tenant_id):
    """Get payment history for a tenant"""
    bills = load_data(BILLS_FILE)
    tenant_bills = [b for b in bills if b['tenant_id'] == tenant_id]
    
    if not tenant_bills:
        return {
            'payment_status': 'No previous payments found',
            'last_payment_status': 'N/A',
            'last_payment_date': 'N/A',
            'total_dues': 0,
            'total_bill_dues': 0,
            'last_bill_status': 'N/A',
            'payment_trend': 'N/A'
        }
    
    # Sort bills by date
    tenant_bills.sort(key=lambda x: (x['year'], x['month']), reverse=True)
    
    # Calculate total dues
    total_dues = sum(b['rent_amount'] + b.get('electricity_amount', 0) 
                    for b in tenant_bills if b['status'] == 'pending')
    
    # Get last payment details
    last_paid_bill = next((b for b in tenant_bills if b['status'] == 'paid'), None)
    last_payment_date = last_paid_bill['payment_date'] if last_paid_bill else 'No payment made'
    
    # Calculate payment trend
    paid_on_time_count = len([b for b in tenant_bills[-6:] 
                            if b['status'] == 'paid' and 
                            datetime.fromisoformat(b.get('payment_date', '')).date() <= 
                            datetime.fromisoformat(b['due_date']).date()]) if last_paid_bill else 0
    
    payment_trend = 'Excellent' if paid_on_time_count >= 5 else \
                   'Good' if paid_on_time_count >= 3 else \
                   'Fair' if paid_on_time_count >= 1 else 'Poor'
    
    # Get last bill status
    last_bill = tenant_bills[0] if tenant_bills else None
    last_bill_status = last_bill['status'].title() if last_bill else 'N/A'
    
    return {
        'payment_status': f"{'Regular' if payment_trend in ['Excellent', 'Good'] else 'Irregular'} ({payment_trend} payment history)",
        'last_payment_status': 'Paid on time' if paid_on_time_count > 0 else 'Delayed payment',
        'last_payment_date': last_payment_date,
        'total_dues': total_dues,
        'total_bill_dues': sum(b.get('electricity_amount', 0) for b in tenant_bills if b['status'] == 'pending'),
        'last_bill_status': last_bill_status,
        'payment_trend': payment_trend
    }

@app.route('/api/reminders/send', methods=['POST'])
def send_reminders():
    try:
        tenants = load_data(TENANTS_FILE)
        buildings = load_data(BUILDINGS_FILE)
        current_date = datetime.now(timezone.utc)
        reminders_sent = []
        
        for tenant in tenants:
            if tenant['status'] != 'active':
                continue
                
            # Get building name
            building = next((b for b in buildings if b['id'] == tenant['building_id']), None)
            building_name = building['name'] if building else 'Unknown Building'
            
            # Calculate next rent due date
            rent_due_day = tenant['rent_due_day']
            next_due_date = get_next_due_date(current_date, rent_due_day)
            days_until_due = (next_due_date.date() - current_date.date()).days
            reminder_days = tenant.get('reminder_days', 5)
            reminder_method = tenant.get('reminder_method', 'notification')
            
            # Get payment history
            payment_info = get_payment_history(tenant['id'])
            
            # Get latest bill for electricity amount
            bills = load_data(BILLS_FILE)
            latest_bill = next((b for b in bills 
                              if b['tenant_id'] == tenant['id'] 
                              and b['status'] == 'pending'), None)
            
            # Prepare context for message formatting
            context = {
                'tenant_name': tenant['name'],
                'flat_no': tenant['flat_no'],
                'building_name': building_name,
                'amount': tenant['rent_amount'],
                'due_date': next_due_date.strftime('%Y-%m-%d'),
                'days_until_due': abs(days_until_due),
                'electricity_amount': latest_bill['electricity_amount'] if latest_bill else 0,
                **payment_info  # Include all payment history information
            }
            
            # Check if reminder should be sent
            should_send = False
            reminder_type = None
            
            if days_until_due < 0:
                should_send = True
                reminder_type = 'rent_overdue'
            elif days_until_due == 0:
                should_send = True
                reminder_type = 'rent_due'
            elif days_until_due <= reminder_days:
                should_send = True
                reminder_type = 'rent_reminder'
            
            if should_send:
                message = format_message(reminder_type, context)
                notification = {
                    'type': reminder_type,
                    'message': message,
                    'tenant_id': tenant['id'],
                    'flat_no': tenant['flat_no'],
                    'reminder_method': reminder_method,
                    'date': current_date.isoformat(),
                    'payment_info': payment_info  # Include payment info in notification
                }
                
                # Send SMS if configured
                if reminder_method in ['sms', 'both']:
                    sms_sent = send_sms(tenant['contact_no'], message)
                    notification['sms_sent'] = sms_sent
                
                # Save notification to history
                save_notification(notification)
                reminders_sent.append(notification)
        
        return jsonify({
            'message': f'Successfully sent {len(reminders_sent)} reminders',
            'reminders': reminders_sent
        })
    except Exception as e:
        print(f"Error sending reminders: {str(e)}")
        return jsonify({'error': 'Failed to send reminders'}), 500

def get_next_due_date(current_date, due_day):
    """Calculate the next due date based on current date and due day"""
    next_due_date = current_date.replace(day=due_day)
    
    # If we're past this month's due date, look at next month
    if current_date.day > due_day:
        if current_date.month == 12:
            next_due_date = next_due_date.replace(year=current_date.year + 1, month=1)
        else:
            next_due_date = next_due_date.replace(month=current_date.month + 1)
    
    return next_due_date

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    try:
        with open(USERS_FILE, 'r') as f:
            users_data = json.load(f)
            users = users_data.get('users', [])
    except FileNotFoundError:
        users = []
    
    # Find user
    user = next((u for u in users if u['username'] == username and u['password'] == password), None)
    
    if user:
        # Make session permanent
        session.permanent = True
        
        # Set session data
        session['user'] = {
            'username': user['username'],
            'role': user['role'],
            'tenant_id': user.get('tenant_id')
        }
        
        # Return success response with user role
        response = jsonify({
            'message': 'Login successful',
            'role': user['role'],
            'tenant_id': user.get('tenant_id')
        })
        
        # Set session cookie
        response.set_cookie(
            'session',
            session.get('session_id', ''),
            httponly=True,
            samesite='Lax',
            secure=False  # Set to True in production
        )
        
        return response
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout successful'})

@app.route('/api/auth/register', methods=['POST'])
@owner_required  # Only owners can create new users
def register_user():
    data = request.get_json()
    required_fields = ['username', 'password', 'role']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
        
    with open(USERS_FILE, 'r') as f:
        users_data = json.load(f)
    
    if any(u['username'] == data['username'] for u in users_data['users']):
        return jsonify({'error': 'Username already exists'}), 400
    
    new_user = {
        'username': data['username'],
        'password': data['password'],  # In production, this should be hashed
        'role': data['role']
    }
    
    if data['role'] == 'tenant':
        new_user['tenant_id'] = data['tenant_id']
    
    users_data['users'].append(new_user)
    
    with open(USERS_FILE, 'w') as f:
        json.dump(users_data, f, indent=2)
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/tenants/<int:tenant_id>/dashboard', methods=['GET'])
@login_required
def get_tenant_dashboard(tenant_id):
    # Check if user has access to this tenant's information
    if session['user']['role'] == 'tenant' and session['user'].get('tenant_id') != tenant_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    tenants = load_data(TENANTS_FILE)
    tenant = next((t for t in tenants if t['id'] == tenant_id), None)
    if not tenant:
        return jsonify({'error': 'Tenant not found'}), 404
    
    # Get bills
    bills = load_data(BILLS_FILE)
    tenant_bills = [b for b in bills if b['tenant_id'] == tenant_id]
    
    # Get payment history
    payment_info = get_payment_history(tenant_id)
    
    # Get notifications
    notifications = load_data(NOTIFICATION_HISTORY_FILE)
    tenant_notifications = [n for n in notifications if n.get('tenant_id') == tenant_id]
    
    dashboard_data = {
        'tenant': tenant,
        'recent_bills': sorted(tenant_bills, key=lambda x: x['created_at'], reverse=True)[:5],
        'payment_history': payment_info,
        'recent_notifications': sorted(tenant_notifications, key=lambda x: x['created_at'], reverse=True)[:5]
    }
    
    return jsonify(dashboard_data)

def load_data(file_path):
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_data(data, file_path):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

# Add route to serve PWA app files
@app.route('/pwa-app/<path:path>')
def serve_pwa(path):
    return send_from_directory('pwa-app', path)

@app.route('/pwa')
def pwa_index():
    return send_from_directory('pwa-app', 'index.html')

# Add direct route to login page
@app.route('/login')
def login_page():
    return send_from_directory('pwa-app', 'login.html')

# Add route to serve tenant portal files
@app.route('/tenant-portal/<path:path>')
def serve_tenant_portal(path):
    return send_from_directory('tenant-portal', path)

@app.route('/tenant-portal')
def tenant_portal_index():
    return send_from_directory('tenant-portal', 'index.html')

@app.route('/api/flats/<string:link_id>/settings', methods=['GET'])
def get_flat_settings(link_id):
    """Get settings for a specific flat"""
    try:
        # Find the flat with matching link_id
        flat_no = None
        for no, info in FLATS.items():
            if info['link_id'] == link_id:
                flat_no = no
                break
        
        if not flat_no:
            return jsonify({'error': 'Invalid flat link'}), 404
        
        # Load settings
        with open(FLAT_SETTINGS_FILE, 'r') as f:
            all_settings = json.load(f)
        
        # Get settings for this flat or create default
        if flat_no not in all_settings:
            default_settings = {
                'notifications': {
                    'rent': True,
                    'bills': True,
                    'maintenance': True,
                    'general': True
                },
                'notification_method': 'email',
                'payment': {
                    'auto_pay': False,
                    'method': 'bank_transfer',
                    'day': '5'
                },
                'privacy': {
                    'show_contact': False,
                    'show_email': False
                }
            }
            all_settings[flat_no] = default_settings
            with open(FLAT_SETTINGS_FILE, 'w') as f:
                json.dump(all_settings, f, indent=2)
        
        return jsonify(all_settings[flat_no])
    except Exception as e:
        print(f"Error getting flat settings: {str(e)}")
        return jsonify({'error': 'Failed to load settings'}), 500

@app.route('/api/flats/<string:link_id>/settings', methods=['POST'])
def update_flat_settings(link_id):
    """Update settings for a specific flat"""
    try:
        # Find the flat with matching link_id
        flat_no = None
        for no, info in FLATS.items():
            if info['link_id'] == link_id:
                flat_no = no
                break
        
        if not flat_no:
            return jsonify({'error': 'Invalid flat link'}), 404
        
        # Load settings
        with open(FLAT_SETTINGS_FILE, 'r') as f:
            all_settings = json.load(f)
        
        # Update settings
        settings = request.get_json()
        all_settings[flat_no] = settings
        
        # Save settings
        with open(FLAT_SETTINGS_FILE, 'w') as f:
            json.dump(all_settings, f, indent=2)
        
        return jsonify({'message': 'Settings updated successfully'})
    except Exception as e:
        print(f"Error updating flat settings: {str(e)}")
        return jsonify({'error': 'Failed to update settings'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
