import React from 'react';

const ProfileTab = ({ user }) => {
    return (
        <div>
            <header>{user.name}</header>
            <img src={user.avatar} alt={user.name} />
            <p>{user.bio}</p>
            <div>Tags: {user.tags.join(', ')}</div>
            <h3>最近の記録</h3>
            <div>
                {user.records.map(record => (
                    <div key={record.id}>{record.title}</div>
                ))}
            </div>
            <h3>街との関わり方</h3>
            <p>{user.cityEngagementSummary}</p>
        </div>
    );
};

export default ProfileTab;