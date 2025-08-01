// 🎤 VOICE RECORDER - Enhanced DA VINCI v9.0 Voice Processing
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Upload,
  Brain,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  placeholder?: string;
  maxDuration?: number;
}

export default function VoiceRecorder({ 
  onTranscriptionComplete, 
  placeholder = "برای ضبط صدا کلیک کنید...",
  maxDuration = 300 // 5 minutes
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [processingStage, setProcessingStage] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      toast({
        title: "ضبط صدا آغاز شد",
        description: "در حال ضبط صدای شما...",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "خطا در ضبط صدا",
        description: "لطفاً دسترسی میکروفون را اجازه دهید",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      toast({
        title: "ضبط صدا متوقف شد",
        description: "فایل صوتی آماده پردازش است",
      });
    }
  };

  const processVoice = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    setProcessingStage('آپلود فایل صوتی...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      setProcessingStage('تبدیل صدا به متن (Groq)...');
      
      // Stage 1: Groq Speech-to-Text
      const transcriptionResponse = await fetch('/api/crm/voice/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!transcriptionResponse.ok) {
        throw new Error('خطا در تبدیل صدا به متن');
      }

      const transcriptionResult = await transcriptionResponse.json();
      const transcribedText = transcriptionResult.text || '';
      setTranscription(transcribedText);

      setProcessingStage('پردازش هوشمند متن (xAI Grok)...');

      // Stage 2: xAI Grok Processing
      const processingResponse = await fetch('/api/crm/voice/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: transcribedText,
          contextType: 'biography',
          urgencyLevel: 'medium'
        })
      });

      if (!processingResponse.ok) {
        throw new Error('خطا در پردازش هوشمند');
      }

      const processedResult = await processingResponse.json();
      
      setProcessingStage('تکمیل پردازش...');

      // Deliver final processed content
      onTranscriptionComplete(processedResult.processedText || transcribedText);

      toast({
        title: "پردازش صوت تکمیل شد",
        description: "متن پردازش شده با موفقیت آماده شد",
      });

      // Reset component
      setAudioBlob(null);
      setTranscription('');
      setRecordingTime(0);

    } catch (error) {
      console.error('Voice processing error:', error);
      toast({
        title: "خطا در پردازش صوت",
        description: "لطفاً مجدداً تلاش کنید",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                disabled={isProcessing}
                className="gap-2"
              >
                <Mic className="h-4 w-4" />
                شروع ضبط
              </Button>
            ) : (
              <Button 
                onClick={stopRecording} 
                variant="destructive"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                توقف ضبط
              </Button>
            )}

            {audioBlob && !isRecording && (
              <Button 
                onClick={processVoice} 
                disabled={isProcessing}
                variant="outline"
                className="gap-2"
              >
                <Brain className="h-4 w-4" />
                پردازش هوشمند
              </Button>
            )}
          </div>

          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <Mic className="h-3 w-3 mr-1" />
              در حال ضبط
            </Badge>
          )}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>زمان ضبط:</span>
              <span>{formatTime(recordingTime)} / {formatTime(maxDuration)}</span>
            </div>
            <Progress value={(recordingTime / maxDuration) * 100} />
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>{processingStage}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  🎤 Groq → 🧠 xAI Grok → ✨ متن پردازش شده
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Transcription Preview */}
        {transcription && !isProcessing && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <strong>متن تشخیص داده شده:</strong>
                <p className="text-sm bg-muted p-2 rounded">{transcription}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Help Text */}
        <p className="text-xs text-muted-foreground text-center">
          {placeholder}
        </p>
      </CardContent>
    </Card>
  );
}