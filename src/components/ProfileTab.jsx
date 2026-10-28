import React from 'react';

const ProfileTab = ({ user }) => {
    return (
        <div>
            <header>{user.name}</header>
            <div>{user.avatar}</div>
            <p>{user.bio}</p>
            <div>{user.tags.join(', ')}</div>
            <div>Recent Posts: {user.recentRecords.join(', ')}</div>
            <div>{user.engagementSummary}</div>
        </div>
    );
};

export default ProfileTab;