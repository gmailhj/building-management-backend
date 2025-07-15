const API_URL = 'http://localhost:5000';
let flatLinkId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get flat link ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    flatLinkId = urlParams.get('flat_id');

    if (flatLinkId) {
        loadFlatInfo();
        loadBillsHistory();
    } else {
        showError('No flat ID provided');
    }
});

// Load flat information
async function loadFlatInfo() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${flatLinkId}/info`);
        const flatInfo = await response.json();
        displayFlatInfo(flatInfo);
        
        if (flatInfo.tenant_id) {
            loadTenantInfo(flatInfo.tenant_id);
        }
    } catch (error) {
        console.error('Error loading flat info:', error);
        showError('Failed to load flat information');
    }
}

// Display flat information
function displayFlatInfo(flatInfo) {
    const flatInfoTableBody = document.getElementById('flatInfoTableBody');
    flatInfoTableBody.innerHTML = `
        <tr>
            <td>Flat Number</td>
            <td>${flatInfo.flat_no}</td>
        </tr>
        <tr>
            <td>Type</td>
            <td>${flatInfo.type}</td>
        </tr>
        <tr>
            <td>Rent Amount</td>
            <td>₹${flatInfo.rent_amount}</td>
        </tr>
        <tr>
            <td>Building</td>
            <td>${flatInfo.building_name || 'Not assigned'}</td>
        </tr>
        <tr>
            <td>Status</td>
            <td><span class="badge bg-${flatInfo.status === 'occupied' ? 'success' : 'secondary'}">${flatInfo.status}</span></td>
        </tr>
    `;
}

// Load tenant information
async function loadTenantInfo(tenantId) {
    try {
        const response = await fetch(`${API_URL}/api/tenants/${tenantId}`);
        const tenantInfo = await response.json();
        displayTenantInfo(tenantInfo);
    } catch (error) {
        console.error('Error loading tenant info:', error);
        showError('Failed to load tenant information');
    }
}

// Display tenant information
function displayTenantInfo(tenantInfo) {
    const tenantInfoTableBody = document.getElementById('tenantInfoTableBody');
    if (tenantInfo) {
        tenantInfoTableBody.innerHTML = `
            <tr>
                <td>Name</td>
                <td>${tenantInfo.name}</td>
            </tr>
            <tr>
                <td>Contact</td>
                <td>${tenantInfo.contact_no}</td>
            </tr>
            <tr>
                <td>Aadhar Number</td>
                <td>${tenantInfo.aadhar_no || 'Not provided'}</td>
            </tr>
            <tr>
                <td>Move In Date</td>
                <td>${new Date(tenantInfo.move_in_date).toLocaleDateString()}</td>
            </tr>
            <tr>
                <td>Rent Due Date</td>
                <td>${tenantInfo.rent_due_date || 'Not set'}</td>
            </tr>
            <tr>
                <td>Rent Amount</td>
                <td>₹${tenantInfo.rent_amount || 'Not set'}</td>
            </tr>
            <tr>
                <td>Current Meter Reading</td>
                <td>${tenantInfo.current_meter_reading || 'Not recorded'}</td>
            </tr>
            <tr>
                <td>Previous Meter Reading</td>
                <td>${tenantInfo.previous_meter_reading || 'Not recorded'}</td>
            </tr>
            <tr>
                <td>Bill Amount</td>
                <td>₹${tenantInfo.bill_amount || 'Not calculated'}</td>
            </tr>
            <tr>
                <td>Bill Date</td>
                <td>${tenantInfo.bill_date || 'Not generated'}</td>
            </tr>
            <tr>
                <td>Agreement File</td>
                <td>${tenantInfo.agreement_file_url ? `<a href="${tenantInfo.agreement_file_url}" target="_blank" class="btn btn-sm btn-outline-primary">View Agreement</a>` : 'Not uploaded'}</td>
            </tr>
        `;
    } else {
        tenantInfoTableBody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No tenant currently occupying this flat</td></tr>';
    }
}

// Load bills history
async function loadBillsHistory() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${flatLinkId}/bills`);
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
    if (bills && bills.length > 0) {
        billsTableBody.innerHTML = bills.map(bill => `
            <tr>
                <td>${bill.month}/${bill.year}</td>
                <td>₹${bill.rent_amount}</td>
                <td>₹${bill.electricity_amount}</td>
                <td>₹${bill.rent_amount + bill.electricity_amount}</td>
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