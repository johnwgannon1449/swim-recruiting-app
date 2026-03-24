const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

let _client;
function getClient() {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * Call Claude and parse a JSON response from the message content.
 * Throws if the response can't be parsed as valid JSON.
 */
async function callClaudeJSON(prompt, maxTokens = 4096) {
  const client = getClient();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim();
  return extractJSON(text);
}

/**
 * Call Claude and return raw text.
 */
async function callClaudeText(prompt, maxTokens = 4096) {
  const client = getClient();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return message.content[0].text.trim();
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

  // Try to find a JSON array or object
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }

  throw new Error('Claude returned an unparseable response. Please try again.');
}

module.exports = { callClaudeJSON, callClaudeText };
