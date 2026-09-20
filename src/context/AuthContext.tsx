/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, clearAuthToken, getAuthToken } from '../services/api';
import type {
  User,
  Role,
  Branch,
  PermissionKey,
  StoreSettings,
  CurrencyConfig,
  StoreSubscription,
} from '../types';

interface AuthContextType {
  user: User | null;
  role: Role | null;
  currentBranch: Branch | null;
  settings: StoreSettings | null;
  currencies: CurrencyConfig[];
  subscription: StoreSubscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { username: string; password: string; branchId?: string }) => Promise<void>;
  logout: () => void;
  switchBranch: (branchId: string) => Promise<void>;
  can: (permission: PermissionKey) => boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALL_PERMISSIONS: PermissionKey[] = [
  'pos.access', 'pos.discount', 'pos.credit_sale', 'pos.refund',
  'products.view', 'products.create', 'products.edit', 'products.delete', 'products.cost_view',
  'inventory.view', 'inventory.adjust', 'inventory.stocktake',
  'purchases.view', 'purchases.create', 'purchases.edit',
  'customers.view', 'customers.create', 'customers.edit', 'customers.collect_debt',
  'suppliers.view', 'suppliers.create', 'suppliers.pay',
  'expenses.view', 'expenses.create',
  'cash_register.view', 'cash_register.manage',
  'accounting.view',
  'reports.view', 'reports.export',
  'users.manage', 'branches.manage',
  'settings.manage',
  'ai.assistant', 'ai.ocr',
];

interface DemoAccount {
  password: string;
  roleName: Role['name'];
  label: string;
}

const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  admin: {
    password: 'admin123',
    roleName: 'SUPER_ADMIN',
    label: 'المدير العام',
  },
  manager: {
    password: 'manager123',
    roleName: 'BRANCH_MANAGER',
    label: 'مدير الفرع',
  },
  accountant: {
    password: 'accountant123',
    roleName: 'ACCOUNTANT',
    label: 'المحاسب',
  },
  cashier: {
    password: 'cashier123',
    roleName: 'CASHIER',
    label: 'أمين الصندوق',
  },
  inventory: {
    password: 'inventory123',
    roleName: 'INVENTORY_MANAGER',
    label: 'مدير المخزون',
  },
};

function buildRole(roleName: Role['name']): Role {
  const labelsAr: Record<Role['name'], string> = {
    SUPER_ADMIN: 'المدير العام للنظام',
    BRANCH_MANAGER: 'مدير الفرع',
    ACCOUNTANT: 'محاسب',
    CASHIER: 'كاشير / أمين صندوق',
    INVENTORY_MANAGER: 'مدير المخزون والمخازن',
  };
  const descriptionsAr: Record<Role['name'], string> = {
    SUPER_ADMIN: 'يمتلك كافة الصلاحيات على جميع الفروع والأقسام',
    BRANCH_MANAGER: 'يدير عمليات الفرع اليومية والموظفين والمخزون',
    ACCOUNTANT: 'يطبع التقارير المالية ويسجل المصاريف والمستحقات',
    CASHIER: 'يقوم بمبيعات نقطة البيع واستلام النقد والتحصيل من العملاء',
    INVENTORY_MANAGER: 'يتابع حركة المخزون والجرد الدوري والاستلام من الموردين',
  };
  let permissions: PermissionKey[] = [];
  switch (roleName) {
    case 'SUPER_ADMIN':
      permissions = ALL_PERMISSIONS;
      break;
    case 'BRANCH_MANAGER':
      permissions = ALL_PERMISSIONS.filter(p => p !== 'users.manage' && p !== 'branches.manage' && p !== 'settings.manage');
      break;
    case 'ACCOUNTANT':
      permissions = ALL_PERMISSIONS.filter(p =>
        !p.startsWith('products.') || p === 'products.view' || p === 'products.cost_view'
      ).filter(p =>
        !['users.manage', 'branches.manage', 'settings.manage'].includes(p)
      );
      break;
    case 'CASHIER':
      permissions = [
        'pos.access', 'pos.discount',
        'products.view',
        'inventory.view',
        'customers.view', 'customers.collect_debt',
        'suppliers.view',
        'expenses.view',
        'cash_register.view',
        'reports.view',
      ];
      break;
    case 'INVENTORY_MANAGER':
      permissions = [
        'products.view', 'products.create', 'products.edit',
        'inventory.view', 'inventory.adjust', 'inventory.stocktake',
        'purchases.view', 'purchases.create', 'purchases.edit',
        'suppliers.view', 'suppliers.create',
      ];
      break;
  }
  return {
    id: `role_${roleName.toLowerCase()}`,
    name: roleName,
    labelAr: labelsAr[roleName],
    labelEn: roleName.replace(/_/g, ' '),
    descriptionAr: descriptionsAr[roleName],
    permissions,
    isSystem: true,
  };
}

