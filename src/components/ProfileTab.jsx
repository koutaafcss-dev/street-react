import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div>
      <div className="profile-header">
        <img src={userProfile.avatar} alt={userProfile.name} />
        <h2>{userProfile.name}</h2>
        <p>{userProfile.bio}</p>
      </div>
      <div className="profile-tags">
        <h3>My Tags</h3>
        <ul>
          {userProfile.tags.map(tag => (<li key={tag}>{tag}</li>))}
        </ul>
      </div>
      <div className="recent-records">
        <h3>Recent Records</h3>
        <ul>
          {userProfile.records.map(record => (<li key={record.id}>{record.description}</li>))}
        </ul>
      </div>
      <div className="city-involvement">
        <h3>City Involvement Summary</h3>
        <p>{userProfile.citySummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;