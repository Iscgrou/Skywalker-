// 📝 VOICE BIOGRAPHY PANEL - DA VINCI v9.0 Persian Cultural Voice Biography
// Interactive Voice-to-Text Biography Creation with Persian Cultural Analysis

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User,
  Mic,
  FileText,
  Save,
  Edit,
  Volume2,
  Brain,
  CheckCircle,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import VoiceRecorder from './voice-recorder';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface VoiceBiographyPanelProps {
  representativeId: number;
  representativeName: string;
  existingBiography?: string;
  onBiographyUpdate?: (newBiography: string) => void;
}

interface BiographyData {
  originalText: string;
  processedText: string;
  culturalAnalysis: {
    communicationStyle: string;
    emotionalTone: string;
    culturalMarkers: string[];
    recommendedApproach: string;
    sensitivityLevel: 'low' | 'medium' | 'high';
  };
  aiInsights: string[];
  suggestedActions: any[];
  confidence: number;
}

export default function VoiceBiographyPanel({
  representativeId,
  representativeName,
  existingBiography = '',
  onBiographyUpdate
}: VoiceBiographyPanelProps) {
  const [biographyText, setBiographyText] = useState(existingBiography);
  const [isEditing, setIsEditing] = useState(false);
  const [voiceData, setVoiceData] = useState<BiographyData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Save Biography Mutation
  const saveBiographyMutation = useMutation({
    mutationFn: async (biographyContent: string) => {
      const response = await apiRequest(`/api/crm/representatives/${representativeId}/biography`, {
        method: 'PUT',
        data: {
          biography: biographyContent,
          voiceData: voiceData,
          culturalAnalysis: voiceData?.culturalAnalysis || null
        }
      });
      return response;
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/crm/representatives', representativeId] });
      
      if (onBiographyUpdate) {
        onBiographyUpdate(biographyText);
      }
      
      toast({
        title: "بیوگرافی ذخیره شد",
        description: "تغییرات با موفقیت اعمال شد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ذخیره",
        description: error.message || "امکان ذخیره بیوگرافی وجود ندارد",
        variant: "destructive"
      });
    }
  });

  const handleVoiceProcessingComplete = (result: any) => {
    const processed = result.processed;
    
    setVoiceData({
      originalText: processed.originalText,
      processedText: processed.processedText,
      culturalAnalysis: processed.culturalAnalysis,
      aiInsights: processed.aiInsights,
      suggestedActions: processed.suggestedActions,
      confidence: processed.confidence
    });

    // Append processed text to existing biography
    const newBiography = biographyText.trim() 
      ? `${biographyText}\n\n${processed.processedText}`
      : processed.processedText;
      
    setBiographyText(newBiography);
    setHasUnsavedChanges(true);
    setIsEditing(true);

    toast({
      title: "محتوای صوتی اضافه شد",
      description: `${processed.processedText.substring(0, 50)}...`,
    });
  };

  const handleTranscriptionUpdate = (text: string) => {
    // Real-time transcription updates could be shown here
    console.log('Transcription update:', text);
  };

  const handleSave = () => {
    if (biographyText.trim()) {
      saveBiographyMutation.mutate(biographyText);
    }
  };

  const handleTextChange = (value: string) => {
    setBiographyText(value);
    setHasUnsavedChanges(value !== existingBiography);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold">بیوگرافی صوتی</h2>
            <p className="text-sm text-muted-foreground">{representativeName}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            disabled={saveBiographyMutation.isPending}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? 'انصراف' : 'ویرایش'}
          </Button>
          
          {hasUnsavedChanges && (
            <Button
              onClick={handleSave}
              disabled={saveBiographyMutation.isPending || !biographyText.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              ذخیره
            </Button>
          )}
        </div>
      </div>

      {/* Voice Recorder */}
      <VoiceRecorder
        contextType="biography"
        representativeId={representativeId}
        onProcessingComplete={handleVoiceProcessingComplete}
        onTranscriptionUpdate={handleTranscriptionUpdate}
        disabled={saveBiographyMutation.isPending}
      />

      {/* Current Biography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            متن بیوگرافی
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isEditing ? (
            <Textarea
              value={biographyText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="بیوگرافی نماینده را وارد کنید یا از ضبط صوت استفاده کنید..."
              className="min-h-[200px] text-right"
              dir="rtl"
            />
          ) : (
            <div className="min-h-[200px] p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-right leading-relaxed" dir="rtl">
              {biographyText || (
                <span className="text-muted-foreground italic">
                  بیوگرافی نماینده هنوز ثبت نشده است. از بخش ضبط صوت یا ویرایش متن استفاده کنید.
                </span>
              )}
            </div>
          )}

          {/* Unsaved Changes Warning */}
          {hasUnsavedChanges && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                تغییرات ذخیره نشده دارید. برای حفظ اطلاعات روی "ذخیره" کلیک کنید.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Voice Processing Results */}
      {voiceData && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Brain className="h-5 w-5" />
              نتایج تحلیل صوتی
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            
            {/* Processing Quality */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">کیفیت پردازش:</span>
              <Badge variant={voiceData.confidence > 0.8 ? "default" : voiceData.confidence > 0.6 ? "secondary" : "destructive"}>
                {Math.round(voiceData.confidence * 100)}%
              </Badge>
            </div>

            <Separator />

            {/* Cultural Analysis */}
            {voiceData.culturalAnalysis && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  تحلیل فرهنگی
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">سبک ارتباطی:</span>
                      <Badge variant="outline" className="ml-2">
                        {voiceData.culturalAnalysis.communicationStyle}
                      </Badge>
                    </div>
                    
                    <div>
                      <span className="font-medium">لحن گفتار:</span>
                      <Badge variant="outline" className="ml-2">
                        {voiceData.culturalAnalysis.emotionalTone}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">روش پیشنهادی:</span>
                      <Badge variant="secondary" className="ml-2">
                        {voiceData.culturalAnalysis.recommendedApproach}
                      </Badge>
                    </div>
                    
                    <div>
                      <span className="font-medium">سطح حساسیت:</span>
                      <Badge 
                        variant={voiceData.culturalAnalysis.sensitivityLevel === 'high' ? "destructive" : "outline"}
                        className="ml-2"
                      >
                        {voiceData.culturalAnalysis.sensitivityLevel === 'high' ? 'بالا' : 
                         voiceData.culturalAnalysis.sensitivityLevel === 'medium' ? 'متوسط' : 'پایین'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Cultural Markers */}
                {voiceData.culturalAnalysis.culturalMarkers.length > 0 && (
                  <div>
                    <span className="font-medium text-sm">نشانه‌های فرهنگی:</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {voiceData.culturalAnalysis.culturalMarkers.map((marker, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {marker}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* AI Insights */}
            {voiceData.aiInsights.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  بینش‌های هوشمند
                </h4>
                
                <ul className="space-y-1 text-sm">
                  {voiceData.aiInsights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested Actions */}
            {voiceData.suggestedActions.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  اقدامات پیشنهادی
                </h4>
                
                <div className="space-y-2">
                  {voiceData.suggestedActions.map((action, index) => (
                    <div key={index} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{action.action}</span>
                        <Badge variant={action.priority === 'urgent' ? "destructive" : action.priority === 'high' ? "default" : "secondary"}>
                          {action.priority === 'urgent' ? 'فوری' : 
                           action.priority === 'high' ? 'مهم' : 
                           action.priority === 'medium' ? 'متوسط' : 'کم'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{action.reasoning}</p>
                      {action.estimatedImpact && (
                        <div className="mt-1 text-xs">
                          تأثیر پیش‌بینی: {action.estimatedImpact}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}