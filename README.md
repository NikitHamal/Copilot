# Stormy Chat

A chat application powered by Microsoft that integrates with DuckDuckGo's AI chat API and Grok 2.

## Features

- Real-time AI chat responses from DuckDuckGo's Mistral API
- Grok 2 integration with web search capabilities
- Chat history management
- Multiple chat sessions
- Streaming responses
- Markdown and code highlighting support

## Installation

1. Make sure you have Node.js installed (v14 or higher)
2. Clone this repository
3. Install dependencies

```bash
npm install
```

## Running the Application

Start the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

Then open your browser and navigate to:
```
http://localhost:3000
```

## How It Works

- The frontend is built with vanilla HTML, CSS, and JavaScript
- The backend uses Node.js with Express to proxy requests to DuckDuckGo's chat API and Grok API
- This avoids CORS issues and keeps API details on the server side
- The application uses Server-Sent Events (SSE) for streaming responses
- Multiple models are supported, including Grok 2 with web search

## Supported Models

- Mistral Small 3 (default)
- o3-mini
- Claude 3 Haiku
- Llama-3.3 70B
- GPT-4o-mini
- Grok 2 (with web search capabilities)

## Files Overview

- `server.js` - Node.js backend server
- `index.html` - Main HTML structure
- `script.js` - Client-side JavaScript
- `styles.css` - CSS styling

## Technical Details

- The server proxies requests to DuckDuckGo's chat API and Grok API
- Supports multiple models including Mistral-Small-24B-Instruct-2501 and Grok 2
- Grok 2 includes real-time web search capabilities
- Maintains chat history for context
- Handles streaming responses in real time

## Grok 2 Integration Notes

- Grok 2 model uses a different API endpoint than DuckDuckGo models
- Web search is enabled by default for Grok 2
- Authentication requires valid cookies (included in the server proxy)
- The model can generate images if requested in the conversation 