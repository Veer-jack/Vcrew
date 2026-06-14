export const STAGES = [
  { id: "invited",  label: "Invited",  color: "#8b94a6" },
  { id: "accepted", label: "Accepted", color: "var(--t-website)" },
  { id: "started",  label: "Started",  color: "var(--t-app)" },
  { id: "submitted",label: "Submitted",color: "var(--warning)" },
  { id: "approved", label: "Approved", color: "var(--t-trial)" },
  { id: "rewarded", label: "Rewarded", color: "var(--success)" },
];

export const FILE_KIND = {
  pdf:   { icon: "fileText", tc: "var(--t-research)" },
  figma: { icon: "edit", tc: "var(--t-app)" },
  link:  { icon: "link", tc: "var(--t-website)" },
  image: { icon: "image", tc: "var(--t-trial)" },
  video: { icon: "film", tc: "var(--t-focus)" },
};
