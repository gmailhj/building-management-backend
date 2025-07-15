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
        loadNotifications();
        
        // Check for new notifications every 30 seconds
        setInterval(loadNotifications, 30000);
    } else {
        // Redirect to login page if no flat ID is found
        window.location.href = 'login.html';
        return;
    }
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

// Load notifications
async function loadNotifications() {
    try {
        const notifications = await getNotifications(flatLinkId);
        displayNotifications(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
        showError('Failed to load notifications');
    }
}

// Display notifications
function displayNotifications(notifications) {
    const notificationsListDiv = document.getElementById('notificationsList');
    if (notifications.length === 0) {
        notificationsListDiv.innerHTML = '<div class="text-center text-muted">No notifications yet</div>';
        return;
    }

    notificationsListDiv.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}">
            <div class="d-flex justify-content-between">
                <strong>${notification.title}</strong>
                <span class="badge bg-${getNotificationTypeColor(notification.type)}">${notification.type}</span>
            </div>
            <div class="notification-content">${notification.message}</div>
            <div class="notification-meta">
                <small class="text-muted">
                    ${new Date(notification.created_at).toLocaleString()}
                </small>
                ${!notification.read ? `
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="markAsRead(${notification.id})">
                        Mark as Read
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        await markNotificationAsRead(notificationId);
        loadNotifications();
        showToast('Notification marked as read');
    } catch (error) {
        console.error('Error marking notification as read:', error);
        showError('Failed to mark notification as read');
    }
}

// Get notification type color for badge
function getNotificationTypeColor(type) {
    switch (type.toLowerCase()) {
        case 'rent':
            return 'primary';
        case 'bill':
            return 'info';
        case 'maintenance':
            return 'warning';
        case 'emergency':
            return 'danger';
        case 'general':
            return 'secondary';
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