import React from "react";

const ProfileTab = ({ profile }) => {
  return (
    <div className="profile-tab">
      <div className="header">
        <h2>{profile.name}</h2>
        <span>{profile.bio}</span>
      </div>
      <div className="avatar">
        <img src={profile.avatar} alt={profile.name} />
      </div>
      <div className="tags">
        {profile.tags.map((tag) => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>
      <div className="recent-records">
        <h3>最近の記録</h3>
        <ul>
          {profile.recentRecords.map((record) => (
            <li key={record.id}>{record.title}</li>
          ))}
        </ul>
      </div>
      <div className="summary">
        <h3>街との関わり方</h3>
        <p>{profile.cityRelationshipSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;