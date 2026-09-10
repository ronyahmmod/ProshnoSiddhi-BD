import {
  User,
  Question,
  QuestionFilter,
  QuizConfig,
  QuizAttempt,
  AnalyticsOverview,
  AdminAnalyticsOverview,
  SslCommerzTransaction,
  ExamCategory,
  SubjectHierarchy,
  WrongQuestionRecord,
  BlogPost,
  SplashOffer,
  AppNotification,
  QuestionPullRequest,
  PRActionType,
  PRStatus,
  AdminPrivileges,
  LiveUserStatus,
  ModeratorWorkSummary,
  ScheduledExam
} from './types';

const STORAGE_KEY_USER = 'proshno_current_user_id';
const STORAGE_KEY_USER_OBJ = 'proshno_user';
const STORAGE_KEY_TOKEN = 'proshno_session_token';

export function getStoredUserId(): string | null {
  return localStorage.getItem(STORAGE_KEY_USER);
}

export function setStoredUserId(id: string) {
  localStorage.setItem(STORAGE_KEY_USER, id);
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_OBJ);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (user) {
    try {
      localStorage.setItem(STORAGE_KEY_USER_OBJ, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY_USER, user.id);
    } catch {}
  } else {
    localStorage.removeItem(STORAGE_KEY_USER_OBJ);
    localStorage.removeItem(STORAGE_KEY_USER);
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function setStoredToken(token: string) {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
}

export function logoutUser(): void {
  const token = getStoredToken();
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }).catch(() => {});
  }
  setStoredUser(null);
  localStorage.removeItem(STORAGE_KEY_TOKEN);
}

function getHeaders(): HeadersInit {
  const userId = getStoredUserId();
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (userId) {
    headers['x-user-id'] = userId;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }
  return headers;
}

export async function handleResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error('Non-JSON server response:', res.status, text.slice(0, 200));
    if (res.status === 403) {
      throw new Error('Access Denied: Admin accounts cannot access through the student/user panel. Please log in using the Staff & Admin Portal.');
    }
    if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
      throw new Error(`Server returned HTML (${res.status}). Please check network connectivity or backend routes.`);
    }
    throw new Error(`Server returned non-JSON response (${res.status}). Please check API connectivity.`);
  }
  return await res.json();
}

export async function fetchCurrentUser(): Promise<User | null> {
  const userId = getStoredUserId();
  if (!userId) {
    return null;
  }
  try {
    const res = await fetch('/api/auth/me', { headers: getHeaders() });
    const data = await handleResponse(res);
    if (!data.success || !data.user) {
      setStoredUser(null);
      return null;
    }
    setStoredUser(data.user);
    return data.user;
  } catch {
    return getStoredUser();
  }
}

export async function loginUser(email: string, password?: string, name?: string, targetExam?: string): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password, name, targetExam })
  });
  if (res.status === 403) {
    let errorMsg = 'Admin accounts cannot access through the student/user panel. Please use the Staff & Admin Portal to log in.';
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {}
    const err = new Error(errorMsg) as any;
    err.isAdminAccount = true;
    throw err;
  }
  const data = await handleResponse(res);
  if (!data.success) {
    const err = new Error(data.error || 'Login failed') as any;
    if (data.isAdminAccount) err.isAdminAccount = true;
    throw err;
  }
  setStoredUser(data.user);
  if (data.token) {
    setStoredToken(data.token);
  }
  return data.user;
}

export async function loginStaff(email: string, pinOrPassword?: string, role?: string): Promise<User> {
  const res = await fetch('/api/auth/staff-login', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, pinOrPassword, password: pinOrPassword, role })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Staff authentication failed');
  setStoredUser(data.user);
  if (data.token) {
    setStoredToken(data.token);
  }
  return data.user;
}

export async function registerUser(name: string, email: string, password?: string, targetExam?: string): Promise<User> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, email, password, targetExam })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Registration failed');
  setStoredUser(data.user);
  if (data.token) {
    setStoredToken(data.token);
  }
  return data.user;
}

