import { Express } from "express";
import { settingsStorage } from "../services/settings-storage";
import { 
  insertCrmSettingSchema, insertSupportStaffSchema, insertAiKnowledgeSchema,
  insertOfferIncentiveSchema, insertManagerTaskSchema, insertAiTestResultSchema
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

// XAI Grok API Test Function
async function testXaiGrokApi(apiKey: string): Promise<any> {
  try {
    const startTime = Date.now();
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a test assistant. Respond briefly in Persian."
          },
          {
            role: "user", 
            content: "سلام! این یک تست ارتباط است."
          }
        ],
        model: "grok-beta",
        stream: false,
        temperature: 0.7
      })
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      model: "grok-beta",
      responseTime,
      response: data.choices?.[0]?.message?.content || "پاسخ دریافت شد",
      debugInfo: {
        requestPayload: {
          model: "grok-beta",
          temperature: 0.7,
          messagesCount: 2
        },
        responseHeaders: {
          'content-type': response.headers.get('content-type'),
          'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining')
        },
        networkLatency: responseTime
      }
    };
  } catch (error: any) {
    return {
      success: false,
      model: "grok-beta",
      responseTime: 0,
      response: "",
      error: error.message,
      debugInfo: {
        requestPayload: null,
        responseHeaders: null,
        networkLatency: 0
      }
    };
  }
}

// Encryption functions for API keys
function encryptApiKey(apiKey: string): string {
  try {
    const algorithm = 'aes-256-cbc';
    const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return apiKey; // Fallback to plain text in case of error
  }
}

function decryptApiKey(encryptedApiKey: string): string {
  try {
    const algorithm = 'aes-256-gcm';
    const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    
    const [ivHex, encrypted] = encryptedApiKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('خطا در رمزگشایی کلید API');
  }
}

