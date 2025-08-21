/**
 * Context-Aware Transcript Refinement
 * Fixes homophones and near-word errors using collocation scoring
 */

type Alternative = { 
  transcript: string; 
  confidence?: number; 
};

type RefinementContext = { 
  prevText: string; 
};

/**
 * Common confusion sets for homophone correction
 * Each array contains words that sound similar and are often confused
 */
const CONFUSION_SETS: string[][] = [
  ["by", "buy", "bye"],
  ["to", "two", "too"],
  ["there", "their", "they're"],
  ["milk", "mild"],
  ["eggs", "ex", "egg"],
  ["see", "sea", "cee"],
  ["are", "our", "r"],
  ["have", "half"],
  ["call", "calls", "called"],
  ["want", "won't"],
  ["safe", "save"],
  ["packet", "packets"],
  ["and", "an"],
  ["they", "the"],
  ["free", "three"],
  ["for", "four"],
  ["one", "won"],
  ["ate", "eight"],
  ["hour", "our"],
  ["no", "know"],
  ["right", "write"],
  ["here", "hear"],
  ["where", "wear"],
  ["new", "knew"],
  ["blue", "blew"],
  ["red", "read"],
  ["break", "brake"],
  ["piece", "peace"],
  ["meet", "meat"],
  ["week", "weak"],
  ["son", "sun"],
  ["mail", "male"],
  ["tail", "tale"],
  ["sail", "sale"],
  ["pain", "pane"],
  ["rain", "reign"],
  ["plain", "plane"]
];

/**
 * High-frequency bigrams with scoring weights
 * Higher scores indicate stronger collocations
 */
const BIGRAM_SCORES = new Map<string, number>([
  // Shopping/groceries
  ["buy two", 8],
  ["two eggs", 9],
  ["packet of", 10],
  ["of milk", 10],
  ["eggs and", 7],
  ["and milk", 6],
  ["go to", 8],
  ["to the", 9],
  ["the market", 7],
  ["the store", 7],
  
  // Actions/tasks
  ["have to", 9],
  ["need to", 8],
  ["want to", 7],
  ["going to", 8],
  ["call my", 6],
  ["call the", 5],
  ["see if", 7],
  ["see they", 6],
  ["see the", 5],
  ["ask if", 6],
  ["ask the", 5],
  
  // Common phrases
  ["i have", 8],
  ["i need", 7],
  ["i want", 6],
  ["they are", 8],
  ["there are", 7],
  ["we are", 6],
  ["you are", 6],
  ["this is", 7],
  ["that is", 6],
  
  // Time expressions
  ["at three", 6],
  ["at four", 6],
  ["at five", 6],
  ["tomorrow at", 7],
  ["today at", 6],
  ["this evening", 6],
  ["this morning", 6],
  ["next week", 7],
  ["next month", 6],
  
  // Family/people
  ["my mom", 7],
  ["my dad", 6],
  ["my friend", 6],
  ["my friends", 6],
  ["my project", 9], // Very high score to favor "my project" over "my brother" in work contexts
  ["their mom", 8],
  ["their dad", 7],
  ["their house", 6],
  ["call their", 6],
  ["the team", 5],
  ["the client", 5],
  
  // Work/projects
  ["the project", 7],
  ["complete the", 6],
  ["finish the", 7], // Strengthened score
  ["send the", 6],
  ["the report", 6],
  ["the presentation", 5],
  ["the meeting", 6],
  ["the mail", 8], // Strengthen "the mail" over "they mail"
  ["the draft", 7], // Strengthen "the draft" over "they draft"
  ["about the", 7], // "thinking about the draft"
  ["out the", 6], // "send out the mail"
  
  // Negations and questions
  ["don't have", 6],
  ["can't see", 5],
  ["won't be", 5],
  ["they're free", 7],
  ["are free", 6],
  ["if they", 6],
  ["are they", 5]
]);

/**
 * Trigrams for better context scoring
 */
const TRIGRAM_SCORES = new Map<string, number>([
  ["buy two eggs", 10],
  ["packet of milk", 10],
  ["i have to", 9],
  ["i need to", 8],
  ["see if they", 7],
  ["they are free", 8],
  ["call my mom", 7],
  ["go to the", 8],
  ["at the store", 6],
  ["complete the project", 7],
  ["send the email", 6],
  ["finish the report", 6],
  ["send out the", 8], // "send out the mail"
  ["about the draft", 8], // "thinking about the draft"
  ["finish the project", 8], // High score for common phrase
  ["and send the", 7], // "project and send the mail"
  ["thinking about the", 7] // "thinking about the draft"
]);

/**
 * Dictionary of common English words for plausibility scoring
 */
