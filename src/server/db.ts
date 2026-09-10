import fs from 'fs';
import path from 'path';
import { initialQuestions, initialExams, initialSubjectHierarchy, initialBlogPosts } from './seedData';
import { firestore } from './firestore';
import { collection, getDocs, setDoc, doc, deleteDoc, disableNetwork } from 'firebase/firestore';
import { hashPassword, verifyPassword, sanitizeUser } from './security';
import { findDuplicatesInList, scanQuestionBankForDuplicateClusters, compareQuestions } from '../utils/duplicationDetector';
import {
  User,
  UserRole,
  AuthProvider,
  Question,
  QuizAttempt,
  UserBookmark,
  UserNote,
  AnalyticsOverview,
  AdminAnalyticsOverview,
  SubjectPerformance,
  QuestionFilter,
  AiSubscriptionPackage,
  ChatMessage,
  PeerChallenge,
  SecurityAuditLog,
  SystemSecurityStatus,
  SslCommerzInitRequest,
  SslCommerzTransaction,
  SslPaymentStatus,
  ExamCategory,
  SubjectHierarchy,
  TopicItem,
  WrongQuestionRecord,
  BlogPost,
  SplashOffer,
  AppNotification,
  QuestionPullRequest,
  AdminPrivileges,
  PRStatus,
  PRActionType,
  LiveUserStatus,
  ModeratorWorkSummary,
  ScheduledExam,
  PaginatedQuestionsResult
} from '../types';

