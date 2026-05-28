import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div className="profile-tab">
      <div className="header">
        <h1>{userProfile.name}</h1>
        <span>{userProfile.bio}</span>
      </div>
      <div className="avatar">
        <img src={userProfile.avatar} alt={`${userProfile.name}'s avatar`} />
      </div>
      <div className="tags">
        {userProfile.tags.map((tag, index) => (
          <span key={index} className="tag">{tag}</span>
        ))}
      </div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        {/* Assuming records are in userProfile.records */}
        {userProfile.records.map((record, index) => (
          <div key={index} className="record">
            {record}
          </div>
        ))}
      </div>
      <div className="relationship-summary">
        <h2>街との関わり方</h2>
        <span>{userProfile.relationshipSummary}</span>
      </div>
    </div>
  );
};

export default ProfileTab;