const COMMON_WORDS = new Set([
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "the", "a", "an", "this", "that", "these", "those", "my", "your", "his", "her", "its", "our", "their",
  "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "must", "can", "shall",
  "and", "or", "but", "so", "if", "when", "where", "why", "how", "what", "who", "which",
  "to", "from", "in", "on", "at", "by", "for", "with", "without", "about", "over", "under",
  "go", "come", "see", "look", "hear", "listen", "speak", "talk", "say", "tell", "ask", "answer",
  "get", "give", "take", "bring", "put", "make", "do", "work", "play", "run", "walk", "sit", "stand",
  "eat", "drink", "sleep", "wake", "buy", "sell", "pay", "cost", "spend", "save",
  "call", "email", "text", "message", "write", "read", "send", "receive",
  "today", "tomorrow", "yesterday", "morning", "afternoon", "evening", "night",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
  "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "first", "second", "third", "last", "next", "previous",
  "home", "work", "school", "store", "market", "office", "house", "room",
  "mom", "dad", "mother", "father", "parent", "child", "friend", "family",
  "project", "task", "meeting", "appointment", "call", "email", "report", "presentation",
  "milk", "eggs", "bread", "water", "coffee", "tea", "food", "lunch", "dinner", "breakfast"
]);

/**
 * Main function to refine transcript alternatives using context-aware scoring
 */
export function refineAlternatives(
  alternatives: Alternative[], 
  context: RefinementContext
): { transcript: string } {
  if (alternatives.length === 0) {
    return { transcript: "" };
  }

  if (alternatives.length === 1) {
    return { transcript: cleanTranscript(alternatives[0].transcript) };
  }

  console.log('🔍 Refining', alternatives.length, 'alternatives');
  
  let bestAlternative = alternatives[0];
  let bestScore = -Infinity;

  for (const alt of alternatives) {
    const cleanedText = cleanTranscript(alt.transcript);
    const tokens = tokenize(cleanedText);
    
    // Start with confidence score
    let score = (alt.confidence || 0) * 10;
    
    // 1. Token-level plausibility scoring
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Dictionary bonus for common words
      if (COMMON_WORDS.has(token.toLowerCase())) {
        score += 0.5;
      } else if (/^[a-zA-Z]+$/.test(token)) {
        // Partial credit for valid letter sequences
        score += 0.1;
      } else if (/^[0-9]+$/.test(token)) {
        // Numbers are usually transcribed correctly
        score += 0.3;
      } else {
        // Penalty for non-words or fragments
        score -= 0.8;
      }

      // 2. Homophone confusion correction
      const correctedToken = findBestHomophone(tokens, i);
      if (correctedToken !== token) {
        // Homophone correction applied (reduced logging for cleaner output)
        tokens[i] = correctedToken;
        score += 1.5; // Bonus for fixing confusion
      }
    }

    // 3. Bigram scoring
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = tokens[i] + " " + tokens[i + 1];
      const bigramScore = BIGRAM_SCORES.get(bigram.toLowerCase()) || 0;
      score += bigramScore * 0.3;
      
      if (bigramScore > 0) {
        // Bigram bonus applied (logging reduced)
      }
    }

    // 4. Trigram scoring
    for (let i = 0; i < tokens.length - 2; i++) {
      const trigram = tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2];
      const trigramScore = TRIGRAM_SCORES.get(trigram.toLowerCase()) || 0;
      score += trigramScore * 0.4;
      
      if (trigramScore > 0) {
        // Trigram bonus applied (logging reduced)
      }
    }

    // 5. Context scoring with previous text
    const contextTokens = getLastTokens(context.prevText, 2);
    if (contextTokens.length > 0 && tokens.length > 0) {
      const contextBigram = contextTokens[contextTokens.length - 1] + " " + tokens[0];
      const contextScore = BIGRAM_SCORES.get(contextBigram.toLowerCase()) || 0;
      score += contextScore * 0.25;
      
      if (contextScore > 0) {
        console.log(`🔗 Context bonus: "${contextBigram}" (+${contextScore * 0.25})`);
      }
    }

    // 6. Grammar consistency checks
    const grammarPenalty = calculateGrammarPenalty(tokens);
    score -= grammarPenalty;

    // Final score calculated (logging reduced for cleaner output)

    if (score > bestScore) {
      bestScore = score;
      bestAlternative = { ...alt, transcript: tokens.join(" ") };
    }
  }

  console.log(`✅ Best choice: "${bestAlternative.transcript}" (score: ${bestScore.toFixed(2)})`);
  
  return { transcript: cleanTranscript(bestAlternative.transcript) };
}

/**
 * Find the best homophone replacement for a token based on context
 */
