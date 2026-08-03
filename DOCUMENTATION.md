# PropCall AI — Technical Documentation

## 1. Overview

PropCall AI is a **live browser-based real-estate voice agent** built for the AI Internship technical assignment. It conducts a natural sales qualification call in **Hindi / Hinglish / basic English**, answers questions about a **dummy** project, captures lead fields, and writes a **call summary**.

## 2. Tools and technologies

| Layer | Technology |
|---|---|
| UI | HTML5, Tailwind CSS (browser build), vanilla JS |
| Speech-to-text | Web Speech API `SpeechRecognition` / `webkitSpeechRecognition` |
| Text-to-speech | Web Speech API `speechSynthesis` |
| NLU | Custom JS rules (`nlu.js`) — no paid API required |
| Dialogue | Finite state machine (`conversation.js`) |
| Knowledge base | Static JS object (`project-data.js`) |
| Persistence | `localStorage` |
| Packaging | Static web app (works on any static host / Gumloop artifact) |

## 3. AI model used

**Demo model:** Deterministic multilingual NLU + template NLG.

**Why:** Live interview reliability, zero key leakage, no hallucinated prices/returns, offline-capable.

**LLM upgrade (optional next step):** Replace `ConversationEngine.handle` reply text with a model call that receives:

- system persona + disclaimers  
- `PROJECT_KB` JSON  
- current `lead` slots  
- last user utterance  

…and must return `{ reply, slot_updates }` JSON. UI/voice layers stay unchanged.

## 4. Voice / calling platform

- **Platform:** Browser voice (not PSTN).  
- **STT language:** `hi-IN` by default (works for Hindi + Hinglish); `en-IN` when English preference is stable.  
- **TTS:** Prefers `hi-IN` female-like voices when installed; falls back to `en-IN` / `en-US`.  
- **Fallback:** Full text chat if mic permission is denied.

## 5. Conversation flow design

```
greet
  → intent (buy / invest / both)
  → location
  → configuration (2/3/4 BHK, plot, commercial)
  → budget
  → purpose (if not implied)
  → timeline
  → qualify_project (pitch + Q&A)
  → contact_name
  → contact_phone
  → wrap_up + summary
```

**Global handlers (any step):**

- Project FAQ / price / amenities / possession / location  
- Home loan  
- Site visit interest  
- Repeat last agent line  
- End call  
- “Who are you?”

**Naturalness levers:**

- Slot carry-over (user can dump multiple facts in one sentence)  
- Clarification prompts when a slot is missing  
- Language-stable replies (won’t flip to English on “3 BHK”)  
- Explicit **no guaranteed returns** language in wrap-up

## 6. Lead storage (interview checkpoint)

| Key | Contents |
|---|---|
| `propcall_leads_v1` | Array of lead objects + embedded summary |
| `propcall_calls_v1` | Lightweight call log |

**UI:** **Leads & Summaries** tab · **Export JSON** button · DevTools → Application → Local Storage.

## 7. Sample project facts

- **Name:** Green Valley Residences  
- **Location:** Sector 150, Noida, UP  
- **Configs:** 2/3/4 BHK, plot, commercial  
- **Price bands:** ~75 Lakh → ~3.5 Cr (indicative)  
- **Possession:** December 2027 (phased)  
- **Amenities:** clubhouse, pool, park, security, etc.  
- **RERA:** sample demo ID only  

## 8. Challenges

1. Decimal budgets broken by naive punctuation stripping → fixed with decimal-preserving normalizer.  
2. Mixed-language STT → `hi-IN` default + keyword NLU.  
3. Balancing free conversation vs. truthful pricing → KB + disclaimers, not open LLM.  
4. Browser fragmentation → text fallback always on.

## 9. Next version improvements

1. Twilio/Exotel phone legs + call recording  
2. Streaming LLM with tool calls + guardrails  
3. Sheets/HubSpot CRM sync  
4. True barge-in (cancel TTS on speech start)  
5. Supervisor dashboard and A/B scripts  

## 10. File map

```
real_estate_ai_caller/
  index.html
  styles.css
  app.js
  voice.js
  nlu.js
  conversation.js
  project-data.js
  README.md
  SUBMISSION.md
  DOCUMENTATION.md
```
