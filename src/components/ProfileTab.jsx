import React from 'react';

const ProfileTab = ({ user }) => {
    return (
        <div>
            <header>{user.name}</header>
            <div className="avatar">{user.avatar}</div>
            <div className="bio">{user.bio}</div>
            <div className="tags">{user.tags.join(', ')}</div>
            <div className="recent-records">{user.recentRecords}</div>
            <div className="community-summary">{user.communitySummary}</div>
        </div>
    );
};

export default ProfileTab;