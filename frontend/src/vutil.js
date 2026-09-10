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
