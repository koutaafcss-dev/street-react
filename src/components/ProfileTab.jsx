import React from 'react';

const ProfileTab = ({ profile }) => {
    const { header, avatar, name, bio, tags, records, summary } = profile;

    return (
        <div className="profile-tab">
            <h1>{header}</h1>
            <img src={avatar} alt={`${name}'s avatar`} />
            <h2>{name}</h2>
            <p>{bio}</p>
            <div className="tags">{tags.map(tag => <span key={tag}>#{tag}</span>)}</div>
            <div className="records">{records.map(record => <div key={record.id}>{record.text}</div>)}</div>
            <div className="summary">{summary}</div>
        </div>
    );
};

export default ProfileTab;