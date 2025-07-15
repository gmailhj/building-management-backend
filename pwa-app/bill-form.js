to use itadmi// Bill Form Component

import { generateBill, formatCurrency, formatDate } from './bill-management.js';

class BillForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }

                .bill-form {
                    background: var(--card-bg, #ffffff);
                    border-radius: 15px;
                    padding: 1.5rem;
                    box-shadow: var(--card-shadow, 0 4px 6px rgba(0, 0, 0, 0.1));
                }

                .form-group {
                    margin-bottom: 1rem;
                }

                label {
                    display: block;
                    margin-bottom: 0.5rem;
                    color: var(--text-color, #2b2d42);
                    font-weight: 500;
                }

                input, select {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid var(--input-border, #edf2f7);
                    border-radius: 8px;
                    background: var(--input-bg, #ffffff);
                    color: var(--text-color, #2b2d42);
                    font-size: 1rem;
                }

                input:focus, select:focus {
                    outline: none;
                    border-color: var(--primary-color, #4361ee);
                    box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
                }

                button {
                    background: linear-gradient(135deg, var(--primary-color, #4361ee), var(--secondary-color, #3f37c9));
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                button:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--hover-shadow, 0 6px 12px rgba(0, 0, 0, 0.15));
                }

                .preview {
                    margin-top: 1.5rem;
                    padding: 1rem;
                    border: 1px solid var(--border-color, #dee2e6);
                    border-radius: 8px;
                    background: var(--light-bg, #f8f9fa);
                }

                .preview h3 {
                    margin-top: 0;
                    color: var(--text-color, #2b2d42);
                }

                .preview-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                }

                .preview-label {
                    font-weight: 500;
                    color: var(--text-color, #2b2d42);
                }

                .preview-value {
                    color: var(--text-color, #2b2d42);
                }

                .total {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 2px solid var(--border-color, #dee2e6);
                    font-weight: 700;
                }
            </style>

            <div class="bill-form">
                <form id="billForm">
                    <div class="form-group">
                        <label for="month">Month</label>
                        <input type="month" id="month" required>
                    </div>

                    <div class="form-group">
                    <label for="rentAmount">Rent Amount</label>
                    <input type="number" id="rentAmount" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label for="maintenanceCharges">Maintenance Charges</label>
                    <input type="number" id="maintenanceCharges" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label for="maidCharges">Maid Charges</label>
                    <input type="number" id="maidCharges" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label for="unitsConsumed">Units Consumed</label>
                    <input type="number" id="unitsConsumed" required min="0" step="1">
                </div>
                <div class="form-group">
                    <label for="billDueDate">Electricity Bill Due Date</label>
                    <input type="date" id="billDueDate" required>

                    <div class="form-group">
                        <label for="electricityReading">Electricity Reading (Units)</label>
                        <input type="number" id="electricityReading" required min="0">
                    </div>

                    <div class="form-group">
                        <label for="ratePerUnit">Rate per Unit</label>
                        <input type="number" id="ratePerUnit" value="8" required min="0">
                    </div>

                    <div class="form-group">
                        <label for="dueDate">Due Date</label>
                        <input type="date" id="dueDate" required>
                    </div>

                    <button type="submit">Generate Bill</button>
                </form>

                <div id="preview" class="preview" style="display: none;">
                    <h3>Bill Preview</h3>
                    <div class="preview-item">
                        <span class="preview-label">Rent Amount:</span>
                        <span class="preview-value" id="previewRentAmount">₹0.00</span>
                    </div>
                    <div class="preview-item">
                        <span class="preview-label">Maintenance Charges:</span>
                        <span class="preview-value" id="previewMaintenanceCharges">₹0.00</span>
                    </div>
                    <div class="preview-item">
                        <span class="preview-label">Maid Charges:</span>
                        <span class="preview-value" id="previewMaidCharges">₹0.00</span>
                    </div>
                    <div class="preview-item">
                        <span class="preview-label">Units Consumed:</span>
                        <span class="preview-value" id="previewUnitsConsumed">0</span>
                    </div>
                    <div class="preview-item">
                        <span class="preview-label">Electricity Bill Due Date:</span>
                        <span class="preview-value" id="previewBillDueDate">-</span>
                    </div>
                    <div id="previewContent"></div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const form = this.shadowRoot.getElementById('billForm');
        form.addEventListener('submit', this.handleSubmit.bind(this));

        // Add input event listeners for real-time preview
        ['rentAmount', 'electricityReading', 'ratePerUnit'].forEach(id => {
            this.shadowRoot.getElementById(id).addEventListener('input', this.updatePreview.bind(this));
        });
    }

    async handleSubmit(event) {
        event.preventDefault();

        const formData = this.getFormData();
        try {
            const bill = await generateBill(this.getAttribute('tenant-id'), formData);
            this.dispatchEvent(new CustomEvent('billgenerated', { detail: bill }));
            this.updatePreview(bill);
        } catch (error) {
            console.error('Error generating bill:', error);
            this.dispatchEvent(new CustomEvent('error', { detail: error.message }));
        }
    }

    getFormData() {
        const [month, year] = this.shadowRoot.getElementById('month').value.split('-');
        return {
            month: parseInt(month),
            year: parseInt(year),
            rent_amount: parseFloat(this.shadowRoot.getElementById('rentAmount').value) || 0,
            maintenance_charges: parseFloat(this.shadowRoot.getElementById('maintenanceCharges').value) || 0,
            maid_charges: parseFloat(this.shadowRoot.getElementById('maidCharges').value) || 0,
            units_consumed: parseInt(this.shadowRoot.getElementById('unitsConsumed').value) || 0,
            electricity_reading: parseFloat(this.shadowRoot.getElementById('electricityReading').value) || 0,
            rate_per_unit: parseFloat(this.shadowRoot.getElementById('ratePerUnit').value) || 8,
            electricity_amount: (parseFloat(this.shadowRoot.getElementById('electricityReading').value) || 0) * (parseFloat(this.shadowRoot.getElementById('ratePerUnit').value) || 8),
            bill_due_date: this.shadowRoot.getElementById('billDueDate').value,
            due_date: this.shadowRoot.getElementById('dueDate').value
        };
    }

    updatePreview() {
        const data = this.getFormData();
        this.shadowRoot.getElementById('previewRentAmount').textContent = formatCurrency(data.rent_amount);
        this.shadowRoot.getElementById('previewMaintenanceCharges').textContent = formatCurrency(data.maintenance_charges);
        this.shadowRoot.getElementById('previewMaidCharges').textContent = formatCurrency(data.maid_charges);
        this.shadowRoot.getElementById('previewUnitsConsumed').textContent = data.units_consumed;
        this.shadowRoot.getElementById('previewBillDueDate').textContent = data.bill_due_date ? formatDate(data.bill_due_date) : '-';
        
        const total = data.rent_amount + data.maintenance_charges + data.maid_charges + (data.units_consumed * data.rate_per_unit);
        this.shadowRoot.getElementById('preview').style.display = 'block';
    }
}

customElements.define('bill-form', BillForm);