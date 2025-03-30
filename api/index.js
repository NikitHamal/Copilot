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

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream processing for Blackbox
    response.data.on('data', (chunk) => {
      try {
        // Forward the data as-is
        const dataStr = chunk.toString();
        res.write(dataStr);
      } catch (err) {
        console.error('Error processing Blackbox stream chunk:', err);
      }
    });

    // Handle end of stream
    response.data.on('end', () => {
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

// Utility function to generate a random ID
function generateId() {
  return 'id-' + Math.random().toString(36).substring(2, 9);
}

// For Vercel serverless functions, export the app
module.exports = app; 