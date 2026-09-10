import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Question, Difficulty } from '../types';
import { analyzeQuestionMath, QuestionMathAnalysis } from './mathNormalizer';

export interface ParsedQuestionRow {
  // Canonical normalized LaTeX text
  text: string;
  options: string[];
  correctOptionIndex: number;
  correctOptionIndices: number[];
  isMultiSelect?: boolean;
  explanation: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  exam?: string;
  questionSource?: string;
  difficulty?: Difficulty;
  tags?: string[];
  rawRowIndex: number;
  isValid: boolean;
  validationError?: string;

  // Preserved raw original text before normalization
  rawText?: string;
  rawOptions?: string[];
  rawExplanation?: string;

  // Math validation analysis
  mathAnalysis?: QuestionMathAnalysis;
  mathStatus?: 'VALID' | 'AUTO_FIXED' | 'WARNING' | 'NO_MATH';
  mathWarnings?: string[];
  detectedFormulasCount?: number;

  // Duplication detection against existing database
  duplicateMatch?: {
    existingQuestion: any;
    similarity: number;
    reason: string;
  };
  duplicateResolution?: 'SKIP' | 'UPDATE' | 'IMPORT_ANYWAY';
}

export interface ParseSpreadsheetResult {
  questions: ParsedQuestionRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  detectedSubject?: string;
  detectedTopic?: string;
  headers: string[];
  totalMathFormulasDetected: number;
  autoFixedMathCount: number;
  warningMathCount: number;
}

/**
 * Normalizes header string to standard identifier
 */
