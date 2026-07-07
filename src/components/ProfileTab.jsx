import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div>
      <div className='header'>
        <h1>{userProfile.name}</h1>
        <div>{userProfile.avatar}</div>
      </div>
      <p>{userProfile.bio}</p>
      <div className='my-tags'>
        <h2>マイタグ</h2>
        <ul>
          {userProfile.tags.map((tag, index) => <li key={index}>{tag}</li>)}
        </ul>
      </div>
      <div className='recent-records'>
        <h2>最近の記録</h2>
        <ul>
          {userProfile.records.map((record, index) => <li key={index}>{record}</li>)}
        </ul>
      </div>
      <div className='summary'>
        <h2>街との関わり方</h2>
        <p>{userProfile.summary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;