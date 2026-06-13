import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div className="profile-tab">
      <div className="header">
        <h1>{userProfile.name}</h1>
        <div className="avatar">
          <img src={userProfile.avatar} alt={userProfile.name} />
        </div>
      </div>
      <p>{userProfile.bio}</p>
      <div className="tags">
        {userProfile.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
      </div>
      <div className="recent-records">
        {userProfile.recentRecords.map(record => <div key={record.id} className="record">{record.content}</div>)}
      </div>
      <div className="interaction-summary">
        <p>{userProfile.interactionSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;