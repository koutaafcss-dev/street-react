import React from 'react';

const ProfileTab = ({ header, avatar, name, bio, myTags, recentRecords, citySummary }) => {
  return (
    <div>
      <h1>{header}</h1>
      <img src={avatar} alt="avatar" />
      <h2>{name}</h2>
      <p>{bio}</p>
      <h3>マイタグ</h3>
      <div>{myTags.join(', ')}</div>
      <h3>最近の記録</h3>
      <div>{recentRecords.join(', ')}</div>
      <h3>街との関わり方</h3>
      <p>{citySummary}</p>
    </div>
  );
};

export default ProfileTab;