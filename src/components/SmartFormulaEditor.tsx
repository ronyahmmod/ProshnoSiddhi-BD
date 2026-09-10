import React, { useState } from 'react';
import { Sigma, Eye, Code, Wand2, Type, Sparkles, HelpCircle, Check } from 'lucide-react';
import { MathJaxView } from './MathJaxView';
import { normalizeMixedContentToLatex, cleanEscapedBackslashes } from '../utils/mathNormalizer';

interface SmartFormulaEditorProps {
  id?: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  helperText?: string;
  badge?: string;
}

// Special symbols palette organized by category
const SYMBOL_CATEGORIES = [
  {
    name: 'Common Math',
    symbols: [
      { label: 'x²', insert: '²', title: 'Square (superscript 2)' },
      { label: 'x³', insert: '³', title: 'Cube (superscript 3)' },
      { label: '√', insert: '√', title: 'Square root' },
      { label: '±', insert: '±', title: 'Plus-Minus' },
      { label: '×', insert: '×', title: 'Multiplication' },
      { label: '÷', insert: '÷', title: 'Division' },
      { label: '≠', insert: '≠', title: 'Not equal' },
      { label: '≤', insert: '≤', title: 'Less than or equal' },
      { label: '≥', insert: '≥', title: 'Greater than or equal' },
      { label: '≈', insert: '≈', title: 'Approximately' },
      { label: '∞', insert: '∞', title: 'Infinity' },
      { label: 'π', insert: 'π', title: 'Pi' },
      { label: 'θ', insert: 'θ', title: 'Theta' },
      { label: '°', insert: '°', title: 'Degree' }
    ]
  },
  {
    name: 'Fractions',
    symbols: [
      { label: '½', insert: '½', title: 'Half fraction' },
      { label: '⅓', insert: '⅓', title: 'One third' },
      { label: '¼', insert: '¼', title: 'One quarter' },
      { label: '¾', insert: '¾', title: 'Three quarters' },
      { label: '⅕', insert: '⅕', title: 'One fifth' },
      { label: 'a/b', insert: '(a)/(b)', title: 'Plain fraction (a)/(b)' },
      { label: '$\\frac{a}{b}$', insert: '$\\frac{a}{b}$', title: 'LaTeX Fraction', isLatex: true }
    ]
  },
  {
    name: 'Bengali Digits',
    symbols: [
      { label: '০', insert: '০', title: 'Bengali 0' },
      { label: '১', insert: '১', title: 'Bengali 1' },
      { label: '২', insert: '২', title: 'Bengali 2' },
      { label: '৩', insert: '৩', title: 'Bengali 3' },
      { label: '৪', insert: '৪', title: 'Bengali 4' },
      { label: '৫', insert: '৫', title: 'Bengali 5' },
      { label: '৬', insert: '৬', title: 'Bengali 6' },
      { label: '৭', insert: '৭', title: 'Bengali 7' },
      { label: '৮', insert: '৮', title: 'Bengali 8' },
      { label: '৯', insert: '৯', title: 'Bengali 9' },
      { label: '৳', insert: '৳', title: 'Taka symbol' },
      { label: '।', insert: '।', title: 'Dari (Bengali full stop)' }
    ]
  },
  {
    name: 'Science & Chemistry',
    symbols: [
      { label: '→', insert: '→', title: 'Forward arrow' },
      { label: '⇌', insert: '⇌', title: 'Equilibrium arrow' },
      { label: 'Δ', insert: 'Δ', title: 'Delta / Change' },
      { label: '°C', insert: '°C', title: 'Degree Celsius' },
      { label: 'CO₂', insert: 'CO₂', title: 'Carbon Dioxide' },
      { label: 'H₂O', insert: 'H₂O', title: 'Water formula' },
      { label: 'ATP', insert: 'ATP', title: 'Adenosine Triphosphate' }
    ]
  }
];

