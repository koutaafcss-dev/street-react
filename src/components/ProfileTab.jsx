import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h2>{user.name}</h2>
      <div>{user.avatar}</div>
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <h3>最近の記録</h3>
      <div>{user.records.map(record => <div key={record.id}>{record.content}</div>)}</div>
      <h3>街との関わり方サマリー</h3>
      <div>{user.summary}</div>
    </div>
  );
};

export default ProfileTab;