import React, { useState, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, db, functions } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export default function PhoneAuthModal({ isDark, T, onAuthComplete, onCancel }) {
  const [step, setStep] = useState('phone'); // phone -> otp -> profile
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+81');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);

  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      // 電話番号の一意性をチェック
      const checkPhoneUniqueness = httpsCallable(functions, 'checkPhoneNumberUniqueness');
      const fullPhone = countryCode + phoneNumber.replace(/^0/, '');
      
      try {
        await checkPhoneUniqueness({ phoneNumber: fullPhone });
      } catch (err) {
        if (err.code === 'already-exists') {
          setError('この電話番号は既に登録されています');
          setLoading(false);
          return;
        }
        throw err;
      }

      // 未初期化の場合のみ初期化（既に初期化済みなら再利用）
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => console.log('Recaptcha verified'),
        });
      }

      const result = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
      confirmationResultRef.current = result;
      setStep('otp');
    } catch (err) {
      console.error(err);
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    try {
      if (!confirmationResultRef.current) throw new Error('認証セッションが無効です');
      await confirmationResultRef.current.confirm(otp);
      // 確認成功 → プロフィール入力へ
      setStep('profile');
    } catch (err) {
      console.error(err);
      setError('OTPが正しくありません');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    setLoading(true);
    setError('');
    try {
      if (!auth.currentUser) throw new Error('ユーザーが取得できません');

      // Cloud Function で電話番号を登録してアカウント完成
      const registerPhoneNumber = httpsCallable(functions, 'registerPhoneNumber');
      const fullPhone = countryCode + phoneNumber.replace(/^0/, '');
      
      const result = await registerPhoneNumber({
        phoneNumber: fullPhone,
        displayName: displayName.trim(),
      });

      console.log('Account registration completed:', result.data);
      if (onAuthComplete) onAuthComplete();
    } catch (err) {
      console.error(err);
      if (err.message.includes('already-exists')) {
        setError('この電話番号は既に登録されています');
      } else {
        setError(err.message || 'プロフィール作成に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const isValidPhone = phoneNumber.replace(/\D/g, '').length >= 9;
  const isValidOtp = otp.length === 6;
  const isValidName = displayName.trim().length >= 2;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: isDark ? 'rgba(5,8,16,0.98)' : 'white',
          borderRadius: 20,
          padding: 24,
          maxWidth: 400,
          width: '90%',
          color: T.text,
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>アカウント作成</h2>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: T.muted,
            }}
          >
            ×
          </button>
        </div>

        {/* ステップ1: 電話番号入力 */}
        {step === 'phone' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.sub, display: 'block', marginBottom: 8 }}>
                電話番号認証
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  style={{
                    flex: '0 0 100px',
                    padding: '10px 8px',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    color: T.text,
                    fontSize: 13,
                  }}
                >
                  <option value="+81">+81 JP</option>
                  <option value="+1">+1 US</option>
                  <option value="+44">+44 UK</option>
                  <option value="+86">+86 CN</option>
                </select>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="9012345678"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    color: T.text,
                    fontSize: 13,
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>
                認証コードがSMSで届きます
              </div>
            </div>

            <div id="recaptcha-container" style={{ marginBottom: 16 }}></div>

            {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12, padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>{error}</div>}

            <button
              onClick={handleSendOtp}
              disabled={!isValidPhone || loading}
              style={{
                width: '100%',
                padding: '12px',
                background: isValidPhone && !loading ? '#3b82f6' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${isValidPhone ? '#3b82f6' : T.border}`,
                borderRadius: 10,
                color: isValidPhone && !loading ? 'white' : T.muted,
                fontSize: 13,
                fontWeight: 700,
                cursor: isValidPhone && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? '送信中...' : 'コードを送信'}
            </button>
          </>
        )}

        {/* ステップ2: OTP確認 */}
        {step === 'otp' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.sub, display: 'block', marginBottom: 8 }}>
                認証コード（6桁）
              </label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  color: T.text,
                  fontSize: 16,
                  textAlign: 'center',
                  letterSpacing: '8px',
                }}
              />
            </div>

            {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12, padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep('phone')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  color: T.text,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                戻る
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={!isValidOtp || loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isValidOtp && !loading ? '#3b82f6' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${isValidOtp ? '#3b82f6' : T.border}`,
                  borderRadius: 10,
                  color: isValidOtp && !loading ? 'white' : T.muted,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isValidOtp && !loading ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? '確認中...' : '確認'}
              </button>
            </div>
          </>
        )}

        {/* ステップ3: プロフィール入力 */}
        {step === 'profile' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.sub, display: 'block', marginBottom: 8 }}>
                ユーザー名（2文字以上）
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="山田太郎"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  color: T.text,
                  fontSize: 13,
                }}
              />
            </div>

            {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12, padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}>{error}</div>}

            <button
              onClick={handleCreateProfile}
              disabled={!isValidName || loading}
              style={{
                width: '100%',
                padding: '12px',
                background: isValidName && !loading ? '#3b82f6' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${isValidName ? '#3b82f6' : T.border}`,
                borderRadius: 10,
                color: isValidName && !loading ? 'white' : T.muted,
                fontSize: 13,
                fontWeight: 700,
                cursor: isValidName && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'アカウント作成中...' : 'アカウント作成'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
