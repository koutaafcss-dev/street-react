import React from "react";

const ProfileTab = ({ userProfile }) => {
  return (
    <div>
      <div>
        <h2>{userProfile.name}</h2>
        <img src={userProfile.avatar} alt="User Avatar" />
      </div>
      <p>{userProfile.bio}</p>
      <div>
        <h3>マイタグ</h3>
        <ul>{userProfile.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      </div>
      <div>
        <h3>最近の記録</h3>
        <ul>{userProfile.records.map(record => <li key={record.id}>{record.title}</li>)}</ul>
      </div>
      <div>
        <h3>街との関わり方</h3>
        <p>{userProfile.communityEngagementSummary}</p>
      </div>
    </div>
  );
};

export default ProfileTab;