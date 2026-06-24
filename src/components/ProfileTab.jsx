import React from 'react';

const ProfileTab = ({ user }) => {
  const { avatar, name, bio, tags, records, summary } = user;

  return (
    <div>
      <div className="header">
        <img src={avatar} alt="avatar" />
        <h2>{name}</h2>
      </div>
      <p>{bio}</p>
      <div className="tags">
        {tags.map(tag => <span key={tag}>{tag}</span>)}
      </div>
      <div className="records">
        <h3>最近の記録</h3>
        {records.map(record => <p key={record.id}>{record.text}</p>)}
      </div>
      <div className="summary">
        <h3>街との関わり方</h3>
        <p>{summary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;