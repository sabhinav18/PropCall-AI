/**
 * PropCall AI — UI controller
 * Browser-based real estate voice calling agent demo.
 */
(function () {
  const app = document.getElementById("app");

  const state = {
    session: null,
    callActive: false,
    voiceState: "idle", // idle | listening | speaking | processing | ended
    partial: "",
    error: "",
    tab: "call",
    textMode: false,
    autoListen: true,
    muted: false,
    leads: [],
    lastSummary: null,
  };

  function loadLeads() {
    try {
      state.leads = JSON.parse(localStorage.getItem(window.STORAGE_KEY) || "[]");
    } catch {
      state.leads = [];
    }
  }

  function el(tag, cls, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
      });
    }
    return n;
  }

  function statusMeta() {
    const map = {
      idle: { label: "Ready", cls: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200" },
      listening: { label: "Listening…", cls: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
      speaking: { label: "Agent speaking…", cls: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
      processing: { label: "Understanding…", cls: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
      ended: { label: "Call ended", cls: "bg-stone-300 text-stone-800 dark:bg-stone-700 dark:text-stone-100" },
    };
    return map[state.voiceState] || map.idle;
  }

  function supportNote() {
    const s = window.Voice.isSupported();
    if (!s.stt && !s.tts) return "Voice APIs unavailable — use text chat mode.";
    if (!s.stt) return "Speech-to-text unavailable in this browser. Use Chrome/Edge or text mode.";
    if (!s.tts) return "Text-to-speech unavailable — replies will show as text only.";
    return "Voice ready (Web Speech API). Best in Chrome / Edge with mic permission.";
  }

  function render() {
    loadLeads();
    app.innerHTML = "";

    const shell = el("div", "flex flex-col min-h-dvh w-full");

    // Header
    const header = el(
      "header",
      "border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur sticky top-0 z-20"
    );
    const headerInner = el(
      "div",
      "w-full max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    );
    const brand = el("div", "flex items-center gap-3");
    brand.append(
      el(
        "div",
        "h-10 w-10 rounded-xl bg-emerald-700 text-white grid place-items-center font-bold shadow-sm",
        { text: "PC" }
      ),
      el("div", null, {
        html: `<div class="font-semibold text-base tracking-tight">PropCall AI</div>
               <div class="text-xs text-stone-500 dark:text-stone-400">Real Estate Voice Agent · Demo</div>`,
      })
    );
    const st = statusMeta();
    const right = el("div", "flex flex-wrap items-center gap-2");
    right.append(
      el("span", `status-chip ${st.cls}`, {
        html: `<span class="status-dot"></span>${st.label}`,
      }),
      el("span", "text-xs text-stone-500 dark:text-stone-400 hidden md:inline", { text: supportNote() })
    );
    headerInner.append(brand, right);
    header.append(headerInner);

    // Tabs
    const tabBar = el(
      "div",
      "w-full max-w-6xl mx-auto px-4 pt-3"
    );
    const tabs = el(
      "div",
      "inline-flex p-1 rounded-xl bg-stone-200/80 dark:bg-stone-900 gap-1"
    );
    [
      ["call", "Live Call"],
      ["leads", "Leads & Summaries"],
      ["project", "Sample Project"],
      ["about", "Architecture"],
    ].forEach(([id, label]) => {
      const b = el("button", "tab-btn px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-stone-600 dark:text-stone-300", {
        type: "button",
        "aria-selected": state.tab === id,
        text: label,
        onclick: () => {
          state.tab = id;
          render();
        },
      });
      tabs.append(b);
    });
    tabBar.append(tabs);

    const main = el("main", "flex-1 w-full max-w-6xl mx-auto px-4 py-4");

    if (state.tab === "call") main.append(renderCall());
    else if (state.tab === "leads") main.append(renderLeads());
    else if (state.tab === "project") main.append(renderProject());
    else main.append(renderAbout());

    const footer = el(
      "footer",
      "border-t border-stone-200 dark:border-stone-800 py-3 text-center text-xs text-stone-500 dark:text-stone-400 px-4"
    );
    footer.textContent =
      "Demo only · Dummy project data · No guaranteed returns · Lead data stored in this browser (localStorage)";

    shell.append(header, tabBar, main, footer);
    app.append(shell);

    // Auto-scroll transcript
    const sc = document.getElementById("transcript-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  }

  function renderCall() {
    const wrap = el("div", "grid grid-cols-1 md:grid-cols-5 gap-4");

    // Left: voice stage
    const stage = el(
      "section",
      "md:col-span-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 flex flex-col items-center gap-4 shadow-sm"
    );

    const agent = window.PROJECT_KB.agent;
    stage.append(
      el("div", "text-center", {
        html: `<div class="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">On call with</div>
               <div class="text-lg font-semibold">${agent.name} · ${agent.role}</div>
               <div class="text-xs text-stone-500">${agent.company}</div>`,
      })
    );

    const orb = el("div", `voice-orb ${state.voiceState}`);
    const wave = el("div", `wave text-white ${state.voiceState === "speaking" || state.voiceState === "listening" ? "" : "paused"}`);
    for (let i = 0; i < 5; i++) wave.append(el("span"));
    orb.append(wave);
    stage.append(orb);

    if (state.partial) {
      stage.append(
        el("p", "text-xs text-center text-stone-500 dark:text-stone-400 max-w-xs italic", {
          text: "Hearing: " + state.partial,
        })
      );
    }

    if (state.error) {
      stage.append(
        el("p", "text-xs text-center text-red-600 dark:text-red-400 max-w-sm", { text: state.error })
      );
    }

    const controls = el("div", "flex flex-wrap justify-center gap-2 w-full");
    if (!state.callActive) {
      controls.append(
        btn("Start live call", "bg-emerald-700 hover:bg-emerald-800 text-white", startCall),
        btn("Text-only demo", "bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white", () => {
          state.textMode = true;
          startCall();
        })
      );
    } else {
      controls.append(
        btn(
          state.voiceState === "listening" ? "Listening…" : "Push to talk",
          "bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50",
          () => listenTurn(),
          state.voiceState === "speaking" || state.voiceState === "processing" || state.voiceState === "listening"
        ),
        btn("End call", "bg-red-600 hover:bg-red-700 text-white", endCallManual),
        btn(
          state.muted ? "Unmute TTS" : "Mute TTS",
          "bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700",
          () => {
            state.muted = !state.muted;
            if (state.muted) window.Voice.stopSpeaking();
            render();
          }
        )
      );
    }
    stage.append(controls);

    // Language hint
    const lang = state.session ? state.session.lead.language_pref : "hinglish";
    stage.append(
      el("p", "text-[11px] text-center text-stone-500 dark:text-stone-400 leading-relaxed max-w-sm", {
        text: `Speak in Hindi, Hinglish, or English. Detected style: ${lang}. Try: "Haan, 3 BHK chahiye Noida mein, budget 1.2 crore."`,
      })
    );

    // Right: transcript + lead card
    const right = el("div", "md:col-span-3 flex flex-col gap-4");

    const chatCard = el(
      "section",
      "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex flex-col min-h-[340px] max-h-[520px]"
    );
    chatCard.append(
      el("div", "px-4 py-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between", {
        html: `<span class="font-medium">Live transcript</span>
               <span class="text-xs text-stone-500">Natural dialogue · not a fixed IVR</span>`,
      })
    );
    const scroll = el(
      "div",
      "flex-1 overflow-y-auto chat-scroll p-4 space-y-3",
      { id: "transcript-scroll" }
    );
    const transcript = (state.session && state.session.lead.transcript) || [];
    if (!transcript.length) {
      scroll.append(
        el("div", "h-full grid place-items-center text-stone-400 text-sm px-6 text-center", {
          text: "Start a call to begin. The agent will greet you and qualify the lead.",
        })
      );
    } else {
      transcript.forEach((m) => {
        const row = el("div", `flex ${m.role === "user" ? "justify-end" : "justify-start"}`);
        const bubble = el(
          "div",
          `max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            m.role === "user" ? "bubble-user rounded-br-md" : "bubble-agent rounded-bl-md"
          }`,
          { text: m.text }
        );
        row.append(bubble);
        scroll.append(row);
      });
    }
    chatCard.append(scroll);

    // Text input always available during call
    const composer = el("div", "p-3 border-t border-stone-200 dark:border-stone-800 flex gap-2");
    const input = el("input", "flex-1 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600/40", {
      type: "text",
      id: "text-reply",
      placeholder: state.callActive ? "Type a reply (or use voice)…" : "Start a call to reply",
      disabled: !state.callActive || state.voiceState === "ended",
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitText();
      }
    });
    const send = btn("Send", "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900", submitText, !state.callActive);
    composer.append(input, send);
    chatCard.append(composer);

    right.append(chatCard, renderLeadCard(), state.lastSummary ? renderSummaryBox(state.lastSummary) : el("div"));

    wrap.append(stage, right);
    return wrap;
  }

  function renderLeadCard() {
    const L = (state.session && state.session.lead) || {};
    const card = el(
      "section",
      "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm"
    );
    card.append(el("h3", "font-medium mb-3", { text: "Live lead capture" }));
    const grid = el("div", "grid grid-cols-1 sm:grid-cols-2 gap-2");
    const fields = [
      ["Name", L.name],
      ["Phone", L.phone],
      ["Intent", L.intent],
      ["Purpose", L.purpose],
      ["Location", L.location],
      ["Configuration", L.configuration],
      ["Budget", L.budget],
      ["Timeline", L.timeline],
    ];
    fields.forEach(([label, val]) => {
      const box = el(
        "div",
        `rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2 ${val ? "lead-filled" : ""}`
      );
      box.append(
        el("div", "text-[10px] uppercase tracking-wide text-stone-500", { text: label }),
        el("div", "text-sm font-medium truncate", { text: val || "—" })
      );
      grid.append(box);
    });
    card.append(grid);
    return card;
  }

  function renderSummaryBox(summary) {
    const box = el(
      "section",
      "rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/40 p-4 shadow-sm"
    );
    box.append(
      el("div", "flex items-center justify-between gap-2 mb-2", {
        html: `<h3 class="font-medium text-emerald-900 dark:text-emerald-200">Call summary</h3>
               <button type="button" id="copy-summary" class="text-xs font-medium text-emerald-800 dark:text-emerald-300 underline">Copy</button>`,
      }),
      el("pre", "text-xs whitespace-pre-wrap font-mono text-stone-700 dark:text-stone-300 max-h-48 overflow-y-auto", {
        text: summary.text,
      })
    );
    queueMicrotask(() => {
      const b = document.getElementById("copy-summary");
      if (b) {
        b.onclick = async () => {
          try {
            await navigator.clipboard.writeText(summary.text);
            b.textContent = "Copied";
          } catch {
            b.textContent = "Select & copy manually";
          }
        };
      }
    });
    return box;
  }

  function renderLeads() {
    loadLeads();
    const wrap = el("div", "space-y-4");
    wrap.append(
      el("div", "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2", {
        html: `<div>
          <h2 class="text-lg font-semibold">Stored leads</h2>
          <p class="text-xs text-stone-500 dark:text-stone-400">Saved in browser localStorage key <code>${window.STORAGE_KEY}</code>. Visible during live interview — open DevTools → Application → Local Storage.</p>
        </div>`,
      })
    );

    const actions = el("div", "flex flex-wrap gap-2");
    actions.append(
      btn("Refresh", "bg-stone-200 dark:bg-stone-800", () => render()),
      btn("Export JSON", "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900", exportLeads),
      btn("Clear all leads", "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200", () => {
        if (confirm("Clear all locally stored leads?")) {
          localStorage.removeItem(window.STORAGE_KEY);
          localStorage.removeItem(window.CALL_LOG_KEY);
          state.leads = [];
          render();
        }
      })
    );
    wrap.append(actions);

    if (!state.leads.length) {
      wrap.append(
        el("div", "rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 p-10 text-center text-stone-500", {
          text: "No leads yet. Complete a call to capture one.",
        })
      );
      return wrap;
    }

    const list = el("div", "space-y-3");
    state.leads.forEach((lead) => {
      const card = el(
        "article",
        "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 shadow-sm"
      );
      card.append(
        el("div", "flex flex-wrap items-start justify-between gap-2 mb-2", {
          html: `<div>
              <div class="font-semibold">${escapeHtml(lead.name || "Unknown caller")}</div>
              <div class="text-xs text-stone-500">${escapeHtml(lead.phone || "No phone")} · ${escapeHtml(lead.id)}</div>
            </div>
            <div class="text-xs text-stone-500">${escapeHtml((lead.ended_at || lead.started_at || "").replace("T", " ").slice(0, 19))}</div>`,
        }),
        el("div", "flex flex-wrap gap-1.5 mb-2", {
          html: [lead.configuration, lead.location, lead.budget, lead.intent, lead.timeline]
            .filter(Boolean)
            .map(
              (t) =>
                `<span class="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">${escapeHtml(
                  t
                )}</span>`
            )
            .join(""),
        })
      );
      if (lead.summary && lead.summary.text) {
        card.append(
          el("pre", "text-[11px] whitespace-pre-wrap font-mono text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-950 rounded-xl p-3 max-h-40 overflow-y-auto", {
            text: lead.summary.text,
          })
        );
      }
      list.append(card);
    });
    wrap.append(list);
    return wrap;
  }

  function renderProject() {
    const p = window.PROJECT_KB.project;
    const wrap = el("div", "space-y-4");
    wrap.append(
      el("section", "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm", {
        html: `<h2 class="text-lg font-semibold mb-1">${escapeHtml(p.name)}</h2>
          <p class="text-sm text-stone-500 mb-4">${escapeHtml(p.developer)} · ${escapeHtml(p.location.full)}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><div class="text-xs uppercase text-stone-500">Type</div><div>${escapeHtml(p.type)}</div></div>
            <div><div class="text-xs uppercase text-stone-500">Possession</div><div>${escapeHtml(p.possession)}</div></div>
            <div><div class="text-xs uppercase text-stone-500">RERA (sample)</div><div>${escapeHtml(p.rera)}</div></div>
            <div><div class="text-xs uppercase text-stone-500">Payment</div><div>${escapeHtml(p.payment_plan)}</div></div>
          </div>`,
      })
    );

    const cfg = el("section", "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm");
    cfg.append(el("h3", "font-medium mb-3", { text: "Configurations & indicative prices" }));
    const tableWrap = el("div", "table-wrapper overflow-x-auto");
    const table = el("table", "w-full text-sm text-left");
    table.innerHTML = `<thead class="text-xs uppercase text-stone-500 border-b border-stone-200 dark:border-stone-700">
      <tr><th class="py-2 pr-3">Config</th><th class="py-2 pr-3">Area</th><th class="py-2">Price range (INR)</th></tr>
    </thead>`;
    const tb = el("tbody");
    p.configurations.forEach((c) => {
      const tr = el("tr", "border-b border-stone-100 dark:border-stone-800");
      tr.innerHTML = `<td class="py-2 pr-3 font-medium">${escapeHtml(c.label)}</td>
        <td class="py-2 pr-3">${escapeHtml(c.carpet_sqft)}</td>
        <td class="py-2">${escapeHtml(c.price_range_inr)}</td>`;
      tb.append(tr);
    });
    table.append(tb);
    tableWrap.append(table);
    cfg.append(tableWrap);
    wrap.append(cfg);

    wrap.append(
      el("section", "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm", {
        html: `<h3 class="font-medium mb-2">Amenities</h3>
          <ul class="list-disc pl-5 space-y-1 text-sm">${p.amenities.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
          <h3 class="font-medium mt-4 mb-2">Location advantages</h3>
          <ul class="list-disc pl-5 space-y-1 text-sm">${p.location.nearby.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
          <h3 class="font-medium mt-4 mb-2">Disclaimers</h3>
          <ul class="list-disc pl-5 space-y-1 text-sm text-stone-600 dark:text-stone-400">${p.disclaimers
            .map((a) => `<li>${escapeHtml(a)}</li>`)
            .join("")}</ul>`,
      })
    );
    return wrap;
  }

  function renderAbout() {
    const s = window.Voice.isSupported();
    const wrap = el("div", "space-y-4");
    wrap.append(
      el("section", "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm prose-sm", {
        html: `
          <h2 class="text-lg font-semibold mb-2">System architecture</h2>
          <ol class="list-decimal pl-5 space-y-1 text-sm mb-4">
            <li><strong>UI (this page)</strong> — call controls, live transcript, lead panel, summaries.</li>
            <li><strong>Voice layer</strong> — browser Web Speech API: SpeechRecognition (STT) + speechSynthesis (TTS).</li>
            <li><strong>NLU</strong> — rule/keyword extractor for Hindi, Hinglish & English (intent + slots).</li>
            <li><strong>Dialogue manager</strong> — state machine that greets, qualifies, answers FAQs, handles interruptions, wraps up.</li>
            <li><strong>Knowledge base</strong> — dummy project <em>Green Valley Residences</em> (Noida Sector 150).</li>
            <li><strong>Lead store</strong> — <code>localStorage</code> on this device (interview-visible).</li>
          </ol>
          <h3 class="font-medium mb-1">What is functional</h3>
          <ul class="list-disc pl-5 space-y-1 text-sm mb-3">
            <li>Browser microphone voice conversation (Chrome/Edge recommended)</li>
            <li>Hindi / Hinglish / English understanding for core qualification slots</li>
            <li>Natural multi-turn flow with barge-in style follow-up questions</li>
            <li>Project Q&A, lead capture, call summary generation</li>
            <li>Text fallback if mic is blocked</li>
          </ul>
          <h3 class="font-medium mb-1">What is simulated / out of scope</h3>
          <ul class="list-disc pl-5 space-y-1 text-sm mb-3">
            <li>No real PSTN / Twilio phone number in this demo build (browser voice instead)</li>
            <li>NLU is deterministic rules — not a hosted LLM (swap-in ready; see docs)</li>
            <li>No CRM sync (Salesforce/HubSpot) — local storage only</li>
            <li>Project data is dummy / indicative</li>
          </ul>
          <h3 class="font-medium mb-1">Runtime checks</h3>
          <ul class="list-disc pl-5 space-y-1 text-sm">
            <li>SpeechRecognition: <strong>${s.stt ? "available" : "not available"}</strong></li>
            <li>speechSynthesis: <strong>${s.tts ? "available" : "not available"}</strong></li>
          </ul>
        `,
      })
    );
    return wrap;
  }

  function btn(label, cls, onClick, disabled) {
    const b = el(
      "button",
      `px-3 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${cls}`,
      { type: "button", text: label }
    );
    if (disabled) b.disabled = true;
    b.addEventListener("click", onClick);
    return b;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;");
  }

  async function startCall() {
    state.error = "";
    state.lastSummary = null;
    state.session = window.ConversationEngine.createSession();
    state.callActive = true;
    state.voiceState = "processing";
    render();

    const res = window.ConversationEngine.start(state.session);
    state.session = res.session;
    await speakAgent(res.text);
    if (res.expectReply && state.autoListen && !state.textMode) {
      await listenTurn();
    } else {
      state.voiceState = "idle";
      render();
    }
  }

  async function speakAgent(text) {
    state.voiceState = "speaking";
    state.partial = "";
    render();
    if (state.muted) {
      await wait(600);
      state.voiceState = state.session && state.session.ended ? "ended" : "idle";
      render();
      return;
    }
    const lang = state.session.lead.language_pref || "hinglish";
    await window.Voice.speak(text, lang, {
      onStart: () => {
        state.voiceState = "speaking";
        render();
      },
    });
    state.voiceState = state.session && state.session.ended ? "ended" : "idle";
    render();
  }

  async function listenTurn() {
    if (!state.callActive || !state.session || state.session.ended) return;
    if (state.textMode) {
      state.voiceState = "idle";
      render();
      document.getElementById("text-reply")?.focus();
      return;
    }
    state.error = "";
    state.voiceState = "listening";
    state.partial = "";
    render();

    const lang = state.session.lead.language_pref || "hinglish";
    try {
      const transcript = await window.Voice.listenOnce(lang, {
        onPartial: (p) => {
          state.partial = p;
          render();
        },
      });
      await processUser(transcript);
    } catch (err) {
      state.voiceState = "idle";
      state.partial = "";
      if (String(err.message) === "no-speech") {
        state.error = "Didn't catch that — tap Push to talk or type your reply.";
      } else {
        state.error = err.message || "Voice input failed. You can type instead.";
        state.textMode = true;
      }
      render();
    }
  }

  async function processUser(text) {
    if (!text || !state.session) return;
    state.voiceState = "processing";
    state.partial = "";
    render();
    await wait(200);
    const res = window.ConversationEngine.handle(state.session, text);
    state.session = res.session;
    if (res.summary) state.lastSummary = res.summary;
    await speakAgent(res.text);
    if (res.ended) {
      state.callActive = false;
      state.voiceState = "ended";
      loadLeads();
      render();
      return;
    }
    if (res.expectReply && state.autoListen && !state.textMode) {
      // small gap before listening again
      await wait(350);
      await listenTurn();
    } else {
      state.voiceState = "idle";
      render();
    }
  }

  function submitText() {
    const input = document.getElementById("text-reply");
    if (!input || !state.callActive) return;
    const val = input.value.trim();
    if (!val) return;
    input.value = "";
    processUser(val);
  }

  async function endCallManual() {
    if (!state.session || state.session.ended) {
      state.callActive = false;
      state.voiceState = "ended";
      render();
      return;
    }
    window.Voice.stopSpeaking();
    const lang = state.session.lead.language_pref || "hinglish";
    // Force graceful end via engine
    const res = window.ConversationEngine.handle(state.session, "end call please bye");
    state.session = res.session;
    if (res.summary) state.lastSummary = res.summary;
    state.callActive = false;
    await speakAgent(res.text || "Dhanyavaad. Call end kar rahi hoon.");
    state.voiceState = "ended";
    loadLeads();
    render();
  }

  function exportLeads() {
    loadLeads();
    const blob = new Blob([JSON.stringify(state.leads, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "propcall-leads.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Init
  loadLeads();
  render();
})();
