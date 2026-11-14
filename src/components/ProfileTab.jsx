import React from 'react';

const ProfileTab = ({ userProfile }) => {
    return (
        <div className="profile-tab">
            <header>
                <h2>{userProfile.name}</h2>
                <div>{userProfile.avatar}</div>
                <div>{userProfile.bio}</div>
            </header>
            <div className="my-tags">
                <h3>My Tags</h3>
                <p>{userProfile.tags.join(', ')}</p>
            </div>
            <div className="recent-records">
                <h3>Recent Records</h3>
                <ul>
                    {userProfile.records.map((record, index) => (
                        <li key={index}>{record}</li>
                    ))}
                </ul>
            </div>
            <div className="community-summary">
                <h3>Community Engagement</h3>
                <p>{userProfile.communitySummary}</p>
            </div>
        </div>
    );
};

export default ProfileTab;