const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

let _client;
function getClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * Sleep helper for retry backoff.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Claude with automatic retry on transient errors (rate limits, 5xx, network).
 */
async function callClaudeWithRetry(prompt, maxTokens) {
  const client = getClient();
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      return message.content[0].text.trim();
    } catch (err) {
      lastError = err;
      const isRetryable =
        err.status === 429 ||     // rate limit
        err.status === 529 ||     // overloaded
        (err.status >= 500 && err.status < 600) || // server error
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT';

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`Claude API attempt ${attempt + 1} failed (${err.status || err.code}), retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  throw lastError;
}

/**
 * Call Claude and parse a JSON response from the message content.
 * Returns a safe fallback value if the response can't be parsed.
 */
async function callClaudeJSON(prompt, maxTokens = 4096, fallback = null) {
  const text = await callClaudeWithRetry(prompt, maxTokens);
  try {
    return extractJSON(text);
  } catch (err) {
    console.error('Claude JSON parse failed. Raw response:', text.slice(0, 500));
    if (fallback !== null) return fallback;
    throw new Error('The AI returned an unreadable response. Please try again.');
  }
}

/**
 * Call Claude and return raw text.
 */
async function callClaudeText(prompt, maxTokens = 4096) {
  return callClaudeWithRetry(prompt, maxTokens);
}

/**
 * Extract the first valid JSON array or object from a string.
 * Claude sometimes adds preamble text despite instructions.
 */
function extractJSON(text) {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {}

  // Strip markdown code fences
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {}

  // Try to find a JSON array or object
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }

  throw new Error('Could not parse JSON from Claude response.');
}

module.exports = { callClaudeJSON, callClaudeText };
