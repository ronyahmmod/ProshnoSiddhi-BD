import React, { useState, useEffect } from 'react';
import { ExamCategory, SubjectHierarchy } from '../types';
import {
  fetchExams,
  createExam,
  deleteExam,
  fetchHierarchy,
  addTopicHierarchy,
  deleteTopicHierarchy,
  addSubtopicHierarchy,
  deleteSubtopicHierarchy
} from '../api';
import {
  Award,
  Layers,
  PlusCircle,
  Trash2,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  ChevronRight,
  FolderPlus,
  RefreshCw,
  X
} from 'lucide-react';

export const AdminExamTopicManager: React.FC = () => {
  const [exams, setExams] = useState<ExamCategory[]>([]);
  const [hierarchy, setHierarchy] = useState<SubjectHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active view: 'exams' or 'hierarchy'
  const [activeSubTab, setActiveSubTab] = useState<'exams' | 'hierarchy'>('exams');

  // New Exam Form
  const [newExamName, setNewExamName] = useState('');
  const [newExamCategory, setNewExamCategory] = useState<'BCS' | 'BANK' | 'GRE' | 'PRIMARY' | 'NTRCA' | 'OTHER'>('BCS');
  const [newExamYear, setNewExamYear] = useState<number>(new Date().getFullYear());
  const [newExamQuestions, setNewExamQuestions] = useState<number>(200);
  const [newExamMarks, setNewExamMarks] = useState<number>(200);
  const [newExamNegMarks, setNewExamNegMarks] = useState<number>(0.5);
  const [newExamDuration, setNewExamDuration] = useState<number>(120);
  const [newExamDesc, setNewExamDesc] = useState('');
  const [isAddingExam, setIsAddingExam] = useState(false);

  // Hierarchy Form
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newSubtopicInput, setNewSubtopicInput] = useState('');
  const [selectedTopicForSubtopic, setSelectedTopicForSubtopic] = useState<string>('');
  const [newSingleSubtopic, setNewSingleSubtopic] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [eList, hList] = await Promise.all([fetchExams(), fetchHierarchy()]);
      setExams(eList);
      setHierarchy(hList);
      if (hList.length > 0 && !selectedSubject) {
        setSelectedSubject(hList[0].subject || hList[0].name || '');
      }
    } catch (e: any) {
      console.error(e);
      setStatusMsg({ type: 'error', text: e.message || 'Failed to load exam and topic data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Exam handlers
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim()) return;

    try {
      const created = await createExam({
        name: newExamName.trim(),
        category: newExamCategory,
        year: newExamYear,
        totalQuestions: Number(newExamQuestions),
        totalMarks: Number(newExamMarks),
        negativeMarksPerWrong: Number(newExamNegMarks),
        durationMinutes: Number(newExamDuration),
        description: newExamDesc.trim() || undefined
      });
      setExams((prev) => [...prev, created]);
      setNewExamName('');
      setNewExamDesc('');
      setIsAddingExam(false);
      setStatusMsg({ type: 'success', text: `Added new exam: ${created.name}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create exam' });
    }
  };

  const handleDeleteExam = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete exam "${name}"?`)) return;
    try {
      await deleteExam(id);
      setExams((prev) => prev.filter((e) => e.id !== id));
      setStatusMsg({ type: 'success', text: `Deleted exam: ${name}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete exam' });
    }
  };

  // Hierarchy & Topic handlers
  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjectToUse = newSubjectName.trim() || selectedSubject;
    if (!subjectToUse || !newTopicName.trim()) {
      setStatusMsg({ type: 'error', text: 'Subject and Topic name are required' });
      return;
    }

    try {
      const subtopics = newSubtopicInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await addTopicHierarchy(subjectToUse, newTopicName.trim(), subtopics);
      setNewTopicName('');
      setNewSubtopicInput('');
      setNewSubjectName('');
      setSelectedSubject(subjectToUse);
      await loadData();
      setStatusMsg({ type: 'success', text: `Topic "${newTopicName}" successfully added to ${subjectToUse}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add topic' });
    }
  };

  const handleDeleteTopic = async (subject: string, topic: string) => {
    if (!window.confirm(`Are you sure you want to delete topic "${topic}" from ${subject}?`)) return;
    try {
      await deleteTopicHierarchy(subject, topic);
      await loadData();
      setStatusMsg({ type: 'success', text: `Topic "${topic}" deleted` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete topic' });
    }
  };

  const handleAddSubtopic = async (subject: string, topic: string) => {
    if (!newSingleSubtopic.trim()) return;
    try {
      await addSubtopicHierarchy(subject, topic, newSingleSubtopic.trim());
      setNewSingleSubtopic('');
      setSelectedTopicForSubtopic('');
      await loadData();
      setStatusMsg({ type: 'success', text: `Subtopic added to ${topic}` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add subtopic' });
    }
  };

  const handleDeleteSubtopic = async (subject: string, topic: string, subtopic: string) => {
    if (!window.confirm(`Delete subtopic "${subtopic}" from ${topic}?`)) return;
    try {
      await deleteSubtopicHierarchy(subject, topic, subtopic);
      await loadData();
      setStatusMsg({ type: 'success', text: `Subtopic "${subtopic}" deleted` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete subtopic' });
    }
  };

  const currentSubjectData = hierarchy.find(
    (h) => (h.subject || h.name || '').toLowerCase() === selectedSubject.toLowerCase()
  );

  return (
    <div className="space-y-6">
      
      {/* Top Controller */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('exams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'exams'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Exams (BCS, Bank, GRE) ({exams.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('hierarchy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'hierarchy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Subjects, Topics & Subtopics</span>
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {/* EXAMS TAB */}
      {activeSubTab === 'exams' && (
        <div className="space-y-6">
          
          {/* Add Exam Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Manage Competitive Exams & Papers
              </h3>
              <button
                onClick={() => setIsAddingExam(!isAddingExam)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isAddingExam ? 'Close Form' : 'Add New Exam (e.g. 47th BCS)'}</span>
              </button>
            </div>

            {isAddingExam && (
              <form onSubmit={handleCreateExam} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Exam Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 47th BCS Preliminary, GRE Quant 2026"
                      value={newExamName}
                      onChange={(e) => setNewExamName(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Category *</label>
                    <select
                      value={newExamCategory}
                      onChange={(e) => setNewExamCategory(e.target.value as any)}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold"
                    >
                      <option value="BCS">BCS (10th - 47th+)</option>
                      <option value="BANK">Bank Recruitment & Combined Officer</option>
                      <option value="GRE">GRE General & Subject</option>
                      <option value="PRIMARY">Primary Assistant Teacher</option>
                      <option value="NTRCA">NTRCA Teacher Registration</option>
                      <option value="OTHER">Other Govt Agency Exam</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={newExamYear}
                      onChange={(e) => setNewExamYear(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Questions</label>
                    <input
                      type="number"
                      value={newExamQuestions}
                      onChange={(e) => setNewExamQuestions(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Marks</label>
                    <input
                      type="number"
                      value={newExamMarks}
                      onChange={(e) => setNewExamMarks(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Negative Mark / Wrong</label>
                    <input
                      type="number"
                      step="0.05"
                      value={newExamNegMarks}
                      onChange={(e) => setNewExamNegMarks(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      value={newExamDuration}
                      onChange={(e) => setNewExamDuration(Number(e.target.value))}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangladesh Public Service Commission 47th BCS preliminary paper"
                    value={newExamDesc}
                    onChange={(e) => setNewExamDesc(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingExam(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    Save Exam
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Exam Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((ex) => (
              <div
                key={ex.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                      {ex.category}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">{ex.year}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{ex.name}</h4>
                  {ex.description && <p className="text-xs text-slate-500 line-clamp-2">{ex.description}</p>}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>{ex.totalQuestions} Qs • {ex.durationMinutes}m</span>
                  <button
                    onClick={() => handleDeleteExam(ex.id, ex.name)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HIERARCHY & TOPICS TAB */}
      {activeSubTab === 'hierarchy' && (
        <div className="space-y-6">
          
          {/* Add Subject or Topic Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-emerald-600" />
              Add or Modify Subject & Topic Hierarchy
            </h3>

            <form onSubmit={handleAddTopic} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Subject (or type new)</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold mb-1.5"
                >
                  {hierarchy.map((h) => {
                    const subName = h.subject || h.name || '';
                    return (
                      <option key={subName} value={subName}>
                        {subName}
                      </option>
                    );
                  })}
                  <option value="">-- Create New Subject --</option>
                </select>
                {!selectedSubject && (
                  <input
                    type="text"
                    placeholder="New Subject Name (e.g. Higher Math)"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Topic Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Percentage, Optics, Prepositions"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Subtopics (Comma-separated)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Profit/Loss, Discount, Tax"
                    value={newSubtopicInput}
                    onChange={(e) => setNewSubtopicInput(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs shrink-0"
                  >
                    Add Topic
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Hierarchy Navigator */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Subject Selector Sidebar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-500 block mb-2">Subjects</span>
              <div className="space-y-1">
                {hierarchy.map((h) => {
                  const subName = h.subject || h.name || '';
                  return (
                    <button
                      key={subName}
                      onClick={() => setSelectedSubject(subName)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                        selectedSubject.toLowerCase() === subName.toLowerCase()
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{subName}</span>
                      <span className="text-[10px] opacity-80">({h.topics.length})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Topics & Subtopics List */}
            <div className="md:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b pb-3 border-slate-100 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">
                  Topics in <span className="text-emerald-700">{selectedSubject}</span>
                </h4>
                <span className="text-xs text-slate-500">
                  {currentSubjectData?.topics.length || 0} registered topics
                </span>
              </div>

              <div className="space-y-3">
                {currentSubjectData?.topics.map((t) => {
                  const topicName = t.topic || t.name || '';
                  return (
                    <div
                      key={topicName}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 space-y-2.5 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{topicName}</span>
                          {t.questionCount !== undefined && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                              {t.questionCount} Questions
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedTopicForSubtopic(topicName === selectedTopicForSubtopic ? '' : topicName)}
                            className="px-2 py-1 text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition"
                          >
                            + Add Subtopic
                          </button>

                          <button
                            onClick={() => handleDeleteTopic(selectedSubject, topicName)}
                            className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg transition"
                            title="Delete Topic"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Subtopics Chips */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {t.subtopics && t.subtopics.length > 0 ? (
                          t.subtopics.map((st) => (
                            <span
                              key={st}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs"
                            >
                              <span>{st}</span>
                              <button
                                onClick={() => handleDeleteSubtopic(selectedSubject, topicName, st)}
                                className="text-slate-400 hover:text-rose-600 transition"
                                title="Remove subtopic"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs italic text-slate-400">No subtopics defined</span>
                        )}
                      </div>

                      {/* Add Single Subtopic Field */}
                      {selectedTopicForSubtopic === topicName && (
                        <div className="pt-2 flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder={`New subtopic for ${topicName}...`}
                            value={newSingleSubtopic}
                            onChange={(e) => setNewSingleSubtopic(e.target.value)}
                            className="flex-1 p-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddSubtopic(selectedSubject, topicName)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setSelectedTopicForSubtopic('')}
                            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