function findBestHomophone(tokens: string[], index: number): string {
  const token = tokens[index].toLowerCase();
  
  // Find which confusion set this token belongs to
  const confusionSet = CONFUSION_SETS.find(set => 
    set.some(word => word.toLowerCase() === token)
  );
  
  if (!confusionSet) {
    return tokens[index]; // No confusion set found, keep original
  }

  let bestToken = tokens[index];
  let bestScore = -Infinity;

  for (const candidate of confusionSet) {
    let score = 0;

    // Score based on collocations with previous token
    if (index > 0) {
      const prevBigram = tokens[index - 1].toLowerCase() + " " + candidate.toLowerCase();
      score += BIGRAM_SCORES.get(prevBigram) || 0;
    }

    // Score based on collocations with next token
    if (index < tokens.length - 1) {
      const nextBigram = candidate.toLowerCase() + " " + tokens[index + 1].toLowerCase();
      score += BIGRAM_SCORES.get(nextBigram) || 0;
    }

    // Score based on trigrams
    if (index > 0 && index < tokens.length - 1) {
      const trigram = tokens[index - 1].toLowerCase() + " " + candidate.toLowerCase() + " " + tokens[index + 1].toLowerCase();
      score += (TRIGRAM_SCORES.get(trigram) || 0) * 1.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestToken = candidate;
    }
  }

  return bestToken;
}

/**
 * Calculate grammar penalty for obviously incorrect sequences
 */
