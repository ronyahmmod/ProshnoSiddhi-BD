import React, { useState } from 'react';
import {
  X,
  BookOpen,
  FileSpreadsheet,
  PlusCircle,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  Award,
  Layers,
  FileText,
  Sigma,
  DollarSign
} from 'lucide-react';
import { MathJaxView } from './MathJaxView';

interface QuestionAuthoringGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'single' | 'bulk' | 'review';
}

export const QuestionAuthoringGuidelinesModal: React.FC<QuestionAuthoringGuidelinesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'single'
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'review'>(initialTab);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = `Questions,Option 1,Option 2,Option 3,Option 4,Option 5,Answer,Solution,Subject,Topic,Exam,Difficulty,Tags
"যদি $x^2 - 5x + 6 = 0$ হয় তবে $x$ এর মান কত?","2, 3","1, 6","-2, -3","2, -3","","A","$(x-2)(x-3)=0$ সূত্রানুসারে $x=2$ অথবা $x=3$।","Mathematics","Algebra","46th BCS Preliminary","Medium","BCS, Math, Quadratic"
"একটি আয়তাকার ক্ষেত্রের দৈর্ঘ্য $x$ মিটার এবং প্রস্থ $y$ মিটার হলে পরিসীমা কত?","$2(x+y)$ মিটার","$xy$ বর্গমিটার","$x^2+y^2$ মিটার","$2x+y$ মিটার","","A","আয়তক্ষেত্রের পরিসীমা $= 2 \\times (\\text{দৈর্ঘ্য} + \\text{প্রস্থ}) = 2(x+y)$।","Mathematics","Geometry","45th BCS Preliminary","Easy","Geometry, Perimeter"
"মুক্তিযুদ্ধকালে ২ নং সেক্টরের সেক্টর কমান্ডার কে ছিলেন?","মেজর খালেদ মোশাররফ","মেজর জিয়াউর রহমান","মেজর কে এম শফিউল্লাহ","মেজর সি আর দত্ত","","A","২ নং সেক্টরের প্রধান ছিলেন মেজর খালেদ মোশাররফ (পরবর্তীতে মেজর এ টি এম হায়দার)।","Bangladesh Affairs","History","46th BCS Preliminary","Medium","1971, Liberation War"
"Choose the correct spelling:","Questionnaire","Questionaire","Questionare","Questionnair","","A","Correct spelling is Questionnaire (meaning a set of printed questions).","English Language & Literature","Grammar","44th BCS Preliminary","Easy","Vocabulary, Spelling"`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'proshnosiddhi_sample_questions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-white">
                Question Authoring & Submission Guidelines
              </h2>
              <p className="text-slate-400 text-xs">
                Standards for Single Questions, Excel/CSV Bulk Uploads & Client Review System
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'single'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Single Question Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bulk'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk / Excel & CSV Upload Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'review'
                ? 'bg-white text-amber-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Client Review & Rewards System</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs leading-relaxed custom-scrollbar">
          
          {/* TAB 1: SINGLE QUESTION AUTHORING */}
          {activeTab === 'single' && (
            <div className="space-y-6">
              
              {/* Card 1: Question Stem & Bangla Spacing */}
              <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4.5 space-y-3">
                <h3 className="font-extrabold text-sm text-indigo-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  1. Question Stem & Unicode Bangla Spacing Rules
                </h3>
                <p className="text-slate-700">
                  When writing questions combining Unicode Bangla with mathematical formulas, ensure natural breathing room:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-emerald-50 border border-emerald-300/80 rounded-xl p-3 space-y-1">
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Recommended (With Space)
                    </span>
                    <p className="font-mono text-[11px] text-emerald-950 bg-white/70 p-2 rounded-lg border border-emerald-200">
                      যদি $x = 2$ হয় তবে $x^2 + 5$ এর মান কত?
                    </p>
                    <div className="pt-1 text-slate-700 text-[11px]">
                      <strong>Rendered:</strong> <MathJaxView text="যদি $x = 2$ হয় তবে $x^2 + 5$ এর মান কত?" inline />
                    </div>
                  </div>

                  <div className="bg-rose-50 border border-rose-300/80 rounded-xl p-3 space-y-1">
                    <span className="font-bold text-rose-800 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Auto-Fixed by System
                    </span>
                    <p className="font-mono text-[11px] text-rose-950 bg-white/70 p-2 rounded-lg border border-rose-200">
                      যদি$x=2$হয়তবে$x^2+5$এর মান কত?
                    </p>
                    <p className="text-[11px] text-slate-600">
                      The platform automatically inserts proper margins and non-collapsible spacing so formulas never merge into words.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Math Formatting Reference */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Sigma className="w-4 h-4 text-indigo-600" />
                  2. LaTeX & KaTeX Mathematical Notation Shortcuts
                </h3>
                <p className="text-slate-600">
                  Enclose inline mathematical expressions with <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">$...$</code> and standalone block equations with <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">$$...$$</code>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {[
                    { label: 'Fraction (ভগ্নাংশ)', code: '$\\frac{a}{b}$', preview: '$\\frac{a}{b}$' },
                    { label: 'Square Root (বর্গমূল)', code: '$\\sqrt{x^2 + 16}$', preview: '$\\sqrt{x^2 + 16}$' },
                    { label: 'Exponent (ঘাত/পাওয়ার)', code: '$x^2 + y^2 = 25$', preview: '$x^2 + y^2 = 25$' },
                    { label: 'Quadratic Equation', code: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$', preview: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$' },
                    { label: 'Multiplication & Division', code: '$12 \\times 5 \\div 3 = 20$', preview: '$12 \\times 5 \\div 3 = 20$' },
                    { label: 'Degrees (কোণ)', code: '$\\angle A = 90^\\circ$', preview: '$\\angle A = 90^\\circ$' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-[11px]">{item.label}</span>
                        <button
                          onClick={() => handleCopy(item.code, `code-${idx}`)}
                          className="text-slate-400 hover:text-indigo-600 p-0.5"
                          title="Copy Code"
                        >
                          {copiedCode === `code-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <code className="text-[10px] text-indigo-700 bg-white p-1 rounded border border-slate-200 font-mono truncate">
                        {item.code}
                      </code>
                      <div className="text-center pt-1 border-t border-slate-200/60 min-h-[1.8rem] flex items-center justify-center">
                        <MathJaxView text={item.preview} inline />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Options, Multi-Select & Explanations */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  3. Multiple Options & Verified Explanations
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
                  <li><strong>Option Choices:</strong> Enter 4 to 8 choices. For BCS & Bank Job exams, standard format is 4 options (A, B, C, D).</li>
                  <li><strong>Multi-Correct Options:</strong> Check multiple options if the question has more than one valid answer (e.g. Option A and C).</li>
                  <li><strong>Step-by-Step Explanation:</strong> Always provide clear, step-by-step reasoning so candidates learning from their mistakes can master the problem.</li>
                  <li><strong>Duplicate Prevention:</strong> The modal dynamically runs an AI n-gram comparison. If an identical question exists in the database, you will be warned before saving.</li>
                </ul>
              </div>

            </div>
          )}

          {/* TAB 2: BULK EXCEL & CSV UPLOAD */}
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              
              {/* Action Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                    <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
                    Download Ready-to-Use Excel/CSV Template
                  </h3>
                  <p className="text-slate-600 text-xs">
                    Includes sample rows with Unicode Bangla, KaTeX math formulas, options, correct answers, and tags.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSampleCsv}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 shrink-0 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Supported Column Schema */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-xs">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Supported Column Headers & Data Format
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Header (English/Bangla)</th>
                        <th className="p-2.5">Required?</th>
                        <th className="p-2.5">Example Value</th>
                        <th className="p-2.5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2.5 font-bold font-mono text-indigo-700">Questions / প্রশ্ন</td>
                        <td className="p-2.5"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">Required</span></td>
                        <td className="p-2.5">যদি $x^2 - 5x + 6 = 0$ হয় তবে $x$ এর মান কত?</td>
                        <td className="p-2.5 text-slate-500">Supports KaTeX, LaTeX, and Unicode Bangla.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-mono text-indigo-700">Option 1 ... Option 8</td>
                        <td className="p-2.5"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">At least 2</span></td>
                        <td className="p-2.5">2, 3</td>
                        <td className="p-2.5 text-slate-500">Columns: Option 1, Option 2, Option 3, Option 4...</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-mono text-indigo-700">Answer / সঠিক উত্তর</td>
                        <td className="p-2.5"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">Required</span></td>
                        <td className="p-2.5">A (or 1, or &quot;A, C&quot; for multi-select)</td>
                        <td className="p-2.5 text-slate-500">Letter identifier (A, B, C, D) or index (1, 2, 3, 4).</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-mono text-indigo-700">Solution / ব্যাখ্যা</td>
                        <td className="p-2.5"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">Optional</span></td>
                        <td className="p-2.5">$(x-2)(x-3)=0$ সূত্রানুসারে...</td>
                        <td className="p-2.5 text-slate-500">Step-by-step explanation shown in test review.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-mono text-indigo-700">Subject / বিষয়</td>
                        <td className="p-2.5"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">Optional</span></td>
                        <td className="p-2.5">Mathematics, Bangladesh Affairs</td>
                        <td className="p-2.5 text-slate-500">Defaults to selected category dropdown.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-mono text-indigo-700">Topic / অধ্যায়</td>
                        <td className="p-2.5"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">Optional</span></td>
                        <td className="p-2.5">Algebra, Ratio & Proportion</td>
                        <td className="p-2.5 text-slate-500">Topic taxonomy classification.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold font-mono text-indigo-700">Difficulty</td>
                        <td className="p-2.5"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">Optional</span></td>
                        <td className="p-2.5">Easy / Medium / Hard</td>
                        <td className="p-2.5 text-slate-500">Defaults to Medium.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Duplicate Question Resolution Flow */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4.5 space-y-3">
                <h3 className="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Handling Duplicate Questions in Uploads
                </h3>
                <p className="text-slate-700">
                  When you upload an Excel or CSV file, the platform automatically scans every question against the existing database. You have 3 intelligent resolution options:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                    <span className="font-bold text-slate-900">1. Skip Duplicates (Recommended)</span>
                    <p className="text-slate-500 text-[11px]">
                      Excludes already existing questions and only imports unique new questions to prevent bloating.
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                    <span className="font-bold text-slate-900">2. Update / Merge into Existing</span>
                    <p className="text-slate-500 text-[11px]">
                      Enriches the existing question with new explanations, exam names, and tags from your spreadsheet.
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                    <span className="font-bold text-slate-900">3. Import as Distinct Variations</span>
                    <p className="text-slate-500 text-[11px]">
                      Treats the row as a distinct question (useful for recurring questions across different exam years).
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CLIENT REVIEW & REWARDS */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-white space-y-2 shadow-md">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-200" />
                  <h3 className="font-extrabold text-base">Client Question Review & Contributor Honorarium Program</h3>
                </div>
                <p className="text-amber-100 text-xs leading-relaxed">
                  We believe in crowd-verified, pristine question quality. Candidates and clients who identify mistakes, suggest richer step-by-step explanations, or fix math equations can propose reviews. Once verified and approved by administrators, the updates go live immediately, and contributors qualify for future reviewer payouts!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2.5 shadow-xs">
                  <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    How to Propose a Question Review
                  </h4>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 text-[11px]">
                    <li>Navigate to any question in the <strong>Question Bank</strong> or after taking a <strong>Quiz Test</strong>.</li>
                    <li>Click the <strong>&quot;Propose Review / Report Correction&quot;</strong> button on the question card.</li>
                    <li>Select the Review Category:
                      <ul className="list-disc pl-4 text-slate-500 pt-0.5">
                        <li>Correct Answer Correction (সঠিক উত্তর সংশোধন)</li>
                        <li>Detailed Explanation Enhancement (উন্নত ব্যাখ্যা সংযোজন)</li>
                        <li>Mathematical Formula / KaTeX Fix (গণিত সমীকরণ ঠিক করা)</li>
                        <li>Typo or Formatting Fix (বানান বা ফরমেট ঠিক করা)</li>
                      </ul>
                    </li>
                    <li>Provide your proposed correction and reference source (e.g., Board Textbook, BPSC Gazette).</li>
                    <li>Input your optional bKash/Nagad phone number for reviewer reward tracking.</li>
                  </ol>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-2.5 shadow-xs">
                  <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    Admin Verification & Reviewer Rewards
                  </h4>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-600 text-[11px]">
                    <li><strong>Admin Approval Flow:</strong> Senior administrators inspect the proposed review using an interactive side-by-side comparison tool.</li>
                    <li><strong>Instant Publishing:</strong> Once approved, the question in the Master Question Bank is updated immediately with contributor credit.</li>
                    <li><strong>Contributor Status:</strong> Your user profile will showcase approved reviews, badges, and verified contributions.</li>
                    <li><strong>Future Honorarium Payouts:</strong> In our upcoming paid reviewer tier, approved reviews qualify for direct mobile wallet payments (bKash/Nagad) based on quality tiers.</li>
                  </ul>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            ProshnoSiddhi BD Editorial & Review Guidelines
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition active:scale-95"
          >
            Close Guidelines
          </button>
        </div>

      </div>
    </div>
  );
};
