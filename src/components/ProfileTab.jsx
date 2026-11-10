import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <header>
        <h2>{user.name}</h2>
        <img src={user.avatar} alt={user.name} />
      </header>
      <div className="bio">
        <p>{user.bio}</p>
      </div>
      <div className="tags">
        <h3>My Tags:</h3>
        <ul>{user.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div className="recent-records">
        <h3>Recent Records:</h3>
        <ul>{user.records.map(record => <li key={record.id}>{record.content}</li>)}</ul>
      </div>
      <div className="city-relationships">
        <h3>How I connect with the city:</h3>
        <p>{user.citySummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;