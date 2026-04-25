function ProfileTab({ user }) {
  return (
    <div>
      <header>{user.name}</header>
      <img src={user.avatar} alt={`${user.name}'s avatar`} />
      <p>{user.bio}</p>
      <div>{user.tags.join(', ')}</div>
      <h3>最近の記録</h3>
      <div>{user.records.map(record => <p key={record.id}>{record.content}</p>)}</div>
      <h3>街との関わり方</h3>
      <p>{user.communityEngagement}</p>
    </div>
  );
}