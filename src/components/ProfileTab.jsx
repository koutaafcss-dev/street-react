import React from "react";

const ProfileTab = ({ user }) => {
  return (
    <div>
      <h1>{user.name}</h1>
      <div>{user.bio}</div>
      <div>{user.tags.join(', ')}</div> {/* My Tags */}
      <div>{user.recentRecords} {/* Recent Records */}</div>
      <div>{user.summary} {/* City Interaction Summary */}</div>
      {/* Removed calendar, TODAY, mood status, always online display */}
    </div>
  );
};

export default ProfileTab;