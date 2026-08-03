# Assignment Submission — Live Real Estate AI Calling Agent

## Candidate

- **Candidate Name:** Aachal Singh
- **Contact:** aachalsingh7042@gmail.com

## Links (fill after you publish)

| Deliverable | Link |
|---|---|
| **Live Demo URL** | _(Gumloop artifact link from this chat / your static host)_ |
| **Calling Number or Voice Demo Link** | Same Live Demo URL — browser mic voice call (no PSTN number in this build) |
| **Video Demo Link** | _(Record 2–4 min screen capture: start call → Hinglish qualify → summary)_ |
| **GitHub / Source Code Link** | _(Push `real_estate_ai_caller/` folder to a public repo)_ |

## Tools used

- HTML, CSS (Tailwind browser), JavaScript (vanilla)
- Web Speech API — SpeechRecognition (STT) + speechSynthesis (TTS)
- Custom dialogue state machine + multilingual NLU
- Browser `localStorage` for leads and summaries
- Dummy project knowledge base (Green Valley Residences)

## AI model used

- **Primary (this demo):** Rule-based multilingual NLU + template dialogue manager (deterministic, offline, zero API cost — reliable for live interview).
- **Upgrade path:** Any chat LLM (OpenAI / Gemini / Groq) can replace reply generation; slots already structured for tool calls.

## Voice or calling platform used

- **Browser-based voice demo** via Web Speech API.
- Languages: `hi-IN` (Hindi/Hinglish) and `en-IN` (English).
- **Not used in this build:** Twilio/Exotel PSTN (documented as next version).

## How the conversation flow was created

1. Mapped assignment minimum flow to ordered steps: greet → intent → location → configuration → budget → purpose → timeline → project pitch/Q&A → name → phone → wrap-up.
2. Implemented a **state machine** (`conversation.js`) that always knows the next missing slot.
3. Added **global intents** so users can interrupt with project questions, loan queries, site visit, repeat, or end call.
4. Built **NLU** (`nlu.js`) for Hindi/Hinglish/English keywords, budgets (lakh/crore), BHK configs, NCR locations, and phone/name patterns.
5. Wired **voice I/O** so each agent turn speaks, then listens (or accepts text).
6. On end, **generate summary** and **persist lead** to `localStorage`.

## Challenges faced

1. **Web Speech API quirks** — voices load asynchronously; Chrome needs `webkitSpeechRecognition`; mic blocked on some `file://` origins.
2. **Hinglish STT** — mixed script/transliteration; mitigated with dual language codes and broad keyword lists.
3. **Naturalness vs control** — pure LLM can hallucinate prices; chose guarded templates + KB for trustworthy demo.
4. **No guaranteed Hindi system voice on all machines** — fallback to en-IN voice with Hinglish text still works.

## What I would improve in the next version

- Real phone calling (Twilio Media Streams) + recording
- Streaming LLM with strict tool schema for inventory
- CRM / Google Sheets lead sync
- True barge-in and endpointing
- Analytics on objection handling

## Known limitations

- Browser voice only (not a SIM/PSTN number)
- Rule-based NLU — not full open-domain chat
- Leads stored locally in the browser, not a cloud DB
- Dummy property data only
- Best experience on Chrome/Edge with mic permission

## Functional vs simulated

| Part | Status |
|---|---|
| Live voice conversation in browser | **Functional** |
| Hindi / Hinglish / English handling | **Functional** (rules + hi-IN STT/TTS) |
| Requirement qualification | **Functional** |
| Project Q&A | **Functional** (dummy KB) |
| Lead capture + summary | **Functional** (localStorage) |
| PSTN phone number | **Simulated / not included** — browser demo instead |
| Hosted LLM brain | **Simulated path** — rules engine used; LLM-ready structure |
| CRM integration | **Not included** |

## Interview demo script (suggested)

1. Open Live Demo → **Start live call** → allow mic.  
2. Say: *“Haan boliye, main invest karna chahta hoon.”*  
3. *“Noida Sector 150, 3 BHK, budget 1.2 se 1.5 crore, 3 mahine mein.”*  
4. Ask: *“Amenities kya kya hain? Possession kab hai?”*  
5. Give name + phone → let agent close.  
6. Show **Leads & Summaries** + **Architecture** tab.  
7. Start a **fresh call** with English + different budget when asked.