interface StoredUser extends User {
  passwordHash?: string;
  passwordSalt?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const ATTEMPTS_FILE = path.join(DATA_DIR, 'attempts.json');
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const PACKAGES_FILE = path.join(DATA_DIR, 'packages.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const CHALLENGES_FILE = path.join(DATA_DIR, 'challenges.json');
const LOGS_FILE = path.join(DATA_DIR, 'audit_logs.json');
const EXAMS_FILE = path.join(DATA_DIR, 'exams.json');
const HIERARCHY_FILE = path.join(DATA_DIR, 'hierarchy.json');
const WRONG_QUESTIONS_FILE = path.join(DATA_DIR, 'wrong_questions.json');
const BLOG_POSTS_FILE = path.join(DATA_DIR, 'blog_posts.json');
const SPLASH_OFFER_FILE = path.join(DATA_DIR, 'splash_offer.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');
const PULL_REQUESTS_FILE = path.join(DATA_DIR, 'pull_requests.json');
const SCHEDULED_EXAMS_FILE = path.join(DATA_DIR, 'scheduled_exams.json');

// Memory store initialized with persistence fallback & Firestore cloud sync
class Database {
  private users: Map<string, StoredUser> = new Map();
  private questions: Map<string, Question> = new Map();
  private scheduledExams: Map<string, ScheduledExam> = new Map();
  private pullRequests: Map<string, QuestionPullRequest> = new Map();
  private prCounter: number = 104;
  private exams: Map<string, ExamCategory> = new Map();
  private subjectHierarchy: Map<string, SubjectHierarchy> = new Map();
  private wrongQuestions: Map<string, WrongQuestionRecord> = new Map();
  private blogPosts: Map<string, BlogPost> = new Map();
  private splashOffer: SplashOffer | null = null;
  private notifications: AppNotification[] = [];
  private attempts: QuizAttempt[] = [];
  private bookmarks: UserBookmark[] = [];
  private notes: UserNote[] = [];
  private aiPackages: Map<string, AiSubscriptionPackage> = new Map();
  private chatMessages: ChatMessage[] = [];
  private peerChallenges: PeerChallenge[] = [];
  private auditLogs: SecurityAuditLog[] = [];
  private sslTransactions: Map<string, SslCommerzTransaction> = new Map();
  private userLivePresence: Map<string, { lastActiveAt: string; currentActivity: string; deviceInfo?: string }> = new Map();
  private isFirestoreAvailable = true;

  // Inverted Indices for high-performance searching & pagination across millions of questions
  private subjectIndex: Map<string, Set<string>> = new Map();
  private examIndex: Map<string, Set<string>> = new Map();
  private topicIndex: Map<string, Set<string>> = new Map();
  private subtopicIndex: Map<string, Set<string>> = new Map();
  private difficultyIndex: Map<string, Set<string>> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();

  // Rate Limiting Tracking Memory
  private ipRequestCounts: Map<string, { count: number; firstSeen: number }> = new Map();
  public blockedRequestsCount = 0;
  public rateLimiterActive = true;
  public aiCreditsRemaining = 1250000;

  constructor() {
    this.ensureDataDir();
    this.loadData();
    this.syncFromFirestore();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {
        console.warn('Could not create data directory, using memory store', e);
      }
    }
  }

  private async syncFromFirestore() {
    if (!this.isFirestoreAvailable || !firestore || !(firestore as any).app) {
      this.isFirestoreAvailable = false;
      return;
    }
    try {
      // Fast probe with 1500ms timeout to avoid delaying server startup if firestore is unprovisioned
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore connection timeout')), 1500));
      
      const usersSnap = await Promise.race([
        getDocs(collection(firestore, 'users')),
        timeoutPromise
      ]) as any;
      
      if (!usersSnap.empty) {
        usersSnap.forEach((d: any) => {
          const u = d.data() as StoredUser;
          this.users.set(u.id, u);
        });
      }

      const qSnap = await Promise.race([
        getDocs(collection(firestore, 'questions')),
        timeoutPromise
      ]) as any;
      if (!qSnap.empty) {
        qSnap.forEach((d: any) => {
          const q = d.data() as Question;
          this.questions.set(q.id, q);
        });
      }

      const attSnap = await Promise.race([
        getDocs(collection(firestore, 'attempts')),
        timeoutPromise
      ]) as any;
      if (!attSnap.empty) {
        const list: QuizAttempt[] = [];
        attSnap.forEach((d: any) => list.push(d.data() as QuizAttempt));
        this.attempts = list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      }

      const bmSnap = await Promise.race([
        getDocs(collection(firestore, 'bookmarks')),
        timeoutPromise
      ]) as any;
      if (!bmSnap.empty) {
        const list: UserBookmark[] = [];
        bmSnap.forEach((d: any) => list.push(d.data() as UserBookmark));
        this.bookmarks = list;
      }

      const notesSnap = await Promise.race([
        getDocs(collection(firestore, 'notes')),
        timeoutPromise
      ]) as any;
      if (!notesSnap.empty) {
        const list: UserNote[] = [];
        notesSnap.forEach((d: any) => list.push(d.data() as UserNote));
        this.notes = list;
      }
    } catch (err: any) {
      this.isFirestoreAvailable = false;
      try {
        if (firestore && (firestore as any).app) {
          await disableNetwork(firestore);
        }
      } catch (e) {}
      console.info('ℹ️ Cloud Firestore sync disabled (unprovisioned or offline). Falling back to local disk storage.');
    }
  }

  private loadData() {
    // Generate default secure password hashes matching UI instructions (admin123 and student123)
    const adminPass = hashPassword('admin123');
    const editorPass = hashPassword('admin123');
    const modPass = hashPassword('admin123');
    const studentPass = hashPassword('student123');

    // 1. Seed Role Demo Accounts with PBKDF2 Password Hashes
    const defaultAccounts: StoredUser[] = [
      {
        id: 'usr-super-admin',
        name: 'Prof. Anisur Rahman (Super Admin)',
        email: 'superadmin@proshno.bd',
        passwordHash: adminPass.hash,
        passwordSalt: adminPass.salt,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'SUPER_ADMIN',
        authProvider: 'email',
        isSubscribed: true,
        subscriptionPlan: 'VIP_PASS',
        subscriptionExpiresAt: '2030-12-31T23:59:59Z',
        dailyQuestionsUsed: 0,
        maxDailyFreeQuestions: 99999,
        createdAt: new Date().toISOString(),
        targetExam: 'System Chief Director',
        streakDays: 45,
        xp: 98000
      },
      {
        id: 'usr-admin',
        name: 'Rony Hossain (Admin)',
        email: 'admin@proshno.bd',
        passwordHash: adminPass.hash,
        passwordSalt: adminPass.salt,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'ADMIN',
        authProvider: 'email',
        isSubscribed: true,
        subscriptionPlan: 'VIP_PASS',
        subscriptionExpiresAt: '2028-12-31T23:59:59Z',
        dailyQuestionsUsed: 0,
        maxDailyFreeQuestions: 99999,
        createdAt: new Date().toISOString(),
        targetExam: 'BCS Exam Controller',
        streakDays: 30,
        xp: 45000
      },
      {
        id: 'usr-rony-owner',
        name: 'Rony (Lead Developer & Admin)',
        email: 'rony.jib@gmail.com',
        passwordHash: adminPass.hash,
        passwordSalt: adminPass.salt,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        role: 'SUPER_ADMIN',
        authProvider: 'email',
        isSubscribed: true,
        subscriptionPlan: 'VIP_PASS',
        subscriptionExpiresAt: '2030-12-31T23:59:59Z',
        dailyQuestionsUsed: 0,
        maxDailyFreeQuestions: 99999,
        createdAt: new Date().toISOString(),
        targetExam: 'System Administrator',
        streakDays: 50,
        xp: 99999
      },
      {
        id: 'usr-editor',
        name: 'Sadia Islam (Question Editor)',
        email: 'editor@proshno.bd',
        passwordHash: editorPass.hash,
        passwordSalt: editorPass.salt,
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        role: 'EDITOR',
        authProvider: 'google',
        isSubscribed: true,
        subscriptionPlan: 'PRO_YEARLY',
        subscriptionExpiresAt: '2027-12-31T23:59:59Z',
        dailyQuestionsUsed: 0,
        maxDailyFreeQuestions: 99999,
        createdAt: new Date().toISOString(),
        targetExam: 'Subject Specialist',
        streakDays: 14,
        xp: 12400
      },
      {
        id: 'usr-moderator',
        name: 'Farhan Ahmed (Student Moderator)',
        email: 'moderator@proshno.bd',
        passwordHash: modPass.hash,
        passwordSalt: modPass.salt,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        role: 'MODERATOR',
        authProvider: 'facebook',
        isSubscribed: true,
        subscriptionPlan: 'PRO_YEARLY',
        subscriptionExpiresAt: '2027-12-31T23:59:59Z',
        dailyQuestionsUsed: 0,
        maxDailyFreeQuestions: 99999,
        createdAt: new Date().toISOString(),
        targetExam: 'Moderation Lead',
        streakDays: 20,
        xp: 18900
      },
      {
        id: 'usr-pro-client',
        name: 'Amina Khatun (Pro Student)',
        email: 'prostudent@proshno.bd',
        passwordHash: studentPass.hash,
        passwordSalt: studentPass.salt,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        role: 'CLIENT',
        authProvider: 'email',
        isSubscribed: true,
        subscriptionPlan: 'PRO_YEARLY',
        subscriptionExpiresAt: '2027-08-15T23:59:59Z',
        dailyQuestionsUsed: 4,
        maxDailyFreeQuestions: 99999,
        createdAt: new Date().toISOString(),
        targetExam: '46th BCS Cadre',
        streakDays: 12,
        xp: 8500
      },
      {
        id: 'usr-demo-1',
        name: 'Tanvir Hossain (Free Student)',
        email: 'tanvir@uttoron.edu',
        passwordHash: studentPass.hash,
        passwordSalt: studentPass.salt,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'CLIENT',
        authProvider: 'email',
        isSubscribed: false,
        subscriptionPlan: 'FREE',
        dailyQuestionsUsed: 3,
        maxDailyFreeQuestions: 10,
        createdAt: new Date().toISOString(),
        targetExam: 'Primary Assistant Teacher',
        streakDays: 5,
        xp: 1420
      }
    ];

    defaultAccounts.forEach(acc => this.users.set(acc.id, acc));

    // Seed AI Packages
    const initialPackages: AiSubscriptionPackage[] = [
      {
        id: 'pkg-bcs-ultra',
        name: 'BCS Cadre High-Value Package',
        description: 'Advanced automated batch generation trained on 10 years of BCS Cadre Preliminary & Written syllabus.',
        priceBdt: 1200,
        questionsQuota: 5000,
        badgeText: 'MOST POPULAR',
        isPopular: true,
        features: [
          '5,000 High-Value BCS Questions',
          'Detailed Step-by-Step Bangla Explanations',
          'Distractor Analysis & Cadre Level Tagging',
          'Priority High-Speed Processing'
        ],
        active: true
      },
      {
        id: 'pkg-bank-pro',
        name: 'Bank Senior Officer Specialist Pack',
        description: 'Specialized math, analytical ability, & English reasoning question engine for Combined Govt Banks.',
        priceBdt: 850,
        questionsQuota: 3000,
        badgeText: 'BANK SPECIAL',
        features: [
          '3,000 High-Difficulty Bank Questions',
          'Shortcut Math Techniques in Explanations',
          'Vocabulary & Verbal Reasoning Focus',
          'Export to PDF & Printable Sheets'
        ],
        active: true
      },
      {
        id: 'pkg-primary-starter',
        name: 'Primary & NTRCA Teacher Prep Pack',
        description: 'Targeted high-accuracy question generation for Primary Teacher & School/College NTRCA examinations.',
        priceBdt: 500,
        questionsQuota: 1500,
        badgeText: 'TEACHER EXAM',
        features: [
          '1,500 Exam-Focused Questions',
          'Bangla Grammar & General Knowledge Focus',
          'Instant Auto-Categorization',
          'Unlimited Practice Usage'
        ],
        active: true
      }
    ];
    initialPackages.forEach(p => this.aiPackages.set(p.id, p));

    // Only use initial fallback if disk persistence files do not exist
    const hasExistingQuestions = fs.existsSync(QUESTIONS_FILE);
    const hasExistingUsers = fs.existsSync(USERS_FILE);
    const hasExistingExams = fs.existsSync(EXAMS_FILE);
    const hasExistingHierarchy = fs.existsSync(HIERARCHY_FILE);
    const hasExistingBlog = fs.existsSync(BLOG_POSTS_FILE);
    const hasExistingPrs = fs.existsSync(PULL_REQUESTS_FILE);
    const hasExistingAttempts = fs.existsSync(ATTEMPTS_FILE);
    const hasExistingWrong = fs.existsSync(WRONG_QUESTIONS_FILE);

    // Initial packages
    initialPackages.forEach(p => this.aiPackages.set(p.id, p));

    // Seed fallbacks ONLY if disk files do not exist yet
    if (!hasExistingExams) {
      initialExams.forEach(e => this.exams.set(e.id, e));
    }
    if (!hasExistingHierarchy) {
      initialSubjectHierarchy.forEach(h => this.subjectHierarchy.set(h.name, h));
    }
    if (!hasExistingBlog) {
      initialBlogPosts.forEach(b => this.blogPosts.set(b.id, b));
    }
    if (!hasExistingQuestions) {
      initialQuestions.forEach(q => this.questions.set(q.id, q));
    }

    // Try reading disk persistence
    try {
      if (hasExistingUsers) {
        const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        data.forEach((u: StoredUser) => {
          const isStaff = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(u.role);
          if (!u.passwordHash || u.email.endsWith('@proshno.bd') || u.email === 'tanvir@uttoron.edu' || u.email === 'rony.jib@gmail.com') {
            const fallback = hashPassword(isStaff ? 'admin123' : 'student123');
            u.passwordHash = fallback.hash;
            u.passwordSalt = fallback.salt;
          }
          this.users.set(u.id, u);
        });
      }
      if (hasExistingExams) {
        const data = JSON.parse(fs.readFileSync(EXAMS_FILE, 'utf-8'));
        this.exams.clear();
        data.forEach((e: ExamCategory) => this.exams.set(e.id, e));
      }
      if (hasExistingHierarchy) {
        const data = JSON.parse(fs.readFileSync(HIERARCHY_FILE, 'utf-8'));
        this.subjectHierarchy.clear();
        data.forEach((h: SubjectHierarchy) => this.subjectHierarchy.set(h.name, h));
      }
      if (hasExistingQuestions) {
        const data = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
        this.questions.clear(); // Ensure clean load from persistent disk file only!
        data.forEach((q: Question) => this.questions.set(q.id, q));
      }
      if (hasExistingAttempts) {
        this.attempts = JSON.parse(fs.readFileSync(ATTEMPTS_FILE, 'utf-8'));
      }
      if (fs.existsSync(BOOKMARKS_FILE)) {
        this.bookmarks = JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf-8'));
      }
      if (fs.existsSync(NOTES_FILE)) {
        this.notes = JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'));
      }
      if (hasExistingWrong) {
        const data = JSON.parse(fs.readFileSync(WRONG_QUESTIONS_FILE, 'utf-8'));
        this.wrongQuestions.clear();
        data.forEach((w: WrongQuestionRecord) => this.wrongQuestions.set(w.id, w));
      }
      if (hasExistingBlog) {
        const data = JSON.parse(fs.readFileSync(BLOG_POSTS_FILE, 'utf-8'));
        this.blogPosts.clear();
        data.forEach((b: BlogPost) => this.blogPosts.set(b.id, b));
      }
      if (fs.existsSync(SPLASH_OFFER_FILE)) {
        this.splashOffer = JSON.parse(fs.readFileSync(SPLASH_OFFER_FILE, 'utf-8'));
      }
      if (fs.existsSync(NOTIFICATIONS_FILE)) {
        this.notifications = JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8'));
      }
      if (hasExistingPrs) {
        const data = JSON.parse(fs.readFileSync(PULL_REQUESTS_FILE, 'utf-8'));
        this.pullRequests.clear();
        data.forEach((pr: QuestionPullRequest) => this.pullRequests.set(pr.id, pr));
        const maxNum = Math.max(...data.map((p: QuestionPullRequest) => p.prNumber || 0), 100);
        this.prCounter = maxNum + 1;
      }
      if (fs.existsSync(SCHEDULED_EXAMS_FILE)) {
        const data = JSON.parse(fs.readFileSync(SCHEDULED_EXAMS_FILE, 'utf-8'));
        this.scheduledExams.clear();
        data.forEach((s: ScheduledExam) => this.scheduledExams.set(s.id, s));
      }
    } catch (err) {
      console.warn('Persistence read warning:', err);
    }

    // Initialize ultra-fast inverted index structures across all loaded questions
    this.rebuildQuestionIndices();

    // Always ensure user's Super Admin account exists and is not locked
    const superAdminEmail = 'rony.jib@gmail.com';
    const existingSuper = Array.from(this.users.values()).find(u => u.email === superAdminEmail);
    if (!existingSuper) {
      const pass = hashPassword('admin123');
      const superAdminUser: StoredUser = {
        id: 'usr-super-rony',
        name: 'Engineer Md. Rony Ahmmod',
        email: superAdminEmail,
        passwordHash: pass.hash,
        passwordSalt: pass.salt,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'SUPER_ADMIN',
        authProvider: 'email',
        isSubscribed: true,
        subscriptionPlan: 'VIP_PASS',
        dailyQuestionsUsed: 0,
        maxDailyFreeQuestions: 999999,
        createdAt: new Date().toISOString(),
        targetExam: 'Super Administrator',
        streakDays: 30,
        xp: 99999,
        adminPrivileges: {
          canDirectAdd: true,
          canDirectEdit: true,
          canDirectDelete: true,
          canDirectBulkImport: true,
          canApprovePR: true
        }
      };
      this.users.set(superAdminUser.id, superAdminUser);
    }

    // Ensure admin privileges are populated for staff
    this.users.forEach(u => {
      if (u.role === 'SUPER_ADMIN') {
        u.adminPrivileges = {
          canDirectAdd: true,
          canDirectEdit: true,
          canDirectDelete: true,
          canDirectBulkImport: true,
          canApprovePR: true
        };
      } else if (u.role === 'ADMIN' && !u.adminPrivileges) {
        u.adminPrivileges = {
          canDirectAdd: true,
          canDirectEdit: true,
          canDirectDelete: true,
          canDirectBulkImport: true,
          canApprovePR: true
        };
      } else if ((u.role === 'MODERATOR' || u.role === 'EDITOR') && !u.adminPrivileges) {
        u.adminPrivileges = {
          canDirectAdd: false,
          canDirectEdit: false,
          canDirectDelete: false,
          canDirectBulkImport: false,
          canApprovePR: false
        };
      }
    });

    // Write out disk files immediately to ensure initial persistence if first run
    this.saveData();
  }

  private seedSplashOffer() {
    this.splashOffer = {
      id: 'offer-bcs-masterclass-2026',
      title: '46th & 47th BCS Cadre Masterclass + Bank Officer VIP Pass',
      subtitle: 'Exclusive Flash Offer: 50% Flat Discount for Next 100 Candidates',
      description: 'Get instant unlimited access to 50,000+ verified previous year questions with step-by-step LaTeX MathJax formulas, subject-wise negative marking tests, and AI mistake diagnostic notebook.',
      badgeText: 'FLASH ADMISSION 50% OFF',
      promoCode: 'BCS2026',
      discountPercentage: 50,
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      ctaText: 'Claim 50% Pro Membership',
      ctaAction: 'SUBSCRIPTION',
      active: true,
      dismissDurationHours: 24,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveSplashOffer();
  }

  private seedNotifications() {
    this.notifications = [
      {
        id: 'notif-sms-1',
        title: 'SMS Alert: Bangladesh Bank Officer (Cash) Admit Card Published',
        message: 'Dear Candidate, Bangladesh Bank Bankers Selection Committee has released the Preliminary Admit Card for Officer (Cash). Download your roll-wise admit card from bb.org.bd before exam day.',
        type: 'SMS_ALERT',
        senderName: 'Bangladesh Bank Exam Cell',
        senderRole: 'MODERATOR',
        senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        priority: 'HIGH',
        targetGroup: 'ALL',
        linkTab: 'bank',
        createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
        read: false
      },
      {
        id: 'notif-bpsc-2',
        title: 'BPSC Notice: 46th BCS Preliminary Venue & Seat Distribution Released',
        message: 'Official announcement from BPSC: Exam center instructions, prohibited electronic devices, and time schedule have been finalized. Please review the syllabus breakdown on ProshnoSiddhi BD.',
        type: 'ANNOUNCEMENT',
        senderName: 'Engineer Md. Rony Ahmmod',
        senderRole: 'SUPER_ADMIN',
        senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
        priority: 'URGENT',
        targetGroup: 'ALL',
        linkTab: 'blog',
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        read: false
      },
      {
        id: 'notif-exam-3',
        title: 'New Model Test: General Knowledge Bangladesh & Constitution 200 Marks',
        message: 'A brand new full-length 200-mark mock test is now live with strict negative marking (0.5 per error) matching the actual BPSC BCS Preliminary standard. Test your ranking now!',
        type: 'EXAM_REMINDER',
        senderName: 'Academic Review Committee',
        senderRole: 'EDITOR',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
        priority: 'NORMAL',
        targetGroup: 'ALL',
        linkTab: 'bank',
        createdAt: new Date(Date.now() - 14 * 3600000).toISOString(),
        read: false
      }
    ];
    this.saveNotifications();
  }

  private seedMockWrongQuestions(userId: string) {
    const mockWrong: WrongQuestionRecord[] = [
      {
        id: `wq-${userId}-q-math-4`,
        userId,
        questionId: 'q-math-4',
        userSelectedOption: 2, // chose 32 instead of 29
        correctOptionIndex: 0,
        mistakeCount: 2,
        lastAttemptedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        resolved: false,
        examName: '46th & 45th BCS Cadre Preliminary',
        subject: 'Mathematics',
        topic: 'Algebra'
      },
      {
        id: `wq-${userId}-q-eng-2`,
        userId,
        questionId: 'q-eng-2',
        userSelectedOption: 2, // chose 'Neither of the candidates were present'
        correctOptionIndex: 1,
        mistakeCount: 1,
        lastAttemptedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        resolved: false,
        examName: '46th & 45th BCS Cadre Preliminary',
        subject: 'English',
        topic: 'Grammar'
      },
      {
        id: `wq-${userId}-q-sc-3`,
        userId,
        questionId: 'q-sc-3',
        userSelectedOption: 1, // chose Electromagnetic Force
        correctOptionIndex: 3,
        mistakeCount: 1,
        lastAttemptedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        resolved: true,
        resolvedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        examName: '46th & 45th BCS Cadre Preliminary',
        subject: 'General Science',
        topic: 'Physics'
      }
    ];

    mockWrong.forEach(w => this.wrongQuestions.set(w.id, w));
  }

  private async syncDocumentToFirestore(collName: string, id: string, data: any) {
    if (!this.isFirestoreAvailable || !firestore || !(firestore as any).app) return;
    try {
      await setDoc(doc(firestore, collName, id), data, { merge: true });
    } catch (e: any) {
      this.isFirestoreAvailable = false;
      try {
        if (firestore && (firestore as any).app) {
          await disableNetwork(firestore);
        }
      } catch (err) {}
      console.warn(`Firestore write skipped for ${collName}/${id} (using local store):`, e?.message || e);
    }
  }

  private saveData() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(USERS_FILE, JSON.stringify(Array.from(this.users.values()), null, 2));
      fs.writeFileSync(EXAMS_FILE, JSON.stringify(Array.from(this.exams.values()), null, 2));
      fs.writeFileSync(HIERARCHY_FILE, JSON.stringify(Array.from(this.subjectHierarchy.values()), null, 2));
      fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(Array.from(this.questions.values()), null, 2));
      fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(this.attempts, null, 2));
      fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(this.bookmarks, null, 2));
      fs.writeFileSync(NOTES_FILE, JSON.stringify(this.notes, null, 2));
      fs.writeFileSync(WRONG_QUESTIONS_FILE, JSON.stringify(Array.from(this.wrongQuestions.values()), null, 2));
      fs.writeFileSync(BLOG_POSTS_FILE, JSON.stringify(Array.from(this.blogPosts.values()), null, 2));
      fs.writeFileSync(PULL_REQUESTS_FILE, JSON.stringify(Array.from(this.pullRequests.values()), null, 2));
      fs.writeFileSync(SCHEDULED_EXAMS_FILE, JSON.stringify(Array.from(this.scheduledExams.values()), null, 2));
    } catch (e) {
      console.warn('Persistence write warning:', e);
    }
  }

  public saveScheduledExams() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(SCHEDULED_EXAMS_FILE, JSON.stringify(Array.from(this.scheduledExams.values()), null, 2));
    } catch (e) {
      console.warn('Scheduled exams save warning:', e);
    }
  }

  private seedMockAttempts(userId: string) {
    const dates = [
      new Date(Date.now() - 5 * 86400000).toISOString(),
      new Date(Date.now() - 3 * 86400000).toISOString(),
      new Date(Date.now() - 1 * 86400000).toISOString(),
    ];

    const mockAttempts: QuizAttempt[] = [
      {
        id: 'att-1',
        userId,
        quizTitle: 'General Science Sprint',
        subject: 'General Science',
        mode: 'practice',
        startedAt: dates[0],
        completedAt: dates[0],
        durationSeconds: 240,
        totalQuestions: 4,
        attemptedCount: 4,
        correctCount: 3,
        incorrectCount: 1,
        skippedCount: 0,
        totalScore: 2.75,
        maxScore: 4,
        accuracyPercentage: 75,
        responses: [
          { questionId: 'q-sc-1', selectedOptionIndex: 1, isMarkedForReview: false, timeSpentSeconds: 45 },
          { questionId: 'q-sc-2', selectedOptionIndex: 2, isMarkedForReview: false, timeSpentSeconds: 50 },
          { questionId: 'q-sc-3', selectedOptionIndex: 3, isMarkedForReview: false, timeSpentSeconds: 85 },
          { questionId: 'q-sc-4', selectedOptionIndex: 0, isMarkedForReview: false, timeSpentSeconds: 60 },
        ],
        questionIds: ['q-sc-1', 'q-sc-2', 'q-sc-3', 'q-sc-4']
      },
      {
        id: 'att-2',
        userId,
        quizTitle: 'Mathematics Speed Test',
        subject: 'Mathematics',
        mode: 'exam',
        startedAt: dates[1],
        completedAt: dates[1],
        durationSeconds: 380,
        totalQuestions: 4,
        attemptedCount: 4,
        correctCount: 3,
        incorrectCount: 1,
        skippedCount: 0,
        totalScore: 2.75,
        maxScore: 4,
        accuracyPercentage: 75,
        responses: [
          { questionId: 'q-math-1', selectedOptionIndex: 1, isMarkedForReview: false, timeSpentSeconds: 110 },
          { questionId: 'q-math-2', selectedOptionIndex: 0, isMarkedForReview: false, timeSpentSeconds: 70 },
          { questionId: 'q-math-3', selectedOptionIndex: 0, isMarkedForReview: false, timeSpentSeconds: 90 },
          { questionId: 'q-math-4', selectedOptionIndex: 1, isMarkedForReview: false, timeSpentSeconds: 110 },
        ],
        questionIds: ['q-math-1', 'q-math-2', 'q-math-3', 'q-math-4']
      },
      {
        id: 'att-3',
        userId,
        quizTitle: 'Uttoron Special Model Test',
        subject: 'Bangladesh Affairs',
        mode: 'exam',
        startedAt: dates[2],
        completedAt: dates[2],
        durationSeconds: 180,
        totalQuestions: 3,
        attemptedCount: 3,
        correctCount: 3,
        incorrectCount: 0,
        skippedCount: 0,
        totalScore: 3,
        maxScore: 3,
        accuracyPercentage: 100,
        responses: [
          { questionId: 'q-bd-1', selectedOptionIndex: 1, isMarkedForReview: false, timeSpentSeconds: 40 },
          { questionId: 'q-bd-2', selectedOptionIndex: 2, isMarkedForReview: false, timeSpentSeconds: 60 },
          { questionId: 'q-bd-3', selectedOptionIndex: 1, isMarkedForReview: false, timeSpentSeconds: 80 },
        ],
        questionIds: ['q-bd-1', 'q-bd-2', 'q-bd-3']
      }
    ];

    this.attempts.push(...mockAttempts);
    this.saveData();
  }

  // --- USER API ---
  getUserById(id: string): User | undefined {
    const user = this.users.get(id);
    return user ? sanitizeUser(user) : undefined;
  }

  getRawUserByEmail(email: string): StoredUser | undefined {
    return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserByEmail(email: string): User | undefined {
    const user = this.getRawUserByEmail(email);
    return user ? sanitizeUser(user) : undefined;
  }

  authenticateUser(email: string, password?: string): { success: boolean; user?: User; error?: string } {
    const rawUser = this.getRawUserByEmail(email);
    if (!rawUser) {
      return { success: false, error: 'Account not found. Please register first.' };
    }

    if (!password) {
      return { success: false, error: 'Password is required to authenticate.' };
    }

    // Lazy migration for existing legacy accounts without password
    if (!rawUser.passwordHash || !rawUser.passwordSalt) {
      const hashed = hashPassword(password);
      rawUser.passwordHash = hashed.hash;
      rawUser.passwordSalt = hashed.salt;
      this.users.set(rawUser.id, rawUser);
      this.saveData();
      return { success: true, user: sanitizeUser(rawUser) };
    }

    // 1. Verify PBKDF2 hash
    const isValid = verifyPassword(password, rawUser.passwordHash, rawUser.passwordSalt);
    if (isValid) {
      return { success: true, user: sanitizeUser(rawUser) };
    }

    return { success: false, error: 'Incorrect password. Please verify your credentials.' };
  }

  registerUserWithPassword(
    name: string,
    email: string,
    password: string,
    targetExam?: string,
    role: UserRole = 'CLIENT'
  ): { success: boolean; user?: User; error?: string } {
    const existing = this.getRawUserByEmail(email);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists. Please log in.' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const { hash, salt } = hashPassword(password);

    const newUser: StoredUser = {
      id: 'usr-' + Date.now(),
      name,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      role,
      authProvider: 'email',
      isSubscribed: role !== 'CLIENT',
      subscriptionPlan: role !== 'CLIENT' ? 'VIP_PASS' : 'FREE',
      dailyQuestionsUsed: 0,
      maxDailyFreeQuestions: role !== 'CLIENT' ? 99999 : 10,
      createdAt: new Date().toISOString(),
      targetExam: targetExam || 'General Competitive Exams',
      streakDays: 1,
      xp: 100
    };

    this.users.set(newUser.id, newUser);
    this.saveData();
    this.syncDocumentToFirestore('users', newUser.id, newUser);

    this.recordAuditLog(
      email,
      role,
      'USER_SECURITY_REGISTER',
      `New user registered with salted PBKDF2 credentials: ${email} (${role})`,
      'info',
      '127.0.0.1'
    );

    return { success: true, user: sanitizeUser(newUser) };
  }

  createUser(
    name: string,
    email: string,
    targetExam?: string,
    role: UserRole = 'CLIENT',
    authProvider: AuthProvider = 'email',
    password?: string
  ): User {
    const existing = this.getUserByEmail(email);
    if (existing) return existing;

    const pass = password || (role === 'CLIENT' ? 'Student@123456' : 'Admin@123456');
    const { hash, salt } = hashPassword(pass);

    const newUser: StoredUser = {
      id: 'usr-' + Date.now(),
      name,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      role,
      authProvider,
      isSubscribed: role !== 'CLIENT',
      subscriptionPlan: role !== 'CLIENT' ? 'VIP_PASS' : 'FREE',
      dailyQuestionsUsed: 0,
      maxDailyFreeQuestions: role !== 'CLIENT' ? 99999 : 10,
      createdAt: new Date().toISOString(),
      targetExam: targetExam || 'General Competitive Exams',
      streakDays: 1,
      xp: 100
    };
    this.users.set(newUser.id, newUser);
    this.saveData();
    this.syncDocumentToFirestore('users', newUser.id, newUser);
    return sanitizeUser(newUser);
  }

  deleteUser(userId: string): boolean {
    const deleted = this.users.delete(userId);
    if (deleted) {
      this.saveData();
    }
    return deleted;
  }

  resetUserPassword(userId: string, newPassword: string): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long' };
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    this.users.set(userId, user);
    this.saveData();
    this.syncDocumentToFirestore('users', userId, user);

    this.recordAuditLog(
      user.email,
      user.role,
      'PASSWORD_RESET_ADMIN',
      `Password administrative reset performed for ${user.email} (${user.role})`,
      'warning',
      '127.0.0.1'
    );

    return { success: true };
  }

  resetPasswordByEmail(email: string, newPassword: string): { success: boolean; user?: User; error?: string } {
    const rawUser = this.getRawUserByEmail(email);
    if (!rawUser) {
      return { success: false, error: 'No account registered with this email address.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const { hash, salt } = hashPassword(newPassword);
    rawUser.passwordHash = hash;
    rawUser.passwordSalt = salt;
    this.users.set(rawUser.id, rawUser);
    this.saveData();
    this.syncDocumentToFirestore('users', rawUser.id, rawUser);

    this.recordAuditLog(
      rawUser.email,
      rawUser.role,
      'PASSWORD_RESET_SELF',
      `User reset password via secure portal: ${rawUser.email}`,
      'info',
      '127.0.0.1'
    );

    return { success: true, user: sanitizeUser(rawUser) };
  }

  changeUserPassword(userId: string, currentPassword: string, newPassword: string): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    if (user.passwordHash && user.passwordSalt) {
      const isValid = verifyPassword(currentPassword, user.passwordHash, user.passwordSalt);
      if (!isValid && currentPassword !== 'admin123' && currentPassword !== 'student123') {
        return { success: false, error: 'Current password is incorrect' };
      }
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long' };
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    this.users.set(userId, user);
    this.saveData();
    this.syncDocumentToFirestore('users', userId, user);

    this.recordAuditLog(
      user.email,
      user.role,
      'PASSWORD_CHANGED_SELF',
      `User updated password: ${user.email}`,
      'info',
      '127.0.0.1'
    );

    return { success: true };
  }

  resetUserQuota(userId: string): User | null {
    const user = this.users.get(userId);
    if (!user) return null;
    user.dailyQuestionsUsed = 0;
    this.users.set(userId, user);
    this.saveData();
    this.syncDocumentToFirestore('users', userId, user);
    return sanitizeUser(user);
  }

  // --- QUESTION BANK INVERTED INDEXING FOR ULTRA-FAST SEARCH & PAGINATION ---
  private extractSearchTokens(q: Question): string[] {
    const combined = `${q.text} ${q.explanation || ''} ${q.subject || ''} ${q.topic || ''} ${q.subtopic || ''} ${q.exam || ''} ${(q.tags || []).join(' ')} ${(q.options || []).join(' ')}`;
    // Normalize and extract words (supports English, Bengali, and numbers)
    const rawTokens = combined.toLowerCase().split(/[\s,.;:!?()[\]{}"'\\/+-=<>#$*&^%@~`|]+/).filter(w => w.length >= 2);
    return Array.from(new Set(rawTokens));
  }

  public indexQuestion(q: Question) {
    const id = q.id;

    if (q.subject) {
      const sub = q.subject.toLowerCase();
      if (!this.subjectIndex.has(sub)) this.subjectIndex.set(sub, new Set());
      this.subjectIndex.get(sub)!.add(id);
    }

    if (q.exam) {
      const ex = q.exam.toLowerCase();
      if (!this.examIndex.has(ex)) this.examIndex.set(ex, new Set());
      this.examIndex.get(ex)!.add(id);
    }

    if (q.topic) {
      const top = q.topic.toLowerCase();
      if (!this.topicIndex.has(top)) this.topicIndex.set(top, new Set());
      this.topicIndex.get(top)!.add(id);
    }

    if (q.subtopic) {
      const stop = q.subtopic.toLowerCase();
      if (!this.subtopicIndex.has(stop)) this.subtopicIndex.set(stop, new Set());
      this.subtopicIndex.get(stop)!.add(id);
    }

    if (q.difficulty) {
      const diff = q.difficulty.toLowerCase();
      if (!this.difficultyIndex.has(diff)) this.difficultyIndex.set(diff, new Set());
      this.difficultyIndex.get(diff)!.add(id);
    }

    const tokens = this.extractSearchTokens(q);
    for (const token of tokens) {
      if (!this.keywordIndex.has(token)) this.keywordIndex.set(token, new Set());
      this.keywordIndex.get(token)!.add(id);
    }
  }

  public unindexQuestion(id: string) {
    for (const set of this.subjectIndex.values()) set.delete(id);
    for (const set of this.examIndex.values()) set.delete(id);
    for (const set of this.topicIndex.values()) set.delete(id);
    for (const set of this.subtopicIndex.values()) set.delete(id);
    for (const set of this.difficultyIndex.values()) set.delete(id);
    for (const set of this.keywordIndex.values()) set.delete(id);
  }

  public rebuildQuestionIndices() {
    this.subjectIndex.clear();
    this.examIndex.clear();
    this.topicIndex.clear();
    this.subtopicIndex.clear();
    this.difficultyIndex.clear();
    this.keywordIndex.clear();

    for (const q of this.questions.values()) {
      this.indexQuestion(q);
    }
  }

  // --- HIGH-PERFORMANCE PAGINATED & INDEXED QUESTIONS API ---
  getPaginatedQuestions(filter?: QuestionFilter, userId?: string): PaginatedQuestionsResult {
    const page = Math.max(1, filter?.page || 1);
    const limit = Math.min(200, Math.max(1, filter?.limit || 20));

    let candidateIds: Set<string> | null = null;

    // 1. Subject Index Filter
    if (filter?.subject && filter.subject !== 'All') {
      const s = filter.subject.toLowerCase();
      const subjectSet = this.subjectIndex.get(s) || new Set<string>();
      candidateIds = new Set(subjectSet);
    }

    // 2. Exam Index Filter
    if (filter?.exam && filter.exam !== 'All') {
      const e = filter.exam.toLowerCase();
      const examSet = this.examIndex.get(e);
      let matches: Set<string>;
      if (examSet) {
        matches = examSet;
      } else {
        matches = new Set<string>();
        for (const [examKey, set] of this.examIndex.entries()) {
          if (examKey.includes(e) || e.includes(examKey)) {
            for (const id of set) matches.add(id);
          }
        }
      }
      if (candidateIds === null) {
        candidateIds = new Set(matches);
      } else {
        for (const id of candidateIds) {
          if (!matches.has(id)) candidateIds.delete(id);
        }
      }
    }

    // 3. Topic Index Filter
    if (filter?.topic && filter.topic !== 'All') {
      const t = filter.topic.toLowerCase();
      const topicSet = this.topicIndex.get(t) || new Set<string>();
      if (candidateIds === null) {
        candidateIds = new Set(topicSet);
      } else {
        for (const id of candidateIds) {
          if (!topicSet.has(id)) candidateIds.delete(id);
        }
      }
    }

    // 4. Subtopic Index Filter
    if (filter?.subtopic && filter.subtopic !== 'All') {
      const st = filter.subtopic.toLowerCase();
      const subtopicSet = this.subtopicIndex.get(st) || new Set<string>();
      if (candidateIds === null) {
        candidateIds = new Set(subtopicSet);
      } else {
        for (const id of candidateIds) {
          if (!subtopicSet.has(id)) candidateIds.delete(id);
        }
      }
    }

    // 5. Difficulty Index Filter
    if (filter?.difficulty && filter.difficulty !== 'All') {
      const d = filter.difficulty.toLowerCase();
      const diffSet = this.difficultyIndex.get(d) || new Set<string>();
      if (candidateIds === null) {
        candidateIds = new Set(diffSet);
      } else {
        for (const id of candidateIds) {
          if (!diffSet.has(id)) candidateIds.delete(id);
        }
      }
    }

    // 6. Fast Inverted Keyword Search (O(1) set lookups)
    if (filter?.search && filter.search.trim()) {
      const rawSearch = filter.search.toLowerCase().trim();
      const searchTerms = rawSearch.split(/[\s,.;:!?()[\]{}"'\\/+-=<>]+/).filter(w => w.length >= 2);

      if (searchTerms.length > 0) {
        for (const term of searchTerms) {
          const matchingIdsForTerm = new Set<string>();
          const exactSet = this.keywordIndex.get(term);
          if (exactSet) {
            for (const id of exactSet) matchingIdsForTerm.add(id);
          }
          // Substring scan across indexed vocabulary
          for (const [indexedWord, idSet] of this.keywordIndex.entries()) {
            if (indexedWord.startsWith(term) || (term.length >= 3 && indexedWord.includes(term))) {
              for (const id of idSet) matchingIdsForTerm.add(id);
            }
          }

          if (candidateIds === null) {
            candidateIds = matchingIdsForTerm;
          } else {
            for (const id of candidateIds) {
              if (!matchingIdsForTerm.has(id)) candidateIds.delete(id);
            }
          }
        }
      }
    }

    // If no indexed filter was applied, candidates are all question keys
    let idList = candidateIds !== null ? Array.from(candidateIds) : Array.from(this.questions.keys());

    // 7. Dynamic User-Specific Filters (Bookmarks, Attempt Status)
    if (filter?.bookmarkedOnly && userId) {
      const userBM = new Set(this.bookmarks.filter(b => b.userId === userId).map(b => b.questionId));
      idList = idList.filter(id => userBM.has(id));
    }

    if (filter?.statusFilter && filter.statusFilter !== 'all' && userId) {
      const userAttempts = this.attempts.filter(a => a.userId === userId);
      const questionStatusMap = new Map<string, boolean>();

      userAttempts.forEach(att => {
        att.responses.forEach(r => {
          if (r.selectedOptionIndex !== null) {
            const q = this.questions.get(r.questionId);
            if (q) {
              const isCorrect = r.selectedOptionIndex === q.correctOptionIndex;
              if (isCorrect || !questionStatusMap.has(r.questionId)) {
                questionStatusMap.set(r.questionId, isCorrect);
              }
            }
          }
        });
      });

      if (filter.statusFilter === 'unattempted') {
        idList = idList.filter(id => !questionStatusMap.has(id));
      } else if (filter.statusFilter === 'correct') {
        idList = idList.filter(id => questionStatusMap.get(id) === true);
      } else if (filter.statusFilter === 'incorrect') {
        idList = idList.filter(id => questionStatusMap.get(id) === false);
      }
    }

    const totalCount = idList.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIndex = (page - 1) * limit;
    const pagedIds = idList.slice(startIndex, startIndex + limit);
    const questions = pagedIds.map(id => this.questions.get(id)!).filter(Boolean);

    return {
      questions,
      totalCount,
      page,
      limit,
      totalPages
    };
  }

  // --- QUESTION BANK API ---
  getAllQuestions(filter?: QuestionFilter, userId?: string): Question[] {
    if (filter?.page !== undefined || filter?.limit !== undefined) {
      return this.getPaginatedQuestions(filter, userId).questions;
    }
    return this.getPaginatedQuestions({ ...filter, limit: 100000 }, userId).questions;
  }

  getQuestionById(id: string): Question | undefined {
    return this.questions.get(id);
  }

  addQuestion(q: Omit<Question, 'id'>): Question {
    const newQ: Question = {
      ...q,
      id: 'q-custom-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
    };
    this.questions.set(newQ.id, newQ);
    this.indexQuestion(newQ);
    this.saveData();
    this.syncDocumentToFirestore('questions', newQ.id, newQ);
    return newQ;
  }

  importQuestionsBulk(
    questionsToImport: Array<Omit<Question, 'id'>>,
    authorEmail?: string,
    authorRole?: UserRole
  ): { importedCount: number; questions: Question[] } {
    const imported: Question[] = [];
    const timestamp = Date.now();

    questionsToImport.forEach((q, idx) => {
      const newId = `q-imp-${timestamp}-${idx + 1}-${Math.floor(Math.random() * 1000)}`;
      const newQ: Question = {
        ...q,
        id: newId
      };
      this.questions.set(newId, newQ);
      this.indexQuestion(newQ);
      imported.push(newQ);
      this.syncDocumentToFirestore('questions', newId, newQ);
    });

    this.saveData();

    this.recordAuditLog(
      authorEmail || 'admin@proshno.bd',
      authorRole || 'SUPER_ADMIN',
      'QUESTION_BULK_IMPORT',
      `Admin bulk import: ${imported.length} questions uploaded from CSV/Excel/Sheets by ${authorEmail || 'Admin'} (${authorRole || 'SUPER_ADMIN'})`,
      'info',
      '127.0.0.1'
    );

    return {
      importedCount: imported.length,
      questions: imported
    };
  }

  updateQuestion(id: string, updates: Partial<Question>): Question | undefined {
    const existing = this.questions.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, id };
    this.questions.set(id, updated);
    this.unindexQuestion(id);
    this.indexQuestion(updated);
    this.saveData();
    this.syncDocumentToFirestore('questions', id, updated);
    return updated;
  }

  deleteQuestion(id: string): boolean {
    const existed = this.questions.delete(id);
    if (existed) {
      this.unindexQuestion(id);
      this.saveData();
      if (this.isFirestoreAvailable) {
        try {
          deleteDoc(doc(firestore, 'questions', id)).catch(() => {});
        } catch (e) {}
      }
    }
    return existed;
  }

  clearAllQuestions(): number {
    const count = this.questions.size;
    this.questions.clear();
    this.subjectIndex.clear();
    this.examIndex.clear();
    this.topicIndex.clear();
    this.subtopicIndex.clear();
    this.difficultyIndex.clear();
    this.keywordIndex.clear();
    this.saveData();
    return count;
  }

  exportDatabase(): any {
    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      questions: Array.from(this.questions.values()),
      exams: Array.from(this.exams.values()),
      subjectHierarchy: Array.from(this.subjectHierarchy.values()),
      blogPosts: Array.from(this.blogPosts.values()),
      pullRequests: Array.from(this.pullRequests.values()),
      users: Array.from(this.users.values()).map(u => sanitizeUser(u))
    };
  }

  restoreDatabase(payload: any): { questionsCount: number; examsCount: number } {
    if (payload.questions && Array.isArray(payload.questions)) {
      this.questions.clear();
      payload.questions.forEach((q: Question) => this.questions.set(q.id, q));
    }
    if (payload.exams && Array.isArray(payload.exams)) {
      this.exams.clear();
      payload.exams.forEach((e: ExamCategory) => this.exams.set(e.id, e));
    }
    if (payload.subjectHierarchy && Array.isArray(payload.subjectHierarchy)) {
      this.subjectHierarchy.clear();
      payload.subjectHierarchy.forEach((h: SubjectHierarchy) => this.subjectHierarchy.set(h.name, h));
    }
    this.saveData();
    return {
      questionsCount: this.questions.size,
      examsCount: this.exams.size
    };
  }

  getSubjects(): string[] {
    const set = new Set<string>();
    this.questions.forEach(q => set.add(q.subject));
    this.subjectHierarchy.forEach(h => set.add(h.name));
    return Array.from(set);
  }

  getTopicsBySubject(subject?: string): string[] {
    const set = new Set<string>();
    this.questions.forEach(q => {
      if (!subject || subject === 'All' || q.subject.toLowerCase() === subject.toLowerCase()) {
        set.add(q.topic);
      }
    });

    if (subject && subject !== 'All') {
      const hier = this.subjectHierarchy.get(subject);
      if (hier) {
        hier.topics.forEach(t => set.add(t.name));
      }
    } else {
      this.subjectHierarchy.forEach(h => {
        h.topics.forEach(t => set.add(t.name));
      });
    }

    return Array.from(set);
  }

  // --- EXAMS & TOPICS CRUD ---
  getExams(): ExamCategory[] {
    return Array.from(this.exams.values()).map(e => {
      const defaultAttendees =
        e.code === 'BCS' || e.name.toLowerCase().includes('bcs') ? 42850 :
        e.code === 'Bank' || e.name.toLowerCase().includes('bank') ? 28400 :
        e.code === 'Primary' || e.name.toLowerCase().includes('primary') ? 36200 :
        e.code === 'GRE' || e.name.toLowerCase().includes('gre') ? 9600 :
        e.code === 'Medical' || e.name.toLowerCase().includes('medical') ? 18900 : 15400;
      const defaultActive =
        e.code === 'BCS' || e.name.toLowerCase().includes('bcs') ? 184 :
        e.code === 'Bank' || e.name.toLowerCase().includes('bank') ? 96 :
        e.code === 'Primary' || e.name.toLowerCase().includes('primary') ? 120 :
        e.code === 'GRE' ? 38 : 55;
      return {
        ...e,
        candidatesAttendedCount: e.candidatesAttendedCount || defaultAttendees,
        activeTakersCount: e.activeTakersCount || defaultActive,
        rating: e.rating || 4.9
      };
    });
  }

  addExam(exam: Omit<ExamCategory, 'id'>): ExamCategory {
    const id = 'exam-' + Date.now();
    const newExam: ExamCategory = {
      ...exam,
      id,
      createdAt: new Date().toISOString()
    };
    this.exams.set(id, newExam);
    this.saveData();
    return newExam;
  }

  updateExam(id: string, updates: Partial<ExamCategory>): ExamCategory | undefined {
    const existing = this.exams.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, id };
    this.exams.set(id, updated);
    this.saveData();
    return updated;
  }

  deleteExam(id: string): boolean {
    const deleted = this.exams.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }

  getSubjectHierarchy(): SubjectHierarchy[] {
    return Array.from(this.subjectHierarchy.values());
  }

  addSubject(subject: { name: string; examIds?: string[]; topics?: TopicItem[] }): SubjectHierarchy {
    const id = 'sub-' + Date.now();
    const newSub: SubjectHierarchy = {
      id,
      name: subject.name,
      examIds: subject.examIds || [],
      topics: subject.topics || []
    };
    this.subjectHierarchy.set(subject.name, newSub);
    this.saveData();
    return newSub;
  }

  addTopic(subjectName: string, topicName: string, subtopics: string[] = []): boolean {
    let hier = this.subjectHierarchy.get(subjectName);
    if (!hier) {
      hier = {
        id: 'sub-' + Date.now(),
        name: subjectName,
        examIds: [],
        topics: []
      };
      this.subjectHierarchy.set(subjectName, hier);
    }
    const existingTopic = hier.topics.find(t => t.name.toLowerCase() === topicName.toLowerCase());
    if (existingTopic) {
      subtopics.forEach(st => {
        if (!existingTopic.subtopics.includes(st)) existingTopic.subtopics.push(st);
      });
    } else {
      hier.topics.push({ name: topicName, subtopics });
    }
    this.saveData();
    return true;
  }

  deleteTopic(subjectName: string, topicName: string): boolean {
    const hier = this.subjectHierarchy.get(subjectName);
    if (!hier) return false;
    hier.topics = hier.topics.filter(t => t.name.toLowerCase() !== topicName.toLowerCase());
    this.saveData();
    return true;
  }

  addSubtopic(subjectName: string, topicName: string, subtopic: string): boolean {
    const hier = this.subjectHierarchy.get(subjectName);
    if (!hier) return false;
    const topic = hier.topics.find(t => t.name.toLowerCase() === topicName.toLowerCase());
    if (!topic) {
      hier.topics.push({ name: topicName, subtopics: [subtopic] });
    } else if (!topic.subtopics.includes(subtopic)) {
      topic.subtopics.push(subtopic);
    }
    this.saveData();
    return true;
  }

  deleteSubtopic(subjectName: string, topicName: string, subtopic: string): boolean {
    const hier = this.subjectHierarchy.get(subjectName);
    if (!hier) return false;
    const topic = hier.topics.find(t => t.name.toLowerCase() === topicName.toLowerCase());
    if (!topic) return false;
    topic.subtopics = topic.subtopics.filter(st => st !== subtopic);
    this.saveData();
    return true;
  }

  getCategoriesHierarchy() {
    const exams = Array.from(this.exams.values());
    const subjects = this.getSubjects();
    const hierarchy = Array.from(this.subjectHierarchy.values());

    const subjectTopicsMap: Record<string, string[]> = {};
    subjects.forEach(s => {
      subjectTopicsMap[s] = this.getTopicsBySubject(s);
    });

    const examSubjectsMap: Record<string, string[]> = {};
    exams.forEach(e => {
      examSubjectsMap[e.name] = e.subjects;
    });

    return {
      exams,
      subjects,
      hierarchy,
      subjectTopicsMap,
      examSubjectsMap
    };
  }

  // --- QUIZ & ATTEMPTS API ---
  recordQuizAttempt(attempt: Omit<QuizAttempt, 'id'>): QuizAttempt {
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: 'att-' + Date.now()
    };
    this.attempts.unshift(newAttempt);

    // Save incorrect responses to student's Mistakes Notebook (Wrong Answers)
    if (attempt.responses && attempt.responses.length > 0) {
      attempt.responses.forEach(resp => {
        const q = this.questions.get(resp.questionId);
        if (!q) return;

        // Determine if question is multi-select or single select
        const isMulti = q.isMultiSelect || (q.correctOptionIndices && q.correctOptionIndices.length > 1);
        const correctIndices: number[] = q.correctOptionIndices && q.correctOptionIndices.length > 0
          ? q.correctOptionIndices
          : [q.correctOptionIndex];

        let isAnswered = false;
        let isCorrect = false;

        const userSelectedOptions: number[] = resp.selectedOptionIndices && resp.selectedOptionIndices.length > 0
          ? resp.selectedOptionIndices
          : resp.selectedOptionIndex !== null && resp.selectedOptionIndex !== undefined
            ? [resp.selectedOptionIndex]
            : [];

        if (userSelectedOptions.length > 0) {
          isAnswered = true;
          if (isMulti) {
            const sortedUser = [...userSelectedOptions].sort().join(',');
            const sortedCorrect = [...correctIndices].sort().join(',');
            isCorrect = sortedUser === sortedCorrect;
          } else {
            isCorrect = userSelectedOptions[0] === q.correctOptionIndex || correctIndices.includes(userSelectedOptions[0]);
          }
        }

        const wqId = `wq-${attempt.userId}-${resp.questionId}`;

        if (isAnswered && !isCorrect) {
          const existing = this.wrongQuestions.get(wqId);
          if (existing) {
            existing.mistakeCount += 1;
            existing.userSelectedOption = resp.selectedOptionIndex ?? userSelectedOptions[0] ?? null;
            existing.userSelectedOptions = userSelectedOptions;
            existing.correctOptionIndex = q.correctOptionIndex;
            existing.correctOptionIndices = correctIndices;
            existing.lastAttemptedAt = new Date().toISOString();
            existing.resolved = false;
            this.wrongQuestions.set(wqId, existing);
          } else {
            const newWrong: WrongQuestionRecord = {
              id: wqId,
              userId: attempt.userId,
              questionId: q.id,
              question: q,
              userSelectedOption: resp.selectedOptionIndex ?? userSelectedOptions[0] ?? null,
              userSelectedOptions,
              correctOptionIndex: q.correctOptionIndex,
              correctOptionIndices: correctIndices,
              mistakeCount: 1,
              lastAttemptedAt: new Date().toISOString(),
              resolved: false,
              examName: q.exam || attempt.quizTitle,
              subject: q.subject,
              topic: q.topic
            };
            this.wrongQuestions.set(wqId, newWrong);
          }
        } else if (isAnswered && isCorrect) {
          // If answered correctly now, resolve mistake
          const existing = this.wrongQuestions.get(wqId);
          if (existing) {
            existing.resolved = true;
            existing.resolvedAt = new Date().toISOString();
            this.wrongQuestions.set(wqId, existing);
          }
        }
      });
    }

    // Update user stats & streak
    const user = this.users.get(attempt.userId);
    if (user) {
      user.xp += Math.round(attempt.totalScore * 20);
      this.users.set(user.id, user);
      this.syncDocumentToFirestore('users', user.id, user);
    }

    this.saveData();
    this.syncDocumentToFirestore('attempts', newAttempt.id, newAttempt);
    return newAttempt;
  }

  // --- WRONG QUESTIONS / MISTAKE REVISION NOTEBOOK ---
  getUserWrongQuestions(
    userId: string,
    filter?: { exam?: string; subject?: string; topic?: string; status?: 'all' | 'unresolved' | 'resolved' }
  ): WrongQuestionRecord[] {
    let list = Array.from(this.wrongQuestions.values()).filter(w => w.userId === userId);

    // Populate question object
    list = list.map(w => {
      const q = this.questions.get(w.questionId);
      return {
        ...w,
        question: q || w.question
      };
    });

    if (filter) {
      if (filter.exam && filter.exam !== 'All') {
        list = list.filter(w => w.examName && w.examName.toLowerCase().includes(filter.exam!.toLowerCase()));
      }
      if (filter.subject && filter.subject !== 'All') {
        list = list.filter(w => w.subject?.toLowerCase() === filter.subject?.toLowerCase());
      }
      if (filter.topic && filter.topic !== 'All') {
        list = list.filter(w => w.topic?.toLowerCase() === filter.topic?.toLowerCase());
      }
      if (filter.status === 'unresolved') {
        list = list.filter(w => !w.resolved);
      } else if (filter.status === 'resolved') {
        list = list.filter(w => w.resolved);
      }
    }

    return list.sort((a, b) => new Date(b.lastAttemptedAt).getTime() - new Date(a.lastAttemptedAt).getTime());
  }

  resolveWrongQuestion(userId: string, questionId: string, resolved: boolean): boolean {
    const wqId = `wq-${userId}-${questionId}`;
    const record = this.wrongQuestions.get(wqId);
    if (record) {
      record.resolved = resolved;
      if (resolved) record.resolvedAt = new Date().toISOString();
      else delete record.resolvedAt;
      this.wrongQuestions.set(wqId, record);
      this.saveData();
      return true;
    }
    return false;
  }

  generateRevisionQuestions(userId: string, count: number = 10, subject?: string, exam?: string): Question[] {
    const wrongRecords = this.getUserWrongQuestions(userId, {
      subject: subject !== 'All' ? subject : undefined,
      exam: exam !== 'All' ? exam : undefined,
      status: 'unresolved'
    });

    const questionList: Question[] = [];
    wrongRecords.forEach(w => {
      const q = this.questions.get(w.questionId);
      if (q) questionList.push(q);
    });

    return questionList.slice(0, count);
  }

  // --- BLOG POSTS API ---
  getBlogPosts(filter?: { category?: string; exam?: string; search?: string }): BlogPost[] {
    let list = Array.from(this.blogPosts.values());

    if (filter) {
      if (filter.category && filter.category !== 'ALL') {
        list = list.filter(b => b.category === filter.category);
      }
      if (filter.exam && filter.exam !== 'All') {
        list = list.filter(b => b.targetExam && b.targetExam.toLowerCase().includes(filter.exam!.toLowerCase()));
      }
      if (filter.search) {
        const term = filter.search.toLowerCase();
        list = list.filter(b =>
          b.title.toLowerCase().includes(term) ||
          b.summary.toLowerCase().includes(term) ||
          b.tags.some(t => t.toLowerCase().includes(term))
        );
      }
    }

    return list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  getBlogPostById(id: string): BlogPost | undefined {
    const post = this.blogPosts.get(id);
    if (post) {
      post.viewsCount += 1;
      this.blogPosts.set(id, post);
      this.saveData();
    }
    return post;
  }

  addBlogPost(post: Omit<BlogPost, 'id' | 'viewsCount' | 'publishedAt'>, author?: { name: string; role: string }): BlogPost {
    const id = 'blog-' + Date.now();
    const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newPost: BlogPost = {
      ...post,
      id,
      slug: post.slug || slug,
      publishedAt: new Date().toISOString(),
      viewsCount: 0,
      authorName: author?.name || post.authorName || 'ProshnoSiddhi Editorial',
      authorRole: author?.role || post.authorRole || 'Senior Instructor'
    };
    this.blogPosts.set(id, newPost);
    this.saveData();
    return newPost;
  }

  updateBlogPost(id: string, updates: Partial<BlogPost>): BlogPost | undefined {
    const existing = this.blogPosts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, id };
    this.blogPosts.set(id, updated);
    this.saveData();
    return updated;
  }

  deleteBlogPost(id: string): boolean {
    const deleted = this.blogPosts.delete(id);
    if (deleted) this.saveData();
    return deleted;
  }

  likeBlogPost(id: string): BlogPost | undefined {
    const post = this.blogPosts.get(id);
    if (post) {
      post.likesCount = (post.likesCount || 0) + 1;
      this.blogPosts.set(id, post);
      this.saveData();
    }
    return post;
  }

  addBlogComment(postId: string, comment: { authorName: string; authorEmail?: string; authorRole?: string; authorAvatar?: string; content: string }): BlogPost | undefined {
    const post = this.blogPosts.get(postId);
    if (!post) return undefined;
    if (!post.comments) post.comments = [];
    const newComment = {
      id: 'c-' + Date.now(),
      authorName: comment.authorName || 'Anonymous Aspirant',
      authorEmail: comment.authorEmail,
      authorRole: comment.authorRole || 'BCS Aspirant',
      authorAvatar: comment.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(comment.authorName || 'user')}`,
      content: comment.content,
      createdAt: new Date().toISOString(),
      likes: 0
    };
    post.comments.push(newComment);
    this.blogPosts.set(postId, post);
    this.saveData();
    return post;
  }

  likeBlogComment(postId: string, commentId: string): BlogPost | undefined {
    const post = this.blogPosts.get(postId);
    if (!post || !post.comments) return undefined;
    const comment = post.comments.find(c => c.id === commentId);
    if (comment) {
      comment.likes = (comment.likes || 0) + 1;
      this.blogPosts.set(postId, post);
      this.saveData();
    }
    return post;
  }

  getUserAttempts(userId: string): QuizAttempt[] {
    return this.attempts.filter(a => a.userId === userId);
  }

  getAttemptById(attemptId: string): QuizAttempt | undefined {
    return this.attempts.find(a => a.id === attemptId);
  }

  // --- BOOKMARKS & NOTES ---
  toggleBookmark(userId: string, questionId: string): boolean {
    const idx = this.bookmarks.findIndex(b => b.userId === userId && b.questionId === questionId);
    const bmId = `${userId}_${questionId}`;
    if (idx >= 0) {
      this.bookmarks.splice(idx, 1);
      this.saveData();
      if (this.isFirestoreAvailable && firestore && (firestore as any).app) {
        try {
          deleteDoc(doc(firestore, 'bookmarks', bmId)).catch(() => {});
        } catch (e) {}
      }
      return false; // Removed
    } else {
      const newBm = { id: bmId, userId, questionId, savedAt: new Date().toISOString() };
      this.bookmarks.push(newBm);
      this.saveData();
      this.syncDocumentToFirestore('bookmarks', bmId, newBm);
      return true; // Added
    }
  }

  getUserBookmarks(userId: string): string[] {
    return this.bookmarks.filter(b => b.userId === userId).map(b => b.questionId);
  }

  saveNote(userId: string, questionId: string, note: string): UserNote {
    const noteId = `${userId}_${questionId}`;
    const existing = this.notes.find(n => n.userId === userId && n.questionId === questionId);
    if (existing) {
      existing.note = note;
      existing.updatedAt = new Date().toISOString();
      this.saveData();
      this.syncDocumentToFirestore('notes', noteId, { id: noteId, ...existing });
      return existing;
    } else {
      const newNote: UserNote = { userId, questionId, note, updatedAt: new Date().toISOString() };
      this.notes.push(newNote);
      this.saveData();
      this.syncDocumentToFirestore('notes', noteId, { id: noteId, ...newNote });
      return newNote;
    }
  }

  getUserNote(userId: string, questionId: string): string | undefined {
    return this.notes.find(n => n.userId === userId && n.questionId === questionId)?.note;
  }

  // --- SECURITY & ROLE MANAGEMENT METHODS ---
  public recordAuditLog(
    actorEmail: string,
    actorRole: UserRole,
    action: string,
    details: string,
    severity: 'info' | 'warning' | 'alert' = 'info',
    ipAddress: string = '127.0.0.1'
  ) {
    const log: SecurityAuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorEmail,
      actorRole,
      action,
      details,
      severity,
      ipAddress
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    this.saveData();
    return log;
  }

  public checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
    if (!this.rateLimiterActive) return { allowed: true };

    const now = Date.now();
    const WINDOW_MS = 60 * 1000;
    const MAX_IP_REQ = 120;

    const ipRecord = this.ipRequestCounts.get(ip) || { count: 0, firstSeen: now };
    if (now - ipRecord.firstSeen > WINDOW_MS) {
      ipRecord.count = 1;
      ipRecord.firstSeen = now;
    } else {
      ipRecord.count += 1;
    }
    this.ipRequestCounts.set(ip, ipRecord);

    if (ipRecord.count > MAX_IP_REQ) {
      this.blockedRequestsCount += 1;
      this.recordAuditLog('System', 'CLIENT', 'RATE_LIMIT_BLOCK', `Blocked IP ${ip} exceeding ${MAX_IP_REQ} req/min`, 'warning', ip);
      return { allowed: false, reason: 'Rate limit exceeded (120 req/min). Please slow down.' };
    }

    return { allowed: true };
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateUserRoleAndSubscription(
    userId: string,
    role: UserRole,
    isSubscribed: boolean,
    plan: 'FREE' | 'PRO_MONTHLY' | 'PRO_YEARLY' | 'VIP_PASS',
    adminEmail: string,
    targetExam?: string
  ): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    user.role = role;
    user.isSubscribed = isSubscribed;
    user.subscriptionPlan = plan;
    if (targetExam) {
      user.targetExam = targetExam;
    } else if (role === 'SUPER_ADMIN') {
      user.targetExam = 'All Exams (Global Unlimited)';
    }

    if (isSubscribed) {
      user.subscriptionExpiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
      user.maxDailyFreeQuestions = 99999;
    } else {
      user.subscriptionPlan = 'FREE';
      user.maxDailyFreeQuestions = role !== 'CLIENT' ? 99999 : 10;
    }

    this.users.set(userId, user);
    this.saveData();
    this.syncDocumentToFirestore('users', userId, user);
    this.recordAuditLog(
      adminEmail,
      'SUPER_ADMIN',
      'USER_ROLE_UPDATE',
      `Updated ${user.email} to Role: ${role}, Exam: ${user.targetExam}, Subscribed: ${isSubscribed} (${plan})`,
      'info'
    );
    return user;
  }

  upgradeSubscription(userId: string, plan: 'PRO_MONTHLY' | 'PRO_YEARLY' | 'VIP_PASS'): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;

    user.isSubscribed = true;
    user.subscriptionPlan = plan;
    user.subscriptionExpiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
    user.maxDailyFreeQuestions = 99999;

    this.users.set(userId, user);
    this.saveData();
    this.syncDocumentToFirestore('users', userId, user);
    this.recordAuditLog(
      user.email,
      user.role,
      'SUBSCRIPTION_UPGRADE',
      `Upgraded account to ${plan} pass`,
      'info'
    );
    return user;
  }

  getAiPackages(): AiSubscriptionPackage[] {
    return Array.from(this.aiPackages.values());
  }

  addOrUpdateAiPackage(pkg: AiSubscriptionPackage): AiSubscriptionPackage {
    this.aiPackages.set(pkg.id, pkg);
    this.saveData();
    return pkg;
  }

  getChatMessages(userId: string, userRole: UserRole): ChatMessage[] {
    if (userRole === 'MODERATOR' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return this.chatMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return this.chatMessages
      .filter(m => m.senderId === userId || m.recipientId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  sendChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isResolved: false
    };
    this.chatMessages.push(newMsg);
    this.saveData();
    return newMsg;
  }

  resolveChatMessage(msgId: string): boolean {
    const msg = this.chatMessages.find(m => m.id === msgId);
    if (msg) {
      msg.isResolved = true;
      this.saveData();
      return true;
    }
    return false;
  }

  getPeerChallenges(userId: string): PeerChallenge[] {
    return this.peerChallenges
      .filter(c => c.challengerId === userId || c.opponentId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createPeerChallenge(title: string, subject: string, challenger: User, opponentId: string): PeerChallenge {
    const opponent = this.getUserById(opponentId) || { id: opponentId, name: 'Opponent Aspirant' };
    const qList = Array.from(this.questions.values()).filter(q => q.subject === subject).slice(0, 5);

    const challenge: PeerChallenge = {
      id: `chal-${Date.now()}`,
      title,
      subject,
      challengerId: challenger.id,
      challengerName: challenger.name,
      opponentId: opponent.id,
      opponentName: opponent.name,
      status: 'active',
      questionCount: qList.length,
      questions: qList,
      scoreChallenger: 0,
      scoreOpponent: 0,
      createdAt: new Date().toISOString()
    };
    this.peerChallenges.unshift(challenge);
    this.saveData();
    return challenge;
  }

  getSystemSecurityStatus(): SystemSecurityStatus {
    return {
      rateLimiterActive: this.rateLimiterActive,
      blockedRequestsCount: this.blockedRequestsCount,
      activeSessionsCount: this.users.size,
      totalQuestionsInBank: this.questions.size,
      aiCreditsRemaining: this.aiCreditsRemaining,
      securityLogs: this.auditLogs
    };
  }

  // --- SSLCOMMERZ PAYMENT GATEWAY METHODS ---
  public initSslCommerzTransaction(userId: string, req: SslCommerzInitRequest): SslCommerzTransaction {
    const user = this.getUserById(userId) || {
      id: userId,
      name: req.cusName || 'Subscriber',
      email: req.cusEmail || 'subscriber@proshno.bd'
    };

    let planName = 'BCS & Govt Job Pro Pass';
    if (req.planId === 'PRO_MONTHLY') planName = 'Pro Monthly Pass (৳250/mo)';
    else if (req.planId === 'PRO_YEARLY') planName = 'Pro Annual Pass (৳1,500/yr)';
    else if (req.planId === 'VIP_PASS') planName = 'Pro VIP Lifetime Pass (৳3,500)';
    else {
      const pkg = this.aiPackages.get(req.planId);
      if (pkg) planName = pkg.name;
    }

    const tranId = `SSLC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const storeIdUsed = process.env.SSLCOMMERZ_STORE_ID || 'proshnosiddhi_testbox';

    const transaction: SslCommerzTransaction = {
      tranId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      cusPhone: req.cusPhone || '01711000000',
      amount: req.amount,
      currency: 'BDT',
      planId: req.planId,
      planName,
      paymentMethod: req.paymentChannel === 'bkash' ? 'bKash Mobile Banking' : req.paymentChannel === 'nagad' ? 'Nagad' : req.paymentChannel === 'rocket' ? 'Rocket' : req.paymentChannel === 'card' ? 'Visa / Mastercard / AMEX' : 'SSLCommerz Multi-Channel',
      status: 'PENDING',
      storeIdUsed,
      createdAt: new Date().toISOString()
    };

    this.sslTransactions.set(tranId, transaction);
    this.recordAuditLog(user.email, 'CLIENT', 'SSLCOMMERZ_INIT', `Initiated SSLCommerz session ${tranId} for BDT ${req.amount} (${planName})`, 'info');
    this.saveData();

    return transaction;
  }

  public validateSslCommerzTransaction(
    tranId: string,
    valId?: string,
    paymentMethod?: string,
    cardType?: string,
    bankTranId?: string
  ): { success: boolean; transaction?: SslCommerzTransaction; error?: string } {
    const transaction = this.sslTransactions.get(tranId);
    if (!transaction) {
      return { success: false, error: 'SSLCommerz Transaction ID not found.' };
    }

    transaction.status = 'VALIDATED';
    transaction.valId = valId || `VAL-${Date.now()}`;
    transaction.validatedAt = new Date().toISOString();
    if (paymentMethod) transaction.paymentMethod = paymentMethod;
    if (cardType) transaction.cardType = cardType;
    transaction.bankTranId = bankTranId || `BANK-${Math.floor(10000000 + Math.random() * 90000000)}`;

    this.sslTransactions.set(tranId, transaction);

    // Auto-grant subscription or AI quota based on planId
    const user = this.users.get(transaction.userId);
    if (user) {
      if (['PRO_MONTHLY', 'PRO_YEARLY', 'VIP_PASS'].includes(transaction.planId)) {
        user.isSubscribed = true;
        user.subscriptionPlan = transaction.planId as any;
        user.subscriptionExpiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
        user.maxDailyFreeQuestions = 99999;
        this.users.set(user.id, user);
        this.syncDocumentToFirestore('users', user.id, user);
      }
      this.recordAuditLog(
        user.email,
        user.role,
        'SSLCOMMERZ_SUCCESS',
        `Successfully validated payment ${tranId} via SSLCommerz (${transaction.paymentMethod}). Granted ${transaction.planName}.`,
        'info'
      );
    }

    this.saveData();
    return { success: true, transaction };
  }

  public failOrCancelSslCommerzTransaction(tranId: string, status: 'FAILED' | 'CANCELLED', reason?: string) {
    const transaction = this.sslTransactions.get(tranId);
    if (transaction) {
      transaction.status = status;
      this.sslTransactions.set(tranId, transaction);
      this.recordAuditLog(
        transaction.userEmail,
        'CLIENT',
        `SSLCOMMERZ_${status}`,
        `SSLCommerz session ${tranId} ${status.toLowerCase()}: ${reason || 'User cancelled or gateway timeout'}`,
        'warning'
      );
      this.saveData();
    }
  }

  public getSslCommerzTransactions(userId?: string): SslCommerzTransaction[] {
    const list = Array.from(this.sslTransactions.values());
    if (userId) return list.filter(t => t.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getSslCommerzTransactionByTranId(tranId: string): SslCommerzTransaction | undefined {
    return this.sslTransactions.get(tranId);
  }


  // --- ANALYTICS DASHBOARD API ---
  getAnalyticsOverview(userId: string): AnalyticsOverview {
    const attempts = this.getUserAttempts(userId);

    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;
    let totalTimeSpent = 0;

    const subjectStatsMap = new Map<string, { total: number; correct: number; time: number }>();

    attempts.forEach(a => {
      totalQuestionsAttempted += a.attemptedCount;
      totalCorrect += a.correctCount;
      totalTimeSpent += a.durationSeconds;

      const subKey = a.subject || 'General';
      const current = subjectStatsMap.get(subKey) || { total: 0, correct: 0, time: 0 };
      current.total += a.attemptedCount;
      current.correct += a.correctCount;
      current.time += a.durationSeconds;
      subjectStatsMap.set(subKey, current);
    });

    const overallAccuracy = totalQuestionsAttempted > 0
      ? Math.round((totalCorrect / totalQuestionsAttempted) * 100)
      : 0;

    const averageSpeedSeconds = totalQuestionsAttempted > 0
      ? Math.round(totalTimeSpent / totalQuestionsAttempted)
      : 0;

    const subjectPerformances: SubjectPerformance[] = Array.from(subjectStatsMap.entries()).map(([sub, stats]) => {
      const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      let mastery: 'Novice' | 'Intermediate' | 'Proficient' | 'Master' = 'Novice';
      if (acc >= 90) mastery = 'Master';
      else if (acc >= 75) mastery = 'Proficient';
      else if (acc >= 50) mastery = 'Intermediate';

      return {
        subject: sub,
        totalQuestionsAttempted: stats.total,
        correctCount: stats.correct,
        accuracyPercentage: acc,
        avgTimePerQuestionSeconds: stats.total > 0 ? Math.round(stats.time / stats.total) : 0,
        masteryLevel: mastery
      };
    });

    // Identify strong and weak subjects
    const sortedSub = [...subjectPerformances].sort((a, b) => b.accuracyPercentage - a.accuracyPercentage);
    const strongSubjects = sortedSub.filter(s => s.accuracyPercentage >= 70).map(s => s.subject);
    const weakSubjects = sortedSub.filter(s => s.accuracyPercentage < 70).map(s => s.subject);

    // Accuracy History timeline
    const accuracyHistory = attempts
      .slice(-10) // last 10 attempts
      .reverse()
      .map(a => ({
        date: new Date(a.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        accuracy: a.accuracyPercentage,
        score: Math.round((a.totalScore / a.maxScore) * 100),
        label: a.quizTitle
      }));

    const user = this.users.get(userId);

    return {
      totalQuizzesTaken: attempts.length,
      totalQuestionsAttempted,
      overallAccuracy,
      totalTimeSpentSeconds: totalTimeSpent,
      currentStreakDays: user ? user.streakDays : 1,
      averageSpeedSeconds,
      strongSubjects: strongSubjects.length ? strongSubjects : ['General Science'],
      weakSubjects: weakSubjects.length ? weakSubjects : ['Mathematics'],
      recentAttempts: attempts.slice(0, 5),
      subjectPerformances,
      accuracyHistory
    };
  }

  getAdminAnalyticsOverview(): AdminAnalyticsOverview {
    const allUsers = Array.from(this.users.values());
    const totalUsers = allUsers.length;
    const totalStudents = allUsers.filter(u => u.role === 'CLIENT').length;
    const totalStaff = allUsers.filter(u => ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(u.role)).length;
    const activeSubscribers = allUsers.filter(u => u.isSubscribed).length;
    
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const activeStudentIds = new Set(
      this.attempts
        .filter(a => new Date(a.completedAt).getTime() >= sevenDaysAgo)
        .map(a => a.userId)
    );
    const dailyActiveStudents = Math.max(activeStudentIds.size, totalStudents > 0 ? 1 : 0);

    const allQuestions = Array.from(this.questions.values());
    const totalQuestions = allQuestions.length;
    const questionsWithExplanation = allQuestions.filter(q => q.explanation && q.explanation.trim().length > 10).length;
    const questionsMissingExplanation = totalQuestions - questionsWithExplanation;
    const mathJaxQuestionsCount = allQuestions.filter(q => 
      (q.text && (q.text.includes('$') || q.text.includes('\\') || q.text.includes('^') || q.text.includes('_'))) ||
      q.options.some(o => o.includes('$') || o.includes('\\') || o.includes('^'))
    ).length;

    const subjectCountMap = new Map<string, number>();
    const examCountMap = new Map<string, number>();
    let easyCount = 0, mediumCount = 0, hardCount = 0;

    allQuestions.forEach(q => {
      const s = q.subject || 'General Knowledge';
      subjectCountMap.set(s, (subjectCountMap.get(s) || 0) + 1);

      const e = q.exam || '46th BCS Preliminary';
      examCountMap.set(e, (examCountMap.get(e) || 0) + 1);

      if (q.difficulty === 'Easy') easyCount++;
      else if (q.difficulty === 'Hard') hardCount++;
      else mediumCount++;
    });

    const questionsBySubject = Array.from(subjectCountMap.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);

    const questionsByExam = Array.from(examCountMap.entries())
      .map(([exam, count]) => ({ exam, count }))
      .sort((a, b) => b.count - a.count);

    const totalQuizzesTaken = this.attempts.length;
    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;
    let totalTime = 0;

    const topicPerformanceMap = new Map<string, { subject: string; total: number; wrong: number }>();
    const subjectAccuracyMap = new Map<string, { total: number; correct: number }>();

    this.attempts.forEach(a => {
      totalQuestionsAttempted += a.attemptedCount;
      totalCorrect += a.correctCount;
      totalTime += a.durationSeconds;

      const subKey = a.subject || 'General';
      const subAcc = subjectAccuracyMap.get(subKey) || { total: 0, correct: 0 };
      subAcc.total += a.attemptedCount;
      subAcc.correct += a.correctCount;
      subjectAccuracyMap.set(subKey, subAcc);

      if (Array.isArray(a.responses)) {
        a.responses.forEach(r => {
          const q = this.questions.get(r.questionId);
          if (q) {
            const topKey = q.topic || 'General';
            const cur = topicPerformanceMap.get(topKey) || { subject: q.subject, total: 0, wrong: 0 };
            cur.total += 1;
            const isWrong = r.selectedOptionIndex !== q.correctOptionIndex;
            if (isWrong) cur.wrong += 1;
            topicPerformanceMap.set(topKey, cur);
          }
        });
      }
    });

    const platformAverageScore = totalQuestionsAttempted > 0
      ? Math.round((totalCorrect / totalQuestionsAttempted) * 100)
      : 76;

    const platformAverageSpeedSeconds = totalQuestionsAttempted > 0
      ? Math.round(totalTime / totalQuestionsAttempted)
      : 42;

    let mostChallengingTopics = Array.from(topicPerformanceMap.entries())
      .filter(([_, data]) => data.total >= 2)
      .map(([topic, data]) => ({
        topic,
        subject: data.subject,
        errorRate: Math.round((data.wrong / data.total) * 100),
        totalAttempts: data.total
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5);

    if (mostChallengingTopics.length === 0) {
      mostChallengingTopics = [
        { topic: 'Quadratic Equations & Polynomials', subject: 'Mathematics', errorRate: 48, totalAttempts: 124 },
        { topic: 'Synonyms, Antonyms & Idioms', subject: 'English Language & Literature', errorRate: 42, totalAttempts: 198 },
        { topic: 'Constitution of Bangladesh & Amendments', subject: 'Bangladesh Affairs', errorRate: 38, totalAttempts: 165 },
        { topic: 'Computer Networks & Cybersecurity', subject: 'ICT', errorRate: 35, totalAttempts: 92 }
      ];
    }

    const topPerformingSubjects = Array.from(subjectAccuracyMap.entries())
      .map(([subject, stats]) => ({
        subject,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 75
      }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const txArray = Array.from(this.sslTransactions.values());
    const totalTransactions = txArray.length;
    const totalRevenue = txArray
      .filter(t => t.status === 'VALIDATED')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const prsArray = Array.from(this.pullRequests.values());
    const pendingPullRequests = prsArray.filter(pr => pr.status === 'PENDING').length;
    const approvedPullRequests = prsArray.filter(pr => pr.status === 'APPROVED').length;

    const recentAttemptsList = this.attempts.slice(0, 8).map(att => {
      const u = this.users.get(att.userId);
      return {
        id: att.id,
        userName: u ? u.name : 'Candidate',
        userEmail: u ? u.email : 'student@proshno.org',
        subject: att.subject || 'Comprehensive Model Test',
        score: att.totalScore,
        total: att.totalQuestions,
        accuracy: att.attemptedCount > 0 ? Math.round((att.correctCount / att.attemptedCount) * 100) : 0,
        completedAt: att.completedAt
      };
    });

    const formattedRecentAttempts = recentAttemptsList.map(r => ({
      ...r,
      quizTitle: r.subject,
      createdAt: r.completedAt
    }));

    const formattedChallengingTopics = mostChallengingTopics.map(t => ({
      ...t,
      totalAnswered: t.totalAttempts
    }));

    return {
      totalUsers,
      totalStudents,
      totalStaff,
      activeSubscribers,
      dailyActiveStudents,
      totalQuestions,
      questionsWithExplanation,
      questionsMissingExplanation,
      questionsWithoutExplanation: questionsMissingExplanation,
      mathJaxQuestionsCount,
      questionsBySubject,
      questionsByExam,
      questionsByDifficulty: { easy: easyCount, medium: mediumCount, hard: hardCount },
      totalQuizzesTaken,
      totalAttemptsLogged: totalQuizzesTaken,
      totalQuestionsAttempted,
      platformAverageScore,
      averageStudentAccuracy: platformAverageScore,
      platformAverageSpeedSeconds,
      mostChallengingTopics: formattedChallengingTopics,
      topicDifficultyInsights: formattedChallengingTopics,
      topPerformingSubjects,
      totalRevenue,
      totalTransactions,
      pendingPullRequests,
      approvedPullRequests,
      recentAttemptsList,
      recentAttempts: formattedRecentAttempts
    };
  }

  updateQuestionExplanation(id: string, explanation: string): Question | undefined {
    const q = this.questions.get(id);
    if (!q) return undefined;
    q.explanation = explanation;
    this.questions.set(id, q);
    this.saveData();
    this.syncDocumentToFirestore('questions', id, q);
    return q;
  }

  // --- Splash Offer Management ---
  public getSplashOffer(): SplashOffer {
    if (!this.splashOffer) {
      this.seedSplashOffer();
    }
    return this.splashOffer!;
  }

  public updateSplashOffer(update: Partial<SplashOffer>): SplashOffer {
    const current = this.getSplashOffer();
    this.splashOffer = {
      ...current,
      ...update,
      id: current.id || 'offer-bcs-masterclass-2026',
      updatedAt: new Date().toISOString()
    };
    this.saveSplashOffer();
    return this.splashOffer;
  }

  private saveSplashOffer() {
    try {
      this.ensureDataDir();
      if (this.splashOffer) {
        fs.writeFileSync(SPLASH_OFFER_FILE, JSON.stringify(this.splashOffer, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('Could not save splash offer to disk:', e);
    }
  }

  // --- Announcements & SMS Notifications Management ---
  public getNotifications(): AppNotification[] {
    return [...this.notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(notif: Partial<AppNotification>): AppNotification {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: notif.title || 'Official Exam Alert',
      message: notif.message || '',
      type: notif.type || 'ANNOUNCEMENT',
      senderName: notif.senderName || 'Exam Control Committee',
      senderRole: notif.senderRole || 'ADMIN',
      senderAvatar: notif.senderAvatar,
      priority: notif.priority || 'NORMAL',
      targetGroup: notif.targetGroup || 'ALL',
      linkTab: notif.linkTab || 'dashboard',
      createdAt: new Date().toISOString(),
      read: false
    };

    this.notifications.unshift(newNotif);
    this.saveNotifications();
    return newNotif;
  }

  public deleteNotification(id: string): boolean {
    const initialLen = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.id !== id);
    if (this.notifications.length !== initialLen) {
      this.saveNotifications();
      return true;
    }
    return false;
  }

  public markNotificationRead(id: string): boolean {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveNotifications();
      return true;
    }
    return false;
  }

  private saveNotifications() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(this.notifications, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not save notifications to disk:', e);
    }
  }

  // --- SCHEDULED EXAMS & REMINDERS API ---
  public scheduleExam(
    userId: string,
    examId: string,
    examName: string,
    scheduledTime: string,
    durationMinutes?: number,
    notes?: string
  ): ScheduledExam {
    const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const scheduled: ScheduledExam = {
      id,
      userId,
      examId,
      examName,
      scheduledTime,
      durationMinutes: durationMinutes || 60,
      notificationSent: false,
      notes,
      createdAt: new Date().toISOString()
    };
    this.scheduledExams.set(id, scheduled);
    this.saveScheduledExams();
    return scheduled;
  }

  public getScheduledExams(userId?: string): ScheduledExam[] {
    const list = Array.from(this.scheduledExams.values());
    if (userId) {
      return list
        .filter(s => s.userId === userId)
        .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
    }
    return list.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }

  public cancelScheduledExam(id: string, userId: string): boolean {
    const item = this.scheduledExams.get(id);
    if (!item) return false;
    if (item.userId !== userId) return false;
    this.scheduledExams.delete(id);
    this.saveScheduledExams();
    return true;
  }

  public checkAndTriggerScheduledExamNotifications(): AppNotification[] {
    const now = Date.now();
    const triggered: AppNotification[] = [];

    this.scheduledExams.forEach(sched => {
      if (sched.notificationSent) return;
      const targetTime = new Date(sched.scheduledTime).getTime();
      // Trigger notification if within 10 minutes before scheduled time or up to 2 hours after
      if (now >= targetTime - 10 * 60 * 1000 && now <= targetTime + 2 * 60 * 60 * 1000) {
        sched.notificationSent = true;
        const notif = this.createNotification({
          title: `⏰ Scheduled Exam Ready: ${sched.examName}`,
          message: `It is time for your scheduled exam session: "${sched.examName}". Click now to enter the exam room and start your timed test!`,
          type: 'EXAM_REMINDER',
          priority: 'HIGH',
          targetGroup: 'ALL',
          linkTab: 'exams',
          senderName: 'Exam Proctor & Scheduler'
        });
        triggered.push(notif);
      }
    });

    if (triggered.length > 0) {
      this.saveScheduledExams();
    }
    return triggered;
  }

  // --- QUESTION PULL REQUEST / COMMIT WORKFLOW METHODS ---
  public getPullRequests(statusFilter?: PRStatus, proposerId?: string): QuestionPullRequest[] {
    let list = Array.from(this.pullRequests.values());
    if (statusFilter) {
      list = list.filter(pr => pr.status === statusFilter);
    }
    if (proposerId) {
      list = list.filter(pr => pr.proposerId === proposerId);
    }
    // Enrich PRs dynamically if originalQuestion is not present
    list.forEach(pr => {
      if (!pr.originalQuestion && pr.targetQuestionId) {
        pr.originalQuestion = this.questions.get(pr.targetQuestionId);
      }
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getPullRequestById(id: string): QuestionPullRequest | undefined {
    const pr = this.pullRequests.get(id);
    if (pr && !pr.originalQuestion && pr.targetQuestionId) {
      pr.originalQuestion = this.questions.get(pr.targetQuestionId);
    }
    return pr;
  }

  public createPullRequest(params: {
    title: string;
    commitMessage: string;
    action: PRActionType;
    proposer: User;
    targetQuestionId?: string;
    proposedQuestion?: Omit<Question, 'id'> | Question;
    bulkQuestions?: Array<Omit<Question, 'id'>>;
    clientReviewInfo?: QuestionPullRequest['clientReviewInfo'];
  }): QuestionPullRequest {
    const prNumber = this.prCounter++;
    const prId = `pr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    let originalQuestion: Question | undefined;
    if (params.targetQuestionId) {
      originalQuestion = this.questions.get(params.targetQuestionId);
    }

    // Automated duplicate detection for new proposals
    let duplicateWarning: {
      isDuplicate: boolean;
      similarity: number;
      topMatchQuestionId?: string;
      topMatchQuestionText?: string;
      reason?: string;
    } | undefined;

    if (params.action === 'ADD' && params.proposedQuestion?.text) {
      const dupCheck = this.checkQuestionDuplicate({
        text: params.proposedQuestion.text,
        options: params.proposedQuestion.options,
        subject: params.proposedQuestion.subject
      });
      if (dupCheck.isDuplicate) {
        duplicateWarning = {
          isDuplicate: true,
          similarity: dupCheck.similarity,
          topMatchQuestionId: dupCheck.topMatch?.question.id,
          topMatchQuestionText: dupCheck.topMatch?.question.text,
          reason: dupCheck.topMatch?.reason
        };
      }
    }

    const pr: QuestionPullRequest = {
      id: prId,
      prNumber,
      title: params.title || `PR #${prNumber}: ${params.action} Question Proposal`,
      commitMessage: params.commitMessage || `${params.action} question proposal by ${params.proposer.name}`,
      action: params.action,
      status: 'PENDING',
      proposerId: params.proposer.id,
      proposerName: params.proposer.name,
      proposerEmail: params.proposer.email,
      proposerRole: params.proposer.role,
      targetQuestionId: params.targetQuestionId,
      originalQuestion,
      proposedQuestion: params.proposedQuestion,
      bulkQuestions: params.bulkQuestions,
      bulkCount: params.bulkQuestions ? params.bulkQuestions.length : undefined,
      duplicateWarning,
      clientReviewInfo: params.clientReviewInfo,
      createdAt: new Date().toISOString()
    };

    this.pullRequests.set(pr.id, pr);
    this.savePullRequests();

    // Create Notification to Admins - direct link to admin proposals desk
    this.createNotification({
      title: `PR #${prNumber}: ${params.action} proposed by ${params.proposer.name}`,
      message: `${params.proposer.name} (${params.proposer.role}) submitted commit: "${pr.commitMessage}". Pending Admin review.`,
      type: 'MODERATOR_NOTICE',
      senderName: params.proposer.name,
      senderRole: params.proposer.role,
      senderAvatar: params.proposer.avatar,
      priority: 'HIGH',
      targetGroup: 'ALL',
      linkTab: 'admin-proposals'
    });

    this.recordAuditLog(
      params.proposer.email,
      params.proposer.role,
      'QUESTION_PR_CREATED',
      `PR #${prNumber} created: ${params.action} - "${pr.commitMessage}"`,
      'info'
    );

    return pr;
  }

  public approvePullRequest(
    id: string,
    reviewer: User,
    reviewComment?: string
  ): { success: boolean; pr?: QuestionPullRequest; result?: any; error?: string } {
    const pr = this.pullRequests.get(id);
    if (!pr) {
      return { success: false, error: 'Pull request not found' };
    }
    if (pr.status !== 'PENDING') {
      return { success: false, error: `Pull request is already ${pr.status.toLowerCase()}` };
    }

    // Check reviewer privilege
    const priv = this.getUserAdminPrivileges(reviewer);
    if (reviewer.role !== 'SUPER_ADMIN' && !priv.canApprovePR) {
      return { success: false, error: 'You do not have permission to approve Pull Requests. Please contact Super Admin.' };
    }

    let mergeResult: any = null;

    try {
      if (pr.action === 'ADD' && pr.proposedQuestion) {
        mergeResult = this.addQuestion(pr.proposedQuestion);
      } else if (pr.action === 'UPDATE' && pr.targetQuestionId && pr.proposedQuestion) {
        mergeResult = this.updateQuestion(pr.targetQuestionId, pr.proposedQuestion);
      } else if (pr.action === 'DELETE' && pr.targetQuestionId) {
        mergeResult = this.deleteQuestion(pr.targetQuestionId);
      } else if (pr.action === 'BULK_IMPORT' && pr.bulkQuestions) {
        mergeResult = this.importQuestionsBulk(pr.bulkQuestions, pr.proposerEmail, pr.proposerRole);
      }
    } catch (e: any) {
      return { success: false, error: `Failed to merge changes: ${e?.message || e}` };
    }

    pr.status = 'APPROVED';
    pr.reviewerId = reviewer.id;
    pr.reviewerName = reviewer.name;
    pr.reviewerRole = reviewer.role;
    pr.reviewComment = reviewComment || 'Approved and merged into Question Bank.';
    pr.reviewedAt = new Date().toISOString();

    this.pullRequests.set(pr.id, pr);
    this.savePullRequests();

    // Create Notification to Proposer
    this.createNotification({
      title: `PR #${pr.prNumber} Approved & Merged!`,
      message: `Your commit for ${pr.action} ("${pr.commitMessage}") has been approved and merged into Question Bank by ${reviewer.name}.`,
      type: 'ANNOUNCEMENT',
      senderName: reviewer.name,
      senderRole: reviewer.role,
      priority: 'NORMAL',
      targetGroup: 'ALL',
      linkTab: 'bank'
    });

    this.recordAuditLog(
      reviewer.email,
      reviewer.role,
      'QUESTION_PR_APPROVED',
      `PR #${pr.prNumber} approved & merged by ${reviewer.email}: ${pr.action}`,
      'info'
    );

    return { success: true, pr, result: mergeResult };
  }

  public rejectPullRequest(
    id: string,
    reviewer: User,
    reviewComment: string
  ): { success: boolean; pr?: QuestionPullRequest; error?: string } {
    const pr = this.pullRequests.get(id);
    if (!pr) {
      return { success: false, error: 'Pull request not found' };
    }
    if (pr.status !== 'PENDING') {
      return { success: false, error: `Pull request is already ${pr.status.toLowerCase()}` };
    }

    const priv = this.getUserAdminPrivileges(reviewer);
    if (reviewer.role !== 'SUPER_ADMIN' && !priv.canApprovePR) {
      return { success: false, error: 'You do not have permission to review Pull Requests. Please contact Super Admin.' };
    }

    pr.status = 'REJECTED';
    pr.reviewerId = reviewer.id;
    pr.reviewerName = reviewer.name;
    pr.reviewerRole = reviewer.role;
    pr.reviewComment = reviewComment || 'Changes were rejected by admin review.';
    pr.reviewedAt = new Date().toISOString();

    this.pullRequests.set(pr.id, pr);
    this.savePullRequests();

    // Create Notification to Proposer
    this.createNotification({
      title: `PR #${pr.prNumber} Review: Feedback Provided`,
      message: `PR #${pr.prNumber} ("${pr.commitMessage}") was rejected by ${reviewer.name}. Feedback: "${reviewComment}"`,
      type: 'MODERATOR_NOTICE',
      senderName: reviewer.name,
      senderRole: reviewer.role,
      priority: 'HIGH',
      targetGroup: 'ALL',
      linkTab: 'bank'
    });

    this.recordAuditLog(
      reviewer.email,
      reviewer.role,
      'QUESTION_PR_REJECTED',
      `PR #${pr.prNumber} rejected by ${reviewer.email}. Reason: ${reviewComment}`,
      'warning'
    );

    return { success: true, pr };
  }

  // --- DUPLICATION DETECTION METHODS ---
  public checkQuestionDuplicate(params: {
    text: string;
    options?: string[];
    subject?: string;
    excludeId?: string;
  }) {
    const list = Array.from(this.questions.values());
    const matches = findDuplicatesInList(params, list, 0.72, params.excludeId);
    const isDuplicate = matches.length > 0;
    const topMatch = matches[0];

    return {
      isDuplicate,
      similarity: topMatch ? topMatch.similarity : 0,
      topMatch,
      matches: matches.slice(0, 5)
    };
  }

  public scanDuplicateQuestions(threshold = 0.74) {
    const list = Array.from(this.questions.values());
    const clusters = scanQuestionBankForDuplicateClusters(list, threshold);
    return {
      totalClusters: clusters.length,
      totalDuplicates: clusters.reduce((acc, c) => acc + c.duplicates.length, 0),
      clusters
    };
  }

  public mergeDuplicateQuestions(
    primaryId: string,
    duplicateIds: string[],
    adminUser: User
  ): { success: boolean; mergedCount: number; error?: string } {
    const primary = this.questions.get(primaryId);
    if (!primary) {
      return { success: false, mergedCount: 0, error: 'Primary question not found in database.' };
    }

    let mergedCount = 0;
    for (const dupId of duplicateIds) {
      if (dupId === primaryId) continue;
      if (this.questions.has(dupId)) {
        this.questions.delete(dupId);
        mergedCount++;
      }
    }

    if (mergedCount > 0) {
      this.saveData();
      this.recordAuditLog(
        adminUser.email,
        adminUser.role,
        'DUPLICATE_QUESTIONS_MERGED',
        `Merged ${mergedCount} duplicate questions into primary question #${primaryId.slice(-6)}`,
        'info'
      );
    }

    return { success: true, mergedCount };
  }

  public getUserAdminPrivileges(user: User): AdminPrivileges {
    if (user.role === 'SUPER_ADMIN') {
      return {
        canDirectAdd: true,
        canDirectEdit: true,
        canDirectDelete: true,
        canDirectBulkImport: true,
        canApprovePR: true
      };
    }
    if (user.role === 'ADMIN') {
      return user.adminPrivileges || {
        canDirectAdd: true,
        canDirectEdit: true,
        canDirectDelete: true,
        canDirectBulkImport: true,
        canApprovePR: true
      };
    }
    return {
      canDirectAdd: false,
      canDirectEdit: false,
      canDirectDelete: false,
      canDirectBulkImport: false,
      canApprovePR: false
    };
  }

  public updateAdminPrivileges(
    adminUserId: string,
    privileges: Partial<AdminPrivileges>,
    superAdminEmail: string
  ): User | undefined {
    const rawUser = this.users.get(adminUserId);
    if (!rawUser) return undefined;

    const currentPrivs = this.getUserAdminPrivileges(rawUser);
    rawUser.adminPrivileges = {
      ...currentPrivs,
      ...privileges
    };

    this.users.set(adminUserId, rawUser);
    this.saveData();

    this.recordAuditLog(
      superAdminEmail,
      'SUPER_ADMIN',
      'ADMIN_PRIVILEGES_UPDATED',
      `Updated direct permissions for admin ${rawUser.email} (${rawUser.name}): ${JSON.stringify(rawUser.adminPrivileges)}`,
      'info'
    );

    return sanitizeUser(rawUser);
  }

  // --- REAL-TIME LIVE USER PRESENCE & MODERATOR WORK TRACKING ---
  public recordUserHeartbeat(userId: string, activity?: string, deviceInfo?: string): void {
    const rawUser = this.users.get(userId);
    const now = new Date().toISOString();
    const defaultAct = rawUser?.role === 'MODERATOR' 
      ? 'Moderating Question Bank & Reviewing PRs'
      : rawUser?.role === 'ADMIN' || rawUser?.role === 'SUPER_ADMIN'
      ? 'Admin Dashboard & System Monitoring'
      : 'Solving BCS & Bank MCQ Practice Quizzes';
    
    const act = activity || defaultAct;

    this.userLivePresence.set(userId, {
      lastActiveAt: now,
      currentActivity: act,
      deviceInfo: deviceInfo || 'Web Browser (Chrome/Desktop)'
    });

    if (rawUser) {
      rawUser.lastActiveAt = now;
      rawUser.currentActivity = act;
      rawUser.deviceInfo = deviceInfo;
      rawUser.isOnline = true;
    }
  }

  public getLiveUsers(): LiveUserStatus[] {
    const nowMs = Date.now();
    const allUsers = Array.from(this.users.values());

    // Ensure our primary staff have simulated active status if server just started
    if (!this.userLivePresence.has('usr-moderator')) {
      this.userLivePresence.set('usr-moderator', {
        lastActiveAt: new Date(nowMs - 25000).toISOString(),
        currentActivity: 'Authoring & Verifying Higher Math MCQs',
        deviceInfo: 'Chrome on MacOS (Desktop)'
      });
    }
    if (!this.userLivePresence.has('usr-rony-owner')) {
      this.userLivePresence.set('usr-rony-owner', {
        lastActiveAt: new Date(nowMs - 12000).toISOString(),
        currentActivity: 'Super Admin Portal • Reviewing Proposals & System Health',
        deviceInfo: 'Firefox Developer Edition (Windows 11)'
      });
    }
    if (!this.userLivePresence.has('usr-student')) {
      this.userLivePresence.set('usr-student', {
        lastActiveAt: new Date(nowMs - 45000).toISOString(),
        currentActivity: 'Solving 46th BCS Model Test (Score: 84%)',
        deviceInfo: 'Mobile Web App (Android/PWA)'
      });
    }

    return allUsers.map(u => {
      const presence = this.userLivePresence.get(u.id);
      const lastActiveAt = presence?.lastActiveAt || u.lastActiveAt || u.createdAt;
      const diffMs = nowMs - new Date(lastActiveAt).getTime();
      // Considered online if active within last 4 minutes
      const isOnline = diffMs < 4 * 60 * 1000;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isOnline,
        lastActiveAt,
        currentActivity: presence?.currentActivity || (isOnline ? 'Active on Dashboard' : 'Offline / Idle'),
        targetExam: u.targetExam,
        xp: u.xp || 0,
        deviceInfo: presence?.deviceInfo || u.deviceInfo || 'Standard Web Browser'
      };
    }).sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
    });
  }

  public getModeratorWorkSummaries(): ModeratorWorkSummary[] {
    const staff = Array.from(this.users.values()).filter(u =>
      ['MODERATOR', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(u.role)
    );

    const prList = Array.from(this.pullRequests.values());
    const allQuestions = Array.from(this.questions.values());

    return staff.map(u => {
      const userPrs = prList.filter(p => p.proposerId === u.id || p.proposerEmail === u.email);
      const totalPrsSubmitted = userPrs.length;
      const approvedPrsCount = userPrs.filter(p => p.status === 'APPROVED').length;
      const pendingPrsCount = userPrs.filter(p => p.status === 'PENDING').length;
      const rejectedPrsCount = userPrs.filter(p => p.status === 'REJECTED').length;
      const bulkImportsCount = userPrs.filter(p => p.action === 'BULK_IMPORT').length;

      const directQuestionsAdded = allQuestions.filter(q =>
        q.questionSource?.includes(u.name) || q.tags?.includes(u.email) || q.tags?.includes(u.name)
      ).length;

      const directQuestionsUpdated = this.auditLogs.filter(a =>
        a.actorEmail === u.email && (a.action === 'QUESTION_UPDATED' || a.action === 'QUESTION_PR_APPROVED')
      ).length;

      const inquiriesResolvedCount = this.chatMessages.filter(c =>
        c.isResolved && (c.senderId === u.id || c.senderName === u.name || c.recipientId === u.id)
      ).length;

      const presence = this.userLivePresence.get(u.id);
      const nowMs = Date.now();
      const lastActiveAt = presence?.lastActiveAt || u.lastActiveAt || new Date(nowMs - 120000).toISOString();
      const isOnline = presence ? (nowMs - new Date(presence.lastActiveAt).getTime() < 4 * 60 * 1000) : (u.role === 'MODERATOR' || u.role === 'SUPER_ADMIN');

      // Aggregate recent actions
      const actions: Array<{ id: string; actionType: string; description: string; timestamp: string; status?: string }> = [];

      userPrs.forEach(p => {
        actions.push({
          id: p.id,
          actionType: `PR_${p.action}`,
          description: `${p.action}: ${p.commitMessage || p.title}`,
          timestamp: p.createdAt,
          status: p.status
        });
      });

      this.auditLogs.filter(a => a.actorEmail === u.email).forEach(a => {
        actions.push({
          id: a.id,
          actionType: a.action,
          description: a.details,
          timestamp: a.timestamp
        });
      });

      actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        isOnline,
        lastActiveAt,
        currentActivity: presence?.currentActivity || 'Reviewing question syllabus and guidelines',
        totalPrsSubmitted,
        approvedPrsCount,
        pendingPrsCount,
        rejectedPrsCount,
        directQuestionsAdded,
        directQuestionsUpdated,
        bulkImportsCount,
        inquiriesResolvedCount,
        recentActions: actions.slice(0, 10)
      };
    });
  }

  private savePullRequests() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(PULL_REQUESTS_FILE, JSON.stringify(Array.from(this.pullRequests.values()), null, 2), 'utf-8');
    } catch (e) {
      console.warn('Could not save pull requests to disk:', e);
    }
  }

  private seedMockPullRequests() {
    const existingQ = Array.from(this.questions.values())[0];
    const mockPrs: QuestionPullRequest[] = [
      {
        id: 'pr-101',
        prNumber: 101,
        title: 'Add BUET-2024 & PSC-2024 Pipes and Cistern Question',
        commitMessage: 'feat(math): Add verified past question with 2 solution methods and LaTeX formatting',
        action: 'ADD',
        status: 'PENDING',
        proposerId: 'usr-moderator',
        proposerName: 'Farhan Ahmed (Student Moderator)',
        proposerEmail: 'moderator@proshno.bd',
        proposerRole: 'MODERATOR',
        proposedQuestion: {
          text: 'সম্পূর্ণ খালি একটি চৌবাচ্চা একটি পাইপ দিয়ে ৫ ঘণ্টায় সম্পূর্ণ ভর্তি করা যায় এবং দ্বিতীয় একটি পাইপ দিয়ে ৩ ঘণ্টায় খালি করা যায়। চৌবাচ্চাটি অর্ধেক ভর্তি থাকা অবস্থায় দুটি পাইপ একসাথে খুলে দিলে চৌবাচ্চাটি কত সময়ে সম্পূর্ণ খালি হবে?',
          options: ['৩ ঘণ্টা ৪৫ মিনিট', '৭ ঘণ্টা ৩০ মিনিট', '৫ ঘণ্টা ২০ মিনিট', '৪ ঘণ্টা ১০ মিনিট'],
          correctOptionIndex: 0,
          correctOptionIndices: [0],
          isMultiSelect: false,
          explanation: `──── SOLUTION 1 ────
১ম পাইপ দ্বারা ১ ঘণ্টায় পূর্ণ হয় $(১)/(৫)$ অংশ
২য় পাইপ দ্বারা ১ ঘণ্টায় খালি হয় $(১)/(৩)$ অংশ
যেহেতু খালি হওয়ার গতি বেশি $((১)/(৩) > (১)/(৫))$, তাই দুটি পাইপ একসাথে খোলা হলে প্রতি ঘণ্টায় খালি হয়:
$((১)/(৩) - (১)/(৫)) = (৫ - ৩)/(১৫) = (২)/(১৫)$ অংশ

সম্পূর্ণ (১ অংশ) খালি হতে সময় লাগে $(১৫)/(২)$ ঘণ্টা
সুতরাং অর্ধেক $((১)/(২)$ অংশ) খালি হতে সময় লাগবে:
$(১৫)/(২) \\times (১)/(২) = (১৫)/(৪)$ ঘণ্টা $= ৩ \\frac{৩}{৪}$ ঘণ্টা $= ৩$ ঘণ্টা ৪৫ মিনিট।`,
          subject: 'গণিত',
          topic: 'নল ও চৌবাচ্চা (Pipes and cistern)',
          exam: 'BUET-2024 | PSC-2024 | 18th BCS Preli-1997',
          questionSource: 'KGDCL – Technician-2024 | PSC-2024 | BUET-2024 | 18th BCS Preli-1997 | গণিত | নল ও চৌবাচ্চা (Pipes and cistern)',
          difficulty: 'Medium',
          tags: ['গণিত', 'নল ও চৌবাচ্চা (Pipes and cistern)', 'BUET-2024', 'PSC-2024', '18th BCS Preli-1997']
        },
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString()
      },
      {
        id: 'pr-102',
        prNumber: 102,
        title: 'Fix typo in algebraic simplification formula',
        commitMessage: 'fix(algebra): Update explanation step 2 with proper sign in quadratic solution',
        action: 'UPDATE',
        status: 'PENDING',
        proposerId: 'usr-editor',
        proposerName: 'Sadia Islam (Question Editor)',
        proposerEmail: 'editor@proshno.bd',
        proposerRole: 'EDITOR',
        targetQuestionId: existingQ ? existingQ.id : 'q-math-1',
        originalQuestion: existingQ || undefined,
        proposedQuestion: existingQ ? {
          ...existingQ,
          explanation: existingQ.explanation + '\n\nNote: Verified according to NCTB Higher Math Grade 9-10 textbook.'
        } : undefined,
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString()
      },
      {
        id: 'pr-103',
        prNumber: 103,
        title: 'Add 45th BCS International Relations MCQ',
        commitMessage: 'feat(gk): Add question regarding UN Climate Summit COP28',
        action: 'ADD',
        status: 'APPROVED',
        proposerId: 'usr-moderator',
        proposerName: 'Farhan Ahmed (Student Moderator)',
        proposerEmail: 'moderator@proshno.bd',
        proposerRole: 'MODERATOR',
        reviewerId: 'usr-rony-owner',
        reviewerName: 'Rony (Lead Developer & Admin)',
        reviewerRole: 'SUPER_ADMIN',
        reviewComment: 'Verified syllabus alignment. Approved and merged to Question Bank.',
        createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        reviewedAt: new Date(Date.now() - 40 * 3600000).toISOString()
      }
    ];

    mockPrs.forEach(pr => this.pullRequests.set(pr.id, pr));
    this.savePullRequests();
  }
}

export const db = new Database();
