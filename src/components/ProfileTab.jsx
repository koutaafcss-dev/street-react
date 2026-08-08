import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.nickname}</h1>
      <img src={user.profileAvatarPhoto} alt={user.nickname} />
      <p>{user.bio}</p>
      <div>
        <h2>My Tags</h2>
        <p>{user.myTags.join(', ')}</p>
      </div>
      <div>
        <h2>Recent Records</h2>
        <p>{user.recentRecords.join(', ')}</p>
      </div>
      <div>
        <h2>Community Engagement</h2>
        <p>{user.communityEngagementSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;