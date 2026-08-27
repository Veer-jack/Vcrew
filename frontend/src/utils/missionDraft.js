// Single source of truth for the mission-draft persistence model used by
// CreateMissionWizard, Dashboard, and Missions:
//
// - A DB draft row is permanent once created — nothing deletes it except the
//   Draft tab's trash icon.
// - The "recent draft pointer" is a disposable localStorage bookmark to the
//   ONE draft most recently touched — used only to decide what "Create
//   Mission" and the Dashboard banner resume into. Clearing it never touches
//   the DB.
// - A "scratch" copy of the in-progress form is kept locally only for the
//   brief pre-promotion window (before any content exists worth a real DB
//   row) — it's cleared the moment a real draft row exists, since the DB
//   becomes the source of truth from that point on.
//
// Every one of these is scoped per-builder so switching accounts on the same
// browser never shows one builder's draft to another.

const recentKey = (builderId) => `vcrew_mission_recent_draft_${builderId || "anon"}`;
const scratchKey = (builderId) => `vcrew_mission_scratch_${builderId || "anon"}`;

export function getRecentDraftId(builderId) {
  try { return localStorage.getItem(recentKey(builderId)) || null; } catch { return null; }
}
export function setRecentDraftId(builderId, id) {
  try { localStorage.setItem(recentKey(builderId), String(id)); } catch { /* ignore */ }
}
export function clearRecentDraftId(builderId) {
  try { localStorage.removeItem(recentKey(builderId)); } catch { /* ignore */ }
}

export function getScratch(builderId) {
  try {
    const raw = localStorage.getItem(scratchKey(builderId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function setScratch(builderId, data) {
  try { localStorage.setItem(scratchKey(builderId), JSON.stringify(data)); } catch { /* ignore */ }
}
export function clearScratch(builderId) {
  try { localStorage.removeItem(scratchKey(builderId)); } catch { /* ignore */ }
}

export function clearAllLocalDraftState(builderId) {
  clearRecentDraftId(builderId);
  clearScratch(builderId);
}

// The one canonical "is there real content worth saving" check — used to
// gate every write (scratch, promote-to-DB) and every read (banner, toast).
// Any field the builder has actually touched counts, not just title/desc.
export function hasContent(d) {
  if (!d) return false;
  return Boolean(
    d.title?.trim() || d.desc?.trim() || d.cat || d.ptype || d.deadline ||
    d.reward?.type || (d.tasks && d.tasks.length > 0)
  );
}

// True if there's something to resume — either a real DB draft (the
// pointer) or a not-yet-promoted local scratch copy with real content.
export function hasResumableDraft(builderId) {
  if (getRecentDraftId(builderId)) return true;
  return hasContent(getScratch(builderId));
}
