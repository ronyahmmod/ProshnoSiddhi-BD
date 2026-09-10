import React from 'react';
import { Sigma, Sparkles, Copy, Check, Calculator } from 'lucide-react';

interface MathFormulaToolbarProps {
  onInsertSnippet?: (snippet: string) => void;
  compact?: boolean;
}

interface MathSnippet {
  label: string;
  latex: string;
  category: 'algebra' | 'calculus' | 'symbols' | 'geometry';
}

const MATH_SNIPPETS: MathSnippet[] = [
  { label: 'Fraction a/b', latex: '$\\frac{a}{b}$', category: 'algebra' },
  { label: 'Square Root √x', latex: '$\\sqrt{x}$', category: 'algebra' },
  { label: 'Power x²', latex: '$x^{2}$', category: 'algebra' },
  { label: 'Subscript x₁', latex: '$x_{1}$', category: 'algebra' },
  { label: 'Logarithm log₂(x)', latex: '$\\log_{2}(x)$', category: 'algebra' },
  { label: 'Quadratic ax²+bx+c', latex: '$ax^2 + bx + c = 0$', category: 'algebra' },
  { label: 'Summation ∑', latex: '$\\sum_{i=1}^{n} x_i$', category: 'calculus' },
  { label: 'Integral ∫', latex: '$\\int_{a}^{b} f(x) dx$', category: 'calculus' },
  { label: 'Limit lim', latex: '$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$', category: 'calculus' },
  { label: 'Matrix 2×2', latex: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$', category: 'algebra' },
  { label: 'Plus-Minus ±', latex: '$\\pm$', category: 'symbols' },
  { label: 'Multiply ×', latex: '$\\times$', category: 'symbols' },
  { label: 'Divide ÷', latex: '$\\div$', category: 'symbols' },
  { label: 'Pi π', latex: '$\\pi$', category: 'symbols' },
  { label: 'Theta θ', latex: '$\\theta$', category: 'symbols' },
  { label: 'Alpha α', latex: '$\\alpha$', category: 'symbols' },
  { label: 'Delta Δ', latex: '$\\Delta$', category: 'symbols' },
  { label: 'Degree °', latex: '$90^\\circ$', category: 'geometry' },
  { label: 'Triangle ΔABC', latex: '$\\triangle ABC$', category: 'geometry' },
  { label: 'Angle ∠', latex: '$\\angle ABC = 60^\\circ$', category: 'geometry' },
  { label: 'Less/Equal ≤', latex: '$\\le$', category: 'symbols' },
  { label: 'Greater/Equal ≥', latex: '$\\ge$', category: 'symbols' },
  { label: 'Not Equal ≠', latex: '$\\neq$', category: 'symbols' },
  { label: 'Infinity ∞', latex: '$\\infty$', category: 'symbols' },
];

export const MathFormulaToolbar: React.FC<MathFormulaToolbarProps> = ({
  onInsertSnippet,
  compact = false
}) => {
  const [copiedSnippet, setCopiedSnippet] = React.useState<string | null>(null);

  const handleClick = (snippet: string) => {
    if (onInsertSnippet) {
      onInsertSnippet(snippet);
    } else {
      navigator.clipboard.writeText(snippet);
      setCopiedSnippet(snippet);
      setTimeout(() => setCopiedSnippet(null), 1500);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-200 rounded-xl p-3 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <Calculator className="w-3.5 h-3.5" />
          <span>MathJax & LaTeX Quick Formula Helper</span>
        </div>
        <span className="text-[10px] text-slate-400">
          {onInsertSnippet ? 'Click to insert into field' : 'Click to copy to clipboard'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
        {MATH_SNIPPETS.map((snip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleClick(snip.latex)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 hover:text-emerald-300 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-mono transition flex items-center gap-1"
            title={`${snip.label}: ${snip.latex}`}
          >
            <span>{snip.label}</span>
            {copiedSnippet === snip.latex ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MathFormulaToolbar;
