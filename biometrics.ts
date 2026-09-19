/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ⭐ الطريقة الرسمية في Capacitor 7 لتسجيل البلوجينات (الأضمن عمل البصمة 100%)
// هذه هي الطريقة الرسمية التي تضمن عمل البلوجين دائماً بغض النظر عن متوفر window.Capacitor.Plugins
import { registerPlugin } from '@capacitor/core';

interface NativeBiometricPluginInterface {
  authenticate(): Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    type: string;
    isRealHardware: boolean;
  }>;
  canAuthenticate(): Promise<{
    available: boolean;
    fingerprintAvailable: boolean;
    faceAvailable: boolean;
    isRealHardware: boolean;
    hardwareBlocked: boolean;
    hasEnrolledFingerprints: boolean;
    primarySensor: string;
  }>;
  getSensorInfo(): Promise<any>;
}

// ✅ تسجيل رسمي للبلوجين الإسم مطابق لـ @CapacitorPlugin(name = "NativeBiometric") في الكوتلن
const NativeBiometricRegistered = registerPlugin<NativeBiometricPluginInterface>(
  'NativeBiometric',
  {
    web: () =>
      Promise.resolve({
        default: {
          async authenticate() {
            return {
              success: false,
              error: 'يعمل فقط على تطبيق الأندرويد APK الأصلي',
              type: 'fingerprint',
              isRealHardware: false,
            };
          },
          async canAuthenticate() {
            return {
              available: false,
              fingerprintAvailable: false,
              faceAvailable: false,
              isRealHardware: false,
              hardwareBlocked: false,
              hasEnrolledFingerprints: false,
              primarySensor: 'none',
            };
          },
          async getSensorInfo() {
            return null;
          },
        },
      }) as any,
  }
);

export interface BiometricCapability {
  supported: boolean;
  hasPlatformAuth: boolean;
  fingerprintAvailable: boolean;
  hasEnrolledFingerprints: boolean;
  isRealHardware: boolean;
  primarySensor: 'fingerprint' | 'face' | 'iris' | 'none';
  hardwareBlocked: boolean;
}

export interface BiometricSupportResult {
  isAvailable: boolean;
  fingerprintAvailable: boolean;
  isRealHardware: boolean;
  hardwareBlocked: boolean;
  error?: string;
  primarySensor?: 'fingerprint' | 'face' | 'iris' | 'none';
}

export interface BiometricAuthResult {
  success: boolean;
  type: 'fingerprint';
  isRealHardware: boolean;
  username?: string;
  error?: string;
  errorCode?: string;
}

const STORAGE_KEY_BIOMETRIC_ENABLED = 'hasebo_biometric_enabled';
const STORAGE_KEY_BIOMETRIC_USER = 'hasebo_biometric_user';

export type BiometricAuthType = 'fingerprint';

function getCapacitorPlugin(): NativeBiometricPluginInterface | null {
  // 1. الطريقة الرسمية في Capacitor 7 (الأفضل والأضمن) - تم تسجيلها بالأعلى
  if (NativeBiometricRegistered) {
    return NativeBiometricRegistered as unknown as NativeBiometricPluginInterface;
  }

  // 2. Fallback للطريقة القديمة على شبابيك (لحالات نادرة)
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (!w.Capacitor || !w.Capacitor.Plugins) return null;
  return w.Capacitor.Plugins.NativeBiometric || null;
}

/**
 * فحص دقيق ودقيق لدعم مستشعر بصمة الإصبع في الجهاز.
 * لا يُسمح أبداً ببصمة الوجه أو المحاكاة الوهمية.
 */
export async function checkBiometricSupport(): Promise<BiometricCapability & BiometricSupportResult> {
  const plugin = getCapacitorPlugin();

  if (!plugin) {
    return {
      supported: false,
      hasPlatformAuth: false,
      fingerprintAvailable: false,
      hasEnrolledFingerprints: false,
      isRealHardware: false,
      primarySensor: 'none',
      hardwareBlocked: false,
      isAvailable: false,
      error: 'يعمل فقط على تطبيق الأندرويد APK الأصلي',
    };
  }

  try {
    const native = (typeof plugin.canAuthenticate === 'function')
      ? await plugin.canAuthenticate()
      : null;

    if (native) {
      const fpAvail = !!native.fingerprintAvailable;
      return {
        supported: fpAvail,
        hasPlatformAuth: !!native.available,
        fingerprintAvailable: fpAvail,
        hasEnrolledFingerprints: !!native.hasEnrolledFingerprints,
        isRealHardware: true,
        primarySensor: native.primarySensor || 'none',
        hardwareBlocked: !!native.hardwareBlocked,
        isAvailable: fpAvail && !native.hardwareBlocked,
      };
    }
  } catch (e: any) {
    return {
      supported: false,
      hasPlatformAuth: false,
      fingerprintAvailable: false,
      hasEnrolledFingerprints: false,
      isRealHardware: false,
      primarySensor: 'none',
      hardwareBlocked: false,
      isAvailable: false,
      error: e?.message || 'فشل فحص المستشعر',
    };
  }

  return {
    supported: false,
    hasPlatformAuth: false,
    fingerprintAvailable: false,
    hasEnrolledFingerprints: false,
    isRealHardware: false,
    primarySensor: 'none',
    hardwareBlocked: false,
    isAvailable: false,
  };
}