const DEMO_BRANCH: Branch = {
  id: 'branch_main_01',
  nameAr: 'الفرع الرئيسي - حاسبو',
  nameEn: 'Hasebo Main Branch',
  code: 'BR-001',
  phone: '+967-1-000000',
  addressAr: 'الجمهورية اليمنية - صنعاء - شارع الزبيري',
  isMain: true,
  isActive: true,
  taxNumber: 'YE-000-0000000',
  receiptHeaderAr: 'متجر حاسبو للتجارة العامة',
  receiptFooterAr: 'شكراً لزيارتكم، نرجو تزورنا دائماً',
  createdAt: new Date().toISOString(),
};

const DEMO_SETTINGS: StoreSettings = {
  storeNameAr: 'سوبرماركت حاسبو',
  storeNameEn: 'Hasebo Supermarket',
  commercialRegNo: 'CR-YEMEN-12345',
  taxNumber: 'YE-TAX-9988776',
  phone: '+967777777777',
  email: 'info@hasebo.local',
  addressAr: 'صنعاء - شارع 60 متر',
  baseCurrency: 'YER',
  enableTax: true,
  defaultTaxRate: 5,
  isTaxInclusive: true,
  expiryWarningDays: 30,
  lowStockGlobalThreshold: 10,
  enableCustomerCreditLimit: true,
  creditLimitAction: 'warn',
  receiptPrinterType: '80mm',
  receiptHeaderMessageAr: 'أهلاً بكم في سوبرماركت حاسبو',
  receiptFooterMessageAr: 'جميع الحقوق محفوظة © حاسبو ERP',
  allowNegativeStock: false,
  costingMethod: 'WEIGHTED_AVG',
  autoBackupIntervalHours: 6,
  offlineSyncEnabled: true,
};

