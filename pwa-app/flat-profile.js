const API_URL = 'http://localhost:5000';
let flatId = null;
let buildingId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get flat_id from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const flatIdParam = urlParams.get('flat_id');
    
    if (flatIdParam) {
        const [bId, fId] = flatIdParam.split('_');
        buildingId = bId;
        flatId = fId;
        loadFlatInfo();
        loadCurrentTenant();
        loadBillsHistory();
        loadPreviousTenants();
        loadMaintenanceRequests();
    } else {
        showError('No flat ID provided');
    }
});

// Load flat information
async function loadFlatInfo() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${buildingId}_${flatId}`);
        if (!response.ok) throw new Error('Failed to load flat info');
        const flatInfo = await response.json();
        displayFlatInfo(flatInfo);
    } catch (error) {
        console.error('Error loading flat info:', error);
        showError('Failed to load flat information');
    }
}

// Display flat information
function displayFlatInfo(flatInfo) {
    const flatInfoDiv = document.getElementById('flatInfo');
    flatInfoDiv.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p><strong>Flat Number:</strong> ${flatId}</p>
                <p><strong>Type:</strong> ${flatInfo.type}</p>
                <p><strong>Rent Amount:</strong> ₹${flatInfo.rent_amount}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Status:</strong> <span class="badge bg-${flatInfo.status === 'vacant' ? 'success' : 'warning'}">${flatInfo.status}</span></p>
                <p><strong>Building:</strong> ${flatInfo.building_name}</p>
            </div>
        </div>
    `;
}

// Load current tenant information
async function loadCurrentTenant() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${buildingId}_${flatId}/current-tenant`);
        if (!response.ok) throw new Error('Failed to load tenant info');
        const tenantInfo = await response.json();
        displayCurrentTenant(tenantInfo);
    } catch (error) {
        console.error('Error loading current tenant:', error);
        showError('Failed to load current tenant information');
    }
}

// Display current tenant information
function displayCurrentTenant(tenantInfo) {
    const tenantInfoDiv = document.getElementById('currentTenant');
    if (!tenantInfoDiv) return;

    if (tenantInfo && Object.keys(tenantInfo).length > 0) {
        tenantInfoDiv.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Name:</strong> ${tenantInfo.name}</p>
                    <p><strong>Contact:</strong> ${tenantInfo.contact_no}</p>
                    <p><strong>Aadhar:</strong> ${tenantInfo.aadhar_no}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Move-in Date:</strong> ${new Date(tenantInfo.move_in_date).toLocaleDateString()}</p>
                    <p><strong>Rent Due Day:</strong> ${tenantInfo.rent_due_day}</p>
                    <p><strong>Rent Amount:</strong> ₹${tenantInfo.rent_amount}</p>
                </div>
            </div>
        `;
    } else {
        tenantInfoDiv.innerHTML = '<p class="text-muted">No current tenant</p>';
    }
}

// Load bills history
async function loadBillsHistory() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${buildingId}_${flatId}/bills`);
        if (!response.ok) throw new Error('Failed to load bills');
        const bills = await response.json();
        displayBillsHistory(bills);
    } catch (error) {
        console.error('Error loading bills history:', error);
        showError('Failed to load bills history');
    }
}

// Display bills history
function displayBillsHistory(bills) {
    const billsTableBody = document.getElementById('billsHistory');
    if (!billsTableBody) return;

    if (bills && bills.length > 0) {
        billsTableBody.innerHTML = bills.map(bill => `
            <tr>
                <td>${bill.month}/${bill.year}</td>
                <td>₹${bill.rent_amount}</td>
                <td>₹${bill.electricity_amount}</td>
                <td>₹${bill.total_amount}</td>
                <td>${new Date(bill.due_date).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-${bill.status === 'paid' ? 'success' : 'warning'}">
                        ${bill.status}
                    </span>
                </td>
            </tr>
        `).join('');
    } else {
        billsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No bills history available</td>
            </tr>
        `;
    }
}

// Load previous tenants
async function loadPreviousTenants() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${buildingId}_${flatId}/previous-tenants`);
        if (!response.ok) throw new Error('Failed to load previous tenants');
        const previousTenants = await response.json();
        displayPreviousTenants(previousTenants);
    } catch (error) {
        console.error('Error loading previous tenants:', error);
        showError('Failed to load previous tenants');
    }
}

// Display previous tenants
function displayPreviousTenants(previousTenants) {
    const tenantsTableBody = document.getElementById('previousTenants');
    if (!tenantsTableBody) return;

    if (previousTenants && previousTenants.length > 0) {
        tenantsTableBody.innerHTML = previousTenants.map(tenant => `
            <tr>
                <td>${tenant.name}</td>
                <td>${tenant.contact_no}</td>
                <td>${new Date(tenant.move_in_date).toLocaleDateString()}</td>
                <td>${new Date(tenant.move_out_date).toLocaleDateString()}</td>
                <td>₹${tenant.rent_amount}</td>
            </tr>
        `).join('');
    } else {
        tenantsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No previous tenants found</td>
            </tr>
        `;
    }
}

