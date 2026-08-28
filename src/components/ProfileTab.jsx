import React from "react";

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h2>{user.name}</h2>
      <div>{user.bio}</div>
      <div>{user.myTags.join(', ')}</div>
      <h3>Recent Activity</h3>
      <ul>
        {user.recentRecords.map(record => (
          <li key={record.id}>{record.description}</li>
        ))}
      </ul>
      <div>{user.citySummary}</div>
    </div>
  );
};

export default ProfileTab;