/**
 * Formatting Module
 * Handles AI response formatting, rendering of markdown content,
 * code highlighting, thinking sections, and displaying search results.
 * 
 * This module centralizes all formatting-related functionality for better
 * organization and maintainability.
 * 
 * Dependencies:
 * - marked (for markdown parsing)
 * - highlight.js (for code highlighting)
 * - DOMPurify (for sanitizing HTML)
 */

/**
 * Format Blackbox AI response for better display
 * @param {string} text - The raw response text
 * @returns {string} - Formatted response text
 */
export function formatBlackboxResponse(text) {
    // Basic markdown parsing, could be enhanced
    return marked.parse(text);
}

/**
 * Render markdown content in an element
 * @param {HTMLElement} element - Element to render markdown in
 * @param {string} content - Markdown content to render
 */
export function renderMarkdownContent(element, content) {
    if (element && content) {
        element.innerHTML = DOMPurify.sanitize(marked.parse(content));
    }
}

/**
 * Updates a message element with formatted content
 * @param {HTMLElement} messageElement - The message element to update
 * @param {string} content - The content to display
 */
export function updateMessageContent(messageElement, content) {
    const messageText = messageElement.querySelector('.message-text');
    if (messageText) {
        messageText.innerHTML = DOMPurify.sanitize(marked.parse(content));
        // No highlighting call here anymore
    }
}

/**
 * Stream a response word by word to create a typing effect
 * @param {HTMLElement} messageElement - The message element to update
 * @param {string} response - The full response to stream
 */
export function streamResponse(messageElement, response) {
    updateMessageContent(messageElement, response); // Simple update for now
}

/**
 * Create a thinking section for AI responses that show reasoning
 * @param {HTMLElement} messageElement - The message element to add thinking section to
 * @returns {HTMLElement} - The created thinking section element
 */
export function createThinkingSection(messageElement) {
    const existingThinking = messageElement.querySelector('.thinking-section');
    if (existingThinking) return existingThinking;
    
    const thinkingSection = document.createElement('div');
    thinkingSection.className = 'thinking-section';
    thinkingSection.innerHTML = `
        <div class="thinking-header">
            <span class="material-symbols-outlined">psychology</span> Thinking...
        </div>
        <div class="thinking-content"></div>
    `;
    thinkingSection.style.display = 'none'; // Hidden by default
    
    const messageContent = messageElement.querySelector('.message-content') || messageElement;
    messageContent.appendChild(thinkingSection);
    return thinkingSection;
}

/**
 * Handle displaying source citations in AI responses
 * @param {HTMLElement} messageElement - The message element to add sources to
 * @param {Array} sources - Array of source objects with title, url, and snippet
 */
export function displaySourceCitations(messageElement, sources) {
    // Implementation depends on how sources are structured
    // Example: Add a list of source links
}

/**
 * Display search results in a modal
 * @param {string} resultType - Type of results ('web' or 'x')
 * @param {Object} allSearchResults - Object containing all search results
 * @param {HTMLElement} modalElement - The modal element to show results in
 * @param {HTMLElement} containerElement - Container element inside modal for results
 */
export function showSearchResults(resultType, allSearchResults, modalElement, containerElement) {
    containerElement.innerHTML = ''; // Clear previous results
    const results = resultType === 'web' ? allSearchResults.web : allSearchResults.x;
    
    if (!results || results.length === 0) {
        containerElement.innerHTML = '<p>No results found.</p>';
        modalElement.style.display = 'block';
        return;
    }
    
    // Create header
    const header = document.createElement('h3');
    header.textContent = resultType === 'web' ? 'Web Search Results' : 'X Post Results';
    containerElement.appendChild(header);
    
    // Create list
    const list = document.createElement('ul');
    list.className = 'search-results-list';
    
    results.forEach(result => {
        const item = document.createElement('li');
        item.className = 'search-result-item';
        
        if (resultType === 'web') {
            item.innerHTML = `
                <a href="${result.url}" target="_blank" class="result-title">${result.title}</a>
                <p class="result-snippet">${result.snippet}</p>
                <span class="result-url">${result.url}</span>
            `;
        } else { // X posts (assuming structure)
            item.innerHTML = `
                <p class="result-text">${result.text}</p>
                <span class="result-author">@${result.author}</span>
                <a href="${result.url}" target="_blank" class="result-link">View Post</a>
            `;
        }
        list.appendChild(item);
    });
    
    containerElement.appendChild(list);
    modalElement.style.display = 'block';
}

/**
 * Scroll the messages container to the bottom
 */
function scrollToBottom() {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
} 