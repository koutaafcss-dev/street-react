import React from "react";

function ProfileTab({ userProfile }) {
  return (
    <div>
      <div className="header">
        <h1>{userProfile.name}</h1>
        <img src={userProfile.avatar} alt={userProfile.name} />
      </div>
      <div className="bio">
        <p>{userProfile.bio}</p>
      </div>
      <div className="tags">
        {userProfile.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <div className="recent-records">
        {userProfile.records.map((record) => (
          <div key={record.id}>{record.content}</div>
        ))}
      </div>
      <div className="community-summary">
        {userProfile.communitySummary}
      </div>
    </div>
  );
}

export default ProfileTab;