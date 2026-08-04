// FORM 1 — what the AGENT collects from the client and sends to the owner.
// Realistic for what an agent actually gets on X. The owner turns this into the
// full production brief (see lib/brief.ts).

export type FieldType = "text" | "textarea" | "select";

export type IntakeField = {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

export type ServiceDef = {
  value: string;
  label: string;
  blurb: string;
  fields: IntakeField[];
};

const BASICS: IntakeField[] = [
  { name: "brand_name", label: "Client / brand name", type: "text", required: true, placeholder: "Who is the client?" },
  { name: "what_they_do", label: "What they do (one line)", type: "text" },
  { name: "x_handle", label: "Their X handle / website", type: "text", placeholder: "@handle or link" },
  { name: "what_sold", label: "What was sold (package)", type: "text" },
  { name: "assets", label: "Brand assets link", type: "text", help: "Logo, colours, fonts — a Drive/Figma link. Ask for the logo as a vector (SVG/AI)." },
  { name: "deadline", label: "Deadline", type: "text" },
];

export const SERVICES: ServiceDef[] = [
  {
    value: "motion_graphics",
    label: "Motion Graphics",
    blurb: "Launch, explainer, demo, teaser, logo animation, kinetic typography.",
    fields: [
      ...BASICS,
      { name: "video_type", label: "Video type", type: "select", required: true,
        options: ["Launch", "Explainer", "Demo / walkthrough", "Teaser / promo", "Logo animation", "Kinetic typography"] },
      { name: "goal", label: "What do they want the video to do?", type: "textarea" },
      { name: "message", label: "The main thing to get across", type: "text" },
      { name: "script_or_points", label: "Script or key points (if they have it)", type: "textarea", help: "Or note that we're writing it." },
      { name: "references", label: "Videos they like", type: "textarea" },
      { name: "where_posted", label: "Where it'll go", type: "text", placeholder: "X post, ad, pinned…" },
      { name: "length", label: "Rough length", type: "text" },
    ],
  },
  {
    value: "video_editing",
    label: "Video Editing",
    blurb: "Podcast, talking head, vlog, event, long-form, shorts.",
    fields: [
      ...BASICS,
      { name: "ve_type", label: "Type", type: "select", required: true,
        options: ["Podcast", "Talking Head", "Vlog", "IRL / Event", "Long-form YouTube", "Short-form"] },
      { name: "footage", label: "Footage — link + how much", type: "textarea", placeholder: "Drive / WeTransfer link, roughly how long" },
      { name: "deliverables", label: "What they want (main edit + how many clips?)", type: "textarea" },
      { name: "reference", label: "A reference edit they like", type: "text" },
      { name: "style_note", label: "Any style notes", type: "text" },
    ],
  },
  {
    value: "branding",
    label: "Branding",
    blurb: "Logo and identity.",
    fields: [
      ...BASICS,
      { name: "br_type", label: "Type", type: "select", required: true,
        options: ["Logo only", "Brand Identity", "Full Brand Package", "Brand Collateral"] },
      { name: "name_exact", label: "Business name — exact spelling", type: "text" },
      { name: "what_who", label: "What they do & who it's for", type: "textarea" },
      { name: "likes", label: "Brands they like (and any they'd hate to look like)", type: "textarea" },
      { name: "usage", label: "Where it'll be used", type: "text" },
    ],
  },
  {
    value: "web",
    label: "Web",
    blurb: "Websites and landing pages.",
    fields: [
      ...BASICS,
      { name: "web_type", label: "Type", type: "select", required: true,
        options: ["Landing Page", "Marketing Site", "Site Redesign", "Maintenance / Updates"] },
      { name: "goal", label: "What's the site for?", type: "textarea", placeholder: "Leads, sales, info…" },
      { name: "pages", label: "Pages they want", type: "textarea" },
      { name: "references", label: "Sites they like", type: "textarea" },
      { name: "content", label: "Copy, images, domain — what do they have?", type: "textarea" },
    ],
  },
  {
    value: "other",
    label: "Other",
    blurb: "Anything that doesn't fit a defined service.",
    fields: [
      ...BASICS,
      { name: "what_needed", label: "What do they need?", type: "textarea", required: true, help: "Describe it in plain words." },
      { name: "references", label: "Any references", type: "textarea" },
    ],
  },
];

export function serviceDef(value: string): ServiceDef | undefined {
  return SERVICES.find((s) => s.value === value);
}

export function serviceLabel(value: string): string {
  return SERVICES.find((s) => s.value === value)?.label ?? value;
}
