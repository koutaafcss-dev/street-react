import React from "react";

function ProfileTab({ user }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <img src={user.avatar} alt="User Avatar" />
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <div>{user.recentRecords.map(record => <div key={record.id}>{record.summary}</div>)}</div>
      <div>{user.engagementSummary}</div>
    </div>
  );
}

export default ProfileTab;