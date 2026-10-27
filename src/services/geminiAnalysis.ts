import { GoogleGenAI, Type } from '@google/genai';
import type { StructuredAIAnalysis, BestActionType } from '../types/index.ts';

// Allowed circular economy actions
export const ALLOWED_ACTIONS = ['reuse', 'sell', 'donate', 'exchange', 'upcycle', 'recycle'] as const;

// Schema for structured Gemini output
export const wasteAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    objectName: {
      type: Type.STRING,
      description: 'Identified name of the object or waste item',
    },
    material: {
      type: Type.STRING,
      description: 'Primary material composition (e.g. Corrugated Cardboard, Polyethylene Terephthalate PET, Oak Wood, Denim Cotton, Aluminum)',
    },
    category: {
      type: Type.STRING,
      description: 'Waste category: Plastic, Paper, Cardboard, Glass, Metal, Wood, Textile, Electronics, Furniture, Organic, or Other',
    },
    condition: {
      type: Type.STRING,
      description: 'Observed condition: New / Unused, Good, Fair, Needs Repair, or Scrap / Raw Material',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score between 0.0 and 1.0 reflecting certainty of visual identification',
    },
    reusable: {
      type: Type.BOOLEAN,
      description: 'Whether the item can be reused directly or repurposed into another function',
    },
    bestAction: {
      type: Type.STRING,
      description: 'Recommended circular economy action: strictly one of: reuse, sell, donate, exchange, upcycle, recycle',
    },
    estimatedValue: {
      type: Type.OBJECT,
      properties: {
        min: {
          type: Type.NUMBER,
          description: 'Minimum estimated salvage or second-hand value in INR (integer or number)',
        },
        max: {
          type: Type.NUMBER,
          description: 'Maximum estimated salvage or second-hand value in INR (integer or number)',
        },
        currency: {
          type: Type.STRING,
          description: 'Currency code, must be "INR"',
        },
      },
      required: ['min', 'max', 'currency'],
    },
    reasoning: {
      type: Type.STRING,
      description: 'Visual reasoning explaining the identification, condition cues, and why this circular path is recommended. Express uncertainty if image is unclear.',
    },
    reuseIdeas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Immediate practical ideas for reusing this item without specialized tools or heavy processing',
    },
    diyIdeas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Creative DIY or upcycling project title' },
          difficulty: { type: Type.STRING, description: 'Beginner, Intermediate, or Advanced' },
          time: { type: Type.STRING, description: 'Estimated time to build (e.g. 20 mins, 1 hour)' },
          additionalCost: { type: Type.NUMBER, description: 'Estimated extra cost in INR for fasteners, glue, or paint (0 if none)' },
          materials: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Simple common household materials or tools needed',
          },
          steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Clear, practical step-by-step instructions to create the DIY item',
          },
        },
        required: ['title', 'difficulty', 'time', 'additionalCost', 'materials', 'steps'],
      },
      description: '2 to 3 creative DIY or upcycling projects',
    },
    safety: {
      type: Type.OBJECT,
      properties: {
        level: {
          type: Type.STRING,
          description: 'Safety risk assessment: Safe, Caution, or Hazardous',
        },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Specific physical or chemical hazards (e.g. sharp edges, battery leakage, broken glass, chemical residue, wiring)',
        },
        precautions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Protective precautions (e.g. wear heavy-duty gloves, mask, eye protection, ventilate area)',
        },
      },
      required: ['level', 'warnings', 'precautions'],
    },
    environmentalAdvice: {
      type: Type.STRING,
      description: 'Environmental impact analysis highlighting carbon footprint avoidance, landfill diversion, and sustainable end-of-life disposal',
    },
  },
  required: [
    'objectName',
    'material',
    'category',
    'condition',
    'confidence',
    'reusable',
    'bestAction',
    'estimatedValue',
    'reasoning',
    'reuseIdeas',
    'diyIdeas',
    'safety',
    'environmentalAdvice',
  ],
};

export interface WasteAnalysisContext {
  title?: string;
  category?: string;
  userNotes?: string;
}

export interface WasteAnalysisResult {
  analysis: StructuredAIAnalysis;
  modelUsed: string;
}

