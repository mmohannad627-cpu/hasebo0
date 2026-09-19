/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CUSTOM_API_BASE_KEY = 'hasebo_custom_api_base';

// ⭐ ضبط وقت انتظار الطلبات — مهم جداً لمنع التعليق اللامنتهي على الأندرويد
// 8 ثوانٍ كحد أقصى لأي طلب API (بدون هذا، قد ينتظر WebView لدقائق!)
const REQUEST_TIMEOUT_MS = 8000;

function isCapacitorAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).Capacitor !== 'undefined' ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function resolveApiBase(): string {
  const customSaved = typeof localStorage !== 'undefined'
    ? localStorage.getItem(CUSTOM_API_BASE_KEY)
    : null;

  if (customSaved && customSaved.trim().length > 0) {
    return customSaved.trim().replace(/\/$/, '');
  }

  const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim();

  if (envBase.length > 0) {
    return envBase.replace(/\/$/, '');
  }

  const onAndroid = isCapacitorAndroid();
  if (onAndroid) {
    // ⭐ على الأندرويد بدون IP محدد → لا نرجع `/api` أبداً لأنه يشير إلى الهاتف نفسه
    // بدلاً من ذلك نرجع نصاً واضحاً لينتج خطأ شبكي واضح يلتقطه الـ Fallback DEMO
    console.warn(
      '[API] ⚠️ بيئة أندرويد بدون عنوان خادم! سيتم استخدام وضع التجريب المحلي DEMO. ' +
      'إذا أردت الاتصال بخادم حقيقي، ضبط VITE_API_BASE_URL=http://IP_الخادم:3000 في ملف .env ' +
      'أو استخدم setApiBaseUrl() داخل شاشة الإعدادات.'
    );
    // نرجع عنواناً غير صالح عمداً ليحدث خطأ شبكي فوري ويُفعل الـ Offline DEMO فوراً
    // (هذا أفضل من `/api` الذي ينتظر timeout طويل جداً!)
    return 'http://127.0.0.1:1'; // Port غير مستخدم → خطأ فوري → يفعل DEMO خلال ثانية
  }

  // الويب فقط (Same Origin) نستخدم المسار النسبي
  return '/api';
}

let API_BASE = resolveApiBase();

export function getApiBaseUrl(): string {
  return API_BASE;
}

export function setApiBaseUrl(url: string): void {
  const clean = url.trim().replace(/\/$/, '');
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CUSTOM_API_BASE_KEY, clean);
  }
  API_BASE = clean;
  console.log('[API] ✅ تم تحديث عنوان الخادم إلى:', clean);
}

export function getAuthToken(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('grocery_erp_token') : null;
}

export function setAuthToken(token: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('grocery_erp_token', token);
  }
}

export function clearAuthToken() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('grocery_erp_token');
  }
}

function buildTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutMs);
  return { controller, timeoutId };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = `${API_BASE}${endpoint}`;
  console.log(`[API] → طلب ${options.method || 'GET'}: ${fullUrl}`);

  // ⭐ Timeout + AbortController لمنع التعليق الأبدي
  const { controller, timeoutId } = buildTimeoutController(REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = `خطأ HTTP ${response.status}: ${response.statusText || 'فشل الاتصال بالخادم'}`;
      try {
        const errJson = await response.json();
        if (errJson && (errJson.error || errJson.message)) {
          errorMsg = errJson.error || errJson.message;
        }
      } catch {
        // fallback
      }
      console.warn(`[API] ← فشل الطلب: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const data = await response.json() as T;
    console.log(`[API] ← نجاح ${options.method || 'GET'}: ${endpoint}`);
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);

    // ⭐ تحويل أخطاء Abort (Timeout) إلى رسالة واضحة وسهلة الالتقاط بواسطة Fallback
    if (err?.name === 'AbortError' || /abort|timeout|timed out/i.test(err?.message || '')) {
      const timeoutErr = new Error(
        `NetworkError: انتهت مهلة الاتصال بالخادم (${REQUEST_TIMEOUT_MS / 1000} ثانية) — تعذر الوصول إلى ${fullUrl}`
      );
      (timeoutErr as any).cause = err;
      throw timeoutErr;
    }

    // ⭐ تحويل أخطاء TypeError (Failed to fetch, CORS, Connection refused)
    if (err instanceof TypeError || /failed to fetch|load failed|network error|econnrefused|connection refused/i.test(err?.message || '')) {
      const netErr = new Error(
        `NetworkError: ${err?.message || 'تعذر الاتصال بالخادم'} — ربما الخادم غير متاح أو IP غير صحيح (${fullUrl})`
      );
      (netErr as any).cause = err;
      throw netErr;
    }

    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string; branchId?: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request<any>('/auth/me'),
  switchBranch: (branchId: string) =>
    request<any>('/auth/switch-branch', { method: 'POST', body: JSON.stringify({ branchId }) }),

  // Dashboard
  getDashboardStats: (branchId?: string, date?: string) =>
    request<any>(`/dashboard/stats?branchId=${branchId || ''}&date=${date || ''}`),

  // Categories & Products
  getCategories: () => request<any[]>('/categories'),
  createCategory: (data: any) => request<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  getProducts: (params: { categoryId?: string; search?: string; lowStock?: boolean; activeOnly?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.search) query.set('search', params.search);
    if (params.lowStock) query.set('lowStock', 'true');
    if (params.activeOnly) query.set('activeOnly', 'true');
    return request<any[]>(`/products?${query.toString()}`);
  },
  getProductById: (id: string) => request<any>(`/products/${id}`),
  createProduct: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),

  // POS & Sales
  checkoutSale: (saleData: any) => request<any>('/pos/checkout', { method: 'POST', body: JSON.stringify(saleData) }),
  getSales: (params: { branchId?: string; startDate?: string; endDate?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.branchId) query.set('branchId', params.branchId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.search) query.set('search', params.search);
    return request<any[]>(`/sales?${query.toString()}`);
  },
  getSaleById: (id: string) => request<any>(`/sales/${id}`),
  returnSale: (returnData: any) => request<any>('/sales/return', { method: 'POST', body: JSON.stringify(returnData) }),

  // Suppliers & Purchases
  getSuppliers: () => request<any[]>('/suppliers'),
  createSupplier: (data: any) => request<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  getPurchases: () => request<any[]>('/purchases'),
  createPurchase: (data: any) => request<any>('/purchases', { method: 'POST', body: JSON.stringify(data) }),

  // Customers
  getCustomers: () => request<any[]>('/customers'),
  createCustomer: (data: any) => request<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  collectCustomerPayment: (data: any) => request<any>('/customers/payment', { method: 'POST', body: JSON.stringify(data) }),
  getCustomerStatement: (id: string) => request<any>(`/customers/${id}/statement`),

  // Expenses & Cash
  getExpenses: () => request<any[]>('/expenses'),
  createExpense: (data: any) => request<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  getActiveCashSession: () => request<any>('/cash-sessions/active'),
  openCashSession: (data: any) => request<any>('/cash-sessions/open', { method: 'POST', body: JSON.stringify(data) }),
  closeCashSession: (data: any) => request<any>('/cash-sessions/close', { method: 'POST', body: JSON.stringify(data) }),

  // Inventory
  getInventoryMovements: () => request<any[]>('/inventory/movements'),
  adjustInventory: (data: any) => request<any>('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),

  // Accounting
  getProfitAndLoss: (params: { startDate?: string; endDate?: string; branchId?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.branchId) query.set('branchId', params.branchId);
    return request<any>(`/accounting/profit-loss?${query.toString()}`);
  },

  // AI
  askAIAdvisor: (query: string) => request<{ response: string }>('/ai/advisor', { method: 'POST', body: JSON.stringify({ query }) }),
  scanInvoiceAI: (imageBase64: string, mimeType = 'image/jpeg') =>
    request<any>('/ai/scan-invoice', { method: 'POST', body: JSON.stringify({ imageBase64, mimeType }) }),

  // Settings & Backups
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  createBackup: () => request<any>('/system/backup', { method: 'POST' }),
  listBackups: () => request<any[]>('/system/backups'),
  restoreBackup: (backupFileName: string) => request<any>('/system/restore', { method: 'POST', body: JSON.stringify({ backupFileName }) }),

  // Subscriptions, Pricing & Campaigns
  getSubscriptionState: () => request<any>('/subscriptions/state'),
  claimLaunchOffer: () => request<any>('/subscriptions/claim-launch-offer', { method: 'POST' }),
  subscribePlan: (data: { planId: string; billingPeriod?: 'monthly' | 'yearly'; paymentMethod?: string; appliedCampaignId?: string }) =>
    request<any>('/subscriptions/subscribe', { method: 'POST', body: JSON.stringify(data) }),
  cancelSubscription: (reasonAr?: string) =>
    request<any>('/subscriptions/cancel', { method: 'POST', body: JSON.stringify({ reasonAr }) }),
  renewSubscription: () => request<any>('/subscriptions/renew', { method: 'POST' }),
  updateCampaignAdmin: (campaignId: string, data: any) =>
    request<any>(`/subscriptions/admin/campaigns/${campaignId}`, { method: 'PUT', body: JSON.stringify(data) }),
  updatePlanPriceAdmin: (planId: string, priceUSD: number) =>
    request<any>(`/subscriptions/admin/plans/${planId}`, { method: 'PUT', body: JSON.stringify({ priceUSD }) }),
};

