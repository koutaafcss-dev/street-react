import React from 'react';

const ProfileTab = ({ user }) => {
  return (
    <div>
      <header>{user.name}</header>
      <div>{user.bio}</div>
      <div>{user.tags.join(', ')}</div>
      <div>
        <h4>最近の記録</h4>
        {/* Map through user.records to display recent records */}
      </div>
      <div>
        <h4>街との関わり方</h4>
        <p>{user.cityEngagementSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;