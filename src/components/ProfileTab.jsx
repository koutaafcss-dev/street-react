import React from 'react';
import { useProfile } from '../hooks/useProfile';

const ProfileTab = () => {
  const { header, avatar, name, bio, tags, recentRecords, summary } = useProfile();

  return (
    <div>
      <h1>{header}</h1>
      <img src={avatar} alt="Avatar" />
      <h2>{name}</h2>
      <p>{bio}</p>
      <div>
        <h3>マイタグ</h3>
        {tags.map(tag => <span key={tag}>{tag}</span>)}
      </div>
      <div>
        <h3>最近の記録</h3>
        {recentRecords.map(record => <div key={record.id}>{record.content}</div>)}
      </div>
      <div>
        <h3>街との関わり方</h3>
        <p>{summary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;