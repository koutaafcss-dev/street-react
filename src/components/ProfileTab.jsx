import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.nickname}</header>
      <img src={user.profileAvatarPhoto} alt={user.nickname} />
      <p>{user.bio}</p>
      <div>{user.myTags.join(', ')}</div>
      <div>{user.recentRecords}</div>
      <div>{user.cityEngagementSummary}</div>
    </div>
  );
};

export default ProfileTab;