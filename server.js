const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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

    // Set up the request to DuckDuckGo with exact headers from successful test
    const response = await axios({
      method: 'POST',
      url: 'https://duckduckgo.com/duckchat/v1/chat',
      headers: {
        'accept': 'text/event-stream',
        'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8,ne-NP;q=0.7,ne;q=0.6',
        'content-type': 'application/json',
        'origin': 'https://duckduckgo.com',
        'referer': 'https://duckduckgo.com/',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'x-vqd-4': '4-194082620698874678690049097321431039577',
        'x-vqd-hash-1': 'eyJzZXJ2ZXJfaGFzaGVzIjpbIm9wZVBtbDlpWHVGdkpRZURaaU1hNmpXWDdRamFwelhFOVlLTW9CRnNENlE9IiwiSGdON1hnSXNaTzFrYWNXTHlodlRwQWtJSVFtQUxjNnhSeHBKUDQ5QUlTQT0iXSwiY2xpZW50X2hhc2hlcyI6WyJrZFFzVzJHY3NXR29XUW0zN01QOEp0MHJvMko5d1BkSVhodHhicWRjSGdZPSIsIkdrM1ByMExWRkt0cjJZK3hhc2F4NjlEbEpDOWdKb0lHS0JJU1krckNOMWc9Il0sInNpZ25hbHMiOnt9fQ==',
        'x-fe-version': 'serp_20250328_151721_ET-d966a891598184d9c455',
        'Cookie': 'dcs=1; dcm=6'
      },
      data: {
        model: model || "mistralai/Mistral-Small-24B-Instruct-2501",
        messages: messages
      },
      responseType: 'stream',
      maxRedirects: 5,
      timeout: 30000
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
    console.error('Error proxying request to DuckDuckGo');
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to get response from DuckDuckGo',
        details: error.message
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
        agentMode: {
          name: "DeepSeek-R1",
          id: "deepseek-reasoner",
          mode: true
        },
        id: generateId(),
        previewToken: null,
        userId: null,
        codeModelMode: true,
        trendingAgentMode: {},
        isMicMode: false,
        userSystemPrompt: null,
        maxTokens: 1024,
        playgroundTopP: null,
        playgroundTemperature: null,
        isChromeExt: false,
        githubToken: "",
        clickedAnswer2: false,
        clickedAnswer3: false,
        clickedForceWebSearch: false,
        visitFromDelta: false,
        isMemoryEnabled: false,
        mobileClient: false,
        userSelectedModel: "DeepSeek-R1",
        validated: "00f37b34-a166-4efb-bce5-1312d87f2f94",
        imageGenerationMode: false,
        webSearchModePrompt: false,
        deepSearchMode: false,
        domains: null,
        vscodeClient: false,
        codeInterpreterMode: false,
        customProfile: {
          name: "",
          occupation: "",
          traits: [],
          additionalInfo: "",
          enableNewChats: false
        },
        session: {
          user: {
            name: "Nikit Hamal",
            email: "iamnikithamal@gmail.com",
            image: "https://lh3.googleusercontent.com/a/ACg8ocLFjMoNLrecmhMCIHrrKgHbyFTdqjL3ML9nNWDfC37lCwoYdihg=s96-c",
            id: "111484894962604179735"
          },
          expires: "2025-04-28T19:23:22.222Z"
        },
        isPremium: false,
        subscriptionCache: {
          status: "FREE",
          expiryTimestamp: null,
          lastChecked: 1743271985360,
          isTrialSubscription: false
        },
        beastMode: false,
        reasoningMode: false
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
        const dataStr = chunk.toString();
        console.log('Blackbox raw response:', dataStr); // Log for debugging
        
        // Handle Blackbox response format directly without parsing JSON
        // Just forward the raw data properly formatted
        if (dataStr.trim()) {
          res.write(`data: ${dataStr}\n\n`);
        }
      } catch (err) {
        console.error('Error processing Blackbox stream chunk:', err);
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
    console.error('Error proxying request to Blackbox:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to get response from Blackbox',
        details: error.message
      });
    }
  }
});

// Helper function to generate random IDs for Blackbox
function generateId() {
  return Math.random().toString(36).substring(2, 8);
}

