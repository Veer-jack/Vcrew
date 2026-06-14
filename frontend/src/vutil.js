export function deadlineHours(deadline) {
  const m = /(\d+)\s*([hd])/.exec(deadline || "");
  if (!m) return 999;
  return m[2] === "d" ? +m[1] * 24 : +m[1];
}

export function deadlineLabel(deadline) {
  return (deadline || "").replace("Closes ", "");
}
