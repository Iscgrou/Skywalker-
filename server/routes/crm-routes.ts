// 🌐 CRM API ROUTES - Complete endpoints for CRM panel
import { Router } from 'express';
import { crmService } from '../services/crm-service';
import { crmAuthService } from '../services/crm-auth-service';
import { crmDataSyncService } from '../services/crm-data-sync';
import { persianAIEngine } from '../services/persian-ai-engine';

const router = Router();

// Authentication middleware for CRM routes
async function requireCrmAuth(req: any, res: any, next: any) {
  try {
    const sessionId = req.session?.crmSessionId;
    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = await crmAuthService.validateSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.crmSession = session;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
}

// ==================== AUTHENTICATION ====================

// CRM Login
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const session = await crmAuthService.authenticateUser(username, password);
    if (!session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.crmSessionId = session.sessionId;
    req.session.userRole = session.role;
    
    res.json({
      success: true,
      user: {
        username: session.username,
        role: session.role,
        panelType: session.panelType
      },
      session: {
        sessionId: session.sessionId,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error('CRM login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// CRM Logout
router.post('/auth/logout', requireCrmAuth, async (req, res) => {
  try {
    await crmAuthService.logout(req.crmSession.sessionId);
    req.session.destroy(() => {
      res.json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user info
router.get('/auth/user', requireCrmAuth, async (req, res) => {
  try {
    res.json({
      username: req.crmSession.username,
      role: req.crmSession.role,
      panelType: req.crmSession.panelType,
      permissions: req.crmSession.permissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// ==================== DASHBOARD ====================

// Get CRM dashboard data
router.get('/dashboard', requireCrmAuth, async (req, res) => {
  try {
    const dashboardData = await crmService.getCrmDashboard();
    
    // Filter data based on user role
    const filteredData = await crmAuthService.filterSensitiveData(
      req.crmSession.sessionId,
      'dashboard',
      dashboardData
    );
    
    res.json(filteredData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ==================== REPRESENTATIVES ====================

// Get representatives (filtered for CRM)
router.get('/representatives', requireCrmAuth, async (req, res) => {
  try {
    const representatives = await crmDataSyncService.syncRepresentativesForCrm();
    
    // Apply additional filtering based on session
    const filteredData = await crmAuthService.filterSensitiveData(
      req.crmSession.sessionId,
      'representatives',
      representatives
    );
    
    res.json(filteredData);
  } catch (error) {
    console.error('Representatives fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch representatives' });
  }
});

// Get single representative profile
router.get('/representatives/:id', requireCrmAuth, async (req, res) => {
  try {
    const repId = parseInt(req.params.id);
    const representatives = await crmDataSyncService.syncRepresentativesForCrm();
    const representative = representatives.find(r => r.representativeId === repId);
    
    if (!representative) {
      return res.status(404).json({ error: 'Representative not found' });
    }

    // Get additional CRM data
    const level = await crmService.getRepresentativeLevel(repId);
    const performance = await crmService.getRepresentativePerformance(repId);
    const aiRecommendations = await crmService.getAIRecommendations(repId);

    const profile = {
      ...representative,
      level,
      performance,
      aiRecommendations
    };

    const filteredProfile = await crmAuthService.filterSensitiveData(
      req.crmSession.sessionId,
      'representative_profile',
      profile
    );

    res.json(filteredProfile);
  } catch (error) {
    console.error('Representative profile error:', error);
    res.status(500).json({ error: 'Failed to fetch representative profile' });
  }
});

// Update representative level
router.put('/representatives/:id/level', requireCrmAuth, async (req, res) => {
  try {
    const repId = parseInt(req.params.id);
    const { newLevel, reason } = req.body;

    // Validate access
    const hasAccess = await crmAuthService.validateAccess(
      req.crmSession.sessionId,
      'representative_levels',
      'UPDATE'
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await crmService.updateRepresentativeLevel(repId, newLevel, reason);
    
    res.json({ success: true, message: 'Representative level updated' });
  } catch (error) {
    console.error('Level update error:', error);
    res.status(500).json({ error: 'Failed to update representative level' });
  }
});

// ==================== TASKS ====================

// Get tasks for representative
router.get('/representatives/:id/tasks', requireCrmAuth, async (req, res) => {
  try {
    const repId = parseInt(req.params.id);
    
    // This would fetch from actual database
    const tasks = []; // Placeholder
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Generate new task for representative
router.post('/representatives/:id/tasks/generate', requireCrmAuth, async (req, res) => {
  try {
    const repId = parseInt(req.params.id);
    
    const hasAccess = await crmAuthService.validateAccess(
      req.crmSession.sessionId,
      'crm_tasks',
      'CREATE'
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const task = await crmService.generateTaskForRepresentative(repId);
    
    res.json({
      success: true,
      task,
      message: 'Task generated successfully'
    });
  } catch (error) {
    console.error('Task generation error:', error);
    res.status(500).json({ error: 'Failed to generate task' });
  }
});

// Submit task result
router.post('/tasks/:taskId/results', requireCrmAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const resultData = req.body;

    const hasAccess = await crmAuthService.validateAccess(
      req.crmSession.sessionId,
      'crm_task_results',
      'CREATE'
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await crmService.submitTaskResult(taskId, resultData);
    
    res.json({ success: true, message: 'Task result submitted' });
  } catch (error) {
    console.error('Task result error:', error);
    res.status(500).json({ error: 'Failed to submit task result' });
  }
});

// ==================== AI INSIGHTS ====================

// Get AI recommendations for representative
router.get('/representatives/:id/ai-insights', requireCrmAuth, async (req, res) => {
  try {
    const repId = parseInt(req.params.id);
    
    const insights = await crmService.getAIRecommendations(repId);
    
    res.json(insights);
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
});

// ==================== PERFORMANCE ====================

// Get representative performance analytics
router.get('/representatives/:id/performance', requireCrmAuth, async (req, res) => {
  try {
    const repId = parseInt(req.params.id);
    
    const performance = await crmService.getRepresentativePerformance(repId);
    
    res.json(performance);
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// ==================== ADMIN PANEL INTEGRATION ====================

// Team performance report (Admin only)
router.get('/admin/team-performance', requireCrmAuth, async (req, res) => {
  try {
    if (req.crmSession.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const report = await crmDataSyncService.generateTeamPerformanceReport();
    
    res.json(report);
  } catch (error) {
    console.error('Team performance error:', error);
    res.status(500).json({ error: 'Failed to generate team performance report' });
  }
});

// CRM system health and status (Admin only)
router.get('/admin/system-status', requireCrmAuth, async (req, res) => {
  try {
    if (req.crmSession.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const syncStatus = crmDataSyncService.getSyncStatus();
    const securityAudit = await crmAuthService.performSecurityAudit();
    const activeSessions = await crmAuthService.getActiveSessions();

    res.json({
      sync: syncStatus,
      security: securityAudit,
      sessions: {
        total: activeSessions.length,
        admin: activeSessions.filter(s => s.role === 'ADMIN').length,
        crm: activeSessions.filter(s => s.role === 'CRM').length
      },
      health: 'healthy'
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// ==================== UTILITIES ====================

// Sync data manually
router.post('/sync', requireCrmAuth, async (req, res) => {
  try {
    const syncResult = await crmDataSyncService.performFullSync();
    
    res.json({
      success: true,
      syncResult,
      message: 'Data synchronization completed'
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ error: 'Synchronization failed' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'running',
      ai: 'running',
      sync: 'running'
    }
  });
});

export { router as crmRoutes };