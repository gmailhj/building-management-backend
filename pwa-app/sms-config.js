// SMS Configuration Component

class SmsConfig extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadCurrentConfig();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }

                .sms-config-panel {
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
                    font-size: 1rem;
                }

                input:focus, select:focus {
                    outline: none;
                    border-color: var(--primary-color, #4361ee);
                    box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
                }

                button {
                    background: var(--primary-color, #4361ee);
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

                .test-sms-panel {
                    margin-top: 2rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--border-color, #dee2e6);
                }

                .status-message {
                    margin-top: 1rem;
                    padding: 1rem;
                    border-radius: 8px;
                }

                .status-success {
                    background: var(--success-light, #d4edda);
                    color: var(--success-dark, #155724);
                }

                .status-error {
                    background: var(--danger-light, #f8d7da);
                    color: var(--danger-dark, #721c24);
                }
            </style>

            <div class="sms-config-panel">
                <form id="smsConfigForm">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="enableSms"> Enable SMS Notifications
                        </label>
                    </div>

                    <div class="form-group">
                        <label for="provider">Provider</label>
                        <select id="provider" required>
                            <option value="twilio">Twilio</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="accountSid">Account SID</label>
                        <input type="text" id="accountSid" required placeholder="Enter your Twilio Account SID">
                    </div>

                    <div class="form-group">
                        <label for="authToken">Auth Token</label>
                        <input type="password" id="authToken" required placeholder="Enter your Twilio Auth Token">
                    </div>

                    <div class="form-group">
                        <label for="fromNumber">From Number</label>
                        <input type="text" id="fromNumber" required placeholder="Enter your Twilio phone number (e.g., +1234567890)">
                    </div>

                    <button type="submit">Save Settings</button>
                </form>

                <div class="test-sms-panel">
                    <h3>Test SMS Configuration</h3>
                    <form id="testSmsForm">
                        <div class="form-group">
                            <label for="testPhone">Phone Number</label>
                            <input type="tel" id="testPhone" required placeholder="Enter phone number (e.g., +1234567890)">
                        </div>

                        <div class="form-group">
                            <label for="testMessage">Message</label>
                            <input type="text" id="testMessage" required placeholder="Enter test message">
                        </div>

                        <button type="submit">Send Test SMS</button>
                    </form>
                    <div id="statusMessage" class="status-message" style="display: none;"></div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const form = this.shadowRoot.getElementById('smsConfigForm');
        const testForm = this.shadowRoot.getElementById('testSmsForm');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfig();
        });
        
        testForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendTestSms();
        });
    }

    async loadCurrentConfig() {
        try {
            const response = await fetch('/api/sms/config');
            if (!response.ok) throw new Error('Failed to load SMS configuration');
            
            this.config = await response.json();
            
            // Update form fields
            this.shadowRoot.getElementById('enableSms').checked = this.config.enabled;
            this.shadowRoot.getElementById('accountSid').value = this.config.twilio.account_sid;
            this.shadowRoot.getElementById('authToken').value = this.config.twilio.auth_token;
            this.shadowRoot.getElementById('fromNumber').value = this.config.twilio.from_number;
        } catch (error) {
            this.showStatus('Error loading configuration: ' + error.message, false);
        }
    }

    async saveConfig() {
        try {
            const formData = {
                enabled: this.shadowRoot.getElementById('enableSms').checked,
                provider: 'twilio',
                twilio: {
                    account_sid: this.shadowRoot.getElementById('accountSid').value,
                    auth_token: this.shadowRoot.getElementById('authToken').value,
                    from_number: this.shadowRoot.getElementById('fromNumber').value
                }
            };

            const response = await fetch('/api/sms/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Failed to save configuration');
            
            this.showStatus('SMS configuration saved successfully', true);
            this.config = formData;
        } catch (error) {
            this.showStatus('Error saving configuration: ' + error.message, false);
        }
    }

    async sendTestSms() {
        try {
            const phoneNumber = this.shadowRoot.getElementById('testPhoneNumber').value;
            const message = this.shadowRoot.getElementById('testMessage').value;

            if (!phoneNumber || !message) {
                throw new Error('Please fill in both phone number and message');
            }

            const response = await fetch('/api/sms/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send test SMS');
            }
            
            const result = await response.json();
            this.showStatus(`Test SMS sent successfully: ${result.status}`, true);
        } catch (error) {
            this.showStatus('Error sending test SMS: ' + error.message, false);
        }
    }

    showStatus(message, success) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${success ? 'status-success' : 'status-error'}`;
        statusDiv.textContent = message;
        
        const container = this.shadowRoot.querySelector('.sms-config-panel');
        container.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.remove();
        }, 5000);
    }
}

customElements.define('sms-config', SmsConfig);