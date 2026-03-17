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
const LOG_BUFFER_SIZE = 500;
const logBuffers = {}; // { spaceId: [line1, line2...] }

// Serve jarvis.html at root
app.get('/', (req, res) => {
  res.sendFile(join(PUBLIC_DIR, 'jarvis.html'));
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
    const data = await stateManager.client.getSpaceStatus(spaceId);
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

const proxySse = (req, res, targetUrl, spaceId) => {
  const token = config.hf.token;
  if (!token) {
    return res.status(500).send('HF_TOKEN not configured');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const headers = { 'Authorization': `Bearer ${token}` };
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
  proxySse(req, res, url, spaceId);
});

app.get('/api/spaces/:profile/:space/logs/build', (req, res) => {
  const { profile, space } = req.params;
  const spaceId = `${profile}/${space}`;
  const url = `https://huggingface.co/api/spaces/${profile}/${space}/logs/build`;
  proxySse(req, res, url, spaceId);
});

app.post('/api/analyze', async (req, res) => {
  const { profile, space } = req.body;
  const spaceId = `${profile}/${space}`;

  let readme = '';
  try {
     readme = await stateManager.client.getSpaceReadme(spaceId);
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

app.listen(config.port, () => {
  console.log(`[Crucix/HF] Dashboard live at http://localhost:${config.port}`);

  // Initial sweep
  stateManager.refreshAll();

  // Background sweep
  const intervalMs = config.refreshIntervalMinutes * 60 * 1000;
  setInterval(() => stateManager.refreshAll(), intervalMs);
  console.log(`[Crucix/HF] Background sweep scheduled every ${config.refreshIntervalMinutes}m`);
});
