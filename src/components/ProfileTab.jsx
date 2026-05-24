import React from 'react';

const ProfileTab = ({profile}) => {
    return (
        <div>
            <h1>{profile.nickname}</h1>
            <img src={profile.avatar} alt={profile.nickname} />
            <p>{profile.bio}</p>
            <div>
                <h2>My Tags</h2>
                {profile.tags.map(tag => <span key={tag}>{tag}</span>)}
            </div>
            <div>
                <h2>Recent Records</h2>
                {profile.records.map(record => <p key={record.id}>{record.content}</p>)}
            </div>
            <div>
                <h2>Connection Summary</h2>
                <p>{profile.connectionSummary}</p>
            </div>
        </div>
    );
};

export default ProfileTab;