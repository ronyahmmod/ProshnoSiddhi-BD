export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'MODERATOR' | 'CLIENT';
export type AuthProvider = 'email' | 'google' | 'facebook';

export interface AdminPrivileges {
  canDirectAdd: boolean;
  canDirectEdit: boolean;
  canDirectDelete: boolean;
  canDirectBulkImport: boolean;
  canApprovePR: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  authProvider: AuthProvider;
  isSubscribed: boolean;
  subscriptionPlan?: 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY' | 'VIP_PASS';
  subscriptionExpiresAt?: string;
  dailyQuestionsUsed: number;
  maxDailyFreeQuestions: number;
  createdAt: string;
  targetExam?: string;
  streakDays: number;
  xp: number;
  adminPrivileges?: AdminPrivileges;
  isOnline?: boolean;
  lastActiveAt?: string;
  currentActivity?: string;
  deviceInfo?: string;
}

export interface LiveUserStatus {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  isOnline: boolean;
  lastActiveAt: string;
  currentActivity: string;
  targetExam?: string;
  xp?: number;
  deviceInfo?: string;
}

export interface ModeratorWorkSummary {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  isOnline: boolean;
  lastActiveAt?: string;
  currentActivity?: string;
  totalPrsSubmitted: number;
  approvedPrsCount: number;
  pendingPrsCount: number;
  rejectedPrsCount: number;
  directQuestionsAdded: number;
  directQuestionsUpdated: number;
  bulkImportsCount: number;
  inquiriesResolvedCount: number;
  recentActions: Array<{
    id: string;
    actionType: string;
    description: string;
    timestamp: string;
    status?: string;
  }>;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  correctOptionIndices?: number[];
  isMultiSelect?: boolean;
  explanation: string;
  subject: string;
  topic: string;
  subtopic?: string;
  exam?: string;
  questionSource?: string;
  difficulty: Difficulty;
  tags: string[];
  createdAt?: string;
  authorId?: string;
  authorName?: string;
  authorRole?: UserRole;
  isHighValueAiGenerated?: boolean;
}

export interface ExamCategory {
  id: string;
  name: string;
  code?: string;
  shortCode?: string;
  category?: 'BCS' | 'BANK' | 'GRE' | 'PRIMARY' | 'NTRCA' | 'OTHER' | string;
  description?: string;
  subjects?: string[];
  year?: number;
  totalQuestions?: number;
  totalMarks?: number;
  negativeMarksPerWrong?: number;
  durationMinutes?: number;
  targetCandidatesCount?: number;
  candidatesAttendedCount?: number;
  activeTakersCount?: number;
  rating?: number;
  icon?: string;
  color?: string;
  createdAt?: string;
  questionIds?: string[];
  instructions?: string;
  isLive?: boolean;
}

export interface ScheduledExam {
  id: string;
  userId: string;
  examId: string;
  examName: string;
  scheduledTime: string; // ISO timestamp
  notificationSent?: boolean;
  durationMinutes?: number;
  notes?: string;
  createdAt: string;
}

export interface TopicItem {
  id?: string;
  name?: string;
  topic?: string;
  questionCount?: number;
  subtopics: string[];
}

export interface SubjectHierarchy {
  id?: string;
  name?: string;
  subject?: string;
  examIds?: string[];
  topics: TopicItem[];
}

export interface WrongQuestionRecord {
  id: string;
  userId: string;
  questionId: string;
  question?: Question;
  userSelectedOption: number | null;
  userSelectedOptions?: number[];
  correctOptionIndex: number;
  correctOptionIndices?: number[];
  mistakeCount: number;
  lastAttemptedAt: string;
  resolved: boolean;
  resolvedAt?: string;
  examName?: string;
  subject?: string;
  topic?: string;
}

export type BlogCategory = 'JOB_CIRCULAR' | 'TOPIC_NOTE' | 'PREP_GUIDE' | 'DAILY_GK' | 'EXAM_NOTICE' | 'VIDEO_LECTURE' | 'AUDIO_CLASS';

export interface BlogComment {
  id: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorRole?: string;
  content: string;
  createdAt: string;
  likes?: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug?: string;
  category: BlogCategory;
  tags: string[];
  content: string;
  summary?: string;
  readTimeMinutes?: number;
  coverImage?: string;
  coverImageUrl?: string;
  videoUrl?: string; // YouTube, Vimeo, or direct MP4 URL
  audioUrl?: string; // Audio podcast / lecture recording MP3
  audioTitle?: string;
  galleryImages?: string[]; // Multiple image URLs for WordPress gallery
  downloadAttachmentUrl?: string; // PDF syllabus, routine, or circular
  downloadAttachmentLabel?: string;
  publishedAt: string;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string;
  targetExam?: string;
  applicationDeadline?: string;
  salaryRange?: string;
  viewsCount: number;
  likesCount?: number;
  isFeatured?: boolean;
  featured?: boolean;
  comments?: BlogComment[];
}

