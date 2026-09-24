// Shared between the builder's submission-review drawer (routes/missions.js)
// and the validator's own read-only view of what they submitted
// (routes/vmissions.js) -- both need the exact same raw response_json parsed
// into per-task { label, value, attachments } rows, so this lives in one
// place instead of two copies that could drift.
export function buildResponseBreakdown(data, missionTasks) {
  return data.map((ans, i) => {
    let taskTitle = `Task ${i + 1}`;
    if (missionTasks[i] && missionTasks[i].title) {
      taskTitle = missionTasks[i].title;
    } else if (missionTasks[i] && missionTasks[i].prompt) {
      taskTitle = missionTasks[i].prompt;
    } else if (typeof missionTasks[i] === "string") {
      taskTitle = missionTasks[i];
    }

    if (typeof ans === "string") {
      return {
        t: taskTitle,
        rating: 0,
        ans,
        details: [],
        attachments: [],
      };
    }

    let attachments = [];
    let details = [];
    for (const [key, val] of Object.entries(ans)) {
      if (key === "_proof") {
        const arr = Array.isArray(val) ? val : [val];
        attachments = arr.filter(v => typeof v === "string").map(v => (v.startsWith("/api") || v.startsWith("http")) ? v : `/api/uploads/${v}`);
        continue;
      }

      let displayLabel = key;
      let displayValue = String(val);
      let isRating = false;

      if (typeof val === "object" && val !== null) {
        if (val._detail) {
          const baseVal = Object.keys(val).filter(k => !isNaN(k)).map(k => val[k]).join("");
          displayValue = baseVal ? `${baseVal} (Detail: ${val._detail})` : val._detail;
        } else {
          displayValue = JSON.stringify(val);
        }
      }

      if (missionTasks[i] && Array.isArray(missionTasks[i].questions)) {
        const isDetail = key.endsWith("_detail");
        const baseKey = isDetail ? key.replace("_detail", "") : key;
        const qMatch = missionTasks[i].questions.find(q => q.id === baseKey);

        if (qMatch) {
          displayLabel = isDetail ? `Detail: ${qMatch.text}` : qMatch.text;
          // The "_detail" follow-up (free text) is never itself a rating,
          // even when it's attached to a rating question's id.
          isRating = !isDetail && qMatch.type === "rating";
        }
      }

      details.push({ label: displayLabel, value: displayValue, isRating });
    }

    return {
      t: taskTitle,
      rating: 0, // builders will rate it overall
      details,
      attachments: attachments.filter(Boolean),
    };
  }).filter(Boolean);
}

// A response can be left in this shape if a validator's resubmission after a
// revision request never actually completed server-side -- it's still
// whatever the last draft autosave wrote: a wrapped {answers, curIdx}
// object, not the plain per-task array a real submission stores. Unwrapping
// it the same way the validator's own resume screen already does
// (Workspace.jsx) means this still shows the real, if incomplete, answers
// instead of dumping the wrapper itself as if it were a submitted answer.
export function parseResponseData(dataJson) {
  try {
    const parsed = dataJson ? JSON.parse(dataJson) : [];
    const wrapped = parsed && !Array.isArray(parsed) && Array.isArray(parsed.answers);
    return wrapped ? parsed.answers : (Array.isArray(parsed) ? parsed : [parsed]);
  } catch {
    return [];
  }
}