// API endpoint to check Grok rate limits
app.post('/api/grok-limits', async (req, res) => {
  try {
    // Set default limits in case the API calls fail
    const defaultLimits = {
      grok2: {
        remaining: 30,
        total: 30
      },
      grok3: {
        remaining: 30,
        total: 30
      }
    };

    // Try to get Grok 2 limits
    let grok2Limits = null;
    try {
      const response = await axios({
        method: 'POST',
        url: 'https://grok.com/rest/rate-limits',
        headers: {
          'accept': '*/*',
          'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8',
          'content-type': 'application/json',
          'origin': 'https://grok.com',
          'referer': 'https://grok.com/?referrer=x',
          'baggage': 'sentry-environment=production,sentry-release=YJ8tdKT6176YR4WZuooH-,sentry-public_key=b311e0f2690c81f25e2c4cf6d4f7ce1c,sentry-trace_id=8ff9514b00d5429fb51d0625fe8d6ec9,sentry-sample_rate=0,sentry-sampled=false',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
          'Cookie': '_ga=GA1.1.1409377758.1740204883; sso=eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiYTQ5ZjRlODctZjg0Yi00ZTM3LTllNjktZDYyZTAxNzcyYWU0In0.d1ES0mvZavD8IQWfHQYxAWsnJ9soXxPUYOOfBQq34K4; sso-rw=eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX2lkIjoiYTQ5ZjRlODctZjg0Yi00ZTM3LTllNjktZDYyZTAxNzcyYWU0In0.d1ES0mvZavD8IQWfHQYxAWsnJ9soXxPUYOOfBQq34K4; i18nextLng=en; cf_clearance=7R0cQTp_9uO52d2W9mA52Z6wlZD6JM1c12WRn7aGddc-1743267256-1.2.1.1-5b0avYxt3QiP0.OgkPSDheEuNOh9mpp5MYlP0iF3IDVCON3m86YDGBmbLf1hpwEDueh8Q9XFxc3kh0qLJ3KaPHlxLUXKaOicXaE6RZHgeOTUz0NH4FnCmUVS5w1JpJ_HluFFtqeVP32MWFma4J.AITTbQf538qKPmhkflQgLXrWhd1PK7oM9ES6tD43kJxw_HjlBtU2n1x5Ih_ADXf_UiBh5JPP5OIhGJY.WnchslKNugY__rlXaldi.P02dE.UZnZz_b9ayzMeY8R8hPo4qQCpRLZ3CmsGP_iIAamA1OWmjc6W3wwn23vJt998mMf5HOJv_zNCEI4TYjky8C4O5NucEjK5qr91cn08VuRBnlQuu_u.WU5toV9c17rCauTKVfGXz1iOWsrZ.W400igxFlFgoB9rivSZWOg4FuhwQRj4; cf_chl_rc_m=1; _ga_8FEWB057YH=GS1.1.1743265925.77.1.1743267278.0.0.0'
        },
        data: {
          requestKind: "DEFAULT",
          modelName: "grok-latest"
        }
      });
      
      // Get the rate limits from the response (new format)
      grok2Limits = response.data;
      console.log('Successfully fetched Grok 2 rate limits:', grok2Limits);
    } catch (error) {
      console.error('Error fetching Grok 2 rate limits:', error.message);
      // Use default limits for Grok 2
    }

    // Since Grok 3 API call is failing with model not found (404), 
    // we're using default values for now until the correct endpoint is available
    const limits = {
      grok2: grok2Limits ? {
        // Use the new response format
        remaining: grok2Limits.remainingQueries || defaultLimits.grok2.remaining,
        total: grok2Limits.totalQueries || defaultLimits.grok2.total,
        windowSizeSeconds: grok2Limits.windowSizeSeconds || 3600
      } : defaultLimits.grok2,
      grok3: defaultLimits.grok3
    };

    // Send the combined limits
    res.json({ limits });
  } catch (error) {
    console.error('Error fetching Grok rate limits:', error);
    // Return default limits in case of error
    res.json({ 
      limits: {
        grok2: { remaining: 30, total: 30, windowSizeSeconds: 3600 },
        grok3: { remaining: 30, total: 30, windowSizeSeconds: 3600 }
      },
      error: 'Could not fetch real-time limits'
    });
  }
});

