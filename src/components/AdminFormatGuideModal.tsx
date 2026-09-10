import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  X,
  FileText,
  Table,
  Sigma,
  HelpCircle,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';

interface AdminFormatGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminFormatGuideModal: React.FC<AdminFormatGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'csv' | 'math'>('columns');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const SAMPLE_CSV = `"Questions","Option 1","Option 2","Option 3","Option 4","Answer","Solution","Subject","Topic","Difficulty","Exam"
"যদি $x^2 - 5x + 6 = 0$ হয়, তবে $x$ এর মান কত?","$x = 2, 3","$x = -2, -3","$x = 1, 6","$x = -1, -6","$x = 2, 3","উৎপাদকে বিশ্লেষণ: $(x - 2)(x - 3) = 0 \\implies x = 2 \\text{ বা } 3$","Mathematics","Quadratic Equations","Easy","46th BCS Preliminary"
"What is the synonym of the word 'Lucid'?","Ambiguous","Clear and understandable","Obscure","Vague","Clear and understandable","Lucid means clear, easy to understand, or transparent. Antonyms: Obscure, vague.","English Language & Literature","Vocabulary","Medium","46th BCS Preliminary"
"বাংলাদেশের প্রথম নারী পররাষ্ট্রমন্ত্রীর নাম কী?","বেগম খালেদা জিয়া","ডা. দীপু মনি","শেখ হাসিনা","সৈয়দা সাজেদা চৌধুরী","ডা. দীপু মনি","২০০৯ সালে বাংলাদেশ আওয়ামী লীগ সরকারের মেয়াদে ডা. দীপু মনি বাংলাদেশের প্রথম নারী পররাষ্ট্রমন্ত্রী হিসেবে দায়িত্ব গ্রহণ করেন।","Bangladesh Affairs","Constitutional Governance","Easy","Govt Job Recruitment"
"Which layer of the OSI model ensures reliable end-to-end communication?","Network Layer","Transport Layer","Data Link Layer","Physical Layer","Transport Layer","The Transport Layer (Layer 4) provides transparent transfer of data between end users, handling flow control and error checking (TCP/UDP).","Information & Communication Technology","Computer Networks","Hard","Bank Officer Recruitment"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(SAMPLE_CSV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Proshno_Questions_Import_Template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-2xl font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Supported Question Import File Formats & Blueprint
              </h3>
              <p className="text-xs text-slate-300">
                Learn which files (CSV, Excel, TSV, Google Sheets) and column headers the platform digests.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('columns')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'columns'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Column Schema & Blueprint</span>
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'csv'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Sample CSV & Download</span>
          </button>

          <button
            onClick={() => setActiveTab('math')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'math'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sigma className="w-4 h-4" />
            <span>LaTeX Math Support</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'columns' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Flexible File Formats Accepted:</p>
                  <p className="text-indigo-800 leading-relaxed">
                    The platform automatically digests <strong>.csv</strong>, <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.tsv</strong>, or direct copy-paste from <strong>Google Sheets</strong>. Column names are case-insensitive and match flexible synonyms.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Column Header</th>
                      <th className="py-2.5 px-3">Aliases Accepted</th>
                      <th className="py-2.5 px-3">Requirement</th>
                      <th className="py-2.5 px-3">Description / Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Questions</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">question, questions, প্রশ্ন</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">REQUIRED</span></td>
                      <td className="py-3 px-3 text-slate-700">The full question statement. Supports math formulas in <code>$...$</code>.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Option 1 (A)</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">option1, option a, opt1, ক</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">REQUIRED</span></td>
                      <td className="py-3 px-3 text-slate-700">First multiple choice answer.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Option 2 (B)</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">option2, option b, opt2, খ</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">REQUIRED</span></td>
                      <td className="py-3 px-3 text-slate-700">Second multiple choice answer.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Option 3 (C)</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">option3, option c, opt3, গ</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">OPTIONAL</span></td>
                      <td className="py-3 px-3 text-slate-700">Third multiple choice answer.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Option 4 (D)</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">option4, option d, opt4, ঘ</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">OPTIONAL</span></td>
                      <td className="py-3 px-3 text-slate-700">Fourth multiple choice answer.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Answer</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">answer, correct, উত্তর</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">REQUIRED</span></td>
                      <td className="py-3 px-3 text-slate-700">
                        Can be the exact option text, letter (<code>A</code>, <code>B</code>, <code>C</code>, <code>D</code>), or number (<code>1</code>, <code>2</code>, <code>3</code>, <code>4</code>).
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Solution</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">solution, explanation, ব্যাখ্যা</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">RECOMMENDED</span></td>
                      <td className="py-3 px-3 text-slate-700">
                        Step-by-step reasoning shown to student after answer. If blank, can be auto-generated by the AI tool.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Subject</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">subject, category, বিষয়</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">OPTIONAL</span></td>
                      <td className="py-3 px-3 text-slate-700">e.g., Mathematics, Bangladesh Affairs, English. (Defaults to batch setting if blank).</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Topic</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">topic, subtopic, অধ্যায়</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">OPTIONAL</span></td>
                      <td className="py-3 px-3 text-slate-700">e.g., Quadratic Equations, Constitution, Vocabulary.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Difficulty</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">difficulty, level</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">OPTIONAL</span></td>
                      <td className="py-3 px-3 text-slate-700"><code>Easy</code>, <code>Medium</code>, or <code>Hard</code>. Defaults to <code>Medium</code>.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-slate-900">Exam</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">exam, exam_tag, পরীক্ষা</td>
                      <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">OPTIONAL</span></td>
                      <td className="py-3 px-3 text-slate-700">e.g., <code>46th BCS Preliminary</code>, <code>Bank Officer</code>.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 font-medium">
                  Copy this raw template or download it as a ready-to-use CSV file:
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .CSV Template</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-72 leading-relaxed border border-slate-800">
                <pre>{SAMPLE_CSV}</pre>
              </div>
            </div>
          )}

          {activeTab === 'math' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 space-y-2">
                <h4 className="font-bold flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Full LaTeX & MathJax Syntax is Supported Everywhere
                </h4>
                <p>
                  You can enclose any mathematical symbol or expression inside single dollar signs <code>$...$</code> for inline formulas, or double dollar signs <code>$$...$$</code> for centered equations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900">Fractions & Roots</p>
                  <p className="font-mono text-indigo-700">{String.raw`$\frac{a + b}{c}$`}</p>
                  <p className="font-mono text-indigo-700">{String.raw`$\sqrt{x^2 + 16}$`}</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900">Powers & Subscripts</p>
                  <p className="font-mono text-indigo-700">{String.raw`$x^2 - 5x + 6 = 0$`}</p>
                  <p className="font-mono text-indigo-700">{String.raw`$a_1 + a_2 + \dots + a_n$`}</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900">Greek Symbols</p>
                  <p className="font-mono text-indigo-700">{String.raw`$\alpha, \beta, \theta, \pi, \sigma$`}</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900">Set Theory & Logic</p>
                  <p className="font-mono text-indigo-700">{String.raw`$A \cup B, A \cap B, \implies, \neq$`}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            UTF-8 encoded • Compatible with Excel, Google Sheets, LibreOffice, and CSV
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