export function registerSettingsRoutes(app: Express) {
  
  // CRM Authentication Middleware
  const crmAuthMiddleware = (req: any, res: any, next: any) => {
    if (req.session?.crmAuthenticated === true) {
      next();
    } else {
      res.status(401).json({ error: 'احراز هویت نشده - دسترسی غیرمجاز' });
    }
  };

  // ==================== CRM SETTINGS ROUTES ====================

  // Get all CRM settings by category
  app.get('/api/crm/settings/:category?', crmAuthMiddleware, async (req, res) => {
    try {
      const { category } = req.params;
      const settings = await settingsStorage.getCrmSettings(category);
      
      // Decrypt API keys for display (mask them)
      const maskedSettings = settings.map(setting => {
        if (setting.encryptedValue && setting.category === 'API_KEYS') {
          return {
            ...setting,
            value: '***' + setting.value?.slice(-4) || '****',
            encryptedValue: '[محفوظ]'
          };
        }
        return setting;
      });
      
      res.json({ success: true, data: maskedSettings });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create or update CRM setting
  app.post('/api/crm/settings', crmAuthMiddleware, async (req, res) => {
    try {
      const validatedData = insertCrmSettingSchema.parse(req.body);
      
      // Handle API key encryption
      if (validatedData.category === 'API_KEYS' && validatedData.value) {
        validatedData.encryptedValue = encryptApiKey(validatedData.value);
        // Keep last 4 characters for display
        validatedData.value = '***' + validatedData.value.slice(-4);
      }

      // Check if setting exists
      const existing = await settingsStorage.getCrmSetting(validatedData.key);
      let result;
      
      if (existing) {
        result = await settingsStorage.updateCrmSetting(validatedData.key, validatedData);
      } else {
        result = await settingsStorage.createCrmSetting(validatedData);
      }

      res.json({ success: true, data: result, message: 'تنظیم با موفقیت ذخیره شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Test xAI Grok API key
  app.post('/api/crm/settings/test-xai-api', crmAuthMiddleware, async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ success: false, error: 'کلید API الزامی است' });
      }

      console.log('Testing xAI Grok API...');
      const testResult = await testXaiGrokApi(apiKey);
      
      // Save test result to database
      await settingsStorage.createAiTestResult({
        testId: `xai-test-${Date.now()}`,
        testType: 'API_KEY_TEST',
        relatedEntityType: 'SETTING',
        testParameters: { apiKeyLength: apiKey.length },
        testCompleted: new Date(),
        testDuration: testResult.responseTime,
        testStatus: testResult.success ? 'SUCCESS' : 'FAILED',
        responseData: testResult,
        errorMessage: testResult.error,
        debugLogs: [
          {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: 'xAI Grok API test initiated',
            data: { responseTime: testResult.responseTime }
          }
        ],
        initiatedBy: 'CRM_MANAGER'
      });

      res.json(testResult);
    } catch (error: any) {
      console.error('xAI API test error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        debugInfo: {
          timestamp: new Date().toISOString(),
          errorType: 'INTERNAL_ERROR'
        }
      });
    }
  });

  // ==================== SUPPORT STAFF ROUTES ====================

  // Get all support staff
  app.get('/api/crm/settings/support-staff', crmAuthMiddleware, async (req, res) => {
    try {
      const staff = await settingsStorage.getSupportStaff();
      res.json({ success: true, data: staff });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create support staff
  app.post('/api/crm/settings/support-staff', crmAuthMiddleware, async (req, res) => {
    try {
      const validatedData = insertSupportStaffSchema.parse(req.body);
      const result = await settingsStorage.createSupportStaff(validatedData);
      res.json({ success: true, data: result, message: 'کارمند با موفقیت اضافه شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Update support staff
  app.put('/api/crm/settings/support-staff/:id', crmAuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSupportStaffSchema.partial().parse(req.body);
      const result = await settingsStorage.updateSupportStaff(parseInt(id), validatedData);
      res.json({ success: true, data: result, message: 'کارمند با موفقیت بروزرسانی شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ==================== AI KNOWLEDGE DATABASE ROUTES ====================

  // Get AI knowledge entries
  app.get('/api/crm/settings/ai-knowledge/:category?', crmAuthMiddleware, async (req, res) => {
    try {
      const { category } = req.params;
      const knowledge = await settingsStorage.getAiKnowledge(category);
      res.json({ success: true, data: knowledge });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create AI knowledge entry
  app.post('/api/crm/settings/ai-knowledge', crmAuthMiddleware, async (req, res) => {
    try {
      const validatedData = insertAiKnowledgeSchema.parse(req.body);
      const result = await settingsStorage.createAiKnowledge(validatedData);
      res.json({ success: true, data: result, message: 'دانش با موفقیت اضافه شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ==================== OFFERS & INCENTIVES ROUTES ====================

  // Get all offers
  app.get('/api/crm/settings/offers', crmAuthMiddleware, async (req, res) => {
    try {
      const offers = await settingsStorage.getOffers();
      res.json({ success: true, data: offers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create offer
  app.post('/api/crm/settings/offers', crmAuthMiddleware, async (req, res) => {
    try {
      const validatedData = insertOfferIncentiveSchema.parse(req.body);
      const result = await settingsStorage.createOffer(validatedData);
      res.json({ success: true, data: result, message: 'آفر با موفقیت اضافه شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // ==================== MANAGER WORKSPACE ROUTES ====================

  // Get manager tasks
  app.get('/api/crm/settings/manager-tasks/:status?', crmAuthMiddleware, async (req, res) => {
    try {
      const { status } = req.params;
      const tasks = await settingsStorage.getManagerTasks(status);
      res.json({ success: true, data: tasks });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create manager task
  app.post('/api/crm/settings/manager-tasks', crmAuthMiddleware, async (req, res) => {
    try {
      const validatedData = insertManagerTaskSchema.parse(req.body);
      validatedData.createdBy = 'CRM_MANAGER'; // Set from session
      const result = await settingsStorage.createManagerTask(validatedData);
      res.json({ success: true, data: result, message: 'وظیفه با موفقیت ایجاد شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Update manager task
  app.put('/api/crm/settings/manager-tasks/:taskId', crmAuthMiddleware, async (req, res) => {
    try {
      const { taskId } = req.params;
      const validatedData = insertManagerTaskSchema.partial().parse(req.body);
      const result = await settingsStorage.updateManagerTask(taskId, validatedData);
      res.json({ success: true, data: result, message: 'وظیفه با موفقیت بروزرسانی شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Delete manager task
  app.delete('/api/crm/settings/manager-tasks/:taskId', crmAuthMiddleware, async (req, res) => {
    try {
      const { taskId } = req.params;
      await settingsStorage.deleteManagerTask(taskId);
      res.json({ success: true, message: 'وظیفه با موفقیت حذف شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Get task executions
  app.get('/api/crm/settings/task-executions/:taskId?', crmAuthMiddleware, async (req, res) => {
    try {
      const { taskId } = req.params;
      const executions = await settingsStorage.getTaskExecutions(taskId);
      res.json({ success: true, data: executions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ==================== AI TEST RESULTS ROUTES ====================

  // Get AI test results
  app.get('/api/crm/settings/test-results/:testType?', crmAuthMiddleware, async (req, res) => {
    try {
      const { testType } = req.params;
      const { limit = 10 } = req.query;
      const results = await settingsStorage.getAiTestResults(testType);
      
      // Limit results for performance
      const limitedResults = results.slice(0, parseInt(limit as string));
      
      res.json({ success: true, data: limitedResults });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log('✅ Settings routes registered successfully');
}