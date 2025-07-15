const API_URL = window.location.origin;
let flatLinkId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get flat link ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    flatLinkId = urlParams.get('flat_id');

    // Check if flat ID is provided in URL or stored in localStorage
    if (!flatLinkId) {
        flatLinkId = localStorage.getItem('flatLinkId');
    }

    if (flatLinkId) {
        // Store the flat ID in localStorage for future use
        localStorage.setItem('flatLinkId', flatLinkId);
        loadFlatInfo();
        loadMaintenanceRequests();
    } else {
        // Redirect to login page if no flat ID is found
        window.location.href = 'login.html';
        return;
    }

    // Handle maintenance request form submission
    document.getElementById('maintenanceForm').addEventListener('submit', submitMaintenanceRequest);
});

// Load flat information
async function loadFlatInfo() {
    try {
        const flatInfo = await getFlat(flatLinkId);
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
            <div class="tenant-info-label">Building:</div>
            <div>${flatInfo.building_name || 'Not assigned'}</div>
        </div>
        <div class="tenant-info-item">
            <div class="tenant-info-label">Status:</div>
            <div>${flatInfo.status}</div>
        </div>
    `;
}

// Load maintenance requests
async function loadMaintenanceRequests() {
    try {
        const requests = await getMaintenanceRequests(flatLinkId);
        displayMaintenanceRequests(requests);
    } catch (error) {
        console.error('Error loading maintenance requests:', error);
        showError('Failed to load maintenance requests');
    }
}

// Display maintenance requests
function displayMaintenanceRequests(requests) {
    const requestsListDiv = document.getElementById('maintenanceRequests');
    if (requests.length === 0) {
        requestsListDiv.innerHTML = '<div class="text-center text-muted">No maintenance requests yet</div>';
        return;
    }

    requestsListDiv.innerHTML = requests.map(request => `
        <div class="maintenance-request-item">
            <div class="d-flex justify-content-between">
                <strong>${request.title}</strong>
                <span class="badge bg-${getStatusColor(request.status)}">${request.status}</span>
            </div>
            <div class="request-content">${request.description}</div>
            <div class="request-meta">
                <small class="text-muted">
                    Submitted: ${new Date(request.created_at).toLocaleString()}
                </small>
                ${request.updated_at ? `
                    <small class="text-muted ms-2">
                        Last Updated: ${new Date(request.updated_at).toLocaleString()}
                    </small>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Submit maintenance request
async function submitMaintenanceRequest(event) {
    event.preventDefault();

    const title = document.getElementById('requestTitle').value;
    const description = document.getElementById('requestDescription').value;
    const priority = document.getElementById('requestPriority').value;

    const data = {
        title,
        description,
        priority,
        flat_id: flatLinkId
    };

    try {
        await addMaintenanceRequest(data);
        showToast('Maintenance request submitted successfully');
        document.getElementById('maintenanceForm').reset();
        loadMaintenanceRequests();
    } catch (error) {
        console.error('Error submitting maintenance request:', error);
        showError('Failed to submit maintenance request. Please check your connection.');
    }
}

// Get status color for badge
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'pending':
            return 'warning';
        case 'in progress':
            return 'info';
        case 'completed':
            return 'success';
        case 'cancelled':
            return 'danger';
        default:
            return 'secondary';
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