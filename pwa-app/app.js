const API_URL = 'http://localhost:5000';
let currentBuildingId = null;
let currentTenantId = null;
let currentBillId = null;

// Initialize Bootstrap components
let buildingModal = null;
let tenantModal = null;
let billModal = null;

// Wait for DOM and Bootstrap to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap modals
    const buildingModalEl = document.getElementById('buildingModal');
    const tenantModalEl = document.getElementById('tenantModal');
    const billModalEl = document.getElementById('billModal');
    
    if (buildingModalEl) buildingModal = new bootstrap.Modal(buildingModalEl);
    if (tenantModalEl) tenantModal = new bootstrap.Modal(tenantModalEl);
    if (billModalEl) billModal = new bootstrap.Modal(billModalEl);
    
    // Initial load
    loadBuildings();
    loadTenants();
    loadBills();
    
    // Check notifications every 5 minutes
    setInterval(checkNotifications, 5 * 60 * 1000);
    checkNotifications();
});

// Load buildings from the API
async function loadBuildings(searchTerm = '') {
    try {
        const url = searchTerm 
            ? `${API_URL}/api/buildings?search=${encodeURIComponent(searchTerm)}`
            : `${API_URL}/api/buildings`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buildings = await response.json();
        displayBuildings(buildings);
        updateBuildingSelects(buildings);
    } catch (error) {
        console.error('Error loading buildings:', error);
        showError('Failed to load buildings. Please try again.');
    }
}

// Load tenants from the API
async function loadTenants(buildingId = null) {
    try {
        let url = `${API_URL}/api/tenants`;
        if (buildingId) {
            url += `?building_id=${buildingId}`;
        }
        const response = await fetch(url);
        const tenants = await response.json();
        displayTenants(tenants);
        updateTenantSelects(tenants);
    } catch (error) {
        console.error('Error loading tenants:', error);
        showError('Failed to load tenants. Please try again.');
    }
}

// Load bills from the API
async function loadBills(tenantId = null) {
    try {
        let url = `${API_URL}/api/bills`;
        if (tenantId) {
            url += `?tenant_id=${tenantId}`;
        }
        const response = await fetch(url);
        const bills = await response.json();
        displayBills(bills);
    } catch (error) {
        console.error('Error loading bills:', error);
        showError('Failed to load bills. Please try again.');
    }
}

// Load flats for a building
async function loadFlats(buildingId) {
    try {
        const response = await fetch(`${API_URL}/api/buildings/${buildingId}/flats`);
        const flats = await response.json();
        return flats;
    } catch (error) {
        console.error('Error loading flats:', error);
        return {};
    }
}

