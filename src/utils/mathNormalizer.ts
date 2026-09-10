import katex from 'katex';

export interface MathValidationResult {
  isValid: boolean;
  normalizedText: string;
  originalText: string;
  mathSpansCount: number;
  warnings: string[];
  autoFixed: boolean;
  status: 'VALID' | 'AUTO_FIXED' | 'WARNING' | 'NO_MATH';
}

export interface QuestionMathAnalysis {
  text: MathValidationResult;
  options: MathValidationResult[];
  explanation: MathValidationResult;
  overallStatus: 'VALID' | 'AUTO_FIXED' | 'WARNING' | 'NO_MATH';
  totalFormulasDetected: number;
}

/**
 * Maps Unicode superscripts and subscripts to standard ASCII LaTeX format
 */
const UNICODE_SUPER_SUB_MAP: Record<string, string> = {
  '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
  '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
  '⁺': '^+', '⁻': '^-', 'ⁿ': '^n', 'ⁱ': '^i',
  '₀': '_0', '₁': '_1', '₂': '_2', '₃': '_3', '₄': '_4',
  '₅': '_5', '₆': '_6', '₇': '_7', '₈': '_8', '₉': '_9',
  '₊': '_+', '₋': '_-', 'ₐ': '_a', 'ₑ': '_e', 'ₒ': '_o', 'ₓ': '_x',
  '√': '\\sqrt', '∛': '\\sqrt[3]', '∜': '\\sqrt[4]',
  '×': '\\times', '÷': '\\div', '±': '\\pm', '∓': '\\mp',
  '≤': '\\le', '≥': '\\ge', '≠': '\\neq', '≈': '\\approx', '≡': '\\equiv',
  '∞': '\\infty', 'π': '\\pi', 'θ': '\\theta', 'α': '\\alpha', 'β': '\\beta',
  'γ': '\\gamma', 'δ': '\\delta', 'Δ': '\\Delta', 'λ': '\\lambda', 'σ': '\\sigma',
  'ω': '\\omega', 'Ω': '\\Omega', 'μ': '\\mu', '∑': '\\sum', '∫': '\\int',
  '°': '^\\circ', '∠': '\\angle', '∆': '\\triangle', '⊥': '\\perp', '∥': '\\parallel',
  '∈': '\\in', '∉': '\\notin', '⊂': '\\subset', '⊆': '\\subseteq', '∪': '\\cup', '∩': '\\cap'
};

/**
 * Bengali to English digit map for mathematical evaluation
 */
const BN_TO_EN_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

/**
 * Cleans escaped backslashes from JSON / Excel exports
 */
export function cleanEscapedBackslashes(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\\\\\\\/g, '\\')
    .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
    .replace(/\\\\([$^_\\{\\}\\[\\]\\(\\)])/g, '\\$1');
}

/**
 * Auto-corrects common LaTeX syntax errors:
 * - Unescaped % inside math ($35%$ -> $35\%$)
 * - Unbalanced braces
 * - Double dollar mismatches
 */
