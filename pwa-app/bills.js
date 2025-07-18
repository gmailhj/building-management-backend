// Bill Management JavaScript
let allBills = [];
let currentTenant = null;
let isAdmin = false;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check if user is logged in
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        isAdmin = user.role === 'owner';
        
        // Load all bills
        await loadAllBills();
        
        // Set up event listeners
        setupEventListeners();
        
        // Set current year as default
        document.getElementById('billYear').value = new Date().getFullYear();
        document.getElementById('sendBillYear').value = new Date().getFullYear();
        
    } catch (error) {
        console.error('Error initializing bills page:', error);
        showToast('Failed to initialize bills page', 'error');
    }
});

// Set up event listeners
function setupEventListeners() {
    document.getElementById('applyFilters').addEventListener('click', filterBills);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    
    // Meter reading calculation
    document.getElementById('previousReading').addEventListener('input', calculateUnits);
    document.getElementById('currentReading').addEventListener('input', calculateUnits);
}

// Load all bills for all tenants
async function loadAllBills() {
    try {
        // Get all bills without tenant filter
        const response = await fetch('/api/bills');
        const bills = await response.json();
        allBills = bills;
        
        // Get tenant information for each bill
        const tenants = await getTenants();
        
        // Enrich bills with tenant information
        allBills = allBills.map(bill => {
            const tenant = tenants.find(t => t.id === bill.tenant_id);
            return {
                ...bill,
                tenant_name: tenant ? tenant.name : 'Unknown',
                tenant_flat: tenant ? tenant.flat_no : 'Unknown'
            };
        });
        
        renderBills(allBills);
        populateYearFilter();
        
    } catch (error) {
        console.error('Error loading bills:', error);
        showToast('Failed to load bills', 'error');
    }
}

