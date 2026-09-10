/**
 * Intelligent Question Duplication Detection Engine
 * Works across both client-side React components and server-side Express handlers.
 * Supports Bengali text, KaTeX/LaTeX math equations, and option comparisons.
 */

/**
 * Normalizes text for comparison by:
 * - Removing LaTeX formatting ($...$, \frac, \sqrt, etc.)
 * - Normalizing Bengali and English digits
 * - Stripping punctuation, whitespace, and case differences
 */
export function normalizeTextForComparison(rawText: string): string {
  if (!rawText) return '';

  let text = rawText.toLowerCase();

  // Strip LaTeX wrappers
  text = text.replace(/\$\$[\s\S]*?\$\$/g, ' '); // display math
  text = text.replace(/\$([^\$]+)\$/g, '$1');    // inline math
  text = text.replace(/\\[a-zA-Z]+/g, ' ');      // commands like \frac, \sqrt
  text = text.replace(/[\{\}\[\]\(\)\^\_\=\+\-\*\/\\|]/g, ' '); // math symbols

  // Normalize Bengali digits to English digits
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  bnDigits.forEach((bn, idx) => {
    text = text.replaceAll(bn, String(idx));
  });

  // Strip punctuation and special characters (including Bengali Dari '।')
  text = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"“”‘’।॥]/g, ' ');

  // Collapse multiple whitespaces
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Generates character n-grams (sub-tokens) for fuzzy text comparison
 * Highly effective for Bengali language morphology and typo detection.
 */
function getNgrams(text: string, n = 3): Set<string> {
  const ngrams = new Set<string>();
  const padded = `  ${text}  `;
  for (let i = 0; i <= padded.length - n; i++) {
    ngrams.add(padded.substring(i, i + n));
  }
  return ngrams;
}

/**
 * Calculates Jaccard similarity of character n-grams (0.0 to 1.0)
 */
export function calculateNgramSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeTextForComparison(text1);
  const norm2 = normalizeTextForComparison(text2);

  if (norm1 === norm2 && norm1.length > 0) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const ngrams1 = getNgrams(norm1, 3);
  const ngrams2 = getNgrams(norm2, 3);

  let intersectionSize = 0;
  ngrams1.forEach(ng => {
    if (ngrams2.has(ng)) intersectionSize++;
  });

  const unionSize = ngrams1.size + ngrams2.size - intersectionSize;
  if (unionSize === 0) return 0.0;

  return intersectionSize / unionSize;
}

/**
 * Calculates word-level token overlap similarity
 */
