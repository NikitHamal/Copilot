const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint to proxy requests to DuckDuckGo
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request format. Messages array is required.' });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string' || 
          (msg.role !== 'user' && msg.role !== 'assistant')) {
        return res.status(400).json({ 
          error: 'Invalid message format',
          details: 'Each message must have role (user/assistant) and content (string)' 
        });
      }
    }

    // Generate random values for better browser simulation
    const generateRandomHex = (length) => {
      return Array.from({ length }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
    };
    
    const vqdHash = `eyJzZXJ2ZXJfaGFzaGVzIjpbIiR7Z2VuZXJhdGVSYW5kb21IZXgoNDQpfT0iLCIke2dlbmVyYXRlUmFuZG9tSGV4KDQ0KX09Il0sImNsaWVudF9oYXNoZXMiOlsiJHtnZW5lcmF0ZVJhbmRvbUhleCg0NCl9PSIsIiR7Z2VuZXJhdGVSYW5kb21IZXgoNDQpfT0iXSwic2lnbmFscyI6e319`;

    // Set up the request to DuckDuckGo with updated headers
    const response = await axios({
      method: 'POST',
      url: 'https://duckduckgo.com/duckchat/v1/chat',
      headers: {
        'accept': 'text/event-stream',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'origin': 'https://duckduckgo.com',
        'referer': 'https://duckduckgo.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-vqd-4': `4-${Math.floor(Math.random() * 900000000000000) + 100000000000000}`,
        'x-vqd-hash-1': vqdHash,
        'x-requested-with': 'XMLHttpRequest',
        'x-fe-version': `serp_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${Math.floor(Math.random() * 900) + 100}_ET-${generateRandomHex(12)}`,
        'Cookie': `dcs=1; dcm=${Math.floor(Math.random() * 10)}`
      },
      data: {
        model: model || "mistralai/Mistral-Small-24B-Instruct-2501",
        messages: messages
      },
      responseType: 'stream',
      maxRedirects: 5,
      timeout: 60000
    });

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Forward the streaming response directly without modifying
    response.data.pipe(res);

    // Handle errors and client disconnect
    response.data.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error', details: err.message });
      } else {
        res.end();
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      response.data.destroy();
    });
  } catch (error) {
    console.error('Error proxying request to DuckDuckGo:', error.message);
    
    // If we get a 418 status code or other API errors, use fallback
    if (error.response && (error.response.status === 418 || error.response.status >= 400)) {
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Get the last user message
      const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()?.content || '';
      
      // Generate fallback response
      const fallbackResponse = generateFallbackResponse(lastUserMessage);
      
      // Stream the fallback response to mimic SSE
      const words = fallbackResponse.split(' ');
      let sentWords = 0;
      
      // Send a word every 100ms to mimic streaming
      const sendInterval = setInterval(() => {
        if (sentWords < words.length) {
          const chunk = words.slice(sentWords, sentWords + 3).join(' ') + ' ';
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          sentWords += 3;
        } else {
          res.write('data: [DONE]\n\n');
          clearInterval(sendInterval);
          res.end();
        }
      }, 100);
      
      return;
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to get response from DuckDuckGo',
        details: error.message || 'Unknown error'
      });
    }
  }
});

