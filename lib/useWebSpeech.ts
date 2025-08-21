/**
 * Enhanced Web Speech Hook with Multi-Alternative Rescoring
 * Provides context-faithful transcription with homophone correction
 */
import { useEffect, useRef, useState } from "react";
import { refineAlternatives } from "./refineTranscript";

interface WebSpeechOptions {
  lang?: string;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (error: string) => void;
  keepAlive?: boolean;
  enableMicConstraints?: boolean;
}

interface VUMeter {
  level: number; // 0-100
  isActive: boolean;
}

export function useWebSpeech({
  lang = "en-IN",
  onInterim,
  onFinal,
  onError,
  keepAlive = true,
  enableMicConstraints = true
}: WebSpeechOptions = {}) {
  const recRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isSupported, setIsSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [finalSoFar, setFinalSoFar] = useState("");
  const [vuMeter, setVuMeter] = useState<VUMeter>({ level: 0, isActive: false });
  
  // Use ref to avoid closure issues and infinite re-renders
  const finalSoFarRef = useRef("");
  
  // Restart backoff to prevent infinite restart loops
  const restartCountRef = useRef(0);
  const lastRestartRef = useRef(0);
  
  // Track if user explicitly stopped (to prevent auto-restart)
  const userStoppedRef = useRef(false);

  // Initialize speech recognition
  useEffect(() => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      console.warn('Web Speech API not supported');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const rec = new SR();
    
    // Enhanced configuration for better alternatives
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 3; // Get multiple candidates for rescoring
    rec.lang = lang;

    rec.onstart = () => {
      console.log('🎤 Speech recognition started');
      setListening(true);
      restartCountRef.current = 0;
    };

    rec.onresult = (e: any) => {
      let interim = "";
      let finals: { transcript: string; confidence?: number }[] = [];

      // Process all results from the latest result index
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        
        // Extract all alternatives for this result
        const alternatives = Array.from(result).map((alt: any) => ({
          transcript: alt.transcript,
          confidence: alt.confidence || 0
        }));

        if (result.isFinal) {
          // Collect all final alternatives for rescoring
          finals.push(...alternatives);
        } else {
          // For interim results, just use the first (highest confidence) alternative
          interim += alternatives[0]?.transcript || "";
        }
      }

      // Handle interim results
      if (interim && onInterim) {
        const cleanedInterim = autoClean(interim);
        onInterim(cleanedInterim);
      }

      // Handle final results with rescoring
      if (finals.length > 0) {
        console.log('🎯 Processing final results:', finals.length, 'alternatives');
        
        // Use context-aware rescoring to pick the best alternative
        const best = refineAlternatives(finals, { prevText: finalSoFarRef.current });
        const nextFinal = autoClean((finalSoFarRef.current + " " + best.transcript).trim());
        
        console.log('✅ Best alternative selected:', best.transcript);
        finalSoFarRef.current = nextFinal;
        setFinalSoFar(nextFinal);
        
        if (onFinal) {
          onFinal(nextFinal);
        }
      }
    };

    rec.onend = () => {
      console.log('🎤 Speech recognition ended');
      setListening(false);
      
      if (keepAlive && !userStoppedRef.current) {
        // Implement exponential backoff to prevent rapid restart loops
        const now = Date.now();
        const timeSinceLastRestart = now - lastRestartRef.current;
        
        if (timeSinceLastRestart < 1000) {
          restartCountRef.current++;
        } else {
          restartCountRef.current = 0;
        }
        
        const backoffDelay = Math.min(1000 * Math.pow(2, restartCountRef.current), 5000);
        
        setTimeout(() => {
          try {
            if (recRef.current) {
              lastRestartRef.current = Date.now();
              rec.start();
              setListening(true);
            }
          } catch (error) {
            console.warn('Failed to restart speech recognition:', error);
          }
        }, backoffDelay);
      }
    };

    rec.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      setListening(false);
      
      const errorMessage = event.error || 'Unknown speech recognition error';
      if (onError) {
        onError(errorMessage);
      }
      
      // Don't auto-restart on certain error types
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.warn('Speech recognition permission denied - not restarting');
        return;
      }
    };

    recRef.current = rec;

    return () => {
      try {
        if (rec) {
          rec.stop();
        }
      } catch (error) {
        console.warn('Error stopping speech recognition:', error);
      }
      
      stopVUMeter();
      recRef.current = null;
    };
  }, [lang, keepAlive, onInterim, onFinal, onError]); // Removed finalSoFar to prevent infinite loop

  // VU Meter setup
  const startVUMeter = async () => {
    if (!enableMicConstraints) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });

      mediaStreamRef.current = stream;

      // Set up Web Audio API for VU meter
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      analyserRef.current = analyser;

      setVuMeter(prev => ({ ...prev, isActive: true }));
      updateVUMeter();

    } catch (error) {
      console.warn('Failed to setup microphone constraints:', error);
      if (onError) {
        onError('Microphone access failed. Please check permissions.');
      }
    }
  };

  const updateVUMeter = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume level
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / bufferLength;
    const level = Math.round((average / 255) * 100);

    setVuMeter(prev => ({ ...prev, level }));

    animationFrameRef.current = requestAnimationFrame(updateVUMeter);
  };

  const stopVUMeter = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    analyserRef.current = null;
    setVuMeter({ level: 0, isActive: false });
  };

  const start = async () => {
    if (!recRef.current) return;

    try {
      // Start VU meter first
      await startVUMeter();
      
      // Reset state
      finalSoFarRef.current = "";
      setFinalSoFar("");
      restartCountRef.current = 0;
      userStoppedRef.current = false; // Reset user stop flag
      
      // Start speech recognition
      recRef.current.start();
      setListening(true);
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      if (onError) {
        onError('Failed to start speech recognition');
      }
    }
  };

  const stop = () => {
    if (!recRef.current) return;

    try {
      userStoppedRef.current = true; // Mark as user-initiated stop
      recRef.current.stop();
      setListening(false);
      stopVUMeter();
    } catch (error) {
      console.warn('Error stopping speech recognition:', error);
    }
  };

  return {
    isSupported,
    listening,
    finalText: finalSoFar,
    vuMeter,
    start,
    stop,
    reset: () => {
      finalSoFarRef.current = "";
      setFinalSoFar("");
    }
  };
}

/**
 * Basic text cleaning for speech recognition output
 */
function autoClean(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/^\s+|\s+$/g, "") // Trim
    .replace(/^(\w)/, (match) => match.toUpperCase()); // Capitalize first letter
}
