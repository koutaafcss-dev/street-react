import React from 'react';

const ProfileTab = ({ userProfile }) => {
  return (
    <div>
      <h1>{userProfile.name}</h1>
      <img src={userProfile.avatar} alt="Profile Avatar" />
      <p>{userProfile.bio}</p>
      <div>
        <h2>My Tags</h2>
        <ul>{userProfile.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div>
        <h2>Recent Records</h2>
        <ul>{userProfile.records.map(record => <li key={record.id}>{record.content}</li>)}</ul>
      </div>
      <div>
        <h2>Summary of City Interactions</h2>
        <p>{userProfile.cityInteractionsSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;