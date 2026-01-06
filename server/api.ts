/**
 * Text Overlay API Server
 * Express server for processing Hindi/Tamil text overlays
 *
 * Run: npx ts-node server/api.ts
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  applyTextOverlayBase64,
  registerFonts,
  LBL_LAYOUTS,
  TextRegion,
  OverlayConfig
} from './textOverlayServer.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Register fonts on startup
const fontsDir = path.join(__dirname, '../fonts');
registerFonts(fontsDir);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'text-overlay-api' });
});

// Get available layouts
app.get('/api/layouts', (req, res) => {
  const layouts = Object.keys(LBL_LAYOUTS).map(id => ({
    id,
    name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    regionCount: LBL_LAYOUTS[id].length
  }));
  res.json({ layouts });
});

// Get layout details
app.get('/api/layouts/:layoutId', (req, res) => {
  const { layoutId } = req.params;
  const layout = LBL_LAYOUTS[layoutId];

  if (!layout) {
    return res.status(404).json({ error: 'Layout not found' });
  }

  res.json({ layoutId, regions: layout });
});

// Apply text overlay
app.post('/api/overlay', async (req, res) => {
  try {
    const {
      imageBase64,
      language = 'Hindi',
      layoutId,
      regions: customRegions,
      outputFormat = 'png',
      quality = 90
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    if (!['Hindi', 'Tamil', 'English'].includes(language)) {
      return res.status(400).json({ error: 'Invalid language. Use: Hindi, Tamil, or English' });
    }

    let regions: TextRegion[];

    if (customRegions && Array.isArray(customRegions)) {
      regions = customRegions;
    } else if (layoutId && LBL_LAYOUTS[layoutId]) {
      regions = LBL_LAYOUTS[layoutId];
    } else {
      regions = LBL_LAYOUTS['nebzmart-horizontal'];
    }

    const config: OverlayConfig = {
      language: language as 'Hindi' | 'Tamil' | 'English',
      regions,
      outputFormat: outputFormat as 'png' | 'jpeg',
      quality
    };

    const resultBase64 = await applyTextOverlayBase64(imageBase64, config);

    res.json({
      success: true,
      imageBase64: resultBase64,
      language,
      regionsApplied: regions.length
    });

  } catch (error) {
    console.error('Overlay error:', error);
    res.status(500).json({
      error: 'Failed to apply text overlay',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Translate text endpoint
app.post('/api/translate', (req, res) => {
  const { texts, language = 'Hindi' } = req.body;

  if (!texts || !Array.isArray(texts)) {
    return res.status(400).json({ error: 'texts array is required' });
  }

  const TRANSLATIONS: Record<string, Record<string, string>> = {
    Hindi: {
      'Quick onset of action within 5 mins': '5 मिनट में तेज़ असर',
      '12 hrs long lasting relief': '12 घंटे लंबे समय तक राहत',
      'Reduces exacerbations by 12%-15%': 'तीव्रता को 12%-15% तक कम करता है',
      'Improves lung function by 120 ml': 'फेफड़ों की क्षमता में 120 ml सुधार',
      'For the use of a Registered Medical Practitioner or a Hospital or a Laboratory only':
        'केवल पंजीकृत चिकित्सक या अस्पताल या प्रयोगशाला के उपयोग के लिए',
    },
    Tamil: {
      'Quick onset of action within 5 mins': '5 நிமிடங்களில் விரைவான செயல்',
      '12 hrs long lasting relief': '12 மணி நேரம் நீடித்த நிவாரணம்',
      'Reduces exacerbations by 12%-15%': 'தீவிரத்தை 12%-15% குறைக்கிறது',
      'Improves lung function by 120 ml': 'நுரையீரல் செயல்பாட்டை 120 ml மேம்படுத்துகிறது',
      'For the use of a Registered Medical Practitioner or a Hospital or a Laboratory only':
        'பதிவு செய்யப்பட்ட மருத்துவர் அல்லது மருத்துவமனை அல்லது ஆய்வகத்தின் பயன்பாட்டிற்கு மட்டும்',
    }
  };

  const langTranslations = TRANSLATIONS[language] || {};

  const translations = texts.map((text: string) => ({
    original: text,
    translated: langTranslations[text] || text,
    hasTranslation: !!langTranslations[text]
  }));

  res.json({ language, translations });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Text Overlay API running on http://localhost:${PORT}`);
  console.log(`\n📝 Endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   GET  /api/layouts - List available layouts`);
  console.log(`   GET  /api/layouts/:id - Get layout details`);
  console.log(`   POST /api/overlay - Apply text overlay`);
  console.log(`   POST /api/translate - Translate texts\n`);
});

export default app;