export type QuizMode = 'practice' | 'exam' | 'challenge';

export interface QuizConfig {
  id?: string;
  title: string;
  subject?: string;
  topic?: string;
  difficulty?: Difficulty | 'All';
  questionCount: number;
  durationMinutes: number;
  mode: QuizMode;
  negativeMarking: boolean;
  negativeMarkPerWrong: number; // e.g. 0.25
}

export interface QuizQuestionResponse {
  questionId: string;
  selectedOptionIndex: number | null;
  selectedOptionIndices?: number[];
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizTitle: string;
  subject: string;
  mode: QuizMode;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  totalScore: number;
  maxScore: number;
  accuracyPercentage: number;
  responses: QuizQuestionResponse[];
  questionIds: string[];
}

export interface UserBookmark {
  userId: string;
  questionId: string;
  savedAt: string;
  note?: string;
}

export interface UserNote {
  userId: string;
  questionId: string;
  note: string;
  updatedAt: string;
}

export interface SubjectPerformance {
  subject: string;
  totalQuestionsAttempted: number;
  correctCount: number;
  accuracyPercentage: number;
  avgTimePerQuestionSeconds: number;
  masteryLevel: 'Novice' | 'Intermediate' | 'Proficient' | 'Master';
}

export interface AnalyticsOverview {
  totalQuizzesTaken: number;
  totalQuestionsAttempted: number;
  overallAccuracy: number;
  totalTimeSpentSeconds: number;
  currentStreakDays: number;
  averageSpeedSeconds: number;
  strongSubjects: string[];
  weakSubjects: string[];
  recentAttempts: QuizAttempt[];
  subjectPerformances: SubjectPerformance[];
  accuracyHistory: { date: string; accuracy: number; score: number; label: string }[];
}

export interface QuestionFilter {
  exam?: string;
  subject?: string;
  topic?: string;
  subtopic?: string;
  difficulty?: string;
  search?: string;
  bookmarkedOnly?: boolean;
  statusFilter?: 'all' | 'unattempted' | 'correct' | 'incorrect';
  page?: number;
  limit?: number;
}

