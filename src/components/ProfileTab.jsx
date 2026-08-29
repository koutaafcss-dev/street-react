import React from 'react';

const ProfileTab = ({ user }) => {
    return (
        <div>
            <header>{user.nickname}</header>
            <img src={user.avatar} alt="Profile Avatar" />
            <p>{user.bio}</p>
            <div>{user.tags.join(', ')}</div>
            <div>{user.recentRecords.join(', ')}</div>
            <summary>{user.communitySummary}</summary>
        </div>
    );
};

export default ProfileTab;