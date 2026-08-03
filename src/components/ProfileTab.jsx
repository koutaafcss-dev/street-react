import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className="header">
        <h1>{user.name}</h1>
      </div>
      <div className="avatar">
        <img src={user.avatar} alt="avatar" />
      </div>
      <div className="bio">
        <p>{user.bio}</p>
      </div>
      <div className="tags">
        <span>{user.myTags.join(', ')}</span>
      </div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        {/* Render recent records */}
      </div>
      <div className="summary">
        <h2>街との関わり方</h2>
        <p>{user.summary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;