const API_URL = 'http://localhost:5000';
let revenueChart = null;
let expenseCategoriesChart = null;

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    loadExpenses();
    
    // Add event listeners for expense filters
    document.getElementById('expenseCategory').addEventListener('change', loadExpenses);
    document.getElementById('expenseMonth').addEventListener('change', loadExpenses);
});

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/api/analytics/dashboard`);
        if (!response.ok) throw new Error('Failed to load dashboard data');
        const data = await response.json();
        
        updateAnalyticsCards(data);
        updateCharts(data);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Failed to load dashboard data');
    }
}

function updateAnalyticsCards(data) {
    // Update occupancy rate
    const occupancyRate = document.getElementById('occupancyRate');
    const occupancyBar = document.getElementById('occupancyBar');
    occupancyRate.textContent = `${data.occupancy_rate}%`;
    occupancyBar.style.width = `${data.occupancy_rate}%`;
    occupancyBar.className = `progress-bar bg-${getOccupancyColor(data.occupancy_rate)}`;
    
    // Update revenue
    document.getElementById('monthlyRevenue').textContent = data.revenue.current_month.toLocaleString();
    const revenueChange = ((data.revenue.current_month - data.revenue.last_month) / data.revenue.last_month * 100).toFixed(1);
    document.getElementById('revenueChange').innerHTML = `
        <i class="fas fa-${revenueChange >= 0 ? 'arrow-up text-success' : 'arrow-down text-danger'}"></i>
        ${Math.abs(revenueChange)}%
    `;
    
    // Update expenses
    document.getElementById('monthlyExpenses').textContent = data.expenses.current_month.toLocaleString();
    const expensesChange = ((data.expenses.current_month - data.expenses.last_month) / data.expenses.last_month * 100).toFixed(1);
    document.getElementById('expensesChange').innerHTML = `
        <i class="fas fa-${expensesChange <= 0 ? 'arrow-down text-success' : 'arrow-up text-danger'}"></i>
        ${Math.abs(expensesChange)}%
    `;
    
    // Update maintenance
    document.getElementById('pendingMaintenance').textContent = data.maintenance.pending_requests;
    document.getElementById('completedMaintenance').textContent = data.maintenance.completed_requests;
}

function updateCharts(data) {
    // Update revenue vs expenses chart
    const months = getLastSixMonths();
    const revenueData = months.map(month => data.revenue[month] || 0);
    const expenseData = months.map(month => data.expenses[month] || 0);
    
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(document.getElementById('revenueChart'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenueData,
                    borderColor: '#198754',
                    tension: 0.1
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#dc3545',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '₹' + value.toLocaleString()
                    }
                }
            }
        }
    });
    
    // Update expense categories chart
    const categories = data.expenses.by_category;
    if (expenseCategoriesChart) expenseCategoriesChart.destroy();
    expenseCategoriesChart = new Chart(document.getElementById('expenseCategoriesChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#198754',
                    '#0d6efd',
                    '#dc3545',
                    '#ffc107',
                    '#6c757d'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => `₹${context.raw.toLocaleString()}`
                    }
                }
            }
        }
    });
}

async function loadExpenses() {
    try {
        const category = document.getElementById('expenseCategory').value;
        const month = document.getElementById('expenseMonth').value;
        
        let url = `${API_URL}/api/expenses?`;
        if (category) url += `category=${category}&`;
        if (month) {
            const [year, monthNum] = month.split('-');
            url += `start_date=${year}-${monthNum}-01&end_date=${year}-${monthNum}-31`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load expenses');
        const expenses = await response.json();
        
        displayExpenses(expenses);
    } catch (error) {
        console.error('Error loading expenses:', error);
        showError('Failed to load expenses');
    }
}

function displayExpenses(expenses) {
    const tbody = document.getElementById('expensesTable');
    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No expenses found</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = expenses.map(expense => `
        <tr>
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td>
                <span class="badge bg-${getCategoryColor(expense.category)}">
                    ${expense.category}
                </span>
            </td>
            <td>${expense.description}</td>
            <td>₹${expense.amount.toLocaleString()}</td>
            <td>
                ${expense.receipt_url ? `
                    <a href="${expense.receipt_url}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-receipt"></i> View
                    </a>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

async function submitExpense() {
    try {
        const category = document.getElementById('newExpenseCategory').value;
        const amount = parseFloat(document.getElementById('newExpenseAmount').value);
        const description = document.getElementById('newExpenseDescription').value;
        const receiptFile = document.getElementById('newExpenseReceipt').files[0];
        
        if (!category || !amount || !description) {
            showError('Please fill in all required fields');
            return;
        }
        
        let receipt_url = null;
        if (receiptFile) {
            // In a real app, you would upload the file to a server/storage
            // For now, we'll just create a local URL
            receipt_url = URL.createObjectURL(receiptFile);
        }
        
        const response = await fetch(`${API_URL}/api/expenses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                building_id: 1, // For now, hardcoded to first building
                category,
                amount,
                description,
                receipt_url
            })
        });
        
        if (!response.ok) throw new Error('Failed to add expense');
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
        modal.hide();
        document.getElementById('expenseForm').reset();
        
        // Reload data
        await Promise.all([
            loadDashboardData(),
            loadExpenses()
        ]);
        
        showSuccess('Expense added successfully');
    } catch (error) {
        console.error('Error adding expense:', error);
        showError('Failed to add expense');
    }
}

// Helper functions
function getLastSixMonths() {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
        months.unshift(date.toLocaleString('default', { month: 'short' }));
        date.setMonth(date.getMonth() - 1);
    }
    return months;
}

function getOccupancyColor(rate) {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'info';
    if (rate >= 40) return 'warning';
    return 'danger';
}

function getCategoryColor(category) {
    switch (category) {
        case 'maintenance': return 'primary';
        case 'utilities': return 'info';
        case 'repairs': return 'warning';
        case 'cleaning': return 'success';
        default: return 'secondary';
    }
}

function showSuccess(message) {
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