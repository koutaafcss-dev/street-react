import React from 'react';

const ProfileTab = ({ userProfile }) => {
    return (
        <div>
            <header>
                <h1>{userProfile.name}</h1>
                <p>{userProfile.bio}</p>
            </header>
            <div>
                <img src={userProfile.avatar} alt='Profile Avatar' />
                <div>{userProfile.tags.join(', ')}</div>
            </div>
            <div>
                <h2>Recent Records</h2>
                <ul>
                    {userProfile.recentRecords.map((record, index) => (
                        <li key={index}>{record}</li>
                    ))}
                </ul>
            </div>
            <div>
                <h2>How to Interact with the City</h2>
                <p>{userProfile.cityInteractionSummary}</p>
            </div>
        </div>
    );
};

export default ProfileTab;