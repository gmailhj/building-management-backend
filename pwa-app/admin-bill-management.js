// Admin Bill Management Component

class AdminBillManagement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadBills();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }

                .admin-bill-panel {
                    background: var(--card-bg, #ffffff);
                    border-radius: 15px;
                    padding: 1.5rem;
                    box-shadow: var(--card-shadow, 0 4px 6px rgba(0, 0, 0, 0.1));
                    margin-bottom: 2rem;
                }

                .bills-list {
                    margin-top: 1rem;
                }

                .bill-item {
                    border: 1px solid var(--border-color, #dee2e6);
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    background: var(--light-bg, #f8f9fa);
                }

                .bill-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .bill-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }

                .bill-actions {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 1rem;
                }

                button {
                    background: var(--primary-color, #4361ee);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                button:hover {
                    background: var(--primary-dark, #3a52d8);
                }

                .delete-btn {
                    background: var(--danger-color, #dc3545);
                }

                .delete-btn:hover {
                    background: var(--danger-dark, #c82333);
                }

                .status-badge {
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.875rem;
                }

                .status-paid {
                    background: var(--success-light, #d4edda);
                    color: var(--success-dark, #155724);
                }

                .status-pending {
                    background: var(--warning-light, #fff3cd);
                    color: var(--warning-dark, #856404);
                }

                .status-overdue {
                    background: var(--danger-light, #f8d7da);
                    color: var(--danger-dark, #721c24);
                }
            </style>

            <div class="admin-bill-panel">
                <h2>Bills Management</h2>
                <div class="bills-list" id="billsList"></div>
            </div>
        `;
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', (event) => {
            if (event.target.matches('.edit-btn')) {
                const billId = event.target.dataset.billId;
                this.editBill(billId);
            } else if (event.target.matches('.delete-btn')) {
                const billId = event.target.dataset.billId;
                this.deleteBill(billId);
            } else if (event.target.matches('.send-reminder-btn')) {
                const billId = event.target.dataset.billId;
                this.sendReminder(billId);
            }
        });
    }

    async loadBills() {
        try {
            const response = await fetch('/api/bills');
            const bills = await response.json();
            this.renderBills(bills);
        } catch (error) {
            console.error('Error loading bills:', error);
        }
    }

    renderBills(bills) {
        const billsList = this.shadowRoot.getElementById('billsList');
        billsList.innerHTML = bills.map(bill => this.createBillElement(bill)).join('');
    }

    createBillElement(bill) {
        const statusClass = this.getStatusClass(bill.status);
        return `
            <div class="bill-item">
                <div class="bill-header">
                    <h3>Bill #${bill.id} - ${bill.tenant_name}</h3>
                    <span class="status-badge ${statusClass}">${bill.status}</span>
                </div>
                <div class="bill-details">
                    <div>Amount: ₹${bill.total_amount}</div>
                    <div>Due Date: ${new Date(bill.due_date).toLocaleDateString()}</div>
                    <div>Generated: ${new Date(bill.generated_date).toLocaleDateString()}</div>
                </div>
                <div class="bill-actions">
                    <button class="edit-btn" data-bill-id="${bill.id}">Edit</button>
                    <button class="delete-btn" data-bill-id="${bill.id}">Delete</button>
                    <button class="send-reminder-btn" data-bill-id="${bill.id}">Send Reminder</button>
                </div>
            </div>
        `;
    }

    getStatusClass(status) {
        switch (status.toLowerCase()) {
            case 'paid': return 'status-paid';
            case 'pending': return 'status-pending';
            case 'overdue': return 'status-overdue';
            default: return '';
        }
    }

    async editBill(billId) {
        // Open bill form for editing
        const billForm = document.createElement('bill-form');
        billForm.setAttribute('bill-id', billId);
        // Add to modal or designated area in the page
        document.getElementById('billFormContainer').appendChild(billForm);
    }

    async deleteBill(billId) {
        if (confirm('Are you sure you want to delete this bill?')) {
            try {
                await fetch(`/api/bills/${billId}`, { method: 'DELETE' });
                await this.loadBills(); // Refresh the list
            } catch (error) {
                console.error('Error deleting bill:', error);
            }
        }
    }

    async sendReminder(billId) {
        try {
            const response = await fetch(`/api/bills/${billId}/send-reminder`, {
                method: 'POST'
            });
            const result = await response.json();
            alert(result.message);
        } catch (error) {
            console.error('Error sending reminder:', error);
            alert('Failed to send reminder');
        }
    }
}

customElements.define('admin-bill-management', AdminBillManagement);