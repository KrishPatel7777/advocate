// ========================================
// FIREBASE AUTHENTICATION LOGIC
// Path: /static-js/auth.js
// ========================================

// Firebase configuration (same as dashboard.js)
const firebaseConfig = {
    apiKey: "AIzaSyD8YLh8_ZwqA9B44KaJ1sfr6DdAPPj4ADk",
    authDomain: "parshwa-shah.firebaseapp.com",  // ✅ Must end with .firebaseapp.com
    projectId: "parshwa-shah",
    storageBucket: "parshwa-shah.firebasestorage.app",
    messagingSenderId: "874465849824",
    appId: "1:874465849824:web:155bdc79036ac55608fb85"
};

// Initialize Firebase
let auth;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    console.log('✅ Firebase Authentication initialized');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// ========================================
// DOM ELEMENTS
// ========================================

// Login Form Elements
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginBtn = document.getElementById('login-btn');

// Register Form Elements
const signupForm = document.getElementById('signupForm');
const signupName = document.getElementById('signup-name');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupConfirmPassword = document.getElementById('signup-confirm-password');
const signupBtn = document.getElementById('signup-btn');

// Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
const loginFormContainer = document.getElementById('login-form');
const signupFormContainer = document.getElementById('signup-form');

// Google Sign-In Buttons
const googleLoginBtn = document.getElementById('google-login-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');

// Notification Container
const notificationContainer = document.getElementById('notification-container');

// Forgot Password
const forgotPasswordLink = document.querySelector('.forgot-password');

// ========================================
// CHECK IF ALREADY LOGGED IN
// ========================================

window.addEventListener('load', () => {
    // Check if user is already authenticated
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    if (authToken && userId) {
        // Verify with Firebase
        auth.onAuthStateChanged((user) => {
            if (user) {
                // User is authenticated, redirect to dashboard
                console.log('✅ User already logged in, redirecting...');
                window.location.href = '/templates/dashboard.html';
            } else {
                // Token expired or invalid, clear storage
                localStorage.clear();
            }
        });
    }
});

// ========================================
// TAB SWITCHING
// ========================================

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        // Remove active class from all tabs and forms
        tabBtns.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        
        // Add active class to clicked tab
        btn.classList.add('active');
        
        // Show corresponding form
        if (tabName === 'login') {
            loginFormContainer.classList.add('active');
        } else if (tabName === 'signup') {
            signupFormContainer.classList.add('active');
        }
        
        clearNotifications();
    });
});

// ========================================
// PASSWORD TOGGLE VISIBILITY
// ========================================

// Not needed for your HTML - you don't have toggle buttons

// ========================================
// LOGIN FUNCTIONALITY
// ========================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearNotifications();
    
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    
    // Validation
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    // Show loading
    setLoading(loginBtn, true);
    
    try {
        // Sign in with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
        // Store authentication data
        localStorage.setItem('authToken', idToken);
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.displayName || email.split('@')[0]);
        
        console.log('✅ Login successful');
        
        showNotification('Login successful! Redirecting...', 'success');
        
        // Request notification permission
        await requestNotificationPermission();
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/templates/dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        handleAuthError(error);
    } finally {
        setLoading(loginBtn, false);
    }
});

// ========================================
// REGISTER FUNCTIONALITY
// ========================================

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearNotifications();
    
    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();
    const confirmPassword = signupConfirmPassword.value.trim();
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    // Show loading
    setLoading(signupBtn, true);
    
    try {
        // Create user with Firebase
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile with name
        await user.updateProfile({
            displayName: name
        });
        
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
        // Store authentication data
        localStorage.setItem('authToken', idToken);
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', name);
        
        console.log('✅ Registration successful');
        
        showNotification('Account created successfully! Redirecting...', 'success');
        
        // Request notification permission
        await requestNotificationPermission();
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/templates/dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        handleAuthError(error);
    } finally {
        setLoading(signupBtn, false);
    }
});

