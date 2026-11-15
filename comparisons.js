/**
 * ============================================================================
 * AI WATER METER — HUMAN-SCALE COMPARISONS (3 HUMOR LEVELS)
 * ============================================================================
 * Natural, understated comparisons written in three distinct tones:
 *   - 'serious': Straightforward physical volume reference
 *   - 'funny':   Warm, conversational everyday perspective
 *   - 'silly':   Playful, lighthearted bottle commentary
 * ============================================================================
 */

(function (root) {
  'use strict';

  const VOLUME_BENCHMARKS = [
    {
      id: 'raindrop',
      name: 'a raindrop',
      volumeMl: 0.05,
      maxThresholdMl: 0.15,
      icon: '💧',
      templates: {
        serious: (count) => `Roughly ${count} raindrop${count === '1' ? '' : 's'} (0.05 ml each) of cooling water.`,
        funny: (count) => `Keeping these servers cool took about ${count} raindrop${count === '1' ? '' : 's'} (${count === '1' ? '0.05 ml' : '0.05 ml each'}).`,
        silly: (count) => `Just ${count} tiny raindrop${count === '1' ? '' : 's'}—the 1-liter bottle barely felt a mist.`
      }
    },
    {
      id: 'five_drops',
      name: 'five water drops',
      volumeMl: 0.25,
      maxThresholdMl: 0.65,
      icon: '💧',
      templates: {
        serious: (count) => `About ${count}× a five-drop benchmark (0.25 ml) of data-center water.`,
        funny: (count) => `A little more chatting, a little more cooling—about ${count} five-drop splash${count === '1' ? '' : 'es'} (0.25 ml).`,
        silly: (count) => `${count} five-drop splash${count === '1' ? '' : 'es'} (0.25 ml)—barely enough to water a bonsai leaf.`
      }
    },
    {
      id: 'eyedropper',
      name: 'a medicine dropper',
      volumeMl: 1.0,
      maxThresholdMl: 2.2,
      icon: '🧪',
      templates: {
        serious: (count) => `Equivalent to ${count} standard 1 ml dropper${count === '1' ? '' : 's'} (1/1,000th of a 1 L bottle).`,
        funny: (count) => `Keeping these servers cool took about ${count} eyedropper squeeze${count === '1' ? '' : 's'} (1 ml each).`,
        silly: (count) => `${count} lab-dropper squeeze${count === '1' ? '' : 's'} (1 ml)—only 999 ml left to fill the bottle.`
      }
    },
    {
      id: 'half_teaspoon',
      name: 'half a teaspoon',
      volumeMl: 2.5,
      maxThresholdMl: 4.2,
      icon: '🥄',
      templates: {
        serious: (count) => `Roughly ${count} half-teaspoon${count === '1' ? '' : 's'} (2.5 ml each).`,
        funny: (count) => `About ${count} half-teaspoon${count === '1' ? '' : 's'} (2.5 ml)—less than a splash of vanilla extract.`,
        silly: (count) => `${count} half-teaspoon${count === '1' ? '' : 's'} (2.5 ml)—a polite sip for a very small bird.`
      }
    },
    {
      id: 'teaspoon',
      name: 'a teaspoon',
      volumeMl: 5.0,
      maxThresholdMl: 12.0,
      icon: '🥄',
      templates: {
        serious: (count) => `Equivalent to ${count} kitchen teaspoon${count === '1' ? '' : 's'} (5 ml each).`,
        funny: (count) => `Keeping these servers cool took about ${count} teaspoon${count === '1' ? '' : 's'} of water (5 ml each).`,
        silly: (count) => `${count} teaspoon${count === '1' ? '' : 's'} (5 ml)—the bottom of the 1-liter bottle is officially damp.`
      }
    },
    {
      id: 'tablespoon',
      name: 'a tablespoon',
      volumeMl: 15.0,
      maxThresholdMl: 18.5,
      icon: '🥣',
      templates: {
        serious: (count) => `About ${count} tablespoon${count === '1' ? '' : 's'} (15 ml each).`,
        funny: (count) => `Your AI chat made the servers work up a ${count}-tablespoon sweat (15 ml).`,
        silly: (count) => `${count} soup-spoon splash${count === '1' ? '' : 'es'} (15 ml) to keep the server racks happy.`
      }
    },
    {
      id: 'sip',
      name: 'a human sip',
      volumeMl: 20.0,
      maxThresholdMl: 28.0,
      icon: '👄',
      templates: {
        serious: (count) => `Equivalent to ${count} average human sip${count === '1' ? '' : 's'} of water (20 ml per sip).`,
        funny: (count) => `Keeping these servers cool took about ${count} sip${count === '1' ? '' : 's'} of water (20 ml each).`,
        silly: (count) => `${count} human sip${count === '1' ? '' : 's'} (20 ml)—remember to take a sip from your own glass too.`
      }
    },
    {
      id: 'espresso',
      name: 'an espresso shot',
      volumeMl: 30.0,
      maxThresholdMl: 40.0,
      icon: '☕',
      templates: {
        serious: (count) => `Equals ${count} single espresso shot volume${count === '1' ? '' : 's'} (30 ml each).`,
        funny: (count) => `About ${count} espresso shot${count === '1' ? '' : 's'} of cooling water (30 ml)—minus the caffeine.`,
        silly: (count) => `${count} espresso cup${count === '1' ? '' : 's'} (30 ml) of pure server-chilling H₂O.`
      }
    },
    {
      id: 'shot_glass',
      name: 'a shot glass',
      volumeMl: 44.0,
      maxThresholdMl: 95.0,
      icon: '🥃',
      templates: {
        serious: (count) => `Equivalent to ${count} standard 44 ml shot glass${count === '1' ? '' : 'es'}.`,
        funny: (count) => `Your AI chat made the servers drink about ${count} shot glass${count === '1' ? '' : 'es'} of water (44 ml).`,
        silly: (count) => `${count} × 44 ml shot glass${count === '1' ? '' : 'es'}—the cooling loop is hydrating responsibly.`
      }
    },
    {
      id: 'juice_box',
      name: 'a small juice box',
      volumeMl: 125.0,
      maxThresholdMl: 185.0,
      icon: '🧃',
      templates: {
        serious: (count) => `Equals ${count} small 125 ml juice box${count === '1' ? '' : 'es'} (1/8th of a 1 L bottle).`,
        funny: (count) => `About ${count} small juice box${count === '1' ? '' : 'es'} of water (125 ml)—a noticeable rise in the bottle.`,
        silly: (count) => `${count} lunchbox juice pouch${count === '1' ? '' : 'es'} (125 ml) of server cooling.`
      }
    },
    {
      id: 'cup',
      name: 'a standard cup',
      volumeMl: 240.0,
      maxThresholdMl: 320.0,
      icon: '🥛',
      templates: {
        serious: (count) => `Equivalent to ${count} standard 240 ml cup${count === '1' ? '' : 's'} of water.`,
        funny: (count) => `Keeping these servers cool took about ${count} cup${count === '1' ? '' : 's'} of water (240 ml).`,
        silly: (count) => `${count} full cup${count === '1' ? '' : 's'} (240 ml)—enough to keep a desk fern thriving.`
      }
    },
    {
      id: 'soda_can',
      name: 'a 355 ml can',
      volumeMl: 355.0,
      maxThresholdMl: 450.0,
      icon: '🥫',
      templates: {
        serious: (count) => `Equals ${count} standard 355 ml beverage can${count === '1' ? '' : 's'}.`,
        funny: (count) => `About ${count} soda can${count === '1' ? '' : 's'} worth of water (355 ml) to cool the servers.`,
        silly: (count) => `${count} crisp 355 ml can${count === '1' ? '' : 's'} of data-center hydration.`
      }
    },
    {
      id: 'half_liter',
      name: 'a 500 ml bottle',
      volumeMl: 500.0,
      maxThresholdMl: 850.0,
      icon: '🧴',
      templates: {
        serious: (count) => `Equivalent to ${count} standard 500 ml bottle${count === '1' ? '' : 's'}.`,
        funny: (count) => `About ${count} half-liter bottle${count === '1' ? '' : 's'} (500 ml)—halfway up the 1-liter mark.`,
        silly: (count) => `${count} × 500 ml bottle${count === '1' ? '' : 's'}—our 1-liter bottle is past the halfway line.`
      }
    },
    {
      id: 'baby_blue_bottle',
      name: 'our 1 L bottle',
      volumeMl: 1000.0,
      maxThresholdMl: 1800.0,
      icon: '🍼',
      templates: {
        serious: (count) => `Equals ${count} full 1-liter bottle${count === '1' ? '' : 's'} (1,000 ml each).`,
        funny: (count) => `That's ${count} full 1-liter baby-blue bottle${count === '1' ? '' : 's'} (1,000 ml) of water.`,
        silly: (count) => `${count} entire 1-liter bottle${count === '1' ? '' : 's'} (1,000 ml)—a serious marathon conversation.`
      }
    },
    {
      id: 'goldfish_bowl',
      name: 'a 2 L fishbowl',
      volumeMl: 2000.0,
      maxThresholdMl: 7500.0,
      icon: '🐠',
      templates: {
        serious: (count) => `Equivalent to ${count} small 2-liter fishbowl${count === '1' ? '' : 's'} (2,000 ml).`,
        funny: (count) => `About ${count} small goldfish bowl${count === '1' ? '' : 's'} (2 L each) across your sessions.`,
        silly: (count) => `${count} × 2-liter fishbowl${count === '1' ? '' : 's'}—plenty of room for a plastic castle.`
      }
    },
    {
      id: 'mop_bucket',
      name: 'a 10 L bucket',
      volumeMl: 10000.0,
      maxThresholdMl: 35000.0,
      icon: '🪣',
      templates: {
        serious: (count) => `Equals ${count} 10-liter household bucket${count === '1' ? '' : 's'}.`,
        funny: (count) => `About ${count} full 10-liter bucket${count === '1' ? '' : 's'} of cooling and grid water.`,
        silly: (count) => `${count} × 10-liter bucket${count === '1' ? '' : 's'}—ten 1-liter bottles standing together.`
      }
    },
    {
      id: 'quick_shower',
      name: 'a 5-minute shower',
      volumeMl: 50000.0,
      maxThresholdMl: 110000.0,
      icon: '🚿',
      templates: {
        serious: (count) => `Equivalent to ${count} low-flow 5-minute shower${count === '1' ? '' : 's'} (~50 L).`,
        funny: (count) => `About ${count} five-minute shower${count === '1' ? '' : 's'} (50 L) of cumulative water.`,
        silly: (count) => `${count} five-minute shower${count === '1' ? '' : 's'} (50 L)—where the best prompt ideas happen.`
      }
    },
    {
      id: 'bathtub',
      name: 'a bathtub',
      volumeMl: 150000.0,
      maxThresholdMl: Infinity,
      icon: '🛁',
      templates: {
        serious: (count) => `Equivalent to ${count} standard 150-liter bathtub${count === '1' ? '' : 's'}.`,
        funny: (count) => `About ${count} full bathtub${count === '1' ? '' : 's'} (150 L) of cumulative AI water.`,
        silly: (count) => `${count} full 150-liter bathtub${count === '1' ? '' : 's'}—150 baby-blue bottles in a row.`
      }
    }
  ];

  function formatComparisonCount(ratio) {
    if (!Number.isFinite(ratio) || ratio <= 0) return '0';
    if (ratio < 0.1) return Number(ratio.toFixed(2)).toString();
    if (ratio < 10) {
      const rounded = Number(ratio.toFixed(1));
      return rounded === Math.floor(rounded) ? String(Math.floor(rounded)) : String(rounded);
    }
    return Math.round(ratio).toLocaleString('en-US');
  }

  function getComparisonForVolume(waterMl, humorLevel = 'funny') {
    const ml = Math.max(0, Number(waterMl) || 0);
    const level = ['serious', 'funny', 'silly'].includes(humorLevel) ? humorLevel : 'funny';

    if (ml === 0) {
      const zeroMessages = {
        serious: '0 ml estimated so far. Send a message to begin.',
        funny: 'A quiet server rack waiting for your first message.',
        silly: 'The 1-liter bottle is completely dry and ready for its first drop.'
      };
      return {
        id: 'empty',
        icon: '💧',
        name: 'zero drops',
        benchmarkMl: 0,
        count: '0',
        text: zeroMessages[level]
      };
    }

    let chosen = VOLUME_BENCHMARKS[0];
    for (let i = 0; i < VOLUME_BENCHMARKS.length; i++) {
      if (ml <= VOLUME_BENCHMARKS[i].maxThresholdMl) {
        chosen = VOLUME_BENCHMARKS[i];
        break;
      }
    }

    const ratio = ml / chosen.volumeMl;
    const countStr = formatComparisonCount(ratio);
    const templateFn = chosen.templates[level] || chosen.templates.funny;

    return {
      id: chosen.id,
      icon: chosen.icon,
      name: chosen.name,
      benchmarkMl: chosen.volumeMl,
      count: countStr,
      text: templateFn(countStr)
    };
  }

  const ComparisonsModule = {
    VOLUME_BENCHMARKS,
    formatComparisonCount,
    getComparisonForVolume
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComparisonsModule;
  }
  root.AIWaterMeterComparisons = ComparisonsModule;
})(typeof globalThis !== 'undefined' ? globalThis : window);
