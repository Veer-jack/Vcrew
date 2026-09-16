// <input type="number"> silently accepts "e"/"E" (scientific notation) and
// "+"/"-" while typing, even though .value only ever reflects them once the
// text becomes a valid number — every amount/count field in this app is a
// plain positive number, so letting any of these through just leaves stray
// characters sitting in the field with no valid value behind them.
export function blockInvalidNumberKeys(e) {
  if (e.key === "e" || e.key === "E" || e.key === "+" || e.key === "-") e.preventDefault();
}
