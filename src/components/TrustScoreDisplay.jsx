import React from 'react';
import { useUserTrust } from '../hooks/useUserTrust';

const TrustScoreDisplay = ({ isDark, T }) => {
  const { trustData, loading } = useUserTrust();

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }

  const getTrustLevel = (score) => {
    if (score >= 80) return { label: '非常に信頼できる', color: '#10b981' };
    if (score >= 60) return { label: '信頼できる', color: '#3b82f6' };
    if (score >= 40) return { label: '普通', color: '#f59e0b' };
    if (score >= 20) return { label: '注意', color: '#f97316' };
    return { label: '信頼度低い', color: '#ef4444' };
  };

  const trustLevel = getTrustLevel(trustData.trustScore);

  if (trustData.suspended) {
    return (
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid #ef4444',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
          アカウント停止中
        </div>
        <div style={{ fontSize: 12, color: T.muted }}>
          {trustData.suspensionReason || '信頼度スコアが極端に低いため'}
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
          異議申し立てで復元できる場合があります
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
          信頼度スコア
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 900,
          color: trustLevel.color
        }}>
          {trustData.trustScore}
        </div>
      </div>

      <div style={{
        width: '100%',
        height: 6,
        background: T.border,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
      }}>
        <div style={{
          width: `${trustData.trustScore}%`,
          height: '100%',
          background: trustLevel.color,
          borderRadius: 3,
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: trustLevel.color, fontWeight: 700 }}>
          {trustLevel.label}
        </div>
        {trustData.misreports > 0 && (
          <div style={{ fontSize: 11, color: T.muted }}>
            誤報告: {trustData.misreports}回
          </div>
        )}
      </div>

      {trustData.lastMisreportAt && (
        <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>
          最終誤報告: {trustData.lastMisreportAt.toLocaleDateString('ja-JP')}
        </div>
      )}
    </div>
  );
};

export default TrustScoreDisplay;