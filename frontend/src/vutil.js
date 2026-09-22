export function deadlineHours(deadline) {
  const m = /(\d+)\s*([hd])/.exec(deadline || "");
  if (!m) return 999;
  return m[2] === "d" ? +m[1] * 24 : +m[1];
}

export function deadlineLabel(deadline) {
  return (deadline || "").replace("Closes ", "");
}

// "on approval" (the reward lands once your submission is approved) only
// makes sense when there's actually a payout. A "free"/community mission
// pays nothing and a "sample" ships regardless — appending "on approval"
// there just reads as noise ("Community on approval").
export const rewardPaysOnApproval = (type) => type !== "free" && type !== "sample";

// Where a page's own "Back to My Missions" link should actually land --
// MyMissions.jsx remembers the last tab it was showing in sessionStorage
// (see its own effect), so a validator several hops deep (Workspace, Daily
// Check-in, Mission Brief, Shipment Status, Task Review, Mission Results,
// Focus Group Poll) returns to the tab they actually started from instead
// of always landing back on "Active".
export function backToMyMissionsUrl() {
  let tab = null;
  try { tab = sessionStorage.getItem("vc_my_missions_tab"); } catch { /* ignore */ }
  return tab ? `/validator/missions?tab=${tab}` : "/validator/missions";
}
