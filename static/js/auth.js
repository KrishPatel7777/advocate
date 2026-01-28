// ========================================
// SIMPLE AUTHENTICATION LOGIC (NO FIREBASE)
// Path: /static-js/auth.js
// ========================================

// ✅ FIXED CREDENTIALS (CHANGE THESE)
const ADMIN_EMAIL = "admin@advocate.com";
const ADMIN_PASSWORD = "adv12345";

// ========================================
// DOM ELEMENTS
// ========================================

const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');

const notificationContainer = document.getElementById('notification-container');

// ========================================
// AUTO LOGIN CHECK
// ========================================

window.addEventListener('load', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === "true") {
        console.log('✅ Already logged in, redirecting...');
        window.location.href = '/templates/dashboard.html';
    }
});

// ========================================
// LOGIN FUNCTIONALITY
// ========================================

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearNotifications();

    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();

    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    setLoading(loginBtn, true);

    setTimeout(() => {
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', email);

            showNotification('Login successful! Redirecting...', 'success');

            setTimeout(() => {
                window.location.href = '/templates/dashboard.html';
            }, 1000);
        } else {
            showNotification('Invalid email or password', 'error');
        }

        setLoading(loginBtn, false);
    }, 700);
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'success') {
    clearNotifications();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        font-size: 14px;
    `;
    notification.textContent = message;

    if (notificationContainer) {
        notificationContainer.appendChild(notification);
    } else {
        document.body.appendChild(notification);
    }

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function clearNotifications() {
    document.querySelectorAll('.notification').forEach(n => n.remove());
}

function setLoading(button, isLoading) {
    if (!button) return;

    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');

    button.disabled = isLoading;
    if (btnText) btnText.style.display = isLoading ? 'none' : 'inline';
    if (btnLoader) btnLoader.style.display = isLoading ? 'inline-flex' : 'none';
}

// ========================================
// NOTIFICATION ANIMATIONS (UNCHANGED)
// ========================================

const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
}
.notification {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
}
`;
document.head.appendChild(style);

console.log('%c🔐 Simple Authentication Loaded', 'color:#27ae60;font-size:16px;font-weight:bold;');

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(
    "https://advocate-pkyy.onrender.com/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    }
  );

  const data = await res.json();

  if (data.success) {
    alert("Login successful");
    window.location.href = "/dashboard.html";
  } else {
    alert(data.message);
  }
}
