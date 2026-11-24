import React from 'react';

function ProfileTab({ user }) {
    return (
        <div>
            <header>{user.name}</header>
            <div>{user.avatar}</div>
            <p>{user.bio}</p>
            <div>{user.tags.join(', ')}</div>
            <h2>最近の記録</h2>
            <ul>
                {user.records.map(record => <li key={record.id}>{record.content}</li>)}
            </ul>
            <h2>街との関わり方</h2>
            <p>{user.cityEngagementSummary}</p>
        </div>
    );
}

export default ProfileTab;