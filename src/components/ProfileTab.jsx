import React from "react";

const ProfileTab = ({profile}) => {
  return (
    <div>
      <div className="header">{profile.nickname}</div>
      <img src={profile.avatar} alt="avatar" />
      <p>{profile.bio}</p>
      <div className="tags">{profile.tags.join(', ')}</div>
      <div className="recent-reports">{profile.recentReports.join(', ')}</div>
      <div className="summary">{profile.engagementSummary}</div>
    </div>
  );
};

export default ProfileTab;