import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../hooks/useAuth';

const AppealModal = ({ post, onClose, onAppealSubmitted }) => {
  const [appealText, setAppealText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!appealText.trim()) {
      setError('異議申し立ての内容を入力してください');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const functions = getFunctions();
      const processAppeal = httpsCallable(functions, 'processAppeal');

      const result = await processAppeal({
        postId: post.id,
        appealText: appealText.trim(),
      });

      onAppealSubmitted(result.data);
      onClose();
    } catch (err) {
      console.error('Appeal submission error:', err);
      setError(err.message || '異議申し立ての送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">異議申し立て</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">削除された投稿:</p>
          <div className="bg-gray-100 p-3 rounded text-sm">
            {post.text}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              異議申し立ての内容
            </label>
            <textarea
              value={appealText}
              onChange={(e) => setAppealText(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={4}
              placeholder="なぜこの投稿が削除されたと考えないのか、理由を説明してください..."
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? '送信中...' : '送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppealModal;