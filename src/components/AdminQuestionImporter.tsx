import React, { useState, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  Table,
  RefreshCw,
  Trash2,
  Eye,
  FileText,
  Sparkles,
  Link2,
  Layers,
  HelpCircle,
  Calculator,
  Sigma,
  Wand2,
  Edit3,
  Check,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  GitMerge,
  Split,
  CheckSquare,
  X
} from 'lucide-react';
import {
  parseCsvString,
  parseExcelFile,
  ParsedQuestionRow,
  ParseSpreadsheetResult,
  exportQuestionsToCsv
} from '../utils/spreadsheetParser';
import { importQuestionsBatch, fetchQuestions, updateQuestion } from '../api';
import { findDuplicatesInList } from '../utils/duplicationDetector';
import { Difficulty, Question } from '../types';
import { MathJaxView } from './MathJaxView';
import { MathFormulaToolbar } from './MathFormulaToolbar';
import { autoFixLatexSyntax, normalizeMixedContentToLatex, validateTextWithKatex } from '../utils/mathNormalizer';
import { AdminFormatGuideModal } from './AdminFormatGuideModal';

interface AdminQuestionImporterProps {
  onImportComplete?: () => void;
}

const SUBJECT_OPTIONS = [
  'Mathematics',
  'Bangladesh Affairs',
  'International Affairs',
  'English Language & Literature',
  'General Science',
  'Mental Ability & Analytical Reasoning',
  'Information & Communication Technology',
  'Geography, Environment & Disaster Management',
  'Ethics, Values & Good Governance'
];

