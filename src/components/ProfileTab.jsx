import React from 'react';

const ProfileTab = ({ user }) => {
    return (
        <div>
            <h1>{user.name}</h1>
            <div>{user.bio}</div>
            <div>{user.tags.join(', ')}</div>
            <h2>Recent Records</h2>
            <ul>
                {user.records.map(record => (
                    <li key={record.id}>{record.title}</li>
                ))}
            </ul>
            <h2>Connection with the City</h2>
            <div>{user.cityConnectionSummary}</div>
        </div>
    );
};

export default ProfileTab;