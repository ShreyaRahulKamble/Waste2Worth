import type {
  EnvironmentalImpact,
  WasteCategory,
  IntendedAction,
  WastePost,
  ResourceSavings,
} from '../types/index.ts';

/**
 * Standardized Circular Impact Category Keys
 */
export type NormalizedImpactCategory =
  | 'Plastic'
  | 'Paper/Cardboard'
  | 'Glass'
  | 'Metal'
  | 'Textile/Clothing'
  | 'Wood'
  | 'Electronics'
  | 'Organic'
  | 'Other';

/**
 * Baseline environmental factors per 1.0 kg of material diverted from landfill disposal.
 * NOTE: These are estimated environmental baseline factors grounded in circular economy
 * benchmarks (e.g., EPA WARM & DEFRA life-cycle baselines). They are ESTIMATES for educational
 * and circular awareness, not certified scientific lab measurements.
 */
export interface CategoryImpactFactors {
  category: NormalizedImpactCategory;
  defaultItemWeightKg: number;
  co2eAvoidedPerKg: number; // kg CO2e emissions avoided per kg diverted
  waterLitersPerKg?: number; // Liters of water saved per kg diverted
  energyKwhPerKg?: number; // kWh energy saved per kg diverted
  treesPerKg?: number; // Trees preserved per kg diverted (primarily paper/cardboard/timber)
  resourceHighlight: string;
  notes: string;
}

/**
 * Centralized Environmental Impact Factor Table
 * Keep here so factors can be transparently audited, calibrated, or updated.
 */
export const IMPACT_FACTORS_TABLE: Record<NormalizedImpactCategory, CategoryImpactFactors> = {
  Plastic: {
    category: 'Plastic',
    defaultItemWeightKg: 0.15, // ~3-4 empty PET bottles or 1 medium container
    co2eAvoidedPerKg: 2.1, // Avoids petroleum extraction & high-temp polymer refining
    waterLitersPerKg: 24, // Industrial polymer cooling & chemical processing water
    energyKwhPerKg: 5.8,
    resourceHighlight: 'Conserves petroleum feedstock and prevents non-biodegradable microplastic decay.',
    notes: 'Based on baseline PET/HDPE virgin resin replacement benchmarks.',
  },
  'Paper/Cardboard': {
    category: 'Paper/Cardboard',
    defaultItemWeightKg: 0.35, // Average shipping box or notebook stack
    co2eAvoidedPerKg: 1.3, // Avoids pulp processing & anaerobic landfill methane decomposition
    waterLitersPerKg: 26, // High water consumption in virgin wood pulp bleaching
    energyKwhPerKg: 4.1,
    treesPerKg: 0.017, // ~1 tree saved per 58 kg of recycled paper/cardboard
    resourceHighlight: 'Prevents forest deforestation and high-volume pulping water depletion.',
    notes: 'Derived from corrugated cardboard and mixed paper circular benchmarks.',
  },
  Glass: {
    category: 'Glass',
    defaultItemWeightKg: 0.40, // Standard glass jar or beverage bottle
    co2eAvoidedPerKg: 0.65, // Avoids ultra-high furnace temperatures (1500°C) for silica melting
    energyKwhPerKg: 1.2,
    resourceHighlight: 'Infinitely recyclable silica; saves furnace energy and prevents quarrying.',
    notes: 'Glass cullet vs virgin soda ash/silica sand melting requirements.',
  },
  Metal: {
    category: 'Metal',
    defaultItemWeightKg: 0.30, // Aluminum cans, steel parts, or scrap cookware
    co2eAvoidedPerKg: 4.8, // Bauxite/iron ore mining and smelting are exceptionally carbon-intensive
    waterLitersPerKg: 18,
    energyKwhPerKg: 14.0, // Up to 95% energy savings compared to primary aluminum/steel smelting
    resourceHighlight: 'Massive energy displacement vs virgin ore extraction and smelting.',
    notes: 'Weighted blend of aluminum (9.0 kg CO2e/kg) and light steel/scrap (2.0 kg CO2e/kg).',
  },
  'Textile/Clothing': {
    category: 'Textile/Clothing',
    defaultItemWeightKg: 0.45, // Average garment (t-shirt, trousers, or lightweight jacket)
    co2eAvoidedPerKg: 3.6, // Synthetic fiber production & agricultural cotton emissions
    waterLitersPerKg: 2700, // Enormous agricultural & dyeing water footprint of textiles
    energyKwhPerKg: 7.5,
    resourceHighlight: 'Saves thousands of liters of agricultural water and chemical dye runoff.',
    notes: 'Reflects high embedded water in cotton cultivation and polyester synthesis.',
  },
  Wood: {
    category: 'Wood',
    defaultItemWeightKg: 2.5, // Timber cutoff, wooden pallet segment, or furniture component
    co2eAvoidedPerKg: 1.8, // Carbon locked in wood biomass + logging energy avoided
    treesPerKg: 0.005,
    energyKwhPerKg: 2.2,
    resourceHighlight: 'Locks sequestered biogenic carbon and avoids raw timber harvesting.',
    notes: 'Wood maintains carbon storage when reused or upcycled instead of discarded.',
  },
  Electronics: {
    category: 'Electronics',
    defaultItemWeightKg: 0.75, // Cables, adapters, consumer gadgets, or PCB boards
    co2eAvoidedPerKg: 8.5, // Extremely high embodied energy in silicon, copper, and rare earths
    energyKwhPerKg: 16.5,
    waterLitersPerKg: 45,
    resourceHighlight: 'Preserves critical copper, rare earths, and high-energy microchips.',
    notes: 'High emissions avoided due to mineral purification and cleanroom semiconductor manufacturing.',
  },
  Organic: {
    category: 'Organic',
    defaultItemWeightKg: 0.50, // Kitchen peelings, food leftovers, garden cuttings
    co2eAvoidedPerKg: 0.85, // Direct prevention of anaerobic methane generation in municipal landfills
    resourceHighlight: 'Eliminates potent methane emissions caused by anaerobic landfill decomposition.',
    notes: 'Based on aerobic composting/vermicomposting vs anaerobic landfill gas release.',
  },
  Other: {
    category: 'Other',
    defaultItemWeightKg: 0.50,
    co2eAvoidedPerKg: 1.5,
    energyKwhPerKg: 3.0,
    resourceHighlight: 'Diverts solid municipal waste from local landfills and open dumping.',
    notes: 'Conservative mixed municipal solid waste default baseline.',
  },
};