// Load maintenance requests
async function loadMaintenanceRequests() {
    try {
        const response = await fetch(`${API_URL}/api/maintenance-requests`);
        if (!response.ok) throw new Error('Failed to load maintenance requests');
        const requests = await response.json();
        
        // Filter requests for current flat
        const flatRequests = requests.filter(r => r.flat_id === `${buildingId}_${flatId}`);
        displayMaintenanceRequests(flatRequests);
    } catch (error) {
        console.error('Error loading maintenance requests:', error);
        showError('Failed to load maintenance requests');
    }
}

// Display maintenance requests
function displayMaintenanceRequests(requests) {
    const requestsTableBody = document.getElementById('maintenanceRequests');
    if (!requestsTableBody) return;

    if (requests && requests.length > 0) {
        requestsTableBody.innerHTML = requests.map(request => `
            <tr>
                <td>${request.title}</td>
                <td>${request.description}</td>
                <td>
                    <span class="badge bg-${getPriorityColor(request.priority)}">
                        ${request.priority}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${getStatusColor(request.status)}">
                        ${request.status}
                    </span>
                </td>
                <td>${new Date(request.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="openUpdateStatus(${request.id})">
                        Update Status
                    </button>
                </td>
            </tr>
        `).join('');
    } else {
        requestsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No maintenance requests found</td>
            </tr>
        `;
    }
}

// Submit new maintenance request
async function submitMaintenanceRequest() {
    try {
        const title = document.getElementById('requestTitle').value;
        const description = document.getElementById('requestDescription').value;
        const priority = document.getElementById('requestPriority').value;

        if (!title || !description || !priority) {
            showError('Please fill in all required fields');
            return;
        }

        const response = await fetch(`${API_URL}/api/maintenance-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                flat_id: `${buildingId}_${flatId}`,
                title,
                description,
                priority
            })
        });

        if (!response.ok) throw new Error('Failed to create maintenance request');

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('newMaintenanceRequestModal'));
        modal.hide();
        document.getElementById('maintenanceRequestForm').reset();

        // Reload maintenance requests
        await loadMaintenanceRequests();
        showSuccess('Maintenance request created successfully');
    } catch (error) {
        console.error('Error creating maintenance request:', error);
        showError('Failed to create maintenance request');
    }
}

// Open update status modal
function openUpdateStatus(requestId) {
    // Store request ID for update
    document.getElementById('updateStatusModal').dataset.requestId = requestId;
    const modal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
    modal.show();
}

// Update request status
async function updateRequestStatus() {
    try {
        const modal = document.getElementById('updateStatusModal');
        const requestId = modal.dataset.requestId;
        const status = document.getElementById('requestStatus').value;
        const notes = document.getElementById('requestNotes').value;

        const response = await fetch(`${API_URL}/api/maintenance-requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status,
                notes
            })
        });

        if (!response.ok) throw new Error('Failed to update maintenance request');

        // Close modal and reset form
        const modalInstance = bootstrap.Modal.getInstance(modal);
        modalInstance.hide();
        document.getElementById('updateStatusForm').reset();

        // Reload maintenance requests
        await loadMaintenanceRequests();
        showSuccess('Maintenance request updated successfully');
    } catch (error) {
        console.error('Error updating maintenance request:', error);
        showError('Failed to update maintenance request');
    }
}

// Helper functions for colors
function getPriorityColor(priority) {
    switch (priority) {
        case 'urgent': return 'danger';
        case 'high': return 'warning';
        case 'medium': return 'info';
        case 'low': return 'success';
        default: return 'secondary';
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'completed': return 'success';
        case 'in_progress': return 'info';
        case 'pending': return 'warning';
        case 'cancelled': return 'danger';
        default: return 'secondary';
    }
}

// Show success message
function showSuccess(message) {
    const toastContainer = document.querySelector('.toast-container');
    const toastHtml = `
        <div class="toast" role="alert">
            <div class="toast-body text-success">
                ${message}
            </div>
        </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toast = new bootstrap.Toast(toastContainer.lastElementChild);
    toast.show();
}

// Show error message
function showError(message) {
    const toastContainer = document.querySelector('.toast-container');
    const toastHtml = `
        <div class="toast" role="alert">
            <div class="toast-body text-danger">
                ${message}
            </div>
        </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toast = new bootstrap.Toast(toastContainer.lastElementChild);
    toast.show();
} 