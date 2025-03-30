/**
 * DuckDuckGo API functionality
 * This module handles communication with the DuckDuckGo-based AI API.
 */

import { getMessageHistoryForAPI } from './conversation.js';

/**
 * Fetches a response from the DuckDuckGo AI API
 * @param {string} message - User message to send
 * @param {Object} chat - Current chat object containing message history
 * @param {string} model - The model identifier to use
 * @returns {Promise<Response|null>} - The API response or null if there was an error
 */
async function fetchDuckDuckGoResponse(message, chat, model) {
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
        
        // Call our Node.js server API
        const apiUrl = '/api/chat';
        
        // Make the request
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                messages,
                model: model
            }),
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        return response;
    } catch (error) {
        console.error('Error fetching DuckDuckGo AI response:', error);
        // Return a fallback response in case of error
        return null;
    }
}

/**
 * Processes a DuckDuckGo response stream
 * @param {ReadableStream} stream - The response stream
 * @param {Function} onChunk - Callback for processing each chunk, receives the accumulated text
 * @returns {Promise<string>} - The complete response text
 */
async function processDuckDuckGoStream(stream, onChunk) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = ''; // Buffer for incomplete chunks
    let previousResponseLength = 0;
    let wordBuffer = [];
    let wordTimer = null;
    
    // Function to stream words gradually instead of all at once
    const streamWordsGradually = (words, currentPosition = 0) => {
        if (currentPosition >= words.length) {
            wordTimer = null;
            return;
        }
        
        // Add the next word to the visible response
        const currentText = fullResponse.substring(0, previousResponseLength) + 
                           words.slice(0, currentPosition + 1).join(' ');
        
        // Call the callback with the current text
        if (typeof onChunk === 'function') {
            onChunk(currentText);
        }
        
        // Schedule the next word
        wordTimer = setTimeout(() => {
            streamWordsGradually(words, currentPosition + 1);
        }, 30); // Adjust timing for natural reading speed
    };
    
    try {
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
                        
                        // DuckDuckGo uses "message" field instead of "content"
                        if (jsonData.message !== undefined) {
                            // Cancel any pending word timer
                            if (wordTimer) {
                                clearTimeout(wordTimer);
                                wordTimer = null;
                            }
                            
                            // Save previous length before adding new content
                            previousResponseLength = fullResponse.length;
                            
                            // Add the new content to the full response
                            const newContent = jsonData.message;
                            fullResponse += newContent;
                            
                            // For streaming, break the new content into words for gradual display
                            if (typeof onChunk === 'function') {
                                // Split the new content into words, preserving spacing
                                const words = newContent.split(' ');
                                wordBuffer = words;
                                
                                // Start streaming words with a slight delay
                                streamWordsGradually(words);
                            }
                        }
                    } catch (e) {
                        // Silent fail for parsing errors - this is expected with partial chunks
                        console.debug('Error parsing JSON chunk:', e);
                    }
                }
            }
        }
        
        // Ensure any remaining content is displayed
        if (wordTimer) {
            clearTimeout(wordTimer);
            if (typeof onChunk === 'function') {
                onChunk(fullResponse);
            }
        }
    } catch (error) {
        console.error('Error processing DuckDuckGo stream:', error);
        // Clean up any timers if there's an error
        if (wordTimer) {
            clearTimeout(wordTimer);
        }
    }
    
    return fullResponse;
}

/**
 * Generates a fallback AI response when the API call fails
 * @param {string} message - The user's message
 * @returns {string} - A fallback response
 */
function generateFallbackResponse(message) {
    // Fallback mock responses when API fails
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
        return "Hello! How can I help you today?";
    }
    
    if (message.toLowerCase().includes('who are you')) {
        return "I'm an AI assistant powered by DuckDuckGo. I'm here to help answer your questions and assist with tasks.";
    }
    
    if (message.toLowerCase().includes('weather')) {
        return "I don't have access to real-time weather data in this demo. In a real implementation, I would connect to a weather API to provide you with current conditions and forecasts.";
    }
    
    if (message.toLowerCase().includes('code') || message.toLowerCase().includes('example')) {
        return "Here's a simple JavaScript code example:\n\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet('World'));\n// Output: Hello, World!\n```\n\nYou can run this in your browser's console to see the result.";
    }
    
    if (message.toLowerCase().includes('list') || message.toLowerCase().includes('bullet')) {
        return "Here's a sample list:\n\n* Item one\n* Item two\n* Item three\n  * Nested item 1\n  * Nested item 2\n* Item four";
    }
    
    // Default response
    return "Thank you for your message. As a demo AI assistant, I have limited capabilities. In a real implementation, I would connect to DuckDuckGo's AI services to provide more helpful and contextual responses.";
}

// Export the functions for use in other modules
export {
    fetchDuckDuckGoResponse,
    processDuckDuckGoStream,
    generateFallbackResponse
}; 