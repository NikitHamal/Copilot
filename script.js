// Import Qwen functions
import { createQwenChat, getQwenChatCompletion, convertMessagesToQwenFormat, resetQwenChat } from './qwen.js';
// Import DuckDuckGo functions
import { fetchDuckDuckGoResponse, processDuckDuckGoStream, generateFallbackResponse } from './duckduckgo.js';
// Import Conversation functions
import { 
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
} from './conversation.js';
// Import Formatting functions
import {
    formatBlackboxResponse as formatBBResponse,
    renderMarkdownContent as renderMD,
    highlightCode as highlight,
    updateMessageContent as updateMsgContent,
    streamResponse as streamMsg,
    createThinkingSection as createThinking,
    displaySourceCitations as displaySources,
    showSearchResults as showResults
} from './formatting.js';
// Import Utility functions
import {
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
    updateGrokCounters,
    fetchGrokRateLimits,
    confirmDeleteAllChats,
    updateQwenControls
} from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const messagesContainer = document.getElementById('messages-container');
    const newChatButton = document.getElementById('new-chat-btn');
    const chatHistory = document.getElementById('chat-history');
    const currentChatTitle = document.getElementById('current-chat-title');
    const streamToggle = document.getElementById('stream-toggle');
    const customModelSelector = document.querySelector('.custom-model-selector');
    const selectedModelText = document.getElementById('selected-model');
    const modelOptions = document.querySelectorAll('.model-option');
    const grok2Counter = document.querySelector('.grok2-counter');
    const grok3Counter = document.querySelector('.grok3-counter');
    const webSearchToggle = document.getElementById('web-search-toggle');
    const thinkingToggle = document.getElementById('thinking-toggle');
    const deleteAllChatsButton = document.getElementById('delete-all-chats-btn');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const settingsButton = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Templates
    const messageTemplate = document.getElementById('message-template');
    const sourceTemplate = document.getElementById('source-template');
    const imageTemplate = document.getElementById('image-template');
    const chatHistoryItemTemplate = document.getElementById('chat-history-item-template');
    const resultCountTemplate = document.getElementById('result-count-template');

    // State
    let isStreaming = true;
    let isWebSearchEnabled = true;
    let isThinkingEnabled = true;
    let isDarkMode = loadDarkModeSetting();
    
    // Load chats from localStorage
    let chats = loadChats();
    
    // Load the saved chat ID or generate a new one
    let currentChatId = loadCurrentChatId() || null;
    
    // Get the current active chat (or use most recent, but don't create a new one)
    const { chatId, chat, isNew } = getOrCreateActiveChat(chats, currentChatId, false);
    currentChatId = chatId;
    
    // Load the saved model or use default
    let currentModel = loadCurrentModel() || "mistralai/Mistral-Small-24B-Instruct-2501";
    let isAIResponding = false; // Track if AI is currently responding
    let grokRateLimits = {
        grok2: { remaining: 30, total: 30 },
        grok3: { remaining: 30, total: 30 }
    }
    
    // Track queries and results for the current message
    let currentMessageData = {
        queries: new Set(),
        xResults: 0,
        webResults: 0
    };
    
    // Add modal-related DOM elements
    const searchResultsModal = document.getElementById('search-results-modal');
    const searchResultsContainer = document.getElementById('search-results-container');
    const closeSearchResultsButton = document.getElementById('close-search-results');

    // Store all search results for later display
    let allSearchResults = {
        x: [],
        web: []
    };
    
    // Initialize
    initApp();
    
    // Call initially to set correct state
    updateQwenControlsVisibility();
    
    // Check Grok rate limits on startup
    checkGrokRateLimits();
    
    // Set up an interval to periodically check rate limits (every 5 minutes)
    setInterval(checkGrokRateLimits, 5 * 60 * 1000);

    // Apply dark mode if it was previously enabled
    if (isDarkMode) {
        toggleDarkMode(true, darkModeToggle);
    }

    // Event listeners for model selector
    customModelSelector.addEventListener('click', () => {
        customModelSelector.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!customModelSelector.contains(e.target)) {
            customModelSelector.classList.remove('active');
        }
    });

    // Handle model option selection
    modelOptions.forEach(option => {
        option.addEventListener('click', () => {
            const modelValue = option.dataset.value;
            const modelName = option.textContent.trim().split(' ')[0] + ' ' + option.textContent.trim().split(' ')[1];
            
            // Update selected model text
            selectedModelText.textContent = modelName;
            
            // Update current model
            currentModel = modelValue;
            
            // Save the selected model
            saveCurrentModel(currentModel);
            
            // Update the model for the current chat if there is one
            const currentChat = findChatById(chats, currentChatId);
            if (currentChat) {
                updateChatModel(currentChat, currentModel);
                saveChats(chats);
            }
            
            // Update selected class
            modelOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            // Close dropdown
            customModelSelector.classList.remove('active');
            
            // If model is Qwen and this is a new chat, create a Qwen chat
            if (currentModel === 'qwen-max-latest') {
                const currentChat = findChatById(chats, currentChatId);
                if (currentChat && currentChat.messages.length === 0) {
                    // Reset the Qwen chat ID when selecting the model for a new chat
                    resetQwenChat();
                }
            }
            
            // Update Qwen-specific controls
            updateQwenControlsVisibility();
            
            // Mark first option as selected initially
            if (!document.querySelector('.model-option.selected')) {
                modelOptions[0].classList.add('selected');
            }
            
            console.log('Model changed to:', currentModel);
            
            // Update welcome message if on empty chat
            updateWelcomeMessageIfNeeded();
        });
    });
    
    // Mark first option as selected initially
    modelOptions[0].classList.add('selected');

    // Event listeners
    messageInput.addEventListener('keydown', handleInputKeydown);
    sendButton.addEventListener('click', sendMessage);
    newChatButton.addEventListener('click', createNewChat);
    streamToggle.addEventListener('click', handleToggleStreaming);
    webSearchToggle.addEventListener('click', handleToggleWebSearch);
    thinkingToggle.addEventListener('click', handleToggleThinking);
    deleteAllChatsButton.addEventListener('click', handleConfirmDeleteAllChats);
    sidebarToggle.addEventListener('click', handleToggleSidebar);
    sidebarOverlay.addEventListener('click', handleCloseSidebar);
    settingsButton.addEventListener('click', handleOpenSettingsModal);
    closeSettingsButton.addEventListener('click', handleCloseSettingsModal);
    darkModeToggle.addEventListener('change', handleToggleDarkMode);
    
    // Auto-resize textarea as user types
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = (messageInput.scrollHeight) + 'px';
    });

    // Handle sidebar visibility based on screen size
    window.addEventListener('resize', handleCheckScreenSize);
    
    // Check screen size on load
    handleCheckScreenSize();

    function updateWelcomeMessageIfNeeded() {
        const currentChat = findChatById(chats, currentChatId);
        if (currentChat && currentChat.messages.length === 0) {
            const modelName = selectedModelText.textContent;
            messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <h1>Stormy</h1>
                    <p>Using ${modelName}</p>
                </div>
            `;
        }
    }

    // Functions
    function initApp() {
        renderChatHistory();
        
        // Set the UI to show the selected model
        setInitialModelSelection();
        
        // If we have a valid chat ID, load that chat
        if (currentChatId) {
            loadChat(currentChatId);
            // Save the current chat ID to localStorage to persist across page refreshes
            saveCurrentChatId(currentChatId);
        } else {
            // Show the welcome message without creating a chat
            showWelcomeMessage();
        }
    }

    function setInitialModelSelection() {
        // Find the model option that matches the current model
        const matchingOption = Array.from(modelOptions).find(option => 
            option.dataset.value === currentModel
        );
        
        if (matchingOption) {
            // Set the selected option UI
            modelOptions.forEach(opt => opt.classList.remove('selected'));
            matchingOption.classList.add('selected');
            
            // Set the display text
            const modelName = matchingOption.textContent.trim().split(' ')[0] + ' ' + 
                              matchingOption.textContent.trim().split(' ')[1];
            selectedModelText.textContent = modelName;
        } else {
            // Default to the first option if the saved model isn't found
            modelOptions[0].classList.add('selected');
            const firstModelName = modelOptions[0].textContent.trim().split(' ')[0] + ' ' + 
                                  modelOptions[0].textContent.trim().split(' ')[1];
            selectedModelText.textContent = firstModelName;
            currentModel = modelOptions[0].dataset.value;
        }
        
        // Update Qwen-specific controls based on selected model
        updateQwenControlsVisibility();
    }

    function showWelcomeMessage() {
        // Get current model name from selected model text
        const modelName = selectedModelText.textContent;
        
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h1>Stormy</h1>
                <p>Using ${modelName}</p>
            </div>
        `;
        
        // Clear the chat title since we don't have an active chat
        currentChatTitle.textContent = 'New Chat';
    }

    function handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey && !isAIResponding) {
            e.preventDefault();
            sendMessage();
        }
    }

    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message || isAIResponding) return;
        
        // If there's no current chat, create one with this message
        if (!currentChatId || !findChatById(chats, currentChatId)) {
            const { chatId, chat } = createChatWithFirstMessage(message, currentModel);
            chats.push(chat);
            currentChatId = chatId;
            saveCurrentChatId(currentChatId);
            
            // Update the UI
            renderChatHistory();
            currentChatTitle.textContent = chat.title;
        }

        // Clear welcome message if visible
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // Add user message
        addMessage('user', message);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Scroll to bottom
        scrollToBottom();

        // Process with AI
        processWithAI(message);

        // Save chat
        saveChat();
    }

    async function fetchGrokResponse(message, chat) {
        try {
            // For Grok, we'll use our proxy API
            const proxyApiUrl = '/api/grok';
            
            // Determine which Grok model to use
            const isGrok3 = currentModel === 'grok-next';
            const grokModel = isGrok3 ? "grok-next" : "grok-latest";
            
            // Prepare the request body for Grok
            const grokRequestBody = {
                temporary: false,
                modelName: grokModel,
                message: message,
                fileAttachments: [],
                imageAttachments: [],
                disableSearch: false,
                enableImageGeneration: true,
                returnImageBytes: false,
                returnRawGrokInXaiRequest: false,
                enableImageStreaming: true,
                imageGenerationCount: 2,
                forceConcise: false,
                toolOverrides: {},
                enableSideBySide: true,
                sendFinalMetadata: true,
                isReasoning: false,
                webpageUrls: [],
                disableTextFollowUps: true
            };
            
            // Send the request directly to our proxy server
            const response = await fetch(proxyApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grokRequestBody,
                    isGrok3
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Grok API request failed with status ${response.status}`);
            }
            
            // After successful response, update the rate limits
            setTimeout(() => checkGrokRateLimits(), 2000);
            
            return response;
        } catch (error) {
            console.error('Error fetching Grok response:', error);
            return null;
        }
    }

    async function fetchBlackboxResponse(message, chat) {
        try {
            // Get message history using the utility function from conversation.js
            let messages = getMessageHistoryForAPI(chat, 10);
            
            // Add the current message if not already in the history
            if (!messages.length || messages[messages.length - 1]?.role !== 'user' || 
                messages[messages.length - 1]?.content !== message) {
                messages.push({
                    role: 'user',
                    content: message
                });
            }
            
            // Call our Node.js server API for Blackbox
            const apiUrl = '/api/blackbox';
            
            // Make the request
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    messages,
                    agentMode: {
                        name: "DeepSeek-R1",
                        id: "deepseek-reasoner",
                        mode: true
                    }
                }),
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            return response;
        } catch (error) {
            console.error('Error fetching Blackbox AI response:', error);
            return null;
        }
    }

    async function processWithAI(message) {
        // Set responding state to true
        isAIResponding = true;
        // Disable input and button while AI is responding
        messageInput.disabled = true;
        sendButton.disabled = true;
        sendButton.classList.add('disabled');
        
        // Reset the current message data
        currentMessageData = {
            queries: new Set(),
            xResults: 0,
            webResults: 0
        };
        
        // Clear welcome message if visible
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        // Start AI response with loading indicator
        const aiMessageElement = addMessage('ai', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
        
        // Get current chat to determine context
        const currentChat = findChatById(chats, currentChatId);
        
        try {
            let response;
            
            // For Qwen model, use the Qwen module functions
            if (currentModel === 'qwen-max-latest') {
                try {
                    // Get previous messages for context
                    let previousMessages = [];
                    if (currentChat && currentChat.messages.length > 0) {
                        // Convert messages to Qwen format
                        previousMessages = convertMessagesToQwenFormat(
                            currentChat.messages,
                            isWebSearchEnabled,
                            isThinkingEnabled
                        );
                        
                        // Remove the last message if it's from the user (to avoid duplication)
                        if (previousMessages.length > 0 && 
                            previousMessages[previousMessages.length - 1].role === 'user') {
                            previousMessages.pop();
                        }
                    }
                    
                    // Get completion and update UI in a streaming fashion
                    const fullResponse = await getQwenChatCompletion(
                        message,
                        previousMessages,
                        isWebSearchEnabled,
                        isThinkingEnabled,
                        isStreaming,
                        (text) => {
                            if (isStreaming) {
                                updateMsgContent(aiMessageElement, text);
                            }
                        }
                    );
                    
                    // Ensure the complete response is displayed
                    if (!isStreaming || fullResponse) {
                        updateMsgContent(aiMessageElement, fullResponse || "Sorry, I couldn't generate a response.");
                    }
                    
                    // Save the chat
                    saveChat();
                    return;
                } catch (error) {
                    console.error('Error processing Qwen response:', error);
                    updateMsgContent(aiMessageElement, "I'm sorry, I encountered an error while working with Qwen Max. Please try again later.");
                    saveChat();
                    return;
                }
            }
            
            // Check which model is selected and call the appropriate API for other models
            if (currentModel === 'grok-latest' || currentModel === 'grok-next') {
                // Use Grok API
                response = await fetchGrokResponse(message, currentChat);
            } else if (currentModel === 'blackbox-deepseek-r1') {
                // Use Blackbox API
                response = await fetchBlackboxResponse(message, currentChat);
            } else {
                // Use default API for other models (DuckDuckGo)
                response = await fetchDuckDuckGoResponse(message, currentChat, currentModel);
            }
            
            // If API call failed, fall back to mock responses
            if (!response) {
                const mockResponse = generateFallbackResponse(message);
                updateMsgContent(aiMessageElement, mockResponse);
            } else {
                // Check if we're handling a response from DuckDuckGo or another API
                if (currentModel !== 'grok-latest' && currentModel !== 'grok-next' && currentModel !== 'blackbox-deepseek-r1') {
                    // For DuckDuckGo responses, use the dedicated stream processor
                    const fullResponse = await processDuckDuckGoStream(
                        response.body,
                        isStreaming ? (text) => updateMsgContent(aiMessageElement, text) : null
                    );
                    
                    // Ensure complete response is displayed
                    if (!isStreaming || !fullResponse) {
                        updateMsgContent(aiMessageElement, fullResponse || "Sorry, I couldn't generate a response.");
                    }
                } else {
                    // Handle streaming response for other APIs (Grok, Blackbox)
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let fullResponse = '';
                    let buffer = ''; // Buffer for incomplete chunks
                    let webResults = [];
                    let xResults = [];
                    
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        // Decode the received chunk
                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;
                        
                        // Split by newlines and process complete lines
                        const lines = buffer.split('\n');
                        // Keep the last line in the buffer as it might be incomplete
                        buffer = lines.pop() || '';
                        
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.substring(6);
                                
                                // Skip keep-alive messages and [DONE] message
                                if (data === '[DONE]' || data === '') continue;
                                
                                try {
                                    const jsonData = JSON.parse(data);
                                    
                                    // Handle different response structures based on the model
                                    if (currentModel === 'grok-latest' || currentModel === 'grok-next') {
                                        // Handle Grok response format
                                        if (jsonData.result && jsonData.result.response) {
                                            // For token-based streaming from Grok
                                            if (jsonData.result.response.token !== undefined) {
                                                fullResponse += jsonData.result.response.token;
                                                
                                                if (isStreaming) {
                                                    updateMsgContent(aiMessageElement, fullResponse);
                                                }
                                            }
                                            
                                            // Handle query actions when they appear
                                            if (jsonData.result.response.queryAction) {
                                                const queryAction = jsonData.result.response.queryAction;
                                                console.log('Query action:', queryAction.query, queryAction.type);
                                                
                                                // Add to the set of queries for this message
                                                currentMessageData.queries.add(queryAction.query);
                                                
                                                // Update the query actions display in the UI
                                                updateQueryActionsDisplay(aiMessageElement);
                                            }
                                            
                                            // Handle X/Twitter search results
                                            if (jsonData.result.response.xSearchResults && 
                                                jsonData.result.response.xSearchResults.results && 
                                                jsonData.result.response.xSearchResults.results.length > 0) {
                                                
                                                // Store X results for later processing
                                                xResults = jsonData.result.response.xSearchResults.results;
                                                
                                                // Update the count of X results
                                                currentMessageData.xResults = xResults.length;
                                                
                                                // Update the results summary in the UI
                                                updateResultsSummary(aiMessageElement);
                                            }

                                            // Handle Web search results (can appear before modelResponse)
                                            if (jsonData.result.response.webSearchResults && 
                                                jsonData.result.response.webSearchResults.results && 
                                                jsonData.result.response.webSearchResults.results.length > 0) {
                                                
                                                // Store web results for later processing
                                                webResults = jsonData.result.response.webSearchResults.results;
                                                
                                                // Update the count of web results
                                                currentMessageData.webResults = webResults.length;
                                                
                                                // Update the results summary in the UI
                                                updateResultsSummary(aiMessageElement);
                                            }
                                            
                                            // For complete response from Grok (final message with full content)
                                            if (jsonData.result.response.modelResponse) {
                                                fullResponse = jsonData.result.response.modelResponse.message;
                                                updateMsgContent(aiMessageElement, fullResponse);
                                                
                                                // Handle web search results if available *within* modelResponse (redundancy check)
                                                if (!webResults.length && // Only if we didn't get them earlier
                                                    jsonData.result.response.modelResponse.webSearchResults && 
                                                    jsonData.result.response.modelResponse.webSearchResults.results && 
                                                    jsonData.result.response.modelResponse.webSearchResults.results.length > 0) {
                                                    
                                                    webResults = jsonData.result.response.modelResponse.webSearchResults.results;
                                                    currentMessageData.webResults = webResults.length;
                                                    updateResultsSummary(aiMessageElement);
                                                }
                                                
                                                // Now display both X results and web results together if we have any
                                                if (xResults.length > 0 || webResults.length > 0) {
                                                    displaySearchResults(aiMessageElement, xResults, webResults);
                                                }
                                                
                                                // Handle X posts if available
                                                if (jsonData.result.response.modelResponse.xposts && 
                                                    jsonData.result.response.modelResponse.xposts.length > 0) {
                                                    
                                                    // Add these to X results if we don't have other X results
                                                    if (xResults.length === 0) {
                                                        xResults = jsonData.result.response.modelResponse.xposts.map(post => ({
                                                            username: post.username,
                                                            postId: post.postId,
                                                            text: post.text
                                                        }));
                                                        
                                                        currentMessageData.xResults = xResults.length;
                                                        updateResultsSummary(aiMessageElement);
                                                        
                                                        // Display the updated results
                                                        if (xResults.length > 0 || webResults.length > 0) {
                                                            displaySearchResults(aiMessageElement, xResults, webResults);
                                                        }
                                                    }
                                                }
                                                
                                                // Handle generated images if available
                                                if (jsonData.result.response.modelResponse.generatedImageUrls && 
                                                    jsonData.result.response.modelResponse.generatedImageUrls.length > 0) {
                                                    const imagesContainer = aiMessageElement.querySelector('.message-images');
                                                    imagesContainer.innerHTML = '';
                                                    
                                                    jsonData.result.response.modelResponse.generatedImageUrls.forEach(imageUrl => {
                                                        const imageElement = document.importNode(imageTemplate.content, true);
                                                        const imgElement = imageElement.querySelector('.ai-image');
                                                        imgElement.src = imageUrl;
                                                        imagesContainer.appendChild(imageElement);
                                                    });
                                                }
                                            }
                                        }
                                    }
                                } catch (e) {
                                    // Silent fail for parsing errors - this is expected with partial chunks
                                    
                                    // Direct string handling for Blackbox (non-JSON responses)
                                    if (currentModel === 'blackbox-deepseek-r1') {
                                        // Skip parsing as JSON and handle the raw string directly
                                        const rawData = data.trim();
                                        
                                        // Check for thinking tags
                                        if (rawData.includes('<think>')) {
                                            // Start of thinking section
                                            const thinkingElement = aiMessageElement.querySelector('.thinking-section') || 
                                                handleCreateThinkingSection(aiMessageElement);
                                            
                                            // Extract content after <think> tag
                                            const thinkContent = rawData.replace('<think>', '').trim();
                                            if (thinkContent) {
                                                thinkingElement.querySelector('.thinking-content').innerHTML += thinkContent + '<br>';
                                                // Show the thinking section since we have content
                                                thinkingElement.style.display = 'block';
                                            }
                                        }
                                        else if (rawData.includes('</think>')) {
                                            // End of thinking section
                                            const thinkingElement = aiMessageElement.querySelector('.thinking-section');
                                            if (thinkingElement) {
                                                const thinkContent = rawData.replace('</think>', '').trim();
                                                if (thinkContent) {
                                                    thinkingElement.querySelector('.thinking-content').innerHTML += thinkContent;
                                                }
                                                
                                                // Only show the thinking section if it has content
                                                const thinkingContentEl = thinkingElement.querySelector('.thinking-content');
                                                if (thinkingContentEl.textContent.trim()) {
                                                    thinkingElement.style.display = 'block';
                                                } else {
                                                    thinkingElement.style.display = 'none';
                                                }
                                            }
                                        }
                                        // Skip the [DONE] signal
                                        else if (rawData.includes('[DONE]')) {
                                            // Do nothing for [DONE]
                                        }
                                        // For regular content (not thinking and not DONE)
                                        else if (rawData && !rawData.includes('[DONE]')) {
                                            // Add the actual response content
                                            fullResponse += rawData;
                                            
                                            if (isStreaming) {
                                                // Format the response for better readability
                                                const formattedResponse = handleFormatBlackboxResponse(fullResponse);
                                                // Update UI with the current text
                                                updateMsgContent(aiMessageElement, formattedResponse);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    // Ensure the complete response is displayed
                    if (!isStreaming || fullResponse) {
                        updateMsgContent(aiMessageElement, fullResponse || "Sorry, I couldn't generate a response.");
                    }
                    
                    // Make sure the query actions and results summary are visible after the response is complete
                    updateQueryActionsDisplay(aiMessageElement);
                    updateResultsSummary(aiMessageElement);
                    
                    // Final display of search results
                    if (xResults.length > 0 || webResults.length > 0) {
                        displaySearchResults(aiMessageElement, xResults, webResults);
                    }
                }
            }
            
            // Update chat title if it's a new chat
            if (currentChat.messages.length <= 2) {
                const newTitle = generateChatTitle(message);
                updateChatTitle(currentChat, newTitle);
                currentChatTitle.textContent = newTitle;
                renderChatHistory();
            }
            
        } catch (error) {
            console.error('Error processing message with AI:', error);
            updateMsgContent(aiMessageElement, "I'm sorry, but I encountered an error while processing your request. Please try again later.");
        } finally {
            // Re-enable input and button when AI is done responding
            isAIResponding = false;
            messageInput.disabled = false;
            sendButton.disabled = false;
            sendButton.classList.remove('disabled');
        }
        
        // Save chat
        saveChat();
    }

    function streamResponse(messageElement, response) {
        // Call the imported streamResponse function from formatting.js
        if (messageElement && response) {
            streamMsg(messageElement, response);
        }
    }

    function updateMessageContent(messageElement, content) {
        // Call the imported updateMessageContent function from formatting.js
        if (messageElement && content) {
            updateMsgContent(messageElement, content);
        }
    }

    function handleHighlightCode(element) {
        // Call the imported highlightCode function from formatting.js
        if (element) {
            highlight(element);
        }
    }

    function addMessage(sender, content) {
        // Clone message template
        const messageElement = document.importNode(messageTemplate.content, true).querySelector('.message');
        
        // Set avatar and styling based on sender
        const avatarIcon = messageElement.querySelector('.avatar-icon');
        if (sender === 'user') {
            avatarIcon.textContent = 'person';
            messageElement.classList.add('user-message');
            
            // Hide query actions and results summary for user messages
            messageElement.querySelector('.query-actions').style.display = 'none';
            messageElement.querySelector('.results-summary').style.display = 'none';
        } else {
            avatarIcon.textContent = 'smart_toy';
            messageElement.classList.add('ai-message');
            
            // Hide query actions for all bot messages
            messageElement.querySelector('.query-actions').style.display = 'none';
        }
        
        // Set message content
        const messageContent = messageElement.querySelector('.message-text');
        if (typeof content === 'string') {
            messageContent.innerHTML = DOMPurify.sanitize(marked.parse(content));
            handleHighlightCode(messageContent);
        } else {
            // For HTML content (like loading indicator)
            messageContent.innerHTML = content;
        }
        
        // Add message to DOM
        messagesContainer.appendChild(messageElement);
        
        // Update chat data
        const currentChat = findChatById(chats, currentChatId);
        if (currentChat) {
            // Add message to chat using addMessageToChat from conversation.js
            addMessageToChat(currentChat, sender, typeof content === 'string' ? content : '', 
                sender === 'ai' ? {
                    queries: Array.from(currentMessageData.queries),
                    xResults: currentMessageData.xResults,
                    webResults: currentMessageData.webResults,
                    // Store the actual results for persistence
                    webSearchResults: allSearchResults.web, 
                    xSearchResults: allSearchResults.x
                } : null
            );
            // Save the chat immediately after adding the message
            saveChat();
        }
        
        return messageElement;
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function createNewChat() {
        // Update UI to show the welcome message without creating a new chat object
        showWelcomeMessage();
        
        // Clear the current chat ID
        currentChatId = null;
        saveCurrentChatId(null);
        
        // Update chat history UI
        renderChatHistory();
    }

    function loadChat(chatId) {
        const chat = findChatById(chats, chatId);
        if (!chat) return;
        
        currentChatId = chatId;
        saveCurrentChatId(chatId); // Save the current chat ID to localStorage
        currentChatTitle.textContent = chat.title;
        
        // If the chat has a saved model, use it
        if (chat.model) {
            currentModel = chat.model;
            saveCurrentModel(currentModel);
            setInitialModelSelection();
        }
        
        // Clear messages container
        messagesContainer.innerHTML = '';
        
        // If empty chat, show welcome message
        if (chat.messages.length === 0) {
            showWelcomeMessage();
            return;
        }
        
        // Render messages
        chat.messages.forEach(message => {
            const messageElement = addMessage(message.sender, message.content);
            
            // If this is an AI message with metadata, restore the UI elements
            if (message.sender === 'ai' && message.metadata) {
                // Update currentMessageData for this message
                currentMessageData = {
                    queries: new Set(message.metadata.queries || []),
                    xResults: message.metadata.xResults || 0,
                    webResults: message.metadata.webResults || 0
                };
                
                // Update the UI elements
                updateQueryActionsDisplay(messageElement);
                updateResultsSummary(messageElement);
                
                // Recalculate if we should hide query actions
                if (currentMessageData.queries.size === 0) {
                    messageElement.querySelector('.query-actions').style.display = 'none';
                }
                
                // Recalculate if we should hide results summary
                if (currentMessageData.xResults === 0 && currentMessageData.webResults === 0) {
                    messageElement.querySelector('.results-summary').style.display = 'none';
                }
                
                // If message has web or X results, restore them in allSearchResults
                if (message.metadata.webResults > 0 && message.metadata.webSearchResults) {
                    allSearchResults.web = message.metadata.webSearchResults;
                }
                
                if (message.metadata.xResults > 0 && message.metadata.xSearchResults) {
                    allSearchResults.x = message.metadata.xSearchResults;
                }
            }
        });
        
        // Reset currentMessageData after loading
        currentMessageData = {
            queries: new Set(),
            xResults: 0,
            webResults: 0
        };
        
        // Scroll to bottom after loading
        setTimeout(scrollToBottom, 100);
    }

    function renderChatHistory() {
        chatHistory.innerHTML = '';
        
        // Sort chats by most recent first using sortChatsByRecent from conversation.js
        const sortedChats = sortChatsByRecent(chats);
        
        if (sortedChats.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-history';
            emptyState.textContent = 'No conversations yet';
            chatHistory.appendChild(emptyState);
            return;
        }
        
        sortedChats.forEach(chat => {
            const historyItem = document.importNode(chatHistoryItemTemplate.content, true).querySelector('.history-item');
            const titleElement = historyItem.querySelector('.history-item-title');
            const deleteButton = historyItem.querySelector('.delete-chat-btn');
            
            titleElement.textContent = chat.title || 'New Chat';
            historyItem.dataset.chatId = chat.id;
            
            if (chat.id === currentChatId) {
                historyItem.classList.add('active');
            }
            
            titleElement.addEventListener('click', () => {
                loadChat(chat.id);
                
                // Update active state
                document.querySelectorAll('.history-item').forEach(item => {
                    item.classList.remove('active');
                });
                historyItem.classList.add('active');
            });
            
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Add confirmation
                if (confirm('Are you sure you want to delete this chat?')) {
                    deleteChat(chat.id);
                }
            });
            
            chatHistory.appendChild(historyItem);
        });
    }

    function deleteChat(chatId) {
        // Use deleteChatById from conversation.js
        chats = deleteChatById(chats, chatId);
        saveChats(chats);
        
        if (chatId === currentChatId) {
            if (chats.length > 0) {
                loadChat(chats[0].id);
            } else {
                createNewChat();
            }
        }
        
        renderChatHistory();
    }

    function handleToggleStreaming() {
        isStreaming = toggleStreaming(isStreaming, streamToggle);
    }

    function saveChat() {
        saveChats(chats);
    }

    // Function to check Grok rate limits
    async function checkGrokRateLimits() {
        try {
            const data = await fetchGrokRateLimits();
            
            if (data && data.limits) {
                // Update local state
                if (data.limits.grok2) {
                    grokRateLimits.grok2 = data.limits.grok2;
                    console.log(`Grok 2 remaining: ${data.limits.grok2.remaining}/${data.limits.grok2.total}`);
                }
                if (data.limits.grok3) {
                    grokRateLimits.grok3 = data.limits.grok3;
                    console.log(`Grok 3 remaining: ${data.limits.grok3.remaining}/${data.limits.grok3.total}`);
                }
                
                // If there was an error message but we still got limits, log it
                if (data.error) {
                    console.warn('Rate limit warning:', data.error);
                }
                
                // Update UI
                handleUpdateGrokCounters();
            }
        } catch (error) {
            console.error('Error fetching Grok rate limits:', error);
            
            // Fallback values if we can't fetch them
            grokRateLimits = {
                grok2: { remaining: '?', total: 30 },
                grok3: { remaining: '?', total: 30 }
            };
            handleUpdateGrokCounters();
        }
    }
    
    // Function to update the Grok message counters in the UI
    function handleUpdateGrokCounters() {
        updateGrokCounters(grokRateLimits, grok2Counter, grok3Counter);
    }

    // Function to update the query actions display
    function updateQueryActionsDisplay(messageElement) {
        // Since we want to hide query actions for all models, this function won't actually display anything
        const queryActionsContainer = messageElement.querySelector('.query-actions');
        if (!queryActionsContainer) return;
        
        // Always keep query actions hidden regardless of content
        queryActionsContainer.style.display = 'none';
        
        // Still populate the content in case we need it later, but keep it hidden
        if (currentMessageData.queries.size > 0) {
            const queriesArray = Array.from(currentMessageData.queries);
            queryActionsContainer.innerHTML = `Searched for: "${queriesArray.join('", "')}"`;
        } else {
            queryActionsContainer.innerHTML = '';
        }
    }
    
    // Function to update the results summary display (X posts and web pages count)
    function updateResultsSummary(messageElement) {
        const resultsSummaryContainer = messageElement.querySelector('.results-summary');
        if (!resultsSummaryContainer) return;
        
        resultsSummaryContainer.innerHTML = '';
        
        // Add X results count if we have any
        if (currentMessageData.xResults > 0) {
            const xCountElement = document.importNode(resultCountTemplate.content, true);
            const countElement = xCountElement.querySelector('.result-count');
            const iconElement = xCountElement.querySelector('.avatar-icon');
            const textElement = xCountElement.querySelector('.count-text');
            
            countElement.classList.add('x-count');
            countElement.dataset.resultType = 'x';
            iconElement.textContent = 'chat';
            textElement.textContent = `${currentMessageData.xResults} X posts`;
            
            // Add click event listener
            countElement.addEventListener('click', () => {
                handleShowSearchResults('x');
            });
            
            resultsSummaryContainer.appendChild(xCountElement);
        }
        
        // Add web results count if we have any
        if (currentMessageData.webResults > 0) {
            const webCountElement = document.importNode(resultCountTemplate.content, true);
            const countElement = webCountElement.querySelector('.result-count');
            const iconElement = webCountElement.querySelector('.avatar-icon');
            const textElement = webCountElement.querySelector('.count-text');
            
            countElement.classList.add('web-count');
            countElement.dataset.resultType = 'web';
            iconElement.textContent = 'language';
            textElement.textContent = `${currentMessageData.webResults} web pages`;
            
            // Add click event listener
            countElement.addEventListener('click', () => {
                handleShowSearchResults('web');
            });
            
            resultsSummaryContainer.appendChild(webCountElement);
        }
    }

    // Function to display search results (both X and web)
    function displaySearchResults(messageElement, xResults, webResults) {
        // Store all results in our global variable for later viewing in modal
        allSearchResults.x = xResults || [];
        allSearchResults.web = webResults || [];
        
        // We're not displaying these in the message anymore, as they'll be shown in the modal when clicked
        // Instead just update the counts that will be clickable
        updateResultsSummary(messageElement);
    }

    // Function to show the search results modal with either web or X results
    function handleShowSearchResults(resultType) {
        // Call the imported showSearchResults function from formatting.js
        if (resultType) {
            showResults(resultType, allSearchResults, searchResultsModal, searchResultsContainer);
        }
    }

    // Event listener for close button
    closeSearchResultsButton.addEventListener('click', () => {
        searchResultsModal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    document.addEventListener('click', (e) => {
        if (e.target === searchResultsModal) {
            searchResultsModal.style.display = 'none';
        }
    });

    function handleToggleWebSearch() {
        isWebSearchEnabled = toggleWebSearch(isWebSearchEnabled, webSearchToggle);
    }
    
    function handleToggleThinking() {
        isThinkingEnabled = toggleThinking(isThinkingEnabled, thinkingToggle);
    }
    
    // Function to check screen size and adjust sidebar
    function handleCheckScreenSize() {
        checkScreenSize(sidebar);
    }
    
    // Function to toggle sidebar on mobile
    function handleToggleSidebar() {
        toggleSidebar(sidebar, sidebarOverlay);
    }
    
    // Function to close sidebar
    function handleCloseSidebar() {
        closeSidebar(sidebar, sidebarOverlay);
    }
    
    // Function to confirm and delete all chats
    function handleConfirmDeleteAllChats() {
        confirmDeleteAllChats(deleteAllChats);
    }
    
    // Function to delete all chats
    function deleteAllChats() {
        // Clear chats array
        chats = [];
        
        // Save empty chats to localStorage
        saveChats(chats);
        
        // Create a new chat
        createNewChat();
        
        // Render empty chat history
        renderChatHistory();
        
        console.log('All chats deleted');
    }

    // Functions for settings and dark mode
    function handleOpenSettingsModal() {
        openSettingsModal(settingsModal);
    }
    
    function handleCloseSettingsModal() {
        closeSettingsModal(settingsModal);
    }
    
    function handleToggleDarkMode() {
        isDarkMode = darkModeToggle.checked;
        toggleDarkMode(isDarkMode, darkModeToggle);
    }
    
    // When user clicks anywhere outside of the modal, close it
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            handleCloseSettingsModal();
        }
    });

    // Function to update the visibility of Qwen-specific controls
    function updateQwenControlsVisibility() {
        const isQwenModel = currentModel === 'qwen-max-latest';
        updateQwenControls(isQwenModel, webSearchToggle, thinkingToggle);
    }

    // Function to create a thinking section for Blackbox AI responses
    function handleCreateThinkingSection(messageElement) {
        // Call the imported createThinkingSection function from formatting.js
        if (messageElement) {
            return createThinking(messageElement);
        }
        return null;
    }

    // Function to handle format Blackbox response
    function handleFormatBlackboxResponse(text) {
        // Call the imported formatBlackboxResponse function from formatting.js
        if (text) {
            return formatBBResponse(text);
        }
        return '';
    }
}); 