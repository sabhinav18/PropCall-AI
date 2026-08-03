# PropCall AI — Live Real Estate AI Calling Agent

Browser-based AI voice-calling agent for real-estate lead qualification.  
Speaks and understands **Hindi**, **Hinglish**, and **basic English**.

## Live demo

Open the exported **PropCall AI** HTML artifact (or `index.html` via any static host).

1. Click **Start live call** (allow microphone).
2. Speak naturally, e.g.  
   - *“Haan, main 3 BHK dekh raha hoon Noida mein, budget 1.2 crore.”*  
   - *“I’m looking to invest in a 2 BHK under 1 crore.”*
3. Or use **Text-only demo** / the text box if mic is unavailable.
4. After the call, open **Leads & Summaries** to see captured data + call summary.

**Recommended browsers:** Chrome or Edge (Web Speech API).  
Safari/Firefox may have limited or no speech recognition — use text mode.

## Features (assignment map)

| Requirement | Implementation |
|---|---|
| Greet & introduce as RE rep | Dialogue step `greet` — agent **Priya**, Horizon Homes Realty |
| Buy vs invest | Intent classification + slot fill |
| Location, config, budget, purpose, timeline | Multi-turn state machine + NLU extractors |
| Sample project Q&A | Knowledge base: **Green Valley Residences**, Noida Sector 150 |
| Interruptions / follow-ups | Global intents (project FAQ, loan, site visit, repeat, end) |
| Collect customer details | Name + 10-digit mobile |
| Professional close | Wrap-up with requirement recap + disclaimers |
| Call summary | Auto-generated + stored with lead |
| Hindi / Hinglish / English | STT `hi-IN`/`en-IN`, language-aware replies |

## Architecture

```
Microphone / Text
      │
      ▼
 Web Speech STT  ──►  NLU (intent + slots)
                            │
                            ▼
                   Dialogue Manager (state machine)
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        Project KB     Lead object    Call summary
              │             │
              ▼             ▼
        Web Speech TTS   localStorage
```

### Modules

| File | Role |
|---|---|
| `index.html` | Shell |
| `styles.css` | Voice orb, chat, layout |
| `project-data.js` | Dummy project + agent persona + FAQs |
| `nlu.js` | Hindi/Hinglish/English intent & slot extraction |
| `conversation.js` | Sales flow state machine, summary, persistence |
| `voice.js` | SpeechRecognition + speechSynthesis wrappers |
| `app.js` | UI, call control, leads panel |

## Tools & technologies

- **Frontend:** HTML5, Tailwind browser runtime, vanilla JS  
- **Voice / calling platform:** Browser **Web Speech API** (no Twilio number in this build)  
- **AI / NLU model:** Deterministic multilingual rules engine (demo-stable, offline, free). Designed so a hosted LLM (e.g. GPT-4o-mini / Gemini) can replace `nlu.js` + reply generation without changing the UI.  
- **Storage:** `localStorage` keys `propcall_leads_v1`, `propcall_calls_v1`  
- **Hosting:** Static files (Gumloop artifact / GitHub Pages / Netlify / any static server)

## Sample project (dummy)

**Green Valley Residences** — Sector 150, Noida  
Configs: 2/3/4 BHK, plot, commercial · indicative prices · amenities · Dec 2027 possession target  
No confidential or unauthorized company data. Prices are demo-only. **No guaranteed returns.**

## Run locally

```bash
# any static server
python3 -m http.server 8080
# open http://localhost:8080
```

Or open `index.html` directly (some browsers restrict mic on `file://` — prefer a local server).

## Lead data location (for interview)

1. Complete a call.  
2. Tab **Leads & Summaries**, or DevTools → Application → Local Storage.  
3. **Export JSON** downloads all leads.

## Known limitations

- Not a PSTN phone number; this is a **browser voice demo** (assignment allows browser-based voice).  
- STT quality depends on browser + mic + accent; text fallback always available.  
- Rule-based NLU can miss unusual phrasings; LLM upgrade would improve open-ended chat.  
- Voices vary by OS; Hindi TTS quality is best when a `hi-IN` system voice is installed.  
- Single-page local store — no multi-user CRM backend.

## What we would improve next

1. Twilio / Exotel / Plivo outbound+inbound calling with Media Streams.  
2. Streaming LLM (tool-calling) for freer dialogue with guardrails.  
3. CRM write (HubSpot/Sheets) and WhatsApp follow-up template.  
4. Real-time barge-in (cancel TTS on user speech).  
5. RERA-verified live inventory API.  
6. Call recording + supervisor dashboard.


