import unittest
import json
import os
from datetime import datetime, timedelta, timezone
from app import app

class BuildingManagementTests(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()
        
        # Create test data files
        self.test_files = {
            'buildings.json': [],
            'tenants.json': [],
            'bills.json': [],
            'data/users.json': {'users': [
                {
                    'username': 'admin',
                    'password': 'admin123',
                    'role': 'owner'
                }
            ]},
            'data/message_templates.json': {},
            'data/maintenance_requests.json': []
        }
        
        for file_path, data in self.test_files.items():
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'w') as f:
                json.dump(data, f)
                
    def tearDown(self):
        # Clean up test files
        for file_path in self.test_files.keys():
            if os.path.exists(file_path):
                os.remove(file_path)

    def test_1_authentication(self):
        """Test authentication and user management"""
        # Test login with correct credentials
        response = self.client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'admin123'
        })
        self.assertEqual(response.status_code, 200)
        
        # Test login with incorrect credentials
        response = self.client.post('/api/auth/login', json={
            'username': 'wrong',
            'password': 'wrong'
        })
        self.assertEqual(response.status_code, 401)
        
        # Test user registration (requires owner login)
        with self.client.session_transaction() as session:
            session['user'] = {'role': 'owner'}
        
        response = self.client.post('/api/auth/register', json={
            'username': 'tenant1',
            'password': 'pass123',
            'role': 'tenant',
            'tenant_id': 1
        })
        self.assertEqual(response.status_code, 201)

    def test_2_building_management(self):
        """Test building CRUD operations"""
        with self.client.session_transaction() as session:
            session['user'] = {'role': 'owner'}
            
        # Create building
        building_data = {
            'name': 'Test Building',
            'address': '123 Test St',
            'flats': {
                '101': {'type': '1BHK', 'rent_amount': 10000, 'status': 'vacant'}
            }
        }
        response = self.client.post('/api/buildings', json=building_data)
        self.assertEqual(response.status_code, 201)
        building_id = response.json['id']
        
        # Get building
        response = self.client.get(f'/api/buildings/{building_id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['name'], 'Test Building')
        
        # Update building
        response = self.client.put(f'/api/buildings/{building_id}', json={
            'name': 'Updated Building'
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['name'], 'Updated Building')
        
        # Delete building
        response = self.client.delete(f'/api/buildings/{building_id}')
        self.assertEqual(response.status_code, 204)

    def test_3_tenant_management(self):
        """Test tenant management features"""
        with self.client.session_transaction() as session:
            session['user'] = {'role': 'owner'}
            
        # Create tenant
        tenant_data = {
            'building_id': 1,
            'flat_no': '101',
            'name': 'John Doe',
            'contact_no': '1234567890',
            'aadhar_no': '123456789012',
            'rent_amount': 10000,
            'move_in_date': datetime.now(timezone.utc).isoformat()
        }
        response = self.client.post('/api/tenants', json=tenant_data)
        self.assertEqual(response.status_code, 201)
        tenant_id = response.json['id']
        
        # Get tenant details
        response = self.client.get(f'/api/tenants/{tenant_id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['name'], 'John Doe')
        
        # Update tenant
        response = self.client.put(f'/api/tenants/{tenant_id}', json={
            'name': 'John Smith',
            'rent_amount': 11000
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['name'], 'John Smith')

    def test_4_bill_management(self):
        """Test bill generation and management"""
        with self.client.session_transaction() as session:
            session['user'] = {'role': 'owner'}
            
        # Create bill
        bill_data = {
            'tenant_id': 1,
            'month': 7,
            'year': 2024,
            'rent_amount': 10000,
            'electricity_amount': 1000,
            'maid_charges': 500,
            'due_date': (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        }
        response = self.client.post('/api/bills', json=bill_data)
        self.assertEqual(response.status_code, 201)
        bill_id = response.json['id']
        
        # Get bill
        response = self.client.get(f'/api/bills?tenant_id=1')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.json) > 0)
        
        # Mark bill as paid
        response = self.client.put(f'/api/bills/{bill_id}', json={
            'status': 'paid',
            'payment_date': datetime.now(timezone.utc).isoformat()
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'paid')

    def test_5_maintenance_requests(self):
        """Test maintenance request features"""
        with self.client.session_transaction() as session:
            session['user'] = {'role': 'owner'}
            
        # Create maintenance request
        request_data = {
            'flat_id': '1_101',
            'title': 'Plumbing Issue',
            'description': 'Water leakage in bathroom',
            'priority': 'high'
        }
        response = self.client.post('/api/maintenance-requests', json=request_data)
        self.assertEqual(response.status_code, 201)
        request_id = response.json['id']
        
        # Get maintenance requests
        response = self.client.get('/api/maintenance-requests')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.json) > 0)
        
        # Update maintenance request
        response = self.client.put(f'/api/maintenance-requests/{request_id}', json={
            'status': 'completed',
            'notes': 'Fixed the leakage'
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json['status'], 'completed')

    def test_6_notifications_and_reminders(self):
        """Test notification and reminder system"""
        with self.client.session_transaction() as session:
            session['user'] = {'role': 'owner'}
            
        # Create tenant with upcoming due date
        tenant_data = {
            'building_id': 1,
            'flat_no': '101',
            'name': 'John Doe',
            'contact_no': '1234567890',
            'rent_amount': 10000,
            'rent_due_day': datetime.now(timezone.utc).day + 1,
            'reminder_days': 5,
            'reminder_method': 'notification'
        }
        self.client.post('/api/tenants', json=tenant_data)
        
        # Test reminder generation
        response = self.client.post('/api/reminders/send')
        self.assertEqual(response.status_code, 200)
        
        # Get notifications
        response = self.client.get('/api/notifications')
        self.assertEqual(response.status_code, 200)

    def test_7_analytics_and_reports(self):
        """Test analytics and reporting features"""
        with self.client.session_transaction() as session:
            session['user'] = {'role': 'owner'}
            
        # Get dashboard analytics
        response = self.client.get('/api/analytics/dashboard')
        self.assertEqual(response.status_code, 200)
        self.assertTrue('occupancy_rate' in response.json)
        self.assertTrue('revenue' in response.json)
        self.assertTrue('expenses' in response.json)
        self.assertTrue('maintenance' in response.json)
        self.assertTrue('tenant_statistics' in response.json)

    def test_8_message_templates(self):
        """Test message template management"""
        with self.client.session_transaction() as session:
            session['user'] = {'role': 'owner'}
            
        # Get default templates
        response = self.client.get('/api/settings/templates')
        self.assertEqual(response.status_code, 200)
        
        # Update templates
        templates = {
            'rent_due': 'Custom rent due template for {tenant_name}',
            'rent_reminder': 'Custom reminder for {tenant_name}'
        }
        response = self.client.post('/api/settings/templates', json=templates)
        self.assertEqual(response.status_code, 200)
        
        # Reset templates
        response = self.client.post('/api/settings/templates/reset')
        self.assertEqual(response.status_code, 200)

    def test_9_tenant_access_restrictions(self):
        """Test tenant access restrictions"""
        # Login as tenant
        with self.client.session_transaction() as session:
            session['user'] = {'role': 'tenant', 'tenant_id': 1}
            
        # Try to access other tenant's data (should fail)
        response = self.client.get('/api/tenants/2')
        self.assertEqual(response.status_code, 401)
        
        # Access own data (should succeed)
        response = self.client.get('/api/tenants/1')
        self.assertEqual(response.status_code, 200)
        
        # Try to create building (should fail)
        response = self.client.post('/api/buildings', json={
            'name': 'Test Building',
            'address': '123 Test St'
        })
        self.assertEqual(response.status_code, 401)

if __name__ == '__main__':
    unittest.main() 