function normalizeHeader(h: string): string {
  return (h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds index of matching column name from array of headers
 */
function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const normAlias = normalizeHeader(alias);
    const idx = normalizedHeaders.indexOf(normAlias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Helper to map single token (e.g. 'A', '1', 'ক', or exact text) to option index
 */
function resolveSingleTokenIndex(token: string, options: string[]): number {
  const clean = token.trim();
  if (!clean) return -1;

  // 1. Direct match with option text
  const directIdx = options.findIndex(
    opt => opt.trim().toLowerCase() === clean.toLowerCase()
  );
  if (directIdx !== -1) return directIdx;

  // 2. Letter / Number match (A-J / 1-10 / ক-ঞ)
  const upper = clean.toUpperCase();
  const letterMap: Record<string, number> = {
    'A': 0, 'OPTION 1': 0, 'OPTION1': 0, 'OPTION A': 0, 'OPT 1': 0, 'OPT1': 0, 'OPT A': 0, '1': 0, 'ক': 0, '১': 0, '(A)': 0, '[A]': 0, 'অপশন ১': 0, 'অপশন-১': 0,
    'B': 1, 'OPTION 2': 1, 'OPTION2': 1, 'OPTION B': 1, 'OPT 2': 1, 'OPT2': 1, 'OPT B': 1, '2': 1, 'খ': 1, '২': 1, '(B)': 1, '[B]': 1, 'অপশন ২': 1, 'অপশন-২': 1,
    'C': 2, 'OPTION 3': 2, 'OPTION3': 2, 'OPTION C': 2, 'OPT 3': 2, 'OPT3': 2, 'OPT C': 2, '3': 2, 'গ': 2, '৩': 2, '(C)': 2, '[C]': 2, 'অপশন ৩': 2, 'অপশন-৩': 2,
    'D': 3, 'OPTION 4': 3, 'OPTION4': 3, 'OPTION D': 3, 'OPT 4': 3, 'OPT4': 3, 'OPT D': 3, '4': 3, 'ঘ': 3, '৪': 3, '(D)': 3, '[D]': 3, 'অপশন ৪': 3, 'অপশন-৪': 3,
    'E': 4, 'OPTION 5': 4, 'OPTION5': 4, 'OPTION E': 4, 'OPT 5': 4, 'OPT5': 4, 'OPT E': 4, '5': 4, 'ঙ': 4, '৫': 4, '(E)': 4, '[E]': 4, 'অপশন ৫': 4, 'অপশন-৫': 4,
    'F': 5, 'OPTION 6': 5, 'OPTION6': 5, 'OPTION F': 5, 'OPT 6': 5, 'OPT6': 5, 'OPT F': 5, '6': 5, 'চ': 5, '৬': 5, '(F)': 5, '[F]': 5,
    'G': 6, 'OPTION 7': 6, 'OPTION7': 6, 'OPTION G': 6, 'OPT 7': 6, 'OPT7': 6, 'OPT G': 6, '7': 6, 'ছ': 6, '৭': 6, '(G)': 6, '[G]': 6,
    'H': 7, 'OPTION 8': 7, 'OPTION8': 7, 'OPTION H': 7, 'OPT 8': 7, 'OPT8': 7, 'OPT H': 7, '8': 7, 'জ': 7, '৮': 7, '(H)': 7, '[H]': 7,
  };

  if (letterMap[upper] !== undefined && letterMap[upper] < options.length) {
    return letterMap[upper];
  }

  // Check normalized 'OPTION X' where X is digit or letter
  const optMatch = upper.match(/^(?:OPTION|OPT|অপশন)[\s\-_]*([1-8A-H১-৮])/i);
  if (optMatch) {
    const rawVal = optMatch[1];
    if (letterMap[rawVal] !== undefined && letterMap[rawVal] < options.length) {
      return letterMap[rawVal];
    }
  }

  // 3. Prefix match like "A) ..." or "(1) ..."
  const prefixMatch = clean.match(/^[\(\[]?([A-Ha-h1-8])[\)\]\.\:\-\s]/);
  if (prefixMatch) {
    const char = prefixMatch[1].toUpperCase();
    if (letterMap[char] !== undefined && letterMap[char] < options.length) {
      return letterMap[char];
    }
  }

  // 4. Substring inclusion match in options
  for (let i = 0; i < options.length; i++) {
    if (options[i] && clean && (options[i].toLowerCase().includes(clean.toLowerCase()) || clean.toLowerCase().includes(options[i].toLowerCase()))) {
      return i;
    }
  }

  return -1;
}

/**
 * Resolves multiple or single correct option indices (e.g. "A, C", "1 & 3", "Option A and B")
 */
export function resolveCorrectOptionIndices(answerRaw: string, options: string[]): number[] {
  if (!answerRaw || !options || options.length === 0) return [0];
  const cleanAns = answerRaw.trim();

  // If answer matches full option text exactly first
  const exactIdx = options.findIndex(opt => opt.trim().toLowerCase() === cleanAns.toLowerCase());
  if (exactIdx !== -1) return [exactIdx];

  // Split by delimiter: commas, semicolons, ' and ', '&', ' ও ' (Bengali and), '+'
  const tokens = cleanAns
    .split(/[,;\+&]|\band\b|\bও\b/i)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const matchedIndices: number[] = [];

  for (const token of tokens) {
    const idx = resolveSingleTokenIndex(token, options);
    if (idx !== -1 && !matchedIndices.includes(idx)) {
      matchedIndices.push(idx);
    }
  }

  if (matchedIndices.length > 0) {
    return matchedIndices.sort((a, b) => a - b);
  }

  // Fallback single token check on the whole string
  const singleIdx = resolveSingleTokenIndex(cleanAns, options);
  return singleIdx !== -1 ? [singleIdx] : [0];
}

/**
 * Resolves the primary correct option index (0, 1, 2, 3...) from the answer value
 */
export function resolveCorrectOptionIndex(answerRaw: string, options: string[]): number {
  const indices = resolveCorrectOptionIndices(answerRaw, options);
  return indices[0] ?? 0;
}

/**
 * Parse rows matrix (array of string arrays) into validated & normalized Question rows
 */
export function parseRowsMatrix(
  rows: string[][],
  defaultSubject: string = 'Mathematics',
  defaultTopic: string = 'Ratio & Proportion',
  defaultDifficulty: Difficulty = 'Medium'
): ParseSpreadsheetResult {
  if (!rows || rows.length === 0) {
    return {
      questions: [],
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      headers: [],
      totalMathFormulasDetected: 0,
      autoFixedMathCount: 0,
      warningMathCount: 0
    };
  }

  // Filter out completely empty rows
  const cleanRows = rows.filter(r => r.some(cell => (cell || '').trim().length > 0));
  if (cleanRows.length === 0) {
    return {
      questions: [],
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      headers: [],
      totalMathFormulasDetected: 0,
      autoFixedMathCount: 0,
      warningMathCount: 0
    };
  }

  const rawHeaders = cleanRows[0].map(h => (h || '').trim());
  const dataRows = cleanRows.slice(1);

  // Column aliases mapping
  const colQuestion = findColumnIndex(rawHeaders, ['questions', 'question', 'questiontext', 'q', 'title', 'problem', 'mcq', 'stem', 'প্রশ্ন']);
  const colOpt1 = findColumnIndex(rawHeaders, ['option1', 'option 1', 'option a', 'a', 'opt1', 'ক', '(a)', 'অপশন ১', 'অপশন-১']);
  const colOpt2 = findColumnIndex(rawHeaders, ['option2', 'option 2', 'option b', 'b', 'opt2', 'খ', '(b)', 'অপশন ২', 'অপশন-২']);
  const colOpt3 = findColumnIndex(rawHeaders, ['option3', 'option 3', 'option c', 'c', 'opt3', 'গ', '(c)', 'অপশন ৩', 'অপশন-৩']);
  const colOpt4 = findColumnIndex(rawHeaders, ['option4', 'option 4', 'option d', 'd', 'opt4', 'ঘ', '(d)', 'অপশন ৪', 'অপশন-৪']);
  const colOpt5 = findColumnIndex(rawHeaders, ['option5', 'option 5', 'option e', 'e', 'opt5', 'ঙ', '(e)', 'অপশন ৫', 'অপশন-৫']);
  const colOpt6 = findColumnIndex(rawHeaders, ['option6', 'option 6', 'option f', 'f', 'opt6', 'চ', '(f)']);
  const colOpt7 = findColumnIndex(rawHeaders, ['option7', 'option 7', 'option g', 'g', 'opt7', 'ছ', '(g)']);
  const colOpt8 = findColumnIndex(rawHeaders, ['option8', 'option 8', 'option h', 'h', 'opt8', 'জ', '(h)']);
  const colAnswer = findColumnIndex(rawHeaders, ['answer', 'correctanswer', 'correct option', 'correct options', 'correct', 'ans', 'right answer', 'answers', 'উত্তর', 'সঠিক উত্তর']);
  const colSolution = findColumnIndex(rawHeaders, ['solution / explanation', 'solutionexplanation', 'solution', 'explanation', 'solve', 'details', 'ব্যাখ্যা', 'sol', 'সমাধান', 'ব্যাখ্যা / সমাধান']);
  const colQuestionSource = findColumnIndex(rawHeaders, ['question source', 'questionsource', 'source', 'উৎস', 'প্রশ্নের উৎস', 'উৎস/রেফারেন্স']);
  const colExam = findColumnIndex(rawHeaders, ['exam name', 'examname', 'exam', 'পরীক্ষা', 'পরীক্ষার নাম']);
  const colTopic = findColumnIndex(rawHeaders, ['topic name', 'topicname', 'topic', 'subcategory', 'chapter', 'অধ্যায়', 'টপিক']);
  const colSubject = findColumnIndex(rawHeaders, ['subject', 'category', 'বিষয়', 'বিষয়']);
  const colDifficulty = findColumnIndex(rawHeaders, ['difficulty', 'level', 'কঠিন্যের মাত্রা']);
  const colTags = findColumnIndex(rawHeaders, ['tags', 'tag', 'বছর', 'year']);

  // Fallback positional indices if headers are standard order (Question, Opt1, Opt2, Opt3, Opt4, Answer, Solution)
  const qIdx = colQuestion !== -1 ? colQuestion : 0;
  const o1Idx = colOpt1 !== -1 ? colOpt1 : 1;
  const o2Idx = colOpt2 !== -1 ? colOpt2 : 2;
  const o3Idx = colOpt3 !== -1 ? colOpt3 : 3;
  const o4Idx = colOpt4 !== -1 ? colOpt4 : 4;
  const ansIdx = colAnswer !== -1 ? colAnswer : 5;
  const solIdx = colSolution !== -1 ? colSolution : 6;

  const parsedQuestions: ParsedQuestionRow[] = [];
  let totalMathFormulas = 0;
  let autoFixedMathCount = 0;
  let warningMathCount = 0;

  dataRows.forEach((row, rIdx) => {
    const rawText = (row[qIdx] || '').trim();
    if (!rawText) return; // Skip empty question text

    const opt1 = (row[o1Idx] || '').trim();
    const opt2 = (row[o2Idx] || '').trim();
    const opt3 = (row[o3Idx] || '').trim();
    const opt4 = (row[o4Idx] || '').trim();
    const opt5 = colOpt5 !== -1 ? (row[colOpt5] || '').trim() : '';
    const opt6 = colOpt6 !== -1 ? (row[colOpt6] || '').trim() : '';
    const opt7 = colOpt7 !== -1 ? (row[colOpt7] || '').trim() : '';
    const opt8 = colOpt8 !== -1 ? (row[colOpt8] || '').trim() : '';

    const rawOptions = [opt1, opt2, opt3, opt4];
    if (opt5) rawOptions.push(opt5);
    if (opt6) rawOptions.push(opt6);
    if (opt7) rawOptions.push(opt7);
    if (opt8) rawOptions.push(opt8);

    // If headers didn't match specific option columns but row has extra cells before answer column
    if (colOpt5 === -1 && ansIdx > 4) {
      for (let i = 5; i < ansIdx; i++) {
        const extraOpt = (row[i] || '').trim();
        if (extraOpt && !rawOptions.includes(extraOpt)) {
          rawOptions.push(extraOpt);
        }
      }
    }

    const validRawOptions = rawOptions.filter(o => o.length > 0);

    const rawAns = (row[ansIdx] || '').trim();
    const rawExplanation = (row[solIdx] || '').trim() || 'Detailed step-by-step solution provided.';
    const rawQuestionSource = colQuestionSource !== -1 ? (row[colQuestionSource] || '').trim() : '';
    const rawExamName = colExam !== -1 ? (row[colExam] || '').trim() : '';
    const rawTopicName = colTopic !== -1 ? (row[colTopic] || '').trim() : '';

    // Auto-detect subject if not explicitly in row
    let subject = colSubject !== -1 && row[colSubject]?.trim() ? row[colSubject].trim() : '';
    if (!subject) {
      const combined = `${rawQuestionSource} ${rawTopicName} ${rawText}`.toLowerCase();
      if (
        combined.includes('গণিত') ||
        combined.includes('math') ||
        combined.includes('পাইপ') ||
        combined.includes('চৌবাচ্চা') ||
        combined.includes('pipes and cistern') ||
        combined.includes('বীজগণিত') ||
        combined.includes('পাটিগণিত') ||
        combined.includes('জ্যামিতি')
      ) {
        subject = 'গণিত';
      } else if (combined.includes('ইংরেজি') || combined.includes('english')) {
        subject = 'English Language & Literature';
      } else if (combined.includes('বিজ্ঞান') || combined.includes('science')) {
        subject = 'General Science';
      } else if (combined.includes('বাংলাদেশ') || combined.includes('bangladesh')) {
        subject = 'Bangladesh Affairs';
      } else if (combined.includes('আন্তর্জাতিক') || combined.includes('international')) {
        subject = 'International Affairs';
      } else {
        subject = defaultSubject;
      }
    }

    const topic = rawTopicName || (colTopic !== -1 && row[colTopic]?.trim() ? row[colTopic].trim() : defaultTopic);
    const exam = rawExamName || (colExam !== -1 && row[colExam]?.trim() ? row[colExam].trim() : undefined);
    const questionSource = rawQuestionSource || undefined;

    const diffRaw = colDifficulty !== -1 && row[colDifficulty]?.trim() ? row[colDifficulty].trim() : defaultDifficulty;
    
    let difficulty: Difficulty = defaultDifficulty;
    if (diffRaw.toLowerCase() === 'easy') difficulty = 'Easy';
    else if (diffRaw.toLowerCase() === 'hard') difficulty = 'Hard';
    else if (diffRaw.toLowerCase() === 'medium') difficulty = 'Medium';

    const tags: string[] = [subject, topic].filter(Boolean);
    if (exam && !tags.includes(exam)) tags.push(exam);
    if (questionSource) {
      // Split source by '|' to extract concise exam/year tags
      questionSource.split('|').forEach(part => {
        const cleanP = part.trim();
        if (cleanP && !tags.includes(cleanP) && cleanP.length <= 40) {
          tags.push(cleanP);
        }
      });
    }

    if (colTags !== -1 && row[colTags]?.trim()) {
      row[colTags].split(',').forEach(t => {
        const cleanT = t.trim();
        if (cleanT && !tags.includes(cleanT)) tags.push(cleanT);
      });
    }

    // Mathematical analysis & LaTeX normalization pipeline
    const mathAnalysis = analyzeQuestionMath({
      text: rawText,
      options: rawOptions,
      explanation: rawExplanation
    });

    const normalizedText = mathAnalysis.text.normalizedText;
    const normalizedOptions = mathAnalysis.options.map(o => o.normalizedText);
    const normalizedExplanation = mathAnalysis.explanation.normalizedText;

    const allWarnings = [
      ...mathAnalysis.text.warnings,
      ...mathAnalysis.options.flatMap(o => o.warnings),
      ...mathAnalysis.explanation.warnings
    ];

    totalMathFormulas += mathAnalysis.totalFormulasDetected;
    if (mathAnalysis.overallStatus === 'AUTO_FIXED') autoFixedMathCount++;
    if (mathAnalysis.overallStatus === 'WARNING') warningMathCount++;

    let isValid = true;
    let validationError: string | undefined;

    if (validRawOptions.length < 2) {
      isValid = false;
      validationError = 'Question must have at least 2 options.';
    }

    const correctOptionIndices = resolveCorrectOptionIndices(rawAns, rawOptions);
    const correctOptionIndex = correctOptionIndices[0] ?? 0;
    const isMultiSelect = correctOptionIndices.length > 1;

    parsedQuestions.push({
      text: normalizedText,
      options: normalizedOptions,
      correctOptionIndex,
      correctOptionIndices,
      isMultiSelect,
      explanation: normalizedExplanation,
      subject,
      topic,
      exam,
      questionSource,
      difficulty,
      tags,
      rawRowIndex: rIdx + 2, // 1-based + 1 for header
      isValid,
      validationError,
      rawText,
      rawOptions,
      rawExplanation,
      mathAnalysis,
      mathStatus: mathAnalysis.overallStatus,
      mathWarnings: allWarnings,
      detectedFormulasCount: mathAnalysis.totalFormulasDetected
    });
  });

  const validCount = parsedQuestions.filter(q => q.isValid).length;
  const invalidCount = parsedQuestions.length - validCount;

  return {
    questions: parsedQuestions,
    totalRows: parsedQuestions.length,
    validCount,
    invalidCount,
    detectedSubject: parsedQuestions[0]?.subject || defaultSubject,
    detectedTopic: parsedQuestions[0]?.topic || defaultTopic,
    headers: rawHeaders,
    totalMathFormulasDetected: totalMathFormulas,
    autoFixedMathCount,
    warningMathCount
  };
}

/**
 * Parse CSV or TSV string content with Math Normalization
 */
export function parseCsvString(
  csvContent: string,
  defaultSubject: string = 'Mathematics',
  defaultTopic: string = 'Ratio & Proportion',
  defaultDifficulty: Difficulty = 'Medium'
): ParseSpreadsheetResult {
  const result = Papa.parse<string[]>(csvContent, {
    skipEmptyLines: true,
    dynamicTyping: false
  });

  return parseRowsMatrix(result.data as string[][], defaultSubject, defaultTopic, defaultDifficulty);
}

/**
 * Parse Excel File buffer or ArrayBuffer using XLSX library with Math Normalization
 */
export function parseExcelFile(
  data: ArrayBuffer | Uint8Array,
  defaultSubject: string = 'Mathematics',
  defaultTopic: string = 'Ratio & Proportion',
  defaultDifficulty: Difficulty = 'Medium'
): ParseSpreadsheetResult {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false
  });

  // Convert all cells to strings
  const stringRows = rows.map(r => r.map(cell => (cell !== null && cell !== undefined ? String(cell) : '')));

  return parseRowsMatrix(stringRows, defaultSubject, defaultTopic, defaultDifficulty);
}

/**
 * Converts Question list to standard CSV for export (supports dynamic 4, 5, 6+ options and multiple correct answers)
 */
export function exportQuestionsToCsv(questions: Question[]): string {
  // Determine max option count across questions (minimum 4, or 5+)
  const maxOptions = Math.max(4, ...questions.map(q => q.options?.length || 4));
  
  const header = ['Questions'];
  for (let i = 1; i <= maxOptions; i++) {
    header.push(`Option ${i}`);
  }
  header.push('Answer', 'Solution', 'Subject', 'Topic', 'Difficulty', 'Tags');

  const rows = questions.map(q => {
    const rowData: string[] = [q.text];

    for (let i = 0; i < maxOptions; i++) {
      rowData.push(q.options[i] || '');
    }

    // Answer representation: either single or comma-separated letter identifiers e.g. "A, C"
    let answerText = '';
    if (q.correctOptionIndices && q.correctOptionIndices.length > 0) {
      answerText = q.correctOptionIndices
        .map(idx => String.fromCharCode(65 + idx))
        .join(', ');
    } else {
      answerText = String.fromCharCode(65 + (q.correctOptionIndex || 0));
    }

    rowData.push(
      answerText,
      q.explanation,
      q.subject,
      q.topic,
      q.difficulty,
      q.tags?.join(', ') || ''
    );

    return rowData;
  });

  return Papa.unparse({
    fields: header,
    data: rows
  });
}
