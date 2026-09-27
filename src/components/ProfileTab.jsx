import React from 'react';

const ProfileTab = ({ userProfile }) => {
    const { avatar, name, bio, tags, recentRecords, citySummary } = userProfile;

    return (
        <div>
            <header>
                <img src={avatar} alt="avatar" />
                <h1>{name}</h1>
            </header>
            <p>{bio}</p>
            <div>
                <h3>My Tags</h3>
                <p>{tags.join(', ')}</p>
            </div>
            <div>
                <h3>Recent Records</h3>
                <ul>{recentRecords.map(record => <li key={record.id}>{record.title}</li>)}</ul>
            </div>
            <div>
                <h3>City Summary</h3>
                <p>{citySummary}</p>
            </div>
        </div>
    );
};

export default ProfileTab;