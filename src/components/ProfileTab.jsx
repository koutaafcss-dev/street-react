import React from 'react';

const ProfileTab = ({header, avatar, name, bio, tags, recentRecords, summary}) => {
    return (
        <div>
            <h1>{header}</h1>
            <img src={avatar} alt="Avatar" />
            <h2>{name}</h2>
            <p>{bio}</p>
            <div>
                <h3>My Tags</h3>
                {tags.map(tag => <span key={tag}>#{tag}</span>)}
            </div>
            <div>
                <h3>Recent Records</h3>
                <ul>
                    {recentRecords.map(record => <li key={record}>{record}</li>)}
                </ul>
            </div>
            <div>
                <h3>Summary of Engagement with the City</h3>
                <p>{summary}</p>
            </div>
        </div>
    );
};

export default ProfileTab;