/**
 * Circular Action Displacement Multipliers
 * Different actions yield different circular efficiencies:
 * - Reuse / Sell / Donate / Exchange: 100% displacement of new product manufacturing.
 * - Upcycle: 90% displacement (transforms high-utility parts, minor scrap byproduct).
 * - Recycle: 75% material recovery efficiency (accounting for collection & remelting energy).
 */
export const ACTION_MULTIPLIERS: Record<string, number> = {
  reuse: 1.0,
  sell: 1.0,
  donate: 1.0,
  exchange: 1.0,
  upcycle: 0.9,
  recycle: 0.75,
};

/**
 * Normalizes any category string or material string to one of the 9 supported impact categories.
 */
export function normalizeCategory(category?: string, material?: string): NormalizedImpactCategory {
  const cat = (category || '').trim().toLowerCase();
  const mat = (material || '').trim().toLowerCase();

  // 1. Direct Category Match
  if (cat.includes('plastic')) return 'Plastic';
  if (cat.includes('cardboard') || cat.includes('paper')) return 'Paper/Cardboard';
  if (cat.includes('glass')) return 'Glass';
  if (cat.includes('metal')) return 'Metal';
  if (cat.includes('textile') || cat.includes('clothing') || cat.includes('apparel')) return 'Textile/Clothing';
  if (cat.includes('electronic') || cat.includes('e-waste')) return 'Electronics';
  if (cat.includes('wood') || cat.includes('furniture')) return 'Wood';
  if (cat.includes('organic')) return 'Organic';

  // 2. Material-based or composite search (Electronics prioritized over component wires/copper)
  const text = `${cat} ${mat}`.toLowerCase();

  if (
    text.includes('electronic') ||
    text.includes('e-waste') ||
    text.includes('cable') ||
    text.includes('charger') ||
    text.includes('gadget') ||
    text.includes('circuit') ||
    text.includes('battery') ||
    text.includes('device') ||
    text.includes('appliance')
  ) {
    return 'Electronics';
  }
  if (text.includes('plastic') || text.includes('pet') || text.includes('hdpe') || text.includes('polymer')) {
    return 'Plastic';
  }
  if (
    text.includes('paper') ||
    text.includes('cardboard') ||
    text.includes('carton') ||
    text.includes('box') ||
    text.includes('kraft')
  ) {
    return 'Paper/Cardboard';
  }
  if (text.includes('glass') || text.includes('jar') || text.includes('silica')) {
    return 'Glass';
  }
  if (
    text.includes('metal') ||
    text.includes('aluminum') ||
    text.includes('steel') ||
    text.includes('iron') ||
    text.includes('copper') ||
    text.includes('tin') ||
    text.includes('wire') ||
    text.includes('can')
  ) {
    return 'Metal';
  }
  if (
    text.includes('textile') ||
    text.includes('cloth') ||
    text.includes('fabric') ||
    text.includes('cotton') ||
    text.includes('apparel') ||
    text.includes('shirt') ||
    text.includes('denim')
  ) {
    return 'Textile/Clothing';
  }
  if (text.includes('wood') || text.includes('furniture') || text.includes('timber') || text.includes('plywood')) {
    return 'Wood';
  }
  if (
    text.includes('organic') ||
    text.includes('food') ||
    text.includes('compost') ||
    text.includes('plant') ||
    text.includes('peel')
  ) {
    return 'Organic';
  }

  return 'Other';
}

