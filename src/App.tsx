/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { LoginScreen } from './components/auth/LoginScreen';
import { POSScreen } from './components/pos/POSScreen';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { ProductsScreen } from './components/products/ProductsScreen';
import { PurchasesScreen } from './components/purchases/PurchasesScreen';
import { InventoryScreen } from './components/inventory/InventoryScreen';
import { CustomersScreen } from './components/customers/CustomersScreen';
import { SuppliersScreen } from './components/suppliers/SuppliersScreen';
import { ExpensesScreen } from './components/expenses/ExpensesScreen';
import { CashManagementScreen } from './components/cashier/CashManagementScreen';
import { AccountingScreen } from './components/accounting/AccountingScreen';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { AIAssistantScreen } from './components/ai/AIAssistantScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { PricingScreen } from './components/subscription/PricingScreen';
import { AndroidDeviceFrame } from './components/android/AndroidDeviceFrame';
import { AndroidBarcodeScanner } from './components/android/AndroidBarcodeScanner';
import { AndroidDrawer } from './components/android/AndroidDrawer';
import { AndroidInstallModal } from './components/android/AndroidInstallModal';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { HaseboLogo } from './components/brand/HaseboLogo';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const {
    activeTab,
    androidViewMode,
    setAndroidViewMode,
    isScannerOpen,
    setIsScannerOpen,
    isDrawerOpen,
    setIsDrawerOpen,
    isInstallModalOpen,
    setIsInstallModalOpen,
    isSubscriptionModalOpen,
    setIsSubscriptionModalOpen,
    triggerBarcodeScan,
  } = useStore();

  // ⭐ الحماية القصوى ضد الشاشة الداكنة والـ Loading المعلق (Fail-Safe Timeout)
  // إذا استمرت شاشة التحميل لأكثر من 12 ثانية → نوقفها قسراً ونعرض شاشة الدخول
  // (هذا يحل مشكلة "الشاشة الداكنة" تماماً حتى لو حصل أي خطأ غير متوقع)
  const [failSafeLoading, setFailSafeLoading] = useState<boolean>(true);
  const hasFailSafeFired = useRef<boolean>(false);
  const [failSafeMessage, setFailSafeMessage] = useState<string>('جاري تهيئة منظومة حاسبو الذكية...');

  useEffect(() => {
    // إذا توقف الـ Loading الأصلي، نوقف الحماية أيضاً
    if (!isLoading) {
      setFailSafeLoading(false);
      return;
    }

    // التحديث التدريجي للرسالة للمستخدم (ينفي الوهم أن الشاشة تجمدت)
    const msgTimer1 = setTimeout(() => {
      if (isLoading) setFailSafeMessage('جاري تحميل بيانات الجلسة... (إذا استغرق وقتاً طويلاً سندخل في وضع التجريب تلقائياً)');
    }, 4000);

    const msgTimer2 = setTimeout(() => {
      if (isLoading) setFailSafeMessage('يبدو أن الاتصال بالخادم بطيء... يتم التجهيز للدخول في وضع التجريب المحلي...');
    }, 8000);

    // ⭐ الحماية القصوى: بعد 12 ثانية نوقف الـ Loading قسراً
    const failSafeTimer = setTimeout(() => {
      if (hasFailSafeFired.current) return;
      hasFailSafeFired.current = true;
      console.warn('[APP] ⚠️ FAIL-SAFE: تجاوزت مدة التحميل 12 ثانية. إيقاف التحميل قسراً لمنع الشاشة الداكنة.');
      setFailSafeLoading(false);
    }, 12000);

    return () => {
      clearTimeout(msgTimer1);
      clearTimeout(msgTimer2);
      clearTimeout(failSafeTimer);
    };
  }, [isLoading]);

  // نستخدم النتيجة النهائية: إما الـ Loading الأصلي أو الحماية القصوى
  const showLoading = isLoading && failSafeLoading;

  console.log('[APP] MainLayout render - isLoading:', isLoading, 'failSafe:', failSafeLoading, 'user:', user);

  if (showLoading) {
    console.log('[APP] Showing loading screen');
    return (
      <div className="min-h-screen bg-[#07111F] flex flex-col items-center justify-center text-slate-100 font-sans p-6 relative overflow-hidden" dir="rtl">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4A72C]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center gap-6 z-10 animate-fade-in">
          <HaseboLogo variant="splash" size="xl" withContainer showTagline showEnglishTagline />
          <div className="flex items-center gap-3 mt-4 text-xs font-semibold text-slate-400 max-w-xs text-center leading-relaxed">
            <div className="w-5 h-5 border-2 border-[#D4A72C]/30 border-t-[#D4A72C] rounded-full animate-spin shrink-0" />
            <span>{failSafeMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[APP] Showing login screen');
    return <LoginScreen />;
  }

  console.log('[APP] Showing home screen');

  const appContent = (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans w-full h-full relative" dir="rtl">
      {/* Top Application Header */}
      <Header />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Desktop view) */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Dynamic View Area */}
        <main className="flex-1 bg-slate-950 overflow-y-auto pb-16 lg:pb-0">
          {activeTab === 'pos' && <POSScreen />}
          {activeTab === 'dashboard' && <DashboardScreen />}
          {activeTab === 'subscription' && <PricingScreen />}
          {activeTab === 'products' && <ProductsScreen />}
          {activeTab === 'purchases' && <PurchasesScreen />}
          {activeTab === 'inventory' && <InventoryScreen />}
          {activeTab === 'customers' && <CustomersScreen />}
          {activeTab === 'suppliers' && <SuppliersScreen />}
          {activeTab === 'expenses' && <ExpensesScreen />}
          {activeTab === 'cash_register' && <CashManagementScreen />}
          {activeTab === 'accounting' && <AccountingScreen />}
          {activeTab === 'reports' && <ReportsScreen />}
          {activeTab === 'ai_assistant' && <AIAssistantScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </main>
      </div>

      {/* Navigation Bar (Mobile / Android) */}
      <div className="block lg:hidden">
        <BottomNav />
      </div>

      {/* Android Native Navigation Drawer */}
      <AndroidDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
      />

      {/* Android Barcode Camera Scanner */}
      <AndroidBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => {
          triggerBarcodeScan(code);
          setIsScannerOpen(false);
        }}
      />

      {/* Android PWA Install Guide Modal */}
      <AndroidInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Subscription Plan Modal (5 USD / Month) */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </div>
  );

  return (
    <AndroidDeviceFrame
      viewMode={androidViewMode}
      onViewModeChange={setAndroidViewMode}
      onOpenScanner={() => setIsScannerOpen(true)}
      onOpenInstallModal={() => setIsInstallModalOpen(true)}
    >
      {appContent}
    </AndroidDeviceFrame>
  );
};

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔴 HASEBO CRASH SHIELD — درع حاسوبو ضد الانهيارات التامة        ║
// ║  هذه الطبقة الأخيرة تعمل حتى لو انهار React كلياً                 ║
// ╚══════════════════════════════════════════════════════════════════╝

