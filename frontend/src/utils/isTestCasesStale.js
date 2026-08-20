export function isTestCasesStale(d) {
  if (!d.genFor) return false;
  if (d.genFor.cat !== d.cat || d.genFor.ptype !== d.ptype) return true;
  const form = d.testCaseForm || {};
  return d.genFor.desc !== form.desc
    || d.genFor.url !== form.url
    || JSON.stringify(d.genFor.platforms) !== JSON.stringify(form.platforms || [])
    || JSON.stringify(d.genFor.goals) !== JSON.stringify(form.goals || [])
    || d.genFor.users !== form.users;
}
