const API_URL = 'http://localhost:5000';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadSmsSettings();
    loadNotificationHistory();
    
    // Add event listeners
    document.getElementById('smsEnabled').addEventListener('change', toggleSmsSettings);
    document.getElementById('smsConfigForm').addEventListener('submit', saveSmsSettings);
    document.getElementById('testSmsForm').addEventListener('submit', sendTestSms);
    document.getElementById('notificationFilter').addEventListener('change', filterNotifications);
    
    // Add event listener for send reminders button
    const sendRemindersBtn = document.getElementById('sendRemindersBtn');
    if (sendRemindersBtn) {
        sendRemindersBtn.addEventListener('click', sendReminders);
    }

    // Add event listener for template form
    const templateForm = document.getElementById('templateForm');
    if (templateForm) {
        templateForm.addEventListener('submit', saveTemplates);
        loadTemplates(); // Load templates when page loads
    }
});

// Load SMS settings from backend
async function loadSmsSettings() {
    try {
        const response = await fetch(`${API_URL}/api/settings/sms`);
        if (!response.ok) throw new Error('Failed to load SMS settings');
        
        const settings = await response.json();
        document.getElementById('smsEnabled').checked = settings.enabled;
        document.getElementById('smsProvider').value = settings.provider;
        document.getElementById('accountSid').value = settings.twilio.account_sid;
        document.getElementById('authToken').value = settings.twilio.auth_token;
        document.getElementById('fromNumber').value = settings.twilio.from_number;
        
        toggleSmsSettings();
    } catch (error) {
        console.error('Error loading SMS settings:', error);
        showToast('Failed to load SMS settings', 'error');
    }
}

// Toggle SMS settings visibility
function toggleSmsSettings() {
    const enabled = document.getElementById('smsEnabled').checked;
    const settingsDiv = document.getElementById('smsSettings');
    settingsDiv.classList.toggle('d-none', !enabled);
}

// Save SMS settings
async function saveSmsSettings(event) {
    event.preventDefault();
    
    const data = {
        enabled: document.getElementById('smsEnabled').checked,
        provider: document.getElementById('smsProvider').value,
        twilio: {
            account_sid: document.getElementById('accountSid').value,
            auth_token: document.getElementById('authToken').value,
            from_number: document.getElementById('fromNumber').value
        }
    };
    
    try {
        const response = await fetch(`${API_URL}/api/settings/sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Failed to save SMS settings');
        showToast('SMS settings saved successfully');
    } catch (error) {
        console.error('Error saving SMS settings:', error);
        showToast('Failed to save SMS settings', 'error');
    }
}

// Send test SMS
async function sendTestSms(event) {
    event.preventDefault();
    
    const data = {
        phone_number: document.getElementById('testPhone').value,
        message: document.getElementById('testMessage').value
    };
    
    try {
        const response = await fetch(`${API_URL}/api/settings/sms/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('Failed to send test SMS');
        showToast('Test SMS sent successfully');
        document.getElementById('testSmsForm').reset();
    } catch (error) {
        console.error('Error sending test SMS:', error);
        showToast('Failed to send test SMS', 'error');
    }
}

// Load notification history
async function loadNotificationHistory() {
    try {
        const response = await fetch(`${API_URL}/api/notifications/history`);
        if (!response.ok) throw new Error('Failed to load notification history');
        
        const notifications = await response.json();
        displayNotifications(notifications);
    } catch (error) {
        console.error('Error loading notification history:', error);
        showToast('Failed to load notification history', 'error');
    }
}

// Display notifications in the list
function displayNotifications(notifications) {
    const container = document.getElementById('notificationHistory');
    const filter = document.getElementById('notificationFilter').value;
    
    const filteredNotifications = filter === 'all' 
        ? notifications 
        : notifications.filter(n => n.type.includes(filter));
    
    container.innerHTML = filteredNotifications.map(notification => `
        <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${getNotificationTitle(notification.type)}</h6>
                    <p class="mb-1">${notification.message}</p>
                    <small class="text-muted">
                        ${new Date(notification.date).toLocaleString()} |
                        Method: ${notification.reminder_method || 'notification'}
                    </small>
                </div>
                <span class="badge bg-${getNotificationColor(notification.type)} ms-2">
                    ${notification.type}
                </span>
            </div>
        </div>
    `).join('');
}

// Filter notifications based on type
function filterNotifications() {
    loadNotificationHistory();
}

// Get notification color based on type
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

// Get notification title based on type
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

// Show toast notification
function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    const toastHtml = `
        <div class="toast" role="alert">
            <div class="toast-header bg-${type} text-white">
                <strong class="me-auto">${type === 'success' ? 'Success' : 'Error'}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toast = new bootstrap.Toast(toastContainer.lastElementChild);
    toast.show();
}

async function sendReminders() {
    try {
        const response = await fetch(`${API_URL}/api/reminders/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to send reminders');
        
        const result = await response.json();
        showToast(`${result.message}`);
        
        // Refresh notification history
        loadNotificationHistory();
    } catch (error) {
        console.error('Error sending reminders:', error);
        showToast('Failed to send reminders', 'error');
    }
}

