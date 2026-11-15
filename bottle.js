/**
 * ============================================================================
 * AI WATER METER — SIGNATURE 1-LITER BABY BLUE BOTTLE & INLINE SVG ICON SYSTEM
 * ============================================================================
 * Crafted Indie Desktop Utility Aesthetic:
 * - Recognizable 1-liter bottle proportions with rounded shoulders, slim neck,
 *   cap, subtle graduation ticks, gentle left specular highlight, light internal
 *   shading, and restrained drop shadow.
 * - Subtle, understated facial expression (two tiny eyes and a small mouth line)
 *   that shifts gently across 'sleepy', 'happy', 'sweating', and 'celebrating'
 *   without loud cartoon clutter.
 * - Clean inline SVG icon set with consistent 1.75px stroke weight (no emoji
 *   clutter in the UI).
 * ============================================================================
 */

(function (root) {
  'use strict';

  function getBottleStyles() {
    return `
      .aiwm-bottle-stage {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        user-select: none;
      }

      .aiwm-bottle-svg {
        display: block;
        overflow: visible;
        filter: drop-shadow(0 6px 14px rgba(35, 107, 148, 0.14));
        transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
      }

      .aiwm-bottle-stage:hover .aiwm-bottle-svg,
      .aiwm-bottle-stage:focus-visible .aiwm-bottle-svg {
        transform: translateY(-1.5px);
      }

      .aiwm-water-level-group,
      .aiwm-cooling-level-group {
        transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
        will-change: transform;
      }

      @keyframes aiwmWaveSlide {
        0% { transform: translateX(0px); }
        50% { transform: translateX(-24px); }
        100% { transform: translateX(-48px); }
      }

      @keyframes aiwmWaveSlideBack {
        0% { transform: translateX(-48px); }
        50% { transform: translateX(-24px); }
        100% { transform: translateX(0px); }
      }

      .aiwm-wave-front {
        animation: aiwmWaveSlide 4.8s ease-in-out infinite alternate;
      }

      .aiwm-wave-back {
        animation: aiwmWaveSlideBack 6.2s ease-in-out infinite alternate;
      }

      @keyframes aiwmBubbleRise {
        0% { transform: translateY(0px) scale(0.85); opacity: 0; }
        25% { opacity: 0.65; }
        80% { opacity: 0.5; }
        100% { transform: translateY(-88px) scale(1.08); opacity: 0; }
      }

      .aiwm-bubble { animation: aiwmBubbleRise 4.2s ease-in infinite; }
      .aiwm-bubble.b2 { animation-duration: 5.1s; animation-delay: 1.4s; }
      .aiwm-bubble.b3 { animation-duration: 3.7s; animation-delay: 2.6s; }

      /* Subtle expression states on the bottle */
      .aiwm-face-mood { display: none; }
      .aiwm-bottle-stage[data-mood="sleepy"] .aiwm-face-sleepy,
      .aiwm-bottle-stage:not([data-mood]) .aiwm-face-sleepy { display: inline; }
      .aiwm-bottle-stage[data-mood="happy"] .aiwm-face-happy { display: inline; }
      .aiwm-bottle-stage[data-mood="sweating"] .aiwm-face-sweating { display: inline; }
      .aiwm-bottle-stage[data-mood="celebrating"] .aiwm-face-celebrating { display: inline; }

      @keyframes aiwmCelebratePop {
        0% { transform: scale(0.75); opacity: 0; }
        35% { transform: scale(1.06); opacity: 1; }
        100% { transform: scale(1.18); opacity: 0; }
      }

      @keyframes aiwmBottleCelebrateLift {
        0%, 100% { transform: translateY(0); }
        40% { transform: translateY(-4px); }
      }

      .aiwm-celebrating .aiwm-bottle-svg {
        animation: aiwmBottleCelebrateLift 0.7s ease-out;
      }

      .aiwm-Celebration-layer {
        position: absolute;
        inset: -10px;
        pointer-events: none;
        opacity: 0;
      }

      .aiwm-celebrating .aiwm-Celebration-layer {
        animation: aiwmCelebratePop 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @media (prefers-reduced-motion: reduce) {
        .aiwm-water-level-group,
        .aiwm-cooling-level-group {
          transition: none !important;
        }
        .aiwm-wave-front,
        .aiwm-wave-back,
        .aiwm-bubble,
        .aiwm-celebrating .aiwm-bottle-svg,
        .aiwm-celebrating .aiwm-Celebration-layer {
          animation: none !important;
        }
      }
    `;
  }

  function getWaterTranslateY(fillPercent) {
    const clamped = Math.max(0, Math.min(100, Number(fillPercent) || 0));
    const emptyY = 202;
    const fullY = 66;
    const y = emptyY - (clamped / 100) * (emptyY - fullY);
    return Number(y.toFixed(2));
  }

  /**
   * Renders the crafted 1-Liter Baby Blue Bottle SVG.
   * Attractive even when nearly empty (shows a delicate meniscus rest at the base
   * and crisp internal glass shading).
   */
  function createBottleMarkup(options = {}) {
    const {
      idPrefix = 'aiwm-main',
      fillPercent = 0,
      coolingSharePct = 40,
      mood = fillPercent > 1 ? 'happy' : 'sleepy',
      width = 68,
      height = 130,
      ariaLabel = `1-liter baby blue water bottle, ${Math.round(fillPercent)}% full`
    } = options;

    const clampedTotal = Math.max(0, Math.min(100, Number(fillPercent) || 0));
    const clampedCoolingShare = Math.max(0, Math.min(100, Number(coolingSharePct) || 0));
    const coolingFillPercent = (clampedTotal * clampedCoolingShare) / 100;

    const totalTranslateY = getWaterTranslateY(clampedTotal);
    const coolingTranslateY = getWaterTranslateY(coolingFillPercent);

    const bottleBodyPath = `
      M 46,28
      L 74,28
      L 74,34
      C 76,34 77,35.5 77,37.5
      L 75,39.5
      L 75,49
      C 75,56.5 93,64 94,78
      L 94,190
      C 94,197.5 88.5,202 81,202
      L 39,202
      C 31.5,202 26,197.5 26,190
      L 26,78
      C 27,64 45,56.5 45,49
      L 45,39.5
      L 43,37.5
      C 43,35.5 44,34 46,34
      Z
    `;

    return `
      <div class="aiwm-bottle-stage" data-mood="${mood}" tabindex="0" role="img" aria-label="${ariaLabel}">
        <svg class="aiwm-bottle-svg" width="${width}" height="${height}" viewBox="0 0 120 226" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="${idPrefix}-bottle-clip">
              <path d="${bottleBodyPath}" />
            </clipPath>

            <linearGradient id="${idPrefix}-glass-grad" x1="26" y1="28" x2="94" y2="202" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#EEF8FD" stop-opacity="0.82" />
              <stop offset="45%" stop-color="#DDF1FC" stop-opacity="0.58" />
              <stop offset="100%" stop-color="#A7D8F5" stop-opacity="0.68" />
            </linearGradient>

            <!-- Top Layer: Power-Plant Water (Lighter Baby Blue #A7D8F5) -->
            <linearGradient id="${idPrefix}-powerplant-grad" x1="60" y1="0" x2="60" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#BFE3FA" stop-opacity="0.92" />
              <stop offset="100%" stop-color="#8BC8EE" stop-opacity="0.95" />
            </linearGradient>

            <!-- Bottom Layer: Server Cooling Water (Deeper Blue #5DB7E8 -> #236B94) -->
            <linearGradient id="${idPrefix}-cooling-grad" x1="60" y1="0" x2="60" y2="150" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#5DB7E8" stop-opacity="0.95" />
              <stop offset="100%" stop-color="#236B94" stop-opacity="0.98" />
            </linearGradient>

            <linearGradient id="${idPrefix}-cap-grad" x1="43" y1="12" x2="77" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#5DB7E8" />
              <stop offset="100%" stop-color="#236B94" />
            </linearGradient>

            <linearGradient id="${idPrefix}-gloss-streak" x1="33" y1="62" x2="39" y2="192" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.78" />
              <stop offset="60%" stop-color="#FFFFFF" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.06" />
            </linearGradient>
          </defs>

          <!-- Restrained ground shadow -->
          <ellipse cx="60" cy="210" rx="30" ry="5" fill="#236B94" fill-opacity="0.14" />

          <!-- Translucent bottle body -->
          <path d="${bottleBodyPath}" fill="url(#${idPrefix}-glass-grad)" />

          <!-- Clipped Liquid Fill & Internal Shading -->
          <g clip-path="url(#${idPrefix}-bottle-clip)">
            <!-- Delicate base glass refraction so empty bottle still looks rich -->
            <ellipse cx="60" cy="199" rx="31" ry="4" fill="#A7D8F5" fill-opacity="0.45" />

            <!-- Top Layer: Power-plant water -->
            <g class="aiwm-water-level-group" data-role="water-group" style="transform: translateY(${totalTranslateY}px);">
              <path class="aiwm-wave-back"
                d="M -20,0 Q -6,-4.5 8,0 T 36,0 T 64,0 T 92,0 T 120,0 T 148,0 T 176,0 L 176,170 L -20,170 Z"
                fill="#DDF1FC" fill-opacity="0.85" />
              <path class="aiwm-wave-front"
                d="M -20,1.5 Q -6,6 8,1.5 T 36,1.5 T 64,1.5 T 92,1.5 T 120,1.5 T 148,1.5 T 176,1.5 L 176,170 L -20,170 Z"
                fill="url(#${idPrefix}-powerplant-grad)" />
              <path class="aiwm-wave-front"
                d="M -20,1.5 Q -6,6 8,1.5 T 36,1.5 T 64,1.5 T 92,1.5 T 120,1.5 T 148,1.5 T 176,1.5"
                stroke="#FFFFFF" stroke-width="1.3" stroke-opacity="0.85" fill="none" />
            </g>

            <!-- Bottom Layer: Server cooling water -->
            <g class="aiwm-cooling-level-group" data-role="cooling-group" style="transform: translateY(${coolingTranslateY}px);">
              <path class="aiwm-wave-back"
                d="M -20,1.5 Q -6,5 8,1.5 T 36,1.5 T 64,1.5 T 92,1.5 T 120,1.5 T 148,1.5 T 176,1.5 L 176,170 L -20,170 Z"
                fill="url(#${idPrefix}-cooling-grad)" />
              <circle class="aiwm-bubble b1" cx="44" cy="118" r="2.1" fill="#FFFFFF" fill-opacity="0.58" />
              <circle class="aiwm-bubble b2" cx="68" cy="130" r="1.6" fill="#FFFFFF" fill-opacity="0.48" />
              <circle class="aiwm-bubble b3" cx="55" cy="108" r="2.4" fill="#FFFFFF" fill-opacity="0.52" />
            </g>

            <!-- Light internal cylindrical shading -->
            <path d="M 85,58 C 91,68 92,80 92,191 C 92,197 86,201 79,201 L 94,201 L 94,58 Z"
              fill="#236B94" fill-opacity="0.11" />
          </g>

          <!-- Gentle left glossy highlight -->
          <path d="M 34,69 C 35,62 44,56 46,50" stroke="#FFFFFF" stroke-opacity="0.72" stroke-width="2.6" stroke-linecap="round" fill="none" />
          <rect x="31.5" y="75" width="5" height="108" rx="2.5" fill="url(#${idPrefix}-gloss-streak)" />

          <!-- Subtle graduation markings on the right side (250, 500, 750, 1L) -->
          <line x1="83" y1="66" x2="92" y2="66" stroke="#236B94" stroke-opacity="0.55" stroke-width="1.3" stroke-linecap="round" />
          <text x="80" y="68.5" text-anchor="end" fill="#236B94" fill-opacity="0.72" font-family="Nunito, Poppins, system-ui, sans-serif" font-size="6.5" font-weight="700">1L</text>
          <line x1="85" y1="100" x2="92" y2="100" stroke="#236B94" stroke-opacity="0.42" stroke-width="1.1" stroke-linecap="round" />
          <line x1="83" y1="134" x2="92" y2="134" stroke="#236B94" stroke-opacity="0.55" stroke-width="1.3" stroke-linecap="round" />
          <line x1="85" y1="168" x2="92" y2="168" stroke="#236B94" stroke-opacity="0.42" stroke-width="1.1" stroke-linecap="round" />

          <!-- Clean outer silhouette stroke -->
          <path d="${bottleBodyPath}" stroke="#5DB7E8" stroke-width="1.9" stroke-opacity="0.88" fill="none" />

          <!-- Minimalist, restrained bottle expression (two tiny eyes and a small mouth) -->
          <g class="aiwm-mascot-face" transform="translate(0, 6)">
            <!-- Sleepy / Low Usage: relaxed curved eyes & gentle smile -->
            <g class="aiwm-face-mood aiwm-face-sleepy">
              <path d="M 46,115 Q 49,117.8 52,115" stroke="#163A52" stroke-width="2" stroke-linecap="round" fill="none" />
              <path d="M 66,115 Q 69,117.8 72,115" stroke="#163A52" stroke-width="2" stroke-linecap="round" fill="none" />
              <path d="M 55,122 Q 59,124.8 63,122" stroke="#163A52" stroke-width="1.8" stroke-linecap="round" fill="none" />
            </g>

            <!-- Happy / Normal Usage: two tiny dot eyes & small warm smile -->
            <g class="aiwm-face-mood aiwm-face-happy">
              <circle cx="49" cy="114.5" r="2.4" fill="#163A52" />
              <circle cx="69" cy="114.5" r="2.4" fill="#163A52" />
              <path d="M 54,121.5 Q 59,125.5 64,121.5" stroke="#163A52" stroke-width="1.9" stroke-linecap="round" fill="none" />
            </g>

            <!-- Sweating / Long Conversation: tiny eyes, flat working mouth & single small droplet -->
            <g class="aiwm-face-mood aiwm-face-sweating">
              <circle cx="49" cy="115" r="2.3" fill="#163A52" />
              <circle cx="69" cy="115" r="2.3" fill="#163A52" />
              <path d="M 54.5,123 Q 59,121.5 63.5,123" stroke="#163A52" stroke-width="1.8" stroke-linecap="round" fill="none" />
              <path d="M 76,105 C 76,105 73.5,108.5 73.5,110.2 C 73.5,111.6 74.6,112.6 76,112.6 C 77.4,112.6 78.5,111.6 78.5,110.2 C 78.5,108.5 76,105 76,105 Z"
                fill="#5DB7E8" stroke="#236B94" stroke-width="1" />
            </g>

            <!-- Celebrating / Full Bottle: delighted arc eyes & cheerful smile -->
            <g class="aiwm-face-mood aiwm-face-celebrating">
              <path d="M 46,116 Q 49,111.5 52,116" stroke="#163A52" stroke-width="2.1" stroke-linecap="round" fill="none" />
              <path d="M 66,116 Q 69,111.5 72,116" stroke="#163A52" stroke-width="2.1" stroke-linecap="round" fill="none" />
              <path d="M 53,121 Q 59,127 65,121" stroke="#163A52" stroke-width="2" stroke-linecap="round" fill="none" />
            </g>
          </g>

          <!-- Small neck ring & cap -->
          <rect x="42" y="33.5" width="36" height="4" rx="2" fill="#5DB7E8" />
          <rect x="44" y="13" width="32" height="16" rx="4" fill="url(#${idPrefix}-cap-grad)" stroke="#236B94" stroke-width="1.2" />
          <path d="M 47,15.5 L 71,15.5" stroke="#FFFFFF" stroke-opacity="0.65" stroke-width="1.5" stroke-linecap="round" />
        </svg>

        <!-- Tasteful, restrained water splash celebration ring -->
        <svg class="aiwm-Celebration-layer" viewBox="0 0 140 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g stroke="#5DB7E8" stroke-width="2" stroke-linecap="round">
            <path d="M 26,40 L 16,33 M 22,52 L 12,52 M 28,28 L 22,18" />
            <path d="M 114,40 L 124,33 M 118,52 L 128,52 M 112,28 L 118,18" />
          </g>
          <circle cx="70" cy="12" r="3" fill="#5DB7E8" />
          <circle cx="48" cy="18" r="2.2" fill="#A7D8F5" />
          <circle cx="92" cy="18" r="2.2" fill="#A7D8F5" />
        </svg>
      </div>
    `;
  }

  function updateBottleLevel(containerEl, fillPercent, options = {}) {
    if (!containerEl) return;
    const stage = containerEl.classList && containerEl.classList.contains('aiwm-bottle-stage')
      ? containerEl
      : containerEl.querySelector('.aiwm-bottle-stage');
    if (!stage) return;

    const clampedTotal = Math.max(0, Math.min(100, Number(fillPercent) || 0));
    const coolingShare = options.coolingSharePct !== undefined ? Number(options.coolingSharePct) : 40;
    const clampedShare = Math.max(0, Math.min(100, coolingShare));
    const coolingFill = (clampedTotal * clampedShare) / 100;

    const totalY = getWaterTranslateY(clampedTotal);
    const coolingY = getWaterTranslateY(coolingFill);

    const waterGroup = stage.querySelector('[data-role="water-group"]');
    if (waterGroup) waterGroup.style.transform = `translateY(${totalY}px)`;

    const coolingGroup = stage.querySelector('[data-role="cooling-group"]');
    if (coolingGroup) coolingGroup.style.transform = `translateY(${coolingY}px)`;

    const mood = options.celebrate
      ? 'celebrating'
      : (options.mood || (clampedTotal > 1 ? 'happy' : 'sleepy'));
    stage.setAttribute('data-mood', mood);

    const label =
      options.ariaLabel ||
      `1-liter water bottle is ${Math.round(clampedTotal)}% full`;
    stage.setAttribute('aria-label', label);

    if (options.celebrate) {
      stage.classList.remove('aiwm-celebrating');
      void stage.offsetWidth;
      stage.classList.add('aiwm-celebrating');
      setTimeout(() => {
        if (stage) {
          stage.classList.remove('aiwm-celebrating');
          if (options.mood && options.mood !== 'celebrating') {
            stage.setAttribute('data-mood', options.mood);
          }
        }
      }, 1050);
    }
  }

  /**
   * Clean inline SVG icon system with consistent 1.75px stroke weight.
   * Replaces generic emojis across the widget, Why popup, Nerd mode, and toolbar popup.
   */
  function createIconSvg(name, size = 16) {
    const common = `width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="flex-shrink:0;vertical-align:middle;"`;
    switch (name) {
      case 'message':
        return `<svg ${common}><path d="M3.5 5.5C3.5 4.4 4.4 3.5 5.5 3.5H14.5C15.6 3.5 16.5 4.4 16.5 5.5V12C16.5 13.1 15.6 14 14.5 14H8L4.2 16.8C3.8 17.1 3.5 16.8 3.5 16.3V5.5Z" fill="#DDF1FC" stroke="#236B94" stroke-width="1.65" stroke-linejoin="round"/><path d="M6.8 7.5H13.2M6.8 10.3H10.8" stroke="#236B94" stroke-width="1.65" stroke-linecap="round"/></svg>`;
      case 'processor':
        return `<svg ${common}><rect x="5" y="5" width="10" height="10" rx="2" fill="#DDF1FC" stroke="#236B94" stroke-width="1.65"/><rect x="7.8" y="7.8" width="4.4" height="4.4" rx="0.8" fill="#5DB7E8"/><path d="M8 2.5V5M12 2.5V5M8 15V17.5M12 15V17.5M2.5 8H5M2.5 12H5M15 8H17.5M15 12H17.5" stroke="#236B94" stroke-width="1.5" stroke-linecap="round"/></svg>`;
      case 'cooling':
      case 'drop':
        return `<svg ${common}><path d="M10 2.4C10 2.4 4.2 8.9 4.2 13C4.2 16.2 6.8 18.2 10 18.2C13.2 18.2 15.8 16.2 15.8 13C15.8 8.9 10 2.4 10 2.4Z" fill="#A7D8F5" stroke="#236B94" stroke-width="1.65" stroke-linejoin="round"/><path d="M4.6 13C6.3 12.3 8.3 13.5 10 13C11.7 12.5 13.7 13.3 15.4 13C15.5 16 13.1 17.8 10 17.8C6.9 17.8 4.5 16 4.6 13Z" fill="#5DB7E8"/><path d="M7.2 11.4C6.9 12.8 7.4 14.3 8.6 15" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round"/></svg>`;
      case 'sliders':
      case 'settings':
        return `<svg ${common}><path d="M3.5 6H16.5M3.5 14H16.5" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/><circle cx="7.5" cy="6" r="2.2" fill="#A7D8F5" stroke="currentColor" stroke-width="1.5"/><circle cx="12.5" cy="14" r="2.2" fill="#A7D8F5" stroke="currentColor" stroke-width="1.5"/></svg>`;
      case 'share':
        return `<svg ${common}><path d="M10 12.5V3.5M10 3.5L6.5 7M10 3.5L13.5 7" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 11.5V15C4 15.8 4.7 16.5 5.5 16.5H14.5C15.3 16.5 16 15.8 16 15V11.5" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/></svg>`;
      case 'award':
        return `<svg ${common}><circle cx="10" cy="8" r="4.5" fill="#DDF1FC" stroke="#236B94" stroke-width="1.6"/><path d="M7.5 12L6.2 17.2L10 15.3L13.8 17.2L12.5 12" stroke="#236B94" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
      case 'sparkle':
        return `<svg ${common}><path d="M10 2.5L11.8 7.6L17 9.4L11.8 11.2L10 16.3L8.2 11.2L3 9.4L8.2 7.6L10 2.5Z" fill="#A7D8F5" stroke="#236B94" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
      default:
        return createCoolingDropIcon(size);
    }
  }

  function createMiniBottleIcon(size = 16) {
    const height = Math.round(size * 1.45);
    return `<svg class="aiwm-mini-bottle-icon" width="${size}" height="${height}" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="flex-shrink:0;vertical-align:middle;">
      <rect x="8.5" y="1.5" width="7" height="3.5" rx="1.2" fill="#5DB7E8" stroke="#236B94" stroke-width="1.1"/>
      <path d="M8.5 5H15.5V7.5C15.5 9.2 19.5 10.6 19.5 13.5V29C19.5 31 17.8 32.5 15.8 32.5H8.2C6.2 32.5 4.5 31 4.5 29V13.5C4.5 10.6 8.5 9.2 8.5 7.5V5Z" fill="#EEF8FD" stroke="#5DB7E8" stroke-width="1.5"/>
      <path d="M5.2 17.5Q8.5 16.5 12 17.5T18.8 17.5V24.5H5.2V17.5Z" fill="#A7D8F5"/>
      <path d="M5.2 23.5H18.8V28.8C18.8 30.4 17.5 31.7 15.8 31.7H8.2C6.5 31.7 5.2 30.4 5.2 28.8V23.5Z" fill="#236B94"/>
      <line x1="7.2" y1="14" x2="7.2" y2="28" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.85"/>
    </svg>`;
  }

  function createCoolingDropIcon(size = 14) {
    return createIconSvg('drop', size);
  }

  function createHeatThermometerIcon(size = 15) {
    return createIconSvg('processor', size);
  }

  function playSoftSplashSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.11);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      setTimeout(() => {
        try { ctx.close(); } catch (_) {}
      }, 250);
    } catch (_) {}
  }

  /**
   * Generates a clean, product-quality PNG Share Card using HTML5 Canvas.
   * Includes:
   * - The baby-blue bottle with its subtle friendly expression
   * - The human-readable number
   * - The precise estimated amount
   * - One short funny comparison
   * - "Rough estimate for fun and awareness."
   * - Discreet AI Water Meter identity
   */
  function generateShareCardCanvas(data = {}) {
    const {
      friendlyHeadline = 'About 3 sips',
      exactSubtext = '27 ml · rough estimate',
      funnyLine = 'Keeping these servers cool took about 3 sips of water.',
      fillPercent = 35,
      coolingSharePct = 35,
      mood = 'happy'
    } = data;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 560;
    const ctx = canvas.getContext('2d');

    // Clean, calm surface background (#F7FAFC)
    ctx.fillStyle = '#F7FAFC';
    ctx.fillRect(0, 0, 1080, 560);

    // Card surface (#FFFFFF) with crisp 1.5px border (#DDF1FC / #A7D8F5)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#A7D8F5';
    ctx.lineWidth = 2;
    roundRect(ctx, 44, 36, 992, 488, 20);
    ctx.fill();
    ctx.stroke();

    // Left Bottle Well (#F7FAFC)
    ctx.fillStyle = '#F7FAFC';
    ctx.strokeStyle = '#DDF1FC';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 76, 68, 236, 424, 16);
    ctx.fill();
    ctx.stroke();

    // Draw the signature 1L bottle with subtle expression
    drawCanvasBottle(ctx, 118, 96, 152, 316, fillPercent, coolingSharePct, mood);

    ctx.fillStyle = '#236B94';
    ctx.font = '700 13px "Nunito", "Poppins", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1-Liter Bottle', 194, 456);

    // Right side typography
    ctx.textAlign = 'left';

    // Discreet AI Water Meter identity
    ctx.fillStyle = '#236B94';
    ctx.font = '800 14px "Nunito", "Poppins", system-ui, sans-serif';
    ctx.fillText('AI WATER METER', 352, 104);

    // Human-readable number
    ctx.fillStyle = '#151C22';
    ctx.font = '800 56px "Nunito", "Poppins", system-ui, sans-serif';
    ctx.fillText(friendlyHeadline, 352, 184);

    // Precise estimated amount
    ctx.fillStyle = '#5A6B7C';
    ctx.font = '600 22px "Nunito", "Poppins", system-ui, sans-serif';
    ctx.fillText(exactSubtext.replace(/[()]/g, ''), 352, 224);

    // Short funny comparison box
    ctx.fillStyle = '#F7FAFC';
    ctx.strokeStyle = '#DDF1FC';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 352, 262, 636, 132, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.font = '600 22px "Nunito", "Poppins", system-ui, sans-serif';
    wrapCanvasText(ctx, funnyLine, 378, 310, 584, 32);

    // Honesty note
    ctx.fillStyle = '#64748B';
    ctx.font = '500 15px "Nunito", "Poppins", system-ui, sans-serif';
    ctx.fillText('Rough estimate for fun and awareness.', 352, 468);

    return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCanvasBottle(ctx, x, y, w, h, fillPercent, coolingSharePct, mood) {
    ctx.save();
    ctx.translate(x, y);

    // Cap
    ctx.fillStyle = '#5DB7E8';
    ctx.strokeStyle = '#236B94';
    ctx.lineWidth = 2;
    roundRect(ctx, w * 0.35, 8, w * 0.30, 24, 5);
    ctx.fill();
    ctx.stroke();

    const defineBody = () => {
      ctx.beginPath();
      ctx.moveTo(w * 0.36, 42);
      ctx.lineTo(w * 0.64, 42);
      ctx.bezierCurveTo(w * 0.64, 62, w * 0.88, 72, w * 0.88, 100);
      ctx.lineTo(w * 0.88, h - 20);
      ctx.quadraticCurveTo(w * 0.88, h, w * 0.74, h);
      ctx.lineTo(w * 0.26, h);
      ctx.quadraticCurveTo(w * 0.12, h, w * 0.12, h - 20);
      ctx.lineTo(w * 0.12, 100);
      ctx.bezierCurveTo(w * 0.12, 72, w * 0.36, 62, w * 0.36, 42);
      ctx.closePath();
    };

    defineBody();
    ctx.fillStyle = '#EEF8FD';
    ctx.fill();

    ctx.save();
    defineBody();
    ctx.clip();

    const clamped = Math.max(0, Math.min(100, Number(fillPercent) || 0));
    const coolPct = (clamped * Math.max(0, Math.min(100, Number(coolingSharePct) || 40))) / 100;
    const fullTopY = 88;
    const emptyBottomY = h;
    const totalTopY = emptyBottomY - (clamped / 100) * (emptyBottomY - fullTopY);
    const coolTopY = emptyBottomY - (coolPct / 100) * (emptyBottomY - fullTopY);

    if (clamped > 0) {
      ctx.fillStyle = '#A7D8F5';
      ctx.fillRect(0, totalTopY, w, h - totalTopY + 10);
      ctx.fillStyle = '#5DB7E8';
      ctx.fillRect(0, coolTopY, w, h - coolTopY + 10);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    roundRect(ctx, w * 0.19, 98, 8, h - 124, 4);
    ctx.fill();
    ctx.restore();

    defineBody();
    ctx.strokeStyle = '#5DB7E8';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Subtle two-eye + small mouth expression
    const cx = w * 0.5;
    const cy = h * 0.56;
    ctx.fillStyle = '#163A52';
    ctx.strokeStyle = '#163A52';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx - 12, cy - 3, 3.2, 0, Math.PI * 2);
    ctx.arc(cx + 12, cy - 3, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    if (mood === 'sweating') {
      ctx.moveTo(cx - 6, cy + 7);
      ctx.lineTo(cx + 6, cy + 7);
    } else {
      ctx.arc(cx, cy + 2, 7.5, 0.18 * Math.PI, 0.82 * Math.PI);
    }
    ctx.stroke();

    ctx.restore();
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(' ');
    let line = '';
    let currY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currY);
        line = words[n] + ' ';
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currY);
  }

  const BottleModule = {
    getBottleStyles,
    getWaterTranslateY,
    createBottleMarkup,
    updateBottleLevel,
    createIconSvg,
    createMiniBottleIcon,
    createCoolingDropIcon,
    createHeatThermometerIcon,
    playSoftSplashSound,
    generateShareCardCanvas
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BottleModule;
  }
  root.AIWaterMeterBottle = BottleModule;
})(typeof globalThis !== 'undefined' ? globalThis : window);
