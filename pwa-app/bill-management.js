// Bill Management Module

const API_URL = 'http://127.0.0.1:5000';

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN');
}

// Bill Management Functions
async function generateBill(tenantId, billData) {
    try {
        const response = await fetch(`${API_URL}/api/tenants/${tenantId}/bills`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(billData)
        });

        if (!response.ok) {
            throw new Error('Failed to generate bill');
        }

        return await response.json();
    } catch (error) {
        console.error('Error generating bill:', error);
        throw error;
    }
}

async function getBills(tenantId) {
    try {
        const response = await fetch(`${API_URL}/api/tenants/${tenantId}/bills`);
        if (!response.ok) {
            throw new Error('Failed to fetch bills');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching bills:', error);
        throw error;
    }
}

async function getBill(billId) {
    try {
        const response = await fetch(`${API_URL}/api/bills/${billId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch bill details');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching bill details:', error);
        throw error;
    }
}

async function updateBill(billId, updateData) {
    try {
        const response = await fetch(`${API_URL}/api/bills/${billId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            throw new Error('Failed to update bill');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating bill:', error);
        throw error;
    }
}

async function deleteBill(billId) {
    try {
        const response = await fetch(`${API_URL}/api/bills/${billId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete bill');
        }

        return true;
    } catch (error) {
        console.error('Error deleting bill:', error);
        throw error;
    }
}

async function sendBillNotification(billId, message) {
    try {
        const response = await fetch(`${API_URL}/api/bills/${billId}/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error('Failed to send bill notification');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending bill notification:', error);
        throw error;
    }
}

async function processBillPayment(billId, paymentData) {
    try {
        const response = await fetch(`${API_URL}/api/bills/${billId}/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            throw new Error('Failed to process payment');
        }

        return await response.json();
    } catch (error) {
        console.error('Error processing payment:', error);
        throw error;
    }
}

// Export functions
export {
    generateBill,
    getBills,
    getBill,
    updateBill,
    deleteBill,
    sendBillNotification,
    processBillPayment,
    formatCurrency,
    formatDate
};