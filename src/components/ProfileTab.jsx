import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <div>{user.avatar}</div>
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <div>
        <h4>Recent Records</h4>
        {/* Display recent records logic here */}
      </div>
      <div>
        <h4>How You Engage with the City</h4>
        {/* Display engagement summary logic here */}
      </div>
    </div>
  );
};

export default ProfileTab;