// 🎯 VOICE TASK CREATOR - DA VINCI v9.0 Voice-Powered Task Generation
// AI-Powered Task Creation from Voice Input with Persian Cultural Analysis

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import {
  Target,
  Mic,
  Brain,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Plus,
  Save,
  Volume2
} from 'lucide-react';
import VoiceRecorder from './voice-recorder';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface VoiceTaskCreatorProps {
  representativeId?: number;
  representativeName?: string;
  onTaskCreated?: (task: any) => void;
  className?: string;
}

interface GeneratedTask {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: number;
  category: string;
  culturalConsiderations: string[];
  aiRecommendations: string[];
  deadline?: string;
  assigneeNotes?: string;
}

interface VoiceTaskData {
  originalVoiceText: string;
  processedText: string;
  generatedTask: GeneratedTask;
  culturalAnalysis: {
    communicationStyle: string;
    emotionalTone: string;
    urgencyLevel: 'low' | 'medium' | 'high' | 'urgent';
    culturalMarkers: string[];
    recommendedApproach: string;
  };
  confidence: number;
}

export default function VoiceTaskCreator({
  representativeId,
  representativeName,
  onTaskCreated,
  className = ''
}: VoiceTaskCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [voiceTaskData, setVoiceTaskData] = useState<VoiceTaskData | null>(null);
  const [isGeneratingTask, setIsGeneratingTask] = useState(false);
  const [editedTask, setEditedTask] = useState<GeneratedTask | null>(null);
  const [customDeadline, setCustomDeadline] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save Task Mutation
  const saveTaskMutation = useMutation({
    mutationFn: async (taskData: GeneratedTask & { representativeId?: number; voiceData?: VoiceTaskData }) => {
      const response = await apiRequest('/api/crm/tasks', {
        method: 'POST',
        data: taskData
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/tasks'] });
      
      if (onTaskCreated) {
        onTaskCreated(data);
      }
      
      toast({
        title: "وظیفه ایجاد شد",
        description: `وظیفه "${editedTask?.title}" با موفقیت ثبت شد`,
      });
      
      // Reset state
      setIsOpen(false);
      setVoiceTaskData(null);
      setEditedTask(null);
      setCustomDeadline('');
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ایجاد وظیفه",
        description: error.message || "امکان ثبت وظیفه وجود ندارد",
        variant: "destructive"
      });
    }
  });

  const handleVoiceProcessingComplete = async (result: any) => {
    setIsGeneratingTask(true);
    
    try {
      // Generate task from voice data using AI
      const taskGenerationResponse = await apiRequest('/api/crm/voice/generate-task', {
        method: 'POST',
        data: {
          voiceTranscription: result.transcription.text,
          culturalAnalysis: result.processed.culturalAnalysis,
          representativeId: representativeId,
          contextData: {
            representativeName: representativeName,
            urgencyLevel: result.processed.culturalAnalysis?.urgencyLevel || 'medium'
          }
        }
      });

      if (taskGenerationResponse.success) {
        const generatedTask = taskGenerationResponse.data.task;
        
        const voiceTask: VoiceTaskData = {
          originalVoiceText: result.transcription.text,
          processedText: result.processed.processedText,
          generatedTask: generatedTask,
          culturalAnalysis: result.processed.culturalAnalysis,
          confidence: result.processed.confidence
        };

        setVoiceTaskData(voiceTask);
        setEditedTask(generatedTask);

        toast({
          title: "وظیفه تولید شد",
          description: `وظیفه "${generatedTask.title}" از محتوای صوتی ایجاد شد`,
        });
      } else {
        throw new Error(taskGenerationResponse.error || 'خطا در تولید وظیفه');
      }

    } catch (error: any) {
      console.error('Task generation error:', error);
      
      // Fallback: Create basic task from voice text
      const fallbackTask: GeneratedTask = {
        title: `وظیفه صوتی - ${representativeName || 'نماینده'}`,
        description: result.processed.processedText || result.transcription.text,
        priority: 'medium',
        estimatedDuration: 60,
        category: 'پیگیری عمومی',
        culturalConsiderations: result.processed.culturalAnalysis?.culturalMarkers || [],
        aiRecommendations: result.processed.aiInsights || [],
        assigneeNotes: 'وظیفه از محتوای صوتی تولید شده است'
      };

      const fallbackVoiceTask: VoiceTaskData = {
        originalVoiceText: result.transcription.text,
        processedText: result.processed.processedText,
        generatedTask: fallbackTask,
        culturalAnalysis: result.processed.culturalAnalysis,
        confidence: result.processed.confidence
      };

      setVoiceTaskData(fallbackVoiceTask);
      setEditedTask(fallbackTask);

      toast({
        title: "وظیفه پایه تولید شد",
        description: "وظیفه از محتوای صوتی ایجاد شد (حالت پایه)",
        variant: "default"
      });
    } finally {
      setIsGeneratingTask(false);
    }
  };

  const handleSaveTask = () => {
    if (!editedTask) return;

    const taskToSave = {
      ...editedTask,
      deadline: customDeadline || undefined,
      representativeId: representativeId,
      voiceData: voiceTaskData || undefined
    };

    saveTaskMutation.mutate(taskToSave);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'فوری';
      case 'high': return 'مهم';
      case 'medium': return 'متوسط';
      case 'low': return 'کم';
      default: return 'نامشخص';
    }
  };

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-green-600 hover:bg-green-700">
            <Mic className="h-4 w-4 mr-2" />
            تولید وظیفه صوتی
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              تولید وظیفه از صوت
            </DialogTitle>
            <DialogDescription>
              وظیفه جدید را با استفاده از ضبط صوت و تحلیل هوشمند ایجاد کنید
              {representativeName && ` - ${representativeName}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            
            {/* Voice Recording Section */}
            {!voiceTaskData && (
              <VoiceRecorder
                contextType="task_assignment"
                representativeId={representativeId}
                onProcessingComplete={handleVoiceProcessingComplete}
                disabled={isGeneratingTask || saveTaskMutation.isPending}
              />
            )}

            {/* Task Generation Progress */}
            {isGeneratingTask && (
              <Alert>
                <Brain className="h-4 w-4 animate-pulse" />
                <AlertDescription>
                  در حال تولید وظیفه هوشمند از محتوای صوتی...
                </AlertDescription>
              </Alert>
            )}

            {/* Generated Task Display & Editing */}
            {voiceTaskData && editedTask && (
              <div className="space-y-4">
                
                {/* Voice Analysis Summary */}
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Volume2 className="h-4 w-4" />
                      خلاصه تحلیل صوتی
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">سبک ارتباطی:</span>
                        <Badge variant="outline" className="ml-2">
                          {voiceTaskData.culturalAnalysis?.communicationStyle || 'معمولی'}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">دقت پردازش:</span>
                        <Badge variant={voiceTaskData.confidence > 0.8 ? "default" : "secondary"} className="ml-2">
                          {Math.round(voiceTaskData.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <span className="font-medium">متن اصلی:</span>
                      <p className="text-muted-foreground mt-1 italic">
                        "{voiceTaskData.originalVoiceText.substring(0, 100)}..."
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Task Editing Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      ویرایش وظیفه تولید شده
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    
                    {/* Title */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">عنوان وظیفه</label>
                      <Input
                        value={editedTask.title}
                        onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
                        placeholder="عنوان وظیفه را وارد کنید"
                        className="text-right"
                        dir="rtl"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">شرح وظیفه</label>
                      <Textarea
                        value={editedTask.description}
                        onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
                        placeholder="شرح کامل وظیفه..."
                        className="min-h-[100px] text-right"
                        dir="rtl"
                      />
                    </div>

                    {/* Priority & Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">اولویت</label>
                        <Select 
                          value={editedTask.priority} 
                          onValueChange={(value: any) => setEditedTask({...editedTask, priority: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urgent">فوری</SelectItem>
                            <SelectItem value="high">مهم</SelectItem>
                            <SelectItem value="medium">متوسط</SelectItem>
                            <SelectItem value="low">کم</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">مدت تخمینی (دقیقه)</label>
                        <Input
                          type="number"
                          value={editedTask.estimatedDuration}
                          onChange={(e) => setEditedTask({...editedTask, estimatedDuration: parseInt(e.target.value) || 60})}
                          min="5"
                          max="480"
                        />
                      </div>
                    </div>

                    {/* Category & Deadline */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">دسته‌بندی</label>
                        <Input
                          value={editedTask.category}
                          onChange={(e) => setEditedTask({...editedTask, category: e.target.value})}
                          placeholder="دسته‌بندی وظیفه"
                          className="text-right"
                          dir="rtl"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">مهلت انجام</label>
                        <Input
                          type="datetime-local"
                          value={customDeadline}
                          onChange={(e) => setCustomDeadline(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Cultural Considerations */}
                    {editedTask.culturalConsiderations.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">ملاحظات فرهنگی</label>
                        <div className="flex flex-wrap gap-2">
                          {editedTask.culturalConsiderations.map((consideration, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {consideration}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Recommendations */}
                    {editedTask.aiRecommendations.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">توصیه‌های هوشمند</label>
                        <ul className="space-y-1 text-sm">
                          {editedTask.aiRecommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Sparkles className="h-3 w-3 text-blue-600 mt-1 flex-shrink-0" />
                              {recommendation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Assignee Notes */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">یادداشت‌های اجرایی</label>
                      <Textarea
                        value={editedTask.assigneeNotes || ''}
                        onChange={(e) => setEditedTask({...editedTask, assigneeNotes: e.target.value})}
                        placeholder="یادداشت‌های مفید برای اجرای وظیفه..."
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setVoiceTaskData(null);
                      setEditedTask(null);
                    }}
                    disabled={saveTaskMutation.isPending}
                  >
                    ضبط جدید
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={saveTaskMutation.isPending}
                    >
                      انصراف
                    </Button>
                    
                    <Button
                      onClick={handleSaveTask}
                      disabled={!editedTask.title.trim() || !editedTask.description.trim() || saveTaskMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      ذخیره وظیفه
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}