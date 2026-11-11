import React from 'react';

const ProfileTab = ({ user }) => {
    return (
        <div>
            <header>{user.name}</header>
            <img src={user.avatar} alt="avatar" />
            <p>{user.bio}</p>
            <div>
                <strong>マイタグ:</strong>
                <ul>{user.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
            </div>
            <div>
                <strong>最近の記録:</strong>
                <ul>{user.records.map(record => <li key={record.id}>{record.description}</li>)}</ul>
            </div>
            <div>
                <strong>街との関わり方:</strong>
                <p>{user.cityEngagement}</p>
            </div>
        </div>
    );
};

export default ProfileTab;