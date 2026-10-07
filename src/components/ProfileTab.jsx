import React from 'react';

const ProfileTab = ({ profile }) => {
  return (
    <div>
      <h1>{profile.name}</h1>
      <img src={profile.avatar} alt={`${profile.name}'s avatar`} />
      <p>{profile.bio}</p>
      <div>
        <h2>My Tags</h2>
        <ul>
          {profile.tags.map(tag => <li key={tag}>{tag}</li>)}
        </ul>
      </div>
      <div>
        <h2>Recent Record</h2>
        <ul>
          {profile.records.map(record => <li key={record.id}>{record.content}</li>)}
        </ul>
      </div>
      <div>
        <h2>Connection with the Town</h2>
        <p>{profile.townRelationshipSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;