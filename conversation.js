/**
 * Conversation Management Module
 * Handles the creation, storage, and management of chat conversations
 */

// Generate a unique ID for new chats
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Generate a title for a chat based on the first message
 * @param {string} firstMessage - The first message in the chat
 * @returns {string} - Generated title
 */
function generateChatTitle(firstMessage) {
    // Create a title based on first user message
    const words = firstMessage.split(' ');
    if (words.length <= 3) return firstMessage;
    return words.slice(0, 3).join(' ') + '...';
}

/**
 * Save all chats to localStorage
 * @param {Array} chats - Array of chat objects
 */
function saveChats(chats) {
    localStorage.setItem('stormy-chats', JSON.stringify(chats));
}

/**
 * Load all chats from localStorage
 * @returns {Array} - Array of chat objects, or empty array if none found
 */
function loadChats() {
    const savedChats = localStorage.getItem('stormy-chats');
    return savedChats ? JSON.parse(savedChats) : [];
}

/**
 * Create a new chat object
 * @param {string} model - The AI model to use for this chat
 * @returns {Object} - New chat object with ID, empty messages array, and model
 */
function createNewChatObject(model = null) {
    const chatId = generateId();
    return {
        id: chatId,
        title: 'New Chat',
        messages: [],
        model: model // Store the selected model
    };
}

/**
 * Add a message to a chat
 * @param {Object} chat - Chat object to add message to
 * @param {string} sender - Message sender ('user' or 'ai')
 * @param {string} content - Message content
 * @param {Object} metadata - Additional metadata for the message (optional)
 * @returns {Object} - The added message object
 */
function addMessageToChat(chat, sender, content, metadata = null) {
    const message = {
        sender,
        content: typeof content === 'string' ? content : '',
        timestamp: Date.now(),
        metadata: metadata
    };
    
    chat.messages.push(message);
    return message;
}

/**
 * Delete a chat from the chats array
 * @param {Array} chats - Array of chat objects
 * @param {string} chatId - ID of chat to delete
 * @returns {Array} - Updated array of chats
 */
function deleteChatById(chats, chatId) {
    return chats.filter(chat => chat.id !== chatId);
}

/**
 * Find a chat by ID
 * @param {Array} chats - Array of chat objects
 * @param {string} chatId - ID of chat to find
 * @returns {Object|null} - Chat object or null if not found
 */
function findChatById(chats, chatId) {
    return chats.find(chat => chat.id === chatId);
}

/**
 * Update a chat's title
 * @param {Object} chat - Chat object to update
 * @param {string} newTitle - New title for the chat
 */
function updateChatTitle(chat, newTitle) {
    if (chat) {
        chat.title = newTitle;
    }
}

/**
 * Sort chats by most recent message
 * @param {Array} chats - Array of chat objects
 * @returns {Array} - Sorted array of chats
 */
function sortChatsByRecent(chats) {
    return [...chats].sort((a, b) => {
        const aLastMessage = a.messages.length > 0 ? 
            a.messages[a.messages.length - 1].timestamp || 0 : 0;
        const bLastMessage = b.messages.length > 0 ? 
            b.messages[b.messages.length - 1].timestamp || 0 : 0;
        return bLastMessage - aLastMessage;
    });
}

/**
 * Get message history formatted for API calls
 * @param {Object} chat - Chat object
 * @param {number} limit - Maximum number of messages to include
 * @returns {Array} - Array of message objects formatted for API
 */
function getMessageHistoryForAPI(chat, limit = 10) {
    if (!chat || !chat.messages || chat.messages.length === 0) {
        return [];
    }
    
    // Get the most recent messages up to the limit
    const historyMessages = chat.messages.slice(-limit);
    
    return historyMessages
        .filter(msg => msg.content && !msg.content.includes('<div') && !msg.content.includes('typing-indicator'))
        .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));
}

/**
 * Get or create an active chat
 * This is the main entry point for chat management
 * 
 * @param {Array} chats - Array of all chats
 * @param {string|null} currentChatId - Current chat ID (if any)
 * @param {boolean} createIfNeeded - Whether to create a new chat if none exists or currentChatId is invalid
 * @param {string} model - The AI model to use if creating a new chat
 * @returns {Object} - { chatId: string, chat: Object, isNew: boolean }
 */
function getOrCreateActiveChat(chats, currentChatId = null, createIfNeeded = false, model = null) {
    // Try to find existing chat by ID
    let chat = currentChatId ? findChatById(chats, currentChatId) : null;
    
    // If we have chats but no valid active chat, use the most recent one
    if (!chat && chats.length > 0) {
        const sortedChats = sortChatsByRecent(chats);
        chat = sortedChats[0];
        currentChatId = chat.id;
        return { chatId: currentChatId, chat, isNew: false };
    }
    
    // Only create a new chat if explicitly requested
    if (!chat && createIfNeeded) {
        chat = createNewChatObject(model);
        currentChatId = chat.id;
        return { chatId: currentChatId, chat, isNew: true };
    }
    
    return { chatId: currentChatId, chat, isNew: false };
}

/**
 * Create a new chat only when a message is sent
 * @param {string} message - The message being sent
 * @param {string} model - The AI model to use
 * @param {Array} chats - Array of all chats (optional, not used but kept for compatibility)
 * @returns {Object} - { chatId: string, chat: Object }
 */
function createChatWithFirstMessage(message, model = null, chats = null) {
    const newChat = createNewChatObject(model);
    addMessageToChat(newChat, 'user', message);
    
    // Set a temporary title based on the first message
    updateChatTitle(newChat, generateChatTitle(message));
    
    return { chatId: newChat.id, chat: newChat };
}

/**
 * Save the current chat ID to localStorage
 * @param {string} chatId - The chat ID to save
 */
function saveCurrentChatId(chatId) {
    if (chatId) {
        localStorage.setItem('stormy-current-chat-id', chatId);
    }
}

/**
 * Load the current chat ID from localStorage
 * @returns {string|null} - The saved chat ID or null if none exists
 */
function loadCurrentChatId() {
    return localStorage.getItem('stormy-current-chat-id');
}

/**
 * Update the model for a chat
 * @param {Object} chat - Chat object to update
 * @param {string} model - New model for the chat
 */
function updateChatModel(chat, model) {
    if (chat) {
        chat.model = model;
    }
}

/**
 * Save the current model ID to localStorage
 * @param {string} model - The model ID to save
 */
function saveCurrentModel(model) {
    if (model) {
        localStorage.setItem('stormy-current-model', model);
    }
}

/**
 * Load the current model ID from localStorage
 * @returns {string|null} - The saved model ID or null if none exists
 */
function loadCurrentModel() {
    return localStorage.getItem('stormy-current-model');
}

// Export the functions for use in other modules
export {
    generateId,
    generateChatTitle,
    saveChats,
    loadChats,
    createNewChatObject,
    addMessageToChat,
    deleteChatById,
    findChatById,
    updateChatTitle,
    sortChatsByRecent,
    getMessageHistoryForAPI,
    getOrCreateActiveChat,
    createChatWithFirstMessage,
    saveCurrentChatId,
    loadCurrentChatId,
    updateChatModel,
    saveCurrentModel,
    loadCurrentModel
}; 