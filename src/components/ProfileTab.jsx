import React from 'react';

const ProfileTab = ({ user }) => {
    const { header, avatar, name, bio, tags, recentRecords, citySummary } = user;

    return (
        <div className="profile-tab">
            <div className="header" style={{background: header.grad}}>{header.label}</div>
            <img src={avatar} alt="Avatar" className="avatar" />
            <h2>{name}</h2>
            <p>{bio}</p>
            <div className="my-tags">{tags.join(', ')}</div>
            <div className="recent-records">
                {recentRecords.map(record => (
                    <div key={record.id} className="record">{record.content}</div>
                ))}
            </div>
            <div className="city-summary">{citySummary}</div>
        </div>
    );
};

export default ProfileTab;