// Display buildings in the list
function displayBuildings(buildings) {
    const buildingsList = document.getElementById('buildingsList');
    if (!buildingsList) {
        console.error('Buildings list element not found');
        return;
    }
    
    if (!Array.isArray(buildings) || buildings.length === 0) {
        buildingsList.innerHTML = '<div class="list-group-item">No buildings found</div>';
        return;
    }
    
    buildingsList.innerHTML = buildings.map(building => `
        <div class="list-group-item building-item" data-id="${building.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h5 class="mb-1">${building.name}</h5>
                    <p class="mb-1">${building.address}</p>
                    <small class="text-muted">Added: ${new Date(building.created_at).toLocaleDateString()}</small>
                    ${building.flats ? `
                        <div class="mt-3">
                            <strong>Flats:</strong>
                            <div class="row g-3 mt-2">
                                ${Object.entries(building.flats).map(([flatNo, flat]) => `
                                    <div class="col-md-4 col-sm-6">
                                        <div class="flat-card p-3 border rounded h-100 position-relative">
                                            <h6 class="mb-2">Flat ${flatNo}</h6>
                                            <div class="mb-2">${flat.type}</div>
                                            <div class="mb-2">₹${flat.rent_amount}</div>
                                            <span class="badge bg-${flat.status === 'vacant' ? 'success' : 'warning'} position-absolute top-0 end-0 m-2">
                                                ${flat.status}
                                            </span>
                                            <div class="mt-2">
                                                <a href="flat-profile.html?flat_id=${building.id}_${flatNo}" 
                                                   class="btn btn-sm btn-primary w-100">
                                                   View History
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div>
                    <span class="badge bg-${getStatusBadgeColor(building.status)}">${building.status}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Add click listeners to building items
    document.querySelectorAll('.building-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Only open building details if not clicking a flat card
            if (!e.target.closest('.flat-card')) {
                openBuildingDetails(item.dataset.id);
            }
        });
    });
}

// Display tenants in the list
function displayTenants(tenants) {
    const tenantsList = document.getElementById('tenantsList');
    tenantsList.innerHTML = tenants.map(tenant => `
        <div class="list-group-item tenant-item" data-id="${tenant.id}">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-1">${tenant.name}</h5>
                    <p class="mb-1">Flat ${tenant.flat_no}</p>
                    <small class="text-muted">Contact: ${tenant.contact_no}</small>
                    <br>
                    <small class="text-muted">
                        Rent Due: ${tenant.rent_due_day}th | 
                        Reminder: ${tenant.reminder_days || 5} days before |
                        Method: ${tenant.reminder_method || 'notification'}
                    </small>
                </div>
                <div class="text-end">
                    <div class="mb-1">₹${tenant.rent_amount}/month</div>
                    <span class="badge bg-${tenant.status === 'active' ? 'success' : 'danger'}">${tenant.status}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Add click listeners to tenant items
    document.querySelectorAll('.tenant-item').forEach(item => {
        item.addEventListener('click', () => openTenantDetails(item.dataset.id));
    });
}

// Display bills in the list
function displayBills(bills) {
    const billsList = document.getElementById('billsList');
    billsList.innerHTML = bills.map(bill => `
        <div class="list-group-item bill-item" data-id="${bill.id}">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-1">${bill.month}/${bill.year}</h5>
                    <p class="mb-1">
                        Electricity: ₹${bill.electricity_amount}<br>
                        Rent: ₹${bill.rent_amount}
                    </p>
                    <small class="text-muted">Due: ${new Date(bill.due_date).toLocaleDateString()}</small>
                </div>
                <div>
                    <span class="badge bg-${getBillStatusColor(bill.status)}">${bill.status}</span>
                </div>
            </div>
        </div>
    `).join('');

    // Add click listeners to bill items
    document.querySelectorAll('.bill-item').forEach(item => {
        item.addEventListener('click', () => openBillDetails(item.dataset.id));
    });
}

// Update building select dropdowns
function updateBuildingSelects(buildings) {
    const buildingSelects = document.querySelectorAll('#tenantBuilding');
    if (!Array.isArray(buildings) || buildings.length === 0) {
        buildingSelects.forEach(select => {
            select.innerHTML = '<option value="">No buildings available</option>';
        });
        return;
    }
    
    const options = buildings.map(building => 
        `<option value="${building.id}">${building.name} - ${building.address}</option>`
    ).join('');
    
    buildingSelects.forEach(select => {
        select.innerHTML = '<option value="">Select Building</option>' + options;
    });
}

// Update tenant select dropdowns
function updateTenantSelects(tenants) {
    const tenantSelects = document.querySelectorAll('#billTenant');
    const options = tenants.map(tenant => 
        `<option value="${tenant.id}">${tenant.name} - Flat ${tenant.flat_no}</option>`
    ).join('');
    
    tenantSelects.forEach(select => {
        select.innerHTML = '<option value="">Select Tenant</option>' + options;
    });
}

// Update building selects in tenant form
function updateBuildingSelects(buildings) {
    const tenantBuildingSelect = document.getElementById('tenantBuilding');
    if (tenantBuildingSelect) {
        tenantBuildingSelect.innerHTML = `
            <option value="">Select Building</option>
            ${buildings.map(building => `
                <option value="${building.id}">${building.name}</option>
            `).join('')}
        `;
        
        // Add change listener to update flat options
        tenantBuildingSelect.addEventListener('change', (e) => {
            const selectedBuilding = buildings.find(b => b.id === parseInt(e.target.value));
            updateFlatOptions(selectedBuilding);
        });
    }
}

// Update flat options based on selected building
function updateFlatOptions(building) {
    const tenantFlatSelect = document.getElementById('tenantFlat');
    if (tenantFlatSelect) {
        if (building && building.flats) {
            tenantFlatSelect.innerHTML = `
                <option value="">Select Flat</option>
                ${Object.entries(building.flats)
                    .filter(([_, flat]) => flat.status === 'vacant')
                    .map(([flatNo, flat]) => `
                        <option value="${flatNo}">
                            Flat ${flatNo} - ${flat.type} - ₹${flat.rent_amount}
                        </option>
                    `).join('')}
            `;
            tenantFlatSelect.disabled = false;
        } else {
            tenantFlatSelect.innerHTML = '<option value="">Select Building First</option>';
            tenantFlatSelect.disabled = true;
        }
    }
}

// Handle form submission for new building
document.getElementById('buildingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('buildingName').value;
    const address = document.getElementById('buildingAddress').value;
    const status = document.getElementById('buildingStatus').value;
    
    const data = { name, address, status };
    
    try {
        const response = await fetch(`${API_URL}/api/buildings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (response.ok) {
            const result = await response.json();
            document.getElementById('buildingForm').reset();
            await loadBuildings();
            showToast('Building added successfully');
        } else {
            const errorData = await response.json();
            if (response.status === 409) {
                showError('Only one building is allowed in the system. Please update the existing building instead.');
            } else {
                showError(errorData.error || 'Failed to add building. Please try again.');
            }
        }
    } catch (error) {
        console.error('Error adding building:', error);
        showError('Failed to add building. Please check your connection.');
    }
});

// Handle form submission for new tenant
document.getElementById('tenantForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        building_id: parseInt(document.getElementById('tenantBuilding').value),
        flat_no: document.getElementById('tenantFlat').value,
        name: document.getElementById('tenantName').value,
        contact_no: document.getElementById('tenantContact').value,
        aadhar_no: document.getElementById('tenantAadhar').value,
        rent_amount: parseFloat(document.getElementById('tenantRent').value),
        rent_due_day: parseInt(document.getElementById('tenantDueDay').value),
        reminder_days: parseInt(document.getElementById('tenantReminderDays').value),
        reminder_method: document.getElementById('tenantReminderMethod').value,
        move_in_date: document.getElementById('tenantMoveIn').value
    };
    
    try {
        const response = await fetch(`${API_URL}/api/tenants`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (response.ok) {
            document.getElementById('tenantForm').reset();
            loadTenants();
            showToast('Tenant added successfully');
        } else {
            showError('Failed to add tenant. Please try again.');
        }
    } catch (error) {
        console.error('Error adding tenant:', error);
        showError('Failed to add tenant. Please check your connection.');
    }
});

// Handle form submission for new bill
document.getElementById('billForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const monthYear = document.getElementById('billMonth').value.split('-');
    const reading = parseFloat(document.getElementById('billReading').value);
    const rate = parseFloat(document.getElementById('billRate').value);
    
    const data = {
        tenant_id: parseInt(document.getElementById('billTenant').value),
        month: monthYear[1],
        year: monthYear[0],
        electricity_reading: reading,
        electricity_amount: reading * rate,
        rent_amount: 0, // Will be filled from tenant data
        due_date: document.getElementById('billDueDate').value
    };
    
    try {
        // Get tenant's rent amount
        const tenantResponse = await fetch(`${API_URL}/api/tenants`);
        const tenants = await tenantResponse.json();
        const tenant = tenants.find(t => t.id === data.tenant_id);
        if (tenant) {
            data.rent_amount = tenant.rent_amount;
        }
        
        const response = await fetch(`${API_URL}/api/bills`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (response.ok) {
            document.getElementById('billForm').reset();
            loadBills();
            showToast('Bill generated successfully');
        } else {
            showError('Failed to generate bill. Please try again.');
        }
    } catch (error) {
        console.error('Error generating bill:', error);
        showError('Failed to generate bill. Please check your connection.');
    }
});

// Mark bill as paid
async function markBillAsPaid(billId) {
    try {
        const response = await fetch(`${API_URL}/api/bills/${billId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'paid',
                payment_date: new Date().toISOString()
            }),
        });
        
        if (response.ok) {
            loadBills();
            billModal.hide();
            showToast('Bill marked as paid');
        } else {
            showError('Failed to update bill status.');
        }
    } catch (error) {
        console.error('Error updating bill:', error);
        showError('Failed to update bill. Please check your connection.');
    }
}

// Show toast notification
function showToast(message) {
    const toastContainer = document.querySelector('.toast-container');
    const toastHtml = `
        <div class="toast" role="alert">
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toast = new bootstrap.Toast(toastContainer.lastElementChild);
    toast.show();
}

// Get status badge color
function getStatusBadgeColor(status) {
    switch (status) {
        case 'active': return 'success';
        case 'maintenance': return 'warning';
        case 'inactive': return 'danger';
        default: return 'secondary';
    }
}

// Get bill status color
function getBillStatusColor(status) {
    switch (status) {
        case 'paid': return 'success';
        case 'pending': return 'warning';
        case 'overdue': return 'danger';
        default: return 'secondary';
    }
}

// Show error message
function showError(message) {
    alert(message);
}

// Check for notifications
async function checkNotifications() {
    try {
        const response = await fetch(`${API_URL}/api/notifications`);
        if (!response.ok) throw new Error('Failed to load notifications');
        const notifications = await response.json();
        
        // Clear existing notifications
        const container = document.querySelector('.toast-container');
        container.innerHTML = '';
        
        // Display new notifications
        notifications.forEach(notification => {
            const bgColor = getNotificationColor(notification.type);
            const icon = getNotificationIcon(notification.type);
            
            const toastHtml = `
                <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header bg-${bgColor} text-white">
                        <i class="fas ${icon} me-2"></i>
                        <strong class="me-auto">${getNotificationTitle(notification.type)}</strong>
                        <small>${formatDate(notification.date)}</small>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                    </div>
                    <div class="toast-body">
                        ${notification.message}
                        ${notification.type.includes('rent') ? `
                            <div class="mt-2">
                                <button class="btn btn-sm btn-primary generate-bill-btn" 
                                    data-tenant-id="${notification.tenant_id}"
                                    data-flat-no="${notification.flat_no}">
                                    Generate Bill
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', toastHtml);
            const toast = new bootstrap.Toast(container.lastElementChild, {
                autohide: false
            });
            toast.show();
        });
        
        // Add event listeners for generate bill buttons
        document.querySelectorAll('.generate-bill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tenantId = btn.dataset.tenantId;
                const flatNo = btn.dataset.flatNo;
                openBillForm(tenantId, flatNo);
            });
        });
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

function getNotificationColor(type) {
    switch (type) {
        case 'bill_overdue':
        case 'rent_overdue':
            return 'danger';
        case 'bill_due_soon':
        case 'rent_reminder':
            return 'warning';
        case 'rent_due':
            return 'primary';
        default:
            return 'secondary';
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case 'bill_overdue':
        case 'bill_due_soon':
            return 'fa-file-invoice-dollar';
        case 'rent_overdue':
        case 'rent_due':
        case 'rent_reminder':
            return 'fa-money-bill-wave';
        default:
            return 'fa-bell';
    }
}

function getNotificationTitle(type) {
    switch (type) {
        case 'bill_overdue':
            return 'Bill Overdue';
        case 'bill_due_soon':
            return 'Bill Due Soon';
        case 'rent_overdue':
            return 'Rent Overdue';
        case 'rent_due':
            return 'Rent Due Today';
        case 'rent_reminder':
            return 'Rent Reminder';
        default:
            return 'Notification';
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function openBillForm(tenantId, flatNo) {
    // Set the tenant in the bill form
    const tenantSelect = document.getElementById('billTenant');
    if (tenantSelect) {
        tenantSelect.value = tenantId;
        
        // Set current month and year
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        document.getElementById('billMonth').value = `${year}-${month}`;
        
        // Set due date to tenant's rent due day
        const dueDate = new Date(today.getFullYear(), today.getMonth(), tenantSelect.selectedOptions[0].dataset.rentDueDay);
        document.getElementById('billDueDate').value = dueDate.toISOString().split('T')[0];
        
        // Switch to bills tab
        const billsTab = document.querySelector('[href="#billsTab"]');
        const tab = new bootstrap.Tab(billsTab);
        tab.show();
        
        // Scroll to bill form
        document.getElementById('billForm').scrollIntoView({ behavior: 'smooth' });
    }
}

// Open building details modal
async function openBuildingDetails(buildingId) {
    try {
        const response = await fetch(`${API_URL}/api/buildings`);
        const buildings = await response.json();
        const building = buildings.find(b => b.id === parseInt(buildingId));
        
        if (building) {
            currentBuildingId = building.id;
            document.getElementById('editBuildingName').value = building.name;
            document.getElementById('editBuildingAddress').value = building.address;
            document.getElementById('editBuildingStatus').value = building.status;
            buildingModal.show();
        }
    } catch (error) {
        console.error('Error loading building details:', error);
        showError('Failed to load building details.');
    }
}

// Handle building deletion
document.getElementById('deleteBuilding').addEventListener('click', async () => {
    if (!currentBuildingId) return;
    
    if (confirm('Are you sure you want to delete this building?')) {
        try {
            const response = await fetch(`${API_URL}/api/buildings/${currentBuildingId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                buildingModal.hide();
                loadBuildings();
            } else {
                showError('Failed to delete building.');
            }
        } catch (error) {
            console.error('Error deleting building:', error);
            showError('Failed to delete building. Please check your connection.');
        }
    }
});

