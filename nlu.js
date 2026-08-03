/**
 * Lightweight multilingual NLU for Hindi / Hinglish / basic English.
 * Rule + keyword based — no external API required for the demo.
 */
window.NLU = (function () {
  function norm(text) {
    return (text || "")
      .toLowerCase()
      // Keep digits, letters, + and decimal points between digits
      .replace(/(\d)\.(\d)/g, "$1DECIMAL$2")
      .replace(/[^\p{L}\p{N}\s+]/gu, " ")
      .replace(/DECIMAL/g, ".")
      .replace(/\s+/g, " ")
      .trim();
  }

  function includesAny(t, words) {
    return words.some((w) => t.includes(w));
  }

  function detectLanguage(text) {
    const t = text || "";
    const devanagari = (t.match(/[\u0900-\u097F]/g) || []).length;
    const latin = (t.match(/[a-zA-Z]/g) || []).length;
    if (devanagari > 4 && devanagari >= latin) return "hi";
    // Hinglish cues
    const hinglish = [
      "hai", "hain", "chahiye", "mujhe", "mera", "meri", "kya", "haan", "nahi",
      "ji", "bhk", "budget", "crore", "lakh", "karod", "dekhna", "lena",
      "invest", "property", "flat", "ghar", "plot", "noida", "gurgaon",
    ];
    const n = norm(t);
    const hits = hinglish.filter((w) => n.split(" ").includes(w) || n.includes(w)).length;
    if (hits >= 2 || (hits >= 1 && latin > 0)) return "hinglish";
    return "en";
  }

  function parseIntent(text) {
    const t = norm(text);

    if (!t) return { intent: "empty", confidence: 1 };

    if (includesAny(t, ["bye", "goodbye", "end call", "hang up", "bas karo", "band karo", "alvida", "thank you bye", "that's all", "thats all", "bas itna", "khatam"])) {
      return { intent: "end_call", confidence: 0.9 };
    }
    if (includesAny(t, ["repeat", "dobara", "again", "samajh nahi", "kya kaha", "pardon", "sorry what"])) {
      return { intent: "repeat", confidence: 0.85 };
    }
    if (includesAny(t, ["who are you", "aap kaun", "tum kaun", "your name", "naam kya"])) {
      return { intent: "ask_agent", confidence: 0.9 };
    }
    // Avoid treating "haan project theek hai" as a project FAQ question
    const looksLikeQuestion =
      includesAny(t, ["kya", "what", "tell", "batao", "bataye", "kitne", "kab", "how", "which", "kaunsa", "?"]) ||
      includesAny(t, ["amenities", "amenity", "possession", "rera", "price", "rate", "cost", "facilities", "suvidha", "kab milega"]);
    if (
      looksLikeQuestion &&
      includesAny(t, ["project", "amenities", "amenity", "possession", "rera", "location advantage", "price", "kitne ka", "rate", "cost", "facilities", "suvidha", "kab milega", "ready", "flat", "tower"])
    ) {
      return { intent: "ask_project", confidence: 0.8 };
    }
    if (includesAny(t, ["amenities", "possession", "rera", "kitne ka", "price list", "price", "facilities", "suvidha"])) {
      return { intent: "ask_project", confidence: 0.8 };
    }
    if (includesAny(t, ["site visit", "visit", "dekhne", "sample flat", "show flat"])) {
      return { intent: "site_visit", confidence: 0.85 };
    }
    if (includesAny(t, ["loan", "emi", "home loan", "bank"])) {
      return { intent: "ask_loan", confidence: 0.85 };
    }
    if (includesAny(t, ["buy", "purchase", "kharid", "lena hai", "le na hai", "own stay", "self use", "khud rehna", "rehne ke liye"])) {
      return { intent: "intent_buy", confidence: 0.8 };
    }
    if (includesAny(t, ["invest", "investment", "investment ke liye", "return", "rental", "rent"])) {
      return { intent: "intent_invest", confidence: 0.8 };
    }
    if (includesAny(t, ["both", "dono", "buy and invest"])) {
      return { intent: "intent_both", confidence: 0.8 };
    }
    if (includesAny(t, ["haan", "han", "yes", "yeah", "yep", "ji", " bilkul", "theek", "ok", "okay", "sahi", "correct", "right"])) {
      return { intent: "affirm", confidence: 0.7 };
    }
    if (includesAny(t, ["nahi", "na", "no", "nope", "mat", "not interested", "baad mein", "later"])) {
      return { intent: "deny", confidence: 0.7 };
    }
    if (includesAny(t, ["my name", "mera naam", "i am", "main ", "myself"])) {
      return { intent: "provide_name", confidence: 0.75 };
    }
    if (/\b\d{10}\b/.test(t) || includesAny(t, ["number", "mobile", "phone", "contact"])) {
      return { intent: "provide_phone", confidence: 0.75 };
    }

    return { intent: "statement", confidence: 0.5 };
  }

  function extractSlots(text) {
    const t = norm(text);
    const slots = {};

    // Name patterns (capture full first + last name)
    let m =
      t.match(/(?:mera naam|my name is|i am|i'm|main)\s+([a-z][a-z]+(?:\s+[a-z][a-z]+){0,3})/) ||
      t.match(/^([a-z]{2,20}(?:\s+[a-z]{2,20}){0,3})$/);
    if (m) {
      const name = m[1].replace(/\b(hai|hoon|hu|ji|hoon)\b/g, "").trim();
      const blocked = ["yes", "no", "haan", "han", "nahi", "buy", "invest", "okay", "ok", "theek", "sahi", "noida", "delhi"];
      if (name && !includesAny(name, blocked) && !/\d/.test(name) && !name.includes("bhk")) {
        slots.name = titleCase(name);
      }
    }

    // Phone
    const phone = text.replace(/\s+/g, "").match(/(?:\+91)?[6-9]\d{9}/);
    if (phone) slots.phone = phone[0].replace(/^\+91/, "");

    // Intent buy/invest
    if (includesAny(t, ["invest", "investment", "rental"])) slots.purpose = "investment";
    if (includesAny(t, ["self use", "self-use", "khud", "rehne", "own stay", "end use"])) slots.purpose = "self-use";
    if (includesAny(t, ["both", "dono"])) slots.purpose = "both";
    if (includesAny(t, ["buy", "kharid", "purchase"]) && !slots.purpose) slots.purpose = "buy";

    // Property type / config
    if (/\b4\s*bhk\b/.test(t) || t.includes("four bhk") || t.includes("4 bedroom")) slots.configuration = "4 BHK";
    else if (/\b3\s*bhk\b/.test(t) || t.includes("three bhk") || t.includes("3 bedroom")) slots.configuration = "3 BHK";
    else if (/\b2\s*bhk\b/.test(t) || t.includes("two bhk") || t.includes("2 bedroom")) slots.configuration = "2 BHK";
    else if (/\b1\s*bhk\b/.test(t)) slots.configuration = "1 BHK";
    if (includesAny(t, ["plot", "zameen", "land parcel"])) slots.configuration = "Plot";
    if (includesAny(t, ["commercial", "shop", "office", "showroom"])) slots.configuration = "Commercial";
    if (includesAny(t, ["apartment", "flat", "flat"])) slots.property_type = "apartment";
    if (includesAny(t, ["villa", "independent house", "kothi"])) slots.property_type = "villa";

    // Locations (NCR-focused demo)
    const locations = [
      ["sector 150", "Noida Sector 150"],
      ["sec 150", "Noida Sector 150"],
      ["noida", "Noida"],
      ["greater noida", "Greater Noida"],
      ["gurgaon", "Gurgaon"],
      ["gurugram", "Gurgaon"],
      ["dwarka express", "Dwarka Expressway"],
      ["dwarka", "Dwarka"],
      ["ghaziabad", "Ghaziabad"],
      ["delhi", "Delhi"],
      ["yeida", "YEIDA"],
      ["jewar", "Jewar"],
      ["sector 137", "Noida Sector 137"],
      ["sector 78", "Noida Sector 78"],
      ["noida extension", "Noida Extension"],
    ];
    for (const [key, val] of locations) {
      if (t.includes(key)) {
        slots.location = val;
        break;
      }
    }

    // Budget
    const budget = parseBudget(t);
    if (budget) slots.budget = budget;

    // Timeline
    if (includesAny(t, ["immediately", "turant", "jaldi", "this month", "is mahine", "asap"])) {
      slots.timeline = "Immediate (0–1 month)";
    } else if (includesAny(t, ["1 month", "one month", "ek mahine", "few weeks"])) {
      slots.timeline = "Within 1 month";
    } else if (
      includesAny(t, ["3 month", "three month", "teen mahine", "quarter", "3 mahine", "3 mahina"]) ||
      /\b3\s*mahine?\b/.test(t)
    ) {
      slots.timeline = "1–3 months";
    } else if (
      includesAny(t, ["6 month", "six month", "chhe mahine", "half year", "6 mahine"]) ||
      /\b6\s*mahine?\b/.test(t)
    ) {
      slots.timeline = "3–6 months";
    } else if (includesAny(t, ["1 year", "one year", "ek saal", "next year", "baad mein", "later"])) {
      slots.timeline = "6–12 months";
    } else if (includesAny(t, ["exploring", "dekh raha", "dekh rahi", "just checking", "information"])) {
      slots.timeline = "Just exploring";
    }

    return slots;
  }

  function parseBudget(t) {
    // e.g. 80 lakh, 1.2 cr, 1 crore, under 1 cr, 50-70 lakh, 90L, budget 1 crore
    let m = t.match(/(\d+(?:\.\d+)?)\s*(?:to|-|se)\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lacs|cr|crore|crores)/);
    if (m) {
      const unit = m[3].startsWith("c") ? "Cr" : "Lakh";
      return `${m[1]}–${m[2]} ${unit}`;
    }
    m = t.match(/(?:under|below|max|upto|up to|tak|se kam)\s*(\d+(?:\.\d+)?)\s*(lakh|lac|lacs|cr|crore|crores)/);
    if (m) {
      const unit = m[2].startsWith("c") ? "Cr" : "Lakh";
      return `Up to ${m[1]} ${unit}`;
    }
    m = t.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|lacs|l|cr|crore|crores)/);
    if (m) {
      const unit = m[2].startsWith("c") ? "Cr" : "Lakh";
      return `Around ${m[1]} ${unit}`;
    }
    m = t.match(/(\d+)\s*k\b/);
    if (m && Number(m[1]) >= 50) {
      return `Around ${m[1]} Thousand (please confirm)`;
    }
    // bare crore/lakh words (word-boundary style to avoid "1.2 crore" → "2 crore")
    if (/(?:^|\s)(?:1|one|ek)\s+crore(?:\s|$)/.test(t)) return "Around 1 Cr";
    if (/(?:^|\s)(?:2|two|do)\s+crore(?:\s|$)/.test(t)) return "Around 2 Cr";
    if (/(?:^|\s)(?:3|three|teen)\s+crore(?:\s|$)/.test(t)) return "Around 3 Cr";
    return null;
  }

  function titleCase(s) {
    return s
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function analyze(text) {
    return {
      raw: text,
      normalized: norm(text),
      language: detectLanguage(text),
      ...parseIntent(text),
      slots: extractSlots(text),
    };
  }

  return { analyze, detectLanguage, norm, extractSlots, parseIntent };
})();
