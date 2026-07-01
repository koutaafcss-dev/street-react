import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <header>{user.nickname}</header>
      <div>{user.profileAvatarPhoto ? <img src={user.profileAvatarPhoto} alt={user.nickname} /> : user.profileAvatarEmoji}</div>
      <p>{user.bio}</p>
      <div>Tags: {user.tags.join(', ')}</div>
      <div>Recent Records: {user.recentRecords.join(', ')}</div>
      <div>{user.citySummary}</div>
    </div>
  );
}

export default ProfileTab;