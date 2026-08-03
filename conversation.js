/**
 * Conversation state machine for the real-estate sales agent.
 * Supports Hindi / Hinglish / basic English responses.
 */
window.ConversationEngine = (function () {
  const STEPS = [
    "greet",
    "intent",
    "location",
    "configuration",
    "budget",
    "purpose",
    "timeline",
    "qualify_project",
    "contact_name",
    "contact_phone",
    "wrap_up",
    "ended",
  ];

  function createLead() {
    return {
      id: "lead_" + Date.now(),
      name: "",
      phone: "",
      intent: "", // buy | invest | both | unknown
      location: "",
      property_type: "",
      configuration: "",
      budget: "",
      purpose: "",
      timeline: "",
      site_visit_interest: "",
      notes: [],
      language_pref: "hinglish",
      project_discussed: window.PROJECT_KB.project.name,
      started_at: new Date().toISOString(),
      ended_at: null,
      transcript: [],
    };
  }

  function createSession() {
    return {
      step: "greet",
      lead: createLead(),
      lastAgentText: "",
      lastUserText: "",
      turn: 0,
      awaiting: null,
      ended: false,
      summary: null,
    };
  }

  function pickLang(session, analysis) {
    if (analysis && analysis.language) {
      const prev = session.lead.language_pref || "hinglish";
      const next = analysis.language;
      // Don't flip Hinglish/Hindi → English on short numeric answers like "3 BHK" / "6 months"
      const shortEn =
        next === "en" &&
        (analysis.normalized || "").split(/\s+/).length <= 4 &&
        (prev === "hi" || prev === "hinglish");
      if (!shortEn) session.lead.language_pref = next;
      else if (prev) session.lead.language_pref = prev;
    }
    return session.lead.language_pref || "hinglish";
  }

  function t(lang, map) {
    if (lang === "hi") return map.hi || map.hinglish || map.en;
    if (lang === "en") return map.en || map.hinglish || map.hi;
    return map.hinglish || map.hi || map.en;
  }

  function mergeSlots(lead, slots) {
    if (!slots) return;
    Object.keys(slots).forEach((k) => {
      if (slots[k] && !lead[k]) lead[k] = slots[k];
      else if (slots[k] && ["budget", "location", "configuration", "timeline", "purpose", "name", "phone"].includes(k)) {
        lead[k] = slots[k]; // allow updates
      }
    });
    if (slots.purpose === "investment") lead.intent = lead.intent || "invest";
    if (slots.purpose === "self-use") lead.intent = lead.intent || "buy";
    if (slots.purpose === "buy") lead.intent = "buy";
    if (slots.purpose === "both") lead.intent = "both";
  }

  function projectBlurb(lang) {
    const p = window.PROJECT_KB.project;
    return t(lang, {
      en: `${p.name} is in ${p.location.full}. We have ${p.configurations
        .map((c) => c.label)
        .join(", ")}. Approximate prices start near 75 Lakh for 2 BHK, going up based on size. Possession is targeted for ${p.possession}. Key amenities include clubhouse, pool, park, and 24×7 security. Prices are indicative only.`,
      hinglish: `${p.name} ${p.location.full} mein hai. Available configs: ${p.configurations
        .map((c) => c.label)
        .join(", ")}. 2 BHK roughly 75 Lakh se start hota hai, size ke hisaab se upar jata hai. Possession target ${p.possession}. Amenities mein clubhouse, pool, park aur 24×7 security hai. Prices sirf approximate hain.`,
      hi: `${p.name} ${p.location.full} mein situated hai. ${p.configurations
        .map((c) => c.label)
        .join(", ")} available hain. 2 BHK lagbhag 75 Lakh se shuru. Possession ${p.possession}. Clubhouse, pool, park, security jaise amenities hain. Yeh indicative pricing hai.`,
    });
  }

  function answerProjectQuestion(text, lang) {
    const n = (text || "").toLowerCase();
    const p = window.PROJECT_KB.project;
    const faqs = window.PROJECT_KB.faqs;

    for (const f of faqs) {
      if (f.keys.some((k) => n.includes(k))) {
        return lang === "en" ? f.answer_en : f.answer_hi;
      }
    }
    if (n.includes("amenities") || n.includes("facility") || n.includes("suvidha") || n.includes("amenit")) {
      return t(lang, {
        en: `Amenities include: ${p.amenities.join("; ")}.`,
        hinglish: `Amenities mein hai: ${p.amenities.join("; ")}.`,
        hi: `Suvidhaon mein shamil hain: ${p.amenities.join("; ")}.`,
      });
    }
    if (n.includes("possession") || n.includes("kab mile") || n.includes("ready")) {
      return t(lang, {
        en: `Target possession is ${p.possession}. Exact tower-wise dates are shared at inventory confirmation.`,
        hinglish: `Possession target ${p.possession} hai. Exact tower dates inventory confirm hone par share hote hain.`,
        hi: `Possession ka target ${p.possession} hai.`,
      });
    }
    if (n.includes("location") || n.includes("kahan") || n.includes("where") || n.includes("sector")) {
      return t(lang, {
        en: `It is located at ${p.location.full}. Nearby advantages: ${p.location.nearby.join("; ")}.`,
        hinglish: `Location: ${p.location.full}. Pass mein: ${p.location.nearby.join("; ")}.`,
        hi: `Yeh ${p.location.full} mein hai. Nearby: ${p.location.nearby.join("; ")}.`,
      });
    }
    if (n.includes("price") || n.includes("budget") || n.includes("kitne") || n.includes("cost") || n.includes("rate")) {
      const lines = p.configurations.map((c) => `${c.label}: ${c.price_range_inr}`).join("; ");
      return t(lang, {
        en: `Approximate price bands — ${lines}. Final quote depends on unit and offers. No guaranteed returns.`,
        hinglish: `Approximate prices — ${lines}. Final quote unit aur offer par depend karta hai. Koi guaranteed return nahi.`,
        hi: `Lagbhag keemat — ${lines}. Final quote unit par depend karta hai.`,
      });
    }
    if (n.includes("2 bhk") || n.includes("3 bhk") || n.includes("4 bhk") || n.includes("plot") || n.includes("commercial")) {
      return projectBlurb(lang);
    }
    return projectBlurb(lang);
  }

  function nextMissingStep(lead) {
    if (!lead.intent) return "intent";
    if (!lead.location) return "location";
    if (!lead.configuration) return "configuration";
    if (!lead.budget) return "budget";
    if (!lead.purpose && lead.intent !== "invest") return "purpose";
    if (!lead.purpose && lead.intent === "invest") {
      lead.purpose = "investment";
    }
    if (!lead.timeline) return "timeline";
    if (!lead.name) return "contact_name";
    if (!lead.phone) return "contact_phone";
    return "wrap_up";
  }

  function askFor(step, lang, session) {
    const agent = window.PROJECT_KB.agent;
    const p = window.PROJECT_KB.project;
    switch (step) {
      case "greet":
        return t(lang, {
          en: `Hello! This is ${agent.name} from ${agent.company}. I am a property advisor. Am I speaking with you at a good time?`,
          hinglish: `Namaste! Main ${agent.name} bol rahi hoon, ${agent.company} se. Main aapki property advisor hoon. Kya aap baat kar sakte hain ek minute?`,
          hi: `Namaste! Main ${agent.name}, ${agent.company} se baat kar rahi hoon. Kya aapke paas do minute hain?`,
        });
      case "intent":
        return t(lang, {
          en: "Are you looking to buy a home for yourself, or are you exploring property as an investment?",
          hinglish: "Aap ghar khud ke liye lena chahte hain, ya property investment ke angle se dekh rahe hain?",
          hi: "Kya aap khud ke rehne ke liye property dekh rahe hain ya investment ke liye?",
        });
      case "location":
        return t(lang, {
          en: `Which location are you preferring? For example Noida, Greater Noida, Gurgaon. We have a project in ${p.location.area}, Noida — would that interest you?`,
          hinglish: `Aap kaunsa location prefer karenge? Jaise Noida, Greater Noida, Gurgaon. Hamara project ${p.location.area}, Noida mein hai — kya yeh area aapke liye theek rahega?`,
          hi: `Aap kis area mein property dekhna chahte hain? Hamara project ${p.location.full} mein hai.`,
        });
      case "configuration":
        return t(lang, {
          en: "What configuration do you need — 2 BHK, 3 BHK, 4 BHK, a plot, or commercial space?",
          hinglish: "Aapko kaunsi configuration chahiye — 2 BHK, 3 BHK, 4 BHK, plot, ya commercial?",
          hi: "Kaunsi configuration chahiye — 2 BHK, 3 BHK, 4 BHK, plot ya commercial?",
        });
      case "budget":
        return t(lang, {
          en: "What budget range are you comfortable with? You can say something like 80 lakh to 1.2 crore.",
          hinglish: "Aapka budget range kya hai? Jaise 80 lakh se 1.2 crore — aise bata sakte hain.",
          hi: "Aapka budget kya hai? Lagbhag kitne lakh ya crore tak soch rahe hain?",
        });
      case "purpose":
        return t(lang, {
          en: "Will this be primarily for self-use or investment?",
          hinglish: "Yeh property mainly khud rehene ke liye hai ya investment ke liye?",
          hi: "Yeh self-use ke liye hai ya investment ke liye?",
        });
      case "timeline":
        return t(lang, {
          en: "In what time frame are you planning to purchase — immediate, 1 to 3 months, or still exploring?",
          hinglish: "Aap kitne time mein purchase plan kar rahe hain — jaldi, 1 se 3 mahine, ya abhi explore kar rahe hain?",
          hi: "Purchase ka timeline kya hai — turant, kuch mahine, ya abhi dekh rahe hain?",
        });
      case "qualify_project":
        return (
          projectBlurb(lang) +
          " " +
          t(lang, {
            en: "Does this sound relevant to your requirement, or would you like to ask anything about the project?",
            hinglish: "Kya yeh aapki requirement se match karta hai, ya project ke baare mein kuch poochna hai?",
            hi: "Kya yeh aapke kaam ka hai? Koi sawal ho to poochiye.",
          })
        );
      case "contact_name":
        return t(lang, {
          en: "May I have your name so our team can follow up with matching options?",
          hinglish: "Aapka naam jaan sakti hoon, taaki team aapko sahi options bhej sake?",
          hi: "Aapka shubh naam kya hai?",
        });
      case "contact_phone":
        return t(lang, {
          en: `Thank you${session.lead.name ? ", " + session.lead.name : ""}. Please share a 10-digit mobile number for WhatsApp updates and a callback.`,
          hinglish: `Dhanyavaad${session.lead.name ? ", " + session.lead.name : ""}. Apna 10-digit mobile number share kariye WhatsApp updates aur callback ke liye.`,
          hi: `Dhanyavaad${session.lead.name ? ", " + session.lead.name : ""}. Apna mobile number batayiye.`,
        });
      case "wrap_up":
        return buildWrapUp(session, lang);
      default:
        return t(lang, {
          en: "How else can I help you with your property search?",
          hinglish: "Aur kaise madad kar sakti hoon aapki property search mein?",
          hi: "Aur kisi cheez mein madad chahiye?",
        });
    }
  }

  function buildWrapUp(session, lang) {
    const L = session.lead;
    const summaryLine = [
      L.configuration && `config ${L.configuration}`,
      L.location && `location ${L.location}`,
      L.budget && `budget ${L.budget}`,
      L.timeline && `timeline ${L.timeline}`,
    ]
      .filter(Boolean)
      .join(", ");

    return t(lang, {
      en: `Perfect. I have noted your requirement${summaryLine ? ": " + summaryLine : ""}. Our relationship manager will connect with suitable inventory. There are no guaranteed returns, and final prices depend on available units. Thank you for your time — have a great day!`,
      hinglish: `Bahut badiya. Main ne aapki requirement note kar li hai${summaryLine ? ": " + summaryLine : ""}. Hamare relationship manager suitable options ke saath connect karenge. Koi guaranteed return nahi hota, final price available unit par depend karta hai. Aapka time dene ke liye dhanyavaad — good day!`,
      hi: `Theek hai. Aapki requirement note ho gayi hai${summaryLine ? ": " + summaryLine : ""}. Team aapse connect karegi. Dhanyavaad, shubh din!`,
    });
  }

  function generateSummary(session) {
    const L = session.lead;
    const lines = [
      `Call summary — ${window.PROJECT_KB.project.name}`,
      `Agent: ${window.PROJECT_KB.agent.name} (${window.PROJECT_KB.agent.company})`,
      `Lead ID: ${L.id}`,
      `Name: ${L.name || "—"}`,
      `Phone: ${L.phone || "—"}`,
      `Intent: ${L.intent || "—"}`,
      `Purpose: ${L.purpose || "—"}`,
      `Preferred location: ${L.location || "—"}`,
      `Configuration: ${L.configuration || "—"}`,
      `Property type: ${L.property_type || "—"}`,
      `Budget: ${L.budget || "—"}`,
      `Timeline: ${L.timeline || "—"}`,
      `Site visit interest: ${L.site_visit_interest || "—"}`,
      `Language: ${L.language_pref || "—"}`,
      `Started: ${L.started_at}`,
      `Ended: ${L.ended_at || new Date().toISOString()}`,
      "",
      "Notes:",
      ...(L.notes.length ? L.notes.map((n) => `- ${n}`) : ["- None"]),
      "",
      "Transcript excerpt:",
      ...L.transcript.slice(-12).map((t) => `${t.role === "agent" ? "Agent" : "Customer"}: ${t.text}`),
    ];
    return {
      text: lines.join("\n"),
      lead: { ...L },
      created_at: new Date().toISOString(),
    };
  }

  function persistLead(session) {
    try {
      const leads = JSON.parse(localStorage.getItem(window.STORAGE_KEY) || "[]");
      const idx = leads.findIndex((l) => l.id === session.lead.id);
      const row = { ...session.lead, summary: session.summary };
      if (idx >= 0) leads[idx] = row;
      else leads.unshift(row);
      localStorage.setItem(window.STORAGE_KEY, JSON.stringify(leads.slice(0, 50)));

      const calls = JSON.parse(localStorage.getItem(window.CALL_LOG_KEY) || "[]");
      calls.unshift({
        id: session.lead.id,
        at: new Date().toISOString(),
        name: session.lead.name,
        phone: session.lead.phone,
        summary: session.summary && session.summary.text,
      });
      localStorage.setItem(window.CALL_LOG_KEY, JSON.stringify(calls.slice(0, 50)));
    } catch (e) {
      console.warn("persist failed", e);
    }
  }

  function start(session) {
    const lang = session.lead.language_pref || "hinglish";
    session.step = "greet";
    const text = askFor("greet", lang, session);
    session.lastAgentText = text;
    session.lead.transcript.push({ role: "agent", text, at: new Date().toISOString() });
    session.awaiting = "greet_ack";
    return { text, session, expectReply: true };
  }

  function handle(session, userText) {
    if (session.ended) {
      return {
        text: t(session.lead.language_pref, {
          en: "This call has ended. Start a new call to continue.",
          hinglish: "Call end ho chuki hai. Nayi call start karein.",
          hi: "Call samapt ho chuki hai.",
        }),
        session,
        expectReply: false,
      };
    }

    const analysis = window.NLU.analyze(userText);
    const lang = pickLang(session, analysis);
    session.lastUserText = userText;
    session.turn += 1;
    session.lead.transcript.push({ role: "user", text: userText, at: new Date().toISOString() });
    mergeSlots(session.lead, analysis.slots);

    // Global intents
    if (analysis.intent === "end_call") {
      return finish(session, lang);
    }
    if (analysis.intent === "repeat") {
      const text = session.lastAgentText || askFor(session.step, lang, session);
      return say(session, text, true);
    }
    if (analysis.intent === "ask_agent") {
      const a = window.PROJECT_KB.agent;
      const text = t(lang, {
        en: `I am ${a.name}, ${a.role} at ${a.company}. I help customers find homes and investment properties.`,
        hinglish: `Main ${a.name} hoon, ${a.company} mein ${a.role}. Main customers ko ghar aur investment property choose karne mein help karti hoon.`,
        hi: `Mera naam ${a.name} hai, ${a.company} se.`,
      });
      // After answering, re-ask current need
      const follow = askFor(session.step === "greet" ? "intent" : nextMissingStep(session.lead) === "wrap_up" ? "wrap_up" : nextMissingStep(session.lead), lang, session);
      return say(session, text + " " + follow, true);
    }

    // Project Q&A can interrupt any step
    if (analysis.intent === "ask_project" || analysis.intent === "ask_loan" || analysis.intent === "site_visit") {
      let text = answerProjectQuestion(userText, lang);
      if (analysis.intent === "site_visit") {
        session.lead.site_visit_interest = "yes";
        session.lead.notes.push("Interested in site visit");
      }
      if (analysis.intent === "ask_loan") {
        session.lead.notes.push("Asked about home loan");
      }
      // Continue qualification after answering
      const missing = nextMissingStep(session.lead);
      if (missing !== "wrap_up" && session.step !== "wrap_up") {
        session.step = missing;
        text += " " + askFor(missing, lang, session);
      } else if (missing === "wrap_up" && !session.lead.phone) {
        session.step = "contact_phone";
        text += " " + askFor("contact_phone", lang, session);
      }
      return say(session, text, true);
    }

    // Step machine
    if (session.step === "greet" || session.awaiting === "greet_ack") {
      if (analysis.intent === "deny") {
        const text = t(lang, {
          en: "No problem. I can call another time. Before I go — should I note any preferred callback slot, or end the call?",
          hinglish: "Koi baat nahi. Main baad mein call kar sakti hoon. Callback chahiye ya call end karun?",
          hi: "Theek hai. Callback chahiye ya call band karun?",
        });
        session.awaiting = "callback_or_end";
        return say(session, text, true);
      }
      session.awaiting = null;
      // If user already dumped requirements in first reply
      if (analysis.intent === "intent_buy") session.lead.intent = "buy";
      if (analysis.intent === "intent_invest") session.lead.intent = "invest";
      if (analysis.intent === "intent_both") session.lead.intent = "both";
      const missing = nextMissingStep(session.lead);
      session.step = missing === "wrap_up" ? "qualify_project" : missing;
      if (session.step === "intent") {
        return say(session, askFor("intent", lang, session), true);
      }
      // skip ahead
      return say(session, askFor(session.step, lang, session), true);
    }

    if (session.awaiting === "callback_or_end") {
      if (analysis.intent === "deny" || analysis.intent === "end_call") return finish(session, lang);
      session.lead.notes.push("Requested callback later");
      return finish(session, lang, true);
    }

    // Intent step
    if (session.step === "intent") {
      if (analysis.intent === "intent_buy" || analysis.slots.purpose === "self-use" || analysis.slots.purpose === "buy") {
        session.lead.intent = "buy";
        session.lead.purpose = session.lead.purpose || "self-use";
      } else if (analysis.intent === "intent_invest" || analysis.slots.purpose === "investment") {
        session.lead.intent = "invest";
        session.lead.purpose = "investment";
      } else if (analysis.intent === "intent_both" || analysis.slots.purpose === "both") {
        session.lead.intent = "both";
        session.lead.purpose = "both";
      } else if (analysis.intent === "affirm") {
        session.lead.intent = "buy";
      } else if (analysis.slots.configuration || analysis.slots.location || analysis.slots.budget) {
        session.lead.intent = session.lead.intent || "buy";
      } else if (analysis.intent === "deny") {
        const text = t(lang, {
          en: "Understood. If you are only browsing, I can still share a quick overview, or we can end the call. What would you prefer?",
          hinglish: "Samajh gayi. Agar aap sirf dekh rahe hain to overview de sakti hoon, ya call end kar dein. Aap kya prefer karenge?",
          hi: "Theek hai. Overview chahiye ya call end karein?",
        });
        return say(session, text, true);
      } else {
        // try soft extract from free text
        if (!session.lead.intent) {
          return say(
            session,
            t(lang, {
              en: "Just to confirm — is it for buying a home to live in, or for investment?",
              hinglish: "Confirm kar loon — khud rehene ke liye buy karna hai ya investment ke liye?",
              hi: "Self-use ke liye hai ya investment ke liye?",
            }),
            true
          );
        }
      }
      session.step = nextMissingStep(session.lead);
      return advanceOrQualify(session, lang);
    }

    // Generic slot-filling steps
    if (["location", "configuration", "budget", "purpose", "timeline", "contact_name", "contact_phone"].includes(session.step)) {
      const filled = applyStepInput(session, analysis, userText);
      if (!filled) {
        return say(session, clarify(session.step, lang), true);
      }
      const missing = nextMissingStep(session.lead);
      if (missing === "wrap_up") {
        // Share project match once before contact if not done
        if (!session._projectShared) {
          session._projectShared = true;
          session.step = "qualify_project";
          return say(session, askFor("qualify_project", lang, session), true);
        }
        session.step = "wrap_up";
        return finish(session, lang);
      }
      // After core reqs, present project once before contact capture
      if (
        session.lead.location &&
        session.lead.configuration &&
        session.lead.budget &&
        session.lead.timeline &&
        !session._projectShared &&
        (missing === "contact_name" || missing === "contact_phone")
      ) {
        session._projectShared = true;
        session.step = "qualify_project";
        return say(session, askFor("qualify_project", lang, session), true);
      }
      // Also pitch once when we still need timeline but have budget+config+location
      if (
        session.lead.location &&
        session.lead.configuration &&
        session.lead.budget &&
        !session.lead.timeline &&
        !session._projectShared &&
        missing === "timeline"
      ) {
        // Ask timeline first for cleaner qualification, then pitch
        session.step = "timeline";
        return say(session, askFor("timeline", lang, session), true);
      }
      session.step = missing;
      return say(session, askFor(missing, lang, session), true);
    }

    if (session.step === "qualify_project") {
      if (analysis.intent === "deny") {
        session.lead.notes.push("Project may not match — wants other options");
        const text = t(lang, {
          en: "No worries. I will note your filters and our team can share other matching projects too. Let me quickly take your name and number.",
          hinglish: "Koi baat nahi. Main aapki filters note kar leti hoon — team doosre matching projects bhi share kar sakti hai. Naam aur number le lu?",
          hi: "Theek hai. Naam aur number de dijiye, team options bhejegi.",
        });
        session.step = nextMissingStep(session.lead);
        if (session.step === "wrap_up") session.step = "contact_name";
        return say(session, text + " " + askFor(session.step, lang, session), true);
      }
      if (analysis.intent === "affirm" || analysis.intent === "statement" || analysis.intent === "site_visit") {
        if (analysis.intent === "site_visit") session.lead.site_visit_interest = "yes";
        session._projectShared = true;
        session.step = nextMissingStep(session.lead);
        if (session.step === "wrap_up") return finish(session, lang);
        return say(session, askFor(session.step, lang, session), true);
      }
      // treat as question
      const text = answerProjectQuestion(userText, lang) + " " +
        t(lang, {
          en: "Shall I go ahead and note your contact for a detailed inventory callback?",
          hinglish: "Main aapka contact note kar loon detailed inventory callback ke liye?",
          hi: "Callback ke liye contact note karun?",
        });
      session.step = nextMissingStep(session.lead);
      return say(session, text, true);
    }

    // Fallback
    const missing = nextMissingStep(session.lead);
    session.step = missing === "wrap_up" ? "wrap_up" : missing;
    if (session.step === "wrap_up") return finish(session, lang);
    return say(
      session,
      t(lang, {
        en: "Got it. " + askFor(session.step, lang, session),
        hinglish: "Samajh gayi. " + askFor(session.step, lang, session),
        hi: "Theek hai. " + askFor(session.step, lang, session),
      }),
      true
    );
  }

  function applyStepInput(session, analysis, userText) {
    const step = session.step;
    const slots = analysis.slots || {};
    if (step === "location") {
      if (slots.location) {
        session.lead.location = slots.location;
        return true;
      }
      // free text location
      if (userText && userText.trim().length > 2 && analysis.intent !== "deny") {
        session.lead.location = userText.trim().slice(0, 60);
        return true;
      }
      if (analysis.intent === "affirm") {
        session.lead.location = window.PROJECT_KB.project.location.full;
        return true;
      }
      return false;
    }
    if (step === "configuration") {
      if (slots.configuration) {
        session.lead.configuration = slots.configuration;
        if (slots.property_type) session.lead.property_type = slots.property_type;
        return true;
      }
      return false;
    }
    if (step === "budget") {
      if (slots.budget) {
        session.lead.budget = slots.budget;
        return true;
      }
      // accept raw if contains digit
      if (/\d/.test(userText)) {
        session.lead.budget = userText.trim().slice(0, 40);
        return true;
      }
      return false;
    }
    if (step === "purpose") {
      if (slots.purpose) {
        session.lead.purpose = slots.purpose;
        return true;
      }
      if (analysis.intent === "intent_invest") {
        session.lead.purpose = "investment";
        return true;
      }
      if (analysis.intent === "intent_buy" || analysis.intent === "affirm") {
        session.lead.purpose = "self-use";
        return true;
      }
      if (analysis.intent === "intent_both") {
        session.lead.purpose = "both";
        return true;
      }
      return false;
    }
    if (step === "timeline") {
      if (slots.timeline) {
        session.lead.timeline = slots.timeline;
        return true;
      }
      if (userText && userText.trim().length > 2) {
        session.lead.timeline = userText.trim().slice(0, 40);
        return true;
      }
      return false;
    }
    if (step === "contact_name") {
      if (slots.name) {
        session.lead.name = slots.name;
        return true;
      }
      // whole utterance as name if short
      let cleaned = userText.replace(/[^a-zA-Z\u0900-\u097F\s]/g, " ").trim();
      cleaned = cleaned.replace(/\b(mera naam hai|mera naam|my name is|my name|i am|i'm|main|hai|hoon|ji)\b/gi, " ").replace(/\s+/g, " ").trim();
      if (cleaned && cleaned.split(/\s+/).length <= 4 && cleaned.length >= 2 && !/\d/.test(cleaned)) {
        const blocked = /^(yes|no|haan|han|nahi|ok|okay|theek|sahi)$/i;
        if (!blocked.test(cleaned)) {
          session.lead.name = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
          return true;
        }
      }
      return false;
    }
    if (step === "contact_phone") {
      if (slots.phone) {
        session.lead.phone = slots.phone;
        return true;
      }
      const p = userText.replace(/\D/g, "");
      if (p.length >= 10) {
        session.lead.phone = p.slice(-10);
        return true;
      }
      return false;
    }
    return false;
  }

  function clarify(step, lang) {
    const map = {
      location: {
        en: "Could you please name the city or sector you prefer?",
        hinglish: "Please city ya sector ka naam bata dijiye jo aap prefer karte hain?",
        hi: "Kis city ya sector mein dekhna hai?",
      },
      configuration: {
        en: "Please say 2 BHK, 3 BHK, 4 BHK, plot, or commercial.",
        hinglish: "2 BHK, 3 BHK, 4 BHK, plot ya commercial — jo chahiye wo boliye.",
        hi: "2, 3, 4 BHK, plot ya commercial batayiye.",
      },
      budget: {
        en: "Please share an approximate budget, for example 1 crore or 80 lakh.",
        hinglish: "Approximate budget bata dijiye, jaise 1 crore ya 80 lakh.",
        hi: "Budget lagbhag kitna hai?",
      },
      purpose: {
        en: "Is it for self-use or investment?",
        hinglish: "Self-use ke liye hai ya investment ke liye?",
        hi: "Self-use ya investment?",
      },
      timeline: {
        en: "Roughly when do you plan to buy?",
        hinglish: "Roughly kab tak kharidna chahte hain?",
        hi: "Kab tak lene ka plan hai?",
      },
      contact_name: {
        en: "Please tell me your full name.",
        hinglish: "Apna poora naam bata dijiye.",
        hi: "Apna naam batayiye.",
      },
      contact_phone: {
        en: "Please share a valid 10-digit mobile number.",
        hinglish: "Sahi 10-digit mobile number share kariye.",
        hi: "10 digit mobile number dijiye.",
      },
    };
    return t(lang, map[step] || { en: "Please repeat that.", hinglish: "Please dobara boliye.", hi: "Dobara boliye." });
  }

  function advanceOrQualify(session, lang) {
    if (
      session.lead.location &&
      session.lead.configuration &&
      session.lead.budget &&
      !session._projectShared
    ) {
      session._projectShared = true;
      session.step = "qualify_project";
      return say(session, askFor("qualify_project", lang, session), true);
    }
    return say(session, askFor(session.step, lang, session), true);
  }

  function say(session, text, expectReply) {
    session.lastAgentText = text;
    session.lead.transcript.push({ role: "agent", text, at: new Date().toISOString() });
    return { text, session, expectReply };
  }

  function finish(session, lang, soft) {
    session.step = "wrap_up";
    session.ended = true;
    session.lead.ended_at = new Date().toISOString();
    let text;
    if (soft) {
      text = t(lang, {
        en: "Sure. I will mark a callback. Thank you for your time. Have a good day!",
        hinglish: "Theek hai. Main callback mark kar deti hoon. Time dene ke liye dhanyavaad. Good day!",
        hi: "Callback note kar liya. Dhanyavaad!",
      });
    } else {
      text = buildWrapUp(session, lang);
    }
    session.lastAgentText = text;
    session.lead.transcript.push({ role: "agent", text, at: new Date().toISOString() });
    session.summary = generateSummary(session);
    persistLead(session);
    return { text, session, expectReply: false, ended: true, summary: session.summary };
  }

  return {
    STEPS,
    createSession,
    start,
    handle,
    generateSummary,
    askFor,
  };
})();
