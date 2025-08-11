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
        model: "grok-4",
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
      model: "grok-4",
      responseTime,
      response: data.choices?.[0]?.message?.content || "پاسخ دریافت شد",
      debugInfo: {
        requestPayload: {
          model: "grok-4",
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
      model: "grok-4",
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

// Encryption functions for API keys (AES-256-GCM)
function getEncKey(): Buffer {
  const secretKey = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
  return crypto.scryptSync(secretKey, 'salt', 32);
}

// Format: ivHex:cipherHex:tagHex
function encryptApiKey(apiKey: string): string {
  try {
    const key = getEncKey();
    const iv = crypto.randomBytes(12); // GCM recommended IV length
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    // Do not leak plaintext; return a sentinel
    return '';
  }
}

function decryptApiKey(payload: string): string {
  try {
    const [ivHex, dataHex, tagHex] = payload.split(':');
    if (!ivHex || !dataHex || !tagHex) throw new Error('Invalid payload');
    const key = getEncKey();
    const iv = Buffer.from(ivHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch (error) {
    throw new Error('خطا در رمزگشایی کلید API');
  }
}

export function registerSettingsRoutes(app: Express) {
  
  // CRM Authentication Middleware - Enhanced Cross-Panel Support
  const crmAuthMiddleware = (req: any, res: any, next: any) => {
    // Check multiple session authentication methods
    const isCrmAuthenticated = req.session?.crmAuthenticated === true || req.session?.crmUser;
    const isAdminAuthenticated = req.session?.authenticated === true && 
                                (req.session?.role === 'admin' || req.session?.role === 'ADMIN' || req.session?.role === 'SUPER_ADMIN');
    const isAuthenticated = isCrmAuthenticated || isAdminAuthenticated;
    
    console.log('🔧 Settings Auth Check:', {
      sessionId: req.sessionID,
      crmAuthenticated: req.session?.crmAuthenticated,
      crmUser: !!req.session?.crmUser,
      adminAuthenticated: req.session?.authenticated,
      adminRole: req.session?.role,
      finalAuth: isAuthenticated
    });
    
    if (isAuthenticated) {
      next();
    } else {
      res.status(401).json({ error: 'احراز هویت نشده - دسترسی غیرمجاز' });
    }
  };

  // Manager gate - requires session flag set by /api/crm/auth/manager-unlock
  const managerGate = (req: any, res: any, next: any) => {
    const unlocked = req.session?.crmManager === true;
    const exp = req.session?.crmManagerExpiry ? Number(req.session.crmManagerExpiry) : 0;
    if (!unlocked || !exp || Date.now() > exp) {
      req.session.crmManager = false;
      req.session.crmManagerExpiry = undefined;
      return res.status(403).json({ error: 'دسترسی مدیر تایید نشده' });
    }
    next();
  };

  // ==================== CRM SETTINGS ROUTES ====================

  // Get all CRM settings by category
  app.get('/api/crm/settings/:category?', crmAuthMiddleware, managerGate, async (req, res) => {
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
  app.post('/api/crm/settings', crmAuthMiddleware, managerGate, async (req, res) => {
    try {
      const validatedData = insertCrmSettingSchema.parse(req.body);
      
      // Handle API key encryption
      if (validatedData.category === 'API_KEYS' && validatedData.value) {
        const raw = validatedData.value;
        const enc = encryptApiKey(raw);
        if (!enc) {
          throw new Error('خطا در رمزگذاری کلید API');
        }
        validatedData.encryptedValue = enc;
        // Mask value: keep only last 4 chars
        validatedData.value = '***' + raw.slice(-4);
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
  app.post('/api/crm/settings/test-xai-api', crmAuthMiddleware, managerGate, async (req, res) => {
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
  app.get('/api/crm/settings/support-staff', crmAuthMiddleware, managerGate, async (req, res) => {
    try {
      const staff = await settingsStorage.getSupportStaff();
      res.json({ success: true, data: staff });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create support staff
  app.post('/api/crm/settings/support-staff', crmAuthMiddleware, managerGate, async (req, res) => {
    try {
      const validatedData = insertSupportStaffSchema.parse(req.body);
      const result = await settingsStorage.createSupportStaff(validatedData);
      res.json({ success: true, data: result, message: 'کارمند با موفقیت اضافه شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Update support staff
  app.put('/api/crm/settings/support-staff/:id', crmAuthMiddleware, managerGate, async (req, res) => {
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
  app.get('/api/crm/settings/ai-knowledge/:category?', crmAuthMiddleware, managerGate, async (req, res) => {
    try {
      const { category } = req.params;
      const knowledge = await settingsStorage.getAiKnowledge(category);
      res.json({ success: true, data: knowledge });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create AI knowledge entry
  app.post('/api/crm/settings/ai-knowledge', crmAuthMiddleware, managerGate, async (req, res) => {
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
  app.get('/api/crm/settings/offers', crmAuthMiddleware, managerGate, async (req, res) => {
    try {
      const offers = await settingsStorage.getOffers();
      res.json({ success: true, data: offers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create offer
  app.post('/api/crm/settings/offers', crmAuthMiddleware, managerGate, async (req, res) => {
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
  app.get('/api/crm/settings/manager-tasks/:status?', crmAuthMiddleware, managerGate, async (req, res) => {
    try {
      const { status } = req.params;
      const tasks = await settingsStorage.getManagerTasks(status);
      res.json({ success: true, data: tasks });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Create manager task
  app.post('/api/crm/settings/manager-tasks', crmAuthMiddleware, managerGate, async (req, res) => {
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
  app.put('/api/crm/settings/manager-tasks/:taskId', crmAuthMiddleware, managerGate, async (req, res) => {
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
  app.delete('/api/crm/settings/manager-tasks/:taskId', crmAuthMiddleware, managerGate, async (req, res) => {
    try {
      const { taskId } = req.params;
      await settingsStorage.deleteManagerTask(taskId);
      res.json({ success: true, message: 'وظیفه با موفقیت حذف شد' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Get task executions
  app.get('/api/crm/settings/task-executions/:taskId?', crmAuthMiddleware, managerGate, async (req, res) => {
    try {
      const { taskId } = req.params;
      const executions = await settingsStorage.getTaskExecutions(taskId);
      res.json({ success: true, data: executions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Test AI Performance with behavior configuration
  app.post('/api/crm/settings/test-ai-performance', crmAuthMiddleware, managerGate, async (req, res) => {
    try {
      const { apiKey, behaviorConfig, testScenario } = req.body;
      
      if (!apiKey || !testScenario) {
        return res.status(400).json({ 
          success: false, 
          error: 'کلید API و سناریو تست الزامی هستند' 
        });
      }

      const startTime = Date.now();
      
      // Build behavior-specific system prompt
      let systemPrompt = 'شما یک دستیار هوشمند مالی و CRM هستید که به فارسی پاسخ می‌دهید.';
      
      switch (behaviorConfig.communicationStyle) {
        case 'friendly':
          systemPrompt += ' لحن شما باید دوستانه و صمیمانه باشد.';
          break;
        case 'questioning':
          systemPrompt += ' سوالات تحلیلی بپرسید و عمق مسائل را بررسی کنید.';
          break;
        case 'strict':
          systemPrompt += ' رویکرد جدی و سخت‌گیرانه داشته باشید.';
          break;
        case 'educational':
          systemPrompt += ' نقش مربی داشته باشید و آموزش دهید.';
          break;
        default:
          systemPrompt += ' لحن محترمانه و حرفه‌ای داشته باشید.';
      }
      
      if (behaviorConfig.responseLength === 'short') {
        systemPrompt += ' پاسخ‌های کوتاه و مختصر بدهید.';
      } else if (behaviorConfig.responseLength === 'detailed') {
        systemPrompt += ' پاسخ‌های کامل و تفصیلی ارائه دهید.';
      }

      systemPrompt += ` سطح حساسیت فرهنگی شما ${(behaviorConfig.culturalSensitivity * 100).toFixed(0)}% است.`;

      // Prepare test request
      const testRequest = {
        model: "grok-4",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: `سناریو: ${testScenario.scenario}\n\nزمینه:\n${Object.entries(testScenario.context).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n\nلطفاً راهکار مناسب ارائه دهید.`
          }
        ],
        temperature: 0.7,
        max_tokens: behaviorConfig.responseLength === 'short' ? 200 : behaviorConfig.responseLength === 'detailed' ? 800 : 400
      };

      // Make API call to xAI Grok
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testRequest)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.text();
        console.error('xAI API Error:', errorData);
        
        // Save test result to database
        await settingsStorage.createAiTestResult({
          testId: `performance-test-${Date.now()}`,
          testType: 'AI_PERFORMANCE_TEST',
          testParameters: { behaviorConfig, testScenario },
          testCompleted: new Date(),
          testDuration: responseTime,
          testStatus: 'FAILED',
          errorMessage: `API Error: ${response.status} - ${errorData}`,
          initiatedBy: 'CRM_MANAGER'
        });

        return res.json({ 
          success: false, 
          error: `خطا در API (${response.status}): ${errorData}`,
          responseTime
        });
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        await settingsStorage.createAiTestResult({
          testId: `performance-test-${Date.now()}`,
          testType: 'AI_PERFORMANCE_TEST',
          testParameters: { behaviorConfig, testScenario },
          testCompleted: new Date(),
          testDuration: responseTime,
          testStatus: 'FAILED',
          errorMessage: 'پاسخ نامعتبر از API',
          initiatedBy: 'CRM_MANAGER'
        });

        return res.json({ 
          success: false, 
          error: 'پاسخ نامعتبر از API',
          responseTime
        });
      }

      const aiResponse = data.choices[0].message.content;
      
      // Simple analysis
      const analysis = {
        tone: behaviorConfig.communicationStyle === 'friendly' ? 'دوستانه' : 
              behaviorConfig.communicationStyle === 'strict' ? 'جدی' : 'مناسب',
        responseLength: aiResponse.length,
        hasPersonalization: aiResponse.includes('آقای محمدی') || aiResponse.includes('محمدی'),
        hasSolution: aiResponse.includes('راهکار') || aiResponse.includes('پیشنهاد') || aiResponse.includes('حل')
      };

      // Save successful test result
      await settingsStorage.createAiTestResult({
        testId: `performance-test-${Date.now()}`,
        testType: 'AI_PERFORMANCE_TEST',
        testParameters: { behaviorConfig, testScenario },
        testCompleted: new Date(),
        testDuration: responseTime,
        testStatus: 'SUCCESS',
        responseData: { response: aiResponse, analysis },
        initiatedBy: 'CRM_MANAGER'
      });

      res.json({ 
        success: true, 
        response: aiResponse,
        analysis,
        responseTime,
        quality: analysis.hasPersonalization && analysis.hasSolution ? 'عالی' : 'خوب'
      });

    } catch (error: any) {
      console.error('AI Performance test error:', error);
      
      await settingsStorage.createAiTestResult({
        testId: `performance-test-${Date.now()}`,
        testType: 'AI_PERFORMANCE_TEST',
        testParameters: req.body,
        testCompleted: new Date(),
        testDuration: 0,
        testStatus: 'ERROR',
        errorMessage: error.message,
        initiatedBy: 'CRM_MANAGER'
      });

      res.status(500).json({ 
        success: false, 
        error: 'خطا در تست عملکرد هوش مصنوعی' 
      });
    }
  });

  // ==================== AI TEST RESULTS ROUTES ====================

  // Get AI test results
  app.get('/api/crm/settings/test-results/:testType?', crmAuthMiddleware, managerGate, async (req, res) => {
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