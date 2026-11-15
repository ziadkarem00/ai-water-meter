/**
 * ============================================================================
 * AI WATER METER — ESTIMATION & PRESENTATION ENGINE
 * ============================================================================
 * NON-NEGOTIABLE INVARIANT:
 * All water estimation formulas, scientific constants, scenario calculations,
 * GPU/hardware assumptions, energy/cooling/power-plant calculations, model
 * multipliers, token estimation logic, and existing public interfaces remain
 * 100% preserved.
 * ============================================================================
 */

(function (root) {
  'use strict';

  const Config =
    (typeof module !== 'undefined' && module.exports && require('./config.js')) ||
    root.AIWaterMeterConfig;

  function normalizeScenarioId(scenarioId) {
    if (scenarioId === 'low' || scenarioId === 'official') return 'official_2025';
    if (scenarioId === 'typical' || scenarioId === 'realistic') return 'realistic_full';
    if (scenarioId === 'high' || scenarioId === 'scary') return 'viral_2023';
    if (Config.SCENARIOS[scenarioId]) return Config.SCENARIOS[scenarioId].id;
    return 'realistic_full';
  }

  function toSimpleScenarioId(scenarioId) {
    const norm = normalizeScenarioId(scenarioId);
    if (norm === 'official_2025') return 'official';
    if (norm === 'hot_climate' || norm === 'viral_2023') return 'scary';
    return 'realistic';
  }

  function estimateTokens(textOrChars) {
    const chars = typeof textOrChars === 'string'
      ? textOrChars.trim().length
      : Math.max(0, Number(textOrChars) || 0);
    if (chars === 0) return 0;
    return Math.max(1, Math.ceil(chars / Config.TOKEN_ESTIMATE.CHARS_PER_TOKEN));
  }

  function computeTokenScaling(inputTokens, outputTokens) {
    const inTok = Math.max(0, Number(inputTokens) || 0);
    const outTok = Math.max(0, Number(outputTokens) || 0);
    const T = Config.TOKEN_ESTIMATE;

    const effectiveTokens = outTok + inTok * T.INPUT_TOKEN_WEIGHT;
    const rawScale = 0.20 + 0.80 * (effectiveTokens / T.BASELINE_EFFECTIVE_TOKENS);
    const tokenScaleFactor = Math.min(
      T.MAX_TOKEN_SCALE,
      Math.max(T.MIN_TOKEN_SCALE, Number(rawScale.toFixed(4)))
    );

    const singleTurnEffective = outTok + T.BASELINE_INPUT_TOKENS * T.INPUT_TOKEN_WEIGHT;
    const singleTurnScale = Math.min(
      T.MAX_TOKEN_SCALE,
      Math.max(T.MIN_TOKEN_SCALE, 0.20 + 0.80 * (singleTurnEffective / T.BASELINE_EFFECTIVE_TOKENS))
    );

    const contextGrowthRatio = singleTurnScale > 0
      ? Number((tokenScaleFactor / singleTurnScale).toFixed(2))
      : 1.0;

    const isLongChat = inTok > T.LONG_CHAT_TOKEN_THRESHOLD;

    return {
      effectiveTokens: Number(effectiveTokens.toFixed(1)),
      tokenScaleFactor,
      singleTurnScaleFactor: Number(singleTurnScale.toFixed(4)),
      contextGrowthRatio,
      isLongChat
    };
  }

  function estimateHardwareAndHeat(energyWh, totalContextTokens) {
    const hw = Config.HARDWARE_ASSUMPTIONS;
    const wh = Math.max(0, Number(energyWh) || 0);
    const ctxTokens = Math.max(1, Number(totalContextTokens) || 0);

    const totalJoules = wh * hw.joulesPerWh;
    const gpuJoules = totalJoules * hw.gpuPowerShareOfIT;
    const gpuSeconds = gpuJoules / hw.gpuTdpWatts;
    const nodeSeconds = gpuSeconds / hw.gpusPerServerNode;

    const kvCacheMb = ctxTokens * hw.kvCacheMbPerToken;
    const activeWeightsSliceGb = hw.baseActiveHbmGbPerUserSlice;
    const totalHbmGb = activeWeightsSliceGb + kvCacheMb / 1024;
    const hostRamMb = hw.baseHostRamMbPerSlice + ctxTokens * hw.hostRamMbPerToken;

    const heatWh = wh;
    const heatJoules = totalJoules;
    const heatBtu = wh * hw.btuPerWh;

    const phoneChargerMinutes = (heatWh / hw.phoneChargerWatts) * 60;
    const ledBulbMinutes = (heatWh / hw.ledBulbWatts) * 60;

    return {
      gpuModelName: hw.gpuModelName,
      gpuTdpWatts: hw.gpuTdpWatts,
      gpusPerServerNode: hw.gpusPerServerNode,
      typicalBatchConcurrency: hw.typicalBatchConcurrency,
      gpuSeconds: Number(gpuSeconds.toFixed(3)),
      nodeSeconds: Number(nodeSeconds.toFixed(4)),
      kvCacheMb: Number(kvCacheMb.toFixed(2)),
      activeWeightsSliceGb: Number(activeWeightsSliceGb.toFixed(2)),
      totalHbmGb: Number(totalHbmGb.toFixed(3)),
      hostRamMb: Number(hostRamMb.toFixed(1)),
      heatWh: Number(heatWh.toFixed(4)),
      heatJoules: Math.round(heatJoules),
      heatBtu: Number(heatBtu.toFixed(3)),
      phoneChargerMinutes: Number(phoneChargerMinutes.toFixed(2)),
      ledBulbMinutes: Number(ledBulbMinutes.toFixed(2)),
      heatComparisonText: formatHeatComparison(heatWh, phoneChargerMinutes, ledBulbMinutes)
    };
  }

  function formatHeatComparison(heatWh, chargerMins, bulbMins) {
    if (heatWh <= 0) {
      return '0 Wh of server heat so far—the GPUs are cool as a cucumber.';
    }
    if (chargerMins < 1.0) {
      const chargerSecs = Math.max(1, Math.round(chargerMins * 60));
      return `As much heat as a 20W phone charger running for ${chargerSecs} second${chargerSecs === 1 ? '' : 's'} (~${Number(heatWh.toFixed(2))} Wh).`;
    }
    if (chargerMins < 60) {
      const mins = Number(chargerMins.toFixed(1));
      return `As much heat as a 20W phone charger running for ${mins} minute${mins === 1 ? '' : 's'} (or a 10W LED bulb for ${Number(bulbMins.toFixed(1))} mins).`;
    }
    const toasterMins = Number(((heatWh / 900) * 60).toFixed(1));
    return `Enough GPU heat (~${Number(heatWh.toFixed(1))} Wh) to run a 20W phone charger for ${Math.round(chargerMins)} mins—or a toaster for ${toasterMins} mins!`;
  }

  function calculateForScenario(params) {
    const {
      replyChars = 0,
      promptChars = 160,
      priorContextChars = 0,
      isReasoning = false,
      scenario = 'realistic_full',
      coolingType = 'evaporative',
      platform = 'default'
    } = params || {};

    const normScenarioId = normalizeScenarioId(scenario);
    const preset = Config.SCENARIOS[normScenarioId] || Config.SCENARIOS.realistic_full;
    const coolingCfg = Config.COOLING_TYPES[coolingType] || Config.COOLING_TYPES.evaporative;

    const replyTokens = estimateTokens(replyChars);
    const currentPromptTokens = estimateTokens(promptChars);
    const priorContextTokens = estimateTokens(priorContextChars);

    const cumulativeInputTokens = priorContextTokens + currentPromptTokens;
    const totalContextTokens = cumulativeInputTokens + replyTokens;

    const scaling = computeTokenScaling(cumulativeInputTokens, replyTokens);
    const modelMode = isReasoning ? Config.MODEL_MODES.thinking : Config.MODEL_MODES.basic;
    const modelMultiplier = modelMode.multiplier;

    let baseEnergyWh = preset.baseEnergyWh;
    if ((normScenarioId === 'official_2025' || normScenarioId === 'realistic_full') && platform === 'gemini') {
      baseEnergyWh = 0.24;
    } else if ((normScenarioId === 'official_2025' || normScenarioId === 'realistic_full') && platform === 'chatgpt') {
      baseEnergyWh = 0.32;
    }

    const combinedMultiplier = Number((scaling.tokenScaleFactor * modelMultiplier).toFixed(4));
    const energyWh = baseEnergyWh * combinedMultiplier;
    const energyKwh = energyWh / 1000;

    const effectiveOnsiteWUE = Number((preset.onsiteWUE * coolingCfg.wueMultiplier).toFixed(4));
    const effectivePUE = Number((preset.PUE * coolingCfg.pueMultiplier).toFixed(4));
    const offsiteWaterIntensity = preset.offsiteWaterIntensity;

    const coolingWaterMl = energyKwh * effectiveOnsiteWUE * 1000;
    const powerplantWaterMl = energyKwh * effectivePUE * offsiteWaterIntensity * 1000;
    const totalWaterMl = coolingWaterMl + powerplantWaterMl;

    const coolingSharePct = totalWaterMl > 0
      ? Number(((coolingWaterMl / totalWaterMl) * 100).toFixed(1))
      : 100;
    const powerplantSharePct = totalWaterMl > 0
      ? Number((100 - coolingSharePct).toFixed(1))
      : 0;

    const bottlesEquivalent = totalWaterMl / Config.BOTTLE.STANDARD_CAPACITY_ML;
    const hardware = estimateHardwareAndHeat(energyWh, totalContextTokens);

    return {
      scenario: preset.id,
      scenarioLabel: preset.label,
      scenarioShortLabel: preset.shortLabel,
      coolingType: coolingCfg.id,
      coolingTypeLabel: coolingCfg.label,
      replyChars: Math.max(0, Number(replyChars) || 0),
      promptChars: Math.max(0, Number(promptChars) || 0),
      priorContextChars: Math.max(0, Number(priorContextChars) || 0),
      replyTokens,
      promptTokens: currentPromptTokens,
      priorContextTokens,
      cumulativeInputTokens,
      totalContextTokens,
      effectiveTokens: scaling.effectiveTokens,
      lengthMultiplier: scaling.tokenScaleFactor,
      tokenScaleFactor: scaling.tokenScaleFactor,
      contextGrowthRatio: scaling.contextGrowthRatio,
      isLongChat: scaling.isLongChat,
      isLongPrompt: cumulativeInputTokens > Config.TOKEN_ESTIMATE.LONG_CHAT_TOKEN_THRESHOLD,
      isReasoning: Boolean(isReasoning),
      modelModeLabel: modelMode.label,
      modelModeReason: modelMode.reason,
      reasoningMultiplier: modelMultiplier,
      modelMultiplier,
      baseEnergyWh,
      combinedMultiplier,
      energyWh: Number(energyWh.toFixed(5)),
      energyKwh: Number(energyKwh.toFixed(8)),
      onsiteWUE: effectiveOnsiteWUE,
      rawOnsiteWUE: preset.onsiteWUE,
      PUE: effectivePUE,
      offsiteWaterIntensity,
      coolingWaterMl: Number(coolingWaterMl.toFixed(4)),
      powerplantWaterMl: Number(powerplantWaterMl.toFixed(4)),
      totalWaterMl: Number(totalWaterMl.toFixed(4)),
      onsiteWaterMl: Number(coolingWaterMl.toFixed(4)),
      offsiteWaterMl: Number(powerplantWaterMl.toFixed(4)),
      waterMl: Number(totalWaterMl.toFixed(4)),
      coolingSharePct,
      powerplantSharePct,
      bottlesEquivalent: Number(bottlesEquivalent.toFixed(7)),
      hardware
    };
  }

  function estimateMessageWater(params) {
    const activeScenario = normalizeScenarioId((params && params.scenario) || 'realistic_full');
    const coolingType = (params && params.coolingType) || 'evaporative';

    const official_2025 = calculateForScenario({ ...params, scenario: 'official_2025', coolingType });
    const realistic_full = calculateForScenario({ ...params, scenario: 'realistic_full', coolingType });
    const hot_climate = calculateForScenario({ ...params, scenario: 'hot_climate', coolingType });
    const viral_2023 = calculateForScenario({ ...params, scenario: 'viral_2023', coolingType });

    const byScenario = {
      official_2025,
      realistic_full,
      hot_climate,
      viral_2023,
      low: official_2025,
      typical: realistic_full,
      high: viral_2023,
      official: official_2025,
      realistic: realistic_full,
      scary: viral_2023
    };

    const selected = byScenario[activeScenario] || realistic_full;

    return {
      ...selected,
      range: {
        lowMl: official_2025.totalWaterMl,
        typicalMl: realistic_full.totalWaterMl,
        hotMl: hot_climate.totalWaterMl,
        highMl: viral_2023.totalWaterMl,
        officialMl: official_2025.totalWaterMl,
        realisticMl: realistic_full.totalWaterMl,
        viralMl: viral_2023.totalWaterMl
      },
      scenarios: byScenario
    };
  }

  function formatBottleCount(bottles) {
    const num = Number(bottles);
    if (!Number.isFinite(num) || num <= 0) return '0';
    if (num >= 10) return Math.round(num).toLocaleString('en-US');
    if (num >= 1) return Number(num.toFixed(1)).toString();
    if (num >= 0.1) return Number(num.toFixed(2)).toString();
    if (num >= 0.01) return Number(num.toFixed(3)).toString();
    if (num >= 0.0001) return Number(num.toFixed(4)).toString();
    if (num >= 0.00001) return Number(num.toFixed(5)).toString();
    return '<0.00001';
  }

  function formatWaterVolume(waterMl, units = 'liters') {
    const ml = Math.max(0, Number(waterMl) || 0);

    if (units === 'gallons') {
      if (ml >= Config.UNITS.ML_PER_GALLON) {
        const gal = ml / Config.UNITS.ML_PER_GALLON;
        const val = gal >= 10 ? gal.toFixed(1) : gal.toFixed(2);
        return { value: val, unit: 'gal', formatted: `${val} gal` };
      }
      const flOz = ml / Config.UNITS.ML_PER_FL_OZ;
      let val;
      if (flOz === 0) val = '0';
      else if (flOz < 0.01) val = flOz.toFixed(4);
      else if (flOz < 0.1) val = flOz.toFixed(3);
      else if (flOz < 10) val = flOz.toFixed(2);
      else val = flOz.toFixed(1);
      val = Number(val).toString();
      return { value: val, unit: 'fl oz', formatted: `${val} fl oz` };
    }

    if (ml >= Config.UNITS.ML_PER_LITER) {
      const liters = ml / Config.UNITS.ML_PER_LITER;
      const val = liters >= 10 ? Number(liters.toFixed(1)).toString() : Number(liters.toFixed(2)).toString();
      return { value: val, unit: 'L', formatted: `${val} L` };
    }

    let val;
    if (ml === 0) val = '0';
    else if (ml < 0.1) val = Number(ml.toFixed(3)).toString();
    else if (ml < 10) val = Number(ml.toFixed(2)).toString();
    else val = Number(ml.toFixed(1)).toString();

    return { value: val, unit: 'ml', formatted: `${val} ml` };
  }

  /**
   * Formats a 3-part water breakdown (Cooling, Power-plant, Total) for the
   * presentation layer so that the displayed total equals the sum of the two
   * displayed component values under uniform precision.
   *
   * @param {number} coolingMl
   * @param {number} powerplantMl
   * @param {'liters'|'gallons'} [units='liters']
   * @returns {{
   *   coolingFormatted: string,
   *   powerplantFormatted: string,
   *   totalFormatted: string,
   *   coolingDisplayNum: number,
   *   powerplantDisplayNum: number,
   *   totalDisplayNum: number,
   *   unit: string
   * }}
   */
  function formatBreakdownForDisplay(coolingMl, powerplantMl, units = 'liters') {
    const cMl = Math.max(0, Number(coolingMl) || 0);
    const pMl = Math.max(0, Number(powerplantMl) || 0);
    const tMl = cMl + pMl;

    if (units === 'gallons') {
      if (tMl >= Config.UNITS.ML_PER_GALLON) {
        const cGal = Number((cMl / Config.UNITS.ML_PER_GALLON).toFixed(2));
        const pGal = Number((pMl / Config.UNITS.ML_PER_GALLON).toFixed(2));
        const tGal = Number((cGal + pGal).toFixed(2));
        return {
          coolingFormatted: `${cGal} gal`,
          powerplantFormatted: `${pGal} gal`,
          totalFormatted: `${tGal} gal`,
          coolingDisplayNum: cGal,
          powerplantDisplayNum: pGal,
          totalDisplayNum: tGal,
          unit: 'gal'
        };
      }
      const decimals = tMl / Config.UNITS.ML_PER_FL_OZ < 0.1 ? 3 : 2;
      const cOz = Number((cMl / Config.UNITS.ML_PER_FL_OZ).toFixed(decimals));
      const pOz = Number((pMl / Config.UNITS.ML_PER_FL_OZ).toFixed(decimals));
      const tOz = Number((cOz + pOz).toFixed(decimals));
      return {
        coolingFormatted: `${cOz} fl oz`,
        powerplantFormatted: `${pOz} fl oz`,
        totalFormatted: `${tOz} fl oz`,
        coolingDisplayNum: cOz,
        powerplantDisplayNum: pOz,
        totalDisplayNum: tOz,
        unit: 'fl oz'
      };
    }

    if (tMl >= Config.UNITS.ML_PER_LITER) {
      const cL = Number((cMl / Config.UNITS.ML_PER_LITER).toFixed(2));
      const pL = Number((pMl / Config.UNITS.ML_PER_LITER).toFixed(2));
      const tL = Number((cL + pL).toFixed(2));
      return {
        coolingFormatted: `${cL} L`,
        powerplantFormatted: `${pL} L`,
        totalFormatted: `${tL} L`,
        coolingDisplayNum: cL,
        powerplantDisplayNum: pL,
        totalDisplayNum: tL,
        unit: 'L'
      };
    }

    const decimals = tMl === 0 ? 0 : (tMl < 0.1 ? 3 : (tMl < 10 ? 2 : 1));
    const cVal = Number(cMl.toFixed(decimals));
    const pVal = Number(pMl.toFixed(decimals));
    const tVal = Number((cVal + pVal).toFixed(decimals));
    return {
      coolingFormatted: `${cVal} ml`,
      powerplantFormatted: `${pVal} ml`,
      totalFormatted: `${tVal} ml`,
      coolingDisplayNum: cVal,
      powerplantDisplayNum: pVal,
      totalDisplayNum: tVal,
      unit: 'ml'
    };
  }

  function formatFriendlyWater(waterMl, units = 'liters') {
    const ml = Math.max(0, Number(waterMl) || 0);
    const exactVol = formatWaterVolume(ml, units).formatted;
    const exactSubtext = `${exactVol} (rough estimate)`;
    const compactSubtext = `${exactVol} · rough estimate`;

    let headline = '0 drops';

    if (ml <= 0) {
      headline = '0 drops';
    } else if (ml < 2.5) {
      const drops = Math.max(1, Math.round(ml / 0.05));
      headline = drops === 1 ? 'About 1 drop' : `About ${drops} drops`;
    } else if (ml < 7.5) {
      headline = 'About half a sip';
    } else if (ml < 95) {
      let sips;
      if (ml < 17) sips = 1;
      else if (ml < 25) sips = 2;
      else if (ml <= 68) sips = 3;
      else sips = 4;
      headline = sips === 1 ? 'About 1 sip' : `About ${sips} sips`;
    } else if (ml < 180) {
      headline = 'About half a cup';
    } else if (ml < 330) {
      headline = 'About 1 cup';
    } else if (ml < 440) {
      headline = 'About 1.5 cups';
    } else if (ml < 620) {
      headline = 'About half a bottle';
    } else if (ml < 850) {
      headline = 'About 3 cups';
    } else if (ml < 1400) {
      headline = 'About 1 bottle';
    } else if (ml < 10000) {
      const bottles = Number((ml / 1000).toFixed(1));
      const cleanBottles = bottles === Math.floor(bottles) ? Math.floor(bottles) : bottles;
      headline = `About ${cleanBottles} bottles`;
    } else {
      const manyBottles = Math.round(ml / 1000).toLocaleString('en-US');
      headline = `About ${manyBottles} bottles`;
    }

    const phraseLower = headline.charAt(0).toLowerCase() + headline.slice(1);
    const amountOnly = headline.replace(/^About\s+/i, '');

    return {
      headline,
      phraseLower,
      amountOnly,
      exactSubtext,
      compactSubtext,
      replyLine: `This reply: about ${exactVol} · ${headline}`,
      shortFunLine:
        ml <= 0
          ? 'A quiet server rack waiting for your first message.'
          : `Cooling the AI's servers for this chat took ${phraseLower} of water.`
    };
  }

  function formatCompactBadgeVolume(waterMl, units = 'liters') {
    const ml = Math.max(0, Number(waterMl) || 0);
    if (units === 'gallons') {
      return formatWaterVolume(ml, 'gallons').formatted;
    }
    if (ml >= 1000) {
      return `${Number((ml / 1000).toFixed(1))} L`;
    }
    if (ml >= 1.5) {
      return `${Math.round(ml)} ml`;
    }
    if (ml >= 0.1) {
      return `${Number(ml.toFixed(1))} ml`;
    }
    if (ml > 0) {
      return `${Number(ml.toFixed(2))} ml`;
    }
    return '0 ml';
  }

  function getMascotMood(chatWaterMl, isLongChat = false, celebrating = false) {
    if (celebrating) return 'celebrating';
    if (isLongChat || Number(chatWaterMl) >= 25) return 'sweating';
    if (Number(chatWaterMl) > 0.4) return 'happy';
    return 'sleepy';
  }

  function calculateMessagesPerBottle(totalChatMl, messageCount, scenario = 'realistic_full', coolingType = 'evaporative') {
    const count = Math.max(0, Number(messageCount) || 0);
    const total = Math.max(0, Number(totalChatMl) || 0);

    let avgMl;
    if (count > 0 && total > 0) {
      avgMl = total / count;
    } else {
      const baseline = calculateForScenario({
        replyChars: 1200,
        promptChars: 160,
        priorContextChars: 0,
        isReasoning: false,
        scenario,
        coolingType
      });
      avgMl = baseline.totalWaterMl;
    }

    const rawMessages = Config.BOTTLE.STANDARD_CAPACITY_ML / Math.max(0.0001, avgMl);
    let roundedMessages;
    if (rawMessages >= 1000) {
      roundedMessages = Math.round(rawMessages / 50) * 50;
    } else if (rawMessages >= 100) {
      roundedMessages = Math.round(rawMessages / 10) * 10;
    } else {
      roundedMessages = Math.max(1, Math.round(rawMessages));
    }

    const formattedCount = roundedMessages.toLocaleString('en-US');
    return {
      messagesPerBottle: roundedMessages,
      avgMlPerMessage: Number(avgMl.toFixed(3)),
      formattedText: `1 bottle ≈ ${formattedCount} messages (at this chat's pace)`
    };
  }

  function getBottleVisualState(totalWaterMl, viewMode = 'zoom10', coolingSharePct = 50) {
    const ml = Math.max(0, Number(totalWaterMl) || 0);
    const modeInfo = Config.BOTTLE.VIEW_MODES[viewMode] || Config.BOTTLE.VIEW_MODES.zoom10;
    const capacityMl = modeInfo.capacityMl;

    const completedViewBottles = Math.floor(ml / capacityMl);
    const currentBottleMl = ml % capacityMl;
    const fillPercent = ml === 0
      ? 0
      : Math.min(100, Math.max(1.5, Number(((currentBottleMl / capacityMl) * 100).toFixed(1))));

    const clampedCoolingShare = Math.max(0, Math.min(100, Number(coolingSharePct) || 0));
    const coolingFillPercent = Number(((fillPercent * clampedCoolingShare) / 100).toFixed(1));
    const powerplantFillPercent = Number((fillPercent - coolingFillPercent).toFixed(1));

    const true1LBottlesExact = ml / Config.BOTTLE.STANDARD_CAPACITY_ML;

    return {
      fillPercent,
      coolingFillPercent,
      powerplantFillPercent,
      coolingSharePct: clampedCoolingShare,
      powerplantSharePct: Number((100 - clampedCoolingShare).toFixed(1)),
      completedViewBottles,
      true1LBottlesExact,
      true1LBottlesFormatted: formatBottleCount(true1LBottlesExact),
      capacityMl,
      currentBottleMl: Number(currentBottleMl.toFixed(2)),
      modeInfo
    };
  }

  const EstimatorModule = {
    normalizeScenarioId,
    toSimpleScenarioId,
    estimateTokens,
    computeTokenScaling,
    estimateHardwareAndHeat,
    formatHeatComparison,
    calculateForScenario,
    estimateMessageWater,
    formatBottleCount,
    formatWaterVolume,
    formatBreakdownForDisplay,
    formatFriendlyWater,
    formatCompactBadgeVolume,
    getMascotMood,
    calculateMessagesPerBottle,
    getBottleVisualState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EstimatorModule;
  }
  root.AIWaterMeterEstimator = EstimatorModule;
})(typeof globalThis !== 'undefined' ? globalThis : window);
