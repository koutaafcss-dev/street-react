import React from "react";

function ProfileTab({ profile }) {
    return (
        <div>
            <div className="header">{profile.nickname}</div>
            <img src={profile.avatar} alt="avatar" />
            <p>{profile.bio}</p>
            <div className="tags">{profile.tags.join(', ')}</div>
            <div className="recent-records">{profile.recentRecords.join(', ')}</div>
            <div className="city-engagement-summary">{profile.cityEngagementSummary}</div>
        </div>
    );
}

export default ProfileTab;