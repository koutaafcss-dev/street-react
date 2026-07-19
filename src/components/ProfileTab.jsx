import React from 'react';

const ProfileTab = ({ user }) => {
  const { avatar, nickname, bio, tags, recentRecords } = user;

  return (
    <div>
      <header>
        <img src={avatar} alt={`${nickname}'s avatar`} />
        <h1>{nickname}</h1>
      </header>
      <p>{bio}</p>
      <div>
        <h2>マイタグ</h2>
        <ul>
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2>最近の記録</h2>
        <ul>
          {recentRecords.map((record) => (
            <li key={record.id}>{record.content}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2>街との関わり方サマリー</h2>
        {/* サマリーの内容はここに */}
      </div>
    </div>
  );
};

export default ProfileTab;