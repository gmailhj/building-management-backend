const API_URL = 'http://localhost:5000';
let flatLinkId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get flat link ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    flatLinkId = urlParams.get('flat_id');

    if (flatLinkId) {
        loadFlatInfo();
    } else {
        showError('No flat ID provided. Please use a valid flat link.');
    }

    // Handle bill form submission
    document.getElementById('billForm').addEventListener('submit', generateBill);
});

// Load flat information
async function loadFlatInfo() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${flatLinkId}/bill`);
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
        <div class="tenant-info-item">
            <div class="tenant-info-label">Flat Number:</div>
            <div>${flatInfo.flat_no}</div>
        </div>
        <div class="tenant-info-item">
            <div class="tenant-info-label">Type:</div>
            <div>${flatInfo.type}</div>
        </div>
        <div class="tenant-info-item">
            <div class="tenant-info-label">Rent Amount:</div>
            <div>₹${flatInfo.rent_amount}</div>
        </div>
        <div class="tenant-info-item">
            <div class="tenant-info-label">Building:</div>
            <div>${flatInfo.building_name || 'Not assigned'}</div>
        </div>
        <div class="tenant-info-item">
            <div class="tenant-info-label">Current Tenant:</div>
            <div>${flatInfo.tenant_name || 'Vacant'}</div>
        </div>
    `;
}

// Generate bill
async function generateBill(event) {
    event.preventDefault();

    const monthYear = document.getElementById('billMonth').value.split('-');
    const reading = parseFloat(document.getElementById('billReading').value);
    const rate = parseFloat(document.getElementById('billRate').value);
    
    const data = {
        month: monthYear[1],
        year: monthYear[0],
        electricity_reading: reading,
        rate: rate,
        due_date: document.getElementById('billDueDate').value
    };
    
    try {
        const response = await fetch(`${API_URL}/api/flats/${flatLinkId}/bill`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        if (response.ok) {
            const bill = await response.json();
            displayBillPreview(bill);
            showToast('Bill generated successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to generate bill');
        }
    } catch (error) {
        console.error('Error generating bill:', error);
        showError('Failed to generate bill. Please check your connection.');
    }
}

// Display bill preview
function displayBillPreview(bill) {
    const billPreviewDiv = document.getElementById('billPreview');
    billPreviewDiv.innerHTML = `
        <div class="bill-preview">
            <h6>Bill Details</h6>
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Month:</strong> ${bill.month}/${bill.year}</p>
                    <p><strong>Flat No:</strong> ${bill.flat_no}</p>
                    <p><strong>Due Date:</strong> ${new Date(bill.due_date).toLocaleDateString()}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Electricity Reading:</strong> ${bill.electricity_reading} units</p>
                    <p><strong>Electricity Amount:</strong> ₹${bill.electricity_amount}</p>
                    <p><strong>Rent Amount:</strong> ₹${bill.rent_amount}</p>
                    <p><strong>Total Amount:</strong> ₹${bill.electricity_amount + bill.rent_amount}</p>
                </div>
            </div>
        </div>
    `;
    billPreviewDiv.classList.remove('d-none');
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

// Show success toast
function showToast(message) {
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