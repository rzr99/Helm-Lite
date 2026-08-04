// The Motion Graphics production line — the "brain" the app runs on.
//
// One line runs every job. A job's TYPE decides which stations apply (a few are
// skipped for some types). Each station carries a full SOP — objective, the
// detailed how-to, exact settings, the "pass the gate" checklist, and common
// mistakes — so a producer can actually deliver from it, not just track it.
// A first draft: refine as real projects harden the standard.

export type JobTypeValue =
  | "launch"
  | "explainer"
  | "demo"
  | "teaser"
  | "logo_animation"
  | "kinetic"
  | "custom";

export const JOB_TYPES: { value: JobTypeValue; label: string; blurb: string }[] = [
  { value: "launch", label: "Launch video", blurb: "Announce a product or brand. Hook → what it is → CTA." },
  { value: "explainer", label: "Explainer video", blurb: "Make something clear. Problem → solution → how it works." },
  { value: "demo", label: "Demo / walkthrough", blurb: "Show the real product, screen by screen." },
  { value: "teaser", label: "Teaser / promo", blurb: "Short, punchy hype built on one message." },
  { value: "logo_animation", label: "Logo animation", blurb: "A 2–6s brand sting. No script or voiceover." },
  { value: "kinetic", label: "Kinetic typography", blurb: "Text-driven motion, timed to audio." },
  { value: "custom", label: "Custom", blurb: "Anything else — same backbone, bespoke where it needs to be." },
];

export function jobTypeLabel(value: string) {
  return JOB_TYPES.find((t) => t.value === value)?.label ?? value;
}

export const STATUSES = [
  { value: "briefed", label: "Briefed" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "revisions", label: "Revisions" },
  { value: "delivered", label: "Delivered" },
  { value: "paid", label: "Paid" },
] as const;

export type StatusValue = (typeof STATUSES)[number]["value"];

export function statusLabel(value: string) {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}

export type HowStep = { title: string; detail: string };
export type Setting = { k: string; v: string };

export type Station = {
  key: string;
  name: string;
  tool?: string;
  isGate?: boolean; // the internal QC gate — highlighted on the job
  objective: string;
  how: HowStep[];
  settings?: Setting[];
  pass: string[]; // the "to pass this gate" checklist
  mistakes: string[];
  gate: string; // one-line gate summary shown on the job
  skipFor?: JobTypeValue[]; // types that don't run this station
};