export async function runGeminiWasteAnalysis(
  image: string,
  context?: WasteAnalysisContext
): Promise<WasteAnalysisResult> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY in your deployment environment variables (e.g. Vercel Project Settings > Environment Variables).'
    );
  }

  if (!image || typeof image !== 'string') {
    throw new Error('Image data or URL is required for AI waste analysis.');
  }

  let mimeType = 'image/jpeg';
  let base64Data = '';

  // Handle base64 data URL
  if (image.startsWith('data:')) {
    const match = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Malformed base64 image data URL.');
    }
    mimeType = match[1].toLowerCase();
    base64Data = match[2];
  } else if (image.startsWith('http://') || image.startsWith('https://')) {
    try {
      const fetchRes = await fetch(image);
      if (!fetchRes.ok) {
        throw new Error(`Failed to fetch remote image from storage: ${fetchRes.statusText}`);
      }
      const contentType = fetchRes.headers.get('content-type');
      if (contentType) {
        mimeType = contentType.split(';')[0].toLowerCase();
      }
      const buffer = await fetchRes.arrayBuffer();
      base64Data = Buffer.from(buffer).toString('base64');
    } catch (err: any) {
      console.error('Failed to download image from URL:', err);
      throw new Error('Unable to retrieve image from provided URL: ' + (err.message || 'Network error'));
    }
  } else {
    throw new Error('Image must be a data URI or valid HTTP/HTTPS URL.');
  }

  // Format validation: JPEG, PNG, WEBP
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error(`Unsupported image format (${mimeType}). Please provide JPEG, PNG, or WEBP images.`);
  }

  // Initialize @google/genai client
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'waste2worth-build',
      },
    },
  });

  const userConfiguredModel = process.env.GEMINI_MODEL;
  const candidateModels = [
    ...(userConfiguredModel ? [userConfiguredModel, userConfiguredModel.replace(/^models\//, '')] : []),
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-3.1-flash-lite',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const promptText = `Analyze this actual photo of a waste, scrap, or surplus material for Waste2Worth, an AI-powered circular economy platform.
${context?.title ? `User noted title/hint: "${context.title}".` : ''}
${context?.category ? `User selected category: "${context.category}".` : ''}
${context?.userNotes ? `User remarks: "${context.userNotes}".` : ''}

CRITICAL INSTRUCTIONS:
1. Examine the image carefully. Identify ONLY what can reasonably and visually be inferred.
2. If the image is unclear, blurry, or ambiguous, reflect this in the confidence score (0.0 to 1.0) and explain your uncertainty in the reasoning.
3. Determine:
   - Specific object name
   - Material composition (e.g. Corrugated Cardboard, PET Plastic, Oak, Denim, Aluminum, Lithium-ion)
   - Category (Plastic, Paper, Cardboard, Glass, Metal, Wood, Textile, Electronics, Furniture, Organic, Other)
   - Condition (New / Unused, Good, Fair, Needs Repair, Scrap / Raw Material)
   - Whether it is reusable
   - Best action: MUST be strictly one of: reuse, sell, donate, exchange, upcycle, recycle
   - Estimated circular/salvage value range in INR (Indian Rupee, e.g. ₹5 to ₹30 for scrap, higher for working electronics or vintage furniture). Label it conservatively.
   - 2-4 practical reuse ideas
   - 2-3 creative DIY projects with title, difficulty, time, additionalCost (INR), materials, and clear steps
   - Safety assessment: If the item appears to contain batteries, electronics, wiring, chemicals, pressurized/unknown containers, broken glass, sharp metals, or bio-waste, CLEARLY flag it as "Caution" or "Hazardous" with precise warnings and safety precautions.
   - Environmental advice: benefits of keeping this item out of landfills.`;

  const requestPayload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: promptText,
          },
        ],
      },
    ],
    config: {
      systemInstruction:
        'You are Waste2Worth Intelligence, an expert circular economy, materials science, and waste upcycling AI. Analyze real scrap and waste materials accurately with a rigorous safety focus.',
      responseMimeType: 'application/json',
      responseSchema: wasteAnalysisSchema,
      temperature: 0.2,
    },
  };

  let response: any;
  let modelUsed = candidateModels[0] || 'gemini-flash-latest';
  let lastError: any = null;

  for (const targetModel of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model: targetModel,
        ...requestPayload,
      });
      modelUsed = targetModel;
      break;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  if (!response) {
    throw lastError || new Error('All Gemini model candidates were unavailable.');
  }

  const responseText = response.text;
  if (!responseText) {
    throw new Error('Empty response received from Gemini model.');
  }

  let parsedResult: any;
  try {
    parsedResult = JSON.parse(responseText);
  } catch (parseError) {
    console.error('Failed to parse Gemini JSON output:', responseText);
    throw new Error('Malformed AI response received from Gemini.');
  }

  // Normalize and validate bestAction
  let bestAction = (parsedResult.bestAction || 'recycle').toLowerCase().trim();
  if (!ALLOWED_ACTIONS.includes(bestAction as any)) {
    bestAction = 'recycle';
  }
  parsedResult.bestAction = bestAction as BestActionType;

  // Ensure confidence is between 0 and 1
  const rawConf = Number(parsedResult.confidence);
  parsedResult.confidence = isNaN(rawConf) ? 0.8 : Math.max(0, Math.min(1, rawConf));

  // Ensure currency is INR
  if (!parsedResult.estimatedValue || typeof parsedResult.estimatedValue !== 'object') {
    parsedResult.estimatedValue = { min: 0, max: 0, currency: 'INR' };
  } else {
    parsedResult.estimatedValue.currency = 'INR';
    parsedResult.estimatedValue.min = Math.max(0, Number(parsedResult.estimatedValue.min) || 0);
    parsedResult.estimatedValue.max = Math.max(
      parsedResult.estimatedValue.min,
      Number(parsedResult.estimatedValue.max) || parsedResult.estimatedValue.min
    );
  }

  return {
    analysis: parsedResult as StructuredAIAnalysis,
    modelUsed,
  };
}
