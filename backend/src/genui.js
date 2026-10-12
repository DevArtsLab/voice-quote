import Anthropic from "@anthropic-ai/sdk";

// LLM provider selection:
// - LLM_BASE_URL + LLM_MODEL set -> any OpenAI-compatible endpoint
//   (Cloudflare Workers AI, Groq, Gemini, local Ollama at http://localhost:11434/v1)
// - otherwise -> Anthropic via ANTHROPIC_API_KEY
const LLM_BASE_URL = process.env.LLM_BASE_URL;
const LLM_MODEL = process.env.LLM_MODEL;
const LLM_API_KEY = process.env.LLM_API_KEY ?? "";

let anthropic;
function getAnthropic() {
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

async function callOpenAICompatible(prompt) {
  const res = await fetch(`${LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(LLM_API_KEY ? { Authorization: `Bearer ${LLM_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM request failed: ${res.status} ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty content");
  return content;
}

function parseJsonSpec(raw) {
  const cleaned = raw.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1)
    throw new Error("No JSON object found in LLM response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// generateUISpec — calls an LLM to produce a JSON layout spec for the Angular GenUI renderer.
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
    let raw;
    if (LLM_BASE_URL && LLM_MODEL) {
      raw = await callOpenAICompatible(prompt);
    } else {
      const message = await getAnthropic().messages.create({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      raw = message.content[0].text.trim();
    }
    return parseJsonSpec(raw);
  } catch (err) {
    console.error("GenUI LLM error:", err.message);
    // Fallback spec if the LLM is unavailable
    return getDefaultSpec(lineOfBusiness);
  }
}

function getDefaultSpec(lob) {
  const defaults = {
    auto: {
      layout: "focused",
      steps: [
        "lob-select",
        "vehicle-info",
        "coverage-selection",
        "driver-info",
        "applicant-info",
        "summary",
      ],
      highlight: ["liability", "collision"],
      hiddenFields: [],
      copy: {
        headline: "Your personalized auto insurance quote",
        subheadline:
          "Comprehensive coverage tailored to your vehicle and driving habits.",
        coverageHint:
          "Liability and Collision are the most common coverages for drivers.",
      },
      theme: { primaryColor: "#3B82F6", accentColor: "#6366F1" },
    },
    home: {
      layout: "expanded",
      steps: [
        "lob-select",
        "home-info",
        "coverage-selection",
        "applicant-info",
        "summary",
      ],
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
      steps: [
        "lob-select",
        "life-info",
        "coverage-selection",
        "applicant-info",
        "summary",
      ],
      highlight: ["term-life", "critical-ill"],
      hiddenFields: [],
      copy: {
        headline: "Secure your family's future today",
        subheadline: "Life coverage designed around your needs and budget.",
        coverageHint:
          "Term Life is the most affordable way to protect your loved ones.",
      },
      theme: { primaryColor: "#8B5CF6", accentColor: "#EC4899" },
    },
  };
  return defaults[lob] ?? defaults.auto;
}
