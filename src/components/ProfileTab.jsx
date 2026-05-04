import React from 'react';

const ProfileTab = ({ userProfile }) => {
  const { header, avatar, name, bio, myTags, recentRecords, townSummary } = userProfile;

  return (
    <div>
      <h1>{header}</h1>
      <img src={avatar} alt="Profile Avatar" />
      <h2>{name}</h2>
      <p>{bio}</p>
      <h3>My Tags:</h3>
      <p>{myTags.join(', ')}</p>
      <h3>Recent Records:</h3>
      <ul>
        {recentRecords.map((record, index) => <li key={index}>{record}</li>)}
      </ul>
      <h3>関わり方:</h3>
      <p>{townSummary}</p>
    </div>
  );
};

export default ProfileTab;