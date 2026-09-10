import React, { useMemo, useEffect, useRef } from 'react';
import katex from 'katex';
import { autoFixLatexSyntax, isPlainMathExpression, convertPlainMathToLatex } from '../utils/mathNormalizer';

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: (HTMLElement | null)[]) => Promise<void>;
      typesetClear?: (elements?: (HTMLElement | null)[]) => void;
      startup?: {
        promise?: Promise<void>;
      };
    };
  }
}

interface MathJaxViewProps {
  text: string;
  className?: string;
  inline?: boolean;
  as?: 'span' | 'div' | 'p' | 'h3' | 'h4' | 'h2';
}

/**
 * Sanitizes math content before passing to KaTeX
 * - Escapes raw % so they aren't treated as LaTeX comments
 * - Handles unicode replacements and backslash cleanups
 */
function sanitizeMathForKatex(mathStr: string): string {
  if (!mathStr) return '';
  let sanitized = mathStr.trim();

  // Escape unescaped % (e.g. 73% -> 73\%)
  sanitized = sanitized.replace(/(^|[^\\])%/g, '$1\\%');

  return sanitized;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts mathematical and LaTeX expressions into KaTeX HTML strings.
 * Handles:
 *  - Display equations: $$ ... $$ and \[ ... \]
 *  - Inline equations: $ ... $ and \( ... \)
 *  - Standalone plain math expressions (e.g., in option buttons)
 *  - Multiline text with preserved line-breaks
 */
export function renderMathToHtml(inputText: string): string {
  if (!inputText) return '';
  
  // 1. Auto-fix syntax errors and clean up backslashes
  const { fixed: cleanText } = autoFixLatexSyntax(inputText);

  // 2. If the entire text is a plain un-enclosed formula (like an option "x = 2, 3" or "14 : 3" or "sqrt(25)"),
  // convert and render directly
  if (!cleanText.includes('$') && !cleanText.includes('\\(') && isPlainMathExpression(cleanText)) {
    const canonicalLatex = convertPlainMathToLatex(cleanText);
    try {
      return `<span class="katex-inline-formula font-serif text-[1.05em] align-baseline">${katex.renderToString(
        sanitizeMathForKatex(canonicalLatex),
        { displayMode: false, throwOnError: false, strict: false, trust: true }
      )}</span>`;
    } catch {
      // fallback
    }
  }

  // 3. Regex to match math delimiters while respecting markdown and Bengali text
  const mathRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$(?:\\\$|[^\$])+?\$|\\\([\s\S]+?\\\))/g;
  const rawParts = cleanText.split(mathRegex);

  // Ensure explicit spacing between natural language words (especially Unicode Bangla) and math spans
  const parts = [...rawParts];
  for (let i = 0; i < parts.length; i++) {
    const isMath =
      (parts[i].startsWith('$') && parts[i].endsWith('$') && parts[i].length >= 2) ||
      (parts[i].startsWith('\\(') && parts[i].endsWith('\\)') && parts[i].length >= 4);

    if (isMath) {
      if (i > 0 && parts[i - 1] && !/\s$/.test(parts[i - 1]) && !/[\(\[\{\"\']/.test(parts[i - 1].slice(-1))) {
        parts[i - 1] += ' ';
      }
      if (i < parts.length - 1 && parts[i + 1] && !/^\s/.test(parts[i + 1]) && !/^[\,\.\?\!\)\]\}\:\;|।|%|\"\']/.test(parts[i + 1])) {
        parts[i + 1] = ' ' + parts[i + 1];
      }
    }
  }

  const renderedHtml = parts
    .map((part) => {
      if (!part) return '';

      // Display / Block Math: $$ ... $$ or \[ ... \]
      if ((part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) ||
          (part.startsWith('\\[') && part.endsWith('\\]') && part.length >= 4)) {
        const rawMath = part.startsWith('$$') ? part.slice(2, -2) : part.slice(2, -2);
        const mathContent = sanitizeMathForKatex(rawMath);
        try {
          const rendered = katex.renderToString(mathContent, {
            displayMode: true,
            throwOnError: false,
            strict: false,
            trust: true,
          });
          return `<div class="katex-display-block my-3 overflow-x-auto text-center py-1.5 px-3 bg-slate-50/70 border border-slate-200/60 rounded-xl">${rendered}</div>`;
        } catch {
          return `<div class="katex-error font-mono text-xs text-amber-700 bg-amber-50 p-2 rounded">${escapeHtml(part)}</div>`;
        }
      }

      // Inline Math: $ ... $ or \( ... \)
      if ((part.startsWith('$') && part.endsWith('$') && part.length >= 2) ||
          (part.startsWith('\\(') && part.endsWith('\\)') && part.length >= 4)) {
        const rawMath = part.startsWith('$') ? part.slice(1, -1) : part.slice(2, -2);
        const mathContent = sanitizeMathForKatex(rawMath);
        try {
          return `<span class="katex-inline-formula inline align-baseline mx-0.5">${katex.renderToString(mathContent, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            trust: true,
          })}</span>`;
        } catch {
          return `<span class="katex-fallback font-mono text-xs text-amber-700">${escapeHtml(part)}</span>`;
        }
      }

      // Fallback check: ONLY if plain text segment contains un-enclosed LaTeX commands AND does NOT contain natural language words
      const containsMathCommand = /\\[a-zA-Z]+|\^\{?[0-9a-zA-Z\+\-\*\^\circ]+\}?|_\{?[0-9a-zA-Z\+\-\*]+\}?/.test(part);
      if (containsMathCommand && !part.includes('<') && !part.includes('>')) {
        const words = part.trim().split(/[\s,.;:!?()[\]{}"']+/).filter(w => /^[a-zA-Z]{2,}$/.test(w));
        const mathKeywords = new Set([
          'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'lim', 'max', 'min',
          'det', 'exp', 'deg', 'gcd', 'lcm', 'to', 'dx', 'dy', 'dt', 'mod', 'arg', 'dim'
        ]);
        const hasNaturalLanguage = words.some(w => !mathKeywords.has(w.toLowerCase()));

        if (!hasNaturalLanguage) {
          const isPureFormula = /^[a-zA-Z0-9\s\=\+\-\*\/\(\)\,\.\^\\_\{\}\[\]\:\%\°\≈\±\≤\≥\≠\×\÷]+$/.test(part) &&
            (/\\[a-zA-Z]+|\^|_/.test(part));

          if (isPureFormula) {
            try {
              const mathContent = sanitizeMathForKatex(part);
              const rendered = katex.renderToString(mathContent, {
                displayMode: false,
                throwOnError: false,
                strict: false,
                trust: true,
              });
              return `<span class="katex-inline-formula inline align-baseline mx-0.5">${rendered}</span>`;
            } catch {
              // Fall through to plain text
            }
          }
        }
      }

      // Regular Text: escape HTML characters, preserve newlines as <br/>
      // Maintain natural whitespace so words flow seamlessly
      let textSegment = escapeHtml(part).replace(/\n/g, '<br/>');
      if (textSegment.startsWith(' ')) {
        textSegment = ' ' + textSegment.slice(1);
      }
      if (textSegment.endsWith(' ')) {
        textSegment = textSegment.slice(0, -1) + ' ';
      }
      return textSegment;
    })
    .join('');

  return renderedHtml;
}

/**
 * MathJaxView Component
 * Renders mathematical expressions, LaTeX formulas ($...$, $$...$$, \(...\), \[...\]),
 * algebraic expressions, fractions, exponents, Greek symbols, and Bengali math terms.
 * Built with zero-latency synchronous KaTeX rendering and graceful MathJax fallback.
 */
export const MathJaxView: React.FC<MathJaxViewProps> = ({
  text,
  className = '',
  inline = false,
  as: Component = inline ? 'span' : 'div'
}) => {
  const containerRef = useRef<HTMLElement | null>(null);

  const htmlContent = useMemo(() => {
    return renderMathToHtml(text);
  }, [text]);

  useEffect(() => {
    // If MathJax is available on window and there are unparsed elements, trigger async typeset
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function' && containerRef.current) {
      window.MathJax.typesetPromise([containerRef.current]).catch(() => {});
    }
  }, [htmlContent]);

  if (!text) {
    return <Component className={className} />;
  }

  return (
    <Component
      ref={containerRef as any}
      className={`math-rendered-content ${inline ? 'inline align-middle' : 'block'} ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MathJaxView;
