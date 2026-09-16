import { useMemo } from "react";
import TrustScoreDisplay from "./TrustScoreDisplay";

function Sidebar({ profile }) {
  return (
    <div>
      <TrustScoreDisplay score={profile.trustScore} />
      {/* Other sidebar components and logic remains unchanged */}
    </div>
  );
}

export default Sidebar;