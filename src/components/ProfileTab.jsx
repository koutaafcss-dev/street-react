import React from 'react';

function ProfileTab({ profile }) {
  return (
    <div>
      <div>{profile.header}</div>
      <img src={profile.avatar} alt={profile.name} />
      <h2>{profile.name}</h2>
      <p>{profile.bio}</p>
      <div>{profile.tags.join(', ')}</div>
      <h3>最近の記録</h3>
      <ul>
        {profile.records.map((record, index) => (
          <li key={index}>{record}</li>
        ))}
      </ul>
      <h3>街との関わり方</h3>
      <p>{profile.summary}</p>
    </div>
  );
}

export default ProfileTab;