export function autoFixLatexSyntax(latexStr: string): { fixed: string; wasModified: boolean } {
  if (!latexStr) return { fixed: '', wasModified: false };
  // Normalize non-breaking spaces from Excel/CSV to regular spaces
  let current = cleanEscapedBackslashes(latexStr).replace(/\u00A0/g, ' ');
  let wasModified = false;

  // 1. Convert Unicode math symbols to LaTeX equivalents ONLY inside math delimiters,
  // or if the entire string is a standalone formula (to avoid corrupting natural language sentences)
  const mathDelimRegex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  if (mathDelimRegex.test(current)) {
    current = current.replace(mathDelimRegex, (delimitedMath) => {
      let mod = delimitedMath;
      for (const [unicodeChar, replacement] of Object.entries(UNICODE_SUPER_SUB_MAP)) {
        if (mod.includes(unicodeChar)) {
          mod = mod.split(unicodeChar).join(replacement);
          wasModified = true;
        }
      }
      return mod;
    });
  } else if (isPlainMathExpression(current)) {
    for (const [unicodeChar, replacement] of Object.entries(UNICODE_SUPER_SUB_MAP)) {
      if (current.includes(unicodeChar)) {
        current = current.split(unicodeChar).join(replacement);
        wasModified = true;
      }
    }
  }

  // 2. Fix unescaped percentage inside math delimiters
  current = current.replace(mathDelimRegex, (match) => {
    // Inside math, replace raw % (not preceded by \) with \%
    const fixedMatch = match.replace(/(^|[^\\])%/g, '$1\\%');
    if (fixedMatch !== match) wasModified = true;
    return fixedMatch;
  });

  // 3. Fix unclosed \sqrt or \frac without braces e.g. \sqrt 25 -> \sqrt{25}, \frac 1 2 -> \frac{1}{2}
  current = current.replace(/\\sqrt\s+([0-9a-zA-Z]+)/g, (_, val) => {
    wasModified = true;
    return `\\sqrt{${val}}`;
  });
  current = current.replace(/\\frac\s+([0-9a-zA-Z]+)\s+([0-9a-zA-Z]+)/g, (_, n, d) => {
    wasModified = true;
    return `\\frac{${n}}{${d}}`;
  });

  // 4. Fix missing closing brackets in simple math spans
  // Count { and } inside $...$
  current = current.replace(/\$([^\$]+)\$/g, (fullMatch, inner) => {
    const openBraces = (inner.match(/\{/g) || []).length;
    const closeBraces = (inner.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
      wasModified = true;
      return `$${inner}${'}'.repeat(openBraces - closeBraces)}$`;
    }
    return fullMatch;
  });

  // 5. Ensure clean spacing between Unicode Bangla / natural language words and math delimiters
  const tokens = current.split(mathDelimRegex);
  if (tokens.length > 1) {
    for (let i = 0; i < tokens.length; i++) {
      const isMath =
        (tokens[i].startsWith('$') && tokens[i].endsWith('$') && tokens[i].length >= 2) ||
        (tokens[i].startsWith('\\(') && tokens[i].endsWith('\\)') && tokens[i].length >= 4);

      if (isMath) {
        if (i > 0 && tokens[i - 1] && !/\s$/.test(tokens[i - 1]) && !/[\(\[\{\"\']/.test(tokens[i - 1].slice(-1))) {
          tokens[i - 1] += ' ';
          wasModified = true;
        }
        if (i < tokens.length - 1 && tokens[i + 1] && !/^\s/.test(tokens[i + 1]) && !/^[\,\.\?\!\)\]\}\:\;|।|%|\"\']/.test(tokens[i + 1])) {
          tokens[i + 1] = ' ' + tokens[i + 1];
          wasModified = true;
        }
      }
    }
    current = tokens.join('');
  }

  return { fixed: current, wasModified };
}

/**
 * Detects whether a string or segment is a plain math expression
 * (e.g. "x^2 - 5x + 6 = 0", "1/2", "sqrt(25)", "a : b : c = 3 : 4 : 7", "log2(8)", "30 degree", "sin^2(theta) + cos^2(theta) = 1")
 */
export function isPlainMathExpression(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();

  // Already enclosed in LaTeX math delimiters
  if ((trimmed.startsWith('$') && trimmed.endsWith('$')) ||
      (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) ||
      (trimmed.startsWith('\\[') && trimmed.endsWith('\\]'))) {
    return true;
  }

  // If it's a natural language phrase with words (e.g. "Sector 1", "Article 21", "Option A", "General Science"),
  // it is NOT a plain math formula unless it contains mathematical operators
  const words = trimmed.split(/\s+/);
  const hasMultipleNaturalWords = words.length > 1 && words.some(w => /^[a-zA-Z]{2,}$/.test(w));
  const hasExplicitMathOperators = /[\+\-\*\/\^\=\<\>\√\±\≤\≥\≠\×\÷\_\\]/.test(trimmed);

  if (hasMultipleNaturalWords && !hasExplicitMathOperators) {
    return false;
  }

  // Obvious math patterns
  const mathIndicators = [
    /[0-9a-zA-Z]+\s*[\+\-\*\/\^]\s*[0-9a-zA-Z]+/, // Binary operator: 2+3, x^2, a/b
    /[a-zA-Z]\^[0-9a-zA-Z\(\)]+/, // Exponent: x^2, y^3
    /sqrt\s*\([^)]+\)|root\s*\([^)]+\)/i, // sqrt(x), root(y)
    /log_?[0-9a-zA-Z]*\s*\([^)]+\)/i, // log(x), log2(8)
    /\b(sin|cos|tan|cot|sec|csc)\s*\^?[0-9]*\s*\([^)]+\)/i, // sin(x), cos^2(theta)
    /[0-9]+\s*(degree|deg|°)\b/i, // 30 deg, 45 degree
    /\b(alpha|beta|gamma|theta|lambda|sigma|Delta|pi)\b/i, // Greek names
    /^[0-9]+\s*:\s*[0-9]+(\s*:\s*[0-9]+)*$/, // Ratios: 3 : 4 : 7, 2 : 1
    /^[xXyYzZaAbBcCnN]\s*[\=\<\>\le\ge\neq]+\s*[0-9\-\+]/, // Equations: x = 2, 3, y >= 5
    /^\s*\d+\s*\/\s*\d+\s*$/, // Standalone Fractions: 1/2, 14/3
    /^\s*[a-zA-Z]\s*\/\s*[a-zA-Z]\s*$/, // Standalone Algebraic fractions: a/b, x/y
    /int(_|\s+)[0-9a-zA-Z]+\s*(to|\^)\s*[0-9a-zA-Z]+/i, // Integrals
  ];

  // Disqualify conversational sentences that lack equations
  if (trimmed.length > 40 && !trimmed.includes('=') && !trimmed.includes('^') && !trimmed.includes('\\')) {
    return false;
  }

  return mathIndicators.some(pattern => pattern.test(trimmed));
}

