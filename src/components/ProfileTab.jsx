import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>
        <h1>{user.name}</h1>
        <div>{user.avatar}</div>
      </header>
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <h2>最近の記録</h2>
      <div>{user.records.map(record => <div key={record.id}>{record.content}</div>)}</div>
      <h2>街との関わり方サマリー</h2>
      <div>{user.summary}</div>
    </div>
  );
};

export default ProfileTab;