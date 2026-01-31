// ========================================
// FIREBASE CONFIGURATION
// ========================================

// TODO: Replace with your Firebase project configuration
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
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    console.log('✅ Firebase initialized');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// ========================================
// API CONFIGURATION
// ========================================

const API_BASE_URL = '/api'; // TODO: Replace with your backend URL

// ========================================
// GLOBAL STATE
// ========================================

let currentUser = null;
let authToken = null;
let allCases = [];
let isEditMode = false;
let currentEditId = null;

// ========================================
// AUTH CHECK & INITIALIZATION
// ========================================

window.addEventListener('load', async () => {
    // Check if user is logged in
    authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'User';
    
    /*if (!authToken || !userId) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return;
    }*/
    
    // Set user name in header
    document.getElementById('userName').textContent = userName;
    
    // Verify auth state with Firebase
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            // Refresh token
            authToken = await user.getIdToken();
            localStorage.setItem('authToken', authToken);
            
            // Load cases
            await loadAllCases();
        } else {
            // User not authenticated
            localStorage.clear();
            window.location.href = 'login.html';
        }
    });
    
    // Initialize UI
    initializeUI();
});

// ========================================
// UI INITIALIZATION
// ========================================

function initializeUI() {
    // Sidebar navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            switchView(view);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Close mobile sidebar
            document.getElementById('sidebar').classList.remove('active');
        });
    });
    
    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
    
    // User dropdown
    const userBtn = document.getElementById('userBtn');
    const userDropdown = document.getElementById('userDropdown');
    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        userDropdown.classList.remove('active');
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Add case buttons
    document.getElementById('addCaseBtn').addEventListener('click', () => openCaseModal());
    document.getElementById('addCaseBtnAlt').addEventListener('click', () => openCaseModal());
    document.getElementById('quickAddCase').addEventListener('click', () => openCaseModal());
    
    // Modal controls
    document.getElementById('closeModal').addEventListener('click', closeCaseModal);
    document.getElementById('cancelBtn').addEventListener('click', closeCaseModal);
    
    // Case form submission
    document.getElementById('caseForm').addEventListener('submit', handleCaseSubmit);
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Quick action buttons
    document.getElementById('viewUpcoming').addEventListener('click', () => switchView('upcoming'));
    document.getElementById('searchCase').addEventListener('click', () => {
        switchView('cases');
        document.getElementById('searchInput').focus();
    });
}

// ========================================
// VIEW SWITCHING
// ========================================

function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    // Load data for specific view
    if (viewName === 'upcoming') {
        renderUpcomingCases();
    } else if (viewName === 'completed') {
        renderCompletedCases();
    }
}

// ========================================
// CASE MODAL FUNCTIONS
// ========================================

function openCaseModal(caseData = null) {
    const modal = document.getElementById('caseModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('caseForm');
    
    // Reset form
    form.reset();
    
    if (caseData) {
        // Edit mode
        isEditMode = true;
        currentEditId = caseData._id;
        modalTitle.textContent = 'Edit Case';
        
        document.getElementById('caseId').value = caseData._id;
        document.getElementById('clientName').value = caseData.clientName;
        document.getElementById('caseTitle').value = caseData.caseTitle;
        document.getElementById('caseDescription').value = caseData.description;
        document.getElementById('dueDate').value = caseData.dueDate.split('T')[0];
        
        document.querySelector('#submitBtn .btn-text').textContent = 'Update Case';
    } else {
        // Add mode
        isEditMode = false;
        currentEditId = null;
        modalTitle.textContent = 'Add New Case';
        document.querySelector('#submitBtn .btn-text').textContent = 'Save Case';
    }
    
    modal.classList.add('active');
}

function closeCaseModal() {
    document.getElementById('caseModal').classList.remove('active');
    isEditMode = false;
    currentEditId = null;
}

// ========================================
// CASE CRUD OPERATIONS
// ========================================

async function handleCaseSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Show loading
    btnText.style.display = 'none';
    btnLoader.style.display = 'flex';
    submitBtn.disabled = true;
    
    const caseData = {
        clientName: document.getElementById('clientName').value.trim(),
        caseTitle: document.getElementById('caseTitle').value.trim(),
        description: document.getElementById('caseDescription').value.trim(),
        dueDate: new Date(document.getElementById('dueDate').value).toISOString()
    };
    
    try {
        if (isEditMode) {
            await updateCase(currentEditId, caseData);
        } else {
            await createCase(caseData);
        }
        
        closeCaseModal();
        await loadAllCases();
    } catch (error) {
        console.error('Error saving case:', error);
        showNotification('Failed to save case. Please try again.', 'error');
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
    }
}

