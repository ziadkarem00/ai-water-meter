/**
 * ============================================================================
 * AI WATER METER — CONTENT SCRIPT (PRODUCT-QUALITY REDESIGN)
 * ============================================================================
 * Preserves 100% of the estimation engine, scientific constants, DOM selectors,
 * streaming stabilization, deduplication, Shadow DOM isolation, and privacy
 * guarantees while delivering a calm, crafted indie-utility user experience.
 * ============================================================================
 */

(function () {
  'use strict';

  if (window.__AI_WATER_METER_LOADED__) return;
  window.__AI_WATER_METER_LOADED__ = true;

  const Config = window.AIWaterMeterConfig;
  const Selectors = window.AIWaterMeterSelectors;
  const Estimator = window.AIWaterMeterEstimator;
  const Comparisons = window.AIWaterMeterComparisons;
  const Bottle = window.AIWaterMeterBottle;

  if (!Config || !Selectors || !Estimator || !Comparisons || !Bottle) {
    return;
  }

  const platform = Selectors.detectPlatform(location.hostname);
  if (!platform) return;

  const StorageAPI = (function () {
    const ext = typeof chrome !== 'undefined' && chrome.storage ? chrome : (typeof browser !== 'undefined' ? browser : null);
    const memFallback = {};
    return {
      get(keys) {
        return new Promise((resolve) => {
          try {
            if (ext && ext.storage && ext.storage.local) {
              ext.storage.local.get(keys, (res) => resolve(res || {}));
            } else {
              resolve({ ...memFallback });
            }
          } catch (_) {
            resolve({ ...memFallback });
          }
        });
      },
      set(obj) {
        return new Promise((resolve) => {
          try {
            Object.assign(memFallback, obj);
            if (ext && ext.storage && ext.storage.local) {
              ext.storage.local.set(obj, () => resolve());
            } else {
              resolve();
            }
          } catch (_) {
            resolve();
          }
        });
      }
    };
  })();

  let settings = { ...Config.DEFAULT_SETTINGS };
  let currentChatId = Selectors.getChatIdFromUrl(location.href);
  let lastUrl = location.href;

  const messageMap = new Map();

  let storageTotals = {
    todayDate: getTodayKey(),
    todayMlTypical: 0,
    todayMessages: 0,
    allTimeMlTypical: 0,
    allTimeMessages: 0,
    chatsById: {}
  };

  let unlockedAchievements = {};
  const shownChatMilestones = new Set();

  let previousCompletedBottles = 0;
  let observerDebounceTimer = null;
  let funLineRotationIndex = 0;

  let widgetHost = null;
  let widgetShadow = null;
  let activeWhyMessageId = null;
  let activeNerdTab = 'water';
  let welcomeStep = 0;

  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function loadStateFromStorage() {
    const data = await StorageAPI.get(['aiwm_settings', 'aiwm_totals', 'aiwm_achievements']);
    if (data && data.aiwm_settings) {
      settings = { ...Config.DEFAULT_SETTINGS, ...data.aiwm_settings };
      settings.scenario = Estimator.normalizeScenarioId(settings.scenario);
    }
    if (data && data.aiwm_achievements) {
      unlockedAchievements = { ...data.aiwm_achievements };
    }
    if (data && data.aiwm_totals) {
      storageTotals = {
        todayDate: getTodayKey(),
        todayMlTypical: 0,
        todayMessages: 0,
        allTimeMlTypical: 0,
        allTimeMessages: 0,
        chatsById: {},
        ...data.aiwm_totals
      };
      const today = getTodayKey();
      if (storageTotals.todayDate !== today) {
        storageTotals.todayDate = today;
        storageTotals.todayMlTypical = 0;
        storageTotals.todayMessages = 0;
        await saveTotalsToStorage();
      }
    }
  }

  async function saveSettingsToStorage() {
    await StorageAPI.set({ aiwm_settings: settings });
  }

  async function unlockAchievement(achievementId) {
    if (!achievementId || unlockedAchievements[achievementId]) return;
    unlockedAchievements[achievementId] = true;
    await StorageAPI.set({ aiwm_achievements: unlockedAchievements });
  }

  async function saveTotalsToStorage() {
    const chatIds = Object.keys(storageTotals.chatsById || {});
    if (chatIds.length > 40) {
      chatIds
        .sort((a, b) => (storageTotals.chatsById[a].updatedAt || 0) - (storageTotals.chatsById[b].updatedAt || 0))
        .slice(0, chatIds.length - 40)
        .forEach((oldId) => delete storageTotals.chatsById[oldId]);
    }
    const agg = getChatAggregates(settings.scenario, settings.coolingType);
    await StorageAPI.set({
      aiwm_totals: storageTotals,
      aiwm_achievements: unlockedAchievements,
      aiwm_active_chat: {
        chatId: currentChatId,
        platform,
        chatMlTypical: getChatAggregates('realistic_full', 'evaporative').totalWaterMl,
        chatCoolingMl: agg.coolingWaterMl,
        chatPowerplantMl: agg.powerplantWaterMl,
        chatTotalMl: agg.totalWaterMl,
        chatEnergyWh: agg.energyWh,
        chatGpuSeconds: agg.gpuSeconds,
        chatKvCacheMb: agg.peakKvCacheMb,
        chatContextTokens: agg.peakContextTokens,
        chatMessages: messageMap.size,
        updatedAt: Date.now()
      }
    });
  }

  function getScenarioScaleRatio(scenarioId, coolingType) {
    const target = Estimator.calculateForScenario({
      replyChars: 1200,
      promptChars: 160,
      priorContextChars: 0,
      scenario: scenarioId,
      coolingType: coolingType || settings.coolingType
    });
    const base = Estimator.calculateForScenario({
      replyChars: 1200,
      promptChars: 160,
      priorContextChars: 0,
      scenario: 'realistic_full',
      coolingType: 'evaporative'
    });
    return base.totalWaterMl > 0 ? target.totalWaterMl / base.totalWaterMl : 1;
  }

  function getChatAggregates(scenarioOverride, coolingOverride) {
    const scen = Estimator.normalizeScenarioId(scenarioOverride || settings.scenario);
    const coolType = coolingOverride || settings.coolingType || 'evaporative';

    let coolingWaterMl = 0;
    let powerplantWaterMl = 0;
    let totalWaterMl = 0;
    let energyWh = 0;
    let gpuSeconds = 0;
    let peakKvCacheMb = 0;
    let peakTotalHbmGb = Config.HARDWARE_ASSUMPTIONS.baseActiveHbmGbPerUserSlice;
    let peakHostRamMb = Config.HARDWARE_ASSUMPTIONS.baseHostRamMbPerSlice;
    let peakContextTokens = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let hasLongChatTurn = false;
    let latestTurnCalc = null;

    messageMap.forEach((entry) => {
      const calc = Estimator.calculateForScenario({
        replyChars: entry.replyChars,
        promptChars: entry.promptChars,
        priorContextChars: entry.priorContextChars || 0,
        isReasoning: entry.isReasoning,
        scenario: scen,
        coolingType: coolType,
        platform
      });
      coolingWaterMl += calc.coolingWaterMl;
      powerplantWaterMl += calc.powerplantWaterMl;
      totalWaterMl += calc.totalWaterMl;
      energyWh += calc.energyWh;
      gpuSeconds += calc.hardware.gpuSeconds;
      totalInputTokens += calc.cumulativeInputTokens;
      totalOutputTokens += calc.replyTokens;
      if (calc.hardware.kvCacheMb > peakKvCacheMb) {
        peakKvCacheMb = calc.hardware.kvCacheMb;
        peakTotalHbmGb = calc.hardware.totalHbmGb;
        peakHostRamMb = calc.hardware.hostRamMb;
      }
      if (calc.totalContextTokens > peakContextTokens) {
        peakContextTokens = calc.totalContextTokens;
      }
      if (calc.isLongChat) {
        hasLongChatTurn = true;
      }
      latestTurnCalc = calc;
    });

    const coolingSharePct = totalWaterMl > 0
      ? Number(((coolingWaterMl / totalWaterMl) * 100).toFixed(1))
      : (scen === 'official_2025' ? 100 : 27);
    const powerplantSharePct = Number((100 - coolingSharePct).toFixed(1));

    const heatSummary = Estimator.estimateHardwareAndHeat(energyWh, peakContextTokens);
    const presetObj = Config.SCENARIOS[scen] || Config.SCENARIOS.realistic_full;
    const coolObj = Config.COOLING_TYPES[coolType] || Config.COOLING_TYPES.evaporative;

    return {
      scenario: scen,
      scenarioLabel: presetObj.label,
      coolingType: coolType,
      coolingTypeLabel: coolObj.label,
      effectiveWUE: Number((presetObj.onsiteWUE * coolObj.wueMultiplier).toFixed(3)),
      effectivePUE: Number((presetObj.PUE * coolObj.pueMultiplier).toFixed(2)),
      offsiteWaterIntensity: presetObj.offsiteWaterIntensity,
      coolingWaterMl: Number(coolingWaterMl.toFixed(4)),
      powerplantWaterMl: Number(powerplantWaterMl.toFixed(4)),
      totalWaterMl: Number(totalWaterMl.toFixed(4)),
      coolingSharePct,
      powerplantSharePct,
      energyWh: Number(energyWh.toFixed(4)),
      energyKwh: Number((energyWh / 1000).toFixed(7)),
      gpuSeconds: Number(gpuSeconds.toFixed(2)),
      peakKvCacheMb: Number(peakKvCacheMb.toFixed(2)),
      peakTotalHbmGb: Number(peakTotalHbmGb.toFixed(2)),
      peakHostRamMb: Number(peakHostRamMb.toFixed(0)),
      peakContextTokens,
      totalInputTokens,
      totalOutputTokens,
      hasLongChatTurn,
      latestTurnCalc,
      heatJoules: heatSummary.heatJoules,
      heatComparisonText: heatSummary.heatComparisonText,
      phoneChargerMinutes: heatSummary.phoneChargerMinutes
    };
  }

  function resolveTheme() {
    if (settings.theme === 'light' || settings.theme === 'dark') return settings.theme;
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    if (
      (htmlEl && (htmlEl.classList.contains('dark') || htmlEl.getAttribute('data-theme') === 'dark')) ||
      (bodyEl && (bodyEl.classList.contains('dark') || bodyEl.classList.contains('dark-theme')))
    ) {
      return 'dark';
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Computes safe bottom/right coordinates for the floating widget so it stays
   * on screen across viewport sizes (1920x1080, 1366x768, 1280x720) and avoids
   * overlapping the ChatGPT or Gemini message composer.
   */
  function getSafeWidgetPosition(desiredRight, desiredBottom) {
    const vw = Math.max(320, window.innerWidth || 1280);
    const vh = Math.max(400, window.innerHeight || 720);
    const widgetWidth = 220;
    const maxWidgetHeight = Math.min(300, Math.floor(vh * 0.38));

    let minBottom = 20;
    // Detect ChatGPT or Gemini composer height if near the bottom-right
    try {
      const composerSelectors = [
        '#prompt-textarea',
        'rich-textarea',
        'form textarea',
        '[contenteditable="true"][role="textbox"]'
      ];
      for (let i = 0; i < composerSelectors.length; i++) {
        const el = document.querySelector(composerSelectors[i]);
        if (el) {
          const box = (el.closest('form') || el).getBoundingClientRect();
          if (box && box.height > 0 && box.bottom > vh - 220) {
            const widgetLeft = vw - (desiredRight + widgetWidth);
            // If widget horizontally overlaps the composer's right edge, lift above it
            if (widgetLeft < box.right + 16) {
              minBottom = Math.min(140, Math.max(24, Math.round(vh - box.top + 14)));
            }
          }
          break;
        }
      }
    } catch (_) {}

    const right = Math.max(14, Math.min(vw - widgetWidth - 14, Number(desiredRight) || 20));
    const bottom = Math.max(minBottom, Math.min(vh - maxWidgetHeight - 16, Number(desiredBottom) || 88));
    return { right: Math.round(right), bottom: Math.round(bottom) };
  }

  function applySafeWidgetPosition() {
    if (!widgetHost) return;
    const desiredRight = settings.widgetPosition && typeof settings.widgetPosition.right === 'number'
      ? settings.widgetPosition.right
      : 20;
    const desiredBottom = settings.widgetPosition && typeof settings.widgetPosition.bottom === 'number'
      ? settings.widgetPosition.bottom
      : 88;
    const safe = getSafeWidgetPosition(desiredRight, desiredBottom);
    widgetHost.style.right = `${safe.right}px`;
    widgetHost.style.bottom = `${safe.bottom}px`;
  }

  /**
   * Builds the Shadow DOM floating widget, friendly Why popup, 4-tab Nerd mode
   * modal, and 3-card First-run welcome modal.
   */
  function createFloatingWidget() {
    if (document.getElementById('ai-water-meter-host')) return;

    widgetHost = document.createElement('div');
    widgetHost.id = 'ai-water-meter-host';
    widgetHost.setAttribute('data-ai-water-meter', 'widget');
    widgetHost.style.cssText = 'all: initial; position: fixed; z-index: 2147483640; bottom: 88px; right: 20px; pointer-events: none;';

    widgetShadow = widgetHost.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = getWidgetStyles() + Bottle.getBottleStyles();
    widgetShadow.appendChild(styleEl);

    const wrapper = document.createElement('div');
    wrapper.className = `aiwm-root theme-${resolveTheme()} ${settings.widgetCollapsed ? 'is-collapsed' : ''}`;
    wrapper.innerHTML = `
      <!-- Milestone Toast -->
      <div class="aiwm-milestone-toast" id="aiwm-milestone-toast" hidden role="status" aria-live="polite">
        <span class="toast-svg-slot" id="aiwm-toast-icon">${Bottle.createIconSvg('sparkle', 18)}</span>
        <div class="toast-copy">
          <strong id="aiwm-toast-title">First Sip</strong>
          <span id="aiwm-toast-msg">Servers used about 1 sip of water.</span>
        </div>
      </div>

      <!-- Minimized Floating Bubble -->
      <button class="aiwm-collapsed-pill" id="aiwm-expand-btn" type="button" aria-label="Expand AI Water Meter" title="Expand AI Water Meter">
        <span class="aiwm-pill-icon">${Bottle.createCoolingDropIcon(15)}</span>
        <span class="aiwm-pill-vol" id="aiwm-pill-vol">0 drops</span>
      </button>

      <!-- =====================================================================
           DEFAULT FLOATING WIDGET (220px wide, max-height <= 38vh, <= 25 words)
           Headline refers specifically to estimated SERVER COOLING WATER.
           ===================================================================== -->
      <section class="aiwm-card" role="region" aria-label="AI Water Meter companion widget">
        <div class="aiwm-top-bar" id="aiwm-drag-handle" title="Drag to reposition">
          <button class="aiwm-mini-ctrl" id="aiwm-info-btn" type="button" aria-label="About rough estimates" title="Rough estimate info">i</button>
          <span class="aiwm-grip-bar" aria-hidden="true"></span>
          <button class="aiwm-mini-ctrl" id="aiwm-collapse-btn" type="button" aria-label="Minimize widget" title="Minimize">–</button>
        </div>

        <div class="aiwm-honesty-popover" id="aiwm-info-drawer" hidden>
          Approximate estimate for fun and awareness, not a direct measurement.
        </div>

        <!-- 1. The Bottle -->
        <div class="aiwm-bottle-wrap" id="aiwm-bottle-mount" title="Click to cycle comparison">
          ${Bottle.createBottleMarkup({ idPrefix: 'aiwm-widget-bottle', fillPercent: 0, coolingSharePct: 35, mood: 'sleepy', width: 64, height: 120 })}
        </div>

        <!-- 2. The Human-Readable Cooling Water Number + Muted Precise Figure -->
        <div class="aiwm-friendly-number-block">
          <div class="aiwm-big-friendly" id="aiwm-big-friendly">0 drops</div>
          <div class="aiwm-exact-sub" id="aiwm-exact-sub">0 ml · rough estimate</div>
        </div>

        <!-- 3. One Short Sentence -->
        <p class="aiwm-fun-line" id="aiwm-fun-line">
          Keeping these servers cool took about 0 drops.
        </p>

        <!-- 4. Two Actions: Why? and Nerd mode -->
        <div class="aiwm-btn-row">
          <button class="aiwm-action-btn primary" id="aiwm-open-why-btn" type="button">Why?</button>
          <button class="aiwm-action-btn secondary" id="aiwm-open-nerd-btn" type="button">Nerd mode</button>
        </div>
      </section>

      <!-- =====================================================================
           FRIENDLY WHY POPUP (3 SVG Steps + 3-Value Water Breakdown + Reply Line)
           ===================================================================== -->
      <div class="aiwm-modal-backdrop" id="aiwm-why-modal" hidden role="dialog" aria-modal="true" aria-labelledby="aiwm-why-title">
        <div class="aiwm-why-card">
          <header class="aiwm-modal-top">
            <strong id="aiwm-why-title">Why AI chats use water</strong>
            <button class="aiwm-mini-ctrl" id="aiwm-why-close" type="button" aria-label="Close Why popup">✕</button>
          </header>

          <div class="aiwm-three-steps">
            <div class="aiwm-simple-step">
              <span class="step-svg-icon">${Bottle.createIconSvg('message', 20)}</span>
              <span>You send a message.</span>
            </div>
            <div class="aiwm-simple-step">
              <span class="step-svg-icon">${Bottle.createIconSvg('processor', 20)}</span>
              <span>The AI's powerful computers work hard and get HOT.</span>
            </div>
            <div class="aiwm-simple-step">
              <span class="step-svg-icon">${Bottle.createIconSvg('cooling', 20)}</span>
              <span>Cooling systems remove the heat. Water can evaporate, and power stations may use water to make the electricity.</span>
            </div>
          </div>

          <!-- 3-Value Water Breakdown + Two-Shade Blue Stacked Bar -->
          <div class="aiwm-why-breakdown">
            <div class="why-bd-grid">
              <div class="why-bd-cell">
                <span class="bd-label"><i class="bd-swatch cool"></i>Cooling water</span>
                <strong id="why-cool-val">0.3 ml</strong>
              </div>
              <div class="why-bd-cell">
                <span class="bd-label"><i class="bd-swatch pwr"></i>Power-plant water</span>
                <strong id="why-pwr-val">0.7 ml</strong>
              </div>
              <div class="why-bd-cell total">
                <span class="bd-label">Total water</span>
                <strong id="why-tot-val">1.0 ml</strong>
              </div>
            </div>
            <div class="aiwm-stacked-bar">
              <div class="bar-cool" id="why-bar-cool" style="width: 30%;"></div>
              <div class="bar-pwr" id="why-bar-pwr" style="width: 70%;"></div>
            </div>
          </div>

          <div class="aiwm-why-reply-line" id="aiwm-why-reply-line">
            This reply: about 1 ml · About 20 drops
          </div>

          <div class="aiwm-why-long-line" id="aiwm-why-long-line" hidden>
            Long chats cost a bit more because the AI re-reads the conversation.
          </div>

          <button class="aiwm-nerd-link" id="aiwm-why-to-nerd" type="button">
            See the nerdy details →
          </button>
        </div>
      </div>

      <!-- =====================================================================
           NERD MODE (Separate Centered Modal with 4 Tabs: Water, Servers,
           Why numbers differ, Settings)
           ===================================================================== -->
      <div class="aiwm-modal-backdrop" id="aiwm-nerd-modal" hidden role="dialog" aria-modal="true" aria-labelledby="aiwm-nerd-title">
        <div class="aiwm-nerd-card">
          <header class="aiwm-nerd-header">
            <div class="nerd-title-wrap">
              ${Bottle.createIconSvg('sliders', 18)}
              <h3 id="aiwm-nerd-title">Nerd Mode</h3>
              <span class="nerd-sub-pill">Approximate Model</span>
            </div>
            <button class="aiwm-mini-ctrl" id="aiwm-nerd-close" type="button" aria-label="Close Nerd Mode">✕</button>
          </header>

          <nav class="aiwm-nerd-tabs" role="tablist" aria-label="Nerd mode sections">
            <button class="nerd-tab active" data-tab="water" role="tab" aria-selected="true" type="button">Water</button>
            <button class="nerd-tab" data-tab="servers" role="tab" aria-selected="false" type="button">Servers</button>
            <button class="nerd-tab" data-tab="differ" role="tab" aria-selected="false" type="button">Why numbers differ</button>
            <button class="nerd-tab" data-tab="settings" role="tab" aria-selected="false" type="button">Settings</button>
          </nav>

          <div class="aiwm-nerd-body">
            <!-- TAB A — WATER -->
            <div class="nerd-pane active" data-pane="water" role="tabpanel">
              <div class="nerd-box">
                <div class="nerd-box-title">Water Footprint Breakdown (This Conversation)</div>
                <div class="nerd-three-cols">
                  <div class="num-card">
                    <span class="bd-label"><i class="bd-swatch cool"></i>Cooling water</span>
                    <div class="num-big" id="nerd-cool-val">0 ml</div>
                    <small>Data-center heat rejection</small>
                  </div>
                  <div class="num-card">
                    <span class="bd-label"><i class="bd-swatch pwr"></i>Power-plant water</span>
                    <div class="num-big" id="nerd-pwr-val">0 ml</div>
                    <small>Electricity generation</small>
                  </div>
                  <div class="num-card total">
                    <span class="bd-label">Total water</span>
                    <div class="num-big" id="nerd-tot-val">0 ml</div>
                    <small id="nerd-btl-equiv">0 bottles (1 L)</small>
                  </div>
                </div>

                <div class="aiwm-stacked-bar" style="margin-top:10px;">
                  <div class="bar-cool" id="nerd-bar-cool" style="width: 30%;"></div>
                  <div class="bar-pwr" id="nerd-bar-pwr" style="width: 70%;"></div>
                </div>
              </div>

              <div class="nerd-box">
                <div class="nerd-box-title">Energy &amp; Cooling Assumptions</div>
                <div class="nerd-kv-rows">
                  <div class="kv-row"><span>Energy estimate (this chat):</span><strong id="nerd-energy-wh">0 Wh (0 kWh)</strong></div>
                  <div class="kv-row"><span>Selected scenario:</span><strong id="nerd-scen-name">Realistic</strong></div>
                  <div class="kv-row"><span>Cooling assumptions:</span><strong id="nerd-cool-assump">Evaporative · WUE 0.92 L/kWh</strong></div>
                  <div class="kv-row"><span>Session totals (1 L bottles):</span><strong id="nerd-session-btls">Chat 0 · Today 0 · All-time 0</strong></div>
                </div>
              </div>

              <details class="nerd-details">
                <summary>View estimation formula</summary>
                <div class="formula-block">
                  <code>energy_Wh = base_Wh × token_scale(input_tokens, output_tokens) × model_multiplier</code>
                  <code>cooling_water_ml = (energy_Wh / 1000) × onsite_WUE × 1000</code>
                  <code>powerplant_water_ml = (energy_Wh / 1000) × PUE × offsite_intensity × 1000</code>
                  <code>total_water_ml = cooling_water_ml + powerplant_water_ml</code>
                </div>
              </details>

              <div class="nerd-footer-row">
                <span id="nerd-pace-text" style="font-size:13px;color:var(--text-muted);">1 bottle ≈ 1,000 messages</span>
                <button class="aiwm-share-btn" id="aiwm-share-btn" type="button">
                  ${Bottle.createIconSvg('share', 14)} <span>Share Card (PNG)</span>
                </button>
              </div>
            </div>

            <!-- TAB B — SERVERS -->
            <div class="nerd-pane" data-pane="servers" role="tabpanel" hidden>
              <div class="nerd-assumption-banner">
                AI companies do not publish exact hardware usage for each individual prompt. These hardware figures are educated assumptions.
              </div>

              <div class="nerd-server-grid">
                <div class="nerd-stat-card">
                  <div class="stat-head">
                    <span>Estimated GPU-seconds</span>
                    <button class="q-tip" type="button" aria-label="Explain GPU-seconds" data-tip="An estimate of how long your share of the graphics processors worked.">?</button>
                  </div>
                  <div class="stat-big" id="nerd-gpu-secs">0 GPU-s</div>
                  <div class="stat-sub">Your batched slice of compute</div>
                </div>

                <div class="nerd-stat-card">
                  <div class="stat-head">
                    <span>Assumed GPU type</span>
                    <button class="q-tip" type="button" aria-label="Explain HBM and GPU type" data-tip="Very fast HBM memory built into industrial NVIDIA H100 AI graphics processors.">?</button>
                  </div>
                  <div class="stat-big">NVIDIA H100</div>
                  <div class="stat-sub">80 GB HBM3 · 8 GPUs / node</div>
                </div>

                <div class="nerd-stat-card">
                  <div class="stat-head">
                    <span>GPU power assumption</span>
                    <button class="q-tip" type="button" aria-label="Explain PUE and GPU power" data-tip="PUE is an estimate of how much extra facility electricity is needed beyond the computers themselves (~700 W per GPU).">?</button>
                  </div>
                  <div class="stat-big" id="nerd-gpu-power">700 W TDP</div>
                  <div class="stat-sub" id="nerd-pue-sub">Facility PUE 1.16</div>
                </div>

                <div class="nerd-stat-card">
                  <div class="stat-head">
                    <span>Estimated GPU memory</span>
                    <button class="q-tip" type="button" aria-label="Explain KV cache" data-tip="KV cache is a temporary memory space used to remember the conversation while generating an answer.">?</button>
                  </div>
                  <div class="stat-big" id="nerd-kv-mb">0 MB KV</div>
                  <div class="stat-sub" id="nerd-hbm-sub">+ 1.85 GB model weight slice</div>
                </div>

                <div class="nerd-stat-card">
                  <div class="stat-head">
                    <span>Estimated server RAM</span>
                    <button class="q-tip" type="button" aria-label="Explain server RAM" data-tip="Host computer system memory used to manage sessions and cache conversation prefixes.">?</button>
                  </div>
                  <div class="stat-big" id="nerd-ram-mb">420 MB</div>
                  <div class="stat-sub">Host DDR5 session state</div>
                </div>

                <div class="nerd-stat-card">
                  <div class="stat-head">
                    <span>Estimated heat</span>
                    <button class="q-tip" type="button" aria-label="Explain server heat" data-tip="Nearly all electrical energy used by processors turns directly into heat.">?</button>
                  </div>
                  <div class="stat-big" id="nerd-heat-wh">0 Wh</div>
                  <div class="stat-sub" id="nerd-heat-joke">0 Joules thermal output</div>
                </div>
              </div>

              <div class="nerd-box">
                <div class="nerd-box-title">Conversation Token &amp; Multiplier Estimate</div>
                <div class="nerd-kv-rows">
                  <div class="kv-row"><span>Input tokens (cumulative read):</span><strong id="nerd-in-tok">0 tokens</strong></div>
                  <div class="kv-row"><span>Output tokens (generated):</span><strong id="nerd-out-tok">0 tokens</strong></div>
                  <div class="kv-row"><span>Model multiplier (latest turn):</span><strong id="nerd-model-mult">1.0× (Basic model)</strong></div>
                  <div class="kv-row"><span>Conversation-length effect:</span><strong id="nerd-ctx-effect">1.0× baseline</strong></div>
                </div>
              </div>
            </div>

            <!-- TAB C — WHY NUMBERS DIFFER -->
            <div class="nerd-pane" data-pane="differ" role="tabpanel" hidden>
              <p class="nerd-intro">
                Published estimates for a single AI message range from a few drops of water to a small glass. These numbers are not contradictions—they measure different things:
              </p>
              <div class="differ-list">
                <div class="differ-card">
                  <strong>Newer versus older hardware</strong>
                  <p>Modern H100 and TPU fleets use roughly 0.24–0.34 Wh per median text prompt. Early 2023 academic models examined 2020-era GPT-3 hardware (~4.0 Wh per query)—more than 10× the electricity.</p>
                </div>
                <div class="differ-card">
                  <strong>Cooling water versus total water footprint</strong>
                  <p>Company disclosures (Google's ~0.26 ml, OpenAI's ~0.32 ml) report on-site server cooling water only. Independent academic studies also include off-site water evaporated at thermoelectric and hydroelectric power stations.</p>
                </div>
                <div class="differ-card">
                  <strong>Data center location, climate &amp; cooling design</strong>
                  <p>Evaporative cooling towers in hot, dry desert summers consume far more water than facilities in cool climates. Newer closed-loop liquid cooling systems recirculate fluid through dry radiators with near-zero ongoing water evaporation.</p>
                </div>
                <div class="differ-card">
                  <strong>Reported figures versus modeled estimates</strong>
                  <p>Company fleet averages and lifecycle academic models use different boundaries and should not be compared as if they were identical meter readings.</p>
                </div>
              </div>
            </div>

            <!-- TAB D — SETTINGS -->
            <div class="nerd-pane" data-pane="settings" role="tabpanel" hidden>
              <div class="nerd-settings-group">
                <div class="nerd-box-title">1. Estimation Scenario</div>
                <label class="nerd-field">
                  <span>Scenario Preset</span>
                  <select id="nerd-set-scenario">
                    <option value="official">Official numbers — Based on reported company figures</option>
                    <option value="realistic">Realistic — Cooling and electricity-generation water</option>
                    <option value="scary">Scary numbers — A higher-impact illustrative scenario</option>
                  </select>
                </label>

                <label class="nerd-field" id="nerd-scary-variant-wrap">
                  <span>High-Impact Scenario Variant (when using Scary numbers)</span>
                  <select id="nerd-set-scary-variant">
                    <option value="viral_2023">Older 2023 study (GPT-3 era ~16.9 ml / reply)</option>
                    <option value="hot_climate">Hot-climate data center (High evaporative cooling ~1.7 ml / reply)</option>
                  </select>
                </label>

                <label class="nerd-field">
                  <span>Data Center Cooling System</span>
                  <select id="nerd-set-cooling">
                    <option value="evaporative">Evaporative — Standard cooling towers that evaporate water</option>
                    <option value="closed_loop">Closed-loop liquid — Sealed loop with near-zero water use</option>
                    <option value="mixed">Mixed — Seasonal air cooling with warm-weather water assist</option>
                  </select>
                </label>
              </div>

              <div class="nerd-settings-group">
                <div class="nerd-box-title">2. Display &amp; Experience</div>
                <div class="nerd-settings-grid">
                  <label class="nerd-field">
                    <span>Units</span>
                    <select id="nerd-set-units">
                      <option value="liters">Metric (ml / L)</option>
                      <option value="gallons">US (fl oz / gal)</option>
                    </select>
                  </label>

                  <label class="nerd-field">
                    <span>Humor Level</span>
                    <select id="nerd-set-humor">
                      <option value="serious">Serious</option>
                      <option value="funny">Funny</option>
                      <option value="silly">Extra silly</option>
                    </select>
                  </label>

                  <label class="nerd-field">
                    <span>Bottle Magnification</span>
                    <select id="nerd-set-zoom">
                      <option value="zoom10">10 ml bottle view</option>
                      <option value="zoom100">100 ml bottle view</option>
                      <option value="true1000">1 L true scale</option>
                    </select>
                  </label>

                  <label class="nerd-field">
                    <span>Theme</span>
                    <select id="nerd-set-theme">
                      <option value="auto">Auto (Match site)</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>
                </div>

                <label class="nerd-check-row">
                  <input type="checkbox" id="nerd-set-badges" checked />
                  <span>Show subtle water estimate pill beneath each AI reply</span>
                </label>

                <label class="nerd-check-row">
                  <input type="checkbox" id="nerd-set-sound" />
                  <span>Play soft splash sound on milestones (Off by default)</span>
                </label>

                <div style="margin-top:4px;">
                  <button class="aiwm-action-btn secondary" id="nerd-replay-welcome-btn" type="button" style="width:auto;padding:5px 12px;">
                    Replay welcome introduction
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- =====================================================================
           FIRST-RUN 3-CARD INTRODUCTION (Shown once unless replayed)
           ===================================================================== -->
      <div class="aiwm-modal-backdrop" id="aiwm-welcome-modal" hidden role="dialog" aria-modal="true" aria-labelledby="aiwm-welcome-title">
        <div class="aiwm-welcome-card">
          <div class="welcome-step-dots" aria-label="Onboarding step indicator">
            <span class="w-dot active" data-wstep="0"></span>
            <span class="w-dot" data-wstep="1"></span>
            <span class="w-dot" data-wstep="2"></span>
          </div>
          <div class="welcome-icon" id="aiwm-welcome-icon">${Bottle.createMiniBottleIcon(24)}</div>
          <h3 id="aiwm-welcome-title">Meet your AI Water Meter</h3>
          <p id="aiwm-welcome-text">
            This 1-liter baby-blue bottle gradually fills as we estimate the water associated with cooling the AI servers during your conversations.
          </p>
          <div class="welcome-actions">
            <button class="aiwm-action-btn secondary" id="aiwm-welcome-skip" type="button">Skip</button>
            <button class="aiwm-action-btn primary" id="aiwm-welcome-next" type="button">Continue</button>
          </div>
        </div>
      </div>
    `;

    widgetShadow.appendChild(wrapper);
    document.documentElement.appendChild(widgetHost);

    applySafeWidgetPosition();
    bindWidgetEvents(wrapper);
    maybeShowFirstRunWelcome();
    updateWidgetUI(false);
  }

  function maybeShowFirstRunWelcome() {
    if (settings.welcomeSeen) return;
    const modal = widgetShadow.getElementById('aiwm-welcome-modal');
    if (modal) {
      welcomeStep = 0;
      renderWelcomeStep();
      modal.removeAttribute('hidden');
    }
  }

  function renderWelcomeStep() {
    const cards = [
      {
        icon: Bottle.createMiniBottleIcon(24),
        title: 'Meet your AI Water Meter',
        text: 'This 1-liter baby-blue bottle gradually fills as we estimate the water associated with cooling the AI servers during your conversations.',
        btn: 'Continue'
      },
      {
        icon: Bottle.createIconSvg('cooling', 26),
        title: 'Estimates, not measurements',
        text: 'Exact per-message water consumption is not publicly available, so every figure is a rough estimate for awareness. Your conversation text never leaves your browser.',
        btn: 'Continue'
      },
      {
        icon: Bottle.createIconSvg('sliders', 26),
        title: 'Explore more',
        text: 'Tap "Why?" anytime for a simple 3-step explanation, or open "Nerd mode" to inspect server hardware assumptions, scenarios, and settings.',
        btn: 'Done'
      }
    ];
    const curr = cards[welcomeStep] || cards[0];
    widgetShadow.getElementById('aiwm-welcome-icon').innerHTML = curr.icon;
    widgetShadow.getElementById('aiwm-welcome-title').textContent = curr.title;
    widgetShadow.getElementById('aiwm-welcome-text').textContent = curr.text;
    widgetShadow.getElementById('aiwm-welcome-next').textContent = curr.btn;
    widgetShadow.querySelectorAll('.w-dot').forEach((d, idx) => {
      d.classList.toggle('active', idx === welcomeStep);
    });
  }

  function closeFirstRunWelcome() {
    const modal = widgetShadow.getElementById('aiwm-welcome-modal');
    if (modal) modal.setAttribute('hidden', '');
    settings.welcomeSeen = true;
    saveSettingsToStorage();
  }

  function bindWidgetEvents(wrapper) {
    const expandBtn = widgetShadow.getElementById('aiwm-expand-btn');
    const collapseBtn = widgetShadow.getElementById('aiwm-collapse-btn');
    const infoBtn = widgetShadow.getElementById('aiwm-info-btn');
    const infoDrawer = widgetShadow.getElementById('aiwm-info-drawer');
    const bottleMount = widgetShadow.getElementById('aiwm-bottle-mount');

    const openWhyBtn = widgetShadow.getElementById('aiwm-open-why-btn');
    const openNerdBtn = widgetShadow.getElementById('aiwm-open-nerd-btn');
    const whyModal = widgetShadow.getElementById('aiwm-why-modal');
    const whyClose = widgetShadow.getElementById('aiwm-why-close');
    const whyToNerd = widgetShadow.getElementById('aiwm-why-to-nerd');

    const nerdModal = widgetShadow.getElementById('aiwm-nerd-modal');
    const nerdClose = widgetShadow.getElementById('aiwm-nerd-close');
    const shareBtn = widgetShadow.getElementById('aiwm-share-btn');
    const dragHandle = widgetShadow.getElementById('aiwm-drag-handle');

    const welcomeSkip = widgetShadow.getElementById('aiwm-welcome-skip');
    const welcomeNext = widgetShadow.getElementById('aiwm-welcome-next');
    const replayWelcomeBtn = widgetShadow.getElementById('nerd-replay-welcome-btn');

    welcomeSkip.addEventListener('click', closeFirstRunWelcome);
    welcomeNext.addEventListener('click', () => {
      if (welcomeStep < 2) {
        welcomeStep++;
        renderWelcomeStep();
      } else {
        closeFirstRunWelcome();
      }
    });

    replayWelcomeBtn.addEventListener('click', () => {
      nerdModal.setAttribute('hidden', '');
      welcomeStep = 0;
      renderWelcomeStep();
      widgetShadow.getElementById('aiwm-welcome-modal').removeAttribute('hidden');
    });

    expandBtn.addEventListener('click', () => {
      settings.widgetCollapsed = false;
      wrapper.classList.remove('is-collapsed');
      saveSettingsToStorage();
    });

    collapseBtn.addEventListener('click', () => {
      settings.widgetCollapsed = true;
      wrapper.classList.add('is-collapsed');
      saveSettingsToStorage();
    });

    infoBtn.addEventListener('click', () => {
      if (infoDrawer.hasAttribute('hidden')) infoDrawer.removeAttribute('hidden');
      else infoDrawer.setAttribute('hidden', '');
    });

    bottleMount.addEventListener('click', () => {
      funLineRotationIndex = (funLineRotationIndex + 1) % 3;
      updateWidgetUI(false);
    });

    openWhyBtn.addEventListener('click', () => openWhyModal(null));

    whyClose.addEventListener('click', () => {
      whyModal.setAttribute('hidden', '');
      activeWhyMessageId = null;
    });

    whyModal.addEventListener('click', (e) => {
      if (e.target === whyModal) {
        whyModal.setAttribute('hidden', '');
        activeWhyMessageId = null;
      }
    });

    whyToNerd.addEventListener('click', () => {
      whyModal.setAttribute('hidden', '');
      openNerdModal('water');
    });

    openNerdBtn.addEventListener('click', () => openNerdModal('water'));

    nerdClose.addEventListener('click', () => {
      nerdModal.setAttribute('hidden', '');
    });

    nerdModal.addEventListener('click', (e) => {
      if (e.target === nerdModal) nerdModal.setAttribute('hidden', '');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && widgetShadow) {
        whyModal.setAttribute('hidden', '');
        nerdModal.setAttribute('hidden', '');
        widgetShadow.getElementById('aiwm-welcome-modal').setAttribute('hidden', '');
      }
    });

    // Nerd Mode Tabs with keyboard arrow navigation
    const tabButtons = Array.from(widgetShadow.querySelectorAll('.nerd-tab'));
    tabButtons.forEach((tabBtn, idx) => {
      tabBtn.addEventListener('click', () => {
        switchNerdTab(tabBtn.getAttribute('data-tab'));
      });
      tabBtn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const dir = e.key === 'ArrowRight' ? 1 : -1;
          const next = tabButtons[(idx + dir + tabButtons.length) % tabButtons.length];
          next.focus();
          switchNerdTab(next.getAttribute('data-tab'));
        }
      });
    });

    // Nerd Mode Settings controls
    widgetShadow.getElementById('nerd-set-scenario').addEventListener('change', (e) => {
      const simpleId = e.target.value;
      if (simpleId === 'official') {
        settings.scenario = 'official_2025';
      } else if (simpleId === 'scary') {
        const variant = widgetShadow.getElementById('nerd-set-scary-variant').value || 'viral_2023';
        settings.scenario = variant;
      } else {
        settings.scenario = 'realistic_full';
      }
      saveSettingsToStorage();
      refreshAllMessageBadges();
      updateWidgetUI(false);
    });

    widgetShadow.getElementById('nerd-set-scary-variant').addEventListener('change', (e) => {
      settings.scenario = e.target.value;
      saveSettingsToStorage();
      refreshAllMessageBadges();
      updateWidgetUI(false);
    });

    widgetShadow.getElementById('nerd-set-cooling').addEventListener('change', (e) => {
      settings.coolingType = e.target.value;
      saveSettingsToStorage();
      refreshAllMessageBadges();
      updateWidgetUI(false);
    });

    widgetShadow.getElementById('nerd-set-humor').addEventListener('change', (e) => {
      settings.humorLevel = e.target.value;
      saveSettingsToStorage();
      updateWidgetUI(false);
    });

    widgetShadow.getElementById('nerd-set-zoom').addEventListener('change', (e) => {
      settings.bottleView = e.target.value;
      previousCompletedBottles = 0;
      saveSettingsToStorage();
      updateWidgetUI(false);
    });

    widgetShadow.getElementById('nerd-set-units').addEventListener('change', (e) => {
      settings.units = e.target.value;
      saveSettingsToStorage();
      refreshAllMessageBadges();
      updateWidgetUI(false);
    });

    widgetShadow.getElementById('nerd-set-theme').addEventListener('change', (e) => {
      settings.theme = e.target.value;
      saveSettingsToStorage();
      refreshAllMessageBadges();
      updateWidgetUI(false);
    });

    widgetShadow.getElementById('nerd-set-badges').addEventListener('change', (e) => {
      settings.showMessageBadges = Boolean(e.target.checked);
      saveSettingsToStorage();
      refreshAllMessageBadges();
    });

    widgetShadow.getElementById('nerd-set-sound').addEventListener('change', (e) => {
      settings.soundEnabled = Boolean(e.target.checked);
      if (settings.soundEnabled) Bottle.playSoftSplashSound();
      saveSettingsToStorage();
    });

    shareBtn.addEventListener('click', downloadShareCard);

    // Constrained dragging
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialRight = 20;
    let initialBottom = 88;

    dragHandle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = widgetHost.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialBottom = window.innerHeight - rect.bottom;
      dragHandle.setPointerCapture(e.pointerId);
    });

    dragHandle.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const safe = getSafeWidgetPosition(initialRight - dx, initialBottom - dy);
      widgetHost.style.right = `${safe.right}px`;
      widgetHost.style.bottom = `${safe.bottom}px`;
    });

    dragHandle.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      try { dragHandle.releasePointerCapture(e.pointerId); } catch (_) {}
      settings.widgetPosition = {
        right: parseInt(widgetHost.style.right, 10) || 20,
        bottom: parseInt(widgetHost.style.bottom, 10) || 88
      };
      saveSettingsToStorage();
    });

    window.addEventListener('resize', () => {
      applySafeWidgetPosition();
    });
  }

  function switchNerdTab(tabId) {
    activeNerdTab = tabId || 'water';
    widgetShadow.querySelectorAll('.nerd-tab').forEach((btn) => {
      const isSelected = btn.getAttribute('data-tab') === activeNerdTab;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
    widgetShadow.querySelectorAll('.nerd-pane').forEach((pane) => {
      if (pane.getAttribute('data-pane') === activeNerdTab) {
        pane.removeAttribute('hidden');
        pane.classList.add('active');
      } else {
        pane.setAttribute('hidden', '');
        pane.classList.remove('active');
      }
    });
  }

  function openNerdModal(initialTab) {
    unlockAchievement('curious_mind');
    switchNerdTab(initialTab || 'water');
    updateWidgetUI(false);
    const modal = widgetShadow.getElementById('aiwm-nerd-modal');
    if (modal) modal.removeAttribute('hidden');
  }

  function showMilestoneToast(milestone) {
    if (!widgetShadow || !milestone) return;
    const toast = widgetShadow.getElementById('aiwm-milestone-toast');
    if (!toast) return;
    widgetShadow.getElementById('aiwm-toast-title').textContent = milestone.title;
    widgetShadow.getElementById('aiwm-toast-msg').textContent = milestone.message;
    toast.removeAttribute('hidden');
    if (settings.soundEnabled) {
      Bottle.playSoftSplashSound();
    }
    setTimeout(() => {
      if (toast) toast.setAttribute('hidden', '');
    }, 3800);
  }

  function checkMilestonesAndAchievements(chatMl, todayMl, allTimeMl, peakContextTokens) {
    if (messageMap.size >= 1) unlockAchievement('first_drop');
    if (todayMl >= 20 || allTimeMl >= 20) unlockAchievement('first_sip');
    if (peakContextTokens >= 1500) unlockAchievement('marathon_chatter');
    if ((storageTotals.todayMessages || 0) >= 50 || messageMap.size >= 50) unlockAchievement('chatty_fish');
    if (todayMl >= 1000 || allTimeMl >= 1000) unlockAchievement('bottle_filler');

    for (let i = Config.MILESTONES.length - 1; i >= 0; i--) {
      const m = Config.MILESTONES[i];
      if (chatMl >= m.thresholdMl && !shownChatMilestones.has(m.id)) {
        shownChatMilestones.add(m.id);
        showMilestoneToast(m);
        break;
      }
    }
  }

  function downloadShareCard() {
    try {
      const agg = getChatAggregates(settings.scenario, settings.coolingType);
      const visual = Estimator.getBottleVisualState(agg.totalWaterMl, settings.bottleView, agg.coolingSharePct);
      const friendlyCooling = Estimator.formatFriendlyWater(agg.coolingWaterMl, settings.units);
      const comp = Comparisons.getComparisonForVolume(agg.coolingWaterMl, settings.humorLevel);
      const mood = Estimator.getMascotMood(agg.totalWaterMl, agg.hasLongChatTurn, false);

      const canvas = Bottle.generateShareCardCanvas({
        friendlyHeadline: friendlyCooling.headline,
        exactSubtext: friendlyCooling.compactSubtext,
        funnyLine: comp.text,
        fillPercent: visual.fillPercent,
        coolingSharePct: agg.coolingSharePct,
        mood
      });

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `ai-water-meter-${getTodayKey()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (_) {}
  }

  /**
   * Updates the Default Floating Widget, Minimized Bubble, and Nerd Mode tabs.
   * Note: Per Section 6, the default widget headline refers specifically to the
   * estimated SERVER COOLING WATER (`agg.coolingWaterMl`), while the full
   * cooling + power-plant breakdown is shown in Why and Nerd mode.
   */
  function updateWidgetUI(allowCelebration = true) {
    if (!widgetShadow) return;

    const rootEl = widgetShadow.querySelector('.aiwm-root');
    if (rootEl) {
      rootEl.classList.remove('theme-light', 'theme-dark');
      rootEl.classList.add(`theme-${resolveTheme()}`);
      rootEl.classList.toggle('is-collapsed', Boolean(settings.widgetCollapsed));
    }

    applySafeWidgetPosition();

    const activeScenario = Estimator.normalizeScenarioId(settings.scenario);
    const activeCooling = settings.coolingType || 'evaporative';
    const agg = getChatAggregates(activeScenario, activeCooling);

    const scaleRatio = getScenarioScaleRatio(activeScenario, activeCooling);
    const todayMl = Math.max(agg.totalWaterMl, (storageTotals.todayMlTypical || 0) * scaleRatio);
    const allTimeMl = Math.max(todayMl, (storageTotals.allTimeMlTypical || 0) * scaleRatio);

    const visual = Estimator.getBottleVisualState(agg.totalWaterMl, settings.bottleView, agg.coolingSharePct);
    const celebrate = allowCelebration && visual.completedViewBottles > previousCompletedBottles;
    previousCompletedBottles = visual.completedViewBottles;

    const mood = Estimator.getMascotMood(agg.totalWaterMl, agg.hasLongChatTurn, celebrate);

    // 1. Update Bottle on Default Widget
    const bottleMount = widgetShadow.getElementById('aiwm-bottle-mount');
    Bottle.updateBottleLevel(bottleMount, visual.fillPercent, {
      coolingSharePct: agg.coolingSharePct,
      mood,
      celebrate,
      ariaLabel: `1-liter water bottle, ${Math.round(visual.fillPercent)}% full`
    });

    // 2. Default Widget Headline & Muted Figure (Server Cooling Water)
    const friendlyCooling = Estimator.formatFriendlyWater(agg.coolingWaterMl, settings.units);
    const bigFriendlyEl = widgetShadow.getElementById('aiwm-big-friendly');
    const exactSubEl = widgetShadow.getElementById('aiwm-exact-sub');
    if (bigFriendlyEl) bigFriendlyEl.textContent = friendlyCooling.headline;
    if (exactSubEl) exactSubEl.textContent = friendlyCooling.compactSubtext;

    // Minimized Bubble
    const pillVol = widgetShadow.getElementById('aiwm-pill-vol');
    if (pillVol) pillVol.textContent = friendlyCooling.headline;

    // 3. One Short Sentence on Default Widget
    const comp = Comparisons.getComparisonForVolume(agg.coolingWaterMl, settings.humorLevel);
    const funLines = [
      agg.coolingWaterMl <= 0
        ? 'A quiet server rack waiting for your first message.'
        : `Keeping these servers cool took ${friendlyCooling.phraseLower}.`,
      agg.hasLongChatTurn
        ? 'Your AI chat made the servers work up a sweat.'
        : 'A little more chatting, a little more cooling.',
      comp.text
    ];
    const funLineEl = widgetShadow.getElementById('aiwm-fun-line');
    if (funLineEl) {
      funLineEl.textContent = funLines[funLineRotationIndex % funLines.length];
    }

    if (allowCelebration && agg.totalWaterMl > 0) {
      checkMilestonesAndAchievements(agg.totalWaterMl, todayMl, allTimeMl, agg.peakContextTokens);
    }

    // 4. Update Nerd Mode — Tab A (Water)
    const bd = Estimator.formatBreakdownForDisplay(agg.coolingWaterMl, agg.powerplantWaterMl, settings.units);
    widgetShadow.getElementById('nerd-cool-val').textContent = `${bd.coolingFormatted} (${Math.round(agg.coolingSharePct)}%)`;
    widgetShadow.getElementById('nerd-pwr-val').textContent = `${bd.powerplantFormatted} (${Math.round(agg.powerplantSharePct)}%)`;
    widgetShadow.getElementById('nerd-tot-val').textContent = bd.totalFormatted;
    widgetShadow.getElementById('nerd-btl-equiv').textContent = `${visual.true1LBottlesFormatted} bottles (1 L)`;

    widgetShadow.getElementById('nerd-bar-cool').style.width = `${agg.coolingSharePct}%`;
    widgetShadow.getElementById('nerd-bar-pwr').style.width = `${agg.powerplantSharePct}%`;

    widgetShadow.getElementById('nerd-energy-wh').textContent = `${Number(agg.energyWh.toFixed(2))} Wh (${agg.energyKwh} kWh)`;
    widgetShadow.getElementById('nerd-scen-name').textContent = agg.scenarioLabel;
    widgetShadow.getElementById('nerd-cool-assump').textContent = `${agg.coolingTypeLabel} · WUE ${agg.effectiveWUE} L/kWh`;

    const todayBottles = Estimator.formatBottleCount(todayMl / Config.BOTTLE.STANDARD_CAPACITY_ML);
    const allBottles = Estimator.formatBottleCount(allTimeMl / Config.BOTTLE.STANDARD_CAPACITY_ML);
    widgetShadow.getElementById('nerd-session-btls').textContent =
      `Chat ${visual.true1LBottlesFormatted} · Today ${todayBottles} · All-time ${allBottles}`;

    const paceInfo = Estimator.calculateMessagesPerBottle(agg.totalWaterMl, messageMap.size, activeScenario, activeCooling);
    widgetShadow.getElementById('nerd-pace-text').textContent = paceInfo.formattedText;

    // 5. Update Nerd Mode — Tab B (Servers)
    widgetShadow.getElementById('nerd-gpu-secs').textContent = `${agg.gpuSeconds} GPU-s`;
    widgetShadow.getElementById('nerd-pue-sub').textContent = `Facility PUE ${agg.effectivePUE}`;
    widgetShadow.getElementById('nerd-kv-mb').textContent = `${agg.peakKvCacheMb} MB KV`;
    widgetShadow.getElementById('nerd-hbm-sub').textContent = `+ 1.85 GB model slice (${agg.peakTotalHbmGb} GB HBM)`;
    widgetShadow.getElementById('nerd-ram-mb').textContent = `${agg.peakHostRamMb} MB DDR5`;
    widgetShadow.getElementById('nerd-heat-wh').textContent = `${Number(agg.energyWh.toFixed(2))} Wh`;
    widgetShadow.getElementById('nerd-heat-joke').textContent = agg.heatComparisonText;

    const latest = agg.latestTurnCalc;
    widgetShadow.getElementById('nerd-in-tok').textContent = latest
      ? `${latest.cumulativeInputTokens.toLocaleString()} tokens (latest turn)`
      : '0 tokens';
    widgetShadow.getElementById('nerd-out-tok').textContent = `${agg.totalOutputTokens.toLocaleString()} tokens total`;
    widgetShadow.getElementById('nerd-model-mult').textContent = latest
      ? `${latest.modelMultiplier}× (${latest.modelModeLabel})`
      : '1.0× (Basic model)';
    widgetShadow.getElementById('nerd-ctx-effect').textContent = latest
      ? `${latest.contextGrowthRatio}× vs. short first turn`
      : '1.0× baseline';

    // 6. Update Nerd Mode — Tab D (Settings)
    const simpleScen = Estimator.toSimpleScenarioId(settings.scenario);
    widgetShadow.getElementById('nerd-set-scenario').value = simpleScen;
    const scaryWrap = widgetShadow.getElementById('nerd-scary-variant-wrap');
    if (scaryWrap) {
      scaryWrap.style.display = simpleScen === 'scary' ? 'flex' : 'none';
    }
    if (settings.scenario === 'hot_climate' || settings.scenario === 'viral_2023') {
      widgetShadow.getElementById('nerd-set-scary-variant').value = settings.scenario;
    }
    widgetShadow.getElementById('nerd-set-cooling').value = settings.coolingType || 'evaporative';
    widgetShadow.getElementById('nerd-set-humor').value = settings.humorLevel || 'funny';
    widgetShadow.getElementById('nerd-set-zoom').value = settings.bottleView || 'zoom10';
    widgetShadow.getElementById('nerd-set-units').value = settings.units || 'liters';
    widgetShadow.getElementById('nerd-set-theme').value = settings.theme || 'auto';
    widgetShadow.getElementById('nerd-set-badges').checked = Boolean(settings.showMessageBadges);
    widgetShadow.getElementById('nerd-set-sound').checked = Boolean(settings.soundEnabled);
  }

  /**
   * Opens the Friendly Why Popup showing the 3 SVG steps + the 3-value water
   * breakdown (`Cooling water + Power-plant water = Total water`) + reply summary.
   */
  function openWhyModal(msgId) {
    if (!widgetShadow) return;
    activeWhyMessageId = msgId;

    let coolingMl = 0;
    let powerplantMl = 0;
    let totalMl = 0;
    let coolingSharePct = 30;
    let powerplantSharePct = 70;
    let isLong = false;

    if (msgId && messageMap.has(msgId)) {
      const entry = messageMap.get(msgId);
      const est = Estimator.estimateMessageWater({
        replyChars: entry.replyChars,
        promptChars: entry.promptChars,
        priorContextChars: entry.priorContextChars || 0,
        isReasoning: entry.isReasoning,
        scenario: settings.scenario,
        coolingType: settings.coolingType,
        platform
      });
      coolingMl = est.coolingWaterMl;
      powerplantMl = est.powerplantWaterMl;
      totalMl = est.totalWaterMl;
      coolingSharePct = est.coolingSharePct;
      powerplantSharePct = est.powerplantSharePct;
      isLong = est.isLongChat;
    } else {
      const agg = getChatAggregates(settings.scenario, settings.coolingType);
      if (messageMap.size > 0) {
        coolingMl = agg.coolingWaterMl;
        powerplantMl = agg.powerplantWaterMl;
        totalMl = agg.totalWaterMl;
        coolingSharePct = agg.coolingSharePct;
        powerplantSharePct = agg.powerplantSharePct;
        isLong = agg.hasLongChatTurn;
      } else {
        const fallback = Estimator.calculateForScenario({
          replyChars: 1200,
          promptChars: 160,
          scenario: settings.scenario,
          coolingType: settings.coolingType,
          platform
        });
        coolingMl = fallback.coolingWaterMl;
        powerplantMl = fallback.powerplantWaterMl;
        totalMl = fallback.totalWaterMl;
        coolingSharePct = fallback.coolingSharePct;
        powerplantSharePct = fallback.powerplantSharePct;
      }
    }

    const bd = Estimator.formatBreakdownForDisplay(coolingMl, powerplantMl, settings.units);
    widgetShadow.getElementById('why-cool-val').textContent = bd.coolingFormatted;
    widgetShadow.getElementById('why-pwr-val').textContent = bd.powerplantFormatted;
    widgetShadow.getElementById('why-tot-val').textContent = bd.totalFormatted;

    widgetShadow.getElementById('why-bar-cool').style.width = `${coolingSharePct}%`;
    widgetShadow.getElementById('why-bar-pwr').style.width = `${powerplantSharePct}%`;

    const friendly = Estimator.formatFriendlyWater(totalMl, settings.units);
    widgetShadow.getElementById('aiwm-why-reply-line').textContent =
      `This reply: about ${bd.totalFormatted} · ${friendly.headline}`;

    const longLineEl = widgetShadow.getElementById('aiwm-why-long-line');
    if (longLineEl) {
      if (isLong) longLineEl.removeAttribute('hidden');
      else longLineEl.setAttribute('hidden', '');
    }

    const modal = widgetShadow.getElementById('aiwm-why-modal');
    if (modal) modal.removeAttribute('hidden');
  }

  /**
   * Subtle baby-blue per-message pill with inline SVG water-drop and friendly
   * estimated amount. Shows "Tap to see why." on hover/focus.
   */
  function renderOrUpdateMessageBadge(messageEl, msgId, estimate) {
    if (!messageEl) return;
    const cfg = Selectors.SITE_SELECTORS[platform] || Selectors.SITE_SELECTORS.chatgpt;
    const anchor = Selectors.queryFirstWithFallbacks(cfg.badgeAnchor, messageEl) || messageEl;

    let badgeHost = messageEl.querySelector(`[data-aiwm-badge-for="${msgId}"]`);
    if (!settings.showMessageBadges) {
      if (badgeHost) badgeHost.style.display = 'none';
      return;
    }

    if (!badgeHost) {
      badgeHost = document.createElement('div');
      badgeHost.setAttribute('data-ai-water-meter', 'badge');
      badgeHost.setAttribute('data-aiwm-badge-for', msgId);
      badgeHost.style.cssText = 'display: block; margin-top: 6px; margin-bottom: 4px;';

      const shadow = badgeHost.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: inline-block;
          font-family: "Nunito", "Poppins", system-ui, -apple-system, "Segoe UI", sans-serif;
        }
        .aiwm-msg-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 999px;
          background: #DDF1FC;
          border: 1px solid #A7D8F5;
          color: #236B94;
          font-size: 12.5px;
          font-weight: 700;
          line-height: 1.25;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
        }
        .aiwm-msg-badge:hover,
        .aiwm-msg-badge:focus-visible {
          background: #A7D8F5;
          border-color: #5DB7E8;
          color: #151C22;
          transform: translateY(-1px);
          outline: 2px solid #5DB7E8;
          outline-offset: 1px;
        }
        .aiwm-msg-badge.dark {
          background: rgba(35, 107, 148, 0.32);
          border-color: rgba(167, 216, 245, 0.4);
          color: #DDF1FC;
        }
        .aiwm-msg-badge.dark:hover,
        .aiwm-msg-badge.dark:focus-visible {
          background: rgba(93, 183, 232, 0.38);
          color: #FFFFFF;
        }
      `;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'aiwm-msg-badge';
      btn.title = 'Tap to see why.';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openWhyModal(msgId);
      });

      shadow.appendChild(style);
      shadow.appendChild(btn);
      anchor.appendChild(badgeHost);
    }

    badgeHost.style.display = 'block';
    const shadow = badgeHost.shadowRoot;
    if (!shadow) return;
    const btn = shadow.querySelector('.aiwm-msg-badge');
    if (!btn) return;

    btn.classList.toggle('dark', resolveTheme() === 'dark');

    const compactStr = Estimator.formatCompactBadgeVolume(estimate.totalWaterMl, settings.units);
    btn.setAttribute('aria-label', `Estimated water: ${compactStr}. Tap to see why.`);
    btn.innerHTML = `${Bottle.createCoolingDropIcon(13)} <span>${compactStr}</span>`;
  }

  function refreshAllMessageBadges() {
    try {
      const cfg = Selectors.SITE_SELECTORS[platform] || Selectors.SITE_SELECTORS.chatgpt;
      const assistantNodes = Selectors.queryWithFallbacks(cfg.assistantMessages, document);
      assistantNodes.forEach((node, idx) => {
        const msgId = Selectors.getOrAssignMessageId(node, idx);
        const entry = messageMap.get(msgId);
        if (entry) {
          entry.estimate = Estimator.estimateMessageWater({
            replyChars: entry.replyChars,
            promptChars: entry.promptChars,
            priorContextChars: entry.priorContextChars || 0,
            isReasoning: entry.isReasoning,
            scenario: settings.scenario,
            coolingType: settings.coolingType,
            platform
          });
          renderOrUpdateMessageBadge(node, msgId, entry.estimate);
        }
      });
    } catch (_) {}
  }

  async function scanConversationDOM() {
    try {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        const newChatId = Selectors.getChatIdFromUrl(location.href);
        if (newChatId !== currentChatId) {
          currentChatId = newChatId;
          messageMap.clear();
          shownChatMilestones.clear();
          previousCompletedBottles = 0;
        }
      }

      const cfg = Selectors.SITE_SELECTORS[platform] || Selectors.SITE_SELECTORS.chatgpt;
      const chatRoot = Selectors.queryFirstWithFallbacks(cfg.chatContainer, document);
      if (!chatRoot) {
        updateWidgetUI(false);
        return;
      }

      const assistantNodes = Selectors.queryWithFallbacks(cfg.assistantMessages, document);
      const userNodes = Selectors.queryWithFallbacks(cfg.userMessages, document);

      let baselineDeltaMl = 0;
      let newMessagesDelta = 0;
      let anyChanged = false;
      let runningContextChars = 0;

      assistantNodes.forEach((assistEl, index) => {
        const msgId = Selectors.getOrAssignMessageId(assistEl, index);
        const replyText = Selectors.extractMessageText(assistEl, platform);
        const replyChars = replyText.length;

        const pairedUserEl = userNodes[index] || userNodes[userNodes.length - 1] || null;
        const promptText = pairedUserEl ? Selectors.extractMessageText(pairedUserEl, platform) : '';
        const promptChars = promptText.length || 160;

        const priorContextChars = runningContextChars;
        runningContextChars += promptChars + replyChars;

        if (replyChars === 0 && !messageMap.has(msgId)) return;

        const isReasoning = Selectors.detectReasoningMode(assistEl, platform);
        const existing = messageMap.get(msgId);
        const hasChanged =
          !existing ||
          existing.replyChars !== replyChars ||
          existing.promptChars !== promptChars ||
          existing.priorContextChars !== priorContextChars ||
          existing.isReasoning !== isReasoning;

        if (hasChanged) {
          anyChanged = true;
          const estimate = Estimator.estimateMessageWater({
            replyChars,
            promptChars,
            priorContextChars,
            isReasoning,
            scenario: settings.scenario,
            coolingType: settings.coolingType,
            platform
          });

          const newBaselineMl = estimate.scenarios.realistic_full.totalWaterMl;
          const prevBaselineMl = existing ? existing.recordedBaselineMl : 0;
          const diffMl = Math.max(0, newBaselineMl - prevBaselineMl);

          baselineDeltaMl += diffMl;
          if (!existing) newMessagesDelta += 1;

          messageMap.set(msgId, {
            turnIndex: index,
            replyChars,
            promptChars,
            priorContextChars,
            isReasoning,
            recordedBaselineMl: Math.max(prevBaselineMl, newBaselineMl),
            estimate
          });

          renderOrUpdateMessageBadge(assistEl, msgId, estimate);
        }
      });

      if (baselineDeltaMl > 0 || newMessagesDelta > 0) {
        const today = getTodayKey();
        if (storageTotals.todayDate !== today) {
          storageTotals.todayDate = today;
          storageTotals.todayMlTypical = 0;
          storageTotals.todayMessages = 0;
        }

        const prevChatRecord = storageTotals.chatsById[currentChatId] || { mlTypical: 0, messages: 0 };
        const currentChatBaselineTotal = getChatAggregates('realistic_full', 'evaporative').totalWaterMl;

        if (currentChatBaselineTotal > prevChatRecord.mlTypical) {
          const netIncrease = currentChatBaselineTotal - prevChatRecord.mlTypical;
          storageTotals.todayMlTypical = Number((storageTotals.todayMlTypical + netIncrease).toFixed(4));
          storageTotals.allTimeMlTypical = Number((storageTotals.allTimeMlTypical + netIncrease).toFixed(4));
        }
        if (messageMap.size > prevChatRecord.messages) {
          const netMsgIncrease = messageMap.size - prevChatRecord.messages;
          storageTotals.todayMessages += netMsgIncrease;
          storageTotals.allTimeMessages += netMsgIncrease;
        }

        storageTotals.chatsById[currentChatId] = {
          mlTypical: Math.max(prevChatRecord.mlTypical, currentChatBaselineTotal),
          messages: Math.max(prevChatRecord.messages, messageMap.size),
          updatedAt: Date.now()
        };

        await saveTotalsToStorage();
      }

      if (anyChanged || assistantNodes.length === 0) {
        updateWidgetUI(true);
      }
    } catch (_) {}
  }

  function scheduleScan() {
    if (observerDebounceTimer) clearTimeout(observerDebounceTimer);
    observerDebounceTimer = setTimeout(() => {
      scanConversationDOM();
    }, 260);
  }

  function getWidgetStyles() {
    return `
      :host { all: initial; }
      * { box-sizing: border-box; }

      .aiwm-root {
        font-family: "Nunito", "Poppins", system-ui, -apple-system, "Segoe UI", sans-serif;
        pointer-events: auto;
        color: #151C22;
        --bg-surface: #FFFFFF;
        --bg-well: #F7FAFC;
        --bg-tint: #DDF1FC;
        --border-subtle: #D5E6F2;
        --border-accent: #A7D8F5;
        --blue-main: #A7D8F5;
        --blue-deep: #5DB7E8;
        --blue-dark: #236B94;
        --text-main: #151C22;
        --text-muted: #5A6B7C;
        --shadow-elevated: 0 10px 26px rgba(21, 28, 34, 0.10), 0 2px 6px rgba(21, 28, 34, 0.05);
      }

      .aiwm-root.theme-dark {
        color: #F2F7FA;
        --bg-surface: #151C22;
        --bg-well: #1D262F;
        --bg-tint: rgba(35, 107, 148, 0.28);
        --border-subtle: rgba(167, 216, 245, 0.18);
        --border-accent: rgba(93, 183, 232, 0.45);
        --blue-main: #A7D8F5;
        --blue-deep: #5DB7E8;
        --blue-dark: #89CFF0;
        --text-main: #F2F7FA;
        --text-muted: #94A6B8;
        --shadow-elevated: 0 12px 30px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(167, 216, 245, 0.16);
      }

      /* Minimized Floating Bubble */
      .aiwm-collapsed-pill {
        display: none;
        align-items: center;
        gap: 7px;
        padding: 7px 13px;
        border-radius: 999px;
        background: var(--bg-surface);
        border: 1.5px solid var(--border-accent);
        box-shadow: var(--shadow-elevated);
        color: var(--text-main);
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.15s ease, border-color 0.15s ease;
      }
      .aiwm-collapsed-pill:hover,
      .aiwm-collapsed-pill:focus-visible {
        transform: translateY(-1px);
        border-color: var(--blue-deep);
        outline: 2px solid var(--blue-deep);
        outline-offset: 1px;
      }
      .aiwm-root.is-collapsed .aiwm-collapsed-pill { display: inline-flex; }
      .aiwm-root.is-collapsed .aiwm-card { display: none; }

      /* =======================================================================
         DEFAULT FLOATING WIDGET (220px wide, max-height <= 38vh)
         ======================================================================= */
      .aiwm-card {
        width: 220px;
        max-height: min(310px, 38vh);
        border-radius: 16px;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        box-shadow: var(--shadow-elevated);
        padding: 10px 14px 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
      }

      .aiwm-top-bar {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: grab;
        user-select: none;
      }
      .aiwm-top-bar:active { cursor: grabbing; }

      .aiwm-grip-bar {
        width: 28px;
        height: 3px;
        border-radius: 999px;
        background: var(--border-subtle);
      }

      .aiwm-mini-ctrl {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-well);
        color: var(--text-muted);
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .aiwm-mini-ctrl:hover,
      .aiwm-mini-ctrl:focus-visible {
        background: var(--bg-tint);
        color: var(--text-main);
        outline: 2px solid var(--blue-deep);
        outline-offset: 1px;
      }

      .aiwm-honesty-popover {
        background: var(--bg-well);
        border: 1px solid var(--border-accent);
        border-radius: 8px;
        padding: 6px 8px;
        font-size: 13px;
        line-height: 1.35;
        color: var(--text-muted);
      }

      .aiwm-bottle-wrap {
        cursor: pointer;
        margin: -2px 0;
      }

      .aiwm-friendly-number-block {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .aiwm-big-friendly {
        font-size: 19px;
        font-weight: 800;
        color: var(--text-main);
        line-height: 1.15;
        letter-spacing: -0.2px;
      }

      .aiwm-exact-sub {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
      }

      .aiwm-fun-line {
        margin: 0;
        font-size: 13px;
        font-weight: 500;
        line-height: 1.34;
        color: var(--text-muted);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .aiwm-btn-row {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-top: 2px;
      }

      .aiwm-action-btn {
        padding: 5.5px 10px;
        border-radius: 8px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
      }
      .aiwm-action-btn:active { transform: translateY(1px); }
      .aiwm-action-btn:focus-visible {
        outline: 2px solid var(--blue-deep);
        outline-offset: 1px;
      }
      .aiwm-action-btn.primary {
        background: var(--bg-tint);
        border: 1px solid var(--border-accent);
        color: var(--blue-dark);
      }
      .aiwm-action-btn.primary:hover {
        background: var(--blue-main);
        color: #151C22;
      }
      .aiwm-action-btn.secondary {
        background: var(--bg-well);
        border: 1px solid var(--border-subtle);
        color: var(--text-main);
      }
      .aiwm-action-btn.secondary:hover {
        border-color: var(--border-accent);
      }

      /* Milestone Toast */
      @keyframes aiwmSlideUp {
        0% { transform: translateY(6px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      .aiwm-milestone-toast {
        margin-bottom: 8px;
        width: 220px;
        background: var(--bg-surface);
        border: 1px solid var(--border-accent);
        border-radius: 12px;
        padding: 8px 10px;
        box-shadow: var(--shadow-elevated);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        animation: aiwmSlideUp 0.22s ease-out;
      }
      .aiwm-milestone-toast[hidden] { display: none !important; }
      .toast-copy { display: flex; flex-direction: column; text-align: left; line-height: 1.25; }
      .toast-copy span { color: var(--text-muted); font-size: 12px; }

      /* Modal Backdrop */
      .aiwm-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(21, 28, 34, 0.46);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483646;
        padding: 16px;
      }
      .aiwm-modal-backdrop[hidden] { display: none !important; }

      /* =======================================================================
         FRIENDLY WHY POPUP
         ======================================================================= */
      .aiwm-why-card {
        width: 100%;
        max-width: 360px;
        border-radius: 16px;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        box-shadow: var(--shadow-elevated);
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 11px;
        color: var(--text-main);
        animation: aiwmSlideUp 0.2s ease-out;
      }

      .aiwm-modal-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 15px;
      }

      .aiwm-three-steps {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .aiwm-simple-step {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: var(--bg-well);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        padding: 9px 11px;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.38;
        text-align: left;
      }
      .step-svg-icon { margin-top: 1px; }

      .aiwm-why-breakdown {
        background: var(--bg-well);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        padding: 9px 11px;
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .why-bd-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        text-align: left;
        font-size: 12px;
      }
      .why-bd-cell {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .why-bd-cell strong {
        font-size: 13.5px;
        color: var(--text-main);
      }
      .bd-label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--text-muted);
        font-size: 11.5px;
        font-weight: 600;
      }
      .bd-swatch {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 2px;
      }
      .bd-swatch.cool { background: #5DB7E8; }
      .bd-swatch.pwr { background: #A7D8F5; border: 1px solid #5DB7E8; }

      .aiwm-stacked-bar {
        height: 8px;
        width: 100%;
        border-radius: 999px;
        overflow: hidden;
        display: flex;
        background: var(--border-subtle);
      }
      .bar-cool { background: #5DB7E8; transition: width 0.3s ease; }
      .bar-pwr { background: #A7D8F5; transition: width 0.3s ease; }

      .aiwm-why-reply-line {
        background: var(--bg-tint);
        border: 1px solid var(--border-accent);
        border-radius: 8px;
        padding: 7px 10px;
        font-size: 13px;
        font-weight: 700;
        color: var(--blue-dark);
        text-align: center;
      }

      .aiwm-why-long-line {
        font-size: 12.5px;
        color: var(--text-muted);
        text-align: center;
      }

      .aiwm-nerd-link {
        background: none;
        border: none;
        color: var(--blue-dark);
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        text-decoration: underline;
        padding: 2px;
      }

      /* =======================================================================
         NERD MODE MODAL
         ======================================================================= */
      .aiwm-nerd-card {
        width: 100%;
        max-width: 500px;
        max-height: 84vh;
        overflow-y: auto;
        border-radius: 16px;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        box-shadow: var(--shadow-elevated);
        padding: 16px 18px;
        color: var(--text-main);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .aiwm-nerd-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .nerd-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .nerd-title-wrap h3 { margin: 0; font-size: 16px; font-weight: 800; }
      .nerd-sub-pill {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        background: var(--bg-well);
        color: var(--text-muted);
        border: 1px solid var(--border-subtle);
      }

      .aiwm-nerd-tabs {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        background: var(--bg-well);
        padding: 4px;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
      }

      .nerd-tab {
        padding: 6px 6px;
        border-radius: 7px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
      }
      .nerd-tab.active {
        background: var(--bg-surface);
        color: var(--text-main);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .nerd-pane { display: flex; flex-direction: column; gap: 10px; }
      .nerd-pane[hidden] { display: none !important; }

      .nerd-box {
        background: var(--bg-well);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 11px 12px;
      }
      .nerd-box-title {
        font-size: 12.5px;
        font-weight: 800;
        color: var(--text-main);
        margin-bottom: 7px;
      }

      .nerd-three-cols {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .num-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: 9px;
        padding: 8px 9px;
        font-size: 12px;
      }
      .num-card.total { border-color: var(--border-accent); }
      .num-big { font-size: 15px; font-weight: 800; color: var(--text-main); margin: 2px 0; }
      .num-card small { color: var(--text-muted); font-size: 11px; }

      .nerd-kv-rows {
        display: flex;
        flex-direction: column;
        gap: 5px;
        font-size: 12.5px;
      }
      .kv-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        color: var(--text-muted);
      }
      .kv-row strong { color: var(--text-main); }

      .nerd-details {
        background: var(--bg-well);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        padding: 8px 11px;
        font-size: 12.5px;
      }
      .nerd-details summary {
        font-weight: 700;
        color: var(--text-muted);
        cursor: pointer;
      }
      .formula-block {
        margin-top: 7px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .formula-block code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 11.5px;
        color: var(--text-main);
      }

      .nerd-footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .aiwm-share-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid var(--border-accent);
        background: var(--bg-tint);
        color: var(--blue-dark);
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
      }

      /* Servers Tab */
      .nerd-assumption-banner {
        background: var(--bg-well);
        border-left: 3px solid var(--blue-deep);
        padding: 8px 10px;
        border-radius: 6px;
        font-size: 12px;
        color: var(--text-muted);
        line-height: 1.4;
      }

      .nerd-server-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .nerd-stat-card {
        background: var(--bg-well);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        padding: 9px 11px;
      }
      .stat-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .stat-big {
        font-size: 15.5px;
        font-weight: 800;
        color: var(--text-main);
        margin: 3px 0 1px;
      }
      .stat-sub { font-size: 11.5px; color: var(--text-muted); }

      .q-tip {
        position: relative;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 1px solid var(--border-accent);
        background: var(--bg-surface);
        color: var(--blue-dark);
        font-family: inherit;
        font-size: 11px;
        font-weight: 800;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: help;
        padding: 0;
      }
      .q-tip:hover::after,
      .q-tip:focus-visible::after {
        content: attr(data-tip);
        position: absolute;
        bottom: 130%;
        right: 0;
        width: 210px;
        background: #151C22;
        color: #F7FAFC;
        padding: 7px 9px;
        border-radius: 8px;
        font-size: 11.5px;
        font-weight: 500;
        line-height: 1.35;
        text-align: left;
        z-index: 30;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
      }

      .nerd-intro { margin: 0; font-size: 12.5px; color: var(--text-muted); line-height: 1.42; }
      .differ-list { display: flex; flex-direction: column; gap: 7px; }
      .differ-card {
        background: var(--bg-well);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        padding: 8px 11px;
        font-size: 12.5px;
      }
      .differ-card p { margin: 3px 0 0; color: var(--text-muted); line-height: 1.38; }

      /* Settings Tab */
      .nerd-settings-group {
        background: var(--bg-well);
        border: 1px solid var(--border-subtle);
        border-radius: 11px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .nerd-settings-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .nerd-field {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
      }
      .nerd-field select {
        padding: 5.5px 7px;
        border-radius: 7px;
        border: 1px solid var(--border-subtle);
        background: var(--bg-surface);
        color: var(--text-main);
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 600;
      }
      .nerd-check-row {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--text-main);
        cursor: pointer;
      }

      /* Welcome Modal */
      .aiwm-welcome-card {
        width: 100%;
        max-width: 330px;
        border-radius: 16px;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        box-shadow: var(--shadow-elevated);
        padding: 18px 20px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        color: var(--text-main);
      }
      .welcome-step-dots { display: flex; gap: 5px; }
      .w-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border-subtle); }
      .w-dot.active { background: var(--blue-deep); width: 16px; border-radius: 999px; }
      .aiwm-welcome-card h3 { margin: 0; font-size: 16.5px; font-weight: 800; }
      .aiwm-welcome-card p { margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.45; }
      .welcome-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
    `;
  }

  function setupListeners() {
    try {
      const ext = typeof chrome !== 'undefined' && chrome.storage ? chrome : (typeof browser !== 'undefined' ? browser : null);
      if (ext && ext.storage && ext.storage.onChanged) {
        ext.storage.onChanged.addListener((changes, area) => {
          if (area !== 'local') return;
          if (changes.aiwm_settings && changes.aiwm_settings.newValue) {
            settings = { ...Config.DEFAULT_SETTINGS, ...changes.aiwm_settings.newValue };
            settings.scenario = Estimator.normalizeScenarioId(settings.scenario);
            refreshAllMessageBadges();
            updateWidgetUI(false);
          }
          if (changes.aiwm_totals && changes.aiwm_totals.newValue) {
            storageTotals = { ...storageTotals, ...changes.aiwm_totals.newValue };
            if (storageTotals.allTimeMlTypical === 0 && storageTotals.todayMlTypical === 0) {
              messageMap.forEach((entry) => { entry.recordedBaselineMl = 0; });
            }
            updateWidgetUI(false);
          }
        });
      }

      if (ext && ext.runtime && ext.runtime.onMessage) {
        ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
          if (!msg || !msg.type) return;
          if (msg.type === 'AIWM_GET_ACTIVE_CHAT') {
            const agg = getChatAggregates(settings.scenario, settings.coolingType);
            sendResponse({
              chatId: currentChatId,
              platform,
              chatMlTypical: getChatAggregates('realistic_full', 'evaporative').totalWaterMl,
              chatCoolingMl: agg.coolingWaterMl,
              chatPowerplantMl: agg.powerplantWaterMl,
              chatTotalMl: agg.totalWaterMl,
              chatEnergyWh: agg.energyWh,
              chatGpuSeconds: agg.gpuSeconds,
              chatKvCacheMb: agg.peakKvCacheMb,
              chatContextTokens: agg.peakContextTokens,
              chatMessages: messageMap.size
            });
          } else if (msg.type === 'AIWM_RESET_CHAT') {
            messageMap.clear();
            shownChatMilestones.clear();
            previousCompletedBottles = 0;
            updateWidgetUI(false);
            sendResponse({ ok: true });
          }
        });
      }
    } catch (_) {}

    const observer = new MutationObserver(() => {
      scheduleScan();
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    setInterval(() => {
      if (location.href !== lastUrl) {
        scheduleScan();
      }
    }, 1000);
  }

  async function init() {
    await loadStateFromStorage();
    createFloatingWidget();
    setupListeners();
    await scanConversationDOM();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
