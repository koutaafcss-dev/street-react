import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <img src={user.avatar} alt="Avatar" />
      <p>{user.bio}</p>
      <div>
        <h2>マイタグ</h2>
        <ul>{user.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div>
        <h2>最近の記録</h2>
        <ul>{user.records.map(record => <li key={record.id}>{record.text}</li>)}</ul>
      </div>
      <div>
        <h2>街との関わり方</h2>
        <p>{user.cityInvolvementSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;