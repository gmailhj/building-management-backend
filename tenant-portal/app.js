const API_URL = 'http://localhost:5000';
let currentTenantId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get tenant ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentTenantId = urlParams.get('tenant_id');

    if (currentTenantId) {
        loadTenantInfo();
        loadMessages();
        // Check for new messages every 30 seconds
        setInterval(loadMessages, 30000);
    } else {
        showError('No tenant ID provided. Please use a valid tenant link.');
    }
});

// Load tenant information
async function loadTenantInfo() {
    try {
        const response = await fetch(`${API_URL}/api/tenants/${currentTenantId}`);
        const tenant = await response.json();
        displayTenantInfo(tenant);
    } catch (error) {
        console.error('Error loading tenant info:', error);
        showError('Failed to load tenant information');
    }
}

// Load messages for the tenant
async function loadMessages() {
    try {
        const response = await fetch(`${API_URL}/api/messages/${currentTenantId}`);
        const messages = await response.json();
        displayMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
        showError('Failed to load messages');
    }
}

// Display tenant information
function displayTenantInfo(tenant) {
    const tenantInfoDiv = document.getElementById('tenantInfo');
    tenantInfoDiv.innerHTML = `
        <div class="tenant-info-item">
            <div class="tenant-info-label">Name:</div>
            <div>${tenant.name}</div>
        </div>
        <div class="tenant-info-item">
            <div class="tenant-info-label">Building:</div>
            <div>${tenant.building_name}</div>
        </div>
        <div class="tenant-info-item">
            <div class="tenant-info-label">Flat:</div>
            <div>${tenant.flat_no}</div>
        </div>
        <div class="tenant-info-item">
            <div class="tenant-info-label">Contact:</div>
            <div>${tenant.contact_no}</div>
        </div>
    `;
}

// Display messages
function displayMessages(messages) {
    const messagesListDiv = document.getElementById('messagesList');
    if (messages.length === 0) {
        messagesListDiv.innerHTML = '<div class="text-center text-muted">No messages yet</div>';
        return;
    }

    messagesListDiv.innerHTML = messages.map(message => `
        <div class="message-item">
            <div class="d-flex justify-content-between">
                <strong>${message.subject}</strong>
                <span class="message-time">${new Date(message.created_at).toLocaleString()}</span>
            </div>
            <div class="message-content">${message.content}</div>
        </div>
    `).join('');
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

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
} 