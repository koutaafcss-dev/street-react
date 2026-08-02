import React from 'react';

function ProfileTab({ profile }) {
  return (
    <div>
      <h1>{profile.name}</h1>
      <img src={profile.avatar} alt="Profile Avatar" />
      <p>{profile.bio}</p>
      <h2>My Tags</h2>
      <ul>{profile.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      <h2>Recent Records</h2>
      <ul>{profile.recentRecords.map(record => <li key={record.id}>{record.title}</li>)}</ul>
      <h2>City Interaction Summary</h2>
      <p>{profile.cityInteractionSummary}</p>
    </div>
  );
}

export default ProfileTab;