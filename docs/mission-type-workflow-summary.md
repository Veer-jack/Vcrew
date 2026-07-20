# Mission-Type Workflow Project — What We Built and Why

**For:** explaining these decisions to your team lead, and knowing exactly what to touch if
they want something changed.

**The problem we started from:** ValidationCrew's mission wizard has 9 categories and 8
participation types, but almost none of them changed what a validator actually experienced —
every mission collapsed into the same generic "answer AI-generated questions, upload proof,
submit" flow. This project fixed that, one mission-type family at a time, across 5 phases.

Each phase below has a full design doc (with every alternative we considered and rejected) and
implementation plan already written — linked at the end of each section. This file is the
short version; those are the long version if you need to justify a specific call in detail.

---

## 1. Category/ptype-aware AI task generation

**What we built:** The AI that generates a mission's tasks now actually knows what type of
mission it's writing for. A Focus Group mission gets discussion-style prompts with no
screenshot requirement; a Website Testing mission gets navigation/usability tasks with
screenshot proof required — instead of every mission type getting the same generic task list.

**Why this way:** The AI simply never received category/participation-type information before —
that was the root cause, not bad prompt wording. We fixed the actual gap (the AI now gets real
type-specific guidance) instead of continuing to tinker with one generic prompt.

**What we didn't build:** Branching the validator's task-completion screen itself by type (e.g. a
fundamentally different UI for a Focus Group vs a Survey). That's a bigger change with more
surface area; this phase deliberately stopped at "the AI writes different tasks," which was the
actual complaint.

**To change this:** `docs/superpowers/specs/2026-07-18-category-ptype-aware-task-generation-design.md`

---

## 2. Multi-day missions (Product Trial)

**What we built:** A validator on a multi-day Product Trial mission now checks in daily (with a
real photo upload) before they can submit their final review. The builder still only does **one**
approval action at the end, not one per day.

**Why this way:** We compared three payout models —
- **What we chose:** one final review, paid like every other mission, using the exact same
  approve/reject/escrow code that already existed.
- **Rejected — pay automatically per day:** would need brand-new payout logic with zero human
  review, meaning a validator could submit junk answers daily and get paid automatically.
- **Rejected — builder reviews every single day:** doesn't scale. A 100-validator, 7-day mission
  would need 700 review actions instead of 100.

To keep quality visible without the scaling cost, the builder's final review screen shows the
**entire daily check-in history** as context — so they can still catch a validator who barely
engaged, without needing to review each day separately.

**To change this:** `docs/superpowers/specs/2026-07-18-multi-day-missions-design.md`

---

## 3. Website/App Testing task generation polish

**What we built:** The wizard's "Fetch & analyse" button (next to the product URL field) used to
be completely fake — it did nothing. It now actually fetches the real page and feeds real content
(title, description, headings) into the AI prompt, so generated tasks reference the actual
product instead of generic guesses.

**Why this way:** This was the highest-leverage fix for "AI tasks feel generic" — there was
simply no real signal reaching the AI. We built it with zero new dependencies and a real security
control (the server can now fetch arbitrary URLs a builder submits, so we built in protection
against it being pointed at internal services or cloud metadata endpoints — the same class of
risk any "paste a URL, we'll fetch it" feature has).

**Found and fixed along the way:** a genuine security gap in that protection (certain
specially-formatted addresses could sneak past the filter) — caught in review before shipping,
not after.

**What we didn't build:** Full video-provider-style integration for App Testing — that ptype
already had good AI guidance from phase 1; we only sharpened it to use the device/platform info
the wizard already collects but wasn't using.

**To change this:** `docs/superpowers/specs/2026-07-18-website-app-task-generation-polish-design.md`

---

## 4. Sample Distribution fulfillment

**What we built:** Sample Distribution missions (builder ships a physical product to a
validator) were 100% cosmetic before this — just a label and a fake cost estimate. Now
validators have a real shipping address on their profile, and there's real shipment tracking:
builder marks it shipped (with a tracking number), validator confirms it arrived, and only then
does the review unlock.

**Why this way:** We deliberately chose **manual tracking, no shipping-carrier API integration**
— the builder ships however they normally would and just tells the platform "shipped" / the
validator tells it "received." Building a real carrier integration (labels, live tracking) would
mean picking a shipping API provider and taking on its costs/complexity — the same category of
decision we're explicitly deferring for video calls (see below).

**What we didn't build:** Real escrow changes for the fulfillment cost — the existing "+₹60 per
participant" estimate shown to builders stays exactly as it was (cosmetic), since making it a
real charge is a separate decision from "does shipment tracking work."

**A significant thing we found while building this:** the app's internal API layer for
validators was silently broken in a way that meant the multi-day check-in feature (item #2
above) had never actually talked to the real backend in a live browser — it was quietly running
on fake placeholder data instead. We found and fixed this while building sample tracking, so #2
now genuinely works end-to-end for the first time.

**To change this:** `docs/superpowers/specs/2026-07-18-sample-distribution-fulfillment-design.md`

