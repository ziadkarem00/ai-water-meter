/**
 * ============================================================================
 * AI WATER METER — TOOLBAR POPUP CONTROLLER
 * ============================================================================
 */

(function () {
  'use strict';

  const Config = window.AIWaterMeterConfig;
  const Estimator = window.AIWaterMeterEstimator;
  const Comparisons = window.AIWaterMeterComparisons;
  const Bottle = window.AIWaterMeterBottle;

  const ext = typeof chrome !== 'undefined' && chrome.storage ? chrome : (typeof browser !== 'undefined' ? browser : null);

  let settings = { ...Config.DEFAULT_SETTINGS };
  let totals = {
    todayDate: getTodayKey(),
    todayMlTypical: 0,
    todayMessages: 0,
    allTimeMlTypical: 0,
    allTimeMessages: 0,
    chatsById: {}
  };
  let unlockedAchievements = {};
  let activeChat = {
    chatId: 'none',
    chatMlTypical: 0,
    chatCoolingMl: 0,
    chatPowerplantMl: 0,
    chatTotalMl: 0,
    chatEnergyWh: 0,
    chatGpuSeconds: 0,
    chatKvCacheMb: 0,
    chatContextTokens: 0,
    chatMessages: 0
  };

  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getScenarioBaselineCalc(scenarioId, coolingType) {
    return Estimator.calculateForScenario({
      replyChars: 1200,
      promptChars: 160,
      priorContextChars: 0,
      scenario: scenarioId,
      coolingType: coolingType || settings.coolingType || 'evaporative'
    });
  }

  function getScenarioScaleRatio(scenarioId, coolingType) {
    const target = getScenarioBaselineCalc(scenarioId, coolingType);
    const base = getScenarioBaselineCalc('realistic_full', 'evaporative');
    return base.totalWaterMl > 0 ? target.totalWaterMl / base.totalWaterMl : 1;
  }

  function injectBottleAndIcons() {
    const styleEl = document.createElement('style');
    styleEl.textContent = Bottle.getBottleStyles();
    document.head.appendChild(styleEl);

    const mount = document.getElementById('popup-bottle-mount');
    if (mount) {
      mount.innerHTML = Bottle.createBottleMarkup({
        idPrefix: 'aiwm-popup-bottle',
        fillPercent: 0,
        coolingSharePct: 35,
        mood: 'sleepy',
        width: 68,
        height: 128
      });
    }

    const miniSlot = document.getElementById('mini-bottle-slot');
    if (miniSlot) {
      miniSlot.innerHTML = Bottle.createMiniBottleIcon(12);
    }
  }

  function applyTheme() {
    let theme = settings.theme || 'auto';
    if (theme === 'auto') {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
  }

  async function loadStorageData() {
    return new Promise((resolve) => {
      if (!ext || !ext.storage || !ext.storage.local) {
        resolve();
        return;
      }
      ext.storage.local.get(['aiwm_settings', 'aiwm_totals', 'aiwm_active_chat', 'aiwm_achievements'], (data) => {
        if (data && data.aiwm_settings) {
          settings = { ...Config.DEFAULT_SETTINGS, ...data.aiwm_settings };
          settings.scenario = Estimator.normalizeScenarioId(settings.scenario);
        }
        if (data && data.aiwm_achievements) {
          unlockedAchievements = { ...data.aiwm_achievements };
        }
        if (data && data.aiwm_totals) {
          totals = { ...totals, ...data.aiwm_totals };
          const today = getTodayKey();
          if (totals.todayDate !== today) {
            totals.todayDate = today;
            totals.todayMlTypical = 0;
            totals.todayMessages = 0;
          }
        }
        if (data && data.aiwm_active_chat) {
          activeChat = { ...activeChat, ...data.aiwm_active_chat };
        }
        resolve();
      });
    });
  }

  function queryActiveTabChatStats() {
    return new Promise((resolve) => {
      try {
        if (!ext || !ext.tabs || !ext.tabs.query) {
          resolve();
          return;
        }
        ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs && tabs[0];
          if (!tab || !tab.id) {
            resolve();
            return;
          }
          try {
            ext.tabs.sendMessage(tab.id, { type: 'AIWM_GET_ACTIVE_CHAT' }, (resp) => {
              if (resp && typeof resp.chatMlTypical === 'number') {
                activeChat = { ...activeChat, ...resp };
              }
              resolve();
            });
          } catch (_) {
            resolve();
          }
        });
      } catch (_) {
        resolve();
      }
    });
  }

  function saveSettings() {
    if (ext && ext.storage && ext.storage.local) {
      ext.storage.local.set({ aiwm_settings: settings });
    }
  }

  function renderPopup() {
    applyTheme();

    const scen = Estimator.normalizeScenarioId(settings.scenario);
    const coolType = settings.coolingType || 'evaporative';
    const baseCalc = getScenarioBaselineCalc(scen, coolType);
    const ratio = getScenarioScaleRatio(scen, coolType);

    const coolingSharePct = baseCalc.coolingSharePct;
    const chatMl = (activeChat.chatMlTypical || 0) * ratio;
    const todayMl = Math.max(chatMl, (totals.todayMlTypical || 0) * ratio);
    const allTimeMl = Math.max(todayMl, (totals.allTimeMlTypical || 0) * ratio);

    const todayCoolingMl = (todayMl * coolingSharePct) / 100;
    const todayPowerMl = todayMl - todayCoolingMl;

    // 1. Update Bottle Character
    const visual = Estimator.getBottleVisualState(todayMl, settings.bottleView, coolingSharePct);
    const mood = Estimator.getMascotMood(todayMl, (activeChat.chatContextTokens || 0) > 600, false);
    Bottle.updateBottleLevel(document.getElementById('popup-bottle-mount'), visual.fillPercent, {
      coolingSharePct,
      mood,
      celebrate: false
    });

    // 2. Today's Human-Friendly & Precise Estimates + Mini-Bottle Visualization
    const friendlyToday = Estimator.formatFriendlyWater(todayMl, settings.units);
    document.getElementById('today-friendly').textContent = `${friendlyToday.headline} today`;
    document.getElementById('today-exact').textContent = friendlyToday.compactSubtext;
    document.getElementById('today-bottles-label').textContent =
      `${visual.true1LBottlesFormatted} bottles (1 L) today`;

    const comp = Comparisons.getComparisonForVolume(todayMl, settings.humorLevel);
    document.getElementById('today-fun-line').textContent = comp.text;

    // 3. Compact Achievement Preview (SVG icons)
    const achGrid = document.getElementById('achievements-grid');
    achGrid.innerHTML = '';
    let unlockedCount = 0;
    Config.ACHIEVEMENTS.forEach((ach) => {
      const isUnlocked = Boolean(unlockedAchievements[ach.id]);
      if (isUnlocked) unlockedCount++;
      const div = document.createElement('div');
      div.className = `ach-item ${isUnlocked ? 'unlocked' : ''}`;
      div.title = `${ach.name}: ${ach.desc}`;
      div.innerHTML = `
        <div>${Bottle.createIconSvg(isUnlocked ? 'award' : 'drop', 16)}</div>
        <div class="ach-name">${ach.name}</div>
      `;
      achGrid.appendChild(div);
    });
    document.getElementById('ach-count').textContent = `${unlockedCount} / ${Config.ACHIEVEMENTS.length}`;

    // 4. Secondary Expandable Stats
    const chatVolStr = Estimator.formatWaterVolume(chatMl, settings.units).formatted;
    const chatBtlStr = Estimator.formatBottleCount(chatMl / 1000);
    const bdToday = Estimator.formatBreakdownForDisplay(todayCoolingMl, todayPowerMl, settings.units);
    const allVolStr = Estimator.formatWaterVolume(allTimeMl, settings.units).formatted;
    const allBtlStr = Estimator.formatBottleCount(allTimeMl / 1000);
    const totalMsgs = Math.max(activeChat.chatMessages || 0, totals.allTimeMessages || 0);

    document.getElementById('tech-chat').textContent = `${chatVolStr} (${chatBtlStr} bottles)`;
    document.getElementById('tech-split').textContent = `${bdToday.coolingFormatted} cooling + ${bdToday.powerplantFormatted} power plant`;
    document.getElementById('tech-alltime').textContent = `${allVolStr} (${allBtlStr} btl · ${totalMsgs} replies)`;
    document.getElementById('tech-hw').textContent =
      `${activeChat.chatGpuSeconds || 0} GPU-s · ${activeChat.chatKvCacheMb || 0} MB KV · ${Number((activeChat.chatEnergyWh || 0).toFixed(2))} Wh heat`;

    // 5. Sync Settings Controls
    document.getElementById('setting-scenario').value = Estimator.toSimpleScenarioId(settings.scenario);
    document.getElementById('setting-cooling-type').value = settings.coolingType || 'evaporative';
    document.getElementById('setting-bottle-view').value = settings.bottleView || 'zoom10';
    document.getElementById('setting-units').value = settings.units || 'liters';
    document.getElementById('setting-humor').value = settings.humorLevel || 'funny';
    document.getElementById('setting-theme').value = settings.theme || 'auto';
    document.getElementById('setting-badges').checked = Boolean(settings.showMessageBadges);
    document.getElementById('setting-sound').checked = Boolean(settings.soundEnabled);
  }

  function bindEvents() {
    const infoBtn = document.getElementById('info-toggle-btn');
    const infoPanel = document.getElementById('info-panel');
    infoBtn.addEventListener('click', () => {
      if (infoPanel.hasAttribute('hidden')) infoPanel.removeAttribute('hidden');
      else infoPanel.setAttribute('hidden', '');
    });

    const settingsBtn = document.getElementById('toggle-settings-btn');
    const settingsDrawer = document.getElementById('settings-drawer');
    settingsBtn.addEventListener('click', () => {
      if (settingsDrawer.hasAttribute('hidden')) settingsDrawer.removeAttribute('hidden');
      else settingsDrawer.setAttribute('hidden', '');
    });

    document.getElementById('setting-scenario').addEventListener('change', (e) => {
      const simpleId = e.target.value;
      settings.scenario = Config.SIMPLE_SCENARIOS[simpleId]
        ? Config.SIMPLE_SCENARIOS[simpleId].internalScenarioId
        : 'realistic_full';
      saveSettings();
      renderPopup();
    });

    document.getElementById('setting-cooling-type').addEventListener('change', (e) => {
      settings.coolingType = e.target.value;
      saveSettings();
      renderPopup();
    });

    document.getElementById('setting-bottle-view').addEventListener('change', (e) => {
      settings.bottleView = e.target.value;
      saveSettings();
      renderPopup();
    });

    document.getElementById('setting-units').addEventListener('change', (e) => {
      settings.units = e.target.value;
      saveSettings();
      renderPopup();
    });

    document.getElementById('setting-humor').addEventListener('change', (e) => {
      settings.humorLevel = e.target.value;
      saveSettings();
      renderPopup();
    });

    document.getElementById('setting-theme').addEventListener('change', (e) => {
      settings.theme = e.target.value;
      saveSettings();
      renderPopup();
    });

    document.getElementById('setting-badges').addEventListener('change', (e) => {
      settings.showMessageBadges = Boolean(e.target.checked);
      saveSettings();
    });

    document.getElementById('setting-sound').addEventListener('change', (e) => {
      settings.soundEnabled = Boolean(e.target.checked);
      if (settings.soundEnabled) Bottle.playSoftSplashSound();
      saveSettings();
    });

    document.getElementById('popup-share-btn').addEventListener('click', () => {
      const scen = Estimator.normalizeScenarioId(settings.scenario);
      const coolType = settings.coolingType || 'evaporative';
      const baseCalc = getScenarioBaselineCalc(scen, coolType);
      const ratio = getScenarioScaleRatio(scen, coolType);

      const todayMl = Math.max((activeChat.chatMlTypical || 0) * ratio, (totals.todayMlTypical || 0) * ratio);
      const visual = Estimator.getBottleVisualState(todayMl, settings.bottleView, baseCalc.coolingSharePct);
      const friendly = Estimator.formatFriendlyWater(todayMl, settings.units);
      const comp = Comparisons.getComparisonForVolume(todayMl, settings.humorLevel);

      const canvas = Bottle.generateShareCardCanvas({
        friendlyHeadline: `${friendly.headline} today`,
        exactSubtext: friendly.compactSubtext,
        funnyLine: comp.text,
        fillPercent: visual.fillPercent,
        coolingSharePct: baseCalc.coolingSharePct,
        mood: 'happy'
      });

      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `ai-water-meter-${getTodayKey()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

    const resetBtn = document.getElementById('popup-reset-btn');
    const confirmRow = document.getElementById('reset-confirm-row');
    const confirmYes = document.getElementById('reset-confirm-yes');
    const confirmNo = document.getElementById('reset-confirm-no');

    resetBtn.addEventListener('click', () => {
      resetBtn.setAttribute('hidden', '');
      confirmRow.removeAttribute('hidden');
    });

    confirmNo.addEventListener('click', () => {
      confirmRow.setAttribute('hidden', '');
      resetBtn.removeAttribute('hidden');
    });

    confirmYes.addEventListener('click', () => {
      totals = {
        todayDate: getTodayKey(),
        todayMlTypical: 0,
        todayMessages: 0,
        allTimeMlTypical: 0,
        allTimeMessages: 0,
        chatsById: {}
      };
      activeChat = {
        chatId: 'none',
        chatMlTypical: 0,
        chatCoolingMl: 0,
        chatPowerplantMl: 0,
        chatTotalMl: 0,
        chatEnergyWh: 0,
        chatGpuSeconds: 0,
        chatKvCacheMb: 0,
        chatContextTokens: 0,
        chatMessages: 0
      };
      if (ext && ext.storage && ext.storage.local) {
        ext.storage.local.set({ aiwm_totals: totals, aiwm_active_chat: activeChat });
      }
      if (ext && ext.tabs && ext.tabs.query) {
        ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            try { ext.tabs.sendMessage(tabs[0].id, { type: 'AIWM_RESET_CHAT' }); } catch (_) {}
          }
        });
      }
      confirmRow.setAttribute('hidden', '');
      resetBtn.removeAttribute('hidden');
      renderPopup();
    });
  }

  async function init() {
    injectBottleAndIcons();
    await loadStorageData();
    await queryActiveTabChatStats();
    bindEvents();
    renderPopup();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