/**
 * Normalizes action type and returns multiplier
 */
export function getActionMultiplier(actionType?: string): { normalizedAction: string; multiplier: number } {
  const norm = (actionType || 'reuse').trim().toLowerCase();
  const multiplier = ACTION_MULTIPLIERS[norm] ?? 1.0;
  return {
    normalizedAction: norm.charAt(0).toUpperCase() + norm.slice(1),
    multiplier,
  };
}

/**
 * Parses user quantity strings (e.g., "2.5 kg", "500g", "3 boxes", "1 piece")
 * into estimated weight in kg, with a safe category default fallback.
 */
export function parseEstimatedWeightKg(
  quantityStr: string | undefined,
  defaultItemWeightKg: number
): { weightKg: number; source: 'user_weight' | 'count_multiplier' | 'default_category_estimate' } {
  if (!quantityStr || !quantityStr.trim()) {
    return { weightKg: defaultItemWeightKg, source: 'default_category_estimate' };
  }

  const clean = quantityStr.trim().toLowerCase();

  // 1. Explicit kg: "2 kg", "1.5kg", "0.5 kilograms"
  const kgMatch = clean.match(/([\d.]+)\s*(?:kg|kilogram|kilos?)/);
  if (kgMatch && kgMatch[1]) {
    const val = parseFloat(kgMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 300) {
      return { weightKg: Math.round(val * 100) / 100, source: 'user_weight' };
    }
  }

  // 2. Explicit grams: "500 g", "350 grams"
  const gMatch = clean.match(/([\d.]+)\s*(?:g|gram|grams)\b/);
  if (gMatch && gMatch[1]) {
    const val = parseFloat(gMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { weightKg: Math.max(0.01, Math.round((val / 1000) * 100) / 100), source: 'user_weight' };
    }
  }

  // 3. Count / pieces / units: "3 items", "5 bottles", "2", "4 pcs"
  const countMatch = clean.match(/^(\d+)(?:\s*(?:items?|units?|pieces?|pcs?|bottles?|boxes?|sets?))?$/);
  if (countMatch && countMatch[1]) {
    const count = parseInt(countMatch[1], 10);
    if (!isNaN(count) && count > 0 && count <= 100) {
      const calcWeight = Math.round(count * defaultItemWeightKg * 100) / 100;
      return { weightKg: calcWeight, source: 'count_multiplier' };
    }
  }

  // Fallback to documented category default estimate
  return { weightKg: defaultItemWeightKg, source: 'default_category_estimate' };
}

/**
 * Primary Environmental Impact Calculation Engine
 * Estimates waste diverted, CO2e avoided, and critical resource savings.
 */
