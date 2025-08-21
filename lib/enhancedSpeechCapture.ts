/**
 * Enhanced Speech Capture with better error correction and processing
 * Specifically designed for Quick Jot feature
 */

export interface SpeechConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  noiseReduction?: boolean;
}

export function initEnhancedWebSpeech(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  config: SpeechConfig = {}
) {
  const Rec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!Rec) throw new Error("Web Speech API not supported");

  const recognition = new Rec();
  
  // Enhanced configuration
  recognition.lang = config.language || "en-US";
  recognition.continuous = config.continuous ?? true;
  recognition.interimResults = config.interimResults ?? true;
  recognition.maxAlternatives = config.maxAlternatives || 5;
  
  // Request better audio quality
  if ('audioTrack' in recognition) {
    recognition.audioTrack = true;
  }
  
  // Add grammar hints for better recognition
  if ('webkitSpeechGrammarList' in window) {
    const grammarList = new (window as any).webkitSpeechGrammarList();
    const grammar = `
      #JSGF V1.0; 
      grammar quickjot; 
      public <action> = call | email | buy | finish | complete | schedule | book | pay | renew | write | draft | prepare ;
      public <project> = Canva | Canvas | presentation | report | project | meeting | appointment ;
      public <time> = morning | afternoon | evening | tonight | tomorrow | today | Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday ;
      public <person> = mom | dad | John | Sarah | team | client | boss ;
    `;
    grammarList.addFromString(grammar, 1);
    recognition.grammars = grammarList;
  }

  const finals: string[] = [];
  let lastInterimTime = 0;

  recognition.onresult = (e: SpeechRecognitionEvent) => {
    let interimText = '';
    let finalText = '';

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      
      // Get best transcript from alternatives using smart selection
      const bestTranscript = selectBestAlternative(res);
      const cleanedText = enhancedClean(bestTranscript).trim();
      
      if (res.isFinal && cleanedText) {
        finals.push(cleanedText);
        finalText += cleanedText + ' ';
      } else if (cleanedText) {
        interimText += cleanedText + ' ';
      }
    }

    // Throttle interim results to avoid UI spam
    const now = Date.now();
    if (interimText.trim() && (now - lastInterimTime > 200)) {
      lastInterimTime = now;
      onInterim(interimText.trim());
    }

    // Provide final results immediately
    if (finalText.trim()) {
      onFinal(finalText.trim());
    }
  };

  recognition.onend = () => {
    // Provide complete result when recognition ends
    const completeText = joinAndCleanFinals(finals);
    if (completeText.trim()) {
      onFinal(completeText.trim());
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    // Don't stop on network errors, retry instead
    if (event.error === 'network' || event.error === 'audio-capture') {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Failed to restart recognition:', e);
        }
      }, 1000);
    }
  };

  recognition.start();
  return () => {
    try {
      recognition.stop();
    } catch (e) {
      console.warn('Error stopping recognition:', e);
    }
  };
}

/**
 * Smart alternative selection based on confidence and context
 */
function selectBestAlternative(result: SpeechRecognitionResult): string {
  if (!result || result.length === 0) return "";
  
  let bestAlternative = result[0];
  let bestScore = (result[0]?.confidence || 0) * 0.8; // Base score with confidence bias
  
  // Check other alternatives for better contextual matches
  for (let i = 1; i < result.length && i < 5; i++) {
    const alt = result[i];
    if (!alt) continue;
    
    let score = alt.confidence || 0;
    
    // Boost score for common words/phrases that are often misheard
    const text = alt.transcript.toLowerCase();
    if (text.includes('canva') || text.includes('canvas')) score += 0.3;
    if (text.includes('mom') && !text.includes('mum')) score += 0.2;
    if (text.includes('complete the') || text.includes('finish the')) score += 0.1;
    if (text.includes('august') || text.includes('saturday')) score += 0.1;
    
    // Penalize obviously wrong alternatives
    if (text.includes('can walk') && !text.includes('canva')) score -= 0.4;
    if (text.includes('can was') || text.includes('can\'t walk')) score -= 0.3;
    
    if (score > bestScore) {
      bestAlternative = alt;
      bestScore = score;
    }
  }
  
  return bestAlternative?.transcript || "";
}

/**
 * Enhanced text cleaning with context-aware corrections
 */
function enhancedClean(text: string): string {
  if (!text) return "";
  
  return text
    // Project name corrections (most important for your use case)
    .replace(/\b(can walk|can was|can va|can't walk|can't was)\b/gi, "Canva")
    .replace(/\bcanvas project\b/gi, "Canva project")
    .replace(/\bcan of a project\b/gi, "Canva project")
    
    // Grammar improvements
    .replace(/\bcomplete my\b/gi, "complete the")
    .replace(/\bfinish my\b/gi, "finish the")
    .replace(/\bdo my\b/gi, "do the")
    
    // Date/time normalization
    .replace(/\b(\d{1,2})(st|nd|rd|th)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, 
             (match, day, suffix, month) => `${month} ${day}${suffix}`)
    .replace(/\bon (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, 
             (match, day) => `on ${day.charAt(0).toUpperCase() + day.slice(1)}`)
    
    // Common speech patterns
    .replace(/\bmum\b/gi, "mom")
    .replace(/\bum+\s+/gi, "")  // Remove filler words
    .replace(/\buh+\s+/gi, "")
    .replace(/\blike\s+/gi, "")
    .replace(/\byou know\s+/gi, "")
    
    // Fix awkward pauses that create periods
    .replace(/\ba\s+little\s+bit\.\s*tired\b/gi, "a little bit tired")
    .replace(/\bi\s+feel\s+a\s+little\s+bit\.\s*/gi, "I feel a little bit ")
    .replace(/\.\s*and\s+/gi, ", and ")
    .replace(/\.\s*but\s+/gi, ", but ")
    
    // Sentence structure
    .replace(/\bi\s+need\s+to\s+/gi, "I need to ")
    .replace(/\bi\s+have\s+to\s+/gi, "I have to ")
    .replace(/\bi\s+feel\s+/gi, "I feel ")
    
    // Clean up spacing and punctuation
    .replace(/\s+/g, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+\./g, ".")
    .replace(/\.\s*,/g, ",")
    .trim();
}

/**
 * Join final results with smart punctuation
 */
function joinAndCleanFinals(parts: string[]): string {
  if (!Array.isArray(parts) || parts.length === 0) return "";
  
  return parts
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(". ")
    .replace(/\.{2,}/g, ".")
    .replace(/\.\s*\./g, ".")
    // Ensure proper sentence endings
    .replace(/([^.!?])\s*$/, "$1.")
    .trim();
}

/**
 * Test speech recognition quality
 */
export async function testSpeechQuality(): Promise<{
  isSupported: boolean;
  hasGrammarSupport: boolean;
  hasAudioTrack: boolean;
  recommendedSettings: SpeechConfig;
}> {
  const Rec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  
  return {
    isSupported: !!Rec,
    hasGrammarSupport: 'webkitSpeechGrammarList' in window,
    hasAudioTrack: Rec && 'audioTrack' in new Rec(),
    recommendedSettings: {
      language: "en-US",
      continuous: true,
      interimResults: true,
      maxAlternatives: 5,
      noiseReduction: true
    }
  };
}
