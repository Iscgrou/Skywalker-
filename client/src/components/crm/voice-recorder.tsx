// 🎤 VOICE RECORDER COMPONENT - DA VINCI v9.0 Persian Voice Interface
// Groq Speech-to-Text + xAI Grok Cultural Analysis Integration

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Upload,
  FileAudio,
  Brain,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  contextType: 'biography' | 'support_status' | 'task_assignment';
  representativeId?: number;
  onProcessingComplete?: (result: VoiceProcessingResult) => void;
  onTranscriptionUpdate?: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

interface VoiceProcessingResult {
  transcription: {
    text: string;
    confidence: number;
    language: string;
    segments: any[];
    metadata: {
      duration: number;
      speakerCount: number;
      backgroundNoise: boolean;
    };
  };
  processed: {
    originalText: string;
    processedText: string;
    aiInsights: string[];
    suggestedActions: any[];
    culturalAnalysis: {
      communicationStyle: string;
      emotionalTone: string;
      culturalMarkers: string[];
      recommendedApproach: string;
      sensitivityLevel: 'low' | 'medium' | 'high';
    };
    confidence: number;
    processingTime: number;
  };
  metadata: {
    processingTime: number;
    confidence: number;
    language: string;
  };
}

export default function VoiceRecorder({
  contextType,
  representativeId,
  onProcessingComplete,
  onTranscriptionUpdate,
  className = '',
  disabled = false
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [processingResult, setProcessingResult] = useState<VoiceProcessingResult | null>(null);
  const [processingStage, setProcessingStage] = useState<'idle' | 'transcribing' | 'analyzing' | 'complete'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Create audio URL for playback
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setErrorMessage(null);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      toast({
        title: "ضبط آغاز شد",
        description: "صحبت کنید، سیستم صدای شما را ضبط می‌کند",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('دسترسی به میکروفون امکان‌پذیر نیست');
      toast({
        title: "خطا در ضبط صدا",
        description: "لطفاً دسترسی به میکروفون را تأیید کنید",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      toast({
        title: "ضبط متوقف شد",
        description: `${recordingDuration} ثانیه صدا ضبط شد`,
      });
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const processAudio = async () => {
    if (!audioBlob) {
      toast({
        title: "خطا",
        description: "ابتدا فایل صوتی ضبط کنید",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStage('transcribing');
    setErrorMessage(null);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', 'fa');
      formData.append('contextType', contextType);
      if (representativeId) {
        formData.append('representativeId', representativeId.toString());
      }

      // Stage 1: Groq Transcription + xAI Grok Processing
      const response = await fetch('/api/crm/voice/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در پردازش صوت');
      }

      setProcessingStage('analyzing');
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'پردازش صوت ناموفق');
      }

      setProcessingStage('complete');
      setProcessingResult(result.data);

      // Update parent components
      if (onTranscriptionUpdate) {
        onTranscriptionUpdate(result.data.transcription.text);
      }
      if (onProcessingComplete) {
        onProcessingComplete(result.data);
      }

      toast({
        title: "پردازش صوت موفق",
        description: `متن تشخیص داده شد با دقت ${Math.round(result.data.transcription.confidence * 100)}%`,
      });

    } catch (error: any) {
      console.error('Voice processing error:', error);
      setErrorMessage(error.message || 'خطا در پردازش صوت');
      setProcessingStage('idle');
      
      toast({
        title: "خطا در پردازش صوت",
        description: error.message || 'لطفاً مجدداً تلاش کنید',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingDuration(0);
    setProcessingResult(null);
    setProcessingStage('idle');
    setErrorMessage(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getContextLabel = () => {
    switch (contextType) {
      case 'biography': return 'بیوگرافی نماینده';
      case 'support_status': return 'گزارش پشتیبانی';
      case 'task_assignment': return 'تکلیف جدید';
      default: return 'پردازش صوت';
    }
  };

  const getProcessingStageLabel = () => {
    switch (processingStage) {
      case 'transcribing': return 'تبدیل صوت به متن...';
      case 'analyzing': return 'تحلیل هوشمند محتوا...';
      case 'complete': return 'پردازش کامل شد';
      default: return 'آماده پردازش';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mic className="h-5 w-5" />
            ضبط صوت - {getContextLabel()}
          </CardTitle>
          {processingStage !== 'idle' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {getProcessingStageLabel()}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          
          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-4">
            {!isRecording && !audioBlob && (
              <Button 
                onClick={startRecording}
                disabled={disabled || isProcessing}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Mic className="h-5 w-5 mr-2" />
                شروع ضبط
              </Button>
            )}

            {isRecording && (
              <Button 
                onClick={stopRecording}
                size="lg"
                variant="destructive"
                className="animate-pulse"
              >
                <Square className="h-5 w-5 mr-2" />
                توقف ضبط ({formatDuration(recordingDuration)})
              </Button>
            )}

            {audioBlob && !isRecording && (
              <div className="flex gap-2">
                <Button 
                  onClick={playRecording}
                  variant="outline"
                  disabled={isProcessing}
                >
                  {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isPlaying ? 'توقف' : 'پخش'}
                </Button>

                <Button 
                  onClick={processAudio}
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      پردازش هوشمند
                    </>
                  )}
                </Button>

                <Button 
                  onClick={resetRecording}
                  variant="outline"
                  disabled={isProcessing}
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  ضبط جدید
                </Button>
              </div>
            )}
          </div>

          {/* Recording Duration Display */}
          {(isRecording || audioBlob) && (
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <FileAudio className="h-4 w-4 mr-2" />
                مدت: {formatDuration(recordingDuration)}
              </Badge>
            </div>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={processingStage === 'transcribing' ? 30 : processingStage === 'analyzing' ? 70 : 100} />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Brain className="h-4 w-4 animate-pulse" />
                {getProcessingStageLabel()}
              </div>
            </div>
          )}

          {/* Error Display */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Processing Results */}
          {processingResult && processingStage === 'complete' && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">پردازش با موفقیت انجام شد</span>
              </div>

              {/* Transcription Results */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileAudio className="h-4 w-4" />
                  متن تشخیص داده شده:
                </h4>
                <p className="text-sm leading-relaxed">{processingResult.transcription.text}</p>
                
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>دقت: {Math.round(processingResult.transcription.confidence * 100)}%</span>
                  <span>زبان: {processingResult.transcription.language === 'fa' ? 'فارسی' : 'انگلیسی'}</span>
                  <span>مدت: {processingResult.transcription.metadata.duration}s</span>
                </div>
              </div>

              {/* AI Insights */}
              {processingResult.processed.aiInsights.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    تحلیل هوشمند:
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {processingResult.processed.aiInsights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cultural Analysis */}
              {processingResult.processed.culturalAnalysis && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    تحلیل فرهنگی:
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">سبک ارتباطی:</span>
                      <Badge variant="outline" className="ml-2">
                        {processingResult.processed.culturalAnalysis.communicationStyle}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">لحن عاطفی:</span>
                      <Badge variant="outline" className="ml-2">
                        {processingResult.processed.culturalAnalysis.emotionalTone}
                      </Badge>
                    </div>
                  </div>
                  
                  {processingResult.processed.culturalAnalysis.culturalMarkers.length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium text-sm">نشانه‌های فرهنگی:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {processingResult.processed.culturalAnalysis.culturalMarkers.map((marker, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {marker}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hidden Audio Element for Playback */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              style={{ display: 'none' }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}