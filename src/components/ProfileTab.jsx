import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <div className='profile-header'>
        <img src={user.avatar} alt='Profile' />
        <h2>{user.name}</h2>
        <p>{user.bio}</p>
      </div>
      <div className='tags'>
        {user.tags.map(tag => (<span key={tag}>{tag}</span>))}
      </div>
      <div className='recent-records'>
        <h3>最近の記録</h3>
        {/* Display recent records logic here */}
      </div>
      <div className='community-summary'>
        <h3>街との関わり方</h3>
        <p>{user.communitySummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;