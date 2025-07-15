const API_URL = 'http://localhost:5000';
let flatLinkId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get flat link ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    flatLinkId = urlParams.get('flat_id');

    if (flatLinkId) {
        loadFlatInfo();
        loadFeedback();
    } else {
        showError('No flat ID provided. Please use a valid flat link.');
    }

    // Handle feedback form submission
    document.getElementById('feedbackForm').addEventListener('submit', submitFeedback);
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

// Load feedback
async function loadFeedback() {
    try {
        const response = await fetch(`${API_URL}/api/flats/${flatLinkId}/feedback`);
        const feedback = await response.json();
        displayFeedback(feedback);
    } catch (error) {
        console.error('Error loading feedback:', error);
        showError('Failed to load feedback');
    }
}

// Display feedback
function displayFeedback(feedback) {
    const feedbackList = document.getElementById('feedbackList');
    feedbackList.innerHTML = '';

    feedback.forEach(item => {
        const feedbackItem = document.createElement('div');
        feedbackItem.className = 'feedback-item';
        feedbackItem.innerHTML = `
            <div class="feedback-header">
                <div class="feedback-rating">
                    ${generateStarRating(item.rating)}
                </div>
                <div class="feedback-date">
                    ${new Date(item.date).toLocaleDateString()}
                </div>
            </div>
            <div class="feedback-category">
                <span class="badge bg-primary">${item.category}</span>
            </div>
            <div class="feedback-content">
                ${item.content}
            </div>
            ${item.response ? `
                <div class="feedback-response">
                    <strong>Response:</strong>
                    <p>${item.response}</p>
                </div>
            ` : ''}
        `;
        feedbackList.appendChild(feedbackItem);
    });
}

// Generate star rating HTML
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars += '<i class="fas fa-star text-warning"></i>';
        } else if (i === fullStars && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt text-warning"></i>';
        } else {
            stars += '<i class="far fa-star text-warning"></i>';
        }
    }
    
    return stars;
}

// Submit feedback
async function submitFeedback(event) {
    event.preventDefault();

    const feedback = {
        rating: parseInt(document.getElementById('rating').value),
        category: document.getElementById('category').value,
        content: document.getElementById('content').value
    };

    try {
        const response = await fetch(`${API_URL}/api/flats/${flatLinkId}/feedback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedback)
        });

        if (response.ok) {
            showToast('Feedback submitted successfully');
            document.getElementById('feedbackForm').reset();
            loadFeedback();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to submit feedback');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showError('Failed to submit feedback');
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