// API endpoint to create a new Qwen chat
app.post('/api/qwen/new-chat', async (req, res) => {
  try {
    const { message, isWebSearchEnabled = true, isThinkingEnabled = true } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate message ID - use the same ID throughout the request
    const messageId = generateId();
    
    // Use a single message object definition to avoid inconsistencies
    const messageObject = {
      id: messageId,
      parentId: null,
      childrenIds: [],
      role: "user",
      content: message,
      timestamp: Math.floor(Date.now() / 1000),
      models: ["qwen-max-latest"],
      chat_type: isWebSearchEnabled ? "search" : "t2t",
      feature_config: {
        thinking_enabled: isThinkingEnabled
      }
    };

    const requestBody = {
      chat: {
        id: "",
        title: "New Chat",
        models: ["qwen-max-latest"],
        params: {},
        history: {
          messages: {
            // Use the messageObject directly
            [messageId]: messageObject
          },
          currentId: messageId,
          currentResponseIds: [messageId]
        },
        messages: [
          // Use the same messageObject to ensure consistency
          messageObject
        ],
        tags: [],
        timestamp: Date.now(),
        chat_type: isWebSearchEnabled ? "search" : "t2t"
      }
    };

    // Set up the request to Qwen API
    const response = await axios({
      method: 'POST',
      url: 'https://chat.qwen.ai/api/v1/chats/new',
      headers: {
        'accept': 'application/json',
        'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8',
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTczOTMyMH0.yfMRiaiaBCRzSzw-GdpoNBjzVhMMsq6RMJVx7FLhfRw',
        'bx-ua': '231!VFG3kAmUHPS+joLEpk3BrqkjUq/YvqY2leOxacSC80vTPuB9lMZY9mRWFzrwLEf8CMxBx5Zj/IMKgVL+wXxkGw4YLXhhe2Kox49TYvfQIlvBx0gs8Vzu80lpm+GaYeSRDqOr6cg4fXC/a0XUceQ0xJDzLuHRW1TTPKxPv4yQNHqlkBJS+b7Y1Uy5XJvsEbFxAMsrDXbMyBTI4f3uVlNhGiD+Aw8e+Zd++6WF1cGA3VR7HJBh+++j+ygU3+jOQGGIRxebFkk3+gAg0XSGaJwkPXOvOsy4Bg9jC0dGbib7vjST2gTTVby/I2fV7V+daURjcVHIaLCOMh3Q01Mes8nR2gpzWtB1C1yZLOU+YVB0uGHEbd0nJ/Tq1WQMPpx0Sk3kcTWPZXO2cPmQaP/5WBEA/wvdIbi0NFvA9erxMBqxL1wWBdg786kAj9QT8knaH8oK+v+lRHeaURVVsqi203nh9pnf+a1BrAfTkn/aGqzkSm/RFAsAqj68hBj121+juT4M/W8FM2Hhc2ZmuwV5d30EL2HBMFH0JA8sJorCHRFoWP44vesxWDCRebHo2MsOgrAmd7VP5ckAa7mQoHrAp37qVEJW0GAU+Hwrq8y9lZRr4i6Fiv44Sdx7aYSCzUKojMulzb2XQF48SDYCVRQb4NSnTtgktuTLKI3R2YQmtLbgt8IjvpVeLnUZ762d7ORo/74fB0S/G70cPi740LZFQSAGFhqzcjCcvtE+9AyDxfg6KHzKqzcsk8xtmLAGCPtgfb4g6oc9pTYwpYQEmd+z4SXpUQyVIMyheQS/4TgzhkOC+zbR8EvKMEG8936AT3K1gxd+Mq/WlHbqWB2RMA7iiXUwWd1kv+MHHltqgoPRkMOYwSm6BBWu+LDzmq1kLCn5CSkjvsoDQwiCYysbsumEtfJZxTiLi/7zlV3nBausLxo6WqF+knfbo0YFgqv3nVJwaRhcU4MkbEKbCC7eJgCcfaSROWKRZOwYyh9XyOOLtfse+vnxnqh1bS/OCMI5zAKZtEaKwUm3QhIYOGu1Lnc6r3Lj9MiATgOJjyFjkOl0Kjkw4QXuOPshmGpgocXPv6tM87pECxl40D6Gkitt2CgEzq9+4TVQ/vaDXu1G4gi8jIkq/9D1SEcO654B64mYZlzR8EVf/efXZfsPWUgu2r1ADaNTv13i73J0p2i9cVzGJ1PQ6T/f89R74LbWbfPT6E4Rm0jlw2d2YEplOzlhCyWYOuEv/JiqOJAMuOs1jjleNhtUyyq/z6Lm9FwGuqTjsJSyKB7PRp88Vb8M3ULNd/q3QorYDvyVVhBkK3MgR4vqPVwVQnYwpwvzpnTMrUNLAZ1n8Sfz/faKMltCEwTLu0MrRNOK8zXonhV196ac0wgkZao95BSWwWFPgvwhHZDs469q01tIUWf/+IjTYCTKhJmvKbGq7jr00A/UBWvr7gPh2aPK8POm3VUCOQrZqCRkXet6YahZ+RFAEG5CpfthEX0DHZsRcmk64UytXXVTcAUruOm86pvGwRwpWbM0Cpnq0+91W4NHo+3G8oDvGqTW+M5AThbG',
        'bx-umidtoken': 'T2gAJ9PpsQ1ZZHcNVZ8Ho-DBOPvVonZHzqMl-5BP1pApOCqKXoW0I1qalmHuG4MWFR4=',
        'bx-v': '2.5.28',
        'content-type': 'application/json',
        'origin': 'https://chat.qwen.ai',
        'referer': 'https://chat.qwen.ai/',
        'source': 'web',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'Cookie': 'cna=ipFMIJBNS08CAWew0ni1ZrV2; _gcl_au=1.1.692043161.1741005706.281295935.1741005710.1741005709; _bl_uid=vUmd18I3sXagpawbeqaLnd8yFkaw; acw_tc=37a57088488fff5da412687d1481155b4cc92b30a4b3431960affd41a95f277b; x-ap=ap-southeast-1; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTg3MDc0OH0.fx9UsLfwoto2HSGK2CvBsbXzDfZPND0voYlliGoTpVg; SERVERID=6d5f041642c408b1e7f7a3de4ab2b194|1743278750|1743278746; ssxmod_itna=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeqieqkFD8n+5gD0yGPwtx0=7Df40WwGPobICkQm2xepZzQYH4iOizK=x4diUrYbnA57trSQ8c=40aDbuoz3keD44DvDBYD74G+DDeDixGmC4DStxD9DGP5ElbQheDEDYP5w4DmDGY5reDgIDDBDD=VU7pYuDDlRdN49G0Y3=aV8ZmdfQ+W57D5x0UaDBLPGtq5h=SEuGuWTzgrr4rDzdCDtquTSnEdIobNuCnrbGDmmse6QLYp+7DizGGQ+0KYirz0qDhXDreYb4+0xb0DRGxwitj5Pc4DG8ekGQdWdeii+LCvd1LkeeOoRopuOel7D3Cxo0QmOGSBwZB5kA5tGGNiGKGxo0z4D; ssxmod_itna2=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeqieqkFD8n+5wDDcAikt48TeDLe20+AQsDGN7bgt=29xrp=129ewoWtl7nqnp=u72rYmaQQ2=ufF/4MApyWGjp4FoHeODRDkPn7Nj2WrjcKx8D8c6aeFxu4bP2mgO07rl0W9rIQfP2K2=51IovHdnfGmxfLzrpIwPoNlIv7e0AH0Q8I9+OLRoK6ygLXDtfebIa4QM0W6/FWqmD1h8csvzFy78KQLF1zr3YLvcUXANDYmUzmY+fWAEi7RElOmRDj4Um2AU98RTZnr4=pyFv8+Y7YufiHehBWU+FbHWfHpicqEb4wWYrPI+Rzeej7w0Ieu+R4QGLAw1S+zzD7fu7fHI30CFqziwxzDhRw=NK27AQiWABF0FHH/n4Kxrs0DRxuSxQ=0nDhaXw7l9A+gxsu17FKnqxmwxR0mB9Dbd3HkWbi4zd9j4WluKYeCkD3TW1d0OMFCySAGR94MhoMGo0YbdN/x7ZFC9GQsqZ+uDFlDCO4lQhBD7zTIRi4DrKfQ7B0kZI1CkIswQ1=7uijUkpy0YUFmV=mcxxBhN4bNC0Xu0bFzKeD; tfstk=gOysMngwCFYsrG83jNIEAwcm2cDblr6rfniYqopwDAHtlna42jnwQGVbOrzsWrZcjm3Ykrg4_6WzjlDmHakfUTrg7fJh8PGt6kIx40YOYfBA65sIHa7PLOfBsJkY7zlmpwZK-mivMxUxpBnjJcLxkr3K90nyWxHYkMgKb089WxnvvHnjJqHxkxIQv2mjNWLIx1gUfG3clhMfFgqsRKpYdDsipl9MhDysfH07v265FJ9o14EtRKQlB15ol22R86Z3k5UZxr65RYFuR-G-hOTofWESpVkRNBM_YP2SB8_6QDlj5WetOnpYfvVtZSa15C0T_yGovXKfEDzrJl2TOiYLXzusBDhFegZKMWyiZR7pCYFubAPYywRZW7iA4RJrP_fBGHGkhDgPAMODisAOPKMVY74K6DmEUMsBaIctxDgPAMODifnnxQSCAQRc.; isg=BHJyoT1UQWWK2H10zzUgQuCBw7hUA3adI-DyJjxLeCUQzxbJDJOorzlpvnPznu41'
      },
      data: requestBody
    });

    // Return the response data, particularly the chat ID
    res.json({
      success: true,
      chatId: response.data.id,
      data: response.data
    });
  } catch (error) {
    console.error('Error creating new Qwen chat:', error);
    
    res.status(500).json({
      error: 'Failed to create new Qwen chat',
      details: error.message
    });
  }
});

