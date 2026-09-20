/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, Fingerprint, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  authenticateWithHardwareBiometrics,
  triggerHapticFeedback,
  type BiometricAuthResult,
} from '../../services/biometrics';

interface BiometricAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (type: 'fingerprint', username: string) => void;
  targetUsername?: string;
}

type StatusPhase = 'scanning' | 'success' | 'error' | 'unsupported';

export const BiometricAuthModal: React.FC<BiometricAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetUsername = 'admin',
}) => {
  const [phase, setPhase] = useState<StatusPhase>('scanning');
  const [lastError, setLastError] = useState<string>('');
  const [isRealHardware, setIsRealHardware] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPhase('scanning');
      setLastError('');
      setIsRealHardware(false);
      triggerNativeBiometric();
    }
  }, [isOpen]);

  const triggerNativeBiometric = async () => {
    try {
      const result: BiometricAuthResult = await authenticateWithHardwareBiometrics(targetUsername);
      setIsRealHardware(result.isRealHardware);

      if (result.success) {
        triggerHapticFeedback([60, 40, 80]);
        setPhase('success');
        setTimeout(() => {
          onSuccess('fingerprint', targetUsername);
        }, 350);
      } else {
        triggerHapticFeedback([120, 80, 120]);
        setLastError(
          result.error ||
            result.errorCode ||
            'فشلت المصادقة البيومترية'
        );
        setPhase(result.isRealHardware ? 'error' : 'unsupported');
      }
    } catch (error: any) {
      triggerHapticFeedback([120, 80, 120]);
      setLastError(error?.message || 'فشلت المصادقة البيومترية');
      setPhase('error');
    }
  };

  if (!isOpen) return null;

  const statusIcon = () => {
    switch (phase) {
      case 'success':
        return <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-[pop_0.3s_ease-out]" />;
      case 'error':
        return <AlertTriangle className="w-16 h-16 text-amber-400" />;
      case 'unsupported':
        return <Fingerprint className="w-16 h-16 text-slate-500 opacity-70" />;
      default:
        return (
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <Fingerprint className="w-10 h-10 text-emerald-400" />
          </div>
        );
    }
  };

  const statusTitle = () => {
    switch (phase) {
      case 'success':
        return 'تمت المصادقة بنجاح ✅';
      case 'error':
        return 'فشلت المصادقة';
      case 'unsupported':
        return 'غير متوفر على المتصفح';
      default:
        return 'جارٍ تشغيل مستشعر البصمات...';
    }
  };

  const statusSubtitle = () => {
    if (phase === 'scanning') {
      return isRealHardware
        ? 'ضع إصبعك على مستشعر البصمة في جهازك الآن'
        : 'تم الإرسال إلى مستشعر الجهاز...';
    }
    if (phase === 'success') return 'جارٍ تسجيل الدخول إلى حاسبو';
    if (phase === 'unsupported') return 'استخدم تطبيق الأندرويد الأصلي (APK) لتعمل المصادقة.';
    return lastError;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none" dir="rtl">
      <div className="relative w-full max-w-sm bg-[#1A2230] border border-slate-700/60 rounded-2xl p-6 shadow-2xl text-right space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white tracking-wide">
              {statusTitle()}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              تطبيق حاسبو • الحساب:{' '}
              <span className="text-emerald-400 font-semibold">
                {targetUsername || 'admin'}
              </span>
            </p>
            {phase !== 'scanning' && (
              <p className={`text-[11px] mt-1 ${isRealHardware ? 'text-emerald-400/90' : 'text-amber-400/90'}`}>
                {isRealHardware
                  ? '🔐 مستشعر بصمة الإصبع الأصلي'
                  : '⚠️ لا يعمل إلا في تطبيق الأندرويد (APK)'}
              </p>
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer transition"
               onClick={onClose}>
            <X className="w-4 h-4" />
          </div>
        </div>

        {/* Icon + Caption */}
        <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center">
          {statusIcon()}
          <p className={`text-xs leading-relaxed ${phase === 'error' || phase === 'unsupported' ? 'text-amber-300/90' : phase === 'success' ? 'text-emerald-300/90' : 'text-slate-300'}`}>
            {statusSubtitle()}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            مسموح فقط ببصمة الإصبع • بصمة الوجه ملغاة تماماً
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
          {(phase === 'error' || phase === 'unsupported') && (
            <button
              type="button"
              onClick={() => {
                setPhase('scanning');
                setLastError('');
                triggerNativeBiometric();
              }}
              className="w-full text-xs font-semibold text-white px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition cursor-pointer shadow-lg shadow-emerald-900/40"
            >
              إعادة المحاولة
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full text-xs font-semibold text-slate-400 hover:text-white px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            إلغاء / تسجيل الدخول بكلمة المرور
          </button>
        </div>

        {/* Shield decoration */}
        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
      </div>
    </div>
  );
};