export function calculateEnvironmentalImpact(params: {
  category?: WasteCategory | string;
  material?: string;
  quantity?: string;
  actionType?: IntendedAction | string;
  title?: string;
  aiObjectName?: string;
}): EnvironmentalImpact {
  // 1. Identify category & factors
  const categoryNorm = normalizeCategory(params.category, params.material || params.aiObjectName);
  const factors = IMPACT_FACTORS_TABLE[categoryNorm];

  // 2. Determine action multiplier
  const { normalizedAction, multiplier: actionMultiplier } = getActionMultiplier(params.actionType);

  // 3. Calculate estimated weight
  const { weightKg, source: weightSource } = parseEstimatedWeightKg(
    params.quantity,
    factors.defaultItemWeightKg
  );

  // 4. Calculate waste diverted (kg)
  const wasteDivertedKg = Math.round(weightKg * 100) / 100;

  // 5. Calculate CO2e avoided (kg CO2e) = weight * factor * actionMultiplier
  const rawCo2e = weightKg * factors.co2eAvoidedPerKg * actionMultiplier;
  const co2eAvoidedKg = Math.max(0.01, Math.round(rawCo2e * 100) / 100);

  // 6. Calculate resource savings
  const resourceSavings: ResourceSavings = {};
  if (factors.waterLitersPerKg) {
    resourceSavings.waterLiters = Math.round(weightKg * factors.waterLitersPerKg * actionMultiplier);
  }
  if (factors.energyKwhPerKg) {
    resourceSavings.energyKwh = Math.round(weightKg * factors.energyKwhPerKg * actionMultiplier * 10) / 10;
  }
  if (factors.treesPerKg) {
    resourceSavings.treesSaved = Math.round(weightKg * factors.treesPerKg * actionMultiplier * 1000) / 1000;
  }
  resourceSavings.primaryHighlight = factors.resourceHighlight;

  // 7. Transparent calculation documentation
  let assumptionText = '';
  if (weightSource === 'user_weight') {
    assumptionText = `Derived from user-specified weight (${weightKg} kg) and ${categoryNorm} baseline factor (${factors.co2eAvoidedPerKg} kg CO₂e/kg) with ${normalizedAction} circular multiplier (${Math.round(actionMultiplier * 100)}%).`;
  } else if (weightSource === 'count_multiplier') {
    assumptionText = `Derived from item count multiplied by average unit weight (${factors.defaultItemWeightKg} kg/unit) for ${categoryNorm}, applying ${normalizedAction} circular factor (${Math.round(actionMultiplier * 100)}%).`;
  } else {
    assumptionText = `Based on category default estimate (${factors.defaultItemWeightKg} kg) for ${categoryNorm} with ${normalizedAction} circular factor (${Math.round(actionMultiplier * 100)}%). Weight not specified.`;
  }

  return {
    category: categoryNorm,
    material: params.material || categoryNorm,
    estimatedWeightKg: weightKg,
    wasteDivertedKg,
    co2eAvoidedKg,
    resourceSavings,
    actionType: normalizedAction,
    actionMultiplier,
    calculationMethod: 'Waste2Worth Centralized Category Lifecycle Estimation Model v1.0',
    assumption: assumptionText,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Checks if a post already has an up-to-date environmental impact object
 */
export function hasEnvironmentalImpact(post: Partial<WastePost>): boolean {
  return Boolean(
    post.environmentalImpact &&
      typeof post.environmentalImpact.co2eAvoidedKg === 'number' &&
      typeof post.environmentalImpact.wasteDivertedKg === 'number'
  );
}

/**
 * Returns a computed environmental impact for any post, computing in-memory if not already present.
 */
export function getOrComputePostImpact(post: Partial<WastePost>): EnvironmentalImpact {
  if (hasEnvironmentalImpact(post)) {
    return post.environmentalImpact!;
  }

  return calculateEnvironmentalImpact({
    category: post.category,
    material: post.material || post.aiAnalysis?.material,
    quantity: post.quantity,
    actionType: post.actionType || post.intendedAction || post.aiAnalysis?.bestAction,
    title: post.title,
    aiObjectName: post.aiAnalysis?.objectName,
  });
}