export interface QuestionMutationResult {
  success: boolean;
  isProposal?: boolean;
  question?: Question;
  pullRequest?: QuestionPullRequest;
  message?: string;
  importedCount?: number;
}

export async function importQuestionsBatch(
  questions: Array<Omit<Question, 'id'>>,
  options?: { asProposal?: boolean; commitTitle?: string; commitMessage?: string }
): Promise<QuestionMutationResult> {
  const res = await fetch('/api/admin/questions/import', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ questions, ...options })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Batch import failed');
  return data;
}

export async function exportAllQuestions(): Promise<Question[]> {
  const res = await fetch('/api/admin/questions/export', {
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to export questions');
  return data.questions;
}

export async function fetchQuestions(filter?: QuestionFilter): Promise<Question[]> {
  const params = new URLSearchParams();
  if (filter?.exam && filter.exam !== 'All') params.append('exam', filter.exam);
  if (filter?.subject && filter.subject !== 'All') params.append('subject', filter.subject);
  if (filter?.topic && filter.topic !== 'All') params.append('topic', filter.topic);
  if (filter?.subtopic && filter.subtopic !== 'All') params.append('subtopic', filter.subtopic);
  if (filter?.difficulty && filter.difficulty !== 'All') params.append('difficulty', filter.difficulty);
  if (filter?.search) params.append('search', filter.search);
  if (filter?.bookmarkedOnly) params.append('bookmarkedOnly', 'true');
  if (filter?.statusFilter && filter.statusFilter !== 'all') params.append('statusFilter', filter.statusFilter);

  const res = await fetch(`/api/questions?${params.toString()}`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch questions');
  return data.questions;
}

export async function createQuestion(
  q: Omit<Question, 'id'>,
  options?: { asProposal?: boolean; commitTitle?: string; commitMessage?: string }
): Promise<QuestionMutationResult> {
  const res = await fetch('/api/questions', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ ...q, ...options })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to create question');
  return data;
}

export async function updateQuestion(
  id: string,
  updates: Partial<Question>,
  options?: { asProposal?: boolean; commitTitle?: string; commitMessage?: string }
): Promise<QuestionMutationResult> {
  const res = await fetch(`/api/questions/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ ...updates, ...options })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to update question');
  return data;
}

export async function proposeQuestionReview(
  questionId: string,
  reviewData: {
    proposedQuestion: Partial<Question>;
    reviewType: 'ANSWER_CORRECTION' | 'EXPLANATION_ENHANCEMENT' | 'LATEX_FIX' | 'TYPO_FIX' | 'GENERAL_UPDATE';
    reviewReason: string;
    referenceSource?: string;
    contributorName?: string;
    contributorEmail?: string;
    contributorPhone?: string;
  }
): Promise<{ success: boolean; message: string; pullRequest: QuestionPullRequest }> {
  const res = await fetch(`/api/questions/${questionId}/propose-review`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(reviewData)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to submit question review proposal');
  return data;
}

export async function deleteQuestion(
  id: string,
  options?: { asProposal?: boolean; commitTitle?: string; commitMessage?: string }
): Promise<QuestionMutationResult> {
  const res = await fetch(`/api/questions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify(options || {})
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to delete question');
  return data;
}

// --- QUESTION PULL REQUEST / COMMIT WORKFLOW API ---
export async function fetchPullRequests(filter?: {
  status?: PRStatus;
  myProposalsOnly?: boolean;
}): Promise<QuestionPullRequest[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.append('status', filter.status);
  if (filter?.myProposalsOnly) params.append('myProposals', 'true');

  const res = await fetch(`/api/questions/proposals?${params.toString()}`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch pull requests');
  return data.pullRequests;
}

export async function fetchPullRequestById(id: string): Promise<QuestionPullRequest> {
  const res = await fetch(`/api/questions/proposals/${id}`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch pull request');
  return data.pullRequest;
}

export async function submitQuestionProposal(params: {
  title: string;
  commitMessage: string;
  action: PRActionType;
  targetQuestionId?: string;
  proposedQuestion?: Omit<Question, 'id'> | Question;
  bulkQuestions?: Array<Omit<Question, 'id'>>;
}): Promise<QuestionPullRequest> {
  const res = await fetch('/api/questions/proposals', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to submit proposal');
  return data.pullRequest;
}

export async function approvePullRequest(id: string, reviewComment?: string): Promise<{ pr: QuestionPullRequest; message: string }> {
  const res = await fetch(`/api/admin/questions/proposals/${id}/approve`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reviewComment })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to approve pull request');
  return { pr: data.pullRequest, message: data.message };
}

export async function rejectPullRequest(id: string, reviewComment: string): Promise<{ pr: QuestionPullRequest; message: string }> {
  const res = await fetch(`/api/admin/questions/proposals/${id}/reject`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reviewComment })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to reject pull request');
  return { pr: data.pullRequest, message: data.message };
}

export async function updateAdminPrivileges(adminUserId: string, privileges: Partial<AdminPrivileges>): Promise<User> {
  const res = await fetch(`/api/admin/users/${adminUserId}/privileges`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ privileges })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to update admin privileges');
  return data.user;
}

// --- DUPLICATE DETECTION API CLIENT ---
export async function checkQuestionDuplicateApi(params: {
  text: string;
  options?: string[];
  subject?: string;
  excludeId?: string;
}): Promise<{
  isDuplicate: boolean;
  similarity: number;
  topMatch?: { question: Question; similarity: number; reason: string };
  matches: Array<{ question: Question; similarity: number; reason: string }>;
}> {
  const res = await fetch('/api/questions/check-duplicate', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to check duplicates');
  return data;
}

export async function scanDuplicateQuestionsApi(threshold = 0.74): Promise<{
  totalClusters: number;
  totalDuplicates: number;
  clusters: Array<{
    primaryQuestion: Question;
    duplicates: Array<{ question: Question; similarity: number; reason: string }>;
    highestSimilarity: number;
  }>;
}> {
  const res = await fetch(`/api/questions/duplicates?threshold=${threshold}`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to scan duplicates');
  return data;
}

export async function mergeDuplicateQuestionsApi(
  primaryId: string,
  duplicateIds: string[]
): Promise<{ success: boolean; mergedCount: number }> {
  const res = await fetch('/api/admin/questions/merge-duplicates', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ primaryId, duplicateIds })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to merge duplicates');
  return data;
}

export async function fetchCategories(): Promise<{ subjects: string[]; subjectTopicsMap: Record<string, string[]> }> {
  const res = await fetch('/api/categories', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch categories');
  return { subjects: data.subjects, subjectTopicsMap: data.subjectTopicsMap };
}

export async function fetchCategoriesHierarchy(): Promise<{
  exams: ExamCategory[];
  subjects: string[];
  hierarchy: SubjectHierarchy[];
  subjectTopicsMap: Record<string, string[]>;
  examSubjectsMap: Record<string, string[]>;
}> {
  const res = await fetch('/api/categories/hierarchy', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch hierarchy');
  return data;
}

// --- EXAMS CRUD API ---
export async function fetchExams(): Promise<ExamCategory[]> {
  const res = await fetch('/api/exams', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch exams');
  return data.exams;
}

export async function createExam(exam: Omit<ExamCategory, 'id' | 'createdAt'>): Promise<ExamCategory> {
  const res = await fetch('/api/exams', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(exam)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to create exam');
  return data.exam;
}

export async function updateExam(id: string, updates: Partial<ExamCategory>): Promise<ExamCategory> {
  const res = await fetch(`/api/exams/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to update exam');
  return data.exam;
}

export async function deleteExam(id: string): Promise<boolean> {
  const res = await fetch(`/api/exams/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to delete exam');
  return true;
}

export async function fetchExamQuestions(examId: string): Promise<{ success: boolean; questions: Question[]; exam: ExamCategory }> {
  const res = await fetch(`/api/exams/${examId}/questions`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch exam questions');
  return data;
}

export async function updateExamQuestions(examId: string, questionIds: string[]): Promise<ExamCategory> {
  const res = await fetch(`/api/exams/${examId}/questions`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ questionIds })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to update exam questions');
  return data.exam;
}

// --- SCHEDULED EXAMS API ---
export async function scheduleExam(
  examId: string,
  examName: string,
  scheduledTime: string,
  durationMinutes?: number,
  notes?: string
): Promise<{ success: boolean; scheduled: ScheduledExam; message: string }> {
  const res = await fetch('/api/exams/schedule', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ examId, examName, scheduledTime, durationMinutes, notes })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to schedule exam');
  return data;
}

export async function fetchScheduledExams(): Promise<ScheduledExam[]> {
  const res = await fetch('/api/exams/scheduled', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch scheduled exams');
  return data.scheduled || [];
}

export async function cancelScheduledExam(id: string): Promise<boolean> {
  const res = await fetch(`/api/exams/scheduled/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to cancel scheduled exam');
  return true;
}

// --- TOPICS & HIERARCHY API ---
export async function fetchHierarchy(): Promise<SubjectHierarchy[]> {
  const res = await fetch('/api/hierarchy', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch hierarchy');
  return data.hierarchy;
}

export async function addTopicHierarchy(subject: string, topic: string, subtopics?: string[]): Promise<boolean> {
  const res = await fetch('/api/hierarchy/topics', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ subject, topic, subtopics })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to add topic');
  return data.success;
}

export async function deleteTopicHierarchy(subject: string, topic: string): Promise<boolean> {
  const res = await fetch('/api/hierarchy/topics', {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ subject, topic })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to delete topic');
  return data.success;
}

export async function addSubtopicHierarchy(subject: string, topic: string, subtopic: string): Promise<boolean> {
  const res = await fetch('/api/hierarchy/subtopics', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ subject, topic, subtopic })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to add subtopic');
  return data.success;
}

export async function deleteSubtopicHierarchy(subject: string, topic: string, subtopic: string): Promise<boolean> {
  const res = await fetch('/api/hierarchy/subtopics', {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ subject, topic, subtopic })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to delete subtopic');
  return data.success;
}

// --- WRONG QUESTIONS NOTEBOOK API ---
export async function fetchWrongQuestions(filter?: {
  exam?: string;
  subject?: string;
  topic?: string;
  status?: 'all' | 'unresolved' | 'resolved';
}): Promise<WrongQuestionRecord[]> {
  const params = new URLSearchParams();
  if (filter?.exam && filter.exam !== 'All') params.append('exam', filter.exam);
  if (filter?.subject && filter.subject !== 'All') params.append('subject', filter.subject);
  if (filter?.topic && filter.topic !== 'All') params.append('topic', filter.topic);
  if (filter?.status && filter.status !== 'all') params.append('status', filter.status);

  const res = await fetch(`/api/wrong-questions?${params.toString()}`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch wrong questions');
  return data.wrongQuestions;
}

export async function resolveWrongQuestion(questionId: string, resolved: boolean = true): Promise<boolean> {
  const res = await fetch(`/api/wrong-questions/${questionId}/resolve`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ resolved })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to update question status');
  return data.success;
}

export async function generateRevisionQuiz(payload: { count?: number; subject?: string; exam?: string }): Promise<any> {
  const res = await fetch('/api/wrong-questions/revision-quiz', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to generate revision quiz');
  return data.quiz;
}

export async function generateRevisionQuestions(
  subjectOrPayload?: string | { count?: number; subject?: string; exam?: string },
  count: number = 10,
  exam?: string
): Promise<Question[]> {
  const payload = typeof subjectOrPayload === 'object' && subjectOrPayload !== null
    ? subjectOrPayload
    : { subject: subjectOrPayload, count, exam };

  const res = await fetch('/api/wrong-questions/revision-quiz', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to generate revision quiz');
  return data.quiz?.questions || [];
}

// --- BLOG API ---
export async function fetchBlogPosts(filter?: { category?: string; exam?: string; search?: string } | string, searchParam?: string): Promise<BlogPost[]> {
  const params = new URLSearchParams();
  if (typeof filter === 'string') {
    if (filter && filter !== 'ALL') params.append('category', filter);
    if (searchParam) params.append('search', searchParam);
  } else if (filter) {
    if (filter.category && filter.category !== 'ALL') params.append('category', filter.category);
    if (filter.exam && filter.exam !== 'All') params.append('exam', filter.exam);
    if (filter.search) params.append('search', filter.search);
  }

  const res = await fetch(`/api/blog?${params.toString()}`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch blog posts');
  return data.posts;
}

export async function fetchBlogPost(id: string): Promise<BlogPost> {
  const res = await fetch(`/api/blog/${id}`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch blog post');
  return data.post;
}

export async function likeBlogPost(id: string): Promise<{ post: BlogPost; likes: number }> {
  const res = await fetch(`/api/blog/${id}/like`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to like blog post');
  return { post: data.post, likes: data.likes };
}

export async function addBlogComment(postId: string, comment: { content: string; authorName?: string; authorRole?: string; authorEmail?: string; authorAvatar?: string }): Promise<BlogPost> {
  const res = await fetch(`/api/blog/${postId}/comments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(comment)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to add comment');
  return data.post;
}

export async function likeBlogComment(postId: string, commentId: string): Promise<BlogPost> {
  const res = await fetch(`/api/blog/${postId}/comments/${commentId}/like`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to like comment');
  return data.post;
}

export async function createBlogPost(post: Omit<BlogPost, 'id' | 'viewsCount' | 'publishedAt'>): Promise<BlogPost> {
  const res = await fetch('/api/blog', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(post)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to create blog post');
  return data.post;
}

export async function updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
  const res = await fetch(`/api/blog/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to update blog post');
  return data.post;
}

export async function deleteBlogPost(id: string): Promise<boolean> {
  const res = await fetch(`/api/blog/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to delete blog post');
  return true;
}

export async function generateQuiz(config: QuizConfig): Promise<{ id: string; title: string; questions: Question[]; mode: 'practice' | 'exam'; durationMinutes: number; negativeMarking: boolean; negativeMarkPerWrong: number }> {
  const res = await fetch('/api/quizzes/generate', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(config)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to generate quiz');
  return data.quiz;
}

export async function submitQuiz(payload: {
  quizTitle: string;
  subject: string;
  mode: string;
  durationSeconds: number;
  responses: any[];
  negativeMarking?: boolean;
  negativeMarkPerWrong?: number;
}): Promise<QuizAttempt> {
  const res = await fetch('/api/quizzes/submit', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to submit quiz');
  return data.attempt;
}

export async function fetchAttempts(): Promise<QuizAttempt[]> {
  const res = await fetch('/api/quizzes/attempts', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch attempts');
  return data.attempts;
}

export async function fetchAttemptDetails(attemptId: string): Promise<{ attempt: QuizAttempt; questions: Question[] }> {
  const res = await fetch(`/api/quizzes/attempts/${attemptId}`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch attempt details');
  return { attempt: data.attempt, questions: data.questions };
}

export async function fetchAnalytics(): Promise<AnalyticsOverview> {
  const userId = getStoredUserId();
  if (!userId) {
    return {
      totalQuizzesTaken: 0,
      totalQuestionsAttempted: 0,
      overallAccuracy: 0,
      totalTimeSpentSeconds: 0,
      currentStreakDays: 0,
      averageSpeedSeconds: 0,
      strongSubjects: [],
      weakSubjects: [],
      recentAttempts: [],
      subjectPerformances: [],
      accuracyHistory: []
    };
  }
  const res = await fetch('/api/analytics', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch analytics');
  return data.overview;
}

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsOverview> {
  const res = await fetch('/api/admin/analytics', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch admin analytics');
  return data.analytics;
}

export async function adminQuickUpdateExplanation(questionId: string, explanation: string): Promise<boolean> {
  const res = await fetch(`/api/admin/questions/${questionId}/explanation`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ explanation })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to update question explanation');
  return true;
}

export async function toggleBookmark(questionId: string): Promise<boolean> {
  const res = await fetch('/api/bookmarks/toggle', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ questionId })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to toggle bookmark');
  return data.isBookmarked;
}

export async function fetchBookmarks(): Promise<string[]> {
  const res = await fetch('/api/bookmarks', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch bookmarks');
  return data.bookmarks;
}

export async function saveNote(questionId: string, note: string): Promise<any> {
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ questionId, note })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to save note');
  return data.note;
}

export async function fetchNote(questionId: string): Promise<string> {
  const res = await fetch(`/api/notes/${questionId}`, { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch note');
  return data.note;
}

export async function askAiExplanation(question: Question): Promise<string> {
  const res = await fetch('/api/ai/explain', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      questionText: question.text,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      explanation: question.explanation
    })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'AI explanation generation failed');
  return data.explanation;
}

export async function generateAiQuiz(topic: string, subject: string, difficulty?: string, count?: number): Promise<Question[]> {
  const res = await fetch('/api/ai/generate-quiz', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ topic, subject, difficulty, count })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'AI quiz generation failed');
  return data.questions;
}

export async function fetchAdminUsers(): Promise<User[]> {
  const res = await fetch('/api/admin/users', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch admin users');
  return data.users;
}

export async function updateUserRoleAndSubscription(
  userId: string,
  role: string,
  isSubscribed: boolean,
  subscriptionPlan?: string,
  targetExam?: string
): Promise<User> {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ role, isSubscribed, subscriptionPlan, targetExam })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to update user role');
  return data.user;
}

export async function resetPassword(email: string, newPassword: string): Promise<User> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, newPassword })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Password reset failed');
  setStoredUserId(data.user.id);
  if (data.token) {
    setStoredToken(data.token);
  }
  return data.user;
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<boolean> {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to change password');
  return true;
}

export async function adminResetUserPassword(userId: string, newPassword: string): Promise<boolean> {
  const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ newPassword })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to reset user password');
  return true;
}

export async function createAdminUser(payload: {
  name: string;
  email: string;
  role: string;
  targetExam?: string;
  isSubscribed?: boolean;
  password?: string;
}): Promise<User> {
  const res = await fetch('/api/admin/users/create', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to create user');
  return data.user;
}

export async function resetUserQuota(userId: string): Promise<User> {
  const res = await fetch(`/api/admin/users/${userId}/reset-quota`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to reset user quota');
  return data.user;
}

export async function deleteAdminUser(userId: string): Promise<boolean> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to delete user');
  return true;
}

export async function fetchSecurityStatus(): Promise<any> {
  const res = await fetch('/api/admin/security', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch security status');
  return data.status;
}

export async function fetchGithubStatus(): Promise<{
  branch: string;
  remoteUrl: string;
  lastCommit: string;
  hasUncommittedChanges: boolean;
  uncommittedFilesCount: number;
}> {
  const res = await fetch('/api/admin/github/status', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch GitHub status');
  return data;
}

export async function configureGithubRemote(repoUrl: string, personalAccessToken?: string): Promise<string> {
  const res = await fetch('/api/admin/github/configure', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ repoUrl, personalAccessToken })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to configure GitHub remote');
  return data.message;
}

export async function pushToGithub(commitMessage?: string): Promise<{ message: string; output: string }> {
  const res = await fetch('/api/admin/github/push', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ commitMessage })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to push to GitHub');
  return { message: data.message, output: data.output };
}

export async function fetchAiPackages(): Promise<any[]> {
  const res = await fetch('/api/admin/ai-packages', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch AI packages');
  return data.packages;
}

export async function upgradeUserSubscription(plan: string): Promise<User> {
  const res = await fetch('/api/subscription/upgrade', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ plan })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to upgrade subscription');
  return data.user;
}

export async function fetchChatMessages(): Promise<any[]> {
  const res = await fetch('/api/chat', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch chat messages');
  return data.messages;
}

export async function sendChatMessage(text: string, questionId?: string, recipientId?: string): Promise<any> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text, questionId, recipientId })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to send chat message');
  return data.message;
}

export async function resolveChatMessage(msgId: string): Promise<boolean> {
  const res = await fetch(`/api/chat/${msgId}/resolve`, {
    method: 'PUT',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to resolve chat message');
  return data.resolved;
}

export async function fetchPeerChallenges(): Promise<any[]> {
  const res = await fetch('/api/challenges', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch challenges');
  return data.challenges;
}

export async function createPeerChallenge(title: string, subject: string, opponentId?: string): Promise<any> {
  const res = await fetch('/api/challenges', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title, subject, opponentId })
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to create challenge');
  return data.challenge;
}

export async function initSslCommerzPayment(payload: {
  planId: string;
  amount: number;
  cusName: string;
  cusEmail: string;
  cusPhone: string;
  paymentChannel?: string;
}): Promise<{ transaction: SslCommerzTransaction; gatewayUrl: string; meta: any }> {
  const res = await fetch('/api/payment/sslcommerz/init', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to initialize SSLCommerz transaction');
  return { transaction: data.transaction, gatewayUrl: data.gatewayUrl, meta: data.meta };
}

export async function validateSslCommerzPayment(payload: {
  tran_id: string;
  val_id?: string;
  payment_method?: string;
  card_type?: string;
  bank_tran_id?: string;
}): Promise<SslCommerzTransaction> {
  const res = await fetch('/api/payment/sslcommerz/success', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to validate SSLCommerz payment');
  return data.transaction;
}

export async function failSslCommerzPayment(tran_id: string, reason?: string): Promise<void> {
  await fetch('/api/payment/sslcommerz/fail', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ tran_id, reason })
  });
}

export async function cancelSslCommerzPayment(tran_id: string): Promise<void> {
  await fetch('/api/payment/sslcommerz/cancel', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ tran_id })
  });
}

export async function fetchSslCommerzTransactions(): Promise<SslCommerzTransaction[]> {
  const res = await fetch('/api/payment/sslcommerz/transactions', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch SSLCommerz transactions');
  return data.transactions;
}

// --- SPLASH SCREEN / BOOTING OFFER API ---
export async function fetchSplashOffer(): Promise<SplashOffer> {
  const res = await fetch('/api/splash-offer', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch splash offer');
  return data.offer;
}

export async function updateSplashOffer(offerData: Partial<SplashOffer>): Promise<SplashOffer> {
  const res = await fetch('/api/splash-offer', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(offerData)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to update splash offer');
  return data.offer;
}

// --- ANNOUNCEMENTS & SMS NOTIFICATIONS API ---
export async function fetchNotifications(): Promise<AppNotification[]> {
  const res = await fetch('/api/notifications', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch notifications');
  return data.notifications;
}

export async function createBroadcastNotification(notificationData: Partial<AppNotification>): Promise<AppNotification> {
  const res = await fetch('/api/notifications', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(notificationData)
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to broadcast notification');
  return data.notification;
}

export async function deleteNotification(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to delete notification');
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, {
    method: 'POST',
    headers: getHeaders()
  });
}

// --- REAL-TIME LIVE USER PRESENCE & MODERATOR WORK DOSSIER API ---
export async function sendUserHeartbeat(activity?: string, deviceInfo?: string): Promise<void> {
  try {
    const user = getStoredUser();
    await fetch('/api/users/heartbeat', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        userId: user?.id,
        activity,
        deviceInfo
      })
    });
  } catch {}
}

export async function fetchLiveUsers(): Promise<LiveUserStatus[]> {
  const res = await fetch('/api/admin/live-users', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch live active users');
  return data.users;
}

export async function fetchModeratorWorkSummaries(): Promise<ModeratorWorkSummary[]> {
  const res = await fetch('/api/admin/moderators/work-summary', { headers: getHeaders() });
  const data = await handleResponse(res);
  if (!data.success) throw new Error(data.error || 'Failed to fetch moderator work summaries');
  return data.moderators;
}



