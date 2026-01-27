// ========================================
// PWA SERVICE WORKER REGISTRATION
// ========================================

// Check if service workers are supported
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered successfully:', registration.scope);
            })
            .catch(error => {
                console.error('❌ Service Worker registration failed:', error);
            });
    });
}

// ========================================
// INSTALL PROMPT HANDLER
// ========================================

let deferredPrompt;

// Capture the install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser install prompt
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
    
    // Show custom install button (if you add one later)
    console.log('📱 PWA Install prompt available');
    
    // Optional: Show a custom install banner
    showInstallPromotion();
});

// Function to show install promotion
function showInstallPromotion() {
    // Check if user has already dismissed the install prompt
    if (localStorage.getItem('installPromptDismissed') === 'true') {
        return;
    }
    
    // Create install banner (simple notification)
    const installBanner = document.createElement('div');
    installBanner.id = 'install-banner';
    installBanner.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2c3e50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        ">
            <p style="margin: 0 0 10px 0; font-weight: 600;">Install Advocate Reminder</p>
            <p style="margin: 0 0 15px 0; font-size: 0.9rem; opacity: 0.9;">Add to your home screen for quick access</p>
            <div style="display: flex; gap: 10px;">
                <button id="install-btn" style="
                    background: #3498db;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: 600;
                ">Install</button>
                <button id="dismiss-btn" style="
                    background: transparent;
                    color: white;
                    border: 1px solid white;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                ">Later</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(installBanner);
    
    // Install button click handler
    document.getElementById('install-btn').addEventListener('click', async () => {
        if (deferredPrompt) {
            // Show the install prompt
            deferredPrompt.prompt();
            
            // Wait for user's choice
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            
            // Clear the deferred prompt
            deferredPrompt = null;
            
            // Remove the banner
            document.getElementById('install-banner').remove();
        }
    });
    
    // Dismiss button click handler
    document.getElementById('dismiss-btn').addEventListener('click', () => {
        localStorage.setItem('installPromptDismissed', 'true');
        document.getElementById('install-banner').remove();
    });
}

// ========================================
// SMOOTH SCROLLING FOR ANCHOR LINKS
// ========================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Skip if it's just "#"
        if (href === '#') {
            e.preventDefault();
            return;
        }
        
        const target = document.querySelector(href);
        
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ========================================
// SCROLL ANIMATION ON VIEW
// ========================================

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Apply animation to feature cards and steps on page load
window.addEventListener('load', () => {
    const animatedElements = document.querySelectorAll('.feature-card, .step');
    
    animatedElements.forEach(element => {
        // Set initial state
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        // Observe the element
        observer.observe(element);
    });
});

// ========================================
// APP INSTALL STATUS DETECTION
// ========================================

window.addEventListener('appinstalled', () => {
    console.log('✅ PWA was installed successfully');
    
    // Hide install promotion
    const installBanner = document.getElementById('install-banner');
    if (installBanner) {
        installBanner.remove();
    }
    
    // Optional: Track installation analytics
    // trackInstallation();
});

// ========================================
// ONLINE/OFFLINE STATUS DETECTION
// ========================================

window.addEventListener('online', () => {
    console.log('🌐 Back online');
    showConnectionStatus('online');
});

window.addEventListener('offline', () => {
    console.log('📴 Connection lost');
    showConnectionStatus('offline');
});

function showConnectionStatus(status) {
    // Remove existing notification if any
    const existingNotif = document.getElementById('connection-notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'connection-notification';
    notification.style.cssText = `
        position: fixed;
        top: 70px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        ${status === 'online' 
            ? 'background: #27ae60;' 
            : 'background: #e74c3c;'
        }
    `;
    
    notification.textContent = status === 'online' 
        ? '✅ Back Online' 
        : '📴 You are Offline';
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ========================================
// CSS ANIMATION KEYFRAMES (INJECT DYNAMICALLY)
// ========================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
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
// CONSOLE WELCOME MESSAGE
// ========================================

console.log('%c🎯 Advocate Reminder PWA', 'color: #3498db; font-size: 20px; font-weight: bold;');
console.log('%cBuilt with ❤️ for Legal Professionals', 'color: #2c3e50; font-size: 14px;');
console.log('%cVersion: 1.0.0', 'color: #7f8c8d; font-size: 12px;');