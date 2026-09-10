import { Question, User, AnalyticsOverview, QuizAttempt } from './types';

// Live Cloud Run backend server URL
const API_BASE_URL = 'https://ais-pre-c3ouz5k5b4ehinbg4yy6hp-365479616722.asia-southeast1.run.app/api';

let currentAuthToken: string | null = null;
let currentUserId: string = 'usr-demo-1';

export function setMobileAuthToken(token: string | null, userId?: string) {
  currentAuthToken = token;
  if (userId) currentUserId = userId;
}

function getMobileHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': currentUserId
  };
  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
    headers['x-auth-token'] = currentAuthToken;
  }
  return headers;
}

export async function loginMobileUser(email: string, password?: string): Promise<{ success: boolean; user?: User; error?: string; token?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      setMobileAuthToken(data.token, data.user?.id);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function registerMobileUser(name: string, email: string, password?: string, targetExam?: string): Promise<{ success: boolean; user?: User; error?: string; token?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, targetExam })
    });
    const data = await res.json();
    if (data.success && data.token) {
      setMobileAuthToken(data.token, data.user?.id);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Registration error' };
  }
}

export async function fetchQuestions(subject?: string, search?: string): Promise<Question[]> {
  try {
    const params = new URLSearchParams();
    if (subject && subject !== 'All') params.append('subject', subject);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE_URL}/questions?${params.toString()}`, {
      headers: getMobileHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch questions');
    const data = await res.json();
    return data.questions || data;
  } catch (err) {
    console.error('API Error:', err);
    return [];
  }
}

export async function fetchUser(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getMobileHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch user');
    const data = await res.json();
    return data.user || null;
  } catch (err) {
    console.error('API Error:', err);
    return null;
  }
}

export async function fetchAnalytics(): Promise<AnalyticsOverview | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics`, {
      headers: getMobileHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    const data = await res.json();
    return data.overview || data;
  } catch (err) {
    console.error('API Error:', err);
    return null;
  }
}

export async function submitQuizAttempt(attemptData: any): Promise<QuizAttempt | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/quizzes/submit`, {
      method: 'POST',
      headers: getMobileHeaders(),
      body: JSON.stringify(attemptData)
    });
    if (!res.ok) throw new Error('Failed to submit quiz');
    const data = await res.json();
    return data.attempt || data;
  } catch (err) {
    console.error('API Error:', err);
    return null;
  }
}
