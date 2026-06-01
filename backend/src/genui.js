import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// generateUISpec — calls Claude to produce a JSON layout spec for the Angular GenUI renderer.
// The spec tells the frontend: which steps to show, which coverages to highlight, and
// what personalized copy to display. This is the heart of Generative UI.
export async function generateUISpec(context) {
  const { lineOfBusiness, priorClaims, commuteDistance, vehicleAge } = context;

  const prompt = `You are an AI assistant for an insurance quoting platform. 
Given a client's profile, return a JSON UI specification that personalizes the quote wizard for them.

Client profile:
- Line of business: ${lineOfBusiness}
- Prior claims in last 3 years: ${priorClaims ?? "unknown"}
- Daily commute distance (miles): ${commuteDistance ?? "unknown"}
- Vehicle age (years, auto only): ${vehicleAge ?? "N/A"}

Return ONLY valid JSON matching this exact shape (no markdown, no explanation):
{
  "layout": "focused" | "expanded",
  "steps": [array of step ids from: "lob-select", "vehicle-info", "home-info", "life-info", "coverage-selection", "driver-info", "applicant-info", "summary"],
  "highlight": [array of coverage IDs to emphasize],
  "hiddenFields": [array of field names to hide as irrelevant],
  "copy": {
    "headline": "personalized headline string",
    "subheadline": "one sentence context",
    "coverageHint": "short AI recommendation about which coverages matter most for this client"
  },
  "theme": {
    "primaryColor": "hex color matching the LOB palette",
    "accentColor": "hex color for highlights"
  }
}

Coverage IDs available: liability, collision, comprehensive, uninsured, medical-pay (auto), dwelling, personal-prop, liability-home, flood, earthquake (home), term-life, whole-life, critical-ill, disability (life).
Step IDs to include based on LOB: always include "lob-select", "coverage-selection", "applicant-info", "summary". Add LOB-specific steps only.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].text.trim();
    return JSON.parse(raw);
  } catch (err) {
    console.error("Claude GenUI error:", err.message);
    // Fallback spec if Claude is unavailable
    return getDefaultSpec(lineOfBusiness);
  }
}

function getDefaultSpec(lob) {
  const defaults = {
    auto: {
      layout: "focused",
      steps: ["lob-select", "vehicle-info", "coverage-selection", "driver-info", "applicant-info", "summary"],
      highlight: ["liability", "collision"],
      hiddenFields: [],
      copy: {
        headline: "Your personalized auto insurance quote",
        subheadline: "Comprehensive coverage tailored to your vehicle and driving habits.",
        coverageHint: "Liability and Collision are the most common coverages for drivers.",
      },
      theme: { primaryColor: "#3B82F6", accentColor: "#6366F1" },
    },
    home: {
      layout: "expanded",
      steps: ["lob-select", "home-info", "coverage-selection", "applicant-info", "summary"],
      highlight: ["dwelling", "personal-prop"],
      hiddenFields: [],
      copy: {
        headline: "Protect your home with confidence",
        subheadline: "Coverage built around your property and belongings.",
        coverageHint: "Dwelling and Personal Property are essential for any homeowner.",
      },
      theme: { primaryColor: "#10B981", accentColor: "#14B8A6" },
    },
    life: {
      layout: "focused",
      steps: ["lob-select", "life-info", "coverage-selection", "applicant-info", "summary"],
      highlight: ["term-life", "critical-ill"],
      hiddenFields: [],
      copy: {
        headline: "Secure your family's future today",
        subheadline: "Life coverage designed around your needs and budget.",
        coverageHint: "Term Life is the most affordable way to protect your loved ones.",
      },
      theme: { primaryColor: "#8B5CF6", accentColor: "#EC4899" },
    },
  };
  return defaults[lob] ?? defaults.auto;
}
