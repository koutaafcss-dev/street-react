import React from 'react';

const ProfileTab = ({ profile }) => {
  return (
    <div>
      <div className="profile-header">
        <h1>{profile.name}</h1>
        <img src={profile.avatar} alt="Avatar" />
      </div>
      <p>{profile.bio}</p>
      <div className="tags">
        {profile.tags.map(tag => <span key={tag}>#{tag}</span>)}
      </div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        {profile.records.map(record => <div key={record.id}>{record.content}</div>)}
      </div>
      <div className="summary">
        <h2>街との関わり方</h2>
        <p>{profile.citySummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;