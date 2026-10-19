import React from 'react';
import PropTypes from 'prop-types';
import AvatarView from './AvatarView';

const ProfileTab = ({ user, onEditAvatar }) => {
  const { avatar, name, bio, tags, recentRecords, townSummary } = user;

  return (
    <div>
      <h1>{name}</h1>
      <AvatarView profileAvatarPhoto={avatar} nickname={name} onEditAvatar={onEditAvatar} />
      <p>{bio}</p>
      <div>
        <h2>My Tags</h2>
        <p>{tags.join(', ')}</p>
      </div>
      <div>
        <h2>Recent Records</h2>
        <p>{recentRecords.join(', ')}</p>
      </div>
      <div>
        <h2>Town Summary</h2>
        <p>{townSummary}</p>
      </div>
    </div>
  );
};

ProfileTab.propTypes = {
  user: PropTypes.shape({
    avatar: PropTypes.string,
    name: PropTypes.string.isRequired,
    bio: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string).isRequired,
    recentRecords: PropTypes.arrayOf(PropTypes.string).isRequired,
    townSummary: PropTypes.string.isRequired,
  }).isRequired,
  onEditAvatar: PropTypes.func.isRequired,
};

export default ProfileTab;