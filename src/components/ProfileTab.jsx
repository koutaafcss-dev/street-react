import React from 'react';

const ProfileTab = ({ user }) => {
    return (
        <div>
            <header>{user.name}</header>
            <img src={user.avatar} alt="Profile Avatar" />
            <p>{user.bio}</p>
            <div>{user.tags.join(', ')}</div>
            <h3>最近の記録</h3>
            <div>{user.records.join(', ')}</div>
            <h3>街との関わり方</h3>
            <p>{user.cityEngagement}</p>
        </div>
    );
};

export default ProfileTab;