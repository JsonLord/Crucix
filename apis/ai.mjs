import { createLLMProvider } from '../lib/llm/index.mjs';

export async function analyzeLogs(config, spaceId, logLines, readmeContent) {
  const llmProvider = createLLMProvider(config.llm);
  if (!llmProvider) return "LLM provider is not configured. Add LLM_PROVIDER to .env.";

  const systemPrompt = `You are a DevOps and AI system analyst monitoring Hugging Face Spaces.
Your task is to analyze the recent logs from the Space "${spaceId}".
Read the following container and build logs, identify any errors, bottlenecks, or state issues (running, paused, crashing), and provide a concise technical summary of what is happening.
If a README is provided, use it to understand the context of the space.
Focus only on actionable insights. Format your output nicely in plain text or simple markdown (no HTML tags, just headers and bullet points).`;

  const logsText = logLines.length ? logLines.join('\n') : "No recent logs available.";
  const userPrompt = `README Context:\n${readmeContent || 'No README provided.'}\n\nRecent Logs:\n${logsText}`;

  try {
    const analysis = await llmProvider.generate(systemPrompt, userPrompt);
    return analysis;
  } catch (e) {
    console.error("LLM Analysis Error:", e);
    return `Analysis failed: ${e.message}`;
  }
}
