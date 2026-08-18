import React from 'react';

const ProfileTab = ({ profile }) => {
  return (
    <div>
      <header>{profile.nickname}</header>
      <img src={profile.avatar} alt="avatar" />
      <p>{profile.bio}</p>
      <div>{profile.tags.join(', ')}</div>
      <h3>最近の記録</h3>
      <ul>
        {profile.records.map(record => <li key={record.id}>{record.title}</li>)}
      </ul>
      <h3>街との関わり方</h3>
      <p>{profile.communityEngagement}</p>
    </div>
  );
};

export default ProfileTab;