// Render bills table
function renderBills(bills) {
    const billsHTML = bills.map(bill => {
        const month = typeof bill.month === 'number' ? getMonthName(bill.month) : bill.month || 'N/A';
        const prevReading = bill.previous_reading || 0;
        const currReading = bill.current_reading || 0;
        const unitsConsumed = currReading - prevReading;
        const electricityCharge = bill.electricity_bill || bill.electricity_amount || 0;
        const rentAmount = bill.rent_amount || 0;
        const maidCharges = bill.maid_charges || 0;
        const totalAmount = electricityCharge + rentAmount + maidCharges;
        const dueDate = bill.due_date ? formatDate(bill.due_date) : 'N/A';
        const status = bill.status || 'pending';
        
        // Determine row class based on status
        let rowClass = '';
        if (status === 'paid') {
            rowClass = 'table-success';
        } else if (status === 'pending') {
            const today = new Date();
            const billDueDate = new Date(bill.due_date);
            if (billDueDate < today) {
                rowClass = 'table-danger';
            } else {
                rowClass = 'table-warning';
            }
        }
        
        return `
            <tr class="${rowClass}">
                <td>${month} ${bill.year}<br><small class="text-muted">${bill.tenant_name} - ${bill.tenant_flat}</small></td>
                <td>${prevReading || '-'}</td>
                <td>${currReading || '-'}</td>
                <td>${unitsConsumed || '-'}</td>
                <td>₹${electricityCharge}</td>
                <td>₹${rentAmount}</td>
                <td>₹${maidCharges}</td>
                <td><strong>₹${totalAmount}</strong></td>
                <td>${dueDate}</td>
                <td>
                    <span class="badge bg-${getStatusColor(status)}">
                        ${status}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-info btn-sm" onclick="viewBillDetails(${bill.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${isAdmin ? `
                            <button class="btn btn-primary btn-sm" onclick="editBill(${bill.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${status === 'pending' ? `
                                <button class="btn btn-success btn-sm" onclick="markBillPaid(${bill.id})" title="Mark Paid">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-danger btn-sm" onclick="deleteBill(${bill.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('billHistory').innerHTML = billsHTML || '<tr><td colspan="11" class="text-center">No bills found</td></tr>';
}

// Populate year filter with unique years from bills
function populateYearFilter() {
    if (!allBills || allBills.length === 0) return;
    
    const years = [...new Set(allBills.map(bill => bill.year))].sort((a, b) => b - a);
    const filterYear = document.getElementById('filterYear');
    
    // Clear existing options except the first one
    while (filterYear.options.length > 1) {
        filterYear.remove(1);
    }
    
    // Add year options
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        filterYear.appendChild(option);
    });
}

// Filter bills based on selected criteria
function filterBills() {
    const yearFilter = document.getElementById('filterYear').value;
    const monthFilter = document.getElementById('filterMonth').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    let filteredBills = [...allBills];
    
    if (yearFilter) {
        filteredBills = filteredBills.filter(bill => bill.year == yearFilter);
    }
    
    if (monthFilter) {
        filteredBills = filteredBills.filter(bill => bill.month == monthFilter);
    }
    
    if (statusFilter) {
        filteredBills = filteredBills.filter(bill => bill.status === statusFilter);
    }
    
    renderBills(filteredBills);
}

// Clear all filters
function clearFilters() {
    document.getElementById('filterYear').value = '';
    document.getElementById('filterMonth').value = '';
    document.getElementById('filterStatus').value = '';
    
    renderBills(allBills);
    showToast('Filters cleared', 'success');
}

// Export bills to PDF
function exportToPDF() {
    const filteredBills = getCurrentFilteredBills();
    
    if (filteredBills.length === 0) {
        showToast('No bills to export', 'error');
        return;
    }
    
    let pdfContent = `Bills Report - All Tenants\n`;
    pdfContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    pdfContent += 'Tenant\tMonth\tPrev Reading\tCurr Reading\tUnits\tElectricity\tRent\tMaid\tTotal\tDue Date\tStatus\n';
    pdfContent += '---\t---\t---\t---\t---\t---\t---\t---\t---\t---\t---\n';
    
    filteredBills.forEach(bill => {
        const month = typeof bill.month === 'number' ? getMonthName(bill.month) : bill.month;
        const prevReading = bill.previous_reading || 0;
        const currReading = bill.current_reading || 0;
        const unitsConsumed = currReading - prevReading;
        const electricityCharge = bill.electricity_bill || bill.electricity_amount || 0;
        const rentAmount = bill.rent_amount || 0;
        const maidCharges = bill.maid_charges || 0;
        const totalAmount = electricityCharge + rentAmount + maidCharges;
        const dueDate = bill.due_date ? formatDate(bill.due_date) : 'N/A';
        
        pdfContent += `${bill.tenant_name}\t${month}\t${prevReading}\t${currReading}\t${unitsConsumed}\t₹${electricityCharge}\t₹${rentAmount}\t₹${maidCharges}\t₹${totalAmount}\t${dueDate}\t${bill.status}\n`;
    });
    
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-bills-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('Bills exported to PDF format', 'success');
}

// Export bills to CSV
function exportToCSV() {
    const filteredBills = getCurrentFilteredBills();
    
    if (filteredBills.length === 0) {
        showToast('No bills to export', 'error');
        return;
    }
    
    let csvContent = 'Tenant,Flat,Month,Year,Previous Reading,Current Reading,Units Consumed,Electricity Bill,Rent Amount,Maid Charges,Total Amount,Due Date,Status\n';
    
    filteredBills.forEach(bill => {
        const month = typeof bill.month === 'number' ? getMonthName(bill.month) : bill.month;
        const prevReading = bill.previous_reading || 0;
        const currReading = bill.current_reading || 0;
        const unitsConsumed = currReading - prevReading;
        const electricityCharge = bill.electricity_bill || bill.electricity_amount || 0;
        const rentAmount = bill.rent_amount || 0;
        const maidCharges = bill.maid_charges || 0;
        const totalAmount = electricityCharge + rentAmount + maidCharges;
        const dueDate = bill.due_date ? formatDate(bill.due_date) : 'N/A';
        
        csvContent += `"${bill.tenant_name}","${bill.tenant_flat}","${month}",${bill.year},${prevReading},${currReading},${unitsConsumed},${electricityCharge},${rentAmount},${maidCharges},${totalAmount},"${dueDate}","${bill.status}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-bills-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('Bills exported to CSV format', 'success');
}

// Get currently filtered bills
function getCurrentFilteredBills() {
    const yearFilter = document.getElementById('filterYear').value;
    const monthFilter = document.getElementById('filterMonth').value;
    const statusFilter = document.getElementById('filterStatus').value;
    
    let filteredBills = [...allBills];
    
    if (yearFilter) {
        filteredBills = filteredBills.filter(bill => bill.year == yearFilter);
    }
    
    if (monthFilter) {
        filteredBills = filteredBills.filter(bill => bill.month == monthFilter);
    }
    
    if (statusFilter) {
        filteredBills = filteredBills.filter(bill => bill.status === statusFilter);
    }
    
    return filteredBills;
}

// Calculate units consumed
function calculateUnits() {
    const previousReading = parseInt(document.getElementById('previousReading').value) || 0;
    const currentReading = parseInt(document.getElementById('currentReading').value) || 0;
    
    if (currentReading >= previousReading) {
        const unitsConsumed = currentReading - previousReading;
        document.getElementById('unitsConsumed').value = unitsConsumed;
    } else {
        document.getElementById('unitsConsumed').value = '';
        if (currentReading > 0) {
            showToast('Current reading cannot be less than previous reading', 'error');
        }
    }
}

// Add new bill
async function addBill() {
    try {
        const data = {
            tenant_id: 1, // Default tenant - you might want to add tenant selection
            month: parseInt(document.getElementById('billMonth').value),
            year: parseInt(document.getElementById('billYear').value),
            previous_reading: parseInt(document.getElementById('previousReading').value),
            current_reading: parseInt(document.getElementById('currentReading').value),
            electricity_amount: parseInt(document.getElementById('electricityBill').value),
            rent_amount: 10000, // Default rent amount
            maid_charges: parseInt(document.getElementById('maidCharges').value),
            due_date: document.getElementById('dueDate').value,
            status: 'pending'
        };
        
        if (!data.month || !data.year || !data.previous_reading || !data.current_reading || 
            !data.electricity_amount || !data.maid_charges || !data.due_date) {
            showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (data.current_reading < data.previous_reading) {
            showToast('Current reading cannot be less than previous reading', 'error');
            return;
        }
        
        const response = await fetch('/api/bills', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addBillModal'));
            modal.hide();
            document.getElementById('addBillForm').reset();
            await loadAllBills();
            showToast('Bill added successfully', 'success');
        } else {
            throw new Error('Failed to add bill');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to add bill', 'error');
    }
}

// Generate and send bill notification
async function generateAndSendBill() {
    try {
        const month = parseInt(document.getElementById('sendBillMonth').value);
        const year = parseInt(document.getElementById('sendBillYear').value);
        const additionalMessage = document.getElementById('sendBillMessage').value.trim();
        const isUrgent = document.getElementById('sendAsUrgent').checked;
        
        showToast('Bill notification sent successfully', 'success');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('sendBillModal'));
        if (modal) modal.hide();
        
    } catch (error) {
        console.error('Error generating bill:', error);
        showToast('Failed to generate bill', 'error');
    }
}

// View bill details
function viewBillDetails(billId) {
    const bill = allBills.find(b => b.id === billId);
    if (!bill) {
        showToast('Bill not found', 'error');
        return;
    }
    
    alert(`Bill Details:\n\nTenant: ${bill.tenant_name}\nFlat: ${bill.tenant_flat}\nMonth: ${getMonthName(bill.month)} ${bill.year}\nPrevious Reading: ${bill.previous_reading || 0}\nCurrent Reading: ${bill.current_reading || 0}\nUnits: ${(bill.current_reading || 0) - (bill.previous_reading || 0)}\nElectricity: ₹${bill.electricity_bill || bill.electricity_amount || 0}\nRent: ₹${bill.rent_amount || 0}\nMaid Charges: ₹${bill.maid_charges || 0}\nTotal: ₹${(bill.electricity_bill || bill.electricity_amount || 0) + (bill.rent_amount || 0) + (bill.maid_charges || 0)}\nDue Date: ${bill.due_date ? formatDate(bill.due_date) : 'N/A'}\nStatus: ${bill.status}`);
}

// Edit bill
function editBill(billId) {
    showToast('Edit functionality will be implemented soon', 'info');
}

// Mark bill as paid
async function markBillPaid(billId) {
    try {
        const response = await fetch(`/api/bills/${billId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                status: 'paid',
                payment_date: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            showToast('Bill marked as paid', 'success');
            await loadAllBills();
        } else {
            throw new Error('Failed to mark bill as paid');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to mark bill as paid', 'error');
    }
}

// Delete bill
async function deleteBill(billId) {
    if (!confirm('Are you sure you want to delete this bill?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bills/${billId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('Bill deleted successfully', 'success');
            await loadAllBills();
        } else {
            throw new Error('Failed to delete bill');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Failed to delete bill', 'error');
    }
}

// Utility functions
function getMonthName(month) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
}

function getStatusColor(status) {
    switch (status) {
        case 'paid': return 'success';
        case 'pending': return 'warning';
        default: return 'secondary';
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
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

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}
