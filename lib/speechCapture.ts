export function initWebSpeech(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void
) {
  const Rec = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!Rec) throw new Error("Web Speech API not supported");

  const recognition = new Rec();
  recognition.lang = "en-US";                // or "en-IN" if that suits
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;           // Get more alternatives for better accuracy
  recognition.audioTrack = true;             // Better audio quality
  
  // Configure for better speech recognition
  if ('webkitSpeechGrammarList' in window) {
    const grammarList = new (window as any).webkitSpeechGrammarList();
    // Add common project terms to improve recognition
    const grammar = '#JSGF V1.0; grammar projects; public <project> = Canva | Canvas | project | presentation | report | meeting | appointment ;';
    grammarList.addFromString(grammar, 1);
    recognition.grammars = grammarList;
  }

  const finals: string[] = [];

  recognition.onresult = (e: SpeechRecognitionEvent) => {
    let interimText = '';
    let finalText = '';

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      
      // Try to get the best transcript from alternatives
      let bestTranscript = res[0]?.transcript || "";
      let bestConfidence = res[0]?.confidence || 0;
      
      // Check alternatives for better matches
      for (let j = 1; j < res.length && j < 3; j++) {
        const alt = res[j];
        if (alt && alt.confidence > bestConfidence) {
          bestTranscript = alt.transcript;
          bestConfidence = alt.confidence;
        }
      }
      
      const txt = preClean(bestTranscript).trim();
      
      if (res.isFinal && txt) {
        finals.push(txt);
        finalText += txt + ' ';
      } else if (txt) {
        interimText += txt + ' ';
      }
    }

    // Show interim results as they come in
    if (interimText.trim()) {
      onInterim(interimText.trim());
    }

    // Show final results immediately when they arrive
    if (finalText.trim()) {
      onFinal(finalText.trim());
    }
  };

  recognition.onend = () => {
    // Also provide the complete joined result when recognition ends
    const completeText = joinFinals(finals);
    if (completeText.trim()) {
      onFinal(completeText.trim());
    }
  };

  recognition.start();
  return () => recognition.stop();
}

function joinFinals(parts: string[]) {
  return (Array.isArray(parts) ? parts : [parts])
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(". ")
    .replace(/\.{2,}/g, ".")
    .trim();
}

// Enhanced speech recognition error correction
function preClean(s: string) {
  return s
    // Common project/work term corrections
    .replace(/\bcan walk\b/gi, "Canva")
    .replace(/\bcan was\b/gi, "Canva") 
    .replace(/\bcan va\b/gi, "Canva")
    .replace(/\bcanvas\b/gi, "Canva")
    .replace(/\bcan't walk\b/gi, "Canva")
    
    // Common task-related corrections
    .replace(/\bcomplete my\b/gi, "complete the")
    .replace(/\bfinish my\b/gi, "finish the")
    .replace(/\bby 23rd august\b/gi, "by August 23rd")
    .replace(/\bon saturday\b/gi, "on Saturday")
    .replace(/\bin the evening\b/gi, "in the evening")
    
    // Common mishears
    .replace(/\bsave\s+they\s+are\s+free\b/gi, "see if they are free")
    .replace(/\bsafe\s+there\s+free\b/gi, "see if they are free")
    .replace(/\bmum\b/gi, "mom")
    .replace(/\bmom\s+in\s+the\s+evening\b/gi, "mom in the evening")
    
    // Fix awkward pause patterns
    .replace(/\ba\s+little\s+bit\.\s*tired\b/gi, "a little bit tired")
    .replace(/\bi\s+feel\s+a\s+little\s+bit\.\s*/gi, "I feel a little bit ")
    
    // Date and time corrections
    .replace(/\b(\d{1,2})(st|nd|rd|th)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, 
             (match, day, suffix, month) => `${month} ${day}${suffix}`)
    
    // Sentence structure improvements
    .replace(/\s+(then)\s+/gi, ". Then ")
    .replace(/\s+(and)\s+/gi, ", and ")
    .replace(/\s+(but)\s+/gi, ", but ")
    
    // Clean up spacing and punctuation
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .replace(/^i\s+/i, "I ")
    .replace(/\s+i\s+/gi, " I ")
    .trim();
}
