import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <h1>{user.nickname}</h1>
      <img src={user.profileAvatarPhoto} alt={user.nickname || 'avatar'} />
      <p>{user.bio}</p>
      <div className="tags">
        {user.tags.map(tag => <span key={tag}>#{tag}</span>)}
      </div>
      <div className="recent-records">
        <h2>最近の記録</h2>
        {/* Display recent records here */}
      </div>
      <div className="relationship-summary">
        <h2>街との関わり方</h2>
        {/* Display relationship summary here */}
      </div>
    </div>
  );
};

export default ProfileTab;