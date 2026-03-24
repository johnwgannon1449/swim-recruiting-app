/**
 * Strip prompt injection attempts from user-supplied text before
 * it flows into Claude prompts. Removes common jailbreak patterns.
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /you\s+are\s+now\s+(a\s+)?(?:an?\s+)?(?:different|new|other|evil|unrestricted)/gi,
  /act\s+as\s+(?:a\s+)?(?:DAN|jailbreak|unrestricted|evil)/gi,
  /\[system\]/gi,
  /\[assistant\]/gi,
  /<\|system\|>/gi,
  /<\|assistant\|>/gi,
  /###\s*system/gi,
  /###\s*instruction/gi,
  /new\s+instructions?:/gi,
  /override\s+instructions?/gi,
];

/**
 * Sanitize a string that will be embedded in a Claude prompt.
 * Removes known injection patterns and limits length.
 *
 * @param {string} text - Raw user input
 * @param {number} maxLength - Maximum character length (default 50000)
 * @returns {string} Sanitized text
 */
function sanitizePromptInput(text, maxLength = 50000) {
  if (typeof text !== 'string') return '';

  let sanitized = text;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[removed]');
  }

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '\n[Content truncated for processing]';
  }

  return sanitized;
}

module.exports = { sanitizePromptInput };
