import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <img src={user.avatar} alt={`${user.name}'s avatar`} />
      <p>{user.bio}</p>
      <h2>My Tags</h2>
      <ul>
        {user.tags.map((tag, index) => (
          <li key={index}>{tag}</li>
        ))}
      </ul>
      <h2>Recent Records</h2>
      <ul>
        {user.records.map((record, index) => (
          <li key={index}>{record}</li>
        ))}
      </ul>
      <h2>City Engagement Summary</h2>
      <p>{user.cityEngagement}</p>
    </div>
  );
};

export default ProfileTab;