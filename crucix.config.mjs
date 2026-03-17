// Hugging Face Space Monitor Configuration — all settings with env var overrides

import './apis/utils/env.mjs'; // Load .env first

// Parse multiple HF_PROFILE_X and HF_TOKEN_X pairs
function getHfProfiles() {
  const profiles = [];
  // Support up to a reasonable number of profiles, e.g., 20
  for (let i = 1; i <= 20; i++) {
    const profileName = process.env[`HF_PROFILE_${i}`]?.trim();
    const token = process.env[`HF_TOKEN_${i}`]?.trim() || null;
    if (profileName) {
      profiles.push({ name: profileName, token: token, id: `profile_${i}` });
    }
  }
  return profiles;
}

export default {
  port: parseInt(process.env.PORT) || 3117,
  refreshIntervalMinutes: parseInt(process.env.REFRESH_INTERVAL_MINUTES) || 30,

  hf: {
    profiles: getHfProfiles(), // Array of { name: 'huggingface', token: '...', id: 'profile_1' }
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
