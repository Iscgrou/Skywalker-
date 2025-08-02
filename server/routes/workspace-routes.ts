// Workspace API Routes - DA VINCI v2.0
// RESTful API endpoints for workspace tasks, reports, reminders

import { Router } from "express";
import { z } from "zod";
import { workspaceStorage } from "../services/workspace-storage";
import { reportAnalyzer } from "../services/report-analyzer";
import { AITaskGenerator } from "../services/ai-task-generator";
import { 
  insertWorkspaceTaskSchema, 
  insertTaskReportSchema, 
  insertWorkspaceReminderSchema 
} from "@shared/schema";

const router = Router();

// Initialize AI task generator
const taskGenerator = new AITaskGenerator();

// ==================== WORKSPACE TASKS ====================

// GET /api/workspace/tasks - Get tasks for current staff
router.get("/tasks", async (req, res) => {
  try {
    const staffId = 1; // TODO: Get from session
    const status = req.query.status as string;
    
    const tasks = await workspaceStorage.getTasksByStaff(staffId, status as any);
    res.json({ tasks });
  } catch (error) {
    console.error("Error fetching workspace tasks:", error);
    res.status(500).json({ error: "خطا در دریافت وظایف" });
  }
});

// POST /api/workspace/tasks/generate - Generate new tasks using AI
router.post("/tasks/generate", async (req, res) => {
  try {
    console.log("Generating workspace tasks using AI...");
    
    const result = await taskGenerator.generateDailyTasks();
    
    res.json({
      success: true,
      message: `${result.tasks.length} وظیفه جدید تولید شد`,
      tasks: result.tasks,
      metadata: result.generationMetadata
    });
  } catch (error) {
    console.error("Error generating tasks:", error);
    res.status(500).json({ 
      error: "خطا در تولید وظایف", 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/workspace/tasks/:id/status - Update task status
router.put("/tasks/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const statusSchema = z.object({
      status: z.enum(['ASSIGNED', 'READ', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED'])
    });
    
    const { status } = statusSchema.parse(req.body);
    
    await workspaceStorage.updateTaskStatus(id, status);
    
    res.json({ 
      success: true, 
      message: "وضعیت وظیفه بروزرسانی شد" 
    });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ error: "خطا در بروزرسانی وضعیت" });
  }
});

// GET /api/workspace/tasks/:id - Get specific task
router.get("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await workspaceStorage.getTaskById(id);
    
    if (!task) {
      return res.status(404).json({ error: "وظیفه یافت نشد" });
    }
    
    res.json({ task });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "خطا در دریافت وظیفه" });
  }
});

// ==================== TASK REPORTS ====================

// POST /api/workspace/reports - Submit a task report
router.post("/reports", async (req, res) => {
  try {
    const reportData = insertTaskReportSchema.parse(req.body);
    
    // Add Persian timestamp
    const persianDate = require("persian-date");
    const now = new persianDate().format('YYYY/MM/DD HH:mm:ss');
    
    const report = await workspaceStorage.submitReport({
      ...reportData,
      submittedAt: now
    });
    
    // Process report with AI analyzer (asynchronous)
    reportAnalyzer.analyzeReport(report).catch(error => {
      console.error("Error analyzing report:", error);
    });
    
    res.json({
      success: true,
      message: "گزارش ثبت شد و در حال تحلیل است",
      report
    });
  } catch (error) {
    console.error("Error submitting report:", error);
    res.status(500).json({ error: "خطا در ثبت گزارش" });
  }
});

// GET /api/workspace/reports/task/:taskId - Get reports for a task
router.get("/reports/task/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const reports = await workspaceStorage.getReportsByTask(taskId);
    
    res.json({ reports });
  } catch (error) {
    console.error("Error fetching task reports:", error);
    res.status(500).json({ error: "خطا در دریافت گزارش‌ها" });
  }
});