export const STATIONS: Station[] = [
  {
    key: "brief",
    name: "Discovery & Brief",
    objective:
      "A signed one-page brief that locks the goal, audience, single core message, tone, duration, references, and brand assets — plus deadline and revision rounds.",
    how: [
      { title: "Run the kickoff call", detail: "Get the client on a call — don't take a brief over DMs, you'll miss the 'why'. Record it (with permission) so nothing's lost." },
      { title: "Fill the LS-Brief", detail: "Capture the goal (what does success look like?), the audience, the ONE core message, tone in three adjectives, the duration, and where it will be posted." },
      { title: "Collect the assets", detail: "Vector logo, brand fonts, colour codes, any product footage — plus 2–3 reference videos they love, and ask what specifically they like about each." },
      { title: "Lock the commercials", detail: "Confirm final duration, deadline, and how many revision rounds are included, in writing. This is what stops scope creep later." },
    ],
    pass: [
      "Brief fits on one page and the core message is a single sentence",
      "All brand assets received — vector logo, fonts, colour codes",
      "Deadline and revision rounds agreed in writing",
    ],
    mistakes: [
      "Taking the brief over DMs — you miss the 'why'. Always call.",
      "Accepting vague references ('make it modern') — push for specific videos and specific reasons.",
      "Starting design before assets arrive — you'll only redo it.",
    ],
    gate: "Brief signed off and all brand assets received. No production time before this.",
  },
  {
    key: "script",
    name: "Script",
    skipFor: ["logo_animation"],
    objective: "A locked voiceover / on-screen script the client has approved before any visuals begin.",
    how: [
      { title: "Use the type's structure", detail: "Launch: hook → what it is → why it matters → CTA. Explainer: relatable problem → your solution → how it works → CTA. Demo: intro → feature by feature → recap → CTA." },
      { title: "Earn the first 3 seconds", detail: "Open on the hook — a bold claim, a sharp question, or the pain. No 'Hi, we're…' intros. If the first line doesn't grab, rewrite it." },
      { title: "One message, one CTA", detail: "Cut every sentence that isn't the core message. End on exactly one action you want the viewer to take." },
      { title: "Time it out loud", detail: "Read it against a stopwatch at ~150 words/min and trim to the agreed duration. Script overrun is the #1 cause of bloated videos." },
    ],
    settings: [
      { k: "Pace", v: "~150 words per minute" },
      { k: "Hook", v: "within the first 3 seconds" },
      { k: "CTA", v: "exactly one" },
    ],
    pass: [
      "Reads within the target duration when timed out loud",
      "Hook lands in the first 3 seconds",
      "One core message, one CTA, no jargon",
      "Client has approved it in writing",
    ],
    mistakes: [
      "Hook buried after an intro — move the strongest line to the very top.",
      "Two or three CTAs — pick one.",
      "Approving visuals before the script is locked — the most expensive redo on the line.",
    ],
    gate: "Client approves the script. Words are locked before any visuals begin.",
  },
  {
    key: "voiceover",
    name: "Voiceover",
    tool: "ElevenLabs",
    skipFor: ["logo_animation"],
    objective: "Final voiceover audio in the locked Linear brand voice, at spec.",
    how: [
      { title: "Load the final script", detail: "Paste the APPROVED script into ElevenLabs — never generate voiceover from a draft." },
      { title: "Use the locked voice", detail: "Select the LS-Voice profile — the one voice ID Linear uses on every video. The consistent voice is part of the brand; never pick a different one per project." },
      { title: "Tune the read, not the voice", detail: "If a line sounds off, fix it with punctuation, commas, and line breaks — they control pauses and emphasis. Don't swap voices or randomly crank settings." },
      { title: "Export & clean", detail: "Export WAV, then in Premiere normalise the level, trim heavy breaths, and remove any glitches." },
    ],
    settings: [
      { k: "Voice", v: "LS-Voice (locked ID)" },
      { k: "Stability", v: "set once, then documented — same every time" },
      { k: "Similarity", v: "set once, then documented" },
      { k: "Export", v: "WAV, 48 kHz" },
    ],
    pass: [
      "The locked LS-Voice profile was used",
      "The read matches the approved script word-for-word",
      "No robotic pauses or audible glitches",
      "Level is consistent with previous videos",
    ],
    mistakes: [
      "A different voice or settings per project — breaks brand consistency.",
      "Fixing a bad read by maxing stability — it goes flat. Use punctuation instead.",
      "Clipping or peaking audio — normalise on export.",
    ],
    gate: "Correct LS-Voice profile used, audio clean, matches the approved script word-for-word.",
  },
  {
    key: "storyboard",
    name: "Storyboard & Style Frames",
    tool: "Figma",
    objective: "An approved scene-by-scene plan plus 2–3 style frames that lock the look before any animation.",
    how: [
      { title: "Board every scene", detail: "In LS-Storyboard, one frame per line of script — sketch what's on screen as each line is spoken. Rough is fine; the plan is the point." },
      { title: "Design 2–3 style frames", detail: "From LS-StyleFrame, fully design a few key moments to lock colour, type, and composition before any animation." },
      { title: "Note the motion", detail: "On each frame, jot how things move — slide in, scale up, fade — so the animator isn't guessing." },
      { title: "Get sign-off", detail: "Send storyboard + style frames to the client. This is the last cheap moment to change direction. Demo jobs: also map the exact product-screen order here." },
    ],
    pass: [
      "Every script line has a board frame",
      "2–3 finished style frames lock the look",
      "On-brand colour and type throughout",
      "Client approved the direction in writing",
    ],
    mistakes: [
      "Animating with no style frames — the look drifts and gets rejected late.",
      "No motion notes — the animator invents it and you redo it.",
      "Skipping client sign-off — expensive changes after animation.",
    ],
    gate: "Client approves the storyboard and visual direction.",
  },
  {
    key: "design",
    name: "Design & Assets",
    tool: "Figma / AE",
    objective: "Every scene asset built at final resolution, on the approved style, in a clean project ready to animate.",
    how: [
      { title: "Build to the style frames", detail: "Produce every scene's assets matching the approved frames exactly. No new styles introduced halfway through." },
      { title: "Start from LS-AE master", detail: "Open the LS-AE master project — brand presets, comp sizes, and folder structure are already set. Never start from a blank project." },
      { title: "Handle the type's specifics", detail: "Demo: screen-record the real product at high resolution, clean UI, no clutter. Logo animation: import the vector logo — never rasterise." },
      { title: "Keep it clean", detail: "Name and colour-label every layer and comp. Someone else has to open this and find things instantly." },
    ],
    pass: [
      "Assets match the approved style frames",
      "Everything at final resolution — no upscaled raster",
      "AE project follows LS-AE structure, layers named",
      "On-brand colours and fonts only",
    ],
    mistakes: [
      "A messy AE project — revisions then take three times as long.",
      "Rasterised logos — blurry at scale.",
      "Inventing styles not in the frames — off-brand, gets rejected.",
    ],
    gate: "Assets on-brand, at correct resolution, project organised to the LS-AE structure.",
  },
  {
    key: "animation",
    name: "Animation",
    tool: "After Effects",
    objective: "The video animated to the storyboard, timed to the voiceover and music.",
    how: [
      { title: "Animate to the board", detail: "Scene by scene, follow the storyboard and its motion notes. Don't freestyle the structure." },
      { title: "Use LS-Presets, never linear", detail: "Apply the LS easing presets to every move. Linear keyframes are the #1 tell of amateur motion — always ease in and out." },
      { title: "Sync to the audio", detail: "Time cuts and key moves to the voiceover and the music beat. The video should feel locked to the sound." },
      { title: "Polish", detail: "Consistent speed across scenes, no dead pauses, overlapping motion so the eye is always led. Subtle secondary motion adds life." },
    ],
    settings: [
      { k: "Frame rate", v: "30 fps (or as briefed)" },
      { k: "Easing", v: "LS-Presets — no linear keyframes" },
      { k: "Motion blur", v: "on for fast moves" },
    ],
    pass: [
      "Every move is eased — nothing linear",
      "Cuts and key moves sync to the audio",
      "Speed and style consistent across all scenes",
      "No dead time or awkward holds",
    ],
    mistakes: [
      "Linear keyframes — looks robotic. Ease everything.",
      "Ignoring the music beat — the motion feels disconnected.",
      "Pacing that jumps between scenes — jarring.",
    ],
    gate: "Motion is smooth, synced to audio, and consistent in style across all scenes.",
  },
  {
    key: "sound",
    name: "Sound Design & Music",
    tool: "Premiere",
    objective: "A balanced, mastered audio mix — voiceover, music, and SFX sitting together.",
    how: [
      { title: "Layer the SFX", detail: "From LS-SFX, add whooshes, pops, and clicks matched to the animation's key moves. SFX are what sell the motion." },
      { title: "Add licensed music", detail: "Pick a licensed track that fits the tone, and confirm the licence covers the client and commercial use. Never use an unlicensed track." },
      { title: "Duck and balance", detail: "Side-chain or manually duck the music under the voiceover so the VO is always clearly on top." },
      { title: "Master to spec", detail: "Master the full mix to about −14 LUFS for social and check nothing peaks or clips." },
    ],
    settings: [
      { k: "Loudness", v: "~ −14 LUFS (social)" },
      { k: "True peak", v: "≤ −1 dBTP" },
      { k: "Balance", v: "voiceover always above music" },
    ],
    pass: [
      "Voiceover clearly on top of the music at all times",
      "SFX match the key motion moments",
      "Mastered to ~ −14 LUFS with no clipping",
      "Music licence covers commercial use",
    ],
    mistakes: [
      "Music burying the voiceover — duck it harder.",
      "Clipping or peaking — pull the master down.",
      "An unlicensed track — a real legal risk. Always licensed.",
    ],
    gate: "Balanced mix, ~ −14 LUFS, no clipping, and the music licence is cleared.",
  },
  {
    key: "qc",
    name: "Internal QC",
    isGate: true,
    objective: "Catch everything before the client ever sees the video.",
    how: [
      { title: "Run LS-QC top to bottom", detail: "Go through the LS-QC checklist item by item — don't eyeball it. This gate is why clients trust the output." },
      { title: "Check the brand", detail: "Every colour and font matches the brand kit. Zero off-brand elements anywhere." },
      { title: "Proof every word", detail: "Read every on-screen word out loud for spelling and grammar. Typos are the most common — and most embarrassing — miss." },
      { title: "Verify the tech", detail: "Audio at spec, everything in sync, exports at the right settings, no render artefacts or stray frames." },
    ],
    pass: [
      "Brand colours and fonts correct everywhere",
      "Every on-screen word proofed — zero typos",
      "Audio at spec and fully in sync",
      "Exports correct — no artefacts or flash frames",
    ],
    mistakes: [
      "Eyeballing instead of running the list — misses slip through.",
      "Letting the client be the one to find the typo — it damages trust.",
    ],
    gate: "Every checklist item passes. This is the whole point of running a line.",
  },
  {
    key: "review",
    name: "Client Review",
    objective: "Sign-off, within the agreed number of revision rounds.",
    how: [
      { title: "Deliver for structured feedback", detail: "Send the draft on a review tool (Frame.io or a review link) where the client leaves time-stamped comments — not vague DMs." },
      { title: "Consolidate the notes", detail: "Gather ALL feedback into one list before touching the project. Don't make piecemeal changes as notes trickle in." },
      { title: "Revise within rounds", detail: "Make the agreed changes. If a request goes beyond the included rounds or changes the brief, flag it as extra scope — politely, in writing." },
    ],
    pass: [
      "Feedback collected in one consolidated pass",
      "All in-scope notes addressed",
      "Out-of-scope requests flagged, not silently absorbed",
      "Client signed off on the final cut",
    ],
    mistakes: [
      "Piecemeal edits as notes dribble in — wasted time.",
      "Silently absorbing scope creep — it kills your margin.",
    ],
    gate: "Client sign-off on the final cut.",
  },
  {
    key: "delivery",
    name: "Delivery",
    tool: "Premiere",
    objective: "Final files in every needed format, and the source safely archived.",
    how: [
      { title: "Export all ratios", detail: "Using LS-Export presets, export every aspect ratio the client needs — 16:9 for YouTube, 9:16 for Reels/Shorts/TikTok, 1:1 for feed." },
      { title: "Add captions", detail: "Burn in or attach accurate captions — most social video is watched on mute." },
      { title: "Name & deliver", detail: "Name files to the LS convention (client_project_ratio_vN) and deliver via the agreed method." },
      { title: "Archive the source", detail: "Save the AE/Premiere project and assets to the archive so any future edit is possible." },
    ],
    settings: [
      { k: "16:9", v: "1920×1080, H.264" },
      { k: "9:16", v: "1080×1920" },
      { k: "1:1", v: "1080×1080" },
      { k: "Captions", v: "burned-in or .srt" },
    ],
    pass: [
      "All required aspect ratios exported to spec",
      "Accurate captions included",
      "Files named to the LS convention",
      "Source project archived",
    ],
    mistakes: [
      "Wrong export specs — the client can't post it.",
      "No captions — half the audience scrolls past.",
      "No archived source — future edits become impossible.",
    ],
    gate: "Specs correct, captions included, source archived.",
  },
];