const DEMO_CURRENCIES: CurrencyConfig[] = [
  { code: 'YER', nameAr: 'ريال يمني', nameEn: 'Yemeni Rial', symbol: 'ر.ي', exchangeRateToYER: 1, isBase: true, decimalPlaces: 0 },
  { code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: 'ر.س', exchangeRateToYER: 140, isBase: false, decimalPlaces: 2 },
  { code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$', exchangeRateToYER: 535, isBase: false, decimalPlaces: 2 },
  { code: 'AED', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', symbol: 'د.إ', exchangeRateToYER: 145, isBase: false, decimalPlaces: 2 },
  { code: 'EGP', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', symbol: 'ج.م', exchangeRateToYER: 17, isBase: false, decimalPlaces: 2 },
];

function buildDemoUser(username: string, roleName: Role['name'], fullName: string): User {
  const now = new Date().toISOString();
  return {
    id: `user_${username}_demo`,
    username,
    fullName,
    email: `${username}@hasebo.local`,
    phone: '+967770001000',
    roleId: `role_${roleName.toLowerCase()}`,
    branchIds: [DEMO_BRANCH.id],
    currentBranchId: DEMO_BRANCH.id,
    isActive: true,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyConfig[]>([]);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const applyOfflineDemoSession = (username: string) => {
    try {
      const account = DEMO_ACCOUNTS[username];
      if (!account) return false;
      const builtRole = buildRole(account.roleName);
      const builtUser = buildDemoUser(username, account.roleName, account.label);
      setUser(builtUser);
      setRole(builtRole);
      setCurrentBranch(DEMO_BRANCH);
      setSettings(DEMO_SETTINGS);
      setCurrencies(DEMO_CURRENCIES);
      console.warn(`[AUTH] يعمل التطبيق بوضع التجريب المحلي باستخدام الحساب: ${username}`);
      return true;
    } catch (e) {
      console.error('[AUTH] ❌ applyOfflineDemoSession فشلت مع خطأ داخلي:', e);
      return false;
    }
  };

  const resetAuthState = () => {
    try {
      clearAuthToken();
    } catch {}
    setUser(null);
    setRole(null);
    setCurrentBranch(null);
    setSettings(null);
    setCurrencies([]);
    setSubscription(null);
  };

  const refreshUserData = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        resetAuthState();
        return;
      }

      if (token.startsWith('offline_token_')) {
        const username = token.replace('offline_token_', '');
        const applied = applyOfflineDemoSession(username);
        if (!applied) resetAuthState();
        return;
      }

      const res = await api.getMe();
      setUser(res.user as User);
      setRole(res.role as Role);
      setCurrentBranch(res.branch as Branch);
      setSettings(res.settings as StoreSettings);
      setCurrencies(Array.isArray(res.currencies) ? (res.currencies as CurrencyConfig[]) : []);
      setSubscription((res.subscription as StoreSubscription | null) || null);
    } catch (err: any) {
      console.warn('[AUTH] فشل استرجاع الجلسة من الخادم، إنهاء الجلسة:', err?.message || err);
      resetAuthState();
    } finally {
      // ضمان إيقاف التحميل مهما حصل (فشل / استثناء غير متوقع / نجاح)
      try {
        setIsLoading(false);
      } catch {}
    }
  };

  useEffect(() => {
    let cancelled = false;

    // ⭐⭐⭐ الحماية القصوى من مستوى AuthProvider (تعمل حتى لو انهار React جزئياً)
    // بعد 15 ثانية، إذا ما زال isLoading = true → أوقفه قسراً.
    const hardStopTimer = window.setTimeout(() => {
      if (!cancelled) {
        console.warn('[AUTH] ⚠️ AUTH HARD STOP TIMEOUT: تجاوز التحميل 15 ثانية، إيقاف التحميل قسراً.');
        try { setIsLoading(false); } catch {}
      }
    }, 15000);

    (async () => {
      try {
        const token = getAuthToken();
        if (token) {
          await refreshUserData();
        } else {
          try { setIsLoading(false); } catch {}
        }
      } catch (e) {
        console.error('[AUTH] ❌ استثناء غير متوقع أثناء تهيئة الجلسة الأولية:', e);
        try { setIsLoading(false); } catch {}
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(hardStopTimer);
    };
  }, []);

  const login = async (credentials: { username: string; password: string; branchId?: string }) => {
    console.log('[AUTH] بدء تسجيل الدخول للمستخدم:', credentials.username);
    setIsLoading(true);

    try {
      const localAccount = DEMO_ACCOUNTS[credentials.username];
      const isLocalPasswordMatch = !!localAccount && localAccount.password === credentials.password;

      // ⭐ دخول فوري DEMO على الأندرويد بدون IP محدد + حساب تجريب
      let isCapacitor = false;
      try {
        isCapacitor = typeof window !== 'undefined' &&
          (typeof (window as any).Capacitor !== 'undefined' ||
            /Android|iPhone|iPad|iPod/i.test(navigator?.userAgent || ''));
      } catch {}

      let hasCustomApiBase = false;
      try {
        hasCustomApiBase = typeof localStorage !== 'undefined' &&
          !!localStorage.getItem('hasebo_custom_api_base');
      } catch {}

      let envHasApiBase = false;
      try {
        envHasApiBase = !!(import.meta.env.VITE_API_BASE_URL || '').trim();
      } catch {}

      if (isCapacitor && !hasCustomApiBase && !envHasApiBase && isLocalPasswordMatch) {
        console.warn('[AUTH] بيئة أندرويد بدون خادم + حساب تجريب → دخول فوري لوضع DEMO.');
        const ok = applyOfflineDemoSession(credentials.username);
        if (ok) {
          try { setAuthToken('offline_token_' + credentials.username); } catch {}
          return;
        }
      }

      const res = await api.login(credentials);
      setAuthToken(res.token);
      setUser(res.user as User);
      setRole(res.role as Role);
      setCurrentBranch(res.branch as Branch);
      setSettings(res.settings as StoreSettings);
      setCurrencies(Array.isArray(res.currencies) ? (res.currencies as CurrencyConfig[]) : []);
      setSubscription((res.subscription as StoreSubscription | null) || null);
      console.log('[AUTH] تسجيل دخول ناجح من الخادم للمستخدم:', res.user?.username || credentials.username);
      return;
    } catch (err: any) {
      const errorMsg = (err?.message || String(err || '')).toLowerCase();
      const errorStack = (err?.stack || '').toLowerCase();

      const isNetworkLikeError =
        !err ||
        errorMsg.length === 0 ||
        /failed to fetch|networkerror|fetch failed|load failed|unable to load|timeout|timed?\s*out|request failed|abort|aborted|cors|cross.origin|econnrefused|connection refused|connection reset|connection closed|cannot|can not|unable to reach|cannot reach|host is unreachable|network is unreachable|no address associated with hostname|dns|dns\s*lookup|name not resolved|net::|err_|chrome_error|webconsole|لا يمكن|غير قادر|تعذر الاتصال|تعذر الوصول|اتصال|شبكة|انقطع|مقطوع|غير متصل|لا يوجد اتصال|server not found|server unavailable|service unavailable|bad gateway|gateway timeout|502|503|504|404|408|400|401|403|4\d\d|5\d\d|socket|protocol|mixed content|http|ssl|tls|secure connection/i.test(errorMsg) ||
        /failed to fetch|networkerror|fetch failed|econnrefused|err_|net::|chrome_error|timeout/i.test(errorStack);

      const localAccount = DEMO_ACCOUNTS[credentials.username];
      const isLocalPasswordMatch = !!localAccount && localAccount.password === credentials.password;

      console.warn(
        `[AUTH] فشل تسجيل الدخول من الخادم (خطأ: ${errorMsg || 'غير معروف'}). محاولة وضع التجريب المحلي...`,
      );

      if (isLocalPasswordMatch) {
        const ok = applyOfflineDemoSession(credentials.username);
        if (ok) {
          try { setAuthToken('offline_token_' + credentials.username); } catch {}
          console.warn(`[AUTH] ✅ تم تسجيل الدخول في وضع التجريب المحلي للمستخدم: ${credentials.username}`);
          return;
        }
      }

      if (isNetworkLikeError && !isLocalPasswordMatch) {
        throw new Error('تعذر الاتصال بالخادم. تأكد من تشغيل الخادم على نفس شبكة الـ Wi-Fi أو استخدم حساب تجريب (admin/admin123).');
      }

      throw err;
    } finally {
      // ⭐⭐⭐ هذا هو الحل السحري — واحد فقط يلتف على كل شيء
      // مهما حصل: نجاح / فشل / ربح خطأ / استثناء خارج الـ try / return مبكر من DEMO السريع
      // هذا السطر سينفذ دائماً وسيوقف التحميل.
      try {
        console.log('[AUTH] finally: إيقاف isLoading قسراً = false');
        setIsLoading(false);
      } catch (e) {
        console.error('[AUTH] ❌ حتى finally فشلت في إيقاف التحميل. خطأ لا يصدق:', e);
      }
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setRole(null);
    setCurrentBranch(null);
    setSettings(null);
    setCurrencies([]);
    setSubscription(null);
  };

  const switchBranch = async (branchId: string) => {
    try {
      const res = await api.switchBranch(branchId);
      if (res.success) {
        setCurrentBranch(res.branch as Branch);
        setUser(prev => (prev ? { ...prev, currentBranchId: branchId } : prev));
      }
    } catch (err: any) {
      if (currentBranch?.id === branchId) return;
      console.warn('[AUTH] فشل تبديل الفرع عبر الخادم:', err?.message || err);
    }
  };

  const can = (permission: PermissionKey): boolean => {
    if (!role) return false;
    if (role.name === 'SUPER_ADMIN') return true;
    return role.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        currentBranch,
        settings,
        currencies,
        subscription,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        switchBranch,
        can,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