// POST /api/workspace/reports/process - Process pending reports
router.post("/reports/process", async (req, res) => {
  try {
    const result = await reportAnalyzer.processPendingReports();
    
    res.json({
      success: true,
      message: `${result.processed} گزارش پردازش شد، ${result.failed} خطا`,
      ...result
    });
  } catch (error) {
    console.error("Error processing reports:", error);
    res.status(500).json({ error: "خطا در پردازش گزارش‌ها" });
  }
});

// ==================== WORKSPACE REMINDERS ====================

// GET /api/workspace/reminders - Get active reminders for current staff
router.get("/reminders", async (req, res) => {
  try {
    const staffId = 1; // TODO: Get from session
    const reminders = await workspaceStorage.getActiveReminders(staffId);
    
    res.json({ reminders });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ error: "خطا در دریافت یادآورها" });
  }
});

// POST /api/workspace/reminders - Create a new reminder
router.post("/reminders", async (req, res) => {
  try {
    const reminderData = insertWorkspaceReminderSchema.parse(req.body);
    
    const reminder = await workspaceStorage.createReminder(reminderData);
    
    res.json({
      success: true,
      message: "یادآور ایجاد شد",
      reminder
    });
  } catch (error) {
    console.error("Error creating reminder:", error);
    res.status(500).json({ error: "خطا در ایجاد یادآور" });
  }
});

// PUT /api/workspace/reminders/:id/snooze - Snooze a reminder
router.put("/reminders/:id/snooze", async (req, res) => {
  try {
    const { id } = req.params;
    const { newTime } = req.body;
    
    await workspaceStorage.snoozeReminder(id, newTime);
    
    res.json({
      success: true,
      message: "یادآور به تعویق افتاد"
    });
  } catch (error) {
    console.error("Error snoozing reminder:", error);
    res.status(500).json({ error: "خطا در به تعویق انداختن یادآور" });
  }
});

// PUT /api/workspace/reminders/:id/complete - Complete a reminder
router.put("/reminders/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    
    await workspaceStorage.completeReminder(id);
    
    res.json({
      success: true,
      message: "یادآور تکمیل شد"
    });
  } catch (error) {
    console.error("Error completing reminder:", error);
    res.status(500).json({ error: "خطا در تکمیل یادآور" });
  }
});

// ==================== SUPPORT LOGS ====================

// GET /api/workspace/support/representative/:id - Get support history for representative
router.get("/support/representative/:id", async (req, res) => {
  try {
    const representativeId = parseInt(req.params.id);
    const history = await workspaceStorage.getSupportHistory(representativeId);
    
    res.json({ history });
  } catch (error) {
    console.error("Error fetching support history:", error);
    res.status(500).json({ error: "خطا در دریافت تاریخچه پشتیبانی" });
  }
});

// GET /api/workspace/support/staff - Get support activity for current staff
router.get("/support/staff", async (req, res) => {
  try {
    const staffId = 1; // TODO: Get from session
    const activity = await workspaceStorage.getStaffSupportActivity(staffId);
    
    res.json({ activity });
  } catch (error) {
    console.error("Error fetching staff support activity:", error);
    res.status(500).json({ error: "خطا در دریافت فعالیت پشتیبانی" });
  }
});

// ==================== DASHBOARD & ANALYTICS ====================

// GET /api/workspace/dashboard - Get workspace dashboard stats
router.get("/dashboard", async (req, res) => {
  try {
    const staffId = 1; // TODO: Get from session
    const stats = await workspaceStorage.getDashboardStats(staffId);
    
    res.json({ stats });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "خطا در دریافت آمار میز کار" });
  }
});

// GET /api/workspace/test - Test AI task generation
router.get("/test", async (req, res) => {
  try {
    const result = await taskGenerator.generateDailyTasks();
    
    res.json({
      success: true,
      message: "تست موفقیت‌آمیز تولید وظایف",
      result
    });
  } catch (error) {
    console.error("Error testing task generation:", error);
    res.status(500).json({ 
      error: "خطا در تست", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;