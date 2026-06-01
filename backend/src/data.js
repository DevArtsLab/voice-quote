// In-memory data store — no database needed for this demo
// GraphQL resolvers read/write from these arrays

export const coverageOptions = [
  // AUTO
  { id: "liability",      lineOfBusiness: "auto",  name: "Liability",             description: "Covers damage you cause to others.",         monthlyPremium: 45,  recommended: true  },
  { id: "collision",      lineOfBusiness: "auto",  name: "Collision",             description: "Covers damage to your vehicle in an accident.", monthlyPremium: 62, recommended: true  },
  { id: "comprehensive",  lineOfBusiness: "auto",  name: "Comprehensive",         description: "Covers theft, weather, and non-collision events.", monthlyPremium: 38, recommended: false },
  { id: "uninsured",      lineOfBusiness: "auto",  name: "Uninsured Motorist",    description: "Protects you if hit by an uninsured driver.", monthlyPremium: 22, recommended: false },
  { id: "medical-pay",    lineOfBusiness: "auto",  name: "Medical Payments",      description: "Covers medical bills for you and passengers.", monthlyPremium: 18, recommended: false },
  // HOME
  { id: "dwelling",       lineOfBusiness: "home",  name: "Dwelling Coverage",     description: "Rebuilds or repairs your home structure.",    monthlyPremium: 88,  recommended: true  },
  { id: "personal-prop",  lineOfBusiness: "home",  name: "Personal Property",     description: "Covers your belongings inside the home.",     monthlyPremium: 34,  recommended: true  },
  { id: "liability-home", lineOfBusiness: "home",  name: "Liability",             description: "Covers injuries that happen on your property.", monthlyPremium: 20, recommended: false },
  { id: "flood",          lineOfBusiness: "home",  name: "Flood Insurance",       description: "Add-on for flood damage not covered by standard plans.", monthlyPremium: 55, recommended: false },
  { id: "earthquake",     lineOfBusiness: "home",  name: "Earthquake Rider",      description: "Covers structural damage from seismic events.", monthlyPremium: 42, recommended: false },
  // LIFE
  { id: "term-life",      lineOfBusiness: "life",  name: "Term Life",             description: "Coverage for a fixed term — most affordable.", monthlyPremium: 28,  recommended: true  },
  { id: "whole-life",     lineOfBusiness: "life",  name: "Whole Life",            description: "Lifetime coverage with a cash value component.", monthlyPremium: 120, recommended: false },
  { id: "critical-ill",   lineOfBusiness: "life",  name: "Critical Illness Rider", description: "Lump-sum payout on diagnosis of serious illness.", monthlyPremium: 35, recommended: true  },
  { id: "disability",     lineOfBusiness: "life",  name: "Disability Income",     description: "Replaces income if you cannot work due to illness.", monthlyPremium: 48, recommended: false },
];

// Quotes accumulate here during the session
export const quotes = [];

let nextQuoteId = 1001;
export const nextId = () => String(nextQuoteId++);
