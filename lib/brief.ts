// FORM 2 — the OWNER's production-ready brief. Complete: everything the
// production team needs so quality doesn't drop from a vague brief. `from`
// pre-fills a field from the agent's intake so nothing is re-typed.

export type BriefField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  help?: string;
  from?: string;
};

const BY_SERVICE: Record<string, BriefField[]> = {
  motion_graphics: [
    { name: "video_type", label: "Video type", type: "select", options: ["Launch", "Explainer", "Demo / walkthrough", "Teaser / promo", "Logo animation", "Kinetic typography"], from: "video_type" },
    { name: "goal", label: "Goal — what should it achieve?", type: "textarea", from: "goal" },
    { name: "core_message", label: "The one message a viewer must remember", type: "textarea", from: "message" },
    { name: "cta", label: "The one call-to-action", type: "text", help: "On X: follow, check the link, or reply." },
    { name: "length", label: "Target length (seconds)", type: "text", from: "length" },
    { name: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "1:1"] },
    { name: "where_posted", label: "Where it'll be posted", type: "text", from: "where_posted" },
    { name: "script", label: "Script or key points", type: "textarea", from: "script_or_points" },
    { name: "who_writes", label: "Who writes the script", type: "select", options: ["We write it", "Client provides it"] },
    { name: "voiceover", label: "Voiceover", type: "select", options: ["ElevenLabs", "Client-provided", "None"] },
    { name: "brand_assets", label: "Brand assets link (logo vector, colours hex, fonts)", type: "text", from: "assets" },
    { name: "references", label: "Reference videos + what to take from each", type: "textarea", from: "references" },
    { name: "music", label: "Music direction", type: "text" },
    { name: "must_include", label: "Must include", type: "textarea" },
    { name: "must_avoid", label: "Must avoid", type: "textarea" },
  ],
  video_editing: [
    { name: "ve_type", label: "Type", type: "select", options: ["Podcast", "Talking Head", "Vlog", "IRL / Event", "Long-form YouTube", "Short-form"], from: "ve_type" },
    { name: "footage_link", label: "Footage link (how much, format)", type: "textarea", from: "footage" },
    { name: "deliverables", label: "Deliverables — main length + how many clips + platforms/ratios", type: "textarea", from: "deliverables" },
    { name: "editing_style", label: "Editing style", type: "select", options: ["Tight", "Natural"], help: "Tight = cut aggressively (talking head). Natural = light touch (podcast)." },
    { name: "reference", label: "A reference edit", type: "text", from: "reference" },
    { name: "cut", label: "What to cut", type: "textarea" },
    { name: "never_cut", label: "What to never cut", type: "textarea" },
    { name: "captions", label: "Captions?", type: "select", options: ["Yes", "No"] },
    { name: "intro_outro", label: "Intro / outro + branding (lower-thirds, logo)", type: "textarea" },
    { name: "music", label: "Music", type: "select", options: ["We pick (licensed)", "Client provides"] },
    { name: "key_moments", label: "Key moments / timestamps to feature", type: "textarea" },
  ],
  branding: [
    { name: "br_type", label: "Type", type: "select", options: ["Logo only", "Brand Identity", "Full Brand Package", "Brand Collateral"], from: "br_type" },
    { name: "name_exact", label: "Business name — exact spelling & capitalisation", type: "text", from: "name_exact" },
    { name: "what_who", label: "What they do & who it's for", type: "textarea", from: "what_who" },
    { name: "personality", label: "Brand personality (3–5 words)", type: "text" },
    { name: "likes", label: "Brands they admire + brands they'd hate to look like", type: "textarea", from: "likes" },
    { name: "colours", label: "Colours to use / avoid", type: "text" },
    { name: "deliverables", label: "Deliverables + file formats needed", type: "textarea" },
    { name: "usage", label: "Where it'll be used", type: "text", from: "usage" },
    { name: "existing", label: "Existing assets to keep or evolve", type: "textarea" },
  ],
  web: [
    { name: "web_type", label: "Type", type: "select", options: ["Landing Page", "Marketing Site", "Site Redesign", "Maintenance / Updates"], from: "web_type" },
    { name: "goal", label: "The site's #1 goal", type: "textarea", from: "goal" },
    { name: "pages", label: "Full page list", type: "textarea", from: "pages" },
    { name: "platform", label: "Platform", type: "select", options: ["Framer", "Webflow", "WordPress", "Custom"] },
    { name: "copy_source", label: "Copy source", type: "select", options: ["Client provides", "We write", "Mixed"] },
    { name: "images_source", label: "Images source", type: "select", options: ["Client provides", "Stock", "We create"] },
    { name: "domain", label: "Domain & hosting status", type: "text", from: "content" },
    { name: "references", label: "Reference sites + what to take from each", type: "textarea", from: "references" },
    { name: "functionality", label: "Functionality (forms + where they go, booking, payments, analytics)", type: "textarea" },
    { name: "brand_assets", label: "Brand assets link", type: "text", from: "assets" },
    { name: "must_include", label: "Must include", type: "textarea" },
    { name: "must_avoid", label: "Must avoid", type: "textarea" },
  ],
  other: [
    { name: "what_needed", label: "What we're making — in detail", type: "textarea", from: "what_needed" },
    { name: "goal", label: "Goal", type: "textarea" },
    { name: "references", label: "References", type: "textarea", from: "references" },
    { name: "assets", label: "Assets link", type: "text", from: "assets" },
  ],
};

export function briefFields(service: string): BriefField[] {
  return BY_SERVICE[service] ?? BY_SERVICE.other;
}

const SERVICE_LABEL: Record<string, string> = {
  motion_graphics: "Motion Graphics",
  video_editing: "Video Editing",
  branding: "Branding",
  web: "Web",
  other: "Other",
};

// Trim the explanatory tail off a label so WhatsApp lines stay tight.
function shortLabel(label: string): string {
  return label.split(/ — | \(/)[0].replace(/\?$/, "").trim();
}

// The finished brief, formatted for WhatsApp: *bold* headers, long answers on
// their own line, so it pastes in clean and structured instead of a flat dump.
export function briefText(
  clientName: string,
  service: string,
  brief: Record<string, string>
): string {
  const out: string[] = [
    `*BRIEF · ${clientName}*`,
    SERVICE_LABEL[service] ?? "Project",
  ];

  for (const f of briefFields(service)) {
    const v = (brief[f.name] ?? "").trim();
    if (!v) continue;
    const lbl = shortLabel(f.label);
    // Long / multi-line answers get their own block; short ones sit inline.
    if (f.type === "textarea" || v.length > 45 || v.includes("\n")) {
      if (out[out.length - 1] !== "") out.push("");
      out.push(`*${lbl}*`, v, "");
    } else {
      out.push(`*${lbl}:* ${v}`);
    }
  }

  return out.join("\n").trim();
}