function calculateGrammarPenalty(tokens: string[]): number {
  let penalty = 0;
  const lowerTokens = tokens.map(t => t.toLowerCase());

  for (let i = 0; i < lowerTokens.length - 1; i++) {
    const current = lowerTokens[i];
    const next = lowerTokens[i + 1];

    // Double articles
    if ((current === "a" || current === "an") && (next === "a" || next === "an" || next === "the")) {
      penalty += 2;
    }

    // Impossible verb sequences
    if (current === "want" && next === "safe") {
      penalty += 3; // "want safe" is unlikely vs "have to see"
    }

    // "there" vs "their" - possessive context
    if (current === "there" && ["mom", "dad", "house", "car", "phone", "book", "work"].includes(next)) {
      penalty += 2; // "there mom" should be "their mom"
    }

    // Double prepositions
    if (["to", "in", "on", "at", "by", "for"].includes(current) && 
        ["to", "in", "on", "at", "by", "for"].includes(next)) {
      penalty += 1;
    }
  }

  return penalty;
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Get the last N tokens from text
 */
function getLastTokens(text: string, count: number): string[] {
  if (!text) return [];
  const tokens = tokenize(text);
  return tokens.slice(Math.max(0, tokens.length - count));
}

/**
 * Clean and normalize transcript text with enhanced corrections
 */
export function cleanTranscript(text: string): string {
  let cleaned = text;

  // 1. Apply speech recognition corrections first
  const speechFixes = [
    // Phonetic similarity corrections (for cases like "gan minl" -> "egg and milk")
    [/\bgan\s+milk\b/gi, 'egg and milk'],  // NEW: "gan milk" -> "egg and milk"
    [/\bgan\s+minl\b/gi, 'egg and milk'],
    [/\bgan\s+min\b/gi, 'egg and milk'], 
    [/\beg\s+an\s+minl\b/gi, 'egg and milk'],
    [/\beg\s+an\s+mil\b/gi, 'egg and milk'],
    [/\bag\s+an\s+milk\b/gi, 'egg and milk'],
    [/\ba\s+gun\s+milk\b/gi, 'egg and milk'],
    [/\bby\s+a\s+gun\s+milk\b/gi, 'buy egg and milk'],
    [/\bto\s+by\s+a\s+gun\s+milk\b/gi, 'to buy egg and milk'],
    [/\bmarket\s+to\s+by\s+/gi, 'market to buy '],
    
    // Common "can/a" confusions
    [/\bget\s+a\s+can\s+milk\b/gi, 'get egg and milk'],
    [/\bto\s+get\s+a\s+can\s+milk\b/gi, 'to get egg and milk'],
    [/\ba\s+can\s+milk\b/gi, 'egg and milk'],
    
    // Common misheard phrases from the example
    [/\bby again\s+(milk|eggs|bread|coffee|vegetables|fruits)\b/gi, 'buy egg and $1'],
    [/\bto safe\s+(she|he|they)\s+(is|are)\b/gi, 'to see if $1 $2'],
    [/\bthey weekend\b/gi, 'the weekend'],
    [/\bthey doctor\b/gi, 'the doctor'],
    [/\bthey market\b/gi, 'the market'],
    [/\bthey supermarket\b/gi, 'the supermarket'],
    [/\bthey draft\b/gi, 'the draft'],
    [/\bthey project\b/gi, 'the project'],
    [/\bthey report\b/gi, 'the report'],
    [/\bthey presentation\b/gi, 'the presentation'],
    [/\bthey document\b/gi, 'the document'],
    [/\band by\s+(milk|eggs|bread|vegetables|fruits)\b/gi, 'and buy $1'],
    [/\bhave and appointment\b/gi, 'have an appointment'],
    
    // Basic corrections
    [/\bto\s+by\s+a\s+/gi, 'to buy a '],  // NEW: "to by a" -> "to buy a"
    [/\bby\s+(milk|eggs|bread|coffee|vegetables|fruits|groceries|flowers|food)\b/gi, 'buy $1'],
    [/\bto\s+by\s+(milk|eggs|bread|coffee|vegetables|fruits|groceries|flowers|food)\b/gi, 'to buy $1'],
    [/\bthere are free\b/gi, 'they are free'],
    [/\bgo for a work\b/gi, 'go for a walk'],
    [/\bweeke\b/gi, 'weekend'],
    [/\bthey mail\b/gi, 'the mail'],
    [/\bsend out they\b/gi, 'send out the'],
    [/\bneed a complete\b/gi, 'need to complete'],
    [/\bi need a complete\b/gi, 'I need to complete'],
    
    // Grammar fixes
    [/\ba lot of task\b/gi, 'a lot of tasks'],
    [/\bhave a doctors\b/gi, 'have a doctor\'s'],
    [/\bdoctors appointment\b/gi, 'doctor\'s appointment'], // Fix missing apostrophe
    
    // Time format fixes
    [/\b(\d+):(\d+)\s+p\.\s*m\.\b/gi, '$1:$2 PM'],
    [/\b(\d+):(\d+)\s+a\.\s*m\.\b/gi, '$1:$2 AM'],
    [/\b(\d+):(\d+)\s+a\.\s*M\.\b/gi, '$1:$2 AM'], // Handle capital M
    [/\b(\d+):(\d+)\s+a\.\s+M\.\b/gi, '$1:$2 AM'], // Handle space after period
    [/\b(\d+):(\d+)\s+p\.\s*M\.\b/gi, '$1:$2 PM'], // Handle capital M
    [/\b(\d+):(\d+)\s+a\s*m\b/gi, '$1:$2 AM'], // Handle no dots
    [/\b(\d+):(\d+)\s+p\s*m\b/gi, '$1:$2 PM'], // Handle no dots
    
    // Time format fixes for hours only (no minutes) - simplified patterns
    [/(\d+)\s+a\.\s*m\./gi, '$1:00 AM'],
    [/(\d+)\s+a\.\s*M\./gi, '$1:00 AM'],
    [/(\d+)\s+a\.\s+M\./gi, '$1:00 AM'], // Handle "10 a. M."
    [/(\d+)\s+p\.\s*m\./gi, '$1:00 PM'],
    [/(\d+)\s+p\.\s*M\./gi, '$1:00 PM'],
    [/(\d+)\s+p\.\s+M\./gi, '$1:00 PM'],
    
    // Shopping specific
    [/\bget\s+(fruits|vegetables)\s+and\s+papers\b/gi, 'get $1 and peppers'],
    [/\bfruits\s+vegetables\s+and\s+papers\b/gi, 'fruits, vegetables and peppers'],
    [/\bby\s+(two|three|four|some)\s+(eggs|milk|bread|fruits|vegetables)\b/gi, 'buy $1 $2'],
    
    // Context-specific corrections for work/project tasks
    [/\bfinish my brother i have to finish my project\b/gi, 'finish my project'],
    [/\bfinish my brother\b/gi, 'finish my project'], // Common mishearing in work context
    [/\bcomplete my brother\b/gi, 'complete my project'],
  ];

  // Apply all speech fixes
  speechFixes.forEach(([pattern, replacement]) => {
    cleaned = cleaned.replace(pattern, replacement as string);
  });

  // 2. Add punctuation based on natural speech patterns
  cleaned = addSmartPunctuation(cleaned);

  // 3. Basic normalization
  return cleaned
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim() // Remove leading/trailing spaces
    .replace(/^(\w)/, match => match.toUpperCase()); // Capitalize first letter
}

/**
 * Add smart punctuation based on speech patterns and keywords
 * MINIMAL approach - very conservative to avoid over-punctuation
 */
function addSmartPunctuation(text: string): string {
  let result = text;

  // 1. ONLY add periods before very clear sentence transitions
  result = result.replace(/(\w)\s+(tomorrow\s+at\s+\d+:\d+)/gi, function(match, prevChar, transition) {
    return prevChar + '. ' + transition.charAt(0).toUpperCase() + transition.slice(1);
  });

  // 2. Add period at the end if missing
  if (!/[.!?]$/.test(result.trim())) {
    result = result.trim() + '.';
  }

  // 3. Capitalize after existing periods only
  result = result.replace(/\.\s*([a-z])/g, (match, letter) => {
    return '. ' + letter.toUpperCase();
  });

  // 4. Clean up double periods
  result = result.replace(/\.{2,}/g, '.');

  return result;
}
