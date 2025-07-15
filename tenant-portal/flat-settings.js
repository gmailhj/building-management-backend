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
        loadSettings();
    } else {
        // Redirect to login page if no flat ID is found
        window.location.href = 'login.html';
        return;
    }

    // Handle settings form submission
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);
});

// Load flat information
async function loadFlatInfo() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${flatLinkId}/info`);
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
            <div class="tenant-info-label">Building:</div>
            <div>${flatInfo.building_name || 'Not assigned'}</div>
        </div>
        <div class="tenant-info-item">
            <div class="tenant-info-label">Status:</div>
            <div>${flatInfo.status}</div>
        </div>
    `;
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${flatLinkId}/settings`);
        const settings = await response.json();
        displaySettings(settings);
    } catch (error) {
        console.error('Error loading settings:', error);
        showError('Failed to load settings');
    }
}

// Display settings
function displaySettings(settings) {
    // Notification preferences
    document.getElementById('rentNotifications').checked = settings.notifications.rent;
    document.getElementById('billNotifications').checked = settings.notifications.bills;
    document.getElementById('maintenanceNotifications').checked = settings.notifications.maintenance;
    document.getElementById('generalNotifications').checked = settings.notifications.general;

    // Notification methods
    document.getElementById('notificationMethod').value = settings.notification_method;

    // Payment preferences
    document.getElementById('autoPay').checked = settings.payment.auto_pay;
    document.getElementById('paymentMethod').value = settings.payment.method;
    document.getElementById('paymentDay').value = settings.payment.day;

    // Privacy settings
    document.getElementById('showContact').checked = settings.privacy.show_contact;
    document.getElementById('showEmail').checked = settings.privacy.show_email;
}

// Save settings
async function saveSettings(event) {
    event.preventDefault();

    const settings = {
        notifications: {
            rent: document.getElementById('rentNotifications').checked,
            bills: document.getElementById('billNotifications').checked,
            maintenance: document.getElementById('maintenanceNotifications').checked,
            general: document.getElementById('generalNotifications').checked
        },
        notification_method: document.getElementById('notificationMethod').value,
        payment: {
            auto_pay: document.getElementById('autoPay').checked,
            method: document.getElementById('paymentMethod').value,
            day: document.getElementById('paymentDay').value
        },
        privacy: {
            show_contact: document.getElementById('showContact').checked,
            show_email: document.getElementById('showEmail').checked
        }
    };

    try {
        const response = await fetch(`${API_URL}/api/flats/${flatLinkId}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            showToast('Settings saved successfully');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings');
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