export const SmartFormulaEditor: React.FC<SmartFormulaEditorProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  helperText,
  badge
}) => {
  const [mode, setMode] = useState<'plain' | 'latex'>('plain');
  const [showPreview, setShowPreview] = useState(true);
  const [showPalette, setShowPalette] = useState(true);
  const [activeCategory, setActiveCategory] = useState(0);
  const [justConverted, setJustConverted] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Insert a symbol or formula snippet at the cursor position
  const handleInsert = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + snippet);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const newValue = value.substring(0, start) + snippet + value.substring(end);
    onChange(newValue);

    // Set cursor right after the inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 10);
  };

  // Auto-convert plain text math (e.g., (1)/(5), x^2, sqrt(x)) into proper MathJax LaTeX
  const handleAutoConvertToLatex = () => {
    if (!value.trim()) return;
    const cleaned = cleanEscapedBackslashes(value);
    const normalized = normalizeMixedContentToLatex(cleaned);
    onChange(normalized);
    setJustConverted(true);
    setMode('latex');
    setTimeout(() => setJustConverted(false), 2000);
  };

  // Convert LaTeX math into clean, readable plain-text with Unicode special symbols
  const handleSimplifyToPlainText = () => {
    if (!value.trim()) return;
    let simplified = value
      // \text{...}, \mathrm{...}, \mathbf{...}
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\mathrm\{([^}]+)\}/g, '$1')
      .replace(/\\mathbf\{([^}]+)\}/g, '$1')
      // LaTeX fractions $\frac{a}{b}$
      .replace(/\$\\frac\{([^}]+)\}\{([^}]+)\}\$/g, '($1)/($2)')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      // Sqrt $\sqrt{x}$
      .replace(/\$\\sqrt\{([^}]+)\}\$/g, '√($1)')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      // Operators & math symbols
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\pm/g, '±')
      .replace(/\\leq?/g, '≤')
      .replace(/\\geq?/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\infty/g, '∞')
      .replace(/\\pi/g, 'π')
      .replace(/\\theta/g, 'θ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\rightarrow/g, '→')
      .replace(/\\to/g, '→')
      // Superscripts
      .replace(/\^2\b/g, '²')
      .replace(/\^3\b/g, '³')
      .replace(/\^\{2\}/g, '²')
      .replace(/\^\{3\}/g, '³')
      .replace(/\^\{([0-9a-zA-Z+-]+)\}/g, '^($1)')
      .replace(/_\{([0-9a-zA-Z+-]+)\}/g, '_($1)')
      // Math enclosing $...$ and $$...$$
      .replace(/\$\$([^\$]+)\$\$/g, '$1')
      .replace(/\$([^\$]+)\$/g, '$1')
      .replace(/\\\$/g, '$');

    onChange(simplified);
    setMode('plain');
    setJustConverted(true);
    setTimeout(() => setJustConverted(false), 2000);
  };

  return (
    <div className="space-y-2" id={id || `editor-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      {/* Top Header: Label & Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
              {badge}
            </span>
          )}
        </div>

        {/* Toolbar switches */}
        <div className="flex items-center gap-1.5">
          {/* Mode Switch: Plain text vs LaTeX */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setMode('plain');
              }}
              className={`px-2 py-0.5 rounded-md transition flex items-center gap-1 ${
                mode === 'plain'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
              title="Work in simple plain text with special symbols"
            >
              <Type className="w-3 h-3" />
              <span>Plain Text</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('latex');
              }}
              className={`px-2 py-0.5 rounded-md transition flex items-center gap-1 ${
                mode === 'latex'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'hover:text-slate-900'
              }`}
              title="Direct LaTeX / MathJax code format"
            >
              <Code className="w-3 h-3" />
              <span>LaTeX Mode</span>
            </button>
          </div>

          {/* Quick Auto-Convert Button */}
          {mode === 'plain' ? (
            <button
              type="button"
              onClick={handleAutoConvertToLatex}
              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
              title="Convert plain math like (1)/(5) or x^2 to standard formatted LaTeX"
            >
              <Wand2 className="w-3 h-3 text-amber-600" />
              <span>{justConverted ? 'Formatted!' : 'Format Math'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSimplifyToPlainText}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
              title="Convert LaTeX back to simpler readable text"
            >
              <Type className="w-3 h-3" />
              <span>Simplify</span>
            </button>
          )}

          {/* Toggle Special Symbols Palette */}
          <button
            type="button"
            onClick={() => setShowPalette(!showPalette)}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition border ${
              showPalette
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Open quick symbols keyboard"
          >
            <Sigma className="w-3.5 h-3.5" />
            <span>Symbols</span>
          </button>

          {/* Toggle Live Preview */}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition ${
              showPreview ? 'text-indigo-600 bg-indigo-50' : ''
            }`}
            title={showPreview ? 'Hide live formatted preview' : 'Show live formatted preview'}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Interactive Symbols Keyboard (Categorized Palette) */}
      {showPalette && (
        <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1">
              {SYMBOL_CATEGORIES.map((cat, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveCategory(idx)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    activeCategory === idx
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Click symbol to insert at cursor</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SYMBOL_CATEGORIES[activeCategory].symbols.map((sym, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsert(sym.insert)}
                title={sym.title}
                className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-200 rounded-lg text-xs font-mono font-medium transition active:scale-95 border border-slate-700/70 hover:border-indigo-500 shadow-2xs"
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Textarea Input */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={rows}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            placeholder ||
            (mode === 'plain'
              ? 'Enter question in plain text. E.g.: ১/৫ অংশ বা x² + 2x + 1 = 0...'
              : 'Enter LaTeX formulas inside $...$ or $$\\frac{a}{b}$$...')
          }
          className={`w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition leading-relaxed ${
            mode === 'latex' ? 'font-mono bg-slate-50/50' : 'font-sans'
          }`}
        />
      </div>

      {/* Live Formatted Candidate View (MathJax Rendered Preview) */}
      {showPreview && value.trim().length > 0 && (
        <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              Live Candidate Render (How students see it):
            </span>
            <span className="text-[9px] text-slate-400 lowercase font-normal">
              mathjax & unicode reactive
            </span>
          </div>
          <div className="text-xs sm:text-sm text-slate-900 leading-relaxed font-sans min-h-[1.5rem]">
            <MathJaxView text={value} />
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          <span>{helperText}</span>
        </p>
      )}
    </div>
  );
};