const STATION_MAP = new Map(STATIONS.map((s) => [s.key, s]));

export function stationByKey(key: string): Station | undefined {
  return STATION_MAP.get(key);
}

// The stations a given job type actually runs.
export function stationsForType(type: JobTypeValue): Station[] {
  return STATIONS.filter((s) => !(s.skipFor ?? []).includes(type));
}

// The Production Kit — the LS-* templates that turn "produce it" into "fill it
// in". Building this kit is the one-time investment that makes the line run.
export const KIT: { code: string; what: string }[] = [
  { code: "LS-Brief", what: "Kickoff brief templates, one per video type." },
  { code: "LS-Script", what: "Script skeletons per type — the proven structure to fill in." },
  { code: "LS-Voice", what: "The locked ElevenLabs voice ID + exact settings. One voice, forever." },
  { code: "LS-Storyboard / StyleFrame", what: "Figma files for boarding and locking the look." },
  { code: "LS-AE master", what: "After Effects project with brand presets, comp sizes, and folders ready." },
  { code: "LS-Presets", what: "Easing curves and transition presets so motion is consistent." },
  { code: "LS-SFX", what: "Curated, licensed sound-effects pack." },
  { code: "LS-QC", what: "The internal quality checklist — the QC-gate station." },
  { code: "LS-Export", what: "Premiere export presets per aspect ratio + the file-naming convention." },
  { code: "LS-Reference", what: "The gold-standard example video per type — built from your first real projects." },
];

// The simple status walk a project moves along (deposit → delivery).
export const PROJECT_STATUSES = [
  { value: "new", label: "New" },
  { value: "briefed", label: "Briefed & sent" },
  { value: "production", label: "In production" },
  { value: "delivered", label: "Delivered" },
] as const;

export function projectStatusLabel(value: string) {
  return PROJECT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

// Run this before anything goes to the client. A helper checklist, not a gate.
export const FINAL_CHECK = [
  "Watched on a phone — every bit of text is readable",
  "Plays fine with the sound off (for video)",
  "Spelling checked, especially names and the brand",
  "Matches the brief — must-haves are in, must-avoids are out",
  "Right format and length",
  "The share link opens for someone outside the team",
];
