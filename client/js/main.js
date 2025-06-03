import { Game } from './game.js';

// Global game instance
let game = null;

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Multiplayer FPS Game ===');
    console.log('Loading game...');
    
    try {
        game = new Game();
        
        // Set up menu button event listeners
        setupMenuButtons();
        
        console.log('Game initialized successfully!');
        console.log('Controls:');
        console.log('- WASD: Move');
        console.log('- Mouse: Look around');
        console.log('- Left Click: Shoot');
        console.log('- Space: Jump');
        console.log('- Tab: Show scoreboard');
        console.log('- Escape: Return to menu');
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showErrorMessage(error.message);
    }
});

// Set up menu button event listeners
function setupMenuButtons() {
    const joinServerBtn = document.getElementById('joinServerBtn');
    const startOfflineBtn = document.getElementById('startOfflineBtn');
    
    if (joinServerBtn) {
        joinServerBtn.addEventListener('click', () => {
            if (game) {
                game.joinServer();
            }
        });
    }
    
    if (startOfflineBtn) {
        startOfflineBtn.addEventListener('click', () => {
            if (game) {
                game.startOffline();
            }
        });
    }
}

// Show error message to user
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ff4444;
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 9999;
        max-width: 400px;
    `;
    errorDiv.innerHTML = `
        <h3>Game Initialization Failed</h3>
        <p>${message}</p>
        <p>Please check console for details.</p>
        <button onclick="location.reload()" style="
            background: #333;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        ">Reload Page</button>
    `;
    document.body.appendChild(errorDiv);
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (game) {
        game.stop();
    }
});

// Handle window focus/blur for performance
window.addEventListener('focus', () => {
    if (game && !game.running) {
        // Game was paused, could resume here
        console.log('Window focused');
    }
});

window.addEventListener('blur', () => {
    if (game) {
        // Could pause game here for performance
        console.log('Window blurred');
    }
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

// Export game for debugging
export { game };