// API endpoint to proxy requests to Grok
app.post('/api/grok', async (req, res) => {
  try {
    const { grokRequestBody, isGrok3 } = req.body;
    
    if (!grokRequestBody) {
      return res.status(400).json({ error: 'Invalid request format. grokRequestBody is required.' });
    }

    // Set up the request to Grok with required headers
    const response = await axios({
      method: 'POST',
      url: 'https://grok.com/rest/app-chat/conversations/new',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8',
        'content-type': 'application/json',
        'origin': 'https://grok.com',
        'referer': 'https://grok.com/?referrer=x',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-arch': '"x86"',
        'sec-ch-ua-bitness': '"64"',
        'sec-ch-ua-full-version': '"134.0.6998.178"',
        'sec-ch-ua-full-version-list': '"Chromium";v="134.0.6998.178", "Not:A-Brand";v="24.0.0.0", "Google Chrome";v="134.0.6998.178"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-platform-version': '"19.0.0"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'priority': 'u=1, i',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'baggage': 'sentry-environment=production,sentry-release=YJ8tdKT6176YR4WZuooH-,sentry-public_key=b311e0f2690c81f25e2c4cf6d4f7ce1c,sentry-trace_id=8ff9514b00d5429fb51d0625fe8d6ec9,sentry-sample_rate=0,sentry-sampled=false',
        // This cookie needs to be set on the client side for authentication
        'Cookie': '_ga=GA1.1.1409377758.1740204883; sso=eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiYTQ5ZjRlODctZjg0Yi00ZTM3LTllNjktZDYyZTAxNzcyYWU0In0.d1ES0mvZavD8IQWfHQYxAWsnJ9soXxPUYOOfBQq34K4; sso-rw=eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiYTQ5ZjRlODctZjg0Yi00ZTM3LTllNjktZDYyZTAxNzcyYWU0In0.d1ES0mvZavD8IQWfHQYxAWsnJ9soXxPUYOOfBQq34K4; i18nextLng=en; cf_clearance=7R0cQTp_9uO52d2W9mA52Z6wlZD6JM1c12WRn7aGddc-1743267256-1.2.1.1-5b0avYxt3QiP0.OgkPSDheEuNOh9mpp5MYlP0iF3IDVCON3m86YDGBmbLf1hpwEDueh8Q9XFxc3kh0qLJ3KaPHlxLUXKaOicXaE6RZHgeOTUz0NH4FnCmUVS5w1JpJ_HluFFtqeVP32MWFma4J.AITTbQf538qKPmhkflQgLXrWhd1PK7oM9ES6tD43kJxw_HjlBtU2n1x5Ih_ADXf_UiBh5JPP5OIhGJY.WnchslKNugY__rlXaldi.P02dE.UZnZz_b9ayzMeY8R8hPo4qQCpRLZ3CmsGP_iIAamA1OWmjc6W3wwn23vJt998mMf5HOJv_zNCEI4TYjky8C4O5NucEjK5qr91cn08VuRBnlQuu_u.WU5toV9c17rCauTKVfGXz1iOWsrZ.W400igxFlFgoB9rivSZWOg4FuhwQRj4; cf_chl_rc_m=1; _ga_8FEWB057YH=GS1.1.1743265925.77.1.1743267278.0.0.0'
      },
      data: grokRequestBody,
      responseType: 'stream',
      maxRedirects: 5,
      timeout: 30000
    });

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Process the streaming response to ensure proper formatting
    response.data.on('data', (chunk) => {
      try {
        // Forward the data as-is in the correct SSE format
        const dataStr = chunk.toString();
        const lines = dataStr.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          // Ensure proper SSE format with 'data: ' prefix
          if (line.startsWith('data: ')) {
            res.write(line + '\n\n');
          } else {
            res.write('data: ' + line + '\n\n');
          }
        }
      } catch (err) {
        console.error('Error processing Grok stream chunk:', err);
      }
    });

    // Handle end of stream
    response.data.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    // Handle errors and client disconnect
    response.data.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error', details: err.message });
      } else {
        res.end();
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      response.data.destroy();
    });
  } catch (error) {
    console.error('Error proxying request to Grok:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to get response from Grok',
        details: error.message
      });
    }
  }
});

