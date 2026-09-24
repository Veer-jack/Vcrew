// Where to send someone back to after they sign back in, for the case where
// landing on the login page was an in-app "your session dropped mid-
// navigation" redirect. Deliberately a plain module variable, not
// sessionStorage/localStorage/React Router's `location.state` -- all three
// of those survive a hard page reload, which meant logging out, refreshing
// the now-showing login page, then signing back in still bounced back to
// whatever page you'd logged out from instead of the dashboard/Discover
// home. A reload should always start fresh; only a same-session redirect
// (no reload in between) should be remembered.
let pendingPath = null;

export function rememberPreLoginPath(path) {
  pendingPath = path;
}

export function takePreLoginPath() {
  const p = pendingPath;
  pendingPath = null;
  return p;
}
