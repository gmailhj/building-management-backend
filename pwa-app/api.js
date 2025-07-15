// API Base URL - dynamically determine based on current location
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : window.location.origin;

// Helper function for making API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (response.status === 204) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Authentication functions
async function login(username, password) {
    return apiRequest('/api/auth/login', 'POST', { username, password });
}

async function logout() {
    return apiRequest('/api/auth/logout', 'POST');
}

// Building functions
async function getBuildings() {
    return apiRequest('/api/buildings');
}

async function getBuildingDetails(buildingId) {
    return apiRequest(`/api/buildings/${buildingId}`);
}

async function getBuilding(buildingId) {
    return apiRequest(`/api/buildings/${buildingId}`);
}

async function addBuilding(buildingData) {
    return apiRequest('/api/buildings', 'POST', buildingData);
}

async function updateBuilding(buildingId, buildingData) {
    return apiRequest(`/api/buildings/${buildingId}`, 'PUT', buildingData);
}

async function deleteBuilding(buildingId) {
    return apiRequest(`/api/buildings/${buildingId}`, 'DELETE');
}

async function getBuildingFlats(buildingId) {
    return apiRequest(`/api/buildings/${buildingId}/flats`);
}

// Tenant functions
async function getTenants() {
    return apiRequest('/api/tenants');
}

async function getTenant(tenantId) {
    return apiRequest(`/api/tenants/${tenantId}`);
}

async function addTenant(tenantData) {
    return apiRequest('/api/tenants', 'POST', tenantData);
}

async function updateTenantDetails(tenantId, data) {
    return apiRequest(`/api/tenants/${tenantId}`, 'PUT', data);
}

async function deleteTenant(tenantId) {
    return apiRequest(`/api/tenants/${tenantId}`, 'DELETE');
}

// Bill functions
async function getBills(tenantId) {
    return apiRequest(`/api/bills?tenant_id=${tenantId}`);
}

// Get a specific bill by ID
async function getBill(billId) {
    console.log(`Getting bill with ID: ${billId}`);
    
    try {
        // Get all bills
        const bills = await getBills();
        
        // Find the bill with the specified ID
        const bill = bills.find(b => b.id === parseInt(billId));
        
        if (!bill) {
            console.warn(`Bill with ID ${billId} not found`);
            return null;
        }
        
        return bill;
    } catch (error) {
        console.error('Error getting bill:', error);
        throw new Error('Failed to get bill');
    }
}

async function addBill(data) {
    return apiRequest('/api/bills', 'POST', data);
}

async function updateBill(billId, data) {
    return apiRequest(`/api/bills/${billId}`, 'PUT', data);
}

// Delete a bill
async function deleteBill(billId) {
    console.log(`Deleting bill with ID: ${billId}`);
    
    try {
        // Get the current bills
        const bills = await getBills();
        
        // Filter out the bill to be deleted
        const updatedBills = bills.filter(bill => bill.id !== parseInt(billId));
        
        // Save the updated bills array
        await saveData('bills.json', updatedBills);
        
        return { success: true, message: 'Bill deleted successfully' };
    } catch (error) {
        console.error('Error deleting bill:', error);
        throw new Error('Failed to delete bill');
    }
}

// Maintenance request functions
async function getMaintenanceRequests(flatId = null) {
    const endpoint = flatId ? `/api/maintenance-requests?flat_id=${flatId}` : '/api/maintenance-requests';
    return apiRequest(endpoint);
}

async function getMaintenanceRequest(requestId) {
    return apiRequest(`/api/maintenance-requests/${requestId}`);
}

async function addMaintenanceRequest(requestData) {
    return apiRequest('/api/maintenance-requests', 'POST', requestData);
}

async function updateMaintenanceRequest(requestId, requestData) {
    return apiRequest(`/api/maintenance-requests/${requestId}`, 'PUT', requestData);
}

async function deleteMaintenanceRequest(requestId) {
    return apiRequest(`/api/maintenance-requests/${requestId}`, 'DELETE');
}

// Notification functions
async function getNotifications() {
    return apiRequest('/api/notifications');
}

// Message functions
async function getMessages(flatId = null) {
    const endpoint = flatId ? `/api/messages?flat_id=${flatId}` : '/api/messages';
    return apiRequest(endpoint);
}

async function sendMessage(messageData) {
    return apiRequest('/api/messages', 'POST', messageData);
}

// Flat functions
async function getFlat(flatId) {
    return apiRequest(`/api/flats/${flatId}`);
}

async function updateFlat(flatId, flatData) {
    return apiRequest(`/api/flats/${flatId}`, 'PUT', flatData);
}

// Document functions
async function getDocuments(flatId = null) {
    const endpoint = flatId ? `/api/documents?flat_id=${flatId}` : '/api/documents';
    return apiRequest(endpoint);
}

async function uploadDocument(documentData) {
    // For file uploads, we would typically use FormData instead of JSON
    // This is a simplified version - in a real app, you'd need to handle file uploads properly
    return apiRequest('/api/documents', 'POST', documentData);
}

// Settings functions
async function getSettings() {
    return apiRequest('/api/settings');
}

async function updateSettings(settingsData) {
    return apiRequest('/api/settings', 'PUT', settingsData);
}

// Additional API functions
async function getDashboardAnalytics() {
    return apiRequest('/api/analytics/dashboard');
}

async function getExpenses(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/api/expenses?${queryParams}` : '/api/expenses';
    return apiRequest(endpoint);
}

async function addExpense(data) {
    return apiRequest('/api/expenses', 'POST', data);
}

async function getMessageTemplates() {
    return apiRequest('/api/settings/templates');
}

async function updateMessageTemplates(data) {
    return apiRequest('/api/settings/templates', 'POST', data);
}

async function resetMessageTemplates() {
    return apiRequest('/api/settings/templates/reset', 'POST');
}

async function getSMSSettings() {
    return apiRequest('/api/settings/sms');
}

async function updateSMSSettings(data) {
    return apiRequest('/api/settings/sms', 'POST', data);
}

async function testSMS(data) {
    return apiRequest('/api/settings/sms/test', 'POST', data);
} 