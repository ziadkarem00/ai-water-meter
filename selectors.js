/**
 * ============================================================================
 * AI WATER METER (HydroPrompt) — DOM SELECTORS & ADAPTERS (ChatGPT & Gemini)
 * ============================================================================
 * WHY THIS FILE EXISTS:
 * ChatGPT (chatgpt.com / chat.openai.com) and Google Gemini (gemini.google.com)
 * frequently update their front-end frameworks (React / Angular) and CSS class
 * names. To make maintenance effortless, ALL DOM selectors are centralized here
 * in prioritized fallback arrays.
 *
 * HOW TO UPDATE SELECTORS IF A SITE CHANGES ITS LAYOUT:
 * 1. Open ChatGPT or Gemini in Chrome, right-click an AI reply, and click "Inspect".
 * 2. Look for semantic attributes (`data-message-author-role`, `data-testid`,
 *    custom elements like `<model-response>` or `<user-query>`) rather than
 *    minified Tailwind/hashed class names.
 * 3. Add the new selector to the TOP of the relevant array in `SITE_SELECTORS` below.
 * 4. Reload the extension at `chrome://extensions`.
 * ============================================================================
 */

(function (root) {
  'use strict';

  const SITE_SELECTORS = {
    chatgpt: {
      name: 'ChatGPT',
      hostPatterns: ['chatgpt.com', 'chat.openai.com'],

      // Main scrollable conversation root to verify we are on a valid chat view
      chatContainer: [
        'main',
        '[role="main"]',
        'div[class*="react-scroll-to-bottom"]',
        'body'
      ],

      // Selectors for individual AI (assistant) message nodes, ordered most-specific first
      assistantMessages: [
        '[data-message-author-role="assistant"]',
        'article[data-testid^="conversation-turn-"]:has([data-message-author-role="assistant"])',
        'div[data-testid^="conversation-turn-"]:has([data-message-author-role="assistant"])',
        '.agent-turn [data-message-author-role="assistant"]',
        '.agent-turn'
      ],

      // Selectors for user prompt nodes (used to pair an AI reply with the prompt that triggered it)
      userMessages: [
        '[data-message-author-role="user"]',
        'article[data-testid^="conversation-turn-"]:has([data-message-author-role="user"])',
        'div[data-testid^="conversation-turn-"]:has([data-message-author-role="user"])',
        '.user-turn'
      ],

      // Inner text container inside an assistant message (avoids counting button labels)
      assistantTextContent: [
        '.markdown',
        '.prose',
        '[data-message-author-role="assistant"]'
      ],

      // Where to append the baby blue per-message water badge inside/under an assistant turn
      badgeAnchor: [
        '.markdown',
        '.prose',
        '[data-message-author-role="assistant"]'
      ],

      // Indicators that the assistant message is currently streaming tokens
      streamingIndicators: [
        'button[data-testid="stop-button"]',
        'button[aria-label*="Stop streaming"]',
        'button[aria-label*="Stop generating"]',
        '.result-streaming'
      ],

      // Indicators that this message used a "Thinking / Reasoning" model (o1, o3, GPT-5 Thinking, etc.)
      reasoningIndicators: [
        '[data-testid*="thought"]',
        'button[aria-label*="Thought for"]',
        '[class*="thinking"]',
        '[class*="reasoning"]'
      ],

      // Regex patterns on surrounding turn metadata that indicate a reasoning trace
      reasoningTextPatterns: [
        /Thought for \d+/i,
        /Reasoned for \d+/i,
        /Thinking\.\.\./i,
        /\b(o1|o3|o4-mini|GPT-5 Thinking|Deep Research)\b/i
      ]
    },

    gemini: {
      name: 'Google Gemini',
      hostPatterns: ['gemini.google.com'],

      // Main conversation container on Gemini (Angular custom elements + standard containers)
      chatContainer: [
        'chat-window',
        'main',
        '[role="main"]',
        '.chat-history',
        'body'
      ],

      // Selectors for Gemini model replies
      assistantMessages: [
        'model-response',
        'message-content.model-response-text',
        '.model-response-text',
        '[data-message-author-role="model"]',
        '.response-container-content'
      ],

      // Selectors for Gemini user prompts
      userMessages: [
        'user-query',
        'user-query-content',
        '.user-query-container',
        '[data-message-author-role="user"]'
      ],

      // Inner text container inside a Gemini reply
      assistantTextContent: [
        'message-content',
        '.model-response-text',
        '.markdown',
        '.response-content'
      ],

      // Where to append the baby blue per-message badge on Gemini
      badgeAnchor: [
        'message-content',
        '.model-response-text',
        '.response-container-content',
        'model-response'
      ],

      // Indicators that Gemini is actively streaming a response
      streamingIndicators: [
        'button[aria-label*="Stop response"]',
        'button[aria-label*="Stop generating"]',
        '.streaming-indicator',
        'mat-progress-bar'
      ],

      // Indicators that Gemini used a "Thinking" model (e.g., Gemini 2.5/3.0 Thinking / Deep Think)
      reasoningIndicators: [
        'thinking-process',
        'mat-expansion-panel.thinking-panel',
        '[data-test-id*="thinking"]',
        '[aria-label*="Show thinking"]',
        '[aria-label*="Hide thinking"]',
        '.thoughts-container',
        '.thinking-header'
      ],

      reasoningTextPatterns: [
        /Show thinking/i,
        /Hide thinking/i,
        /Thought process/i,
        /\b(Gemini.*Thinking|Deep Think)\b/i
      ]
    }
  };

  /**
   * Detects which supported platform the current hostname belongs to.
   * @param {string} [hostname]
   * @returns {'chatgpt' | 'gemini' | null}
   */
  function detectPlatform(hostname) {
    const host = (hostname || (typeof location !== 'undefined' ? location.hostname : '')).toLowerCase();
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
      return 'chatgpt';
    }
    if (host.includes('gemini.google.com')) {
      return 'gemini';
    }
    return null;
  }

  /**
   * Extracts a stable per-chat identifier from the current URL so switching chats
   * or clicking "New chat" resets the per-chat counter while preserving history.
   * @param {string} [urlStr]
   * @returns {string}
   */
  function getChatIdFromUrl(urlStr) {
    try {
      const raw = urlStr || (typeof location !== 'undefined' ? location.href : '');
      const url = new URL(raw, 'https://chatgpt.com');
      const platform = detectPlatform(url.hostname) || 'unknown';
      const path = url.pathname.replace(/\/+$/, '') || '/';

      // ChatGPT conversation URLs: /c/<uuid> or /g/<gpt-id>/c/<uuid>
      const chatgptMatch = path.match(/\/c\/([a-zA-Z0-9_-]+)/);
      if (chatgptMatch) {
        return `chatgpt:${chatgptMatch[1]}`;
      }

      // Gemini conversation URLs: /app/<id> or /gem/<gem-id>/<id>
      const geminiMatch = path.match(/\/(?:app|gem\/[^/]+)\/([a-zA-Z0-9_-]+)/);
      if (geminiMatch) {
        return `gemini:${geminiMatch[1]}`;
      }

      // Root / New Chat URL (before an ID is assigned)
      return `${platform}:root:${path}`;
    } catch (_) {
      return 'unknown:default';
    }
  }

  /**
   * Queries the DOM using an array of fallback selectors, returning the first non-empty
   * NodeList (as an Array) or deduplicated combined nodes when appropriate.
   * @param {string[]} selectorList
   * @param {ParentNode} [rootNode=document]
   * @returns {Element[]}
   */
  function queryWithFallbacks(selectorList, rootNode) {
    const scope = rootNode || (typeof document !== 'undefined' ? document : null);
    if (!scope || !Array.isArray(selectorList)) return [];

    for (let i = 0; i < selectorList.length; i++) {
      const sel = selectorList[i];
      try {
        const found = scope.querySelectorAll(sel);
        if (found && found.length > 0) {
          // Filter out nested duplicates (e.g. if both outer wrapper and inner node match)
          const arr = Array.from(found);
          return arr.filter((el, idx) => !arr.some((other, oIdx) => idx !== oIdx && other.contains(el)));
        }
      } catch (_) {
        // Ignore unsupported selector syntax (e.g. :has in older engines) and try next fallback
      }
    }
    return [];
  }

  /**
   * Finds the first matching element from a selector fallback list.
   * @param {string[]} selectorList
   * @param {ParentNode} [rootNode=document]
   * @returns {Element|null}
   */
  function queryFirstWithFallbacks(selectorList, rootNode) {
    const scope = rootNode || (typeof document !== 'undefined' ? document : null);
    if (!scope || !Array.isArray(selectorList)) return null;
    for (let i = 0; i < selectorList.length; i++) {
      try {
        const el = scope.querySelector(selectorList[i]);
        if (el) return el;
      } catch (_) {
        // Continue to next fallback
      }
    }
    return null;
  }

  /**
   * Extracts clean visible text from an assistant message node without counting
   * our own injected badge or hidden script/style elements.
   * @param {Element} messageEl
   * @param {'chatgpt' | 'gemini'} platform
   * @returns {string}
   */
  function extractMessageText(messageEl, platform) {
    if (!messageEl) return '';
    try {
      const cfg = SITE_SELECTORS[platform] || SITE_SELECTORS.chatgpt;
      const contentEl = queryFirstWithFallbacks(cfg.assistantTextContent, messageEl) || messageEl;
      const clone = contentEl.cloneNode(true);
      // Remove any injected AI Water Meter host elements or hidden tags
      const injected = clone.querySelectorAll('[data-ai-water-meter], script, style, svg, button');
      injected.forEach((node) => node.remove());
      return (clone.innerText || clone.textContent || '').trim();
    } catch (_) {
      return (messageEl.textContent || '').trim();
    }
  }

  /**
   * Determines whether an assistant message element (or its surrounding turn container)
   * exhibits indicators of a "thinking / reasoning" model.
   * @param {Element} messageEl
   * @param {'chatgpt' | 'gemini'} platform
   * @returns {boolean}
   */
  function detectReasoningMode(messageEl, platform) {
    if (!messageEl) return false;
    try {
      const cfg = SITE_SELECTORS[platform] || SITE_SELECTORS.chatgpt;
      const turnRoot = messageEl.closest('article, model-response, [data-testid^="conversation-turn-"]') || messageEl.parentElement || messageEl;

      // 1. Check DOM selectors for thought/reasoning blocks
      for (let i = 0; i < cfg.reasoningIndicators.length; i++) {
        try {
          if (turnRoot.querySelector(cfg.reasoningIndicators[i])) {
            return true;
          }
        } catch (_) {}
      }

      // 2. Check surrounding header/button text for reasoning patterns
      const turnText = (turnRoot.innerText || turnRoot.textContent || '').slice(0, 600);
      for (let j = 0; j < cfg.reasoningTextPatterns.length; j++) {
        if (cfg.reasoningTextPatterns[j].test(turnText)) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  /**
   * Checks whether the page is currently streaming an AI reply.
   * @param {'chatgpt' | 'gemini'} platform
   * @returns {boolean}
   */
  function isPageStreaming(platform) {
    const cfg = SITE_SELECTORS[platform] || SITE_SELECTORS.chatgpt;
    return Boolean(queryFirstWithFallbacks(cfg.streamingIndicators, document));
  }

  /**
   * Generates or retrieves a stable ID for a message DOM element so each reply
   * is counted once and updated cleanly during streaming.
   * @param {Element} messageEl
   * @param {number} indexFallback
   * @returns {string}
   */
  function getOrAssignMessageId(messageEl, indexFallback) {
    if (!messageEl) return `msg-${indexFallback || 0}`;
    const existing = messageEl.getAttribute('data-aiwm-msg-id');
    if (existing) return existing;

    const nativeId =
      messageEl.getAttribute('data-message-id') ||
      messageEl.getAttribute('id') ||
      (messageEl.closest('[data-testid]') && messageEl.closest('[data-testid]').getAttribute('data-testid')) ||
      `aiwm-turn-${indexFallback}-${Date.now().toString(36)}`;

    messageEl.setAttribute('data-aiwm-msg-id', nativeId);
    return nativeId;
  }

  const SelectorsModule = {
    SITE_SELECTORS,
    detectPlatform,
    getChatIdFromUrl,
    queryWithFallbacks,
    queryFirstWithFallbacks,
    extractMessageText,
    detectReasoningMode,
    isPageStreaming,
    getOrAssignMessageId
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelectorsModule;
  }
  root.AIWaterMeterSelectors = SelectorsModule;
})(typeof globalThis !== 'undefined' ? globalThis : window);