// ========================================
// GOOGLE SIGN-IN
// ========================================

async function signInWithGoogle() {
    clearNotifications();
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const userCredential = await auth.signInWithPopup(provider);
        const user = userCredential.user;
        
        // Get Firebase ID token
        const idToken = await user.getIdToken();
        
        // Store authentication data
        localStorage.setItem('authToken', idToken);
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.displayName || user.email.split('@')[0]);
        
        console.log('✅ Google sign-in successful');
        
        showNotification('Google sign-in successful! Redirecting...', 'success');
        
        // Request notification permission
        await requestNotificationPermission();
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/templates/dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Google sign-in error:', error);
        handleAuthError(error);
    }
}

// Add event listeners for Google sign-in buttons
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', signInWithGoogle);
}

if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', signInWithGoogle);
}

// ========================================
// PASSWORD RESET
// ========================================

async function resetPassword() {
    const email = loginEmail.value.trim();
    
    if (!email) {
        showNotification('Please enter your email address first', 'error');
        loginEmail.focus();
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        showNotification('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        console.error('❌ Password reset error:', error);
        handleAuthError(error);
    }
}

// Add event listener for forgot password link
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetPassword();
    });
}

// ========================================
// NOTIFICATION PERMISSION
// ========================================

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('⚠️ This browser does not support notifications');
        return;
    }
    
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('✅ Notification permission granted');
            
            // Get FCM token if service worker is ready
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                
                // Get FCM token (you'll need to implement this with Firebase Messaging)
                // This is a placeholder - full implementation requires firebase-messaging-sw.js
                console.log('📱 Ready to receive push notifications');
            }
        } else {
            console.log('⚠️ Notification permission denied');
        }
    } catch (error) {
        console.error('❌ Notification permission error:', error);
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'success') {
    // Remove existing notifications
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
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function clearNotifications() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(n => n.remove());
}

function setLoading(button, isLoading) {
    if (!button) return;
    
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        button.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline-flex';
    } else {
        button.disabled = false;
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

function handleAuthError(error) {
    let message = 'An error occurred. Please try again.';
    
    switch (error.code) {
        case 'auth/invalid-email':
            message = 'Invalid email address';
            break;
        case 'auth/user-disabled':
            message = 'This account has been disabled';
            break;
        case 'auth/user-not-found':
            message = 'No account found with this email';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password';
            break;
        case 'auth/email-already-in-use':
            message = 'Email already registered. Please login instead.';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak. Use at least 6 characters.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Check your internet connection.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many failed attempts. Please try again later.';
            break;
        case 'auth/popup-closed-by-user':
            message = 'Sign-in popup was closed';
            break;
        case 'auth/invalid-credential':
            message = 'Invalid email or password';
            break;
        default:
            message = error.message || message;
    }
    
    showNotification(message, 'error');
}

// ========================================
// MONITOR AUTH STATE CHANGES
// ========================================

if (auth) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('👤 User authenticated:', user.email);
            try {
                const idToken = await user.getIdToken(true);
                localStorage.setItem('authToken', idToken);
            } catch (error) {
                console.error('❌ Token refresh error:', error);
            }
        } else {
            console.log('👤 No user authenticated');
        }
    });
}


// ========================================
// REFRESH TOKEN BEFORE EXPIRY
// ========================================

// Refresh Firebase token every 50 minutes (tokens expire in 1 hour)
setInterval(async () => {
    const user = auth.currentUser;
    if (user) {
        try {
            const idToken = await user.getIdToken(true);
            localStorage.setItem('authToken', idToken);
            console.log('🔄 Token refreshed');
        } catch (error) {
            console.error('❌ Token refresh error:', error);
        }
    }
}, 50 * 60 * 1000); // 50 minutes

// ========================================
// ADD NOTIFICATION ANIMATIONS
// ========================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
`;
document.head.appendChild(style);

console.log('%c🔐 Authentication Module Loaded', 'color: #27ae60; font-size: 16px; font-weight: bold;');