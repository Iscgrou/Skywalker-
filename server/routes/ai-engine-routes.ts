// 🧠 AI ENGINE ROUTES - DA VINCI v6.0 Persian Cultural Intelligence
import { Router } from 'express';
import CrmAuthService from '../services/crm-auth-service';
import { persianAIEngine } from '../services/persian-ai-engine';
import { storage } from '../storage';

const router = Router();
const authMiddleware = CrmAuthService.createAuthMiddleware();

// Generate psychological profile for a representative
router.post('/profile/:representativeId', authMiddleware, async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);
    
    if (!representativeId) {
      return res.status(400).json({ 
        error: 'شناسه نماینده نامعتبر است' 
      });
    }

    // Get representative data
    const representatives = await storage.getRepresentatives();
    const representative = representatives.find(rep => rep.id === representativeId);
    
    if (!representative) {
      return res.status(404).json({ 
        error: 'نماینده یافت نشد' 
      });
    }

    // Generate psychological profile using AI
    const profile = await persianAIEngine.generatePsychologicalProfile(representative);
    
    res.json({
      representativeId,
      profile,
      generatedAt: new Date().toISOString(),
      aiVersion: 'DA VINCI v6.0'
    });

  } catch (error: any) {
    console.error('AI profile generation error:', error);
    res.status(500).json({ 
      error: 'خطا در تولید پروفایل روانشناختی',
      details: error.message 
    });
  }
});



// Get cultural insights for a representative
router.get('/insights/:representativeId', authMiddleware, async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);
    
    if (!representativeId) {
      return res.status(400).json({ 
        error: 'شناسه نماینده نامعتبر است' 
      });
    }

    // Get representative data
    const representatives = await storage.getRepresentatives();
    const representative = representatives.find(rep => rep.id === representativeId);
    
    if (!representative) {
      return res.status(404).json({ 
        error: 'نماینده یافت نشد' 
      });
    }

    // Generate cultural insights
    const insights = await persianAIEngine.generateCulturalInsights(representative);
    
    res.json({
      representativeId,
      insights,
      totalInsights: insights.length,
      averageConfidence: insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cultural insights error:', error);
    res.status(500).json({ 
      error: 'خطا در تولید بینش‌های فرهنگی',
      details: error.message 
    });
  }
});

// Analyze representative level
router.get('/analysis/:representativeId/level', authMiddleware, async (req, res) => {
  try {
    const representativeId = parseInt(req.params.representativeId);
    
    if (!representativeId) {
      return res.status(400).json({ 
        error: 'شناسه نماینده نامعتبر است' 
      });
    }

    // Analyze representative level using AI
    const analysis = await persianAIEngine.analyzeRepresentativeLevel(representativeId);
    
    res.json({
      representativeId,
      analysis,
      analyzedAt: new Date().toISOString(),
      aiVersion: 'DA VINCI v6.0'
    });

  } catch (error: any) {
    console.error('Level analysis error:', error);
    res.status(500).json({ 
      error: 'خطا در تحلیل سطح نماینده',
      details: error.message 
    });
  }
});





// AI Engine status and capabilities
router.get('/status', authMiddleware, async (req, res) => {
  try {
    res.json({
      aiEngine: 'DA VINCI v6.0 Persian Cultural Intelligence',
      version: '6.0.0',
      capabilities: [
        'psychological_profiling',
        'cultural_adaptation',
        'task_generation',
        'performance_analysis',
        'level_recommendation',
        'cultural_insights'
      ],
      languages: ['Persian/Farsi', 'English'],
      culturalContexts: ['Iranian Business Culture', 'Traditional Commerce', 'Modern CRM'],
      status: 'operational',
      lastUpdate: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('AI status error:', error);
    res.status(500).json({ 
      error: 'خطا در دریافت وضعیت موتور هوشمند' 
    });
  }
});

export default router;