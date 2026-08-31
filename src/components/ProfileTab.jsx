import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <header>{user.name}</header>
      <div>{user.avatar}</div>
      <div>{user.bio}</div>
      <div>マイタグ: {user.tags.join(', ')}</div>
      <div>最近の記録: {user.records.map(record => <div key={record.id}>{record.content}</div>)}</div>
      <div>街との関わり方: {user.connectionSummary}</div>
    </div>
  );
}

export default ProfileTab;