/**
 * ============================================================================
 * AI WATER METER (HydroPrompt v3.0) — CONFIGURATION, SCENARIOS & ACHIEVEMENTS
 * ============================================================================
 * IMPORTANT FRAMING:
 * Entertainment and awareness tool, NOT a scientific meter. Every figure is
 * labeled a "rough estimate" using words like "about" and "roughly".
 *
 * CORE FORMULAS (Unchanged & Transparent):
 *   1. energy_Wh           = f(input_tokens, output_tokens, model_multiplier)
 *   2. cooling_water_ml    = energy_kWh * (onsite_WUE * cooling_type_factor) * 1000
 *   3. powerplant_water_ml = energy_kWh * (PUE * cooling_pue_adj) * offsite_intensity * 1000
 *   4. total_water_ml      = cooling_water_ml + powerplant_water_ml
 * ============================================================================
 */

(function (root) {
  'use strict';

  const AI_WATER_CONFIG = {
    EXTENSION_NAME: 'AI Water Meter',
    CODENAME: 'HydroPrompt',
    VERSION: '3.0.0',

    // Token & Conversation Context Growth Constants
    TOKEN_ESTIMATE: {
      CHARS_PER_TOKEN: 4,
      BASELINE_INPUT_TOKENS: 100,
      BASELINE_OUTPUT_TOKENS: 300,
      INPUT_TOKEN_WEIGHT: 0.20,
      BASELINE_EFFECTIVE_TOKENS: 320,
      MIN_TOKEN_SCALE: 0.25,
      MAX_TOKEN_SCALE: 25.0,
      LONG_CHAT_TOKEN_THRESHOLD: 600
    },

    // Model Detection Multipliers
    MODEL_MODES: {
      basic: {
        id: 'basic',
        label: 'Basic / Standard Direct Model',
        multiplier: 1.0,
        reason: 'Standard single-pass response generation (1.0× compute multiplier).'
      },
      thinking: {
        id: 'thinking',
        label: 'Thinking / Reasoning Model',
        multiplier: 4.5,
        reason: 'Reasoning model detected in UI: generates hidden internal chain-of-thought tokens before answering (4.5× compute multiplier).'
      }
    },

    /**
     * SIMPLE 3-OPTION SCENARIO SELECTOR (User-facing in v3.0)
     * Maps cleanly to the internal research scenarios:
     *   - 'official'  -> 'official_2025'  ("Official numbers" — Google & OpenAI reports)
     *   - 'realistic' -> 'realistic_full' ("Realistic" — default: server cooling + power plants)
     *   - 'scary'     -> 'viral_2023'     ("Scary numbers" — older 2023 study & hot climates)
     */
    SIMPLE_SCENARIOS: {
      official: {
        id: 'official',
        internalScenarioId: 'official_2025',
        label: 'Official numbers',
        shortDesc: 'What Google (~0.26 ml) and OpenAI (~0.32 ml) report for cooling servers only.'
      },
      realistic: {
        id: 'realistic',
        internalScenarioId: 'realistic_full',
        label: 'Realistic (Default)',
        shortDesc: 'Server cooling water plus the water power plants use to make the electricity (~1 ml/reply).'
      },
      scary: {
        id: 'scary',
        internalScenarioId: 'viral_2023',
        label: 'Scary numbers',
        shortDesc: 'Based on the viral 2023 study on older, hungrier AI models and hot-climate cooling towers (~17 ml/reply).'
      }
    },

    /**
     * INTERNAL 4 RESEARCH SCENARIOS (Explained in Nerd Mode > "Why numbers differ")
     */
    SCENARIOS: {
      official_2025: {
        id: 'official_2025',
        simpleId: 'official',
        label: 'Official reported (2025)',
        shortLabel: 'Official numbers',
        badge: 'Cooling Only (~0.26–0.32 ml)',
        friendlyExplain: 'Google and OpenAI measure only the water evaporated at their modern data centers to cool the servers (~5 drops per message).',
        baseEnergyWh: 0.28,
        onsiteWUE: 1.05,
        PUE: 1.12,
        offsiteWaterIntensity: 0.0
      },
      realistic_full: {
        id: 'realistic_full',
        simpleId: 'realistic',
        label: 'Realistic full footprint',
        shortLabel: 'Realistic',
        badge: 'Cooling + Power Grid (~1.0 ml)',
        friendlyExplain: 'Counts both data-center server cooling (~0.27 ml) AND the water power stations use to generate the electricity (~0.73 ml).',
        baseEnergyWh: 0.29,
        onsiteWUE: 0.92,
        PUE: 1.16,
        offsiteWaterIntensity: 2.18
      },
      hot_climate: {
        id: 'hot_climate',
        simpleId: 'scary',
        label: 'Hot-climate data center',
        shortLabel: 'Hot Climate',
        badge: 'Hot Desert Summer (~1.7 ml)',
        friendlyExplain: 'Data centers in hot, dry regions (like Arizona in summer) evaporate more than twice as much water to keep GPUs cool.',
        baseEnergyWh: 0.32,
        onsiteWUE: 2.15,
        PUE: 1.25,
        offsiteWaterIntensity: 2.55
      },
      viral_2023: {
        id: 'viral_2023',
        simpleId: 'scary',
        label: 'Viral study (2023, older models)',
        shortLabel: 'Scary numbers',
        badge: '2020 GPT-3 Era (~16.9 ml / reply)',
        friendlyExplain: 'The famous 2023 UC Riverside study ("a 500 ml bottle for 10 to 50 replies") modeled older 2020-era GPT-3 servers that used ~12× more electricity per reply.',
        baseEnergyWh: 4.00,
        onsiteWUE: 0.55,
        PUE: 1.17,
        offsiteWaterIntensity: 3.14
      }
    },

    PLATFORM_BASE_ENERGY_WH: {
      gemini: 0.24,
      chatgpt: 0.34,
      default: 0.29
    },

    COOLING_TYPES: {
      evaporative: {
        id: 'evaporative',
        label: 'Evaporative Cooling Towers (Standard)',
        shortLabel: 'Evaporative',
        wueMultiplier: 1.0,
        pueMultiplier: 1.0,
        description: 'Evaporates water in cooling towers to carry away server heat.'
      },
      mixed: {
        id: 'mixed',
        label: 'Mixed / Seasonal Hybrid Cooling',
        shortLabel: 'Mixed Fleet',
        wueMultiplier: 0.45,
        pueMultiplier: 1.02,
        description: 'Uses outside air most of the year and evaporates water only on hot days.'
      },
      closed_loop: {
        id: 'closed_loop',
        label: 'Closed-Loop Liquid Cooling (Near-Zero Water)',
        shortLabel: 'Closed-Loop (~0 water)',
        wueMultiplier: 0.02,
        pueMultiplier: 1.04,
        description: 'Recycles liquid coolant in a sealed loop with dry radiators, using almost zero water.'
      }
    },

    // Plain-English Tooltips for Technical Terms in Nerd Mode > "Servers"
    NERD_TOOLTIPS: {
      gpuSeconds: 'GPU-seconds: How many seconds one high-end AI chip worked just for you. Since one server handles ~32 people at once, your slice is usually around 1 second per reply.',
      gpuType: 'H100 GPU: An industrial AI graphics chip made by NVIDIA. A single chip can draw up to 700 Watts—as much power as a small microwave!',
      kvCache: 'Context Memory (KV Cache): The short-term working memory on the GPU that holds your conversation so far so the AI does not forget earlier messages.',
      serverHeat: 'Server Heat (Watt-hours): Almost 100% of the electricity used by computer chips turns directly into heat that must be carried away by the cooling system.',
      wueAndPue: 'Cooling & Power Efficiency: WUE measures how much cooling water a data center evaporates per unit of electricity; PUE measures extra facility overhead like fans and pumps.'
    },

    // Hardware & Server Telemetry Assumptions
    HARDWARE_ASSUMPTIONS: {
      gpuModelName: 'NVIDIA H100 SXM5 (80 GB HBM3)',
      gpuTdpWatts: 700,
      gpusPerServerNode: 8,
      nodeTotalWatts: 10200,
      gpuPowerShareOfIT: 0.72,
      typicalBatchConcurrency: 32,
      kvCacheMbPerToken: 0.32,
      baseActiveHbmGbPerUserSlice: 1.85,
      hostRamMbPerToken: 0.15,
      baseHostRamMbPerSlice: 420,
      joulesPerWh: 3600,
      btuPerWh: 3.41214,
      phoneChargerWatts: 20,
      ledBulbWatts: 10,
      gamingLaptopWatts: 180
    },

    // Milestone Moments (triggered as chat water crosses fun thresholds)
    MILESTONES: [
      { id: 'first_drop', thresholdMl: 0.15, icon: '💧', title: 'First Drop!', message: 'The servers just took their very first tiny sip of cooling water!' },
      { id: 'first_sip', thresholdMl: 20, icon: '👄', title: 'First Full Sip!', message: 'About 1 human sip (20 ml) of water used in this chat!' },
      { id: 'first_cup', thresholdMl: 240, icon: '🥛', title: 'One Full Cup!', message: 'This chat has used about a cup (240 ml) of water!' },
      { id: 'half_bottle', thresholdMl: 500, icon: '🍼', title: 'Half a Bottle!', message: 'Halfway to filling the 1-liter baby blue bottle!' },
      { id: 'full_bottle', thresholdMl: 1000, icon: '🎉', title: '1-Liter Bottle Filled!', message: 'Splash & confetti! You filled a whole 1-liter bottle!' }
    ],

    // Local Achievement Badges (stored as simple boolean flags in chrome.storage.local)
    ACHIEVEMENTS: [
      { id: 'first_drop', icon: '💧', name: 'First Drop', desc: 'Counted your very first AI reply.' },
      { id: 'first_sip', icon: '👄', name: 'Sip happens', desc: 'Used 1 human sip (20 ml) of water across your chats.' },
      { id: 'curious_mind', icon: '🤓', name: 'Curious Mind', desc: 'Opened Nerd Mode to peek inside the server racks.' },
      { id: 'marathon_chatter', icon: '🏃', name: 'Marathon Chatter', desc: 'Kept a single conversation going past 1,500 tokens.' },
      { id: 'chatty_fish', icon: '🐠', name: 'Chatty Fish', desc: 'Exchanged 50 AI replies in a single day.' },
      { id: 'bottle_filler', icon: '🏆', name: 'Bottle Filler', desc: 'Filled an entire 1-liter baby blue bottle (1,000 ml).' }
    ],

    BOTTLE: {
      STANDARD_CAPACITY_ML: 1000,
      VIEW_MODES: {
        zoom10: { id: 'zoom10', capacityMl: 10, label: 'Zoomed: this bottle = 10 ml', shortLabel: '10 ml Zoom' },
        zoom100: { id: 'zoom100', capacityMl: 100, label: 'Zoomed: this bottle = 100 ml', shortLabel: '100 ml Zoom' },
        true1000: { id: 'true1000', capacityMl: 1000, label: 'True scale: this bottle = 1 L (1,000 ml)', shortLabel: '1 L True Scale' }
      }
    },

    UNITS: {
      ML_PER_LITER: 1000,
      ML_PER_FL_OZ: 29.5735,
      ML_PER_GALLON: 3785.41,
      DROPS_PER_ML: 20,
      ML_PER_SIP: 20,
      ML_PER_CUP: 240
    },

    DEFAULT_SETTINGS: {
      units: 'liters',
      humorLevel: 'funny',
      scenario: 'realistic_full',          // Internal scenario ID ('official_2025' | 'realistic_full' | 'hot_climate' | 'viral_2023')
      coolingType: 'evaporative',          // Hidden inside Nerd Mode > Settings
      bottleView: 'zoom10',
      showMessageBadges: true,
      soundEnabled: false,                 // Optional soft splash sound (OFF by default)
      welcomeSeen: false,                  // First-run 3-card welcome shown once
      theme: 'auto',
      widgetCollapsed: false,
      widgetPosition: null
    },

    PALETTE: {
      coolingWaterDark: '#2B8CBE',
      coolingWaterMid: '#4FA8D8',
      powerplantWaterLight: '#A7D8F5',
      powerplantWaterPale: '#CEECF9',
      heatAmber: '#F59E0B',
      heatCoral: '#EF4444'
    }
  };

  // Backwards-compatible scenario aliases
  AI_WATER_CONFIG.SCENARIOS.low = AI_WATER_CONFIG.SCENARIOS.official_2025;
  AI_WATER_CONFIG.SCENARIOS.typical = AI_WATER_CONFIG.SCENARIOS.realistic_full;
  AI_WATER_CONFIG.SCENARIOS.high = AI_WATER_CONFIG.SCENARIOS.viral_2023;
  AI_WATER_CONFIG.SCENARIOS.official = AI_WATER_CONFIG.SCENARIOS.official_2025;
  AI_WATER_CONFIG.SCENARIOS.realistic = AI_WATER_CONFIG.SCENARIOS.realistic_full;
  AI_WATER_CONFIG.SCENARIOS.scary = AI_WATER_CONFIG.SCENARIOS.viral_2023;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI_WATER_CONFIG;
  }
  root.AIWaterMeterConfig = AI_WATER_CONFIG;
})(typeof globalThis !== 'undefined' ? globalThis : window);