export interface PaginatedQuestionsResult {
  questions: Question[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AiSubscriptionPackage {
  id: string;
  name: string;
  description: string;
  priceBdt: number;
  questionsQuota: number;
  badgeText: string;
  isPopular?: boolean;
  features: string[];
  active: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName?: string;
  text: string;
  questionId?: string;
  timestamp: string;
  isResolved?: boolean;
}

export interface PeerChallenge {
  id: string;
  title: string;
  subject: string;
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  status: 'pending' | 'active' | 'completed';
  questionCount: number;
  questions: Question[];
  scoreChallenger?: number;
  scoreOpponent?: number;
  winnerId?: string;
  createdAt: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  details: string;
  ipAddress: string;
  severity: 'info' | 'warning' | 'alert';
}

export interface SystemSecurityStatus {
  rateLimiterActive: boolean;
  blockedRequestsCount: number;
  activeSessionsCount: number;
  totalQuestionsInBank: number;
  aiCreditsRemaining: number;
  securityLogs: SecurityAuditLog[];
}

export type SslPaymentStatus = 'PENDING' | 'VALIDATED' | 'FAILED' | 'CANCELLED';

export interface SslCommerzInitRequest {
  planId: 'PRO_MONTHLY' | 'PRO_YEARLY' | 'VIP_PASS' | string;
  amount: number;
  cusName: string;
  cusEmail: string;
  cusPhone: string;
  paymentChannel?: 'bkash' | 'nagad' | 'rocket' | 'card' | 'any';
}

export interface SslCommerzTransaction {
  tranId: string;
  valId?: string;
  userId: string;
  userName: string;
  userEmail: string;
  cusPhone?: string;
  amount: number;
  currency: 'BDT';
  planId: string;
  planName: string;
  paymentMethod: string;
  status: SslPaymentStatus;
  gatewayUrl?: string;
  bankTranId?: string;
  cardType?: string;
  storeIdUsed: string;
  createdAt: string;
  validatedAt?: string;
}

export type SplashCtaAction = 'SUBSCRIPTION' | 'QUESTION_BANK' | 'BLOG' | 'EXTERNAL';

export interface SplashOffer {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  badgeText?: string;
  imageUrl?: string;
  promoCode?: string;
  discountPercentage?: number;
  ctaText?: string;
  ctaAction?: SplashCtaAction;
  externalUrl?: string;
  active: boolean;
  dismissDurationHours?: number;
  publishedAt: string;
  updatedAt: string;
}

export type NotificationType = 'ANNOUNCEMENT' | 'SMS_ALERT' | 'EXAM_REMINDER' | 'OFFER' | 'MODERATOR_NOTICE';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  senderName: string;
  senderRole: string;
  senderAvatar?: string;
  priority?: 'HIGH' | 'NORMAL' | 'URGENT';
  targetGroup?: 'ALL' | 'PRO_ONLY' | 'FREE_ONLY';
  linkTab?: string;
  createdAt: string;
  read?: boolean;
}

export type PRActionType = 'ADD' | 'UPDATE' | 'DELETE' | 'BULK_IMPORT';
export type PRStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface QuestionPullRequest {
  id: string;
  prNumber: number;
  title: string;
  commitMessage: string;
  action: PRActionType;
  status: PRStatus;
  
  // Proposer info
  proposerId: string;
  proposerName: string;
  proposerEmail: string;
  proposerRole: UserRole;
  
  // Target question details (for UPDATE or DELETE)
  targetQuestionId?: string;
  originalQuestion?: Question;
  
  // Proposed question (for ADD or UPDATE)
  proposedQuestion?: Omit<Question, 'id'> | Question;
  
  // Bulk questions (for BULK_IMPORT)
  bulkQuestions?: Array<Omit<Question, 'id'>>;
  bulkCount?: number;

  // Duplicate warning detection
  duplicateWarning?: {
    isDuplicate: boolean;
    similarity: number;
    topMatchQuestionId?: string;
    topMatchQuestionText?: string;
    reason?: string;
  };

  // Client Review & Contributor Reward Info
  clientReviewInfo?: {
    isClientReview: boolean;
    reviewType: 'ANSWER_CORRECTION' | 'EXPLANATION_ENHANCEMENT' | 'LATEX_FIX' | 'TYPO_FIX' | 'GENERAL_UPDATE';
    contributorPhone?: string; // bKash/Nagad for future payouts
    referenceSource?: string;
    reviewReason?: string;
    rewardAmount?: number;
    payoutStatus?: 'PENDING' | 'APPROVED' | 'PAID';
  };

  // Reviewer info
  reviewerId?: string;
  reviewerName?: string;
  reviewerRole?: UserRole;
  reviewComment?: string;
  
  createdAt: string;
  reviewedAt?: string;
}

export interface AdminAnalyticsOverview {
  totalUsers: number;
  totalStudents: number;
  totalStaff: number;
  activeSubscribers: number;
  dailyActiveStudents: number;
  totalQuestions: number;
  questionsWithExplanation: number;
  questionsMissingExplanation: number;
  questionsWithoutExplanation?: number;
  mathJaxQuestionsCount: number;
  questionsBySubject: { subject: string; count: number }[];
  questionsByExam: { exam: string; count: number }[];
  questionsByDifficulty: { easy: number; medium: number; hard: number };
  totalQuizzesTaken: number;
  totalAttemptsLogged?: number;
  totalQuestionsAttempted: number;
  platformAverageScore: number;
  averageStudentAccuracy?: number;
  platformAverageSpeedSeconds: number;
  mostChallengingTopics: { topic: string; subject: string; errorRate: number; totalAttempts: number; totalAnswered?: number }[];
  topicDifficultyInsights?: { topic: string; subject: string; errorRate: number; totalAttempts: number; totalAnswered?: number }[];
  topPerformingSubjects: { subject: string; accuracy: number }[];
  totalRevenue: number;
  totalTransactions: number;
  pendingPullRequests: number;
  approvedPullRequests: number;
  recentAttemptsList: {
    id: string;
    userName: string;
    userEmail: string;
    subject: string;
    quizTitle?: string;
    score: number;
    total: number;
    accuracy: number;
    completedAt: string;
    createdAt?: string;
  }[];
  recentAttempts?: {
    id: string;
    userName: string;
    userEmail: string;
    subject?: string;
    quizTitle?: string;
    score: number;
    total: number;
    accuracy: number;
    completedAt?: string;
    createdAt?: string;
  }[];
}

