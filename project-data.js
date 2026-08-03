/**
 * Sample real-estate project knowledge base (dummy / public-style data).
 * No confidential or unauthorized company data.
 */
window.PROJECT_KB = {
  agent: {
    name: "Priya",
    company: "Horizon Homes Realty",
    role: "Property Advisor",
  },
  project: {
    name: "Green Valley Residences",
    developer: "Horizon Developers Pvt. Ltd.",
    location: {
      city: "Noida",
      area: "Sector 150",
      full: "Sector 150, Noida, Uttar Pradesh",
      nearby: [
        "Noida-Greater Noida Expressway",
        "Jewar International Airport corridor",
        "Golf Course & sports complex nearby",
        "Schools and hospitals within 5–8 km",
      ],
    },
    type: "Residential township (apartments + limited plots)",
    configurations: [
      {
        id: "2bhk",
        label: "2 BHK",
        carpet_sqft: "980–1,050",
        price_range_inr: "75 Lakh – 95 Lakh",
        price_min: 7500000,
        price_max: 9500000,
      },
      {
        id: "3bhk",
        label: "3 BHK",
        carpet_sqft: "1,350–1,480",
        price_range_inr: "1.15 Cr – 1.45 Cr",
        price_min: 11500000,
        price_max: 14500000,
      },
      {
        id: "4bhk",
        label: "4 BHK",
        carpet_sqft: "1,850–2,100",
        price_range_inr: "1.75 Cr – 2.25 Cr",
        price_min: 17500000,
        price_max: 22500000,
      },
      {
        id: "plot",
        label: "Residential Plot",
        carpet_sqft: "100–200 sq. yd.",
        price_range_inr: "90 Lakh – 2.10 Cr",
        price_min: 9000000,
        price_max: 21000000,
      },
      {
        id: "commercial",
        label: "Commercial Shop / Office",
        carpet_sqft: "400–1,200",
        price_range_inr: "80 Lakh – 3.50 Cr",
        price_min: 8000000,
        price_max: 35000000,
      },
    ],
    amenities: [
      "Clubhouse with gym & indoor games",
      "Swimming pool",
      "Landscaped central park",
      "Children's play area",
      "24×7 security with CCTV",
      "Power backup",
      "Covered parking",
      "Jogging track",
    ],
    possession: "December 2027 (phased handover)",
    rera: "UPRERAPRJ123456 (sample / demo ID)",
    payment_plan: "Construction-linked plan available; bank loan support from major banks (subject to eligibility).",
    highlights: [
      "Low-density green community",
      "Wide internal roads",
      "Close to expressway connectivity",
      "Suitable for self-use and long-term investment",
    ],
    disclaimers: [
      "Prices are approximate and for demo only; final quote depends on unit, floor, and offers.",
      "No guaranteed returns or investment performance claims.",
      "Site visit and inventory confirmation required before booking.",
    ],
  },
  faqs: [
    {
      keys: ["rera", "registered", "approved"],
      answer_en:
        "Green Valley Residences is shared here as a demo project with a sample RERA-style ID. In a live deployment we would quote only verified RERA details.",
      answer_hi:
        "Green Valley Residences yahan demo project ke roop mein hai, sample RERA-style ID ke saath. Live setup mein hum sirf verified RERA details share karenge.",
    },
    {
      keys: ["loan", "home loan", "emi", "bank"],
      answer_en:
        "Home loan assistance is available through major banks, subject to the customer's eligibility and bank norms. I can arrange a callback from our loan desk after this call.",
      answer_hi:
        "Major banks ke through home loan assistance mil sakti hai, aapki eligibility aur bank norms ke hisaab se. Call ke baad main loan desk se callback arrange kar sakti hoon.",
    },
    {
      keys: ["visit", "site visit", "dekhne", "sample flat"],
      answer_en:
        "Yes, we can schedule a site visit. After I note your preferred day and time, our team will confirm the slot.",
      answer_hi:
        "Haan, site visit schedule kar sakte hain. Aap din aur time batayein, team slot confirm kar degi.",
    },
    {
      keys: ["floor", "facing", "park facing", "corner"],
      answer_en:
        "Unit-level details like floor and facing depend on current inventory. I can have a relationship manager share exact options matching your budget.",
      answer_hi:
        "Floor aur facing jaise details current inventory par depend karte hain. Aapke budget ke hisaab se relationship manager exact options share kar denge.",
    },
    {
      keys: ["maintenance", "cam", "society charges"],
      answer_en:
        "Approximate maintenance is shared at booking time and may vary by configuration. I will not quote a fixed number without the latest schedule of charges.",
      answer_hi:
        "Maintenance approximate hota hai aur configuration par depend karta hai. Latest schedule of charges ke bina main fixed number nahi bolungi.",
    },
  ],
};

window.STORAGE_KEY = "propcall_leads_v1";
window.CALL_LOG_KEY = "propcall_calls_v1";
