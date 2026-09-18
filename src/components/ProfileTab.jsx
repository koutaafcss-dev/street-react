import React from 'react';

function ProfileTab({ profile }) {
    return (
        <div>
            <h1>{profile.name}</h1>
            <div>
                <img src={profile.avatar} alt="Avatar" />
            </div>
            <p>{profile.bio}</p>
            <div>
                <h2>マイタグ</h2>
                <ul>
                    {profile.tags.map((tag, index) => <li key={index}>{tag}</li>)}
                </ul>
            </div>
            <div>
                <h2>最近の記録</h2>
                <ul>
                    {profile.records.map((record, index) => <li key={index}>{record}</li>)}
                </ul>
            </div>
            <div>
                <h2>街との関わり方</h2>
                <p>{profile.cityRelations}</p>
            </div>
        </div>
    );
}

export default ProfileTab;