#!/usr/bin/env node
// Crucix Intelligence Engine — Dev Server -> Adapted for Hugging Face

import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import config from './crucix.config.mjs';
import { StateManager } from './apis/state.mjs';
import { analyzeLogs } from './apis/ai.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PUBLIC_DIR = join(ROOT, 'dashboard', 'public');

const app = express();
app.use(express.static(PUBLIC_DIR));
app.use(express.json());

const stateManager = new StateManager(config);
const LOG_BUFFER_SIZE = 100;
const logBuffers = {}; // { spaceId: [line1, line2...] }

// Serve jarvis.html at root
app.get('/', (req, res) => {
  res.sendFile(join(PUBLIC_DIR, 'jarvis.html'));
});

// ─── MANDATORY HF ENDPOINTS ────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get('/api-docs', (req, res) => {
  // Return simple JSON API documentation as required by the spec
  res.json({
    openapi: "3.0.0",
    info: { title: "Git-Auto-Deploy API", version: "1.0.0" },
    paths: {
      "/health": { get: { description: "Health check", responses: { "200": { description: "OK" } } } },
      "/api/state": { get: { description: "Get monitored HF spaces state", responses: { "200": { description: "JSON state" } } } },
      "/api/refresh": { post: { description: "Refresh all spaces", responses: { "200": { description: "Success" } } } },
      "/api/refresh/{profile}/{space}": { post: { description: "Refresh a specific space", parameters: [{name:"profile", in:"path"}, {name:"space", in:"path"}] } },
      "/api/spaces/{profile}/{space}/logs/run": { get: { description: "SSE stream for run logs", parameters: [{name:"profile", in:"path"}, {name:"space", in:"path"}] } },
      "/api/spaces/{profile}/{space}/logs/build": { get: { description: "SSE stream for build logs", parameters: [{name:"profile", in:"path"}, {name:"space", in:"path"}] } },
      "/api/analyze": { post: { description: "Analyze logs with AI", requestBody: { content: {"application/json": {schema: {type: "object", properties: {profile: {type:"string"}, space: {type:"string"}}}}} } } }
    }
  });
});

// ─── API ENDPOINTS ─────────────────────────────────────────────────────────

app.get('/api/state', (req, res) => {
  res.json(stateManager.getState());
});

app.post('/api/refresh', async (req, res) => {
  const result = await stateManager.refreshAll();
  res.json({ success: true, data: result });
});

app.post('/api/refresh/:profile/:space', async (req, res) => {
  const { profile, space } = req.params;
  const spaceId = `${profile}/${space}`;
  try {
    const client = stateManager.getClient(profile);
    if (!client) {
      return res.status(404).json({ error: "Profile not found" });
    }
    const data = await client.getSpaceStatus(spaceId);
    if (stateManager.state[profile]) {
      const idx = stateManager.state[profile].findIndex(s => s.id === spaceId);
      if (idx !== -1) {
        stateManager.state[profile][idx].status = data.runtime?.stage || 'UNKNOWN';
        stateManager.state[profile][idx].hardware = data.runtime?.hardware || 'cpu';
      }
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const proxySse = (req, res, targetUrl, spaceId, profile) => {
  // Always use the injected token from environment for API requests if available, fallback to profile tokens
  // The user prompt specifically mentions HF_TOKEN
  const systemToken = process.env.HF_TOKEN;
  const token = systemToken || stateManager.getToken(profile);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!logBuffers[spaceId]) logBuffers[spaceId] = [];

  fetch(targetUrl, { headers })
    .then(hfResponse => {
      if (!hfResponse.ok) {
         res.write(`data: {"error": "Failed to connect to HF logs (${hfResponse.status})"}\n\n`);
         res.end();
         return;
      }

      hfResponse.body.on('data', chunk => {
        const textChunk = chunk.toString();
        const lines = textChunk.split('\n').filter(Boolean);
        for(let line of lines) {
            logBuffers[spaceId].push(line);
            if (logBuffers[spaceId].length > LOG_BUFFER_SIZE) {
                logBuffers[spaceId].shift();
            }
        }
        res.write(textChunk);
      });

      hfResponse.body.on('end', () => res.end());
      hfResponse.body.on('error', (err) => res.end());
    })
    .catch(err => {
      res.write(`data: {"error": "Connection error"}\n\n`);
      res.end();
    });
};

app.get('/api/spaces/:profile/:space/logs/run', (req, res) => {
  const { profile, space } = req.params;
  const spaceId = `${profile}/${space}`;
  const url = `https://huggingface.co/api/spaces/${profile}/${space}/logs/run`;
  proxySse(req, res, url, spaceId, profile);
});

app.get('/api/spaces/:profile/:space/logs/build', (req, res) => {
  const { profile, space } = req.params;
  const spaceId = `${profile}/${space}`;
  const url = `https://huggingface.co/api/spaces/${profile}/${space}/logs/build`;
  proxySse(req, res, url, spaceId, profile);
});

app.post('/api/analyze', async (req, res) => {
  const { profile, space } = req.body;
  const spaceId = `${profile}/${space}`;

  let readme = '';
  try {
     const client = stateManager.getClient(profile);
     if(client) {
       readme = await client.getSpaceReadme(spaceId);
     }
  } catch (e) {}

  const recentLogs = logBuffers[spaceId] || [];
  try {
     const analysis = await analyzeLogs(config, spaceId, recentLogs, readme);
     res.json({ success: true, analysis });
  } catch (e) {
     res.status(500).json({ error: e.message });
  }
});

// ─── STARTUP ─────────────────────────────────────────────────────────────

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[Crucix/HF] Dashboard live at http://0.0.0.0:${config.port}`);

  // Initial sweep
  stateManager.refreshAll();

  // Background sweep
  const intervalMs = config.refreshIntervalMinutes * 60 * 1000;
  setInterval(() => stateManager.refreshAll(), intervalMs);
  console.log(`[Crucix/HF] Background sweep scheduled every ${config.refreshIntervalMinutes}m`);
});
