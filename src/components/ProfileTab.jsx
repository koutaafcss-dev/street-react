import React from 'react';

const ProfileTab = ({ profile }) => {
  return (
    <div>
      <h1>{profile.name}</h1>
      <img src={profile.avatar} alt="Profile Avatar" />
      <p>{profile.bio}</p>
      <div>
        <h2>My Tags:</h2>
        <ul>
          {profile.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <div>
        <h2>Recent Records:</h2>
        <ul>
          {profile.records.map(record => <li key={record.id}>{record.title}</li>)}
        </ul>
      </div>
      <div>
        <h2>City Relationship Summary:</h2>
        <p>{profile.citySummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;