import { useMemo } from "react";
import TrustScoreDisplay from "./TrustScoreDisplay";

function Sidebar() {
  return (
    <div>
      {/* Sidebar contents excluding removed features */}
      <TrustScoreDisplay />
    </div>
  );
}

export default Sidebar;