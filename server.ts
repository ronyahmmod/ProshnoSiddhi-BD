import express from 'express';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { db } from './src/server/db';
import { Question, QuizConfig, QuizMode, Difficulty, User } from './src/types';
import {
  createSessionToken,
  validateSessionToken,
  invalidateSessionToken,
  checkBruteForceLockout,
  recordFailedLogin,
  clearFailedLogin
} from './src/server/security';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // Global Rate Limiting Middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      const clientIp = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1';
      const check = db.checkRateLimit(clientIp);
      if (!check.allowed) {
        return res.status(429).json({ success: false, error: check.reason });
      }
    }
    next();
  });

  // Helper middleware for role authorization & token extraction
  const requireRole = (allowedRoles: string[]) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // 1. Try Bearer token
      const authHeader = req.headers['authorization'];
      let authUserId: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        const tokenData = validateSessionToken(token);
        if (tokenData.valid) {
          authUserId = tokenData.userId;
        }
      }

      // 2. Fallback to custom x-auth-token or x-user-id
      if (!authUserId) {
        const tokenHeader = req.headers['x-auth-token'] as string;
        if (tokenHeader) {
          const tokenData = validateSessionToken(tokenHeader);
          if (tokenData.valid) authUserId = tokenData.userId;
        }
      }

      if (!authUserId) {
        authUserId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
      }

      const user = db.getUserById(authUserId);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized user context.' });
      }
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Requires role [${allowedRoles.join(', ')}]. Your role is ${user.role}.`
        });
      }
      (req as any).currentUser = user;
      next();
    };
  };

  const getRequestUser = (req: express.Request): User => {
    let authUserId: string | undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const tokenData = validateSessionToken(authHeader.slice(7).trim());
      if (tokenData.valid) authUserId = tokenData.userId;
    }

    if (!authUserId) {
      const tokenHeader = req.headers['x-auth-token'] as string;
      if (tokenHeader) {
        const tokenData = validateSessionToken(tokenHeader);
        if (tokenData.valid) authUserId = tokenData.userId;
      }
    }

    if (!authUserId) {
      authUserId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    }

    return db.getUserById(authUserId) || db.getUserById('usr-demo-1')!;
  };

  const getSessionUser = (req: express.Request): User => getRequestUser(req);

  // --- AUTH ROUTES ---
  app.get('/api/auth/me', (req, res) => {
    let authUserId: string | undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const tokenData = validateSessionToken(authHeader.slice(7).trim());
      if (tokenData.valid) authUserId = tokenData.userId;
    }

    if (!authUserId) {
      const tokenHeader = req.headers['x-auth-token'] as string;
      if (tokenHeader) {
        const tokenData = validateSessionToken(tokenHeader);
        if (tokenData.valid) authUserId = tokenData.userId;
      }
    }

    if (!authUserId) {
      authUserId = (req.headers['x-user-id'] as string) || '';
    }

    let user = authUserId ? db.getUserById(authUserId) : null;
    if (!user && (req.headers['x-user-id'] as string) === 'usr-demo-1') {
      user = db.getUserById('usr-demo-1') || null;
    }

    res.json({ success: true, user });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password, name, targetExam, authProvider } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, error: 'Password is required to sign in.' });
    }

    // Check brute force protection
    const lockout = checkBruteForceLockout(email);
    if (lockout.locked) {
      return res.status(429).json({
        success: false,
        error: `Security Lockout: Too many failed login attempts. Please wait ${lockout.remainingSeconds} seconds before trying again.`
      });
    }

    // Role Enforcement: Check if this account belongs to an Administrator / Staff member
    const existingRawUser = db.getRawUserByEmail(email.trim());
    if (existingRawUser && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(existingRawUser.role)) {
      return res.status(403).json({
        success: false,
        isAdminAccount: true,
        error: 'Admin cannot access through the user panel. Please use the Staff & Admin Portal to log in.'
      });
    }

    const authResult = db.authenticateUser(email, password);
    if (!authResult.success) {
      const failRecord = recordFailedLogin(email);
      if (failRecord.locked) {
        return res.status(429).json({
          success: false,
          error: `Security Alert: Account locked due to 5 consecutive failed attempts. Locked for ${failRecord.remainingSeconds} seconds.`
        });
      }
      return res.status(401).json({
        success: false,
        error: `${authResult.error} (${failRecord.remainingAttempts} attempts remaining before temporary lockout).`
      });
    }

    // Role Enforcement: Student/Client login only allows students/clients
    if (['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(authResult.user!.role)) {
      return res.status(403).json({
        success: false,
        isAdminAccount: true,
        error: 'Admin accounts cannot access through the student/user panel. Please use the Staff & Admin Portal to log in.'
      });
    }

    clearFailedLogin(email);
    const token = createSessionToken(authResult.user!);
    return res.json({ success: true, user: authResult.user, token });
  });

  app.post('/api/auth/staff-login', (req, res) => {
    const { email, pinOrPassword, password, role } = req.body;
    const providedPass = password || pinOrPassword;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Staff Email is required.' });
    }

    if (!providedPass || !providedPass.trim()) {
      return res.status(400).json({ success: false, error: 'Staff password is required for security verification.' });
    }

    // Check brute force
    const lockout = checkBruteForceLockout(email);
    if (lockout.locked) {
      return res.status(429).json({
        success: false,
        error: `Administrative Security Lockout: Rate limit exceeded. Locked for ${lockout.remainingSeconds}s.`
      });
    }

    const rawUser = db.getRawUserByEmail(email);
    if (!rawUser) {
      recordFailedLogin(email);
      return res.status(401).json({ success: false, error: 'Invalid Staff credentials. Account not recognized.' });
    }

    if (!['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'].includes(rawUser.role)) {
      return res.status(403).json({ success: false, error: 'Access Denied: This account does not possess Administrative privileges.' });
    }

    // Verify Password strictly with PBKDF2 hash
    const authResult = db.authenticateUser(email, providedPass);
    if (!authResult.success) {
      const failRecord = recordFailedLogin(email);
      return res.status(401).json({
        success: false,
        error: `Staff authentication failed: Invalid password. (${failRecord.remainingAttempts} attempts remaining)`
      });
    }

    // Optional role verification if specified
    if (role && rawUser.role !== role && rawUser.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: `Account role mismatch: expected ${role}, user is ${rawUser.role}` });
    }

    clearFailedLogin(email);
    const safeUser = db.getUserById(rawUser.id)!;
    const token = createSessionToken(safeUser);
    res.json({ success: true, user: safeUser, token });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, targetExam } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Full Name and Email are required.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long for system security.' });
    }

    const regResult = db.registerUserWithPassword(name, email, password, targetExam, 'CLIENT');
    if (!regResult.success) {
      return res.status(400).json({ success: false, error: regResult.error });
    }

    const token = createSessionToken(regResult.user!);
    res.json({ success: true, user: regResult.user, token });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      invalidateSessionToken(authHeader.slice(7).trim());
    }
    const tokenHeader = req.headers['x-auth-token'] as string;
    if (tokenHeader) {
      invalidateSessionToken(tokenHeader);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email and new password are required' });
    }
    const result = db.resetPasswordByEmail(email, newPassword);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    const token = createSessionToken(result.user!);
    res.json({ success: true, message: 'Password has been successfully updated.', user: result.user, token });
  });

  app.post('/api/auth/change-password', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || (req as any).currentUser?.id;
    const { currentPassword, newPassword } = req.body;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }
    const result = db.changeUserPassword(userId, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, message: 'Password changed successfully.' });
  });

  // --- ADMIN & ROLE MANAGEMENT ROUTES ---
  app.get('/api/admin/users', requireRole(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), (req, res) => {
    const users = db.getAllUsers();
    res.json({ success: true, count: users.length, users });
  });

  app.put('/api/admin/users/:userId/role', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const { role, isSubscribed, subscriptionPlan, targetExam } = req.body;
    const adminUser = (req as any).currentUser;
    const targetExisting = db.getUserById(req.params.userId);

    if (targetExisting?.role === 'SUPER_ADMIN' && adminUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: 'Only Super Admins can modify Super Admin accounts.' });
    }

    const updated = db.updateUserRoleAndSubscription(
      req.params.userId,
      role,
      isSubscribed,
      subscriptionPlan || 'FREE',
      adminUser?.email || 'admin',
      targetExam
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: updated });
  });

  app.put('/api/admin/users/:userId/privileges', requireRole(['SUPER_ADMIN']), (req, res) => {
    const { privileges } = req.body;
    const adminUser = (req as any).currentUser;
    if (!privileges || typeof privileges !== 'object') {
      return res.status(400).json({ success: false, error: 'Privileges object is required.' });
    }

    const targetUser = db.getUserById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updated = db.updateAdminPrivileges(req.params.userId, privileges, adminUser.email);
    if (!updated) {
      return res.status(400).json({ success: false, error: 'Failed to update admin privileges' });
    }

    res.json({
      success: true,
      message: `Admin privileges updated for ${updated.name}`,
      user: updated
    });
  });

  app.post('/api/admin/users/create', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const { name, email, role, targetExam, isSubscribed, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and Email are required' });
    }
    const newUser = db.createUser(name, email, targetExam, role || 'CLIENT', 'email', password);
    if (isSubscribed) {
      db.updateUserRoleAndSubscription(newUser.id, role || 'CLIENT', true, 'VIP_PASS', 'admin');
    }
    res.json({ success: true, user: db.getUserById(newUser.id) });
  });

  // Real-time user presence heartbeat
  app.post('/api/users/heartbeat', (req, res) => {
    const user = getRequestUser(req) || (req.body?.userId ? db.getUserById(req.body.userId) : null);
    if (user) {
      db.recordUserHeartbeat(user.id, req.body?.activity, req.body?.deviceInfo);
    }
    res.json({ success: true, timestamp: new Date().toISOString() });
  });

  // Live active users feed (Accessible to Super Admin, Admin, and Moderator)
  app.get('/api/admin/live-users', requireRole(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), (req, res) => {
    const liveUsers = db.getLiveUsers();
    res.json({
      success: true,
      count: liveUsers.length,
      onlineCount: liveUsers.filter(u => u.isOnline).length,
      users: liveUsers
    });
  });

  // Moderator work dossier (Accessible to Super Admin, Admin, and Moderator)
  app.get('/api/admin/moderators/work-summary', requireRole(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), (req, res) => {
    const summaries = db.getModeratorWorkSummaries();
    res.json({
      success: true,
      count: summaries.length,
      moderators: summaries
    });
  });

  app.post('/api/admin/users/:userId/reset-password', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const caller = getSessionUser(req);
    const targetUserId = req.params.userId;
    const targetUser = db.getUserById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // INDUSTRY-STANDARD ROLE HIERARCHY SECURITY:
    // 1. Only a SUPER_ADMIN can change/reset a SUPER_ADMIN password.
    // 2. An ADMIN cannot reset another ADMIN's password (only self or SUPER_ADMIN can).
    // 3. Lower tiers cannot modify higher tiers.
    if (targetUser.role === 'SUPER_ADMIN' && (!caller || caller.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({
        success: false,
        error: 'Permission Denied: Industry standard RBAC prohibits non-Super-Admin accounts from resetting a Super Administrator password.'
      });
    }

    if (targetUser.role === 'ADMIN' && caller && caller.role === 'ADMIN' && caller.id !== targetUser.id) {
      return res.status(403).json({
        success: false,
        error: 'Permission Denied: Administrators cannot reset credentials of other Administrators without Super Admin authorization.'
      });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }
    const result = db.resetUserPassword(targetUserId, newPassword);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, message: 'User password reset successfully' });
  });

  app.post('/api/admin/users/:userId/reset-quota', requireRole(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), (req, res) => {
    const updated = db.resetUserQuota(req.params.userId);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: updated });
  });

  app.delete('/api/admin/users/:userId', requireRole(['SUPER_ADMIN']), (req, res) => {
    const deleted = db.deleteUser(req.params.userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'User not found or deletion failed' });
    }
    res.json({ success: true });
  });

  app.get('/api/admin/security', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const status = db.getSystemSecurityStatus();
    res.json({ success: true, status });
  });

  // --- GITHUB INSTANT DIRECT SYNC ENDPOINTS ---
  app.get('/api/admin/github/status', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    try {
      let branch = 'main';
      try { branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim(); } catch (e) {}
      
      let remoteUrl = '';
      try { remoteUrl = execSync('git remote get-url origin').toString().trim(); } catch (e) {}

      let lastCommit = '';
      try { lastCommit = execSync('git log -1 --pretty=format:"%h - %s (%cr)"').toString().trim(); } catch (e) {}

      let statusSummary = '';
      try { statusSummary = execSync('git status -s').toString().trim(); } catch (e) {}

      res.json({
        success: true,
        branch,
        remoteUrl,
        lastCommit,
        hasUncommittedChanges: statusSummary.length > 0,
        uncommittedFilesCount: statusSummary ? statusSummary.split('\n').length : 0
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to get git status' });
    }
  });

  app.post('/api/admin/github/configure', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const { repoUrl, personalAccessToken } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ success: false, error: 'GitHub Repository URL is required' });
    }

    try {
      let targetUrl = repoUrl.trim();
      if (personalAccessToken) {
        if (targetUrl.startsWith('https://github.com/')) {
          targetUrl = targetUrl.replace('https://github.com/', `https://${personalAccessToken.trim()}@github.com/`);
        } else if (targetUrl.startsWith('github.com/')) {
          targetUrl = `https://${personalAccessToken.trim()}@${targetUrl}`;
        }
      }

      if (!targetUrl.endsWith('.git')) {
        targetUrl += '.git';
      }

      try {
        execSync('git remote remove origin');
      } catch (e) {}

      execSync(`git remote add origin ${targetUrl}`);
      execSync('git branch -M main');

      res.json({ success: true, message: 'GitHub remote origin successfully configured!' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to configure git remote' });
    }
  });

  app.post('/api/admin/github/push', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const { commitMessage } = req.body;
    const message = commitMessage || `Update ProshnoSiddhi app - ${new Date().toLocaleString()}`;

    try {
      execSync('git config user.name "AI Studio Assistant"');
      execSync('git config user.email "rony.jib@gmail.com"');
      execSync('git add .');

      let hasChanges = false;
      try {
        const status = execSync('git status -s').toString().trim();
        hasChanges = status.length > 0;
      } catch (e) {}

      if (hasChanges) {
        execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`);
      }

      const pushResult = execSync('git push -u origin main').toString();
      res.json({ success: true, message: 'Successfully pushed all code to GitHub repository!', output: pushResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Git push failed. Ensure remote URL and Personal Access Token are valid.' });
    }
  });

  app.get('/api/admin/ai-packages', (req, res) => {
    const packages = db.getAiPackages();
    res.json({ success: true, packages });
  });

  app.post('/api/admin/ai-packages', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const pkg = req.body;
    if (!pkg.name || !pkg.priceBdt || !pkg.questionsQuota) {
      return res.status(400).json({ success: false, error: 'Package fields missing' });
    }
    const saved = db.addOrUpdateAiPackage({
      ...pkg,
      id: pkg.id || `pkg-${Date.now()}`
    });
    res.json({ success: true, package: saved });
  });

  // --- CLIENT SUBSCRIPTION UPGRADE ROUTE ---
  app.post('/api/subscription/upgrade', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const { plan } = req.body;
    const updated = db.upgradeSubscription(userId, plan || 'PRO_YEARLY');
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: updated });
  });

  // --- SSLCOMMERZ PAYMENT GATEWAY ROUTES ---
  app.post('/api/payment/sslcommerz/init', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const { planId, amount, cusName, cusEmail, cusPhone, paymentChannel } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid payment amount is required.' });
    }

    const transaction = db.initSslCommerzTransaction(userId, {
      planId: planId || 'PRO_YEARLY',
      amount: Number(amount),
      cusName: cusName || 'Aspirant Student',
      cusEmail: cusEmail || 'student@proshno.bd',
      cusPhone: cusPhone || '01711000000',
      paymentChannel: paymentChannel || 'any'
    });

    const storeId = process.env.SSLCOMMERZ_STORE_ID || 'proshnosiddhi_testbox';
    const isLive = process.env.SSLCOMMERZ_IS_LIVE === 'true';

    res.json({
      success: true,
      transaction,
      gatewayUrl: `/sslcommerz-gateway?tran_id=${transaction.tranId}`,
      meta: {
        storeId,
        environment: isLive ? 'PRODUCTION' : 'SANDBOX_SIMULATOR',
        merchantName: 'ProshnoSiddhi BD SSLCommerz Merchant Portal'
      }
    });
  });

  app.post('/api/payment/sslcommerz/success', (req, res) => {
    const { tran_id, val_id, card_type, bank_tran_id, payment_method } = req.body;

    if (!tran_id) {
      return res.status(400).json({ success: false, error: 'tran_id is required' });
    }

    const result = db.validateSslCommerzTransaction(
      tran_id,
      val_id || `VAL-${Date.now()}`,
      payment_method || 'bKash Mobile Banking',
      card_type || 'bKash / Mobile Wallet',
      bank_tran_id || `BANK-${Math.floor(10000000 + Math.random() * 90000000)}`
    );

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      message: 'SSLCommerz Payment Validated & Account Upgraded Successfully!',
      transaction: result.transaction
    });
  });

  app.post('/api/payment/sslcommerz/fail', (req, res) => {
    const { tran_id, reason } = req.body;
    if (tran_id) {
      db.failOrCancelSslCommerzTransaction(tran_id, 'FAILED', reason || 'Transaction declined by bank/gateway');
    }
    res.json({ success: true, message: 'Transaction marked as failed.' });
  });

  app.post('/api/payment/sslcommerz/cancel', (req, res) => {
    const { tran_id } = req.body;
    if (tran_id) {
      db.failOrCancelSslCommerzTransaction(tran_id, 'CANCELLED', 'Cancelled by customer');
    }
    res.json({ success: true, message: 'Transaction cancelled.' });
  });

  app.get('/api/payment/sslcommerz/transactions', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const user = db.getUserById(userId);
    const isStaff = user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

    // Staff sees all SSLCommerz transactions, normal users see their own
    const transactions = db.getSslCommerzTransactions(isStaff ? undefined : userId);
    res.json({ success: true, transactions });
  });


  // --- CHAT WITH MODERATORS ROUTES ---
  app.get('/api/chat', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const user = db.getUserById(userId) || { role: 'CLIENT' };
    const messages = db.getChatMessages(userId, user.role);
    res.json({ success: true, messages });
  });

  app.post('/api/chat', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const user = db.getUserById(userId);
    if (!user) return res.status(401).json({ success: false, error: 'User required' });

    const { text, questionId, recipientId } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'Text required' });

    const msg = db.sendChatMessage({
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      recipientId: recipientId || 'usr-moderator',
      text,
      questionId
    });

    res.json({ success: true, message: msg });
  });

  app.put('/api/chat/:msgId/resolve', requireRole(['SUPER_ADMIN', 'ADMIN', 'MODERATOR']), (req, res) => {
    const resolved = db.resolveChatMessage(req.params.msgId);
    res.json({ success: true, resolved });
  });

  // --- PEER CHALLENGE ROUTES ---
  app.get('/api/challenges', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const challenges = db.getPeerChallenges(userId);
    res.json({ success: true, challenges });
  });

  app.post('/api/challenges', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const user = db.getUserById(userId);
    if (!user) return res.status(401).json({ success: false, error: 'User required' });

    const { title, subject, opponentId } = req.body;
    const challenge = db.createPeerChallenge(
      title || `${subject || 'BCS'} 1v1 Battle`,
      subject || 'General Science',
      user,
      opponentId || 'usr-demo-1'
    );
    res.json({ success: true, challenge });
  });

  // --- QUESTION BANK ROUTES ---
  app.get('/api/questions', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const filter = {
      exam: req.query.exam as string,
      subject: req.query.subject as string,
      topic: req.query.topic as string,
      subtopic: req.query.subtopic as string,
      difficulty: req.query.difficulty as string,
      search: req.query.search as string,
      bookmarkedOnly: req.query.bookmarkedOnly === 'true',
      statusFilter: req.query.statusFilter as any,
      page,
      limit,
    };

    if (page !== undefined || limit !== undefined) {
      const paginatedResult = db.getPaginatedQuestions(filter, userId);
      return res.json({
        success: true,
        count: paginatedResult.totalCount,
        totalCount: paginatedResult.totalCount,
        totalPages: paginatedResult.totalPages,
        page: paginatedResult.page,
        limit: paginatedResult.limit,
        questions: paginatedResult.questions
      });
    }

    const questions = db.getAllQuestions(filter, userId);
    res.json({ success: true, count: questions.length, questions });
  });

  // --- QUESTION PROPOSALS & DUPLICATION WORKFLOW ROUTES (MUST BE DECLARED BEFORE /:id) ---
  app.get(['/api/questions/proposals', '/api/admin/questions/proposals'], (req, res) => {
    const user = getRequestUser(req);
    const status = req.query.status as any;
    const myProposals = req.query.myProposals === 'true';

    const filterUserId = (myProposals || (user && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)))
      ? user?.id
      : undefined;

    const prs = db.getPullRequests(status, filterUserId);
    res.json({ success: true, count: prs.length, pullRequests: prs });
  });

  app.get(['/api/questions/proposals/:id', '/api/admin/questions/proposals/:id'], (req, res) => {
    const pr = db.getPullRequestById(req.params.id);
    if (!pr) {
      return res.status(404).json({ success: false, error: 'Pull request not found' });
    }
    res.json({ success: true, pullRequest: pr });
  });

  app.post('/api/questions/proposals', (req, res) => {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { title, commitMessage, action, targetQuestionId, proposedQuestion, bulkQuestions } = req.body;
    if (!action || !['ADD', 'UPDATE', 'DELETE', 'BULK_IMPORT'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Valid action (ADD, UPDATE, DELETE, BULK_IMPORT) is required.' });
    }

    const pr = db.createPullRequest({
      title: title || `${action} Question Commit`,
      commitMessage: commitMessage || `${action} question proposal by ${user.name}`,
      action,
      proposer: user,
      targetQuestionId,
      proposedQuestion,
      bulkQuestions
    });

    res.json({
      success: true,
      message: `Commit submitted as Pull Request #${pr.prNumber}. Pending Admin review before merging into Question Bank.`,
      pullRequest: pr
    });
  });

  // Client Question Review Submission Route (Candidates & Reviewers Propose Corrections)
  app.post('/api/questions/:id/propose-review', (req, res) => {
    const targetQuestionId = req.params.id;
    const originalQuestion = db.getQuestionById(targetQuestionId);
    if (!originalQuestion) {
      return res.status(404).json({ success: false, error: 'Target question not found in Question Bank.' });
    }

    const currentUser = getRequestUser(req);
    const {
      proposedQuestion,
      reviewType,
      reviewReason,
      referenceSource,
      contributorName,
      contributorEmail,
      contributorPhone
    } = req.body;

    if (!proposedQuestion || !proposedQuestion.text || !proposedQuestion.options || proposedQuestion.options.length < 2) {
      return res.status(400).json({ success: false, error: 'A valid proposed question with text and options is required.' });
    }

    // Determine proposer (either authenticated user or guest candidate)
    const proposer: User = currentUser || {
      id: `usr-client-${Date.now()}`,
      name: contributorName || 'Candidate Contributor',
      email: contributorEmail || 'contributor@candidate.proshno.bd',
      role: 'CLIENT',
      authProvider: 'email',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      isSubscribed: false,
      dailyQuestionsUsed: 0,
      maxDailyFreeQuestions: 15,
      streakDays: 1,
      xp: 50,
      createdAt: new Date().toISOString()
    };

    const typeLabels: Record<string, string> = {
      ANSWER_CORRECTION: 'Correct Answer Key Correction',
      EXPLANATION_ENHANCEMENT: 'Detailed Solution & Step-by-Step Explanation',
      LATEX_FIX: 'Mathematical Notation & KaTeX Equation Fix',
      TYPO_FIX: 'Spelling & Bengali Unicode Clarification',
      GENERAL_UPDATE: 'General Question Enhancement'
    };

    const typeLabel = typeLabels[reviewType] || 'Question Review';

    const pr = db.createPullRequest({
      title: `Client Review: ${typeLabel} on Q#${originalQuestion.id.slice(-6)}`,
      commitMessage: reviewReason || `Client suggested ${typeLabel} for question: "${originalQuestion.text.slice(0, 50)}..."`,
      action: 'UPDATE',
      proposer,
      targetQuestionId,
      proposedQuestion: {
        ...originalQuestion,
        ...proposedQuestion,
        id: originalQuestion.id
      },
      clientReviewInfo: {
        isClientReview: true,
        reviewType: reviewType || 'GENERAL_UPDATE',
        contributorPhone: contributorPhone || undefined,
        referenceSource: referenceSource || undefined,
        reviewReason: reviewReason || undefined,
        rewardAmount: 50, // 50 BDT future reward per verified review
        payoutStatus: 'PENDING'
      }
    });

    res.json({
      success: true,
      message: `Your review proposal has been submitted to the Editorial Board as PR #${pr.prNumber}! Once verified and approved by Admin, the question will be updated live immediately and your account will be credited with reviewer rewards.`,
      pullRequest: pr
    });
  });

  app.post(['/api/admin/questions/proposals/:id/approve', '/api/questions/proposals/:id/approve'], (req, res) => {
    const user = getRequestUser(req);
    if (!user || (!['SUPER_ADMIN', 'ADMIN'].includes(user.role))) {
      return res.status(403).json({ success: false, error: 'Only Admins with approval privileges can approve Pull Requests.' });
    }

    const priv = db.getUserAdminPrivileges(user);
    if (user.role !== 'SUPER_ADMIN' && !priv.canApprovePR) {
      return res.status(403).json({ success: false, error: 'Your Admin account does not have PR approval privileges. Contact Super Admin.' });
    }

    const { reviewComment } = req.body;
    const result = db.approvePullRequest(req.params.id, user, reviewComment);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      message: `Pull Request #${result.pr?.prNumber} approved & merged successfully into Question Bank!`,
      pullRequest: result.pr,
      result: result.result
    });
  });

  app.post(['/api/admin/questions/proposals/:id/reject', '/api/questions/proposals/:id/reject'], (req, res) => {
    const user = getRequestUser(req);
    if (!user || (!['SUPER_ADMIN', 'ADMIN'].includes(user.role))) {
      return res.status(403).json({ success: false, error: 'Only Admins can review and reject Pull Requests.' });
    }

    const { reviewComment } = req.body;
    if (!reviewComment || !reviewComment.trim()) {
      return res.status(400).json({ success: false, error: 'A review comment explaining the decision is required.' });
    }

    const result = db.rejectPullRequest(req.params.id, user, reviewComment);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      message: `Pull Request #${result.pr?.prNumber} has been rejected with review feedback.`,
      pullRequest: result.pr
    });
  });

  // --- DUPLICATE DETECTION API ENDPOINTS ---
  app.post('/api/questions/check-duplicate', (req, res) => {
    const { text, options, subject, excludeId } = req.body;
    if (!text || !text.trim()) {
      return res.json({ isDuplicate: false, similarity: 0, matches: [] });
    }
    const result = db.checkQuestionDuplicate({ text, options, subject, excludeId });
    res.json({ success: true, ...result });
  });

  app.get('/api/questions/duplicates', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR']), (req, res) => {
    const threshold = req.query.threshold ? Number(req.query.threshold) : 0.74;
    const result = db.scanDuplicateQuestions(threshold);
    res.json({ success: true, ...result });
  });

  app.post('/api/admin/questions/merge-duplicates', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const user = getRequestUser(req);
    const { primaryId, duplicateIds } = req.body;
    if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return res.status(400).json({ success: false, error: 'primaryId and duplicateIds array are required.' });
    }
    const result = db.mergeDuplicateQuestions(primaryId, duplicateIds, user);
    res.json(result);
  });

  app.get('/api/questions/:id', (req, res) => {
    const question = db.getQuestionById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    res.json({ success: true, question });
  });

  app.post('/api/questions', (req, res) => {
    const { text, options, correctOptionIndex, correctOptionIndices, isMultiSelect, explanation, subject, topic, subtopic, exam, difficulty, tags, questionSource } = req.body;
    if (!text || !options || options.length < 2 || !subject) {
      return res.status(400).json({ success: false, error: 'Invalid question fields' });
    }

    const normCorrectIndices = Array.isArray(correctOptionIndices) && correctOptionIndices.length > 0
      ? correctOptionIndices.map(Number)
      : (correctOptionIndex !== undefined ? [Number(correctOptionIndex)] : [0]);

    const user = getRequestUser(req);
    const priv = user ? db.getUserAdminPrivileges(user) : { canDirectAdd: false };
    const shouldPropose = req.body.asProposal === true || user?.role === 'MODERATOR' || user?.role === 'EDITOR' || !priv.canDirectAdd;

    if (shouldPropose) {
      const pr = db.createPullRequest({
        title: req.body.commitTitle || `Commit: Add new question (${subject} - ${topic || 'General'})`,
        commitMessage: req.body.commitMessage || `feat(question): Add ${subject} question by ${user?.name || 'Contributor'}`,
        action: 'ADD',
        proposer: user || db.getUserById('usr-moderator')!,
        proposedQuestion: {
          text,
          options,
          correctOptionIndex: normCorrectIndices[0] ?? 0,
          correctOptionIndices: normCorrectIndices,
          isMultiSelect: isMultiSelect !== undefined ? Boolean(isMultiSelect) : normCorrectIndices.length > 1,
          explanation: explanation || 'No explanation provided.',
          subject,
          topic: topic || 'General',
          subtopic: subtopic || '',
          exam: exam || '',
          questionSource: questionSource || '',
          difficulty: (difficulty as Difficulty) || 'Medium',
          tags: tags || [subject],
        }
      });

      return res.json({
        success: true,
        isProposal: true,
        pullRequest: pr,
        message: `Commit created! Pull Request #${pr.prNumber} submitted for Admin review and approval.`
      });
    }

    const newQuestion = db.addQuestion({
      text,
      options,
      correctOptionIndex: normCorrectIndices[0] ?? 0,
      correctOptionIndices: normCorrectIndices,
      isMultiSelect: isMultiSelect !== undefined ? Boolean(isMultiSelect) : normCorrectIndices.length > 1,
      explanation: explanation || 'No explanation provided.',
      subject,
      topic: topic || 'General',
      subtopic: subtopic || '',
      exam: exam || '',
      questionSource: questionSource || '',
      difficulty: (difficulty as Difficulty) || 'Medium',
      tags: tags || [subject],
    });

    res.json({ success: true, isProposal: false, question: newQuestion });
  });

  // --- ADMIN SPREADSHEET / CSV / EXCEL BATCH IMPORT ENDPOINT ---
  app.post('/api/admin/questions/import', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR']), (req, res) => {
    const { questions } = req.body;
    const currentUser = (req as any).currentUser || getRequestUser(req);

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'No questions provided for import.' });
    }

    const validatedList: Array<Omit<Question, 'id'>> = [];
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      if (!item.text || !item.options || item.options.length < 2) {
        continue;
      }

      const correctIndices = Array.isArray(item.correctOptionIndices) && item.correctOptionIndices.length > 0
        ? item.correctOptionIndices.map(Number)
        : (typeof item.correctOptionIndex === 'number' ? [item.correctOptionIndex] : [0]);

      validatedList.push({
        text: String(item.text).trim(),
        options: item.options.map((o: any) => String(o || '').trim()),
        correctOptionIndex: correctIndices[0] ?? 0,
        correctOptionIndices: correctIndices,
        isMultiSelect: item.isMultiSelect !== undefined ? Boolean(item.isMultiSelect) : correctIndices.length > 1,
        explanation: item.explanation ? String(item.explanation).trim() : 'Detailed solution provided.',
        subject: item.subject ? String(item.subject).trim() : 'Mathematics',
        topic: item.topic ? String(item.topic).trim() : 'Ratio & Proportion',
        subtopic: item.subtopic ? String(item.subtopic).trim() : undefined,
        exam: item.exam ? String(item.exam).trim() : undefined,
        questionSource: item.questionSource ? String(item.questionSource).trim() : undefined,
        difficulty: (['Easy', 'Medium', 'Hard'].includes(item.difficulty) ? item.difficulty : 'Medium') as Difficulty,
        tags: Array.isArray(item.tags) ? item.tags : [item.subject || 'BCS']
      });
    }

    if (validatedList.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid questions could be extracted from dataset.' });
    }

    const priv = currentUser ? db.getUserAdminPrivileges(currentUser) : { canDirectBulkImport: false };
    const shouldPropose = req.body.asProposal === true || currentUser?.role === 'MODERATOR' || currentUser?.role === 'EDITOR' || !priv.canDirectBulkImport;

    if (shouldPropose) {
      const pr = db.createPullRequest({
        title: req.body.commitTitle || `Batch Import: ${validatedList.length} Questions (${validatedList[0]?.subject || 'Multiple'})`,
        commitMessage: req.body.commitMessage || `feat(batch-import): Upload ${validatedList.length} questions from spreadsheet`,
        action: 'BULK_IMPORT',
        proposer: currentUser || db.getUserById('usr-moderator')!,
        bulkQuestions: validatedList
      });

      return res.json({
        success: true,
        isProposal: true,
        pullRequest: pr,
        importedCount: validatedList.length,
        message: `Batch import commit submitted as Pull Request #${pr.prNumber} (${validatedList.length} questions). Pending Admin review & merge.`
      });
    }

    const result = db.importQuestionsBulk(validatedList, currentUser?.email, currentUser?.role);

    res.json({
      success: true,
      isProposal: false,
      importedCount: result.importedCount,
      message: `Successfully imported ${result.importedCount} questions directly to Question Bank!`
    });
  });

  app.get('/api/admin/questions/export', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR']), (req, res) => {
    const allQuestions = db.getAllQuestions();
    res.json({
      success: true,
      count: allQuestions.length,
      questions: allQuestions
    });
  });

  app.put('/api/questions/:id', (req, res) => {
    const user = getRequestUser(req);
    const priv = user ? db.getUserAdminPrivileges(user) : { canDirectEdit: false };
    const shouldPropose = req.body.asProposal === true || user?.role === 'MODERATOR' || user?.role === 'EDITOR' || !priv.canDirectEdit;

    if (shouldPropose) {
      const existing = db.getQuestionById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Question not found' });
      }

      const pr = db.createPullRequest({
        title: req.body.commitTitle || `Commit: Update Question (${existing.subject})`,
        commitMessage: req.body.commitMessage || `fix(question): Update question #${existing.id.slice(-6)} details by ${user?.name || 'Contributor'}`,
        action: 'UPDATE',
        proposer: user || db.getUserById('usr-moderator')!,
        targetQuestionId: req.params.id,
        proposedQuestion: { ...existing, ...req.body }
      });

      return res.json({
        success: true,
        isProposal: true,
        pullRequest: pr,
        message: `Update commit created! Pull Request #${pr.prNumber} submitted for Admin review.`
      });
    }

    const updated = db.updateQuestion(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    res.json({ success: true, isProposal: false, question: updated });
  });

  app.delete('/api/questions/:id', (req, res) => {
    const user = getRequestUser(req);
    const priv = user ? db.getUserAdminPrivileges(user) : { canDirectDelete: false };
    const shouldPropose = req.body?.asProposal === true || user?.role === 'MODERATOR' || user?.role === 'EDITOR' || !priv.canDirectDelete;

    if (shouldPropose) {
      const existing = db.getQuestionById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Question not found' });
      }

      const pr = db.createPullRequest({
        title: req.body?.commitTitle || `Commit: Delete Question (${existing.subject})`,
        commitMessage: req.body?.commitMessage || `refactor(question): Request to remove question #${existing.id.slice(-6)} from bank`,
        action: 'DELETE',
        proposer: user || db.getUserById('usr-moderator')!,
        targetQuestionId: req.params.id,
        proposedQuestion: existing
      });

      return res.json({
        success: true,
        isProposal: true,
        pullRequest: pr,
        message: `Deletion commit created! Pull Request #${pr.prNumber} submitted for Admin review.`
      });
    }

    const deleted = db.deleteQuestion(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    res.json({ success: true, isProposal: false, message: 'Question deleted successfully' });
  });

  // --- CATEGORIES, EXAMS & TOPIC HIERARCHY ROUTES ---
  app.get('/api/categories', (req, res) => {
    const subjects = db.getSubjects();
    const subjectTopicsMap: Record<string, string[]> = {};
    subjects.forEach((sub) => {
      subjectTopicsMap[sub] = db.getTopicsBySubject(sub);
    });
    res.json({ success: true, subjects, subjectTopicsMap });
  });

  app.get('/api/categories/hierarchy', (req, res) => {
    const data = db.getCategoriesHierarchy();
    res.json({ success: true, ...data });
  });

  app.get('/api/exams', (req, res) => {
    const exams = db.getExams();
    res.json({ success: true, exams });
  });

  // --- SCHEDULED EXAMS & REMINDERS ROUTES ---
  app.get('/api/exams/scheduled', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string);
    const scheduled = db.getScheduledExams(userId);
    res.json({ success: true, scheduled });
  });

  app.post('/api/exams/schedule', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'usr-demo-1';
    const { examId, examName, scheduledTime, durationMinutes, notes } = req.body;

    if (!examId || !examName || !scheduledTime) {
      return res.status(400).json({ success: false, error: 'examId, examName, and scheduledTime are required.' });
    }

    const scheduled = db.scheduleExam(userId, examId, examName, scheduledTime, durationMinutes, notes);
    
    // Also trigger immediate check if scheduled within next 10 minutes
    db.checkAndTriggerScheduledExamNotifications();

    res.json({
      success: true,
      message: `Exam "${examName}" successfully scheduled for ${new Date(scheduledTime).toLocaleString()}! You will receive an instant notification on your panel on time.`,
      scheduled
    });
  });

  app.delete('/api/exams/scheduled/:id', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const deleted = db.cancelScheduledExam(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Scheduled exam not found or unauthorized.' });
    }
    res.json({ success: true, message: 'Scheduled exam canceled successfully.' });
  });

  // Auto Proctor & Scheduler background ticker (checks every 30 seconds)
  setInterval(() => {
    try {
      db.checkAndTriggerScheduledExamNotifications();
    } catch (e) {
      console.warn('Scheduled exam ticker error:', e);
    }
  }, 30000);

  app.get('/api/exams/:id/questions', (req, res) => {
    const exam = db.getExams().find(e => e.id === req.params.id);
    if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });

    let questions: Question[] = [];
    if (exam.questionIds && exam.questionIds.length > 0) {
      questions = exam.questionIds
        .map(id => db.getQuestionById(id))
        .filter((q): q is Question => q !== undefined);
    } else if (exam.subjects && exam.subjects.length > 0) {
      // Fallback: pick questions matching exam subjects
      const allQ = db.getAllQuestions();
      questions = allQ.filter(q => exam.subjects!.includes(q.subject));
      if (exam.totalQuestions && questions.length > exam.totalQuestions) {
        questions = questions.slice(0, exam.totalQuestions);
      }
    }

    res.json({ success: true, questions, exam });
  });

  app.post('/api/exams', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), (req, res) => {
    const {
      name,
      shortCode,
      code,
      category,
      icon,
      description,
      subjects,
      targetCandidatesCount,
      durationMinutes,
      totalMarks,
      negativeMarksPerWrong,
      totalQuestions,
      questionIds,
      instructions,
      isLive
    } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'Exam name is required' });

    const newExam = db.addExam({
      name,
      code: code || shortCode || name.slice(0, 4).toUpperCase(),
      shortCode: shortCode || code || name.slice(0, 4).toUpperCase(),
      category: category || 'BCS',
      icon: icon || 'Award',
      description: description || '',
      subjects: subjects || [],
      targetCandidatesCount: Number(targetCandidatesCount) || 100000,
      durationMinutes: Number(durationMinutes) || 60,
      totalMarks: Number(totalMarks) || (Number(totalQuestions) || 50),
      negativeMarksPerWrong: negativeMarksPerWrong !== undefined ? Number(negativeMarksPerWrong) : 0.5,
      totalQuestions: Number(totalQuestions) || (questionIds ? questionIds.length : 50),
      questionIds: Array.isArray(questionIds) ? questionIds : [],
      instructions: instructions || 'Negative marks apply for each incorrect answer. Answer carefully.',
      isLive: isLive !== undefined ? Boolean(isLive) : true
    });
    res.json({ success: true, exam: newExam });
  });

  app.put('/api/exams/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), (req, res) => {
    const updated = db.updateExam(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Exam not found' });
    res.json({ success: true, exam: updated });
  });

  app.put('/api/exams/:id/questions', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), (req, res) => {
    const { questionIds } = req.body;
    const updated = db.updateExam(req.params.id, { questionIds: Array.isArray(questionIds) ? questionIds : [] });
    if (!updated) return res.status(404).json({ success: false, error: 'Exam not found' });
    res.json({ success: true, exam: updated });
  });

  app.delete('/api/exams/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const deleted = db.deleteExam(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Exam not found' });
    res.json({ success: true, message: 'Exam deleted successfully' });
  });

  // Admin Database Management & Persistence endpoints
  app.post('/api/admin/db/clear-questions', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const clearedCount = db.clearAllQuestions();
    res.json({ success: true, message: `All ${clearedCount} questions cleared from active storage. Storage is now empty and ready for fresh questions.`, clearedCount });
  });

  app.get('/api/admin/db/export', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const backup = db.exportDatabase();
    res.json({ success: true, backup });
  });

  app.post('/api/admin/db/restore', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const result = db.restoreDatabase(req.body);
    res.json({ success: true, message: 'Database restored successfully', ...result });
  });

  app.get('/api/hierarchy', (req, res) => {
    const hierarchy = db.getSubjectHierarchy();
    res.json({ success: true, hierarchy });
  });

  app.post('/api/hierarchy/topics', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), (req, res) => {
    const { subject, topic, subtopics } = req.body;
    if (!subject || !topic) return res.status(400).json({ success: false, error: 'Subject and Topic are required' });
    const success = db.addTopic(subject, topic, subtopics || []);
    res.json({ success });
  });

  app.delete('/api/hierarchy/topics', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const { subject, topic } = req.body;
    if (!subject || !topic) return res.status(400).json({ success: false, error: 'Subject and Topic are required' });
    const success = db.deleteTopic(subject, topic);
    res.json({ success });
  });

  app.post('/api/hierarchy/subtopics', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), (req, res) => {
    const { subject, topic, subtopic } = req.body;
    if (!subject || !topic || !subtopic) return res.status(400).json({ success: false, error: 'Subject, Topic and Subtopic are required' });
    const success = db.addSubtopic(subject, topic, subtopic);
    res.json({ success });
  });

  app.delete('/api/hierarchy/subtopics', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const { subject, topic, subtopic } = req.body;
    if (!subject || !topic || !subtopic) return res.status(400).json({ success: false, error: 'Subject, Topic and Subtopic are required' });
    const success = db.deleteSubtopic(subject, topic, subtopic);
    res.json({ success });
  });

  // --- WRONG QUESTIONS / MISTAKES REVISION NOTEBOOK ROUTES ---
  app.get('/api/wrong-questions', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const filter = {
      exam: req.query.exam as string,
      subject: req.query.subject as string,
      topic: req.query.topic as string,
      status: (req.query.status as any) || 'all'
    };
    const wrongQuestions = db.getUserWrongQuestions(userId, filter);
    res.json({ success: true, count: wrongQuestions.length, wrongQuestions });
  });

  app.put('/api/wrong-questions/:questionId/resolve', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const { resolved } = req.body;
    const success = db.resolveWrongQuestion(userId, req.params.questionId, resolved !== false);
    res.json({ success });
  });

  app.post('/api/wrong-questions/revision-quiz', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const { count, subject, exam } = req.body;
    const questions = db.generateRevisionQuestions(userId, Number(count) || 10, subject, exam);

    if (questions.length === 0) {
      return res.status(404).json({ success: false, error: 'No wrong questions found for this revision filter. Great job!' });
    }

    res.json({
      success: true,
      quiz: {
        id: 'rev-qz-' + Date.now(),
        title: `Mistakes Revision: ${subject || exam || 'All Mistakes'}`,
        subject: subject || 'Mistake Revision',
        mode: 'revision',
        durationMinutes: Math.max(5, Math.round(questions.length * 1.2)),
        negativeMarking: false,
        negativeMarkPerWrong: 0,
        questions
      }
    });
  });

  // --- BLOG / ARTICLE ROUTES ---
  app.get('/api/blog', (req, res) => {
    const filter = {
      category: req.query.category as string,
      exam: req.query.exam as string,
      search: req.query.search as string
    };
    const posts = db.getBlogPosts(filter);
    res.json({ success: true, count: posts.length, posts });
  });

  app.get('/api/blog/:id', (req, res) => {
    const post = db.getBlogPostById(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Blog post not found' });
    res.json({ success: true, post });
  });

  app.post('/api/blog', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), (req, res) => {
    const currentUser = (req as any).currentUser;
    const {
      title,
      summary,
      content,
      category,
      targetExam,
      tags,
      readTimeMinutes,
      coverImageUrl,
      coverImage,
      videoUrl,
      audioUrl,
      audioTitle,
      galleryImages,
      downloadAttachmentUrl,
      downloadAttachmentLabel,
      applicationDeadline,
      salaryRange,
      featured,
      isFeatured
    } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ success: false, error: 'Title, content and category are required' });
    }

    const newPost = db.addBlogPost(
      {
        title,
        summary: summary || title,
        content,
        category,
        targetExam: targetExam || 'General',
        tags: Array.isArray(tags) ? tags : [category],
        readTimeMinutes: Number(readTimeMinutes) || 4,
        coverImageUrl: coverImageUrl || coverImage || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
        coverImage: coverImage || coverImageUrl || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
        videoUrl: videoUrl || undefined,
        audioUrl: audioUrl || undefined,
        audioTitle: audioTitle || undefined,
        galleryImages: Array.isArray(galleryImages) ? galleryImages : undefined,
        downloadAttachmentUrl: downloadAttachmentUrl || undefined,
        downloadAttachmentLabel: downloadAttachmentLabel || undefined,
        applicationDeadline: applicationDeadline || undefined,
        salaryRange: salaryRange || undefined,
        featured: !!(featured || isFeatured),
        isFeatured: !!(featured || isFeatured)
      },
      currentUser ? { name: currentUser.name, role: currentUser.role } : undefined
    );

    res.json({ success: true, post: newPost });
  });

  app.put('/api/blog/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), (req, res) => {
    const updated = db.updateBlogPost(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Blog post not found' });
    res.json({ success: true, post: updated });
  });

  app.delete('/api/blog/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const deleted = db.deleteBlogPost(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Blog post not found' });
    res.json({ success: true, message: 'Blog post deleted successfully' });
  });

  app.post('/api/blog/:id/like', (req, res) => {
    const post = db.likeBlogPost(req.params.id);
    if (!post) return res.status(404).json({ success: false, error: 'Blog post not found' });
    res.json({ success: true, post, likes: post.likesCount || 0 });
  });

  app.post('/api/blog/:id/comments', (req, res) => {
    const { content, authorName, authorRole, authorEmail, authorAvatar } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Comment text cannot be empty' });
    }
    const post = db.addBlogComment(req.params.id, {
      content: content.trim(),
      authorName: authorName || 'Aspirant Student',
      authorRole: authorRole || 'Candidate',
      authorEmail,
      authorAvatar
    });
    if (!post) return res.status(404).json({ success: false, error: 'Blog post not found' });
    res.json({ success: true, post, comments: post.comments || [] });
  });

  app.post('/api/blog/:id/comments/:commentId/like', (req, res) => {
    const post = db.likeBlogComment(req.params.id, req.params.commentId);
    if (!post) return res.status(404).json({ success: false, error: 'Blog post or comment not found' });
    res.json({ success: true, post, comments: post.comments || [] });
  });

  // --- BOOTING / SPLASH SCREEN OFFER ROUTES ---
  app.get('/api/splash-offer', (req, res) => {
    const offer = db.getSplashOffer();
    res.json({ success: true, offer });
  });

  app.post('/api/splash-offer', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR']), (req, res) => {
    const {
      title,
      subtitle,
      description,
      badgeText,
      imageUrl,
      promoCode,
      discountPercentage,
      ctaText,
      ctaAction,
      externalUrl,
      active,
      dismissDurationHours
    } = req.body;

    const updated = db.updateSplashOffer({
      title,
      subtitle,
      description,
      badgeText,
      imageUrl,
      promoCode,
      discountPercentage: discountPercentage !== undefined ? Number(discountPercentage) : undefined,
      ctaText,
      ctaAction,
      externalUrl,
      active: active !== undefined ? Boolean(active) : true,
      dismissDurationHours: dismissDurationHours ? Number(dismissDurationHours) : 24
    });

    res.json({ success: true, offer: updated, message: 'Splash offer banner updated successfully' });
  });

  // --- ANNOUNCEMENTS & SMS NOTIFICATIONS ROUTES ---
  app.get('/api/notifications', (req, res) => {
    const notifs = db.getNotifications();
    res.json({ success: true, count: notifs.length, notifications: notifs });
  });

  app.post('/api/notifications', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR']), (req, res) => {
    const currentUser = (req as any).currentUser;
    const { title, message, type, priority, targetGroup, linkTab } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required' });
    }

    const notif = db.createNotification({
      title,
      message,
      type: type || 'ANNOUNCEMENT',
      priority: priority || 'NORMAL',
      targetGroup: targetGroup || 'ALL',
      linkTab: linkTab || 'dashboard',
      senderName: currentUser ? currentUser.name : 'ProshnoSiddhi Admin',
      senderRole: currentUser ? currentUser.role : 'ADMIN',
      senderAvatar: currentUser?.avatar
    });

    res.json({ success: true, notification: notif, message: 'Broadcast announcement sent successfully' });
  });

  app.delete('/api/notifications/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), (req, res) => {
    const deleted = db.deleteNotification(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted successfully' });
  });

  app.post('/api/notifications/:id/read', (req, res) => {
    const success = db.markNotificationRead(req.params.id);
    res.json({ success });
  });

  // --- QUIZ & EXAM ENGINE ROUTES ---
  app.post('/api/quizzes/generate', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const config: QuizConfig = req.body;

    const allQ = db.getAllQuestions(
      {
        subject: config.subject,
        topic: config.topic,
        difficulty: config.difficulty,
      },
      userId
    );

    if (allQ.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No questions found matching selected subject and filters.',
      });
    }

    // Shuffle and pick desired count
    const shuffled = [...allQ].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, Math.min(config.questionCount || 10, shuffled.length));

    res.json({
      success: true,
      quiz: {
        id: 'qz-' + Date.now(),
        title: config.title || `${config.subject || 'All Subjects'} Practice Quiz`,
        subject: config.subject || 'Mixed Subjects',
        mode: config.mode || 'practice',
        durationMinutes: config.durationMinutes || 10,
        negativeMarking: config.negativeMarking ?? true,
        negativeMarkPerWrong: config.negativeMarkPerWrong || 0.25,
        questions: selectedQuestions,
      },
    });
  });

  app.post('/api/quizzes/submit', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const {
      quizTitle,
      subject,
      mode,
      durationSeconds,
      responses, // Array of { questionId, selectedOptionIndex, isMarkedForReview, timeSpentSeconds }
      negativeMarking,
      negativeMarkPerWrong,
    } = req.body;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ success: false, error: 'Responses are required' });
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    let totalScore = 0;
    const maxScore = responses.length;

    const penalty = negativeMarking ? (negativeMarkPerWrong !== undefined ? negativeMarkPerWrong : 0.25) : 0;

    responses.forEach((resp: any) => {
      const q = db.getQuestionById(resp.questionId);
      if (!q) return;

      const userIndices: number[] = Array.isArray(resp.selectedOptionIndices) && resp.selectedOptionIndices.length > 0
        ? resp.selectedOptionIndices.map(Number)
        : (resp.selectedOptionIndex !== null && resp.selectedOptionIndex !== undefined ? [Number(resp.selectedOptionIndex)] : []);

      const correctIndices: number[] = Array.isArray(q.correctOptionIndices) && q.correctOptionIndices.length > 0
        ? q.correctOptionIndices.map(Number)
        : [Number(q.correctOptionIndex ?? 0)];

      if (userIndices.length === 0) {
        skippedCount++;
      } else {
        const sortedUser = [...userIndices].sort((a, b) => a - b).join(',');
        const sortedCorrect = [...correctIndices].sort((a, b) => a - b).join(',');
        if (sortedUser === sortedCorrect) {
          correctCount++;
          totalScore += 1;
        } else {
          incorrectCount++;
          totalScore -= penalty;
        }
      }
    });

    totalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const attemptedCount = correctCount + incorrectCount;
    const accuracyPercentage = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;

    const attempt = db.recordQuizAttempt({
      userId,
      quizTitle: quizTitle || 'Custom Quiz',
      subject: subject || 'Mixed',
      mode: (mode as QuizMode) || 'practice',
      startedAt: new Date(Date.now() - (durationSeconds || 60) * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: durationSeconds || 60,
      totalQuestions: responses.length,
      attemptedCount,
      correctCount,
      incorrectCount,
      skippedCount,
      totalScore,
      maxScore,
      accuracyPercentage,
      responses,
      questionIds: responses.map((r: any) => r.questionId),
    });

    res.json({ success: true, attempt });
  });

  app.get('/api/quizzes/attempts', (req, res) => {
    const userId = (req.headers['x-user-id'] as string) || 'usr-demo-1';
    const attempts = db.getUserAttempts(userId);
    res.json({ success: true, attempts });
  });

  app.get('/api/quizzes/attempts/:id', (req, res) => {
    const attempt = db.getAttemptById(req.params.id);
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }
    // Hydrate questions
    const questions = attempt.questionIds.map((id) => db.getQuestionById(id)).filter(Boolean);
    res.json({ success: true, attempt, questions });
  });

  // --- ANALYTICS ROUTE ---
  app.get('/api/analytics', (req, res) => {
    const user = getSessionUser(req);
    const headerUserId = req.headers['x-user-id'] as string;
    const userId = user?.id || (headerUserId && headerUserId !== 'undefined' ? headerUserId : null);
    
    if (!userId) {
      return res.json({
        success: true,
        overview: {
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
        }
      });
    }

    const overview = db.getAnalyticsOverview(userId);
    res.json({ success: true, overview });
  });

  // --- ADMIN ANALYTICS ROUTE ---
  app.get('/api/admin/analytics', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR']), (req, res) => {
    const analytics = db.getAdminAnalyticsOverview();
    res.json({ success: true, analytics });
  });

  // --- ADMIN UPDATE QUESTION EXPLANATION ---
  app.patch('/api/admin/questions/:questionId/explanation', requireRole(['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR']), (req, res) => {
    const { explanation } = req.body;
    if (typeof explanation !== 'string') {
      return res.status(400).json({ success: false, error: 'Explanation must be a string' });
    }
    const updated = db.updateQuestionExplanation(req.params.questionId, explanation);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }
    res.json({ success: true, question: updated });
  });

  // --- BOOKMARKS & NOTES ROUTES ---
  app.get('/api/bookmarks', (req, res) => {
    const user = getSessionUser(req);
    const headerUserId = req.headers['x-user-id'] as string;
    const userId = user?.id || (headerUserId && headerUserId !== 'undefined' ? headerUserId : null);
    if (!userId) return res.json({ success: true, bookmarks: [] });
    const bookmarks = db.getUserBookmarks(userId);
    res.json({ success: true, bookmarks });
  });

  app.post('/api/bookmarks/toggle', (req, res) => {
    const user = getSessionUser(req);
    const headerUserId = req.headers['x-user-id'] as string;
    const userId = user?.id || (headerUserId && headerUserId !== 'undefined' ? headerUserId : null);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { questionId } = req.body;
    if (!questionId) return res.status(400).json({ success: false, error: 'questionId required' });
    const isBookmarked = db.toggleBookmark(userId, questionId);
    res.json({ success: true, isBookmarked });
  });

  app.post('/api/notes', (req, res) => {
    const user = getSessionUser(req);
    const headerUserId = req.headers['x-user-id'] as string;
    const userId = user?.id || (headerUserId && headerUserId !== 'undefined' ? headerUserId : null);
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });
    const { questionId, note } = req.body;
    if (!questionId) return res.status(400).json({ success: false, error: 'questionId required' });
    const saved = db.saveNote(userId, questionId, note || '');
    res.json({ success: true, note: saved });
  });

  app.get('/api/notes/:questionId', (req, res) => {
    const user = getSessionUser(req);
    const headerUserId = req.headers['x-user-id'] as string;
    const userId = user?.id || (headerUserId && headerUserId !== 'undefined' ? headerUserId : null);
    if (!userId) return res.json({ success: true, note: '' });
    const note = db.getUserNote(userId, req.params.questionId) || '';
    res.json({ success: true, note });
  });

  // Lazy Gemini instance
  let geminiClient: GoogleGenAI | null = null;
  function getGemini(): GoogleGenAI | null {
    if (!process.env.GEMINI_API_KEY) return null;
    if (!geminiClient) {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return geminiClient;
  }

  // --- INTELLIGENT TUTOR & EXAM DRILL GENERATOR ENDPOINTS ---
  app.post('/api/ai/explain', async (req, res) => {
    try {
      const { questionText, options, correctOptionIndex, correctOptionIndices, explanation } = req.body;

      if (!questionText || !options) {
        return res.status(400).json({ success: false, error: 'Question data required' });
      }

      const indices = Array.isArray(correctOptionIndices) && correctOptionIndices.length > 0
        ? correctOptionIndices
        : (correctOptionIndex !== undefined ? [correctOptionIndex] : [0]);

      const correctLabels = indices.map((idx: number) => `Option ${idx + 1}: "${options[idx] || ''}"`).join(' and ');

      const gemini = getGemini();
      if (gemini) {
        try {
          const response = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an academic expert tutor for competitive exams (BCS, Bank, University Admission).
Generate an in-depth, rigorous academic explanation for the following question.
Format your output in clean Markdown with LaTeX notation ($...$ for inline math and $$...$$ for block math) where relevant.

Question:
${questionText}

Options:
${options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n')}

Correct Answer:
${correctLabels}

${explanation ? `Existing notes to expand upon:\n${explanation}` : ''}

Structure your response with:
### 🎯 Core Conceptual Focus
Explain the primary theory, rule, or syllabus background being tested.

### 📐 Step-by-Step Solution Breakdown
Walk through the mathematical, linguistic, or factual justification step by step. State why other options are invalid.

### 💡 High-Yield Exam Takeaway & Shortcuts
Provide memory mnemonics, quick-solving techniques, or critical traps to avoid under exam pressure.`
          });

          if (response && response.text && response.text.trim().length > 20) {
            return res.json({ success: true, explanation: response.text.trim() });
          }
        } catch (genAiErr) {
          console.warn('Gemini API call failed, falling back to structured explanation engine:', genAiErr);
        }
      }

      const breakdown = `### 🎯 Core Conceptual Focus
This problem tests fundamental principles and analytical problem-solving required for high-stakes competitive examinations.

### 📐 Step-by-Step Solution Breakdown
Evaluating the candidate choices against standard syllabus benchmarks demonstrates that **${correctLabels}** is the logically valid answer.

${explanation ? `**Detailed Context:**\n${explanation}\n\n` : ''}- **Step 1:** Analyze the premise and isolate the core variable or historical/linguistic condition.
- **Step 2:** Eliminate distractors that fail boundary constraints or exhibit grammatical/mathematical inconsistencies.
- **Step 3:** Confirm that ${correctLabels} satisfies all criteria without contradiction.

### 💡 High-Yield Exam Takeaway & Shortcuts
- Always verify units, algebraic signs, and negative constraints before committing your answer.
- For multi-choice items, eliminate improbable extremes first to preserve speed.`;

      res.json({ success: true, explanation: breakdown });
    } catch (err: any) {
      console.error('Explanation error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate explanation.',
      });
    }
  });

  app.post('/api/ai/generate-quiz', async (req, res) => {
    try {
      const { topic, subject, difficulty, count } = req.body;

      if (!topic || !subject) {
        return res.status(400).json({ success: false, error: 'Topic and subject are required' });
      }

      const numQuestions = Math.min(Number(count) || 5, 10);
      const diff = (['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium') as Difficulty;

      // Generate curriculum-aligned exam questions
      const generatedList: Array<Omit<Question, 'id'>> = [];
      const isMath = /math|algebra|geometry|calculus|arithmetic|quantitative|physics|statistics/i.test(subject + ' ' + topic);

      for (let i = 1; i <= numQuestions; i++) {
        if (isMath) {
          const a = (i * 3) + 2;
          const b = (i * 2) + 1;
          const sol = a * b;
          generatedList.push({
            text: `If $f(x) = ${a}x + ${b}$ and $g(x) = x^2 - ${i}$, what is the value of $(f \\circ g)(2)$ for the topic "${topic}"?`,
            options: [
              `$${a * (4 - i) + b}$`,
              `$${sol + 5}$`,
              `$${sol - 3}$`,
              `$${(a + b) * 2}$`,
              `None of the above`
            ],
            correctOptionIndex: 0,
            correctOptionIndices: [0],
            isMultiSelect: false,
            explanation: `Substitute $x = 2$ into $g(x)$: $g(2) = 2^2 - ${i} = ${4 - i}$. Then compute $f(g(2)) = ${a}(${4 - i}) + ${b} = ${a * (4 - i) + b}$.`,
            subject,
            topic,
            difficulty: diff,
            tags: [subject, topic, 'Exam-Drill']
          });
        } else {
          generatedList.push({
            text: `Which of the following statements is fundamentally correct regarding "${topic}" in ${subject} (Question ${i})?`,
            options: [
              `Statement Alpha: Comprehensive standard condition applies under standard parameters.`,
              `Statement Beta: Alternative hypothesis yields divergent empirical characteristics.`,
              `Statement Gamma: Empirical verification confirms consistency with core laws.`,
              `Statement Delta: The process is purely independent of variable boundary limits.`
            ],
            correctOptionIndex: 0,
            correctOptionIndices: [0, 2],
            isMultiSelect: true,
            explanation: `In standard curriculum analysis of ${topic}, both Statement Alpha and Statement Gamma represent established principles.`,
            subject,
            topic,
            difficulty: diff,
            tags: [subject, topic, 'Exam-Drill']
          });
        }
      }

      const addedQuestions: Question[] = [];
      generatedList.forEach((qItem) => {
        const added = db.addQuestion(qItem);
        addedQuestions.push(added);
      });

      res.json({ success: true, count: addedQuestions.length, questions: addedQuestions });
    } catch (err: any) {
      console.error('Quiz generation error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to generate quiz questions.',
      });
    }
  });

  // Catch-all for missing API endpoints so they always return JSON instead of falling through to HTML index.html
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.path}`,
    });
  });

  // Express JSON error handler middleware for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Server Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