/**
 * Converts a plain unformatted math string into canonical LaTeX format
 * Examples:
 *  - "x^2 - 5x + 6 = 0" -> "x^2 - 5x + 6 = 0"
 *  - "sqrt(x^2 + 16)" -> "\sqrt{x^2 + 16}"
 *  - "root(25)" -> "\sqrt{25}"
 *  - "root3(27)" -> "\sqrt[3]{27}"
 *  - "1/2" -> "\frac{1}{2}"
 *  - "(a + b)/(c - d)" -> "\frac{a + b}{c - d}"
 *  - "log2(8)" -> "\log_{2}(8)"
 *  - "30 degree" -> "30^\circ"
 *  - "3 * 5" -> "3 \times 5"
 *  - "x <= 5" -> "x \le 5"
 *  - "x >= 10" -> "x \ge 10"
 *  - "x != 0" -> "x \neq 0"
 *  - "+/- 4" or "+- 4" -> "\pm 4"
 *  - "sin^2(theta)" -> "\sin^2(\theta)"
 */
export function convertPlainMathToLatex(plainMath: string): string {
  if (!plainMath) return '';
  let res = plainMath.trim();

  // Strip outer delimiters if present for clean normalization
  if (res.startsWith('$$') && res.endsWith('$$')) res = res.slice(2, -2).trim();
  else if (res.startsWith('$') && res.endsWith('$')) res = res.slice(1, -1).trim();
  else if (res.startsWith('\\(') && res.endsWith('\\)')) res = res.slice(2, -2).trim();
  else if (res.startsWith('\\[') && res.endsWith('\\]')) res = res.slice(2, -2).trim();

  // 1. Unicode conversions
  for (const [char, rep] of Object.entries(UNICODE_SUPER_SUB_MAP)) {
    res = res.split(char).join(rep);
  }

  // 2. Square root and Nth root conversions
  res = res.replace(/root(\d+)\s*\(([^)]+)\)/gi, '\\sqrt[$1]{$2}');
  res = res.replace(/(?:sqrt|root)\s*\(([^)]+)\)/gi, '\\sqrt{$1}');
  res = res.replace(/cbrt\s*\(([^)]+)\)/gi, '\\sqrt[3]{$1}');

  // 3. Logarithms
  res = res.replace(/log_?(\d+|[a-zA-Z])\s*\(([^)]+)\)/gi, '\\log_{$1}($2)');
  res = res.replace(/\bln\s*\(([^)]+)\)/gi, '\\ln($1)');

  // 4. Fractions:
  // (expr)/(expr) -> \frac{expr}{expr}
  res = res.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
  // (expr)/term -> \frac{expr}{term}
  res = res.replace(/\(([^)]+)\)\s*\/\s*([a-zA-Z0-9\.\^\_]+)/g, '\\frac{$1}{$2}');
  // term/(expr) -> \frac{term}{expr}
  res = res.replace(/([a-zA-Z0-9\.\^\_]+)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
  // simple num/num or var/var: 14/3 -> \frac{14}{3}, a/b -> \frac{a}{b}
  res = res.replace(/\b([a-zA-Z0-9\^]+)\s*\/\s*([a-zA-Z0-9\^]+)\b/g, (match, n, d) => {
    // Avoid dates like 17/04 or 1971/72 if it looks like month/day
    if (n.length === 2 && d.length === 2 && parseInt(n, 10) <= 31 && parseInt(d, 10) <= 12) {
      return match;
    }
    return `\\frac{${n}}{${d}}`;
  });

  // 5. Inequalities & comparison operators
  res = res.replace(/<=/g, '\\le ');
  res = res.replace(/>=/g, '\\ge ');
  res = res.replace(/!=/g, '\\neq ');
  res = res.replace(/==/g, '=');
  res = res.replace(/~=/g, '\\approx ');
  res = res.replace(/\+\/\-|\+\-/g, '\\pm ');

  // 6. Multiplication & division symbols
  res = res.replace(/(\d+)\s*\*\s*(\d+)/g, '$1 \\times $2');
  res = res.replace(/([a-zA-Z0-9\)])\s*\*\s*([a-zA-Z0-9\(])/g, '$1 \\cdot $2');

  // 7. Trigonometric functions & Greek letters
  res = res.replace(/\b(sin|cos|tan|cot|sec|csc|cosec)\b/gi, (m) => {
    const lower = m.toLowerCase();
    return lower === 'cosec' ? '\\csc ' : `\\${lower} `;
  });

  const greekWords: Record<string, string> = {
    theta: '\\theta', alpha: '\\alpha', beta: '\\beta', gamma: '\\gamma',
    delta: '\\delta', Delta: '\\Delta', lambda: '\\lambda', sigma: '\\sigma',
    pi: '\\pi', omega: '\\omega', Omega: '\\Omega', mu: '\\mu', phi: '\\phi'
  };
  for (const [word, latex] of Object.entries(greekWords)) {
    const reg = new RegExp(`\\b${word}\\b`, 'g');
    res = res.replace(reg, latex);
  }

  // 8. Degrees
  res = res.replace(/(\d+)\s*(?:degree|deg|°)\b/gi, '$1^\\circ');

  // 9. Arrows
  res = res.replace(/=>|-->|->/g, '\\Rightarrow ');
  res = res.replace(/<=>|<->/g, '\\Leftrightarrow ');

  // 10. Clean up duplicate spaces
  res = res.replace(/\s+/g, ' ').trim();

  return res;
}

