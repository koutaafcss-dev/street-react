import React from "react";

const ProfileTab = ({ profile }) => {
  return (
    <div>
      <h2>{profile.name}</h2>
      <div>{profile.avatar}</div>
      <div>{profile.bio}</div>
      <div>{profile.tags.join(', ')}</div>
      <div>{profile.recentRecords.join(', ')}</div>
      <div>{profile.summary}</div>
    </div>
  );
};

export default ProfileTab;