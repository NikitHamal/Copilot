/**
 * Utility Functions Module
 * Contains reusable UI and utility functions
 */

// Dark mode functionality
export function toggleDarkMode(force, toggleElement) {
    const isDark = force !== undefined ? force : !document.body.classList.contains('dark-mode');
    
    document.body.classList.toggle('dark-mode', isDark);
    if (toggleElement) {
        toggleElement.checked = isDark;
    }
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    
    return isDark;
}

export function loadDarkModeSetting() {
    const darkModeSetting = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Use saved preference, or system preference as fallback
    return darkModeSetting === 'enabled' || (darkModeSetting === null && prefersDark);
}

// Modal functionality
export function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'flex';
}

export function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = 'none';
}

// Toggle functionality for UI elements
export function toggleStreaming(current, button) {
    const newState = !current;
    button.classList.toggle('active', newState);
    return newState;
}

export function toggleWebSearch(current, button) {
    const newState = !current;
    button.classList.toggle('active', newState);
    return newState;
}

export function toggleThinking(current, button) {
    const newState = !current;
    button.classList.toggle('active', newState);
    return newState;
}

// Sidebar functionality
export function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.toggle('active');
    if (sidebar.classList.contains('active')) {
        sidebarOverlay.style.display = 'block';
        setTimeout(() => {
            sidebarOverlay.style.opacity = '1';
        }, 10);
    } else {
        sidebarOverlay.style.opacity = '0';
        setTimeout(() => {
            sidebarOverlay.style.display = 'none';
        }, 300);
    }
}

export function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.remove('active');
    sidebarOverlay.style.opacity = '0';
    setTimeout(() => {
        sidebarOverlay.style.display = 'none';
    }, 300);
}

// Screen size checks for responsive UI
export function checkScreenSize() {
    const isMobile = window.innerWidth < 768;
    const sidebar = document.querySelector('.sidebar');
    
    if (isMobile) {
        sidebar.classList.remove('active');
    } else {
        sidebar.classList.add('active');
    }
}

// Delete confirmation
export function confirmDeleteAllChats(callback) {
    const confirmDelete = window.confirm('Are you sure you want to delete all chats? This action cannot be undone.');
    if (confirmDelete) {
        callback();
    }
}

// Update Qwen controls visibility
export function updateQwenControls(currentModel) {
    const isQwen = currentModel === 'qwen-max-latest';
    const webSearchToggle = document.getElementById('web-search-toggle');
    const thinkingToggle = document.getElementById('thinking-toggle');
    
    if (webSearchToggle) {
        webSearchToggle.style.display = isQwen ? 'flex' : 'none';
    }
    
    if (thinkingToggle) {
        thinkingToggle.style.display = isQwen ? 'flex' : 'none';
    }
} 