/**
 * Intelligently normalizes mixed content (containing both natural Bengali/English text and math spans).
 * It preserves the surrounding natural language text and converts inline/standalone math into standard LaTeX `$ ... $` spans.
 */
export function normalizeMixedContentToLatex(inputText: string): {
  normalized: string;
  mathSpansCount: number;
  warnings: string[];
} {
  if (!inputText) return { normalized: '', mathSpansCount: 0, warnings: [] };
  const warnings: string[] = [];
  let text = cleanEscapedBackslashes(inputText);

  // 1. If text already has LaTeX delimiters ($...$, $$...$$, \(...\), \[...\]),
  // auto-fix any syntax errors inside those delimiters
  const existingDelimiters = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  let mathSpansCount = (text.match(existingDelimiters) || []).length;

  if (mathSpansCount > 0) {
    const { fixed } = autoFixLatexSyntax(text);
    return { normalized: fixed, mathSpansCount, warnings };
  }

  // 2. Plain-text math detection for entire string (e.g. Option choice: "x = 2, 3" or "14 : 3" or "2 : 1")
  if (isPlainMathExpression(text)) {
    const converted = convertPlainMathToLatex(text);
    return {
      normalized: `$${converted}$`,
      mathSpansCount: 1,
      warnings
    };
  }

  // 3. Scan for embedded math expressions in mixed sentences
  // e.g. "যদি x^2 - 5x + 6 = 0 হয়, তবে x এর মান কত এবং sqrt(x^2 + 16) কত?"
  // Patterns like: equation (x^2 - 5x + 6 = 0), sqrt(...), fractions (1/2), ratios (a : b = 3 : 4)
  const inlineMathPatterns = [
    // Equations / formulas with operators: e.g. x^2 - 5x + 6 = 0, a + b = 10, y = 3x + 4
    /([a-zA-Z0-9\(\)]+\s*[\^\+\-\*\/\=]\s*[a-zA-Z0-9\s\+\-\*\/\^\=\<\>\(\)\_\.\:\,\√\±\≤\≥\≠\×\÷]+[a-zA-Z0-9\)])/g,
    // Functions: sqrt(...), root(...), log2(...), sin^2(...)
    /(?:sqrt|root\d*|log_?\d*|ln|sin\^?\d*|cos\^?\d*|tan\^?\d*)\s*\([^)]+\)/gi,
    // Standalone variable powers or subscripts: x^2, y_1, a^3
    /\b[a-zA-Z][\^_][0-9a-zA-Z\(\)]+\b/g,
    // Degrees: 30°, 90 degree
    /\b\d+\s*(?:degree|deg|°)\b/gi,
  ];

  let replacedText = text;
  let detected = 0;

  for (const pattern of inlineMathPatterns) {
    replacedText = replacedText.replace(pattern, (match) => {
      // Avoid re-wrapping if already wrapped
      if (match.startsWith('$') || match.includes('$')) return match;
      const cleanMatch = match.trim();
      // Disqualify pure words
      if (/^[a-zA-Z]+$/.test(cleanMatch)) return match;
      // Convert and wrap
      const latex = convertPlainMathToLatex(cleanMatch);
      detected++;
      return `$${latex}$`;
    });
  }

  mathSpansCount = detected;

  const { fixed } = autoFixLatexSyntax(replacedText);
  return { normalized: fixed, mathSpansCount, warnings };
}

