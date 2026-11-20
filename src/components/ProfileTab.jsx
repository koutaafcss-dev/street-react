import React from 'react';

function ProfileTab({ user }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <img src={user.avatar} alt={`${user.name}'s avatar`} />
      <p>{user.bio}</p>
      <h2>マイタグ</h2>
      <ul>
        {user.tags.map(tag => <li key={tag}>{tag}</li>)}
      </ul>
      <h2>最近の記録</h2>
      <ul>
        {user.records.map(record => <li key={record.id}>{record.content}</li>)}
      </ul>
      <h2>街との関わり方</h2>
      <p>{user.cityEngagement}</p>
    </div>
  );
}

export default ProfileTab;