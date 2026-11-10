import React from 'react';
import PropTypes from 'prop-types';

const ProfileTab = ({ header, avatar, name, bio, tags, recentRecords, communitySummary }) => {
    return (
        <div>
            <div>{header}</div>
            <img src={avatar} alt="User Avatar" />
            <h1>{name}</h1>
            <p>{bio}</p>
            <div>{tags.join(', ')}</div>
            <h2>最近の記録</h2>
            <ul>
                {recentRecords.map((record, index) => <li key={index}>{record}</li>)}
            </ul>
            <h2>街との関わり方</h2>
            <p>{communitySummary}</p>
        </div>
    );
};

ProfileTab.propTypes = {
    header: PropTypes.string,
    avatar: PropTypes.string,
    name: PropTypes.string,
    bio: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    recentRecords: PropTypes.arrayOf(PropTypes.string),
    communitySummary: PropTypes.string
};

export default ProfileTab;