async function createCase(caseData) {
    const response = await fetch(`/api/cases`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(caseData)
    });
    
    if (!response.ok) {
        throw new Error('Failed to create case');
    }
    
    showNotification('Case created successfully!', 'success');
    return await response.json();
}

async function updateCase(id, caseData) {
    const response = await fetch(`/api/cases/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(caseData)
    });
    
    if (!response.ok) {
        throw new Error('Failed to update case');
    }
    
    showNotification('Case updated successfully!', 'success');
    return await response.json();
}

async function deleteCase(id) {
    if (!confirm('Are you sure you want to delete this case?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/cases/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete case');
        }
        
        showNotification('Case deleted successfully!', 'success');
        await loadAllCases();
    } catch (error) {
        console.error('Error deleting case:', error);
        showNotification('Failed to delete case. Please try again.', 'error');
    }
}

async function loadAllCases() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.classList.add('active');
    
    try {
        const response = await fetch(`/api/cases`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load cases');
        }
        
        const data = await response.json();
        allCases = data.cases || [];
        
        // Update UI
        updateDashboardStats();
        renderRecentCases();
        renderAllCases();
        
    } catch (error) {
        console.error('Error loading cases:', error);
        // Use mock data for demo purposes
        useMockData();
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// ========================================
// RENDER FUNCTIONS
// ========================================

function updateDashboardStats() {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
    
    const total = allCases.length;
    const upcoming = allCases.filter(c => new Date(c.dueDate) > now && !c.completed).length;
    const completed = allCases.filter(c => c.completed).length;
    const urgent = allCases.filter(c => {
        const dueDate = new Date(c.dueDate);
        return dueDate <= twoDaysFromNow && dueDate > now && !c.completed;
    }).length;
    
    document.getElementById('totalCases').textContent = total;
    document.getElementById('upcomingCases').textContent = upcoming;
    document.getElementById('completedCases').textContent = completed;
    document.getElementById('urgentCases').textContent = urgent;
    document.getElementById('notificationBadge').textContent = urgent;
}

function renderRecentCases() {
    const tbody = document.getElementById('recentCasesBody');
    const recentCases = allCases.slice(0, 5);
    
    if (recentCases.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="5">
                    <div class="empty-message">
                        <span class="empty-icon">📋</span>
                        <p>No cases found. Click "Add New Case" to get started.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recentCases.map(caseItem => `
        <tr>
            <td>${caseItem.clientName}</td>
            <td>${caseItem.caseTitle}</td>
            <td>${formatDate(caseItem.dueDate)}</td>
            <td><span class="status-badge ${getStatusClass(caseItem)}">${getStatus(caseItem)}</span></td>
            <td class="table-actions">
                <button class="action-btn" onclick="editCase('${caseItem._id}')" title="Edit">✏️</button>
                <button class="action-btn" onclick="deleteCase('${caseItem._id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderAllCases() {
    const tbody = document.getElementById('allCasesBody');
    
    if (allCases.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="6">
                    <div class="empty-message">
                        <span class="empty-icon">📋</span>
                        <p>No cases found.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = allCases.map(caseItem => `
        <tr>
            <td>${caseItem.clientName}</td>
            <td>${caseItem.caseTitle}</td>
            <td>${caseItem.description.substring(0, 50)}...</td>
            <td>${formatDate(caseItem.dueDate)}</td>
            <td><span class="status-badge ${getStatusClass(caseItem)}">${getStatus(caseItem)}</span></td>
            <td class="table-actions">
                <button class="action-btn" onclick="editCase('${caseItem._id}')" title="Edit">✏️</button>
                <button class="action-btn" onclick="deleteCase('${caseItem._id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderUpcomingCases() {
    const container = document.getElementById('upcomingCasesGrid');
    const now = new Date();
    const upcomingCases = allCases.filter(c => new Date(c.dueDate) > now && !c.completed);
    
    if (upcomingCases.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <span class="empty-icon">⏰</span>
                <p>No upcoming cases.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcomingCases.map(caseItem => `
        <div class="case-card">
            <h3>${caseItem.caseTitle}</h3>
            <p><strong>Client:</strong> ${caseItem.clientName}</p>
            <p><strong>Due:</strong> ${formatDate(caseItem.dueDate)}</p>
            <p>${caseItem.description}</p>
            <div class="table-actions">
                <button class="action-btn" onclick="editCase('${caseItem._id}')" title="Edit">✏️</button>
                <button class="action-btn" onclick="deleteCase('${caseItem._id}')" title="Delete">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderCompletedCases() {
    const container = document.getElementById('completedCasesGrid');
    const completedCases = allCases.filter(c => c.completed);
    
    if (completedCases.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <span class="empty-icon">✅</span>
                <p>No completed cases yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = completedCases.map(caseItem => `
        <div class="case-card">
            <h3>${caseItem.caseTitle}</h3>
            <p><strong>Client:</strong> ${caseItem.clientName}</p>
            <p><strong>Due:</strong> ${formatDate(caseItem.dueDate)}</p>
            <p>${caseItem.description}</p>
        </div>
    `).join('');
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const tbody = document.getElementById('allCasesBody');
    
    if (!searchTerm) {
        renderAllCases();
        return;
    }
    
    const filteredCases = allCases.filter(caseItem => {
        return caseItem.clientName.toLowerCase().includes(searchTerm) ||
               caseItem.caseTitle.toLowerCase().includes(searchTerm) ||
               caseItem.description.toLowerCase().includes(searchTerm);
    });
    
    if (filteredCases.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="6">
                    <div class="empty-message">
                        <span class="empty-icon">🔍</span>
                        <p>No cases found matching "${searchTerm}"</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredCases.map(caseItem => `
        <tr>
            <td>${caseItem.clientName}</td>
            <td>${caseItem.caseTitle}</td>
            <td>${caseItem.description.substring(0, 50)}...</td>
            <td>${formatDate(caseItem.dueDate)}</td>
            <td><span class="status-badge ${getStatusClass(caseItem)}">${getStatus(caseItem)}</span></td>
            <td class="table-actions">
                <button class="action-btn" onclick="editCase('${caseItem._id}')" title="Edit">✏️</button>
                <button class="action-btn" onclick="deleteCase('${caseItem._id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

function editCase(id) {
    const caseData = allCases.find(c => c._id === id);
    if (caseData) {
        openCaseModal(caseData);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function getStatus(caseItem) {
    if (caseItem.completed) return 'Completed';
    
    const now = new Date();
    const dueDate = new Date(caseItem.dueDate);
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
    
    if (dueDate <= twoDaysFromNow && dueDate > now) return 'Urgent';
    if (dueDate > now) return 'Upcoming';
    return 'Overdue';
}

function getStatusClass(caseItem) {
    const status = getStatus(caseItem);
    return status.toLowerCase();
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function handleLogout() {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed. Please try again.', 'error');
    }
}

// ========================================
// MOCK DATA FOR DEMO
// ========================================

function useMockData() {
    allCases = [
        {
            _id: '1',
            clientName: 'John Doe',
            caseTitle: 'Contract Dispute Case',
            description: 'Commercial contract breach dispute requiring immediate attention.',
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            completed: false,
            reminderSent: false
        },
        {
            _id: '2',
            clientName: 'Jane Smith',
            caseTitle: 'Property Settlement',
            description: 'Final property settlement hearing scheduled.',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            completed: false,
            reminderSent: false
        },
        {
            _id: '3',
            clientName: 'ABC Corporation',
            caseTitle: 'Employment Dispute',
            description: 'Wrongful termination case proceeding to trial.',
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            completed: false,
            reminderSent: false
        }
    ];
    
    updateDashboardStats();
    renderRecentCases();
    renderAllCases();
}
 if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                if (confirm('New version available! Reload to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });

      // Handle service worker controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  } else {
    console.warn('⚠️ Service Workers not supported in this browser');
  }

  // Request notification permission on page load
  if ('Notification' in window && 'serviceWorker' in navigator) {
    Notification.requestPermission().then((permission) => {
      console.log('Notification permission:', permission);
    });
  }

// ========================================
// ANIMATIONS CSS
// ========================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

document.addEventListener("DOMContentLoaded", () => {
  initializeUI();
});

console.log('%c📊 Advocate Dashboard Loaded', 'color: #3498db; font-size: 16px; font-weight: bold;');