// API endpoint to stream Qwen chat completions
app.post('/api/qwen/chat-completions', async (req, res) => {
  try {
    const { message, chatId, previousMessages, isWebSearchEnabled = true, isThinkingEnabled = true } = req.body;
    
    if (!message || !chatId) {
      return res.status(400).json({ error: 'Message and chatId are required' });
    }

    // Create a unique message ID for this request
    const messageId = generateId();
    
    // Create the current message object
    const currentMessage = {
      role: "user",
      content: message,
      chat_type: isWebSearchEnabled ? "search" : "t2t",
      extra: {},
      feature_config: {
        thinking_enabled: isThinkingEnabled
      }
    };
    
    // Prepare the messages array with previous messages
    let messages = Array.isArray(previousMessages) ? [...previousMessages] : [];
    
    // Add the current message only once
    messages.push(currentMessage);

    // Prepare the request body
    const requestBody = {
      stream: true,
      incremental_output: true,
      chat_type: isWebSearchEnabled ? "search" : "t2t",
      model: "qwen-max-latest",
      messages: messages,
      session_id: generateId(),
      chat_id: chatId,
      id: messageId
    };

    // Set up the request to Qwen API
    const response = await axios({
      method: 'POST',
      url: 'https://chat.qwen.ai/api/chat/completions',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en-GB;q=0.9,en;q=0.8',
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTczOTMyMH0.yfMRiaiaBCRzSzw-GdpoNBjzVhMMsq6RMJVx7FLhfRw',
        'bx-ua': '231!jCR3E4mUFO0+joZE2k3ioqBjUq/YvqY2leOxacSC80vTPuB9lMZY9mRWFzrwLEkVa1wFtLD+zQFbYWLEeZ+PqDypteVD4bcidv49os7ftup05rj0SjHecye37e4PpwO6MnJdLQlIUZqghtglF1Pk9VPTDOYkTELeOjtHC1b4QbDgjIT2rwWoxBpnMzJupRkQFj/RDgfR+7RqV8vUykLUurKhBODr+/mep4Dqk+I9xGdF/jDtjFlCok+++4mWYi++6bFcjORDvxBDj+MGMsMUJwZlv7NubwFnKU+BL2MSFovlJ5Z/ko+zvAR6FozG2vCVD+nK4261iJY1SPEADJS7bhX/ENQiTySW83ELsBT0ME58fMyLtuSnnVaTVKuQTkxi7YTBJhT9oH8/kAwe3+pC0aKL3FXYTOh9ZuvdG8x1/ejE2JE2RpBAWvqTMqQDE2Uirm+iu+zzRM2/B0f6pawWdizydz1uhTcZPZ3EDproeB0LmXaG1NxATql60COrHy/PTUkjkoJY8UQGenY+KbfiCz/dKKqTTio05BJuDmAR//pXss0whbZDeKxhyCbMSPFGwlaUWlHLPJRzIyOW/4CJyLJbb4IMf3lncpwxr+zsdGZaFwgPy2ojAKNU1fBk5XdLyGQArHmMY94mcLcYFFtIQgZk9837A26TEo2NNLumqnot43QR3H10y0dOik0hmUn7wgZ+x6sRYMss8JdikVuyHj50QB5xrnqwwE97f/UBGHS9cuoo6I+lGt5pqBozfRG8O4p+9y5rubhUTG6IAGGMs9Y7lx/VmnFjVTvEJct+gjHbojmlOLRFPb64Zm7UE9+qR9weRFkFnd3WFK34HqKUdS2AHXJzVPQdbYbBknaS250cnqb6Ty7aIMyhovVBiJdYv0D9nPgjc6MBbRKP4FywHiscHoPJPvWEW9brSnyw+1iNWMrPBFnDeRUUiOb1qYk7PJ8k+5+XtxDXbylaqPPtG9RsoELYeodI5W8owtrndu0RJJTlzcsBbGWnhkT33klsbX0gZecfdVhsWZPbo7CaE8FX7pPmk9bvohuF+JjvnxBeU1csTVPy+s8cb2TSqQC/ym0k5oK9mtTXos1Icge1HuG42OcbABqSkblkl0RpCTK2AwS8xfIo8XSZNsvO77BjC9M3x4jiFFgFNMceQdP50ATR3bg0ZXvaHA1+iUVhXPnNnDT+aRzTZBwv/P362NBCORKIStp9x7llZrQx6Y2UyxZo56DalxijvFsXEIzJSdGIa21soaoe+MpCxtG57Ccv56/H+9qnHH+h+iQXNkDrp0lQLmplSsVbp7LHGvIm4EERZ3Y8yv7d2jAEVNRYucEQ/Cve13wtt/NWm3zp3Cx7UXwmIs9NfCzpGKfg2Pvisg2OsmudEw8ctz/TOqk51wmY2oUEo8mPPlG/vrJpjczae1CUU4IgVsucd2nzeTfM3CricBdbvWUXs+RN7ILPy92HbtwaLf8L+WxgIXCJMI+7P4UUlPcwqSP2S9L0TIN+zFcsVBYo5h0K/R44PPPZPi5ripHWDArE0RgX5ipeL+1YVuBlD0Pw0nLmJ1FY7Z3xOAD/2npdm62f0aRKaxyJ',
        'bx-umidtoken': 'T2gAJ9PpsQ1ZZHcNVZ8Ho-DBOPvVonZHzqMl-5BP1pApOCqKXoW0I1qalmHuG4MWFR4=',
        'bx-v': '2.5.28',
        'content-type': 'application/json',
        'origin': 'https://chat.qwen.ai',
        'referer': `https://chat.qwen.ai/c/${chatId}`,
        'source': 'web',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
        'x-accel-buffering': 'no',
        'Cookie': 'cna=ipFMIJBNS08CAWew0ni1ZrV2; _gcl_au=1.1.692043161.1741005706.281295935.1741005710.1741005709; _bl_uid=vUmd18I3sXagpawbeqaLnd8yFkaw; x-ap=ap-southeast-1; acw_tc=218e65551f0ca9d4d6df9ffb7b4b9a287784a6fe2295fab2299e327ca382409e; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjMDc2OGYxLTJhNGItNDIwOS05Nzg1LTdjNTc1ODEyZGU0NiIsImV4cCI6MTc0NTg3MjYyOH0.JZiJUEeAOIISv_6ZYTlJrm6cLxg1eR5bRi_XtwM7Wd0; SERVERID=6d5f041642c408b1e7f7a3de4ab2b194|1743280629|1743278746; ssxmod_itna=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeiUm=Nz77WmPgD0yGwvDBKQDax7fr0+eoTU=KRBD+ReKzQYHXQYZ1KWeqYyjOxRuv5ndxSQOo4B3DEcmvRKxGGD0oDt4DIDAYDDxDWDYEIDGUTDG=D7E2o6lR5xi3DbErADDoDYf2qxiUoDDtDiLXdFxRQDDXlRwG=KQ4br6NFNg43wDcxKArDjkPD/8hvuA2HhFSQ9eamaFWmteGyD5GuUletkS+OGjTQP1meYDEB5oLzKoUx+7DizGGQ+0KYD/e4YSc8Dxl+0xb0DR0qFTtfveu4DG8e3DwwGYeYihwCIq1fkeoCoRgmuEY=Q4G7xoA5moxg75IOqKOqG7qelx4nDQiIOiDD; ssxmod_itna2=eqAxyiGQi=MDgDIxeKjxKqDq0KDOeDCIDl4BtGRDeq7UtGcD8ox0P8+U2xmAeiUm=Nz77WmPwDDcA=oKQRDA=DFoRwxbOtDDs0KD8hnUzpI0046r4q+3x6O4schM0Nmb7djn0Dk7kc0oWyDCehF/eI4WphhTca1rWBWq0qOqGvxb=DimcwxCEq7kDKms9eaoicKC628FbcOgZYksUKfKa3aX/O89F7HAzc61rDGERa4XpyjtIoa/tD7xqk199KQe5jv3ydH7+oE0nSkr7ZDbII0L=fXDLBCAVDYCcSWmuP2Lr0um1Sf0opxR0qUvzic1BR4FuBbGVW9KG+Fbixo96nxCKHhKe+C9blbKR2kiF19iKY9KlAFCpY2boamlnBqiPoX4xFikCaQOga8beKrKlreFmp3wkK83=8oy4eWaKnhTYR5V74R2tSxhFDL9GNySWv8KeD; tfstk=gLGSVCZPNgj5__smr3L4lnmUONVIRDON2waKS2CPJ7F8AwiEWJUPaUDIhDo72bP82ZUIjP_-TJ38AoUtf8CdeJUIGzosL6389JwQ5cULyHvuMrUgwJDzYurQO2m6uhRw_40utSKwbC7bLw_0_aUdYy3YMWzBgSjPa40utZxoJFuorMsoFIu89DFYHPz79yUdeENY7PNdwJCRHiE0JWFLe63AkyUgvTB-vqLbSoEL98hVRiaDFouWykYYDsOTn4Ef96hWE-Z1voU0ljTLelu8p6Cp-zw7X4EXjDS2S-33dXbhOR3-ID4t2gKQxjgxwAn90Tr-CygZd4dRM7loyAeK6HXKf7iQBbefJ13oyuPbkfLFIolb4Dh7HF5_LShaB7H2n3yUNPiKZ0_C9c3q7b2mOhsYxYzgMyGHW9ZQpg7N_l9Mh9_bI6abbETfK9vheh1QTEkiD8U0u58XlOW3er4bbETfK928orXwlE6NK; isg=BEFBtwDiwngWaS5hsMhDr7eEUI1bbrVgVAXBk6OWpMimimNc776ZMjbMbebM202Y'
      },
      data: requestBody,
      responseType: 'stream',
      maxRedirects: 5,
      timeout: 60000
    });

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Process the streaming response
    response.data.on('data', (chunk) => {
      try {
        const dataStr = chunk.toString();
        
        // Forward the data as-is in the correct SSE format
        if (dataStr.trim()) {
          res.write(dataStr + '\n\n');
        }
      } catch (err) {
        console.error('Error processing Qwen stream chunk:', err);
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
    console.error('Error proxying request to Qwen chat completions:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to get response from Qwen chat completions',
        details: error.message
      });
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 