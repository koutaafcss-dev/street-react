import React from 'react';

const ProfileTab = ({ userProfile }) => {
    return (
        <div>
            <header>{userProfile.name}</header>
            <div>{userProfile.avatar}</div>
            <p>{userProfile.bio}</p>
            <h3>マイタグ</h3>
            <ul>{userProfile.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
            <h3>最近の記録</h3>
            <ul>{userProfile.records.map(record => <li key={record.id}>{record.content}</li>)}</ul>
            <h3>街との関わり方</h3>
            <p>{userProfile.cityEngagementSummary}</p>
        </div>
    );
};

export default ProfileTab;