// Load message templates
async function loadTemplates() {
    try {
        const response = await fetch(`${API_URL}/api/settings/templates`);
        if (!response.ok) throw new Error('Failed to load templates');
        const templates = await response.json();
        
        // Populate form fields with templates
        document.getElementById('rentDueTemplate').value = templates.rent_due;
        document.getElementById('rentReminderTemplate').value = templates.rent_reminder;
        document.getElementById('rentOverdueTemplate').value = templates.rent_overdue;
        document.getElementById('billDueTemplate').value = templates.bill_due_soon;
        document.getElementById('billOverdueTemplate').value = templates.bill_overdue;
    } catch (error) {
        showToast('error', 'Failed to load message templates');
        console.error('Error loading templates:', error);
    }
}

// Save message templates
async function saveTemplates(event) {
    event.preventDefault();
    
    const templates = {
        rent_due: document.getElementById('rentDueTemplate').value.trim(),
        rent_reminder: document.getElementById('rentReminderTemplate').value.trim(),
        rent_overdue: document.getElementById('rentOverdueTemplate').value.trim(),
        bill_due_soon: document.getElementById('billDueTemplate').value.trim(),
        bill_overdue: document.getElementById('billOverdueTemplate').value.trim()
    };

    try {
        const response = await fetch(`${API_URL}/api/settings/templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(templates)
        });

        if (!response.ok) throw new Error('Failed to save templates');
        showToast('success', 'Message templates saved successfully');
    } catch (error) {
        showToast('error', 'Failed to save message templates');
        console.error('Error saving templates:', error);
    }
}

async function resetTemplates() {
    if (!confirm('Are you sure you want to reset all templates to default?')) return;

    try {
        const response = await fetch(`${API_URL}/api/settings/templates/reset`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Failed to reset templates');
        await loadTemplates();
        showToast('success', 'Templates reset to default');
    } catch (error) {
        showToast('error', 'Failed to reset templates');
        console.error('Error resetting templates:', error);
    }
}

// Example templates for reference
const EXAMPLE_TEMPLATES = {
    rent_due: "Dear {tenant_name}, your rent of Rs. {amount} for {flat_no} is due today. Your payment trend is {payment_trend}. Total dues: Rs. {total_dues}. Please ensure timely payment.",
    rent_reminder: "Reminder: Your rent of Rs. {amount} for {flat_no} is due in {days_until_due} days. Last payment was on {last_payment_date}. Current payment status: {payment_status}.",
    rent_overdue: "OVERDUE NOTICE: Your rent of Rs. {amount} for {flat_no} is overdue by {days_until_due} days. Total pending amount: Rs. {total_dues}. Please clear dues immediately.",
    bill_due_soon: "Dear {tenant_name}, your utility bill of Rs. {electricity_amount} for {flat_no} is due soon. Total bill dues: Rs. {total_bill_dues}. Last bill status: {last_bill_status}.",
    bill_overdue: "OVERDUE NOTICE: Your utility bill payment of Rs. {electricity_amount} for {flat_no} is pending. Total bill dues: Rs. {total_bill_dues}. Please clear immediately."
}; 