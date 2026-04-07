import React from 'react';
import PropTypes from 'prop-types';

const ProfileTab = ({ user }) => {
  return (
    <div className="profile-tab">
      <div className="header">
        <h2>{user.name}</h2>
        <div className="avatar"><img src={user.avatar} alt="Avatar" /></div>
      </div>
      <div className="bio">
        <p>{user.bio}</p>
      </div>
      <div className="tags">
        {user.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      <div className="recent-records">
        {/* Display user's recent records here */}
      </div>
      <div className="summary">
        {/* Summary of user's engagement with the city */}
      </div>
    </div>
  );
};

ProfileTab.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    avatar: PropTypes.string.isRequired,
    bio: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
};

export default ProfileTab;