---

## 5. Interview Scheduling

**What we built:** Interview missions (a live 1-on-1 call between builder and validator) can now
actually be scheduled: the builder proposes a date/time and pastes in their own meeting link
(Zoom, Google Meet, whatever they already use), the validator accepts or declines, and if they
decline, the builder can propose a new time. After the call, the builder marks it complete and
the validator finishes their written review — same approval/payout flow as everything else.

**Why this way:** Two big decisions here, both leaning toward "smallest real version":
- **Manual meeting link, no video-provider integration.** Same reasoning as Sample
  Distribution's manual shipping — building real Zoom/Meet API integration means picking a
  provider and taking on API costs and setup, which is a much bigger, slower decision than the
  actual problem needed.
- **Builder proposes one fixed time (accept/decline), not a negotiation or calendar system.** A
  full "find a time that works for both people" system is a meaningfully bigger feature on its
  own. The tradeoff: if the proposed time doesn't work, the mission goes nowhere until the
  builder tries again — we accepted that rigidity to avoid building a negotiation state machine.

**What we deliberately did NOT simplify:** the live-call nature of Interview itself. We
considered making it "solo" like Video Call (validator just records themselves, no live call
needed) — but that would remove the entire reason a builder picks "Interview" over "Video Call"
or "Survey" in the first place. The infrastructure got smaller; the actual interaction stayed
what it's supposed to be.

**What we split out on purpose:** Focus Group missions (6-8 validators, not 1) need a genuinely
harder scheduling problem — coordinating a group, not a pair. Rather than build a weaker version
of that alongside Interview, we scoped it out entirely as its own future project.

**To change this:** `docs/superpowers/specs/2026-07-19-interview-scheduling-design.md`

---

## 6. Focus Group Scheduling

**What we built:** Focus Group missions (6-8 validators, one live moderated session) can now
actually be scheduled. The builder offers 2-4 candidate time slots and pastes in a meeting link;
each accepted validator marks every slot they can make (not just one); the builder sees a live
turnout tally per slot and locks in whichever works for the most people; after the session, the
builder marks it complete. Validators who were available for the locked slot move on to the
normal review/submit flow; validators who weren't simply aren't part of that session.

**Why this way:** A single guessed time (like Interview uses for its 1-on-1 case) doesn't work
for a group — if each validator has even a 70% chance of being free at any one guessed time, the
odds all 6-8 are free *simultaneously* is only around 12%. So instead of one guess, the builder
offers a handful of options and lets turnout decide:
- **What we chose:** a bounded poll (2-4 builder-picked candidate times, validators multi-select
  their availability, builder locks the best one). No enforced minimum headcount before locking —
  same as Interview trusts the builder's judgment on marking a call "completed," the system can't
  verify real-world attendance either way.
- **Rejected — reuse Interview's single-guess model:** the math above shows this would
  functionally fail for a group, not just be less convenient.
- **Rejected — real calendar/availability integration:** would need Google/Outlook OAuth and
  real free/busy lookups — a project on its own, and it's exactly the kind of new sensitive-data
  category (real personal calendar access) this project has avoided everywhere else.

**Data model:** three small tables (one poll per mission, a handful of candidate-slot rows, and
one response row per validator per slot they marked available) instead of a JSON blob on the
mission — kept the same atomic, single-statement state transitions (`UPDATE ... WHERE status =
X`) that every other phase in this project has relied on for race-safety, rather than introducing
the one place in the whole project that would need JSON read-modify-write locking.

**What we deliberately didn't build:** re-opening a locked poll if the chosen time falls through
— that's a new poll, not an edit to the old one, keeping the state machine simple
(`open → locked → completed`, no going backward).

**A real bug we found and fixed while building this:** the validator's "submit my availability"
route didn't check that the time slots someone selected actually belonged to *their own*
mission's poll — because slot IDs are just sequential numbers, a validator could have (accidentally
or otherwise) submitted a slot ID belonging to a completely different mission's poll, silently
inflating that other builder's turnout count for a time no one in their own mission actually
picked. Caught in review before shipping, fixed by checking every submitted slot against the poll
it's being submitted to.

**To change this:** `docs/superpowers/specs/2026-07-19-focus-group-scheduling-design.md`

---

## Still not built (on purpose)

- **Real video-provider integration** (Zoom/Meet API, in-app calling, recording) — every phase
  that touched video/scheduling chose the manual-link version instead. Revisiting this means
  picking a provider and accepting new API costs, not just more engineering time.
- **Real shipping-carrier integration** (Sample Distribution) — same reasoning, manual tracking
  chosen instead.

## If something needs to change

Each phase's design doc (linked above) has a full "Why This Approach" section explaining the
rejected alternatives in more depth than this summary — that's the first place to look before
deciding whether to revisit a decision. Each phase also has a matching implementation plan
(`docs/superpowers/plans/`) with the exact files and code touched, if the answer is "change the
implementation" rather than "reconsider the design."
