/**
 * Utilities Module
 * Contains utility functions for UI operations, settings, modals and other reusable functionality
 */

/**
 * Toggle dark mode in the application
 * @param {boolean} enableDark - Whether to enable dark mode
 * @param {HTMLElement} darkModeToggle - The dark mode toggle element
 */
function toggleDarkMode(enableDark, darkModeToggle) {
    if (enableDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (darkModeToggle) darkModeToggle.checked = true;
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (darkModeToggle) darkModeToggle.checked = false;
    }
    localStorage.setItem('darkMode', enableDark);
}

/**
 * Load dark mode setting from localStorage
 * @returns {boolean} - Whether dark mode is enabled
 */
function loadDarkModeSetting() {
    return localStorage.getItem('darkMode') === 'true';
}

/**
 * Open the settings modal
 * @param {HTMLElement} settingsModal - The settings modal element
 */
function openSettingsModal(settingsModal) {
    settingsModal.style.display = 'block';
}

/**
 * Close the settings modal
 * @param {HTMLElement} settingsModal - The settings modal element
 */
function closeSettingsModal(settingsModal) {
    settingsModal.style.display = 'none';
}

/**
 * Toggle streaming mode
 * @param {boolean} isStreaming - Current streaming state
 * @param {HTMLElement} streamToggle - The streaming toggle button
 * @returns {boolean} - New streaming state
 */
function toggleStreaming(isStreaming, streamToggle) {
    const newStreamingState = !isStreaming;
    streamToggle.classList.toggle('active', newStreamingState);
    return newStreamingState;
}

/**
 * Toggle web search functionality
 * @param {boolean} isWebSearchEnabled - Current web search state
 * @param {HTMLElement} webSearchToggle - The web search toggle button
 * @returns {boolean} - New web search state
 */
function toggleWebSearch(isWebSearchEnabled, webSearchToggle) {
    const newWebSearchState = !isWebSearchEnabled;
    webSearchToggle.classList.toggle('active', newWebSearchState);
    return newWebSearchState;
}

/**
 * Toggle thinking functionality
 * @param {boolean} isThinkingEnabled - Current thinking state
 * @param {HTMLElement} thinkingToggle - The thinking toggle button
 * @returns {boolean} - New thinking state
 */
function toggleThinking(isThinkingEnabled, thinkingToggle) {
    const newThinkingState = !isThinkingEnabled;
    thinkingToggle.classList.toggle('active', newThinkingState);
    return newThinkingState;
}

/**
 * Toggle sidebar visibility
 * @param {HTMLElement} sidebar - The sidebar element
 * @param {HTMLElement} sidebarOverlay - The sidebar overlay element
 */
function toggleSidebar(sidebar, sidebarOverlay) {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
}

/**
 * Close the sidebar
 * @param {HTMLElement} sidebar - The sidebar element
 * @param {HTMLElement} sidebarOverlay - The sidebar overlay element
 */
function closeSidebar(sidebar, sidebarOverlay) {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
}

/**
 * Check screen size and adjust sidebar visibility
 * @param {HTMLElement} sidebar - The sidebar element
 */
function checkScreenSize(sidebar) {
    if (window.innerWidth <= 768) {
        // On mobile, hide sidebar by default (remove active class)
        sidebar.classList.remove('active');
    } else {
        // On desktop, make sure sidebar doesn't have the transform style that would hide it
        sidebar.style.left = '';
    }
}

/**
 * Confirm deletion of all chats
 * @param {Function} deleteAllChatsCallback - Callback function to execute on confirmation
 */
function confirmDeleteAllChats(deleteAllChatsCallback) {
    if (confirm('Are you sure you want to delete all chats? This action cannot be undone.')) {
        deleteAllChatsCallback();
    }
}

/**
 * Update Grok counters in the UI
 * @param {Object} grokRateLimits - Object containing Grok rate limits
 * @param {HTMLElement} grok2Counter - The Grok 2 counter element
 * @param {HTMLElement} grok3Counter - The Grok 3 counter element
 */
function updateGrokCounters(grokRateLimits, grok2Counter, grok3Counter) {
    if (!grok2Counter || !grok3Counter) return;
    
    // Update Grok 2 counter
    if (grokRateLimits.grok2) {
        const grok2Remaining = grokRateLimits.grok2.remaining;
        const grok2Total = grokRateLimits.grok2.total;
        grok2Counter.textContent = `${grok2Remaining}/${grok2Total}`;
        
        // Add color coding based on remaining messages
        if (grok2Remaining <= 5) {
            grok2Counter.classList.add('critical');
        } else if (grok2Remaining <= 10) {
            grok2Counter.classList.add('warning');
            grok2Counter.classList.remove('critical');
        } else {
            grok2Counter.classList.remove('warning', 'critical');
        }
    }
    
    // Update Grok 3 counter
    if (grokRateLimits.grok3) {
        const grok3Remaining = grokRateLimits.grok3.remaining;
        const grok3Total = grokRateLimits.grok3.total;
        grok3Counter.textContent = `${grok3Remaining}/${grok3Total}`;
        
        // Add color coding based on remaining messages
        if (grok3Remaining <= 5) {
            grok3Counter.classList.add('critical');
        } else if (grok3Remaining <= 10) {
            grok3Counter.classList.add('warning');
            grok3Counter.classList.remove('critical');
        } else {
            grok3Counter.classList.remove('warning', 'critical');
        }
    }
}

/**
 * Fetch Grok rate limits from the server
 * @returns {Promise<Object>} - Promise resolving to an object with Grok rate limits
 */
async function fetchGrokRateLimits() {
    try {
        const response = await fetch('/api/grok-limits');
        if (!response.ok) {
            throw new Error(`Error fetching Grok limits: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching Grok rate limits:', error);
        return null;
    }
}

// Function to update Qwen-specific controls
function updateQwenControls(isQwenModel, webSearchToggle, thinkingToggle) {
    if (webSearchToggle && thinkingToggle) {
        // Make web search and thinking toggles visible only for Qwen
        webSearchToggle.parentElement.style.display = isQwenModel ? 'inline-flex' : 'none';
        thinkingToggle.parentElement.style.display = isQwenModel ? 'inline-flex' : 'none';
    }
}

// Export functions
export {
    toggleDarkMode,
    loadDarkModeSetting,
    openSettingsModal,
    closeSettingsModal,
    toggleStreaming,
    toggleWebSearch,
    toggleThinking,
    toggleSidebar,
    closeSidebar,
    checkScreenSize,
    confirmDeleteAllChats,
    updateGrokCounters,
    fetchGrokRateLimits,
    updateQwenControls
}; 