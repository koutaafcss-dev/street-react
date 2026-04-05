import React from 'react';

const ProfileTab = ({ user }) => {
  const { header, avatar, name, bio, myTags, recentRecords, citySummary } = user;

  return (
    <div className='profile-tab'>
      <h1>{header}</h1>
      <img src={avatar} alt={`${name}'s avatar`} />
      <h2>{name}</h2>
      <p>{bio}</p>
      <div className='my-tags'>Tags: {myTags.join(', ')}</div>
      <div className='recent-records'>Recent Records: {recentRecords.join(', ')}</div>
      <div className='city-summary'>City Summary: {citySummary}</div>
    </div>
  );
};

export default ProfileTab;