export function calculateWordOverlap(text1: string, text2: string): number {
  const norm1 = normalizeTextForComparison(text1);
  const norm2 = normalizeTextForComparison(text2);

  if (norm1 === norm2 && norm1.length > 0) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const words1 = new Set(norm1.split(' ').filter(w => w.length > 1));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 1));

  if (words1.size === 0 || words2.size === 0) return 0.0;

  let intersection = 0;
  words1.forEach(w => {
    if (words2.has(w)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  return intersection / union;
}

/**
 * Calculates similarity between two option lists
 */
export function calculateOptionsSimilarity(opts1?: string[], opts2?: string[]): number {
  if (!opts1 || !opts2 || opts1.length === 0 || opts2.length === 0) return 0;

  const clean1 = opts1.map(normalizeTextForComparison).filter(Boolean);
  const clean2 = opts2.map(normalizeTextForComparison).filter(Boolean);

  let matchCount = 0;
  clean1.forEach(o1 => {
    if (clean2.some(o2 => o1 === o2 || calculateNgramSimilarity(o1, o2) > 0.85)) {
      matchCount++;
    }
  });

  const maxOptions = Math.max(clean1.length, clean2.length);
  return maxOptions > 0 ? matchCount / maxOptions : 0;
}

export interface QuestionMatchResult {
  similarity: number; // 0.0 to 1.0
  isDuplicate: boolean;
  reason: string;
}

/**
 * Deeply compares two questions taking into account stem text, options, and subject
 */
export function compareQuestions(
  q1: { text: string; options?: string[]; subject?: string },
  q2: { text: string; options?: string[]; subject?: string },
  threshold = 0.72
): QuestionMatchResult {
  const norm1 = normalizeTextForComparison(q1.text);
  const norm2 = normalizeTextForComparison(q2.text);

  // Exact stem match
  if (norm1 === norm2 && norm1.length > 6) {
    return {
      similarity: 1.0,
      isDuplicate: true,
      reason: 'Exact question text match (100%)'
    };
  }

  const ngramSim = calculateNgramSimilarity(q1.text, q2.text);
  const wordSim = calculateWordOverlap(q1.text, q2.text);
  const optSim = calculateOptionsSimilarity(q1.options, q2.options);

  // Stem similarity combined weight: 60% n-gram + 40% word overlap
  const stemSim = (ngramSim * 0.6) + (wordSim * 0.4);

  // Subject matching bonus
  const sameSubject = q1.subject && q2.subject &&
    q1.subject.trim().toLowerCase() === q2.subject.trim().toLowerCase();

  let totalScore = stemSim;

  if (q1.options && q2.options && q1.options.length > 0 && q2.options.length > 0) {
    // 75% stem + 25% options
    totalScore = (stemSim * 0.75) + (optSim * 0.25);

    // If 3+ options match exactly and stem is moderately similar (> 0.6)
    if (optSim >= 0.75 && stemSim >= 0.55) {
      totalScore = Math.max(totalScore, 0.82);
    }
  }

  if (sameSubject && totalScore > 0.65) {
    totalScore = Math.min(1.0, totalScore + 0.05);
  }

  const isDuplicate = totalScore >= threshold;
  let reason = 'Distinct question';

  if (totalScore >= 0.90) {
    reason = `Nearly identical question stem & options (${Math.round(totalScore * 100)}% match)`;
  } else if (totalScore >= 0.75) {
    reason = `High question text & options similarity (${Math.round(totalScore * 100)}% match)`;
  } else if (totalScore >= threshold) {
    reason = `Probable duplicate question (${Math.round(totalScore * 100)}% match)`;
  }

  return {
    similarity: Math.round(totalScore * 100) / 100,
    isDuplicate,
    reason
  };
}

export interface DuplicateItemMatch<T = any> {
  question: T;
  similarity: number;
  reason: string;
}

/**
 * Searches a list of questions to find duplicates for a target question
 */
export function findDuplicatesInList<T extends { id?: string; text: string; options?: string[]; subject?: string; exam?: string }>(
  target: { text: string; options?: string[]; subject?: string; id?: string },
  list: T[],
  threshold = 0.72,
  excludeId?: string
): DuplicateItemMatch<T>[] {
  if (!target.text || !target.text.trim()) return [];

  const matches: DuplicateItemMatch<T>[] = [];

  for (const item of list) {
    if (excludeId && item.id === excludeId) continue;
    if (target.id && item.id === target.id) continue;

    const res = compareQuestions(target, item, threshold);
    if (res.isDuplicate) {
      matches.push({
        question: item,
        similarity: res.similarity,
        reason: res.reason
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Scans an entire list of questions and groups duplicate clusters
 */
export function scanQuestionBankForDuplicateClusters<T extends { id: string; text: string; options?: string[]; subject?: string; exam?: string }>(
  questions: T[],
  threshold = 0.75
): Array<{
  primaryQuestion: T;
  duplicates: Array<{ question: T; similarity: number; reason: string }>;
  highestSimilarity: number;
}> {
  const visited = new Set<string>();
  const clusters: Array<{
    primaryQuestion: T;
    duplicates: Array<{ question: T; similarity: number; reason: string }>;
    highestSimilarity: number;
  }> = [];

  for (let i = 0; i < questions.length; i++) {
    const q1 = questions[i];
    if (visited.has(q1.id)) continue;

    const matchedDupes: Array<{ question: T; similarity: number; reason: string }> = [];

    for (let j = i + 1; j < questions.length; j++) {
      const q2 = questions[j];
      if (visited.has(q2.id)) continue;

      const res = compareQuestions(q1, q2, threshold);
      if (res.isDuplicate) {
        visited.add(q2.id);
        matchedDupes.push({
          question: q2,
          similarity: res.similarity,
          reason: res.reason
        });
      }
    }

    if (matchedDupes.length > 0) {
      visited.add(q1.id);
      const highestSim = Math.max(...matchedDupes.map(d => d.similarity));
      clusters.push({
        primaryQuestion: q1,
        duplicates: matchedDupes,
        highestSimilarity: highestSim
      });
    }
  }

  return clusters.sort((a, b) => b.highestSimilarity - a.highestSimilarity);
}
