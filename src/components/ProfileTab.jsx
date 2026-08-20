import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt="User Avatar" />
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <section>
        <h3>Recent Records</h3>
        <ul>
          {user.records.map(record => <li key={record.id}>{record.content}</li>)}
        </ul>
      </section>
      <section>
        <h3>How I'm Interacting with the City</h3>
        <p>{user.cityInteractionSummary}</p>
      </section>
    </div>
  );
};

export default ProfileTab;