// API endpoint to proxy requests to Blackbox AI
app.post('/api/blackbox', async (req, res) => {
  try {
    const { messages, agentMode } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request format. Messages array is required.' });
    }

    // Format messages for Blackbox API
    const formattedMessages = messages.map((msg, index) => ({
      role: msg.role,
      content: msg.content,
      id: generateId()
    }));

    // Set up the request to Blackbox AI with required headers
    const response = await axios({
      method: 'POST',
      url: 'https://www.blackbox.ai/api/chat',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8,ne-NP;q=0.7,ne;q=0.6',
        'content-type': 'application/json',
        'origin': 'https://www.blackbox.ai',
        'priority': 'u=1, i',
        'referer': 'https://www.blackbox.ai/',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Cookie': 'sessionId=fd566283-2eb6-4955-be11-1b7cfa7bfe9f; intercom-id-x55eda6t=048c6c4f-914e-4970-9b8b-9a1cfc0b406c; intercom-device-id-x55eda6t=08680615-b734-4962-b6e4-98da23b045b6; __Host-authjs.csrf-token=a6295c9302dd3f46279404914928e4e7805b5f82174cffa908b4a9f1a31475b2%7C50c9ca916eedbdb25e4ac16a56d5c72053222f4db0823770d6dfbd806c02c13c; __Secure-authjs.callback-url=https%3A%2F%2Fwww.blackbox.ai; render_app_version_affinity=dep-cvk3hthr0fns739mkfh0; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..DddMr5OnF_zF68XH.QOMCRCL-UJEB26DuDtN4roIIpqaV-fgqNnUUlMS-8_LiZQ4EDqbjonSUDsFIV_8vtsRlG4ZyQjSXhn6aRUAB6DIPE3XzMk3xqtkIz9D1rdXS2cqi5HKso1WCYZhmSNB3KtAKyD_Ss3S7QEKomCkcWPe73fyeUTrpgSwzSn0bUojCBVelYI86gmjcE7Eo21J7CJ3DPJESHvLzlHdB1w3Y6nsTm-aDHCZkAz4usF7VPUwIJaTWxq57SpMi75aTfet5mk-2b5evQiuJHXFwyQ6aqlT1nxuIQdZFdLGq8LmDiGNXi3Z6400QI6XZgGddrUukvrq7AjBcY80qr0LfyXsOj4efURnPjWbmGYAgUmkt0bCp67Rr5OZFlDv3kr-MzI6JJ_-x9Fgv-3_DCAOE_CltXZ4RCgM3XTPO0E9vFrYMZ0ihjjcbAiGlFWt72wy0njAHvd_mUlV2MH2yhM1b3B5QACJ10M-4ftKMsa5ZBt3afx5fJl9UJ7BZtZ0p-LhURgbi5Qln87jGQQDTw33fLu8hKrbVb0BXPANEaPOSIhh7.5nEiRCy7oR5X5Vt2wREcag; intercom-session-x55eda6t=aWRIeXlBalQzNEF4aEZ3SWxPM1FpR2QvemcrTy9yOE9JNWtGeGthaEdiam9OMzhyUDhhLzAyUUl3ZGN4WjNjSnRHSHhMNlhyL2tUQllYcDJGWWdEaElabE8zQW50S3d0dm85aHgxOUI4L1k9LS1yVmE0ZmNoUlExTHRNZzRCcGhqQ0xnPT0=--47092c07ac1e7ac65bdc53f87d8bb8026a9571ad'
      },
      data: {
        messages: formattedMessages,
        agentMode: agentMode || {
          name: "DeepSeek-R1",
          id: "deepseek-reasoner",
          mode: true
        },
        id: generateId(),
        previewToken: null,
        userId: null,
        codeModelMode: true,
        trendingAgentMode: {},
        isMicMode: false
      },
      responseType: 'stream',
      maxRedirects: 5,
      timeout: 30000
    });

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Process the streaming response
    response.data.on('data', (chunk) => {
      try {
        // Forward data with proper SSE formatting
        const dataStr = chunk.toString();
        res.write(`data: ${dataStr}\n\n`);
      } catch (err) {
        console.error('Error processing Blackbox stream chunk:', err);
      }
    });

    // Handle end of stream
    response.data.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    // Handle errors
    response.data.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error', details: err.message });
      } else {
        res.end();
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      response.data.destroy();
    });
  } catch (error) {
    console.error('Error proxying request to Blackbox:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to get response from Blackbox',
        details: error.message
      });
    }
  }
});

// API endpoint to handle Qwen chat requests
app.post('/api/qwen/new-chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Invalid request format. Prompt is required.' });
    }

    // Return a fallback response for Qwen since we're in serverless environment
    res.json({
      success: true,
      data: {
        chatId: generateId(),
        response: "I'm currently running in a serverless environment which limits my ability to access Qwen services. Try running this application locally for full functionality."
      }
    });

  } catch (error) {
    console.error('Error handling Qwen request:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to process Qwen request',
      details: error.message || 'Unknown error'
    });
  }
});

// API endpoint to continue Qwen chat
app.post('/api/qwen/continue-chat', async (req, res) => {
  try {
    const { chatId, prompt } = req.body;
    
    if (!chatId || !prompt) {
      return res.status(400).json({ error: 'Invalid request format. ChatId and prompt are required.' });
    }

    // Return a fallback response for Qwen
    res.json({
      success: true,
      data: {
        response: "I'm currently running in a serverless environment which limits my ability to access Qwen services. Try running this application locally for full functionality."
      }
    });

  } catch (error) {
    console.error('Error handling Qwen continuation:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to process Qwen request',
      details: error.message || 'Unknown error'
    });
  }
});

// Helper function to generate random ID
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Fallback response function for when API calls fail
function generateFallbackResponse(message) {
  // Simple fallback response when the API is unavailable
  const responses = [
    "I'm sorry, but I'm having trouble connecting to my knowledge source right now. This is likely because the service is detecting that requests are coming from a server rather than a browser.",
    "It looks like we're encountering an issue with API access. This is a common limitation when deploying to serverless environments like Vercel.",
    "The API provider is currently blocking our requests as they can detect server-side calls. You might want to try using the app locally instead.",
    "I apologize, but I can't process your request right now due to API restrictions. The providers often block requests that don't come from browsers."
  ];
  
  // Get a fallback response with some context about the user's query
  const response = responses[Math.floor(Math.random() * responses.length)];
  
  // Add some context for common query types
  let context = "";
  const messageText = message.toLowerCase();
  
  if (messageText.includes("help") || messageText.includes("how to")) {
    context = " If you're looking for help, consider trying the application locally or using a different AI service.";
  } else if (messageText.includes("why") || messageText.includes("because")) {
    context = " The API providers implement these restrictions to prevent abuse and unauthorized access.";
  }
  
  return response + context;
}

module.exports = app; 