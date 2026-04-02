import React from 'react';
import { useAppeals } from '../hooks/useAppeals';

const AppealStatus = ({ postId }) => {
  const { appeals, loading } = useAppeals();

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>;
  }

  const appeal = appeals.find(a => a.postId === postId);

  if (!appeal) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'pending':
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return '承認済み';
      case 'rejected':
        return '却下';
      case 'pending':
      default:
        return '審査中';
    }
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appeal.status)}`}>
      異議申し立て: {getStatusText(appeal.status)}
    </div>
  );
};

export default AppealStatus;