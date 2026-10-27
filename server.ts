import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { runGeminiWasteAnalysis } from './src/services/geminiAnalysis.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 image uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Waste2Worth Intelligence API',
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    hasApiKey: Boolean(
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY
    ),
  });
});

// Real Gemini AI waste analysis endpoint
app.post('/api/waste/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, context } = req.body;
    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Image data or URL is required for AI waste analysis.' });
      return;
    }

    const result = await runGeminiWasteAnalysis(image, context);

    res.json({
      success: true,
      analysis: result.analysis,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error during Gemini waste analysis:', error);
    const errorMessage = error?.message || '';
    if (errorMessage.includes('quota') || errorMessage.includes('429')) {
      res.status(429).json({ error: 'Gemini AI rate limit reached. Please wait a moment and try again.' });
      return;
    }
    res.status(500).json({
      error: errorMessage || 'AI analysis could not be completed. Please try again.',
    });
  }
});

// Setup Vite middleware for development and static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Waste2Worth Server running on port ${PORT}`);
  });
}

startServer();
