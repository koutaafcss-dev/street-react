import { useMemo } from "react";
import TrustScoreDisplay from "./TrustScoreDisplay";
import { getEventStatus, formatEventTime } from "../utils/eventHelpers";

function Sidebar({ user }) {
    return (
        <div className="sidebar">
            <TrustScoreDisplay score={user.trustScore} />
        </div>
    );
}

export default Sidebar;