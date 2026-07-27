// Shared by the daily-checkin route (vmissions.js) and the sweep cron job
// (jobs/sweepFailures.js) — both need to know, from the same rules, whether a trial
// validator has skipped too many calendar days to keep going.
export const TRIAL_EXTRA_DAYS = 2;

export function computeCheckinStatus(acceptedAt, checkins) {
  const acceptedDate = new Date(acceptedAt);
  const now = new Date();
  const acceptedMidnight = new Date(acceptedDate.getFullYear(), acceptedDate.getMonth(), acceptedDate.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const currentCalendarDay = Math.floor((nowMidnight - acceptedMidnight) / (1000 * 60 * 60 * 24)) + 1;

  const completedDays = checkins.length;
  let alreadySubmittedToday = false;
  if (checkins.length > 0) {
    const lastCheckin = checkins[checkins.length - 1];
    const lastDate = new Date(lastCheckin.submitted_at);
    const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
    alreadySubmittedToday = lastMidnight === nowMidnight;
  }

  const pastDays = currentCalendarDay - 1;
  const pastCompleted = alreadySubmittedToday ? completedDays - 1 : completedDays;
  const skippedDays = Math.max(0, pastDays - pastCompleted);
  const lockedOut = TRIAL_EXTRA_DAYS - skippedDays < 0;

  return { currentCalendarDay, completedDays, alreadySubmittedToday, skippedDays, lockedOut };
}
