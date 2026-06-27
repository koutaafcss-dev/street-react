import React from 'react';

const ProfileTab = ({ user, onEditAvatar, T }) => {
  return (
    <div>
      <div className="header">
        <h2>{user.nickname}</h2>
        <button onClick={onEditAvatar}>Edit Avatar</button>
      </div>
      <div className="avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={`${user.nickname}'s avatar`} />
        ) : (
          <span>{user.avatarEmoji || '🚶'}</span>
        )}
      </div>
      <div className="bio">
        <p>{user.bio}</p>
      </div>
      <div className="tags">
        {user.tags.map(tag => (
          <span key={tag}>#{tag}</span>
        ))}
      </div>
      <div className="recent-records">
        <h3>最近の記録</h3>
        {/* Replace with actual recent records rendering */}
      </div>
      <div className="city-connection">
        <h3>街との関わり方</h3>
        <p>{user.cityConnectionSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;