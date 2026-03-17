// Hugging Face Space Monitor Configuration — all settings with env var overrides

import './apis/utils/env.mjs'; // Load .env first

export default {
  port: parseInt(process.env.PORT) || 3117,
  refreshIntervalMinutes: parseInt(process.env.REFRESH_INTERVAL_MINUTES) || 30,

  hf: {
    token: process.env.HF_TOKEN || null,
    profiles: process.env.HF_PROFILES ? process.env.HF_PROFILES.split(',').map(s => s.trim()) : [],
  },

  llm: {
    provider: process.env.LLM_PROVIDER || null, // anthropic | openai | gemini | codex
    apiKey: process.env.LLM_API_KEY || null,
    model: process.env.LLM_MODEL || null,
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || null,
    chatId: process.env.TELEGRAM_CHAT_ID || null,
    botPollingInterval: parseInt(process.env.TELEGRAM_POLL_INTERVAL) || 5000,
    channels: process.env.TELEGRAM_CHANNELS || null, // Comma-separated extra channel IDs
  },

  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN || null,
    channelId: process.env.DISCORD_CHANNEL_ID || null,
    guildId: process.env.DISCORD_GUILD_ID || null,   // Server ID (for instant slash command registration)
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || null, // Fallback: webhook-only alerts (no bot needed)
  },
};
