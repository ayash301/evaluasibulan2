// Main application entry point
document.addEventListener('DOMContentLoaded', function() {
    console.log('Islamic Prayer Times App Initializing...');
    
    // Initialize all modules
    UI.init();
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    // Add offline detection
    window.addEventListener('online', function() {
        console.log('App is online');
        // You could add a notification here
    });
    
    window.addEventListener('offline', function() {
        console.log('App is offline');
        // You could add a notification here
    });
    
    console.log('Islamic Prayer Times App Ready!');
});

// Handle app installation
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Update UI to notify the user they can install the PWA
    console.log('App can be installed');
});

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});