/**
 * تفعيل مصادقة بصمة الإصبع الحقيقية عبر مستشعر الجهاز الأصلي.
 * يُرفض أي محاكاة وهمية أو مصادقة عبر بصمة الوجه أو كلمة مرور الجهاز.
 */
export async function authenticateWithHardwareBiometrics(
  username: string
): Promise<BiometricAuthResult> {
  const plugin = getCapacitorPlugin();

  if (!plugin || typeof plugin.authenticate !== 'function') {
    return {
      success: false,
      type: 'fingerprint',
      isRealHardware: false,
      username,
      error: 'لا يمكن تشغيل مصادقة بصمة الإصبع إلا من خلال تطبيق الأندرويد الأصلي. يرجى تثبيت وتشغيل حاسبو كتطبيق APK.',
    };
  }

  try {
    const result = await plugin.authenticate();
    return {
      success: !!result.success,
      type: 'fingerprint',
      isRealHardware: true,
      username,
      error: result?.error || undefined,
      errorCode: result?.errorCode || undefined,
    };
  } catch (e: any) {
    return {
      success: false,
      type: 'fingerprint',
      isRealHardware: true,
      username,
      error: e?.message || 'فشلت مصادقة بصمة الإصبع',
    };
  }
}

export async function getHardwareSensorInfo(): Promise<any | null> {
  const plugin = getCapacitorPlugin();
  if (!plugin || typeof plugin.getSensorInfo !== 'function') return null;
  try {
    return await plugin.getSensorInfo();
  } catch {
    return null;
  }
}

/**
 * الحصول على إعدادات المصادقة البيومترية المحفوظة محلياً.
 * ملاحظة: بصمة الوجه ملغاة تماماً ولا يمكن استخدامها.
 */
export function getBiometricSettings(): {
  enabled: boolean;
  preferredType: 'fingerprint';
  savedUsername: string;
  fingerprintEnabled: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      preferredType: 'fingerprint',
      savedUsername: '',
      fingerprintEnabled: false,
    };
  }

  const enabled = localStorage.getItem(STORAGE_KEY_BIOMETRIC_ENABLED) === 'true';
  const savedUsername = localStorage.getItem(STORAGE_KEY_BIOMETRIC_USER) || '';

  return {
    enabled,
    preferredType: 'fingerprint',
    savedUsername,
    fingerprintEnabled: enabled,
  };
}

/**
 * حفظ إعدادات المصادقة البيومترية.
 * يُرفض أي محاولة لحفظ نوع بصمة الوجه - الإجبار على fingerprint فقط.
 * يدعم استدعاءين:
 *   - القديم: saveBiometricSettings(enabled, preferredType, username)
 *   - الجديد: saveBiometricSettings({ fingerprintEnabled })
 */
export function saveBiometricSettings(
  enabledOrConfig: boolean | { fingerprintEnabled?: boolean; enabled?: boolean },
  preferredType?: BiometricAuthType,
  username?: string
) {
  if (typeof window === 'undefined') return;

  let enabled: boolean;
  let user: string;

  if (typeof enabledOrConfig === 'object' && enabledOrConfig !== null) {
    enabled = !!(enabledOrConfig.fingerprintEnabled ?? enabledOrConfig.enabled ?? false);
    user = localStorage.getItem(STORAGE_KEY_BIOMETRIC_USER) || '';
  } else {
    enabled = !!enabledOrConfig;
    user = username || localStorage.getItem(STORAGE_KEY_BIOMETRIC_USER) || '';
  }

  const safeType: BiometricAuthType = 'fingerprint';
  localStorage.setItem(STORAGE_KEY_BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  localStorage.setItem(STORAGE_KEY_BIOMETRIC_USER, user);
  localStorage.setItem('hasebo_biometric_type', safeType);
}

/**
 * تشغيل ارتجاج جهازي (Haptic Feedback) عند نجاح أو فشل المصادقة.
 */
export function triggerHapticFeedback(pattern: number[] = [40, 60, 40]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors
    }
  }
}
