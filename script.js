// Import Qwen functions
import { createQwenChat, getQwenChatCompletion, convertMessagesToQwenFormat, resetQwenChat } from './qwen.js';
// Import Formatting functions
import {
    formatBlackboxResponse as formatBBResponse,
    renderMarkdownContent as renderMD,
    updateMessageContent as updateMsgContent,
    streamResponse as streamMsg,
    createThinkingSection as createThinking,
    displaySourceCitations as displaySources,
    showSearchResults as showResults
} from './formatting.js';
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
    updateQwenControls,
    confirmDeleteAllChats
} from './utils.js';
// Import planning feature
import {
    createPlanningSection,
    showPlanningThinking,
    addPlanningStep,
    showPlanningControls,
    setupPlanningControls,
    showExecutionStatus,
    updateExecutionProgress,
    finalizePlanExecution
} from './planning.js';

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
    let currentModel = loadCurrentModel() || "qwen-max-latest";
    let isAIResponding = false; // Track if AI is currently responding
    
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
    
    // Add at the appropriate section after the DOM elements
    let currentPlanningSection = null;
    let isPlanningMode = false;
    let planSteps = [];
    
    // Initialize
    initApp();
    
    // Call initially to set correct state
    updateQwenControlsVisibility();

    // Apply dark mode if it was previously enabled
    if (isDarkMode) {
        toggleDarkMode(true, darkModeToggle);
    }

    // Event listeners for model selector
    const modelSelectorElement = document.querySelector('.custom-model-selector');
    modelSelectorElement.addEventListener('click', function(e) {
        // Toggle the dropdown only if the click is on the selector itself (not on an option)
        if (!e.target.classList.contains('model-option')) {
            this.classList.toggle('active');
        }
    });
    
    modelOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectedModelText.textContent = option.textContent;
            currentModel = option.dataset.value;
            
            // Save the selected model
            saveCurrentModel(currentModel);
            
            // Update qwen controls visibility
            updateQwenControlsVisibility();
            
            // Close the dropdown
            customModelSelector.classList.remove('active');
            
            // Mark this option as selected and unmark others
            modelOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!customModelSelector.contains(e.target)) {
            customModelSelector.classList.remove('active');
        }
    });

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
        // Set initial model selection
        setInitialModelSelection();
        
        // Add event listeners
        messageInput.addEventListener('keydown', handleInputKeydown);
        sendButton.addEventListener('click', sendMessage);
        newChatButton.addEventListener('click', createNewChat);
        streamToggle.addEventListener('click', handleToggleStreaming);
        webSearchToggle.addEventListener('click', handleToggleWebSearch);
        thinkingToggle.addEventListener('click', handleToggleThinking);
        sidebarToggle.addEventListener('click', handleToggleSidebar);
        sidebarOverlay.addEventListener('click', handleCloseSidebar);
        deleteAllChatsButton.addEventListener('click', handleConfirmDeleteAllChats);
        settingsButton.addEventListener('click', handleOpenSettingsModal);
        closeSettingsButton.addEventListener('click', handleCloseSettingsModal);
        darkModeToggle.addEventListener('click', handleToggleDarkMode);
        
        // Initialize the chat display
        if (chats.length > 0) {
            loadChat(currentChatId || chats[0].id);
        } else {
            // Show welcome message if no chats exist
            showWelcomeMessage();
        }
        
        // Render chat history
        renderChatHistory();
        
        // Check screen size for responsive design
        handleCheckScreenSize();
        window.addEventListener('resize', handleCheckScreenSize);
        
        // Welcome message update if needed
        updateWelcomeMessageIfNeeded();
    }

    function setInitialModelSelection() {
        // Convert currentModel to a data-value to find the matching option
        const matchingOption = Array.from(modelOptions).find(option => option.dataset.value === currentModel);
        
        if (matchingOption) {
            // Update the visible text for the selected model
            selectedModelText.textContent = matchingOption.textContent;
        } else {
            // If the saved model doesn't exist, default to the first option
            const firstOption = modelOptions[0];
            selectedModelText.textContent = firstOption.textContent;
            currentModel = firstOption.dataset.value;
            saveCurrentModel(currentModel);
        }
        
        // Update the model option in the dropdown
        modelOptions.forEach(option => {
            option.classList.toggle('selected', option.dataset.value === currentModel);
        });
        
        // Update Qwen controls visibility based on selected model
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

        // --- Command Handling ---
        if (message.startsWith('/research ')) {
            let topic = message.substring(10).trim();
            let pageCount = 10; // Default page count

            // Check for pages parameter
            const pagesMatch = topic.match(/\s+pages=(\d+)/i);
            if (pagesMatch && pagesMatch[1]) {
                pageCount = parseInt(pagesMatch[1], 10);
                // Remove the pages parameter from the topic string
                topic = topic.replace(/\s+pages=\d+/i, '').trim();
            }
            
            if (!topic) {
                addMessage('ai', "Please provide a topic for research after the /research command. Optionally add pages=<number>.");
                return;
            }

            // Ensure chat exists before starting research
            if (!currentChatId || !findChatById(chats, currentChatId)) {
                // Add user message with topic and page count info
                const { chatId, chat } = createChatWithFirstMessage(`/research ${topic} pages=${pageCount}`, currentModel);
                chats.push(chat);
                currentChatId = chatId;
                saveCurrentChatId(currentChatId);
                renderChatHistory();
                currentChatTitle.textContent = chat.title;
            } else {
                 // Add the command message to the existing chat
                 addMessage('user', `/research ${topic} pages=${pageCount}`);
            }

            // Clear welcome message if visible
            const welcomeMessage = messagesContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }

            messageInput.value = '';
            messageInput.style.height = 'auto';
            scrollToBottom();
            saveChat(); // Save the user's command message

            // Start the deep research process
            startDeepResearch(topic, pageCount);
            return; // Stop further processing for this command
        } else if (message.startsWith('/planning ')) {
            let planningTopic = message.substring(10).trim();
            
            if (!planningTopic) {
                addMessage('ai', "Please provide a topic for planning after the /planning command.");
                return;
            }
            
            // Ensure chat exists before starting planning
            if (!currentChatId || !findChatById(chats, currentChatId)) {
                const { chatId, chat } = createChatWithFirstMessage(`/planning ${planningTopic}`, currentModel);
                chats.push(chat);
                currentChatId = chatId;
                saveCurrentChatId(currentChatId);
                renderChatHistory();
                currentChatTitle.textContent = chat.title;
            } else {
                // Add the command message to the existing chat
                addMessage('user', `/planning ${planningTopic}`);
            }
            
            // Clear welcome message if visible
            const welcomeMessage = messagesContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
            
            messageInput.value = '';
            messageInput.style.height = 'auto';
            scrollToBottom();
            saveChat(); // Save the user's command message
            
            // Force planning mode and process with AI
            isPlanningMode = true;
            processWithAI(`Create a plan for: ${planningTopic}`);
            return; // Stop further processing for this command
        }
        // --- End Command Handling ---

        // --- Regular Message Handling ---
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
        // --- End Regular Message Handling ---
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

    async function processWithAI(message, isVisible = true) {
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
        
        let aiMessageElement;
        
        if (isVisible) {
        // Clear welcome message if visible
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        // Start AI response with loading indicator
            aiMessageElement = addMessage('ai', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
            
            // Determine if this is a planning request
            isPlanningMode = message.toLowerCase().includes('plan') || 
                            message.toLowerCase().includes('steps') || 
                            message.toLowerCase().includes('procedure');
            
            // If planning mode, create planning section and add special message
            if (isPlanningMode) {
                console.log("Planning mode activated!");
                
                // Update the message text with a planning-specific introduction
                const messageText = aiMessageElement.querySelector('.message-text');
                if (messageText) {
                    messageText.innerHTML = '<p>I\'ll create a detailed plan to help with this:</p>';
                }
                
                // Create planning section in the AI message
                currentPlanningSection = createPlanningSection(aiMessageElement);
                showPlanningThinking(currentPlanningSection, true);
                
                // Reset plan steps array
                planSteps = [];
                
                // Setup planning controls with callback for when plan is approved
                setupPlanningControls(currentPlanningSection, (approvedPlan) => {
                    // Handle plan execution here
                    executePlan(approvedPlan, aiMessageElement);
                });
            }
        }
        
        // Get current chat to determine context
        const currentChat = findChatById(chats, currentChatId);
        
        try {
            let response = '';
            
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
                            if (isVisible && isStreaming) {
                                updateMsgContent(aiMessageElement, text);
                            }
                        }
                    );
                    
                    // Ensure the complete response is displayed
                    if (isVisible && (!isStreaming || fullResponse)) {
                        updateMsgContent(aiMessageElement, fullResponse || "Sorry, I couldn't generate a response.");
                    }
                    
                    response = fullResponse;
                } catch (error) {
                    console.error('Error processing Qwen response:', error);
                    if (isVisible) {
                    updateMsgContent(aiMessageElement, "I'm sorry, I encountered an error while working with Qwen Max. Please try again later.");
                }
                    response = "Error: " + error.message;
            }
            } else if (currentModel === 'blackbox-deepseek-r1') {
                // Use Blackbox API for DeepSeek model
                try {
                    // Prepare message format for Blackbox API
                    let messages = [];
                    
                    // Add chat history for context
                    if (currentChat && currentChat.messages) {
                        messages = currentChat.messages.map(msg => ({
                            role: msg.sender === 'user' ? 'user' : 'assistant',
                            content: msg.content
                        }));
                    }
                    
                    // Add the current message
                    messages.push({
                        role: 'user',
                        content: message
                    });
                    
                    // Prepare the request to our proxy API
                    const response = await fetch('/api/blackbox', {
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
                        throw new Error(`Blackbox API request failed with status ${response.status}`);
                    }
                    
                    // Process streaming response
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let fullResponse = '';
                    let buffer = ''; // Buffer for incomplete chunks
                    
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
                                    
                                    // Extract the content from Blackbox response
                                    if (jsonData.delta && jsonData.delta.content) {
                                        const content = jsonData.delta.content;
                                        fullResponse += content;
                                        
                                        // Format the response for display
                                        const formattedResponse = formatBBResponse(fullResponse);
                                        
                                        if (isVisible && isStreaming) {
                                            updateMsgContent(aiMessageElement, formattedResponse);
                                        }
                                        
                                        // If we're in planning mode, extract steps
                                        if (isPlanningMode && currentPlanningSection) {
                                            // Use the improved step detection function
                                            const extractedSteps = detectPlanningSteps(formattedResponse);
                                            
                                            // If we found new steps, add them
                                            if (extractedSteps.length > planSteps.length) {
                                                // Get new steps only
                                                for (let i = planSteps.length; i < extractedSteps.length; i++) {
                                                    planSteps.push(extractedSteps[i]);
                                                    // Add the step to the UI with animation
                                                    addPlanningStep(currentPlanningSection, extractedSteps[i]);
                                                }
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.warn('Error parsing JSON from stream chunk, skipping:', e);
                                }
                            }
                        }
                    }
                    
                    // Ensure the complete response is displayed
                    if (isVisible && !isStreaming) {
                        const formattedResponse = formatBBResponse(fullResponse);
                        updateMsgContent(aiMessageElement, formattedResponse || "Sorry, I couldn't generate a response.");
                    }
                    
                    // Show planning controls if in planning mode
                    if (isPlanningMode && currentPlanningSection) {
                        showPlanningControls(currentPlanningSection, planSteps);
                    }
                    
                    response = fullResponse;
                } catch (error) {
                    console.error('Error processing DeepSeek response:', error);
                    if (isVisible) {
                        updateMsgContent(aiMessageElement, "I'm sorry, I encountered an error while working with DeepSeek R1. Please try again later.");
                    }
                    response = "Error: " + error.message;
                }
            }
            
            // Save chat after processing
            if (currentChat) {
                // Add the AI response to the chat
                addMessageToChat(currentChat, 'ai', response);
                saveChat();
            }
            
            // Return the response text
            return response;
        } finally {
            // Reset AI responding state unless this is an invisible call
            if (isVisible) {
            isAIResponding = false;
            messageInput.disabled = false;
            sendButton.disabled = false;
            sendButton.classList.remove('disabled');
        }
        }
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
        } else {
            // For HTML content (like loading indicator)
            messageContent.innerHTML = content;
        }
        
        // Add message to DOM
        messagesContainer.appendChild(messageElement);
        
        // If this is an AI message and we're using DeepSeek-R1, add continue button
        if (sender === 'ai' && currentModel === 'blackbox-deepseek-r1' && typeof content === 'string' && content.trim() !== '') {
            // Add the continue button after a slight delay to ensure message is fully processed
            setTimeout(() => {
                const actionsContainer = document.createElement('div');
                actionsContainer.className = 'message-actions';
                
                const continueButton = document.createElement('button');
                continueButton.className = 'continue-button';
                continueButton.innerHTML = '<span class="material-symbols-outlined">smart_toy</span> Continue';
                continueButton.setAttribute('title', 'Ask AI to continue its response');
                
                continueButton.addEventListener('click', () => {
                    handleContinueResponse(messageElement);
                });
                
                actionsContainer.appendChild(continueButton);
                messageElement.appendChild(actionsContainer);
            }, 100);
        }
        
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
        saveCurrentChatId(chatId);
        currentChatTitle.textContent = chat.title;
        
        if (chat.model) {
            currentModel = chat.model;
            saveCurrentModel(currentModel);
            setInitialModelSelection();
        }
        
        messagesContainer.innerHTML = '';
        
        if (chat.messages.length === 0) {
            showWelcomeMessage();
            return;
        }
        
        chat.messages.forEach(message => {
            // Clone message template
            const messageElement = document.importNode(messageTemplate.content, true).querySelector('.message');
            const avatarIcon = messageElement.querySelector('.avatar-icon');
            const messageContentContainer = messageElement.querySelector('.message-text'); // The div that holds content

            if (message.sender === 'user') {
                avatarIcon.textContent = 'person';
                messageElement.classList.add('user-message');
                messageElement.querySelector('.query-actions').style.display = 'none';
                messageElement.querySelector('.results-summary').style.display = 'none';
                // Render user message as markdown
                messageContentContainer.innerHTML = DOMPurify.sanitize(marked.parse(message.content));
            } else { // AI message
                avatarIcon.textContent = 'smart_toy';
                messageElement.classList.add('ai-message');
                messageElement.querySelector('.query-actions').style.display = 'none';

                // Check if it's the complex research container HTML
                if (typeof message.content === 'string' && message.content.trim().startsWith('<div class="research-container"')) {
                    // It's the research container - inject HTML directly
                    // Allow safe HTML (important for research container structure)
                    messageContentContainer.innerHTML = DOMPurify.sanitize(message.content, { USE_PROFILES: { html: true } }); 
                    
                    // Re-find elements within the newly injected HTML
                    const researchContainer = messageContentContainer.querySelector('.research-container');
                    const contentArea = researchContainer?.querySelector('.research-content');
                    const toolsSection = researchContainer?.querySelector('.research-tools');
                    const summaryOutputArea = researchContainer?.querySelector('.summary-output');
                    
                    // Re-attach tool listeners if the container exists
                    if (researchContainer && contentArea && toolsSection && summaryOutputArea) {
                        // Extract original content - *this is an approximation*
                        // A more robust way is to store it in metadata during saving
                        const originalContentText = contentArea.textContent || ''; 
                        
                        // Find the steps from the re-rendered planning section
                        const planningSection = researchContainer.querySelector('.planning-section');
                        const loadedSteps = planningSection ? 
                            Array.from(planningSection.querySelectorAll('.planning-step .step-content')).map(el => el.textContent) 
                            : [];
                        // TODO: Store topic in metadata or data attribute for better retrieval
                        const loadedTopic = planningSection?.dataset.topic || 'Unknown Topic'; 
                            
                        setupResearchTools(toolsSection, contentArea, summaryOutputArea, originalContentText, loadedTopic, loadedSteps);
                    }
                } else if (typeof message.content === 'string') {
                    // Standard AI message - render as markdown
                    messageContentContainer.innerHTML = DOMPurify.sanitize(marked.parse(message.content));
                     // Add continue button for DeepSeek if applicable
                     if (currentModel === 'blackbox-deepseek-r1' && message.content.trim() !== '') {
                         // Add the continue button after a slight delay
                         setTimeout(() => {
                             const actionsContainer = document.createElement('div');
                             actionsContainer.className = 'message-actions';
                             
                             const continueButton = document.createElement('button');
                             continueButton.className = 'continue-button';
                             continueButton.innerHTML = '<span class="material-symbols-outlined">smart_toy</span> Continue';
                             continueButton.setAttribute('title', 'Ask AI to continue its response');
                             
                             continueButton.addEventListener('click', () => {
                                 handleContinueResponse(messageElement);
                             });
                             
                             actionsContainer.appendChild(continueButton);
                             messageElement.appendChild(actionsContainer);
                         }, 100);
                     }
                } else {
                     console.warn('AI message content is not a string:', message.content);
                }

                // Restore metadata display (query actions, results summary)
                if (message.metadata) {
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
            }
            
            messagesContainer.appendChild(messageElement);
             // Associate the element with the message object *temporarily* for executeResearch
             // This link is removed after saving the final HTML
             message.element = messageElement; 
        });
        
         // Reset currentMessageData after loading the entire chat
        currentMessageData = {
            queries: new Set(),
            xResults: 0,
            webResults: 0
        };
        
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

    /**
     * Check Grok rate limits
     */
    async function checkGrokRateLimits() {
        // This functionality is no longer needed as we only have Qwen and DeepSeek models
        return;
    }
    
    // Function to update the Grok message counters in the UI
    function handleUpdateGrokCounters() {
        // This functionality is no longer needed as we only have Qwen and DeepSeek models
        return;
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
        checkScreenSize();
    }
    
    // Function to toggle sidebar on mobile
    function handleToggleSidebar() {
        toggleSidebar();
    }
    
    // Function to close sidebar
    function handleCloseSidebar() {
        closeSidebar();
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
        updateQwenControls(currentModel);
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

    // Function to handle continuing AI response
    async function handleContinueResponse(messageElement) {
        // Find the current chat
        const currentChat = findChatById(chats, currentChatId);
        if (!currentChat || currentChat.messages.length < 2) return;
        
        // Disable the continue button during processing
        const continueButton = messageElement.querySelector('.continue-button');
        if (continueButton) {
            continueButton.disabled = true;
            continueButton.innerHTML = '<span class="material-symbols-outlined">sync</span> Processing...';
        }
        
        try {
            // Get the most recent user and AI messages
            const lastUserMessage = currentChat.messages.slice().reverse().find(msg => msg.sender === 'user');
            const lastAIMessage = currentChat.messages.slice().reverse().find(msg => msg.sender === 'ai');
            
            if (!lastUserMessage || !lastAIMessage) {
                throw new Error('Could not find the required messages to continue');
            }
            
            // Add a loading message
            const continueMessageElement = addMessage('ai', '<div class="typing-indicator"><span></span><span></span><span></span></div>');
            
            // Prepare messages for the continuation request
            const messages = [
                {
                    role: 'user',
                    content: lastUserMessage.content,
                    id: generateRandomId()
                },
                {
                    id: generateRandomId(),
                    createdAt: new Date().toISOString(),
                    content: lastAIMessage.content,
                    role: 'assistant'
                }
            ];
            
            // Call the Blackbox API directly
            const response = await fetch('/api/blackbox', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages,
                    agentMode: {
                        name: "DeepSeek-R1",
                        id: "deepseek-reasoner",
                        mode: true
                    },
                    mode: "continue"
                })
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            // Process the streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let buffer = '';
            
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
                        
                        // Direct string handling for Blackbox (non-JSON responses)
                        const rawData = data.trim();
                        
                        // For regular content (not DONE)
                        if (rawData && !rawData.includes('[DONE]')) {
                            // Add the actual response content
                            fullResponse += rawData;
                            
                            if (isStreaming) {
                                // Format the response for better readability
                                const formattedResponse = handleFormatBlackboxResponse(fullResponse);
                                // Update UI with the current text
                                updateMsgContent(continueMessageElement, formattedResponse);
                            }
                        }
                    }
                }
            }
            
            // Ensure the complete response is displayed
            if (!isStreaming || fullResponse) {
                const finalFormattedResponse = handleFormatBlackboxResponse(fullResponse);
                updateMsgContent(continueMessageElement, finalFormattedResponse || "Sorry, I couldn't generate a continuation.");
            }
        } catch (error) {
            console.error('Error continuing response:', error);
            
            // Show error message
            addMessage('ai', "I'm sorry, I was unable to continue my response. Please try again later.");
        } finally {
            // Re-enable the continue button
            if (continueButton) {
                continueButton.disabled = false;
                continueButton.innerHTML = '<span class="material-symbols-outlined">smart_toy</span> Continue';
            }
        }
    }

    // Helper function to generate random IDs for messages
    function generateRandomId() {
        return Math.random().toString(36).substring(2, 8);
    }

    // Function to initiate and manage the deep research process
    async function startDeepResearch(topic, pageCount = 10) {
        console.log(`Starting deep research on: ${topic} (Target pages: ${pageCount})`);
        isAIResponding = true;
        messageInput.disabled = true;
        sendButton.disabled = true;
        sendButton.classList.add('disabled');

        try {
            // Add an AI message showing that research is in progress
            const messageElement = addMessage('ai', 'Planning your research...');
            
            // Create a planning section with initial message
            const planningSection = createPlanningSection(messageElement);
            if (planningSection) {
                planningSection.style.display = 'block';
                showPlanningThinking(planningSection, true);
                
                let outlineSteps = [];
                
                try {
                    // Generate document outline using AI
                    const outlinePrompt = `Create a detailed document outline for a ${pageCount}-page research report on: "${topic}". 
                    Return ONLY the outline with numbered sections and subsections.
                    Format as a document outline with clear sections that will form the structure of the final document.
                    No explanation or introductory text - just the outline itself.`;
                    
                    let outlineResponse = '';
                    
                    // Get current chat
                    const currentChat = findChatById(chats, currentChatId);
                    
                    // Generate outline with AI
                    if (currentModel === 'qwen-max-latest') {
                        // Convert the history to Qwen format (excluding recent messages)
                        const qwenMessages = currentChat ? 
                            convertMessagesToQwenFormat(
                                currentChat.messages.slice(0, -1),
                                false, 
                                false
                            ) : [];
                        
                        // Get outline from Qwen directly
                        outlineResponse = await getQwenChatCompletion(
                            outlinePrompt,
                            qwenMessages,
                            false, // No web search
                            false, // No thinking display
                            false  // No streaming
                        );
                    } else {
                        // For other models, use invisible processing
                        outlineResponse = await processWithAI(outlinePrompt, false);
                    }
                    
                    console.log("AI generated outline:", outlineResponse);
                    
                    // Extract sections from the outline
                    if (outlineResponse) {
                        const lines = outlineResponse.split('\n')
                            .map(line => line.trim())
                            .filter(line => line && line.length > 0);
                        
                        // Updated logic to extract all outline items
                        for (const line of lines) {
                            // Keep lines that look like numbered/lettered list items or headings
                            if (/^\s*(\d+|[A-Z]+)[\.\)]\s+.+/.test(line) || // Matches "1.", "1)", "A.", "A)"
                                /^\s*(\d+\.\d+)[\.\)]?\s+.+/.test(line) || // Matches "1.1", "1.1.", "1.1)"
                                /^\s*[\-\*•]\s+.+/.test(line) || // Matches bullet points
                                line === line.toUpperCase() || // Matches potential ALL CAPS headings
                                line.endsWith(':')) { // Matches lines ending with a colon
                                outlineSteps.push(line);
                            }
                        }
                    }
                    
                    // Fallback if we couldn't extract enough steps
                    if (outlineSteps.length < 3) {
                        console.warn("AI outline extraction resulted in few steps, using fallback.");
                        outlineSteps = [
                            `1. Introduction to ${topic}`,
                            `2. Background and Context`,
                            `3. Key Findings and Analysis`,
                            `4. Detailed Examination of ${topic}`,
                            `5. Implications and Future Directions`,
                            `6. Conclusion and Recommendations`
                        ];
                    }
                    
                    // Add steps with animation delay
                    outlineSteps.forEach((step, index) => {
                        setTimeout(() => {
                            addPlanningStep(planningSection, step, undefined, true);
                            // Hide thinking indicator after all steps are added
                            if (index === outlineSteps.length - 1) {
                                showPlanningThinking(planningSection, false);
                            }
                        }, 400 * (index + 1));
                    });
                    
                } catch (error) {
                    console.error('Error generating outline:', error);
                    
                    // Use fallback steps if AI generation fails
                    const fallbackSteps = [
                        `1. Introduction to ${topic}`,
                        `2. Background and Context`,
                        `3. Key Findings and Analysis`,
                        `4. Detailed Examination of ${topic}`,
                        `5. Implications and Future Directions`,
                        `6. Conclusion and Recommendations`
                    ];
                    
                    fallbackSteps.forEach((step, index) => {
                        setTimeout(() => {
                            addPlanningStep(planningSection, step, undefined, true);
                            if (index === fallbackSteps.length - 1) {
                                showPlanningThinking(planningSection, false);
                            }
                        }, 400 * (index + 1));
                    });
                }
                
                // Setup planning controls with callback for when plan is approved
                setupPlanningControls(planningSection, (approvedPlan) => {
                    // Execute research with the approved plan
                    executeResearch(topic, pageCount, approvedPlan, messageElement);
                });
            }
        } catch (error) {
            console.error('Planning process failed:', error);
            // Show error message
            addMessage('ai', `Error during planning process: ${error.message}`);
            
            // Reset state
            isAIResponding = false;
            messageInput.disabled = false;
            sendButton.disabled = false;
            sendButton.classList.remove('disabled');
        }
    }

    // Function to execute the research with the approved plan
    async function executeResearch(topic, pageCount, steps, messageElement) {
        // Structure to hold each section's content
        const sectionContents = {};
        
        // Get or create a container for the entire research
        let researchContainer = messageElement.querySelector('.research-container');
        if (!researchContainer) {
            researchContainer = document.createElement('div');
            researchContainer.className = 'research-container';
            messageElement.appendChild(researchContainer);
        } else {
            researchContainer.innerHTML = '';
        }
        
        // Create a text area for the research content
        const contentArea = document.createElement('div');
        contentArea.className = 'research-content';
        
        // Create or retrieve the message text element
        let messageText = messageElement.querySelector('.message-text');
        if (!messageText) {
            messageText = document.createElement('div');
            messageText.className = 'message-text';
            messageElement.appendChild(messageText);
        }
        
        // Clear the message text content but save the original planning section
        const originalPlanningSection = messageText.querySelector('.planning-section');
        let planningSection = null;
        
        if (originalPlanningSection) {
            // Clone the planning section
            planningSection = originalPlanningSection.cloneNode(true);
            
            // Clear the message text and re-add the planning section first
            messageText.innerHTML = '';
            
            // Add planning section to the research container, at the top
            researchContainer.appendChild(planningSection);
            
            // Re-setup step event listeners if needed
            const stepElements = planningSection.querySelectorAll('.planning-step');
            stepElements.forEach((step, index) => {
                // Hide edit/delete buttons
                const actionButtons = step.querySelector('.step-actions');
                if (actionButtons) {
                    actionButtons.style.display = 'none';
                }
                
                // Apply executing style to make the plan look activated
                step.classList.add('executing');
            });
            
            // Hide planning controls
            const controls = planningSection.querySelector('.planning-controls');
            if (controls) {
                controls.style.display = 'none';
            }
            
            // Add the content area after the planning section
            researchContainer.appendChild(contentArea);
        } else {
            // If no planning section, just add the content area
            researchContainer.appendChild(contentArea);
        }
        
        // Add status message area
        const statusArea = document.createElement('div');
        statusArea.className = 'research-status';
        statusArea.innerHTML = '<span class="status-text">Preparing research...</span>';
        researchContainer.appendChild(statusArea);
        
        // Helper function to update status
        const updateStatus = (text) => {
            const statusText = statusArea.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = text;
                statusText.style.opacity = '1'; // Ensure status is visible
            }
        };
        
        // Add tools section for post-processing
        const toolsSection = document.createElement('div');
        toolsSection.className = 'research-tools';
        toolsSection.style.display = 'none'; // Hide until research is complete
        toolsSection.innerHTML = `
            <div class="tools-header">Research Tools</div>
            <div class="tools-buttons">
                <button class="tool-btn summarize-btn">
                    <span class="material-symbols-outlined">summarize</span>
                    <span>Summarize</span>
                </button>
                <button class="tool-btn extend-btn">
                    <span class="material-symbols-outlined">add_circle</span>
                    <span>Extend</span>
                </button>
                <button class="tool-btn improve-btn">
                    <span class="material-symbols-outlined">auto_fix_high</span>
                    <span>Improve</span>
                </button>
                <button class="tool-btn translate-btn">
                    <span class="material-symbols-outlined">translate</span>
                    <span>Translate</span>
                </button>
                <button class="tool-btn deep-research-btn">
                    <span class="material-symbols-outlined">psychology</span>
                    <span>Deep Research</span>
                </button>
            </div>
        `;
        researchContainer.appendChild(toolsSection);

        // Add a placeholder for the summary output
        const summaryOutputArea = document.createElement('div');
        summaryOutputArea.className = 'summary-output';
        summaryOutputArea.style.display = 'none'; // Initially hidden
        researchContainer.appendChild(summaryOutputArea);
        
        try {
            // Process research with AI using Qwen or DeepSeek
            const documentStructure = steps.join('\n');
            
            const researchPrompt = `Create a comprehensive research report on: "${topic}".
            
            IMPORTANT: Follow these instructions exactly:
            1. Use this document structure exactly as provided:
            ${documentStructure}
            
            2. Write content for each section listed.
            3. Use proper markdown formatting with headings, bullet points, and organization.
            4. Include citations where relevant.
            5. Aim for approximately ${pageCount} pages when printed.
            6. DO NOT add any conversational statements like "I hope this helps" or "Let me know if you need more information".
            7. DO NOT address the reader directly.
            8. Structure the document exactly according to the outline.`;
            
            // Get the current chat
            const currentChat = findChatById(chats, currentChatId);
            if (!currentChat) {
                throw new Error('Current chat not found');
            }
            
            let response = '';
            let currentStep = 0;
            let currentSection = '';
            
            // Update the first step as in progress
            if (planningSection) {
                updateExecutionProgress(planningSection, 0, `Working on: ${steps[0]}`);
            }
            
            // Handle different models
            if (currentModel === 'qwen-max-latest') {
                // Convert the history to Qwen format
                const qwenMessages = convertMessagesToQwenFormat(
                    currentChat.messages.slice(0, -1), // Exclude the "Planning..." message
                    isWebSearchEnabled, 
                    isThinkingEnabled
                );
                
                try {
                    // Create a progress callback that updates steps and tracks sections
                    const progressCallback = (chunk) => {
                        // Update the content area
                        contentArea.innerHTML = DOMPurify.sanitize(marked.parse(chunk));
                        
                        // Try to detect which section we're currently working on
                        // by looking for headings in the most recent content
                        const sectionHeadingMatch = chunk.match(/#+\s+([^#\n]+)(?!\n)/g);
                        if (sectionHeadingMatch && sectionHeadingMatch.length > 0) {
                            const lastHeading = sectionHeadingMatch[sectionHeadingMatch.length - 1].replace(/#+\s+/, '').trim();
                            
                            // Find which step this heading corresponds to
                            for (let i = 0; i < steps.length; i++) {
                                const stepText = steps[i];
                                // Check if the heading is in the step (accounting for formatting differences)
                                if (lastHeading && stepText.toLowerCase().includes(lastHeading.toLowerCase()) || 
                                    stepText.replace(/^\d+\.\s+/, '').toLowerCase() === lastHeading.toLowerCase()) {
                                    // We found a matching section
                                    if (currentStep !== i) {
                                        currentStep = i;
                                        currentSection = lastHeading;
                                        // Update UI to show current section
                                        if (planningSection) {
                                            updateExecutionProgress(planningSection, currentStep, `Working on: ${currentSection}`);
                                        }
                                        updateStatus(`Researching: ${currentSection}`);
                                    }
                                    break;
                                }
                            }
                        }
                        
                        // Also try to approximate progress based on content length
                        if (currentStep === 0) {
                            const progress = chunk.length / (5000 * steps.length);
                            const estimatedStep = Math.min(Math.floor(progress * steps.length), steps.length - 1);
                            
                            if (estimatedStep > currentStep && planningSection) {
                                currentStep = estimatedStep;
                                currentSection = steps[currentStep].replace(/^\d+\.\s+/, '');
                                updateExecutionProgress(planningSection, currentStep, 
                                    `Working on: ${currentSection}`);
                                updateStatus(`Researching: ${currentSection}`);
                            }
                        }
                        
                        // Scroll to show latest content
                        scrollToBottom();
                    };
                    
                    response = await getQwenChatCompletion(
                        researchPrompt,
                        qwenMessages,
                        isWebSearchEnabled,
                        isThinkingEnabled,
                        isStreaming,
                        progressCallback
                    );
                } catch (error) {
                    console.error('Error with Qwen research:', error);
                    throw new Error('Failed to complete research with Qwen: ' + error.message);
                }
            } else {
                // For other models like DeepSeek
                try {
                    // Process with AI
                    updateStatus('Generating research content...');
                    response = await processWithAI(researchPrompt, false);
                    
                    // Update the content area
                    contentArea.innerHTML = DOMPurify.sanitize(marked.parse(response));
                    
                    // Mark progress through each section
                    if (planningSection) {
                        for (let i = 0; i < steps.length; i++) {
                            const sectionName = steps[i].replace(/^\d+\.\s+/, '');
                            updateExecutionProgress(planningSection, i, `Working on: ${sectionName}`);
                            updateStatus(`Researching: ${sectionName}`);
                            // Add slight delay for visual effect
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    }
                } catch (error) {
                    console.error('Error with DeepSeek research:', error);
                    throw new Error('Failed to complete research: ' + error.message);
                }
            }
            
            // Update to completed state
            if (planningSection) {
                for (let i = 0; i < steps.length; i++) {
                    updateExecutionProgress(planningSection, i, '');
                }
                const statusElem = planningSection.querySelector('.planning-status');
                if (statusElem) {
                    statusElem.textContent = 'Research complete!';
                    // Fade out after a few seconds
                    setTimeout(() => {
                        statusElem.style.opacity = '0';
                        setTimeout(() => {
                            statusElem.style.display = 'none';
                        }, 500);
                    }, 3000);
                }
            }
            
            // Show the tools section
            toolsSection.style.display = 'block';
            
            // Update main status area
            updateStatus('Research complete! Use the tools below.');
             // Fade out main status after a few seconds too
             setTimeout(() => {
                statusArea.style.opacity = '0';
                setTimeout(() => {
                    statusArea.style.display = 'none';
                 }, 500);
             }, 5000); 
            
            // Set up event listeners for the tools, passing the summary area
            setupResearchTools(toolsSection, contentArea, summaryOutputArea, response, topic, steps);
                
                // Add download button for PDF report
                    const downloadButton = document.createElement('button');
                    downloadButton.className = 'download-pdf-button';
                    downloadButton.innerHTML = '<span class="material-symbols-outlined">download</span> Download PDF';
                    downloadButton.addEventListener('click', () => {
                        const filename = `${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`;
                        console.log(`Generating PDF: ${filename}`);
                        downloadAsPDF(response, filename);
                    });
            
            // Add the download button to the tools section
            const toolsButtons = toolsSection.querySelector('.tools-buttons');
            if (toolsButtons) {
                toolsButtons.appendChild(downloadButton);
            }
            
            // Save the complete chat with the research
            saveChat();
            
            // --- PERSISTENCE FIX START ---
            // Find the current chat and the specific AI message placeholder
            const chatForSaving = findChatById(chats, currentChatId); // Renamed variable
            if (chatForSaving) {
                const aiMessageIndex = chatForSaving.messages.findIndex(msg => msg.element === messageElement);
                if (aiMessageIndex !== -1) {
                    // Update the content of the message object with the final HTML
                    chatForSaving.messages[aiMessageIndex].content = researchContainer.outerHTML;
                    // Store topic in metadata for reloading
                    chatForSaving.messages[aiMessageIndex].metadata = { ...(chatForSaving.messages[aiMessageIndex].metadata || {}), researchTopic: topic }; 
                    // Remove the temporary element reference
                    delete chatForSaving.messages[aiMessageIndex].element;
                } else {
                    console.warn('Original AI message placeholder not found, adding new message for research content.');
                    addMessageToChat(chatForSaving, 'ai', researchContainer.outerHTML, { researchTopic: topic });
                }
                // Save the updated chat data
                saveChat();
            }
             // --- PERSISTENCE FIX END ---
            
        } catch (error) {
            console.error('Research execution failed:', error);
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'research-error';
            errorMessage.textContent = `Error during research execution: ${error.message}`;
            researchContainer.appendChild(errorMessage);
        } finally {
            // Ensure UI state is restored regardless of success/failure
            isAIResponding = false;
            messageInput.disabled = false;
            sendButton.disabled = false;
            sendButton.classList.remove('disabled');
        }
    }
    
    // Function to set up research tools
    function setupResearchTools(toolsSection, contentArea, summaryOutputArea, originalContent, topic, steps) {
        const summarizeBtn = toolsSection.querySelector('.summarize-btn');
        const extendBtn = toolsSection.querySelector('.extend-btn');
        const improveBtn = toolsSection.querySelector('.improve-btn');
        const translateBtn = toolsSection.querySelector('.translate-btn');
        const deepResearchBtn = toolsSection.querySelector('.deep-research-btn');
        
        // Helper to disable all buttons during processing
        const setButtonsDisabled = (disabled) => {
            summarizeBtn.disabled = disabled;
            extendBtn.disabled = disabled;
            improveBtn.disabled = disabled;
            translateBtn.disabled = disabled;
            deepResearchBtn.disabled = disabled;
        };
        
        // Summarize function
        summarizeBtn.addEventListener('click', async () => {
            if (isAIResponding) return;
            
            // Toggle summary visibility if it already exists
            const isVisible = summaryOutputArea.style.display === 'block';
            if (isVisible) {
                summaryOutputArea.style.display = 'none';
                summarizeBtn.innerHTML = '<span class="material-symbols-outlined">summarize</span><span>Summarize</span>';
                return;
            }
            
            // If summary hasn't been generated yet or needs regenerating
            if (!summaryOutputArea.innerHTML) {
                try {
                    setButtonsDisabled(true);
                    isAIResponding = true;
                    
                    // Show processing state
                    const originalButtonText = summarizeBtn.innerHTML;
                    summarizeBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Summarizing...';
                    
                    // Generate a summary
                    const summaryPrompt = `Summarize the following research report concisely, keeping the main points and structure:
                    
                    ${originalContent}`;
                    
                    // Process invisibly
                    const summary = await processWithAI(summaryPrompt, false);
                    
                    // Display the summary in its dedicated area
                    summaryOutputArea.innerHTML = DOMPurify.sanitize(marked.parse(summary));
                    
                     // Add a hide button within the summary area
                     const hideButton = document.createElement('button');
                     hideButton.className = 'tool-btn hide-summary-btn';
                     hideButton.innerHTML = '<span class="material-symbols-outlined">visibility_off</span> Hide Summary';
                     hideButton.addEventListener('click', () => {
                         summaryOutputArea.style.display = 'none';
                         summarizeBtn.innerHTML = '<span class="material-symbols-outlined">summarize</span><span>Summarize</span>'; // Reset main button
                     });
                     summaryOutputArea.prepend(hideButton); // Add hide button at the top
                    
                    // Restore the main button text and set to toggle state
                    summarizeBtn.innerHTML = '<span class="material-symbols-outlined">visibility_off</span> Hide Summary'; 
        } catch (error) {
                    console.error('Summary generation failed:', error);
                    alert('Failed to generate summary: ' + error.message);
                    summarizeBtn.innerHTML = '<span class="material-symbols-outlined">summarize</span><span>Summarize</span>'; // Restore on error
                } finally {
                    setButtonsDisabled(false);
                    isAIResponding = false;
                }
            }
            
            // Show the summary area
            summaryOutputArea.style.display = 'block';
            summarizeBtn.innerHTML = '<span class="material-symbols-outlined">visibility_off</span> Hide Summary';
        });
        
        // Extend function (modifies original, updates contentArea)
        extendBtn.addEventListener('click', async () => {
            if (isAIResponding) return;
            try {
                setButtonsDisabled(true);
                isAIResponding = true;
                const originalButtonText = extendBtn.innerHTML;
                extendBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Extending...';
                
                const extendPrompt = `Take the following research report and extend it with more details and analysis. Maintain the structure:
                
                ${originalContent}`;
                const extendedContent = await processWithAI(extendPrompt, false);
                
                contentArea.innerHTML = DOMPurify.sanitize(marked.parse(extendedContent));
                originalContent = extendedContent; // Update the original content reference for future operations
                
                extendBtn.innerHTML = originalButtonText;
            } catch (error) { /* ... error handling ... */ } finally { /* ... finally block ... */ }
        });
        
        // Improve function (modifies original, updates contentArea)
        improveBtn.addEventListener('click', async () => {
            if (isAIResponding) return;
            try {
                setButtonsDisabled(true);
                isAIResponding = true;
                const originalButtonText = improveBtn.innerHTML;
                improveBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Improving...';

                const improvePrompt = `Take the following research report and improve its quality, clarity, and flow:
                
                ${originalContent}`;
                const improvedContent = await processWithAI(improvePrompt, false);

                contentArea.innerHTML = DOMPurify.sanitize(marked.parse(improvedContent));
                originalContent = improvedContent; // Update reference

                improveBtn.innerHTML = originalButtonText;
            } catch (error) { /* ... error handling ... */ } finally { /* ... finally block ... */ }
        });
        
        // Translate function (modifies original, updates contentArea)
        translateBtn.addEventListener('click', async () => {
            if (isAIResponding) return;
            
            // Create language selection modal
            const modal = document.createElement('div');
            modal.className = 'translate-modal';
            modal.innerHTML = `
                <div class="translate-modal-content">
                    <h3>Select Language</h3>
                    <select id="language-select">
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                        <option value="pt">Portuguese</option>
                        <option value="ru">Russian</option>
                        <option value="zh">Chinese</option>
                        <option value="ja">Japanese</option>
                        <option value="ko">Korean</option>
                        <option value="ar">Arabic</option>
                    </select>
                    <div class="translate-buttons">
                        <button id="cancel-translate">Cancel</button>
                        <button id="confirm-translate">Translate</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Handle cancel
            const cancelButton = modal.querySelector('#cancel-translate');
            cancelButton.addEventListener('click', () => {
                modal.remove();
            });
            
            // Handle confirm
            const confirmButton = modal.querySelector('#confirm-translate');
            const languageSelect = modal.querySelector('#language-select');
            
            confirmButton.addEventListener('click', async () => {
                const targetLanguage = languageSelect.value;
                modal.remove();
                
                try {
                    setButtonsDisabled(true);
                    isAIResponding = true;
                    
                    // Show processing state
                    const originalButtonText = translateBtn.innerHTML;
                    translateBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Translating...';
                    
                    // Process translation with AI instead of Google Translate
                    // This is simpler for this implementation
                    const translatePrompt = `Translate the following research report to ${languageSelect.options[languageSelect.selectedIndex].text}. 
                    Preserve formatting:
                    
                    ${originalContent}`;
                    
                    // Process invisibly
                    const translatedContent = await processWithAI(translatePrompt, false);
                    
                    // Display the translated content
                    contentArea.innerHTML = DOMPurify.sanitize(marked.parse(translatedContent));
                    
                    // Restore the button
                    translateBtn.innerHTML = originalButtonText;
                } catch (error) {
                    console.error('Translation failed:', error);
                    alert('Failed to translate content: ' + error.message);
                } finally {
                    setButtonsDisabled(false);
                    isAIResponding = false;
                }
            });
        });
        
        // Deep Research function (remains largely the same, adds to chat)
        deepResearchBtn.addEventListener('click', () => {
            if (isAIResponding) return;
            
            // Create section selection modal
            const modal = document.createElement('div');
            modal.className = 'deep-research-modal';
            modal.innerHTML = `
                <div class="deep-research-modal-content">
                    <h3>Select Section for Deep Research</h3>
                    <select id="section-select">
                        ${steps.map((step, index) => `<option value="${index}">${step}</option>`).join('')}
                    </select>
                    <div class="deep-research-buttons">
                        <button id="cancel-deep-research">Cancel</button>
                        <button id="confirm-deep-research">Research</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Handle cancel
            const cancelButton = modal.querySelector('#cancel-deep-research');
            cancelButton.addEventListener('click', () => {
                modal.remove();
            });
            
            // Handle confirm
            const confirmButton = modal.querySelector('#confirm-deep-research');
            const sectionSelect = modal.querySelector('#section-select');
            
            confirmButton.addEventListener('click', async () => {
                const sectionIndex = parseInt(sectionSelect.value);
                const selectedSection = steps[sectionIndex];
                modal.remove();
                
                try {
                    setButtonsDisabled(true);
                    isAIResponding = true;
                    
                    // Show processing state
                    const originalButtonText = deepResearchBtn.innerHTML;
                    deepResearchBtn.innerHTML = '<span class="material-symbols-outlined">sync</span> Researching...';
                    
                    // Extract current section content
                    const sectionTitle = selectedSection.replace(/^\d+\.\s+/, '');
                    
                    // Process deep research with AI
                    const deepResearchPrompt = `Conduct deep research on "${sectionTitle}" from the report on "${topic}". Expand significantly with details, evidence, latest findings. Format as a mini-report. No conversational text.
                    
                    Focus ONLY on this section: ${sectionTitle}`;
                    
                    // Process invisibly
                    const deepResearchContent = await processWithAI(deepResearchPrompt, false);
                    
                    // Create a new AI message with the deep research content
                    addMessage('ai', `## Deep Research: ${sectionTitle}\n\n${deepResearchContent}`);
                    
                    // Restore the button
                    deepResearchBtn.innerHTML = originalButtonText;
                } catch (error) {
                    console.error('Deep research failed:', error);
                    alert('Failed to complete deep research: ' + error.message);
                } finally {
                    setButtonsDisabled(false);
                    isAIResponding = false;
                }
            });
        });
    }

    // Function to download report as PDF
    async function downloadAsPDF(markdownContent, filename) {
        try {
            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    markdownContent,
                    filename
                }),
            });
            
            if (response.ok) {
                // Create a blob from the PDF Stream
                const blob = await response.blob();
                // Create a link element
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(blob);
                downloadLink.download = filename;
                // Append to the document
                document.body.appendChild(downloadLink);
                // Trigger download
                downloadLink.click();
                // Clean up
                document.body.removeChild(downloadLink);
            } else {
                console.error('PDF generation failed:', await response.text());
                alert('Failed to generate PDF report. Please try again.');
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    }
}); 