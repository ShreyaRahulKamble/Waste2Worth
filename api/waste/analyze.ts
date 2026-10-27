import { runGeminiWasteAnalysis } from '../../src/services/geminiAnalysis.ts';

// Helper to parse JSON body across different serverless environments
async function getRequestBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Please send a POST request.' });
    return;
  }

  try {
    const body = await getRequestBody(req);
    const { image, context } = body;

    if (!image) {
      res.status(400).json({ error: 'Image data or URL is required for AI waste analysis.' });
      return;
    }

    const result = await runGeminiWasteAnalysis(image, context);

    res.status(200).json({
      success: true,
      analysis: result.analysis,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Vercel Gemini Analysis Error:', err);
    const message = err?.message || 'AI analysis could not be completed. Please try again.';
    const status = message.includes('quota') || message.includes('429') ? 429 : 500;
    res.status(status).json({ error: message });
  }
}
