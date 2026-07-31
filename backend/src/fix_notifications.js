const fs = require('fs');

const file = '/home/ravikiran/Desktop/Vcrew/backend/src/routes/vmissions.js';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  {
    target: "    await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'user_minus', 'xCircle', 'warning', ?, ?, 'Just now', 1)`)\n      .run(mission.builder_id, \"Validator Withdrew\", `${req.validator.name} has gracefully withdrawn from \"${mission.name}\". Their slot is now open.`);",
    replacement: "    await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'system', 'user_minus', 'xCircle', 'warning', ?, ?, 'Just now', 1, ?)`)\n      .run(mission.builder_id, \"Validator Withdrew\", `${req.validator.name} has gracefully withdrawn from \"${mission.name}\". Their slot is now open.`, req.params.id);"
  },
  {
    target: "      await db.prepare(`\n        INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread)\n        VALUES (?, 'application', 'submission', 'check', 'accent', 'Revision Submitted', ?, 'Just now', 1)\n      `).run(m.builder_id, `A validator has updated their response for ${m.name} and is ready for your review.`);",
    replacement: "      await db.prepare(`\n        INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)\n        VALUES (?, 'application', 'submission', 'check', 'accent', 'Revision Submitted', ?, 'Just now', 1, ?)\n      `).run(m.builder_id, `A validator has updated their response for ${m.name} and is ready for your review.`, req.params.id);"
  },
  {
    target: "      await db.prepare(`\n        INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread)\n        VALUES (?, 'application', 'submission', 'check', 'primary', 'Mission Submitted', ?, 'Just now', 1)\n      `).run(m.builder_id, `A validator has completed and submitted their response for ${m.name}.`);",
    replacement: "      await db.prepare(`\n        INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)\n        VALUES (?, 'application', 'submission', 'check', 'primary', 'Mission Submitted', ?, 'Just now', 1, ?)\n      `).run(m.builder_id, `A validator has completed and submitted their response for ${m.name}.`, req.params.id);"
  },
  {
    target: "    await db.prepare(`\n      INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread)\n      VALUES (?, 'application', 'submission', 'check', 'primary', 'Mission Submitted', ?, 'Just now', 1)\n    `).run(m.builder_id, `A validator has completed and submitted their response for ${m.name}.`);",
    replacement: "    await db.prepare(`\n      INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)\n      VALUES (?, 'application', 'submission', 'check', 'primary', 'Mission Submitted', ?, 'Just now', 1, ?)\n    `).run(m.builder_id, `A validator has completed and submitted their response for ${m.name}.`, req.params.id);"
  },
  {
    target: "  await db.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'shipment_received', 'package', 'success', ?, ?, 'Just now', 1)`)\n    .run(m.builder_id, \"Sample Received\", `${req.validator.name} has received the sample for ${m.name}.`);",
    replacement: "  await db.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'system', 'shipment_received', 'package', 'success', ?, ?, 'Just now', 1, ?)`)\n    .run(m.builder_id, \"Sample Received\", `${req.validator.name} has received the sample for ${m.name}.`, req.params.id);"
  },
  {
    target: "  await db.prepare(`\n    INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread)\n    VALUES (?, 'application', 'schedule_accepted', 'calendar', 'success', 'Interview Accepted', ?, 'Just now', 1)\n  `).run(m.builder_id, `${val ? val.name : 'A validator'} has accepted the interview time for \"${m.name}\".`);",
    replacement: "  await db.prepare(`\n    INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)\n    VALUES (?, 'application', 'schedule_accepted', 'calendar', 'success', 'Interview Accepted', ?, 'Just now', 1, ?)\n  `).run(m.builder_id, `${val ? val.name : 'A validator'} has accepted the interview time for \"${m.name}\".`, req.params.id);"
  },
  {
    target: "  await db.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'system', 'schedule_declined', 'xCircle', 'warning', ?, ?, 'Just now', 1)`)\n    .run(m.builder_id, \"Interview Declined\", `${req.validator.name} declined the proposed interview time for ${m.name}.`);",
    replacement: "  await db.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'system', 'schedule_declined', 'xCircle', 'warning', ?, ?, 'Just now', 1, ?)`)\n    .run(m.builder_id, \"Interview Declined\", `${req.validator.name} declined the proposed interview time for ${m.name}.`, req.params.id);"
  },
  {
    target: "    await db.prepare(`\n      INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread)\n      VALUES (?, 'application', 'mission_failed', 'xCircle', 'danger', 'Mission Failed', ?, 'Just now', 1)\n    `).run(m.builder_id, `A validator failed the mission \"${m.name}\" due to missed check-ins.`);",
    replacement: "    await db.prepare(`\n      INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)\n      VALUES (?, 'application', 'mission_failed', 'xCircle', 'danger', 'Mission Failed', ?, 'Just now', 1, ?)\n    `).run(m.builder_id, `A validator failed the mission \"${m.name}\" due to missed check-ins.`, req.params.id);"
  },
  {
    target: "  await db.prepare(`\n    INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread)\n    VALUES (?, 'application', 'checkin', 'check', 'accent', 'Review Completed', ?, 'Just now', 1)\n  `).run(m.builder_id, `Day ${sequentialDay} review completed by ${val ? val.name : 'a validator'} for mission \"${m.name}\".`);",
    replacement: "  await db.prepare(`\n    INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id)\n    VALUES (?, 'application', 'checkin', 'check', 'accent', 'Review Completed', ?, 'Just now', 1, ?)\n  `).run(m.builder_id, `Day ${sequentialDay} review completed by ${val ? val.name : 'a validator'} for mission \"${m.name}\".`, req.params.id);"
  },
  {
    target: "      await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'application', 'participant_joined', 'userplus', 'primary', ?, ?, 'Just now', 1)`)\n        .run(m.builder_id, \"Invite Accepted\", `${req.validator.name} has accepted your invitation and joined ${m.name}.`);",
    replacement: "      await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'application', 'participant_joined', 'userplus', 'primary', ?, ?, 'Just now', 1, ?)`)\n        .run(m.builder_id, \"Invite Accepted\", `${req.validator.name} has accepted your invitation and joined ${m.name}.`, m.id);"
  },
  {
    target: "      await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread) VALUES (?, 'application', 'invite_declined', 'xCircle', 'warning', ?, ?, 'Just now', 1)`)\n        .run(m.builder_id, \"Invite Declined\", `${req.validator.name} has declined your invitation for ${m.name}.`);",
    replacement: "      await tx.prepare(`INSERT INTO notifications (builder_id, cat, type, icon, tone, title, body, time_label, unread, target_id) VALUES (?, 'application', 'invite_declined', 'xCircle', 'warning', ?, ?, 'Just now', 1, ?)`)\n        .run(m.builder_id, \"Invite Declined\", `${req.validator.name} has declined your invitation for ${m.name}.`, m.id);"
  }
];

let replaced = 0;
for (const r of replacements) {
  if (content.includes(r.target)) {
    content = content.replace(r.target, r.replacement);
    replaced++;
  } else {
    console.error(\"Could not find: \" + r.target);
  }
}

fs.writeFileSync(file, content);
console.log(`Replaced ${replaced} out of ${replacements.length}`);
