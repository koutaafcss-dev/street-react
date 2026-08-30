import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <header>{user.name}</header>
      <img src={user.avatar} alt="avatar" />
      <p>{user.bio}</p>
      <div className="tags">
        {user.tags.map(tag => <span key={tag}>{tag}</span>)}
      </div>
      <h3>最近の記録</h3>
      <ul>
        {user.records.map(record => <li key={record.id}>{record.content}</li>)}
      </ul>
      <section>
        <h3>街との関わり方サマリー</h3>
        <p>{user.relationshipSummary}</p>
      </section>
    </div>
  );
};

export default ProfileTab;