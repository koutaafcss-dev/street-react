import React from 'react';

const ProfileTab = ({ profile }) => {
    return (
        <div>
            <header>{profile.name}</header>
            <img src={profile.avatar} alt={profile.name} />
            <p>{profile.bio}</p>
            <div>{profile.myTags.join(', ')}</div>
            <div>{profile.recentRecords.map(record => <div key={record.id}>{record.content}</div>)}</div>
            <div>{profile.communitySummary}</div>
        </div>
    );
};

export default ProfileTab;