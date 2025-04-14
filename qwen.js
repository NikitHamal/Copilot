// Qwen API functionality

// Import conversation helpers
import { getMessageHistoryForAPI } from './conversation.js';

// State variables
let qwenChatId = null;
let isRequestInProgress = false; // Flag to prevent duplicate requests

/**
 * Creates a new chat session with Qwen API
 * @param {string} message - Initial message to send
 * @param {boolean} isWebSearchEnabled - Whether web search is enabled
 * @param {boolean} isThinkingEnabled - Whether thinking is enabled
 * @returns {Promise<{chatId: string, data: Object}>} - Chat session data
 */
async function createQwenChat(message, isWebSearchEnabled = true, isThinkingEnabled = true) {
    console.log('Creating new Qwen chat...');
    const createChatResponse = await fetch('/api/qwen/new-chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            message,
            isWebSearchEnabled,
            isThinkingEnabled
        }),
    });
    
    if (!createChatResponse.ok) {
        throw new Error(`Qwen API request failed with status ${createChatResponse.status}`);
    }
    
    const data = await createChatResponse.json();
    qwenChatId = data.chatId;
    console.log('Created new Qwen chat with ID:', qwenChatId);
    
    return data;
}

/**
 * Gets completion from Qwen API for a chat
 * @param {string} message - Message to send
 * @param {Array} previousMessages - Previous messages in the chat
 * @param {boolean} isWebSearchEnabled - Whether web search is enabled
 * @param {boolean} isThinkingEnabled - Whether thinking is enabled
 * @param {boolean} isStreaming - Whether to process streaming output 
 * @param {Function} onChunk - Callback for processing each chunk of the response
 * @returns {Promise<string>} - Full response text
 */
async function getQwenChatCompletion(message, previousMessages = [], isWebSearchEnabled = true, isThinkingEnabled = true, isStreaming = true, onChunk = null) {
    // Prevent duplicate requests
    if (isRequestInProgress) {
        console.log('Request already in progress, ignoring duplicate request');
        return "Request already in progress";
    }
    
    try {
        isRequestInProgress = true;
        
        // Ensure we have a chat ID
        if (!qwenChatId) {
            const data = await createQwenChat(message, isWebSearchEnabled, isThinkingEnabled);
            qwenChatId = data.chatId;
        }
        
        console.log('Requesting chat completion from Qwen...');
        
        // Prepare messages for the API request
        const requestBody = {
            message: message,
            chatId: qwenChatId,
            previousMessages: previousMessages,
            isWebSearchEnabled: isWebSearchEnabled,
            isThinkingEnabled: isThinkingEnabled
        };
        
        // Make the request to our proxy API
        const chatCompletionResponse = await fetch('/api/qwen/chat-completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        
        if (!chatCompletionResponse.ok) {
            throw new Error(`Qwen chat completion request failed with status ${chatCompletionResponse.status}`);
        }
        
        // Process streaming response
        const reader = chatCompletionResponse.body.getReader();
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
            // Qwen uses \n\n as delimiter
            const lines = buffer.split('\n\n');
            // Keep the last part in the buffer as it might be incomplete
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonDataString = line.substring(6).trim();
                    // Skip empty data messages and [DONE]
                    if (jsonDataString === '' || jsonDataString === '[DONE]') continue;
                    
                    try {
                        const data = JSON.parse(jsonDataString);
                        
                        // Extract content ONLY if the expected structure exists
                        if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                            const content = data.choices[0].delta.content;
                            fullResponse += content;
                            
                            // Call onChunk only if streaming is enabled and callback provided
                            if (isStreaming && typeof onChunk === 'function') {
                                onChunk(fullResponse);
                            }
                        } else {
                            // Log unexpected structures, but don't stop accumulation
                            // These might be search status messages etc. when web search is on
                            console.log('Received non-standard data chunk from Qwen:', data);
                        }
                    } catch (e) {
                        // Log parsing errors but continue - might be plain text updates or malformed JSON chunks
                        console.warn('Error parsing JSON from Qwen stream chunk, skipping chunk:', e);
                        console.warn('Skipped chunk content:', jsonDataString);
                    }
                }
            }
        }
        
        return fullResponse || "Sorry, I couldn't generate a response.";
    } finally {
        // Always reset the flag when done, even if there was an error
        isRequestInProgress = false;
    }
}

/**
 * Converts messages from app format to Qwen API format
 * @param {Array} messages - Messages in app format
 * @param {boolean} isWebSearchEnabled - Whether web search is enabled
 * @param {boolean} isThinkingEnabled - Whether thinking is enabled
 * @returns {Array} - Messages in Qwen API format
 */
function convertMessagesToQwenFormat(messages, isWebSearchEnabled = true, isThinkingEnabled = true) {
    return messages
        .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
        .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content,
            chat_type: isWebSearchEnabled ? "search" : "t2t",
            extra: {},
            feature_config: {
                thinking_enabled: isThinkingEnabled && msg.sender === 'user'
            }
        }));
}

/**
 * Resets the Qwen chat ID to force creating a new conversation
 */
function resetQwenChat() {
    qwenChatId = null;
}

// Export the functions for use in other files
export {
    qwenChatId,
    createQwenChat,
    getQwenChatCompletion,
    convertMessagesToQwenFormat,
    resetQwenChat
}; 