export const AdminQuestionImporter: React.FC<AdminQuestionImporterProps> = ({ onImportComplete }) => {
  const [importMode, setImportMode] = useState<'file' | 'paste' | 'url' | 'mathjax'>('file');
  const [defaultSubject, setDefaultSubject] = useState<string>('Mathematics');
  const [defaultTopic, setDefaultTopic] = useState<string>('Algebra & Functions');
  const [defaultDifficulty, setDefaultDifficulty] = useState<Difficulty>('Medium');
  const [defaultExamTag, setDefaultExamTag] = useState<string>('46th BCS Preliminary');

  const [pastedText, setPastedText] = useState<string>('');
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [importBatchId, setImportBatchId] = useState<string>(() => `BATCH-${Date.now().toString(36).toUpperCase()}`);

  // MathJax live sandbox test state
  const [sandboxQuestion, setSandboxQuestion] = useState<string>(
    'যদি x^2 - 5x + 6 = 0 হয়, তবে x এর মান কত এবং sqrt(x^2 + 16) কত?'
  );
  const [sandboxOptionA, setSandboxOptionA] = useState<string>('x = 2, 3');
  const [sandboxOptionB, setSandboxOptionB] = useState<string>('x = -2, -3');
  const [sandboxOptionC, setSandboxOptionC] = useState<string>('x = 1, 6');
  const [sandboxOptionD, setSandboxOptionD] = useState<string>('x = 4, 5');
  const [sandboxExplanation, setSandboxExplanation] = useState<string>(
    'উৎপাদকে বিশ্লেষণ: x^2 - 5x + 6 = 0 => (x - 2)(x - 3) = 0.\nসুতরাং x = 2 অথবা x = 3.\nযখন x = 3, তখন sqrt(3^2 + 16) = sqrt(9 + 16) = sqrt(25) = 5.'
  );

  const [parsedResult, setParsedResult] = useState<ParseSpreadsheetResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid' | 'math' | 'duplicate'>('all');
  const [viewFormat, setViewFormat] = useState<'katex' | 'latex' | 'raw'>('katex');
  const [selectedPreviewQuestion, setSelectedPreviewQuestion] = useState<ParsedQuestionRow | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingRowData, setEditingRowData] = useState<ParsedQuestionRow | null>(null);
  const [isFormatGuideOpen, setIsFormatGuideOpen] = useState(false);

  // Duplication Detection States against Live Master Question Bank
  const [existingQuestions, setExistingQuestions] = useState<Question[]>([]);
  const [globalDuplicateAction, setGlobalDuplicateAction] = useState<'SKIP' | 'UPDATE' | 'IMPORT_ANYWAY'>('SKIP');
  const [comparingDuplicateRow, setComparingDuplicateRow] = useState<ParsedQuestionRow | null>(null);

  useEffect(() => {
    fetchQuestions()
      .then((qs) => {
        if (Array.isArray(qs)) setExistingQuestions(qs);
      })
      .catch((err) => console.error('Failed to pre-fetch questions for duplicate detector:', err));
  }, []);

  // Helper to cross-reference and enrich parsed questions with database duplicates
  const enrichWithDuplicateChecks = (
    result: ParseSpreadsheetResult,
    dbQuestions: Question[],
    defaultResolution: 'SKIP' | 'UPDATE' | 'IMPORT_ANYWAY' = 'SKIP'
  ): ParseSpreadsheetResult => {
    if (!dbQuestions || dbQuestions.length === 0) return result;

    const enriched = result.questions.map((q) => {
      const dupes = findDuplicatesInList(
        { text: q.text, options: q.options, subject: q.subject },
        dbQuestions,
        0.72
      );

      if (dupes.length > 0) {
        const topMatch = dupes[0];
        return {
          ...q,
          duplicateMatch: {
            existingQuestion: topMatch.question,
            similarity: topMatch.similarity,
            reason: topMatch.reason
          },
          duplicateResolution: q.duplicateResolution || defaultResolution
        };
      }
      return q;
    });

    return {
      ...result,
      questions: enriched
    };
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate a fresh batch ID
  const generateNewBatchId = () => {
    setImportBatchId(`BATCH-${Date.now().toString(36).toUpperCase()}`);
  };

  // Download Sample Template for Non-Technical Uploaders (Plain Math without LaTeX)
  const handleDownloadPlainMathSample = () => {
    const sampleContent = `"Questions","Option 1","Option 2","Option 3","Option 4","Answer","Solution","Subject","Topic","Difficulty"
"যদি x^2 - 5x + 6 = 0 হয়, তবে x এর মান কত?","x = 2, 3","x = -2, -3","x = 1, 6","x = -1, -6","x = 2, 3","সমীকরণ: x^2 - 5x + 6 = 0 => (x - 2)(x - 3) = 0. সুতরাং x = 2 অথবা x = 3.","Mathematics","Quadratic Equations","Easy"
"If log2(x + 3) = 5, what is the value of x?","29","27","32","25","29","By logarithmic definition: x + 3 = 2^5 = 32 => x = 32 - 3 = 29.","Mathematics","Logarithms","Medium"
"Evaluate the integral: int_0^2 (3x^2 + 2x + 1) dx","14","12","16","10","14","int_0^2 (3x^2 + 2x + 1) dx = [x^3 + x^2 + x]_0^2 = 8 + 4 + 2 = 14.","Mathematics","Calculus & Integrals","Hard"
"What is the hypotenuse of a right-angled triangle with sides a = 6 cm and b = 8 cm?","10 cm","12 cm","14 cm","9 cm","10 cm","By Pythagorean theorem: c = sqrt(a^2 + b^2) = sqrt(6^2 + 8^2) = sqrt(36 + 64) = sqrt(100) = 10 cm.","Mathematics","Geometry & Trigonometry","Easy"
"Simplify the algebraic fraction: (a^3 - b^3)/(a - b)","a^2 + ab + b^2","a^2 - ab + b^2","(a - b)^2","a^2 + b^2","a^2 + ab + b^2","Formula for difference of cubes: a^3 - b^3 = (a - b)(a^2 + ab + b^2). Dividing by (a - b) yields a^2 + ab + b^2.","Mathematics","Algebraic Formulae","Medium"`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'proshno_plain_math_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download dedicated MathJax / LaTeX questions template
  const handleDownloadMathJaxSample = () => {
    const sampleContent = `"Questions","Option 1","Option 2","Option 3","Option 4","Answer","Solution","Subject","Topic","Difficulty"
"যদি $x^2 - 5x + 6 = 0$ হয়, তবে $x$ এর মান কত?","$x = 2, 3$","$x = -2, -3$","$x = 1, 6$","$x = -1, -6$","$x = 2, 3$","সমীকরণ: $x^2 - 5x + 6 = 0 \\Rightarrow (x - 2)(x - 3) = 0$. সুতরাং $x = 2$ অথবা $x = 3$.","Mathematics","Quadratic Equations","Easy"
"If $\\log_2(x + 3) = 5$, what is the value of $x$?","$29$","$27$","$32$","$25$","$29$","By logarithmic definition: $x + 3 = 2^5 = 32 \\Rightarrow x = 32 - 3 = 29$.","Mathematics","Logarithms","Medium"
"Evaluate the definite integral: $\\int_{0}^{2} (3x^2 + 2x + 1) dx$","$14$","$12$","$16$","$10$","$14$","$\\int_{0}^{2} (3x^2 + 2x + 1) dx = \\left[ x^3 + x^2 + x \\right]_0^2 = (2^3 + 2^2 + 2) - 0 = 8 + 4 + 2 = 14$.","Mathematics","Calculus & Integrals","Hard"
"What is the hypotenuse of a right-angled triangle with legs $a = 6\\text{ cm}$ and $b = 8\\text{ cm}$?","$10\\text{ cm}$","$12\\text{ cm}$","$14\\text{ cm}$","$9\\text{ cm}$","$10\\text{ cm}$","By Pythagorean theorem: $c = \\sqrt{a^2 + b^2} = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10\\text{ cm}$.","Mathematics","Geometry & Trigonometry","Easy"
"Simplify the algebraic fraction: $\\frac{a^3 - b^3}{a - b}$","$a^2 + ab + b^2$","$a^2 - ab + b^2$","$(a - b)^2$","$a^2 + b^2$","$a^2 + ab + b^2$","Formula for difference of cubes: $a^3 - b^3 = (a - b)(a^2 + ab + b^2)$. Dividing by $(a - b)$ yields $a^2 + ab + b^2$.","Mathematics","Algebraic Formulae","Medium"`;

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'proshno_latex_mathjax_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process File (CSV, XLSX, XLS)
  const handleFileUpload = (file: File) => {
    setIsParsing(true);
    setStatusMessage(null);
    setFileName(file.name);
    generateNewBatchId();

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const rawParsed = parseExcelFile(buffer, defaultSubject, defaultTopic, defaultDifficulty);
          const res = enrichWithDuplicateChecks(rawParsed, existingQuestions, globalDuplicateAction);
          setParsedResult(res);
          const dupeCount = res.questions.filter((q) => q.duplicateMatch).length;
          setStatusMessage({
            type: 'success',
            text: `Batch ${importBatchId}: Parsed ${res.validCount} valid questions (${res.totalMathFormulasDetected} math expressions normalized & verified with KaTeX)${
              dupeCount > 0 ? ` • ⚠️ ${dupeCount} potential duplicate(s) detected in database` : ''
            }.`
          });
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Failed to parse Excel file: ${err.message}` });
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Treat as CSV or text
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rawParsed = parseCsvString(text, defaultSubject, defaultTopic, defaultDifficulty);
          const res = enrichWithDuplicateChecks(rawParsed, existingQuestions, globalDuplicateAction);
          setParsedResult(res);
          const dupeCount = res.questions.filter((q) => q.duplicateMatch).length;
          setStatusMessage({
            type: 'success',
            text: `Batch ${importBatchId}: Parsed ${res.validCount} valid questions (${res.totalMathFormulasDetected} math expressions normalized & verified with KaTeX)${
              dupeCount > 0 ? ` • ⚠️ ${dupeCount} potential duplicate(s) detected in database` : ''
            }.`
          });
        } catch (err: any) {
          setStatusMessage({ type: 'error', text: `Failed to parse CSV file: ${err.message}` });
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  // Process Pasted Data
  const handleParsePasted = () => {
    if (!pastedText.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste spreadsheet rows or CSV data into the text box.' });
      return;
    }
    setIsParsing(true);
    setStatusMessage(null);
    generateNewBatchId();
    try {
      const rawParsed = parseCsvString(pastedText, defaultSubject, defaultTopic, defaultDifficulty);
      const res = enrichWithDuplicateChecks(rawParsed, existingQuestions, globalDuplicateAction);
      setParsedResult(res);
      const dupeCount = res.questions.filter((q) => q.duplicateMatch).length;
      setStatusMessage({
        type: 'success',
        text: `Batch ${importBatchId}: Parsed ${res.validCount} questions (${res.totalMathFormulasDetected} math expressions normalized & verified)${
          dupeCount > 0 ? ` • ⚠️ ${dupeCount} potential duplicate(s) detected in database` : ''
        }.`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Failed to parse pasted data: ${err.message}` });
    } finally {
      setIsParsing(false);
    }
  };

  // Process Google Sheets Published URL
  const handleFetchGoogleSheets = async () => {
    if (!sheetUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Google Sheets URL or published CSV link.' });
      return;
    }

    setIsParsing(true);
    setStatusMessage(null);
    generateNewBatchId();

    let fetchUrl = sheetUrl.trim();
    if (fetchUrl.includes('docs.google.com/spreadsheets/d/')) {
      const match = fetchUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const sheetId = match[1];
        fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      }
    }

    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`Google Sheets responded with status ${res.status}`);
      const csvText = await res.text();
      const rawParsed = parseCsvString(csvText, defaultSubject, defaultTopic, defaultDifficulty);
      const parsed = enrichWithDuplicateChecks(rawParsed, existingQuestions, globalDuplicateAction);
      setParsedResult(parsed);
      const dupeCount = parsed.questions.filter((q) => q.duplicateMatch).length;
      setStatusMessage({
        type: 'success',
        text: `Batch ${importBatchId}: Successfully fetched & parsed ${parsed.validCount} questions (${parsed.totalMathFormulasDetected} math expressions normalized)${
          dupeCount > 0 ? ` • ⚠️ ${dupeCount} potential duplicate(s) detected in database` : ''
        }.`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Could not fetch Google Sheet: ${err.message}. Make sure the sheet is shared as "Anyone with the link can view" or published as CSV.`
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Auto-Repair All LaTeX Syntax in Current Batch
  const handleAutoRepairAllMath = () => {
    if (!parsedResult) return;

    const repairedQuestions = parsedResult.questions.map((q) => {
      const { fixed: fixedText } = autoFixLatexSyntax(q.text);
      const fixedOptions = q.options.map((opt) => autoFixLatexSyntax(opt).fixed);
      const { fixed: fixedExplanation } = autoFixLatexSyntax(q.explanation);

      // Re-validate
      const vText = validateTextWithKatex(fixedText);
      const vOpts = fixedOptions.map((o) => validateTextWithKatex(o));
      const vExpl = validateTextWithKatex(fixedExplanation);

      const allWarns = [...vText.warnings, ...vOpts.flatMap((o) => o.warnings), ...vExpl.warnings];

      return {
        ...q,
        text: fixedText,
        options: fixedOptions,
        explanation: fixedExplanation,
        mathWarnings: allWarns,
        mathStatus: (allWarns.length > 0 ? 'WARNING' : 'VALID') as any
      };
    });

    setParsedResult({
      ...parsedResult,
      questions: repairedQuestions,
      warningMathCount: repairedQuestions.filter((q) => q.mathStatus === 'WARNING').length
    });

    setStatusMessage({
      type: 'success',
      text: 'Auto-repaired math syntax, unescaped percentages, and delimiters across all batch questions!'
    });
  };

  // Remove single row from parsed result
  const handleRemoveRow = (index: number) => {
    if (!parsedResult) return;
    const updated = parsedResult.questions.filter((_, idx) => idx !== index);
    const validCount = updated.filter((q) => q.isValid).length;
    setParsedResult({
      ...parsedResult,
      questions: updated,
      totalRows: updated.length,
      validCount,
      invalidCount: updated.length - validCount
    });
  };

  // Open inline row editor
  const handleStartEditRow = (q: ParsedQuestionRow, index: number) => {
    setEditingIndex(index);
    setEditingRowData({ ...q });
  };

  // Save inline edited row
  const handleSaveEditRow = () => {
    if (!parsedResult || editingIndex === null || !editingRowData) return;

    // Normalize and validate edited row
    const normText = normalizeMixedContentToLatex(editingRowData.text).normalized;
    const normOptions = editingRowData.options.map((o) => normalizeMixedContentToLatex(o).normalized);
    const normExplanation = normalizeMixedContentToLatex(editingRowData.explanation).normalized;

    const vText = validateTextWithKatex(normText);
    const vOpts = normOptions.map((o) => validateTextWithKatex(o));
    const vExpl = validateTextWithKatex(normExplanation);
    const allWarns = [...vText.warnings, ...vOpts.flatMap((o) => o.warnings), ...vExpl.warnings];

    const updatedRow: ParsedQuestionRow = {
      ...editingRowData,
      text: normText,
      options: normOptions,
      explanation: normExplanation,
      mathWarnings: allWarns,
      mathStatus: allWarns.length > 0 ? 'WARNING' : 'VALID'
    };

    const updatedList = [...parsedResult.questions];
    updatedList[editingIndex] = updatedRow;

    setParsedResult({
      ...parsedResult,
      questions: updatedList,
      validCount: updatedList.filter((q) => q.isValid).length
    });

    setEditingIndex(null);
    setEditingRowData(null);
  };

  // Apply duplicate resolution globally across all detected duplicate rows
  const handleApplyGlobalDuplicateAction = (action: 'SKIP' | 'UPDATE' | 'IMPORT_ANYWAY') => {
    setGlobalDuplicateAction(action);
    if (!parsedResult) return;

    const updatedQuestions = parsedResult.questions.map((q) => {
      if (q.duplicateMatch) {
        return {
          ...q,
          duplicateResolution: action
        };
      }
      return q;
    });

    setParsedResult({
      ...parsedResult,
      questions: updatedQuestions
    });
  };

  // Set duplicate resolution for a single row
  const handleSetRowDuplicateResolution = (
    index: number,
    action: 'SKIP' | 'UPDATE' | 'IMPORT_ANYWAY'
  ) => {
    if (!parsedResult) return;
    const updatedQuestions = [...parsedResult.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      duplicateResolution: action
    };
    setParsedResult({
      ...parsedResult,
      questions: updatedQuestions
    });
  };

  // Commit batch import to backend
  const handleCommitImport = async () => {
    if (!parsedResult || parsedResult.validCount === 0) {
      setStatusMessage({ type: 'error', text: 'No valid questions to import.' });
      return;
    }

    setIsImporting(true);
    setStatusMessage(null);

    const validQuestions = parsedResult.questions.filter((q) => q.isValid);

    const skippedRows = validQuestions.filter(
      (q) => q.duplicateMatch && q.duplicateResolution === 'SKIP'
    );
    const updateRows = validQuestions.filter(
      (q) => q.duplicateMatch && q.duplicateResolution === 'UPDATE'
    );
    const newRowsToImport = validQuestions.filter(
      (q) => !q.duplicateMatch || q.duplicateResolution === 'IMPORT_ANYWAY'
    );

    if (newRowsToImport.length === 0 && updateRows.length === 0) {
      setStatusMessage({
        type: 'warning',
        text: `All ${skippedRows.length} duplicate questions were marked as "Skip". No records were committed or changed in database.`
      });
      setIsImporting(false);
      return;
    }

    try {
      let updatedCount = 0;
      // Overwrite/Update existing questions in database if requested
      for (const q of updateRows) {
        if (q.duplicateMatch?.existingQuestion?.id) {
          const correctIndices = q.correctOptionIndices && q.correctOptionIndices.length > 0
            ? q.correctOptionIndices
            : (typeof q.correctOptionIndex === 'number' ? [q.correctOptionIndex] : [0]);

          await updateQuestion(q.duplicateMatch.existingQuestion.id, {
            text: q.text,
            options: q.options,
            correctOptionIndex: correctIndices[0] ?? 0,
            explanation: q.explanation,
            subject: q.subject || defaultSubject,
            topic: q.topic || defaultTopic,
            difficulty: q.difficulty || defaultDifficulty
          });
          updatedCount++;
        }
      }

      let importedCount = 0;
      let isProposal = false;
      let prNumber: number | undefined;

      // Import new questions as new records
      if (newRowsToImport.length > 0) {
        const questionsToImport = newRowsToImport.map((q) => {
          const correctIndices = q.correctOptionIndices && q.correctOptionIndices.length > 0
            ? q.correctOptionIndices
            : (typeof q.correctOptionIndex === 'number' ? [q.correctOptionIndex] : [0]);

          return {
            text: q.text,
            options: q.options,
            correctOptionIndex: correctIndices[0] ?? 0,
            correctOptionIndices: correctIndices,
            isMultiSelect: q.isMultiSelect !== undefined ? q.isMultiSelect : correctIndices.length > 1,
            explanation: q.explanation,
            subject: q.subject || defaultSubject,
            topic: q.topic || defaultTopic,
            subtopic: q.subtopic || undefined,
            exam: q.exam || defaultExamTag || undefined,
            questionSource: q.questionSource || undefined,
            difficulty: q.difficulty || defaultDifficulty,
            tags: [q.subject || defaultSubject, defaultExamTag, ...(q.tags || [])]
          };
        });

        const response = await importQuestionsBatch(questionsToImport as any);
        importedCount = response.importedCount;
        isProposal = response.isProposal;
        prNumber = response.pullRequest?.prNumber;
      }

      let msg = '';
      if (isProposal) {
        msg = `🚀 Batch ${importBatchId}: Submitted ${importedCount} new questions as PR #${prNumber}.`;
      } else {
        msg = `🎉 Batch ${importBatchId}: Successfully committed ${importedCount} new questions to Master Question Bank.`;
      }

      if (updatedCount > 0) {
        msg += ` Overwrote & updated ${updatedCount} existing duplicate records in database.`;
      }
      if (skippedRows.length > 0) {
        msg += ` Skipped ${skippedRows.length} existing duplicate records.`;
      }

      setStatusMessage({
        type: 'success',
        text: msg
      });

      // Refresh existing questions list
      fetchQuestions().then(qs => { if (Array.isArray(qs)) setExistingQuestions(qs); }).catch(console.error);

      setParsedResult(null);
      setPastedText('');
      setFileName(null);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Import failed: ${err.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  const duplicateQuestionsCount =
    parsedResult?.questions.filter((q) => q.duplicateMatch).length || 0;

  const filteredQuestions =
    parsedResult?.questions.filter((q) => {
      if (previewFilter === 'valid') return q.isValid;
      if (previewFilter === 'invalid') return !q.isValid;
      if (previewFilter === 'math') return (q.detectedFormulasCount || 0) > 0;
      if (previewFilter === 'duplicate') return !!q.duplicateMatch;
      return true;
    }) || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" /> Mathematical Question Pipeline
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Batch ID: {importBatchId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Import & Auto-Normalize Mathematical Questions
            </h2>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Upload spreadsheets (CSV, Excel) or plain text math. Our engine automatically parses plain math notations (e.g. <code>x^2</code>, <code>1/2</code>, <code>sqrt(16)</code>, <code>30 deg</code>), normalizes to canonical LaTeX, validates with KaTeX, and prepares clean records for instant rendering.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsFormatGuideOpen(true)}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition"
              title="See supported columns, CSV, Excel, TSV, Google Sheets formats"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Supported File Formats & Blueprint</span>
            </button>
            <button
              onClick={handleDownloadPlainMathSample}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition"
              title="Download sample for non-technical authors without LaTeX knowledge"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Plain Math CSV Template</span>
            </button>
            <button
              onClick={handleDownloadMathJaxSample}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
              title="Download template with formatted LaTeX $...$ equations"
            >
              <Sigma className="w-3.5 h-3.5 text-indigo-400" />
              <span>LaTeX / KaTeX Template</span>
            </button>
          </div>
        </div>

        {/* 6-Stage Visual Workflow Stepper */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              parsedResult ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-200' : 'bg-slate-800/50 border-slate-700 text-white'
            }`}>
              <div className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">1</div>
              <div className="truncate">
                <div className="font-bold">1. Upload Raw</div>
                <div className="text-[9px] text-slate-400">CSV / XLS / Text</div>
              </div>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              parsedResult ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'
            }`}>
              <div className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">2</div>
              <div className="truncate">
                <div className="font-bold">2. Field Mapping</div>
                <div className="text-[9px] text-slate-400">Preserve original</div>
              </div>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              parsedResult ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'
            }`}>
              <div className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">3</div>
              <div className="truncate">
                <div className="font-bold">3. Normalization</div>
                <div className="text-[9px] text-slate-400">Convert to LaTeX</div>
              </div>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              parsedResult ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'
            }`}>
              <div className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">4</div>
              <div className="truncate">
                <div className="font-bold">4. KaTeX Check</div>
                <div className="text-[9px] text-slate-400">Validate syntax</div>
              </div>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              parsedResult ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'
            }`}>
              <div className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">5</div>
              <div className="truncate">
                <div className="font-bold">5. Review & Edit</div>
                <div className="text-[9px] text-slate-400">Resolve warnings</div>
              </div>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              isImporting ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200' : 'bg-slate-800/50 border-slate-700 text-slate-400'
            }`}>
              <div className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold text-[10px]">6</div>
              <div className="truncate">
                <div className="font-bold">6. Commit to DB</div>
                <div className="text-[9px] text-slate-400">Store canonical</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : statusMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-rose-50 text-rose-900 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : statusMessage.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-[11px] font-bold underline hover:opacity-75"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global Fallback Category & Exam Controls */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Default Subject
            </label>
            <select
              value={defaultSubject}
              onChange={(e) => setDefaultSubject(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {SUBJECT_OPTIONS.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Default Topic / Chapter
            </label>
            <input
              type="text"
              value={defaultTopic}
              onChange={(e) => setDefaultTopic(e.target.value)}
              placeholder="e.g. Algebra & Functions"
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Default Difficulty
            </label>
            <select
              value={defaultDifficulty}
              onChange={(e) => setDefaultDifficulty(e.target.value as Difficulty)}
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Easy">Easy (Preliminary Basic)</option>
              <option value="Medium">Medium (Cadre Standard)</option>
              <option value="Hard">Hard (High Distinction)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Target Exam Tag
            </label>
            <input
              type="text"
              value={defaultExamTag}
              onChange={(e) => setDefaultExamTag(e.target.value)}
              placeholder="e.g. 46th BCS Preliminary"
              className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Source Mode Selector */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setImportMode('file')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              importMode === 'file'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File (.csv, .xlsx)</span>
          </button>

          <button
            onClick={() => setImportMode('paste')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              importMode === 'paste'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste Plain Math / CSV Text</span>
          </button>

          <button
            onClick={() => setImportMode('url')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              importMode === 'url'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Google Sheets Live URL</span>
          </button>

          <button
            onClick={() => setImportMode('mathjax')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              importMode === 'mathjax'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sigma className="w-4 h-4 text-indigo-600" />
            <span>KaTeX Formula Sandbox & Syntax</span>
          </button>
        </div>

        {/* Mode 1: File Dropzone */}
        {importMode === 'file' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls, .tsv, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {fileName ? `Selected File: ${fileName}` : 'Click or Drag & Drop CSV or Excel Spreadsheet'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Uploads raw files, maps schema, converts plain math (powers, fractions, roots, ratios) to canonical LaTeX, and validates with KaTeX.
              </p>
            </div>
            {isParsing && (
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Normalizing mathematical notations & validating KaTeX...
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Paste Raw CSV or Plain Math */}
        {importMode === 'paste' && (
          <div className="space-y-4">
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
              <span>💡 You can paste standard CSV or plain unformatted math like <code>x^2 - 5x + 6 = 0</code>, <code>1/2</code>, <code>sqrt(25)</code>, <code>30 deg</code>.</span>
            </div>
            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`"Questions","Option 1","Option 2","Option 3","Option 4","Answer","Solution","Subject","Topic","Difficulty"\n"যদি x^2 - 5x + 6 = 0 হয়, তবে x এর মান কত?","x = 2, 3","x = -2, -3","x = 1, 6","x = -1, -6","x = 2, 3","উৎপাদকে বিশ্লেষণ: (x-2)(x-3)=0","Mathematics","Algebra","Easy"`}
              className="w-full text-xs font-mono bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParsePasted}
                disabled={!pastedText.trim() || isParsing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                {isParsing ? 'Normalizing & Parsing...' : 'Parse & Auto-Normalize Math'}
              </button>
            </div>
          </div>
        )}

        {/* Mode 3: Google Sheets URL */}
        {importMode === 'url' && (
          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                Public Google Sheet CSV Link or Published URL
              </label>
              <p className="text-[11px] text-slate-500">
                In Google Sheets, go to <strong>File &gt; Share &gt; Publish to web</strong> &gt; Select <strong>Comma-separated values (.csv)</strong> and paste the link below.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                className="flex-1 text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleFetchGoogleSheets}
                disabled={!sheetUrl.trim() || isParsing}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
              >
                {isParsing ? 'Fetching & Normalizing...' : 'Fetch & Parse'}
              </button>
            </div>
          </div>
        )}

        {/* Mode 4: KaTeX & MathJax Sandbox and Formula Assistant */}
        {importMode === 'mathjax' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sigma className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm text-indigo-100">
                    KaTeX & LaTeX Live Sandbox & Syntax Reference
                  </h3>
                </div>
                <button
                  onClick={handleDownloadPlainMathSample}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download Plain Math CSV
                </button>
              </div>
              <p className="text-xs text-indigo-200/90 leading-relaxed">
                Type plain math or LaTeX formulas. Wrap in <code>$...$</code> for inline equations or <code>$$...$$</code> for block equations. Plain math notations like <code>x^2</code>, <code>1/2</code>, <code>sqrt(16)</code>, and <code>30 deg</code> are automatically detected and converted to canonical LaTeX.
              </p>

              {/* Quick insert toolbar */}
              <MathFormulaToolbar
                onInsertSnippet={(latex) => {
                  setSandboxQuestion((prev) => prev + ' ' + latex);
                }}
              />
            </div>

            {/* Sandbox Tester Fields and Live KaTeX Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              {/* Inputs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>1. Enter Raw / Plain Question & Formula</span>
                </h4>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Question Text (Plain math or LaTeX)</label>
                  <textarea
                    rows={3}
                    value={sandboxQuestion}
                    onChange={(e) => setSandboxQuestion(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Option A</label>
                    <input
                      type="text"
                      value={sandboxOptionA}
                      onChange={(e) => setSandboxOptionA(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Option B</label>
                    <input
                      type="text"
                      value={sandboxOptionB}
                      onChange={(e) => setSandboxOptionB(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Option C</label>
                    <input
                      type="text"
                      value={sandboxOptionC}
                      onChange={(e) => setSandboxOptionC(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">Option D</label>
                    <input
                      type="text"
                      value={sandboxOptionD}
                      onChange={(e) => setSandboxOptionD(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2 mt-0.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Step-by-Step Solution / Explanation</label>
                  <textarea
                    rows={3}
                    value={sandboxExplanation}
                    onChange={(e) => setSandboxExplanation(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none mt-1"
                  />
                </div>
              </div>

              {/* Live Rendered Output */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>2. Live KaTeX Rendered Output</span>
                </h4>

                <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Rendered Question</span>
                    <div className="text-sm font-semibold text-slate-900 mt-1 leading-relaxed">
                      <MathJaxView text={sandboxQuestion} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Rendered Options</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 text-xs font-medium text-emerald-950 flex items-center gap-2">
                        <span className="font-bold text-emerald-700">A.</span>
                        <MathJaxView text={sandboxOptionA} inline />
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 flex items-center gap-2">
                        <span className="font-bold text-slate-500">B.</span>
                        <MathJaxView text={sandboxOptionB} inline />
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 flex items-center gap-2">
                        <span className="font-bold text-slate-500">C.</span>
                        <MathJaxView text={sandboxOptionC} inline />
                      </div>
                      <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 flex items-center gap-2">
                        <span className="font-bold text-slate-500">D.</span>
                        <MathJaxView text={sandboxOptionD} inline />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Rendered Solution</span>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-800 leading-relaxed mt-1">
                      <MathJaxView text={sandboxExplanation} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Parsed Preview Table & Confirmation */}
        {parsedResult && (
          <div className="space-y-4 pt-4 border-t border-slate-200 animate-in fade-in duration-200">
            {/* Batch Stats Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <FileCheck className="w-4 h-4 text-indigo-400" />
                  <span>Batch: <strong className="font-mono text-indigo-300">{importBatchId}</strong></span>
                </div>
                <div className="h-4 w-px bg-slate-700 hidden md:block" />
                <span className="text-slate-300">Total Rows: <strong>{parsedResult.totalRows}</strong></span>
                <span className="text-emerald-400 font-bold">Valid: {parsedResult.validCount}</span>
                <span className="text-indigo-300 font-semibold">Math Formulas Detected: {parsedResult.totalMathFormulasDetected}</span>
                {parsedResult.warningMathCount > 0 && (
                  <span className="text-amber-400 font-bold">Warnings: {parsedResult.warningMathCount}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoRepairAllMath}
                  className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-indigo-500/40"
                  title="Auto-repair LaTeX syntax errors, unescaped %, and unclosed brackets"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Auto-Repair All Syntax</span>
                </button>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Filter Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 text-xs">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      previewFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All ({parsedResult.totalRows})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      previewFilter === 'valid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Valid ({parsedResult.validCount})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('math')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      previewFilter === 'math' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Math Questions Only
                  </button>
                  {duplicateQuestionsCount > 0 && (
                    <button
                      onClick={() => setPreviewFilter('duplicate')}
                      className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                        previewFilter === 'duplicate'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Duplicates ({duplicateQuestionsCount})</span>
                    </button>
                  )}
                  {parsedResult.invalidCount > 0 && (
                    <button
                      onClick={() => setPreviewFilter('invalid')}
                      className={`px-2.5 py-1 rounded-md font-medium transition ${
                        previewFilter === 'invalid' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Invalid ({parsedResult.invalidCount})
                    </button>
                  )}
                </div>

                {/* View Format Selector */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase px-1.5">View:</span>
                  <button
                    onClick={() => setViewFormat('katex')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      viewFormat === 'katex' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-600'
                    }`}
                  >
                    KaTeX Render
                  </button>
                  <button
                    onClick={() => setViewFormat('latex')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      viewFormat === 'latex' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-600'
                    }`}
                  >
                    LaTeX Source
                  </button>
                  <button
                    onClick={() => setViewFormat('raw')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      viewFormat === 'raw' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'text-slate-600'
                    }`}
                  >
                    Original Raw
                  </button>
                </div>
              </div>

              {/* Commit Button */}
              <button
                onClick={handleCommitImport}
                disabled={isImporting || parsedResult.validCount === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50 transition shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isImporting ? 'Committing to DB...' : `Commit ${parsedResult.validCount} Valid Records to DB`}
              </button>
            </div>

            {/* Global Duplicate Resolution Action Banner */}
            {duplicateQuestionsCount > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300/80 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 text-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-slate-900 text-sm">
                        ⚠️ Duplicate Resolution Policy
                      </h5>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 text-amber-900 border border-amber-300">
                        {duplicateQuestionsCount} question(s) already exist in DB
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                      Select how you want to resolve duplicate matches during batch commit, or customize per question below:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Global Action:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalDuplicateAction('SKIP')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border shadow-2xs ${
                      globalDuplicateAction === 'SKIP'
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                    }`}
                    title="Safely skip importing all questions that already exist in database"
                  >
                    <span>⚡ Skip Duplicates</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalDuplicateAction('UPDATE')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border shadow-2xs ${
                      globalDuplicateAction === 'UPDATE'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                    }`}
                    title="Update and overwrite the existing questions in the database with the newer content from file"
                  >
                    <span>🔄 Update DB Records</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalDuplicateAction('IMPORT_ANYWAY')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 border shadow-2xs ${
                      globalDuplicateAction === 'IMPORT_ANYWAY'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
                    }`}
                    title="Import duplicates as additional separate records"
                  >
                    <span>➕ Keep Both / Import New</span>
                  </button>
                </div>
              </div>
            )}

            {/* Table Preview with Explicit Horizontal & Vertical Scrollbars */}
            <div className="border border-slate-200 rounded-2xl shadow-xs max-h-[38rem] overflow-x-auto overflow-y-auto custom-scrollbar w-full bg-white">
              <table className="w-full min-w-[1000px] text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10 select-none">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center shrink-0">#</th>
                    <th className="py-3 px-4 min-w-[340px]">Question Stem & Normalized Math</th>
                    <th className="py-3 px-4 min-w-[240px]">Options</th>
                    <th className="py-3 px-3 min-w-[130px]">Correct Answer</th>
                    <th className="py-3 px-3 min-w-[150px]">Subject / Topic</th>
                    <th className="py-3 px-3 min-w-[120px] text-center">Action & Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuestions.map((q, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/80 transition ${
                        !q.isValid
                          ? 'bg-rose-50/40 text-rose-900'
                          : q.duplicateMatch
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {q.rawRowIndex}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="line-clamp-2 leading-relaxed">
                          {viewFormat === 'katex' && <MathJaxView text={q.text} />}
                          {viewFormat === 'latex' && <span className="font-mono text-xs text-indigo-700">{q.text}</span>}
                          {viewFormat === 'raw' && <span className="text-slate-600">{q.rawText || q.text}</span>}
                        </div>
                        {q.mathWarnings && q.mathWarnings.length > 0 && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="truncate">{q.mathWarnings[0]}</span>
                          </div>
                        )}
                        {q.validationError && (
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            ⚠️ {q.validationError}
                          </div>
                        )}

                        {/* In-Row Duplicate Alert & Per-Question Resolution Controls */}
                        {q.duplicateMatch && (
                          <div className="mt-2.5 p-2 rounded-xl bg-amber-50 border border-amber-200/90 text-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <span className="font-bold text-amber-900 text-[11px] flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                {q.duplicateMatch.reason}
                              </span>
                              <button
                                type="button"
                                onClick={() => setComparingDuplicateRow(q)}
                                className="px-2 py-0.5 rounded-md bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px] flex items-center gap-1 transition shadow-2xs"
                              >
                                <Split className="w-3 h-3 text-indigo-600" />
                                <span>Compare Diff</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] pt-0.5 flex-wrap">
                              <span className="text-slate-500 font-semibold">Row Action:</span>
                              <button
                                type="button"
                                onClick={() => handleSetRowDuplicateResolution(q.rawRowIndex - 1, 'SKIP')}
                                className={`px-2 py-0.5 rounded font-bold transition ${
                                  q.duplicateResolution === 'SKIP'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                Skip Row
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetRowDuplicateResolution(q.rawRowIndex - 1, 'UPDATE')}
                                className={`px-2 py-0.5 rounded font-bold transition ${
                                  q.duplicateResolution === 'UPDATE'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                Update in DB
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetRowDuplicateResolution(q.rawRowIndex - 1, 'IMPORT_ANYWAY')}
                                className={`px-2 py-0.5 rounded font-bold transition ${
                                  q.duplicateResolution === 'IMPORT_ANYWAY'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                              >
                                Import as New
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 space-y-1">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`text-[11px] truncate px-2 py-0.5 rounded-lg flex items-center gap-1.5 ${
                              oIdx === q.correctOptionIndex
                                ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-200'
                                : 'text-slate-600'
                            }`}
                          >
                            <span className="font-mono text-[10px] opacity-70 shrink-0">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            {opt ? (
                              viewFormat === 'katex' ? (
                                <MathJaxView text={opt} inline />
                              ) : viewFormat === 'latex' ? (
                                <span className="font-mono text-[10px]">{opt}</span>
                              ) : (
                                <span>{q.rawOptions?.[oIdx] || opt}</span>
                              )
                            ) : (
                              <span className="italic text-slate-400">Empty</span>
                            )}
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>
                            Opt {String.fromCharCode(65 + q.correctOptionIndex)}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-600">
                        <div className="font-bold text-slate-800">{q.subject || defaultSubject}</div>
                        <div className="text-[10px] text-slate-500">{q.topic || defaultTopic}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {q.duplicateMatch && (
                            <button
                              type="button"
                              onClick={() => setComparingDuplicateRow(q)}
                              title="Compare with Database Duplicate"
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition"
                            >
                              <Split className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEditRow(q, idx)}
                            title="Edit Question & Formula"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPreviewQuestion(q)}
                            title="Inspect Solution & KaTeX"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            title="Remove from batch"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inline Row Edit Modal */}
        {editingRowData && editingIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  <span>Edit Question Row #{editingRowData.rawRowIndex}</span>
                </h4>
                <button
                  onClick={() => {
                    setEditingIndex(null);
                    setEditingRowData(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Question Stem</label>
                <textarea
                  rows={2}
                  value={editingRowData.text}
                  onChange={(e) => setEditingRowData({ ...editingRowData, text: e.target.value })}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none mt-1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700">Options & Correct Answer</label>
                {editingRowData.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="editCorrect"
                      checked={editingRowData.correctOptionIndex === oIdx}
                      onChange={() => setEditingRowData({ ...editingRowData, correctOptionIndex: oIdx })}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="font-bold text-slate-500 w-4">{String.fromCharCode(65 + oIdx)}:</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...editingRowData.options];
                        newOpts[oIdx] = e.target.value;
                        setEditingRowData({ ...editingRowData, options: newOpts });
                      }}
                      className="flex-1 text-xs font-mono bg-white border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Solution / Explanation</label>
                <textarea
                  rows={2}
                  value={editingRowData.explanation}
                  onChange={(e) => setEditingRowData({ ...editingRowData, explanation: e.target.value })}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none mt-1"
                />
              </div>

              {/* Live Preview */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-indigo-900 uppercase">Live Render Preview</span>
                <div className="text-xs font-medium text-slate-900">
                  <MathJaxView text={editingRowData.text} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null);
                    setEditingRowData(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditRow}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                >
                  Save & Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Question Inspector Modal */}
        {selectedPreviewQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Question Details & KaTeX Formula Inspection</span>
                </h4>
                <button
                  onClick={() => setSelectedPreviewQuestion(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Question Stem (KaTeX Rendered)</label>
                <div className="text-sm font-semibold text-slate-900 mt-1 leading-relaxed">
                  <MathJaxView text={selectedPreviewQuestion.text} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400">Options</label>
                {selectedPreviewQuestion.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                      idx === selectedPreviewQuestion.correctOptionIndex
                        ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                      <MathJaxView text={opt} inline />
                    </div>
                    {idx === selectedPreviewQuestion.correctOptionIndex && (
                      <span className="text-[10px] uppercase font-bold text-emerald-700">Correct Answer</span>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Rendered Solution / Explanation</label>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-800 mt-1 leading-relaxed">
                  <MathJaxView text={selectedPreviewQuestion.explanation} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400">Canonical LaTeX Source</label>
                <div className="bg-slate-950 text-emerald-300 p-2.5 rounded-xl text-[11px] font-mono mt-1 overflow-x-auto max-h-24 whitespace-pre-wrap">
                  {selectedPreviewQuestion.explanation}
                </div>
              </div>

              {selectedPreviewQuestion.rawExplanation && selectedPreviewQuestion.rawExplanation !== selectedPreviewQuestion.explanation && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400">Original Raw Source (Preserved)</label>
                  <div className="bg-slate-100 text-slate-700 p-2.5 rounded-xl text-[11px] font-mono mt-1 overflow-x-auto max-h-20 whitespace-pre-wrap">
                    {selectedPreviewQuestion.rawExplanation}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedPreviewQuestion(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Duplicate Question Side-by-Side Comparison & Resolution Modal */}
        {comparingDuplicateRow && comparingDuplicateRow.duplicateMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                    <Split className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <span>Duplicate Question Comparison & Resolution</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                        {Math.round(comparingDuplicateRow.duplicateMatch.similarity * 100)}% Match
                      </span>
                    </h4>
                    <p className="text-slate-500 text-xs">
                      {comparingDuplicateRow.duplicateMatch.reason}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setComparingDuplicateRow(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Side-by-Side Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column: Uploaded from File */}
                <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <span className="font-black text-indigo-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                      Uploaded Row #{comparingDuplicateRow.rawRowIndex} (From File)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      New Candidate
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-indigo-600">Question Stem</label>
                    <div className="text-xs font-semibold text-slate-900 mt-1 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                      <MathJaxView text={comparingDuplicateRow.text} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-indigo-600">Options</label>
                    {comparingDuplicateRow.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                          oIdx === comparingDuplicateRow.correctOptionIndex
                            ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold opacity-60">{String.fromCharCode(65 + oIdx)}.</span>
                          <MathJaxView text={opt} inline />
                        </div>
                        {oIdx === comparingDuplicateRow.correctOptionIndex && (
                          <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-indigo-600">Explanation</label>
                    <div className="text-xs text-slate-700 mt-1 leading-relaxed bg-white p-2.5 rounded-xl border border-indigo-100">
                      <MathJaxView text={comparingDuplicateRow.explanation || 'None provided'} />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 flex items-center gap-2 pt-1">
                    <span className="font-bold">Subject:</span> {comparingDuplicateRow.subject || defaultSubject}
                    <span className="text-slate-300">•</span>
                    <span className="font-bold">Topic:</span> {comparingDuplicateRow.topic || defaultTopic}
                  </div>
                </div>

                {/* Right Column: Existing in Database */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-black text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      Existing Database Record (#{comparingDuplicateRow.duplicateMatch.existingQuestion.id?.slice(-6)})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                      Live in Bank
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Question Stem</label>
                    <div className="text-xs font-semibold text-slate-900 mt-1 leading-relaxed bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <MathJaxView text={comparingDuplicateRow.duplicateMatch.existingQuestion.text} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Options</label>
                    {(comparingDuplicateRow.duplicateMatch.existingQuestion.options || []).map((opt: string, oIdx: number) => (
                      <div
                        key={oIdx}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                          oIdx === comparingDuplicateRow.duplicateMatch.existingQuestion.correctOptionIndex
                            ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold opacity-60">{String.fromCharCode(65 + oIdx)}.</span>
                          <MathJaxView text={opt} inline />
                        </div>
                        {oIdx === comparingDuplicateRow.duplicateMatch.existingQuestion.correctOptionIndex && (
                          <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Explanation</label>
                    <div className="text-xs text-slate-700 mt-1 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                      <MathJaxView text={comparingDuplicateRow.duplicateMatch.existingQuestion.explanation || 'None provided'} />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 flex items-center gap-2 pt-1">
                    <span className="font-bold">Subject:</span> {comparingDuplicateRow.duplicateMatch.existingQuestion.subject || 'General'}
                    <span className="text-slate-300">•</span>
                    <span className="font-bold">Topic:</span> {comparingDuplicateRow.duplicateMatch.existingQuestion.topic || 'General'}
                  </div>
                </div>
              </div>

              {/* Resolution Choice Bar */}
              <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-700 font-medium">
                  Current action for Row #{comparingDuplicateRow.rawRowIndex}:{' '}
                  <span className="font-bold text-slate-900">
                    {comparingDuplicateRow.duplicateResolution === 'UPDATE'
                      ? '🔄 Overwrite Existing DB Record'
                      : comparingDuplicateRow.duplicateResolution === 'IMPORT_ANYWAY'
                      ? '➕ Import as Separate Question'
                      : '⚡ Skip (Do Not Import)'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      handleSetRowDuplicateResolution(comparingDuplicateRow.rawRowIndex - 1, 'SKIP');
                      setComparingDuplicateRow(null);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs ${
                      comparingDuplicateRow.duplicateResolution === 'SKIP'
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                    }`}
                  >
                    <span>⚡ Skip This Question</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetRowDuplicateResolution(comparingDuplicateRow.rawRowIndex - 1, 'UPDATE');
                      setComparingDuplicateRow(null);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs ${
                      comparingDuplicateRow.duplicateResolution === 'UPDATE'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                    }`}
                  >
                    <span>🔄 Update Existing Record</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSetRowDuplicateResolution(comparingDuplicateRow.rawRowIndex - 1, 'IMPORT_ANYWAY');
                      setComparingDuplicateRow(null);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-2xs ${
                      comparingDuplicateRow.duplicateResolution === 'IMPORT_ANYWAY'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                    }`}
                  >
                    <span>➕ Import as Separate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supported File Formats Blueprint Modal */}
      <AdminFormatGuideModal
        isOpen={isFormatGuideOpen}
        onClose={() => setIsFormatGuideOpen(false)}
      />
    </div>
  );
};

export default AdminQuestionImporter;
