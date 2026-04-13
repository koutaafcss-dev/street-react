import React from 'react';

const ProfileTab = ({ user }) => {
  const { avatar, name, bio, tags, recentRecords, cityEngagement } = user;

  return (
    <div className="profile-tab">
      <div className="profile-header">
        <img src={avatar} alt="Avatar" className="profile-avatar" />
        <h1>{name}</h1>
      </div>
      <p>{bio}</p>
      <div className="my-tags">
        <h2>マイタグ</h2>
        <p>{tags.join(', ')}</p>
      </div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        <ul>
          {recentRecords.map((record, index) => (
            <li key={index}>{record}</li>
          ))}
        </ul>
      </div>
      <div className="city-engagement">
        <h2>街との関わり方</h2>
        <p>{cityEngagement}</p>
      </div>
    </div>
  );
};

export default ProfileTab;