/**
 * Validates a text string containing KaTeX / LaTeX formulas
 */
export function validateTextWithKatex(rawText: string): MathValidationResult {
  if (!rawText || !rawText.trim()) {
    return {
      isValid: true,
      normalizedText: '',
      originalText: rawText,
      mathSpansCount: 0,
      warnings: [],
      autoFixed: false,
      status: 'NO_MATH'
    };
  }

  const { normalized, mathSpansCount, warnings } = normalizeMixedContentToLatex(rawText);
  const isAutoFixed = normalized !== rawText;

  if (mathSpansCount === 0 && !normalized.includes('$') && !normalized.includes('\\(')) {
    return {
      isValid: true,
      normalizedText: normalized,
      originalText: rawText,
      mathSpansCount: 0,
      warnings,
      autoFixed: isAutoFixed,
      status: 'NO_MATH'
    };
  }

  // Extract all math expressions and validate with KaTeX
  const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  const matches = normalized.match(mathRegex) || [];
  let hasErrors = false;

  for (const span of matches) {
    let innerMath = span;
    let displayMode = false;
    if (span.startsWith('$$') && span.endsWith('$$')) {
      innerMath = span.slice(2, -2);
      displayMode = true;
    } else if (span.startsWith('$') && span.endsWith('$')) {
      innerMath = span.slice(1, -1);
    } else if (span.startsWith('\\[') && span.endsWith('\\]')) {
      innerMath = span.slice(2, -2);
      displayMode = true;
    } else if (span.startsWith('\\(') && span.endsWith('\\)')) {
      innerMath = span.slice(2, -2);
    }

    try {
      katex.renderToString(innerMath, {
        displayMode,
        throwOnError: true,
        strict: false,
        trust: true
      });
    } catch (err: any) {
      hasErrors = true;
      warnings.push(`KaTeX notice on "${span}": ${err.message || 'Syntax error'}`);
    }
  }

  return {
    isValid: !hasErrors,
    normalizedText: normalized,
    originalText: rawText,
    mathSpansCount: matches.length,
    warnings,
    autoFixed: isAutoFixed,
    status: hasErrors ? 'WARNING' : (isAutoFixed ? 'AUTO_FIXED' : 'VALID')
  };
}

/**
 * Validates and normalizes an entire Question object (text, options, explanation)
 */
export function analyzeQuestionMath(question: {
  text: string;
  options: string[];
  explanation: string;
}): QuestionMathAnalysis {
  const textRes = validateTextWithKatex(question.text);
  const optionsRes = (question.options || []).map(opt => validateTextWithKatex(opt));
  const explRes = validateTextWithKatex(question.explanation);

  const totalFormulas = textRes.mathSpansCount +
    optionsRes.reduce((acc, curr) => acc + curr.mathSpansCount, 0) +
    explRes.mathSpansCount;

  let overallStatus: 'VALID' | 'AUTO_FIXED' | 'WARNING' | 'NO_MATH' = 'NO_MATH';

  const allStatuses = [textRes.status, ...optionsRes.map(o => o.status), explRes.status];
  if (allStatuses.includes('WARNING')) {
    overallStatus = 'WARNING';
  } else if (allStatuses.includes('AUTO_FIXED')) {
    overallStatus = 'AUTO_FIXED';
  } else if (allStatuses.includes('VALID') || totalFormulas > 0) {
    overallStatus = 'VALID';
  }

  return {
    text: textRes,
    options: optionsRes,
    explanation: explRes,
    overallStatus,
    totalFormulasDetected: totalFormulas
  };
}