// Handle building updates
document.getElementById('saveBuilding').addEventListener('click', async () => {
    if (!currentBuildingId) return;
    
    const name = document.getElementById('editBuildingName').value;
    const address = document.getElementById('editBuildingAddress').value;
    const status = document.getElementById('editBuildingStatus').value;
    
    try {
        const response = await fetch(`${API_URL}/api/buildings/${currentBuildingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, address, status }),
        });
        
        if (response.ok) {
            buildingModal.hide();
            loadBuildings();
        } else {
            showError('Failed to update building.');
        }
    } catch (error) {
        console.error('Error updating building:', error);
        showError('Failed to update building. Please check your connection.');
    }
});

// Open tenant details modal
async function openTenantDetails(tenantId) {
    try {
        const response = await fetch(`${API_URL}/api/tenants/${tenantId}`);
        const tenant = await response.json();
        
        if (tenant) {
            currentTenantId = tenant.id;
            const modalBody = document.querySelector('#tenantModal .modal-body');
            modalBody.innerHTML = `
                <form id="editTenantForm">
                    <div class="mb-3">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-control" id="editTenantName" value="${tenant.name}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Contact Number</label>
                        <input type="tel" class="form-control" id="editTenantContact" value="${tenant.contact_no}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Rent Amount</label>
                        <input type="number" class="form-control" id="editTenantRent" value="${tenant.rent_amount}" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Rent Due Day</label>
                        <input type="number" class="form-control" id="editTenantDueDay" value="${tenant.rent_due_day}" min="1" max="31" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Reminder Days Before Due</label>
                        <input type="number" class="form-control" id="editTenantReminderDays" value="${tenant.reminder_days || 5}" min="1" max="15" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Reminder Method</label>
                        <select class="form-control" id="editTenantReminderMethod">
                            <option value="notification" ${(tenant.reminder_method || 'notification') === 'notification' ? 'selected' : ''}>In-App Notification</option>
                            <option value="sms" ${(tenant.reminder_method || 'notification') === 'sms' ? 'selected' : ''}>SMS</option>
                            <option value="both" ${(tenant.reminder_method || 'notification') === 'both' ? 'selected' : ''}>Both</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Status</label>
                        <select class="form-control" id="editTenantStatus">
                            <option value="active" ${tenant.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="inactive" ${tenant.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </form>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="updateTenant()">Save Changes</button>
                    <button class="btn btn-danger" onclick="deleteTenant()">Delete Tenant</button>
                </div>
            `;
            tenantModal.show();
        }
    } catch (error) {
        console.error('Error loading tenant details:', error);
        showError('Failed to load tenant details.');
    }
}

// Update tenant details
async function updateTenant() {
    if (!currentTenantId) return;
    
    const data = {
        name: document.getElementById('editTenantName').value,
        contact_no: document.getElementById('editTenantContact').value,
        rent_amount: parseFloat(document.getElementById('editTenantRent').value),
        rent_due_day: parseInt(document.getElementById('editTenantDueDay').value),
        reminder_days: parseInt(document.getElementById('editTenantReminderDays').value),
        reminder_method: document.getElementById('editTenantReminderMethod').value,
        status: document.getElementById('editTenantStatus').value
    };
    
    try {
        const response = await fetch(`${API_URL}/api/tenants/${currentTenantId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (response.ok) {
            tenantModal.hide();
            loadTenants();
            showToast('Tenant updated successfully');
        } else {
            showError('Failed to update tenant.');
        }
    } catch (error) {
        console.error('Error updating tenant:', error);
        showError('Failed to update tenant. Please check your connection.');
    }
}

// Handle tenant deletion
document.getElementById('deleteTenant').addEventListener('click', async () => {
    if (!currentTenantId) return;
    
    if (confirm('Are you sure you want to delete this tenant?')) {
        try {
            const response = await fetch(`${API_URL}/api/tenants/${currentTenantId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                tenantModal.hide();
                loadTenants();
            } else {
                showError('Failed to delete tenant.');
            }
        } catch (error) {
            console.error('Error deleting tenant:', error);
            showError('Failed to delete tenant. Please check your connection.');
        }
    }
});

// Open bill details modal
async function openBillDetails(billId) {
    try {
        const response = await fetch(`${API_URL}/api/bills`);
        const bills = await response.json();
        const bill = bills.find(b => b.id === parseInt(billId));
        
        if (bill) {
            currentBillId = bill.id;
            document.getElementById('editBillMonth').value = `${bill.year}-${bill.month}`;
            document.getElementById('editBillReading').value = bill.electricity_reading;
            document.getElementById('editBillRate').value = bill.electricity_amount / bill.electricity_reading;
            document.getElementById('editBillDueDate').value = bill.due_date;
            billModal.show();
        }
    } catch (error) {
        console.error('Error loading bill details:', error);
        showError('Failed to load bill details.');
    }
}

// Handle bill deletion
document.getElementById('deleteBill').addEventListener('click', async () => {
    if (!currentBillId) return;
    
    if (confirm('Are you sure you want to delete this bill?')) {
        try {
            const response = await fetch(`${API_URL}/api/bills/${currentBillId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                billModal.hide();
                loadBills();
            } else {
                showError('Failed to delete bill.');
            }
        } catch (error) {
            console.error('Error deleting bill:', error);
            showError('Failed to delete bill. Please check your connection.');
        }
    }
});

// Handle bill updates
document.getElementById('saveBill').addEventListener('click', async () => {
    if (!currentBillId) return;
    
    const monthYear = document.getElementById('editBillMonth').value.split('-');
    const reading = parseFloat(document.getElementById('editBillReading').value);
    const rate = parseFloat(document.getElementById('editBillRate').value);
    
    const data = {
        month: monthYear[1],
        year: monthYear[0],
        electricity_reading: reading,
        electricity_amount: reading * rate,
        rent_amount: 0, // Will be filled from tenant data
        due_date: document.getElementById('editBillDueDate').value
    };
    
    try {
        // Get tenant's rent amount
        const tenantResponse = await fetch(`${API_URL}/api/tenants`);
        const tenants = await tenantResponse.json();
        const tenant = tenants.find(t => t.id === data.tenant_id);
        if (tenant) {
            data.rent_amount = tenant.rent_amount;
        }
        
        const response = await fetch(`${API_URL}/api/bills/${currentBillId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (response.ok) {
            billModal.hide();
            loadBills();
        } else {
            showError('Failed to update bill.');
        }
    } catch (error) {
        console.error('Error updating bill:', error);
        showError('Failed to update bill. Please check your connection.');
    }
});

function displayFlats(flats) {
    const flatsContainer = document.getElementById('flatsContainer');
    flatsContainer.innerHTML = '';
    const template = document.getElementById('flatTemplate');

    Object.entries(flats).forEach(([flatNo, flatInfo]) => {
        const flatElement = template.content.cloneNode(true);
        
        // Set flat details
        flatElement.querySelector('.flat-number').textContent = flatNo;
        flatElement.querySelector('.flat-type').textContent = flatInfo.type;
        flatElement.querySelector('.flat-rent').textContent = flatInfo.rent_amount;
        flatElement.querySelector('.flat-status').textContent = flatInfo.status;
        
        // Set up profile link
        const profileLink = flatElement.querySelector('.view-profile');
        profileLink.href = `/tenant-portal/flat-profile.html?flat_id=${flatInfo.link_id}`;
        
        // Set up bill generation link
        const billLink = flatElement.querySelector('.generate-bill');
        billLink.href = `/tenant-portal/flat-bill.html?flat_id=${flatInfo.link_id}`;
        
        flatsContainer.appendChild(flatElement);
    });
} 