// ⭐⭐⭐ 1) معالج أخطاء عالمي OUTSIDE React (يعمل حتى لو انهار React كلياً)
// يلتقط أخطاء JS غير المتوقعة وأخطاء Promises التي لا معالج لها
// ويعرض رسالة بسيطة على المستخدم بدلاً من الشاشة البيضاء/الداكنة الفارغة
(function installGlobalCrashShield() {
  if (typeof window === 'undefined') return;
  if ((window as any).__HASEBO_CRASH_SHIELD_INSTALLED__) return;
  (window as any).__HASEBO_CRASH_SHIELD_INSTALLED__ = true;

  const showFatalErrorOverlay = (title: string, detail: string) => {
    try {
      // إذا كان لا يزال هناك React mount، حاول إيقاف أي Loading عبر متغير عالمي
      (window as any).__HASEBO_FORCE_STOP_LOADING__ = true;
      // إنشاء عنصر DOM مباشرة بدلاً من الاعتماد على React
      let overlay = document.getElementById('hasebo-fatal-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'hasebo-fatal-overlay';
        overlay.setAttribute(
          'style',
          'position:fixed;inset:0;background:#07111F;z-index:999999;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;color:#f1f5f9;direction:rtl;',
        );
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = `
        <div style="max-width:420px;width:100%;background:#0B1424;border:1px solid rgba(212,167,44,0.35);border-radius:20px;padding:28px;box-shadow:0 25px 60px rgba(0,0,0,0.6);text-align:center;">
          <div style="font-size:44px;margin-bottom:12px;">⚠️</div>
          <div style="font-size:18px;font-weight:800;color:#E0B43C;margin-bottom:8px;">${title}</div>
          <div style="font-size:13px;line-height:1.8;color:#94a3b8;margin-bottom:20px;">
            حدث خطأ غير متوقع. اضغط على الزر أدناه لإعادة تشغيل التطبيق،
            <br/>أو أغلق التطبيق من الخلفية وافتحه مرة أخرى.
          </div>
          <div style="background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.25);border-radius:14px;padding:12px;margin-bottom:22px;font-size:11px;direction:ltr;text-align:left;word-break:break-all;color:#fda4af;max-height:110px;overflow:auto;">
            ${detail.length > 500 ? detail.slice(0, 500) + '…' : detail}
          </div>
          <button onclick="location.reload()" style="background:#D4A72C;color:#0B1424;border:none;padding:13px 22px;border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(212,167,44,0.35);">
            🔄 إعادة تشغيل التطبيق الآن
          </button>
        </div>
      `;
    } catch (e) {
      // الملاذ الأخير: محاولة تحديث الصفحة
      try { location.reload(); } catch {}
    }
  };

  window.addEventListener('error', (event) => {
    const msg = event?.message || event?.error?.message || String(event || 'خطأ غير معروف');
    const stack = event?.error?.stack || '';
    console.error('[CRASH SHIELD] window.onerror:', msg, stack);
    // تجاهل أخطاء الطرف الثالث غير الحاسمة (Capacitor plugins, analytics...)
    if (/ResizeObserver|Loading chunk|ChunkLoadError|script error/i.test(msg) && !/hasebo|authcontext|app\.tsx|login/i.test(msg + stack)) {
      return;
    }
    setTimeout(() => showFatalErrorOverlay('تعذر متابعة التطبيق', `${msg}\n${stack}`), 50);
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    let reason = '';
    try { reason = String(event?.reason || ''); } catch {}
    const stack = (event?.reason as any)?.stack || '';
    console.error('[CRASH SHIELD] unhandledrejection:', reason, stack);
    // تجاهل أخطاء شبكة عادية لأن الـ Fallback سيتعامل معها
    if (/NetworkError|Failed to fetch|ERR_|net::|timeout|AbortError|HTTPError|FetchError/i.test(reason) &&
        !/cannot read|undefined is not|null is not|is not a function/i.test(reason + stack)) {
      return;
    }
    setTimeout(() => showFatalErrorOverlay('حدث خطأ غير متوقع', `${reason}\n${stack}`), 50);
  }, true);

  // ⭐⭐⭐ آخر خط دفاع: بعد 20 ثانية، إذا ما زالت الشاشة فارغة أو لا توجد عناصر
  // (يعني React غالباً انهار قبل أن يرسم أي شيء) — نعرض صفحة الخطأ
  setTimeout(() => {
    try {
      const hasContent =
        document.body &&
        (document.body.innerText || '').trim().length > 30 &&
        document.querySelectorAll('button,input,[class*="Logo"],[class*="Login"]').length > 0;
      if (!hasContent) {
        showFatalErrorOverlay(
          'التطبيق تجمد أثناء التحميل',
          'لم يتمكن التطبيق من عرض شاشة الدخول خلال 20 ثانية. قد يكون هناك خطأ في بناء الملفات. اضغط لإعادة التشغيل.',
        );
      }
    } catch {}
  }, 20000);
})();

// ⭐⭐⭐ 2) React Error Boundary — يلتقط أخطاء التصوير داخل شجرة React
class CrashBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string; stack: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '', stack: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error: error?.message || String(error || 'خطأ غير معروف'),
      stack: error?.stack || '',
    };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('[CRASH BOUNDARY] React render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07111F] flex items-center justify-center p-6 text-slate-100 font-sans" dir="rtl">
          <div className="w-full max-w-md bg-[#0B1424] border border-[#D4A72C]/35 rounded-2xl p-8 shadow-2xl shadow-black/60 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <div className="text-xl font-extrabold text-[#E0B43C] mb-3">تعذر عرض هذه الصفحة</div>
            <div className="text-sm leading-7 text-slate-400 mb-5">
              حدث خطأ في عرض واجهة التطبيق. اضغط على الزر أدناه لإعادة تشغيل التطبيق.
            </div>
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3 mb-6 text-xs text-rose-300 text-left direction-ltr overflow-auto max-h-28" style={{ direction: 'ltr', textAlign: 'left', wordBreak: 'break-all' as any }}>
              {this.state.error}
              {this.state.stack ? `\n\n${this.state.stack.slice(0, 300)}` : ''}
            </div>
            <button
              onClick={() => location.reload()}
              className="bg-[#D4A72C] hover:bg-[#E0B43C] text-[#0B1424] px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[#D4A72C]/30 transition-all"
            >
              🔄 إعادة تشغيل التطبيق الآن
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <CrashBoundary>
      <AuthProvider>
        <CurrencyProvider>
          <StoreProvider>
            <MainLayout />
          </StoreProvider>
        </CurrencyProvider>
      </AuthProvider>
    </CrashBoundary>
  );
}
