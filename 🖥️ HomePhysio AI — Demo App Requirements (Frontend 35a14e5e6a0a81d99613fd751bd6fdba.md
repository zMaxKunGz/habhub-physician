# 🖥️ HomePhysio AI — Demo App Requirements (Frontend Only)

# HomePhysio AI — Demo App Requirements (Frontend Only)

> **Scope:** Frontend-only demo, physician side only. React + Vite. English UI only. Light theme. Two workflow pages with separate routes.
> 

---

# Decisions & Constraints

| Question | Answer |
| --- | --- |
| After physician confirms order? | Show real OpenAI transcription + real GPT response. Rest is mock. No "send to patient" needed. |
| Dashboard data shown? | ROM progress + pain score + adherence only (mock data) |
| UI Language | English only |
| Backend? | None — frontend only |
| Auth? | None — skip for demo |

---

# Project Setup

- **Framework:** React + Vite
- **Styling:** Tailwind CSS or plain CSS — light theme, white/gray/blue palette
- **Routing:** React Router v6
    - `/order` → Workflow 1: Workout Order
    - `/dashboard` → Workflow 2: Patient Monitoring Dashboard
- **External APIs (real calls):**
    - OpenAI Whisper — `POST https://api.openai.com/v1/audio/transcriptions` (voice transcription)
    - OpenAI Chat — `POST https://api.openai.com/v1/chat/completions` with `gpt-4o` (program generation)
- **Everything else:** Mock/hardcoded data
- **API Key:** Stored in `.env` as `VITE_OPENAI_API_KEY` — never hardcoded

---

# Mock Patient Data

```json
{
  "patient": {
    "patient_id": "P-TKA-0001",
    "display_name": "Pa Sri",
    "full_name": "Mrs. Somsri Rakdee",
    "age": 68,
    "condition": "Post-TKA Recovery",
    "surgery_type": "Total Knee Arthroplasty",
    "affected_side": "Right Knee",
    "post_op_week": 4,
    "goal": "Walk independently without a cane"
  },
  "today_plan": {
    "program_id": "TKA-W4-HEELSLIDE-001",
    "program_name": "Knee Flexion Training",
    "exercise_name": "Heel Slide",
    "duration_minutes": 8,
    "target_reps": 10,
    "target_flexion_degree": 110,
    "difficulty": "Light",
    "status": "ready"
  },
  "consent_status": {
    "camera_tracking": true,
    "voice_command": true,
    "share_to_caregiver": true,
    "share_to_physiotherapist": true
  }
}
```

---

# App Shell

**Mobile-first layout:**

- **Bottom tab bar** (fixed to bottom, always visible) with two tabs: `📋 Order` and `📊 Dashboard`
- Active tab highlighted with primary blue color + filled icon
- **Top app bar** (fixed): App name "HomePhysio AI" left-aligned, minimal height (52px)
- Content area scrolls between top bar and bottom tab bar
- Light background (`#f9fafb`), white cards, subtle shadows
- Safe area padding for notch/home indicator (`env(safe-area-inset-bottom)`)
- No login screen — opens directly to Order page
- Max width 480px, centered on larger screens with side margins

---

# Workflow 1 — Workout Order (`/order`)

## Purpose

Physician selects a patient, speaks a clinical order, sees real transcription from OpenAI Whisper, then gets a real GPT-4o-generated exercise program to review.

## Screen Flow

```
Step 1: Patient Selection
        ↓
Step 2: Voice Order Input  ← Real OpenAI Whisper transcription
        ↓
Step 3: AI Program Generation  ← Real GPT-4o response
        ↓
Step 4: Review Generated Program (mock edits OK)
        ↓
Step 5: Confirm → Success Screen (mock)
```

---

## Step 1 — Patient Selection Screen

- Show a list of 2–3 patient cards (hardcoded mock)
- Each card shows: name, condition, post-op week badge, last session date
- Clicking a card navigates to Step 2 with that patient loaded
- Keep it simple — no search, no filter needed for demo

---

## Step 2 — Voice Order Input Screen

**Layout:**

- Top: Patient summary card (name, condition, week, goal — read-only)
- Center: Large microphone button — **"Hold to Record Order"**
- Below mic: Transcription text area (auto-filled after recording)
- Bottom: **"Generate Program"** button (disabled until transcription exists)

**Voice Recording Implementation:**

- Use browser `MediaRecorder` API to capture audio
- On button hold → start recording
- On button release → stop recording, send audio blob to Whisper
- API call:

```
POST https://api.openai.com/v1/audio/transcriptions
Headers: Authorization: Bearer {VITE_OPENAI_API_KEY}
Body (multipart/form-data):
  file: <audio blob, filename "order.webm">
  model: "whisper-1"
  language: "en"
```

- Show loading spinner: "Transcribing..."
- On success → populate transcription text area with returned text
- Text area is editable — physician can correct before generating
- Show character count

**Demo note:** This is the core technical showcase. Transcription must be a real Whisper API call.

---

## Step 3 — AI Program Generation Screen

- Triggered by "Generate Program" button
- Show full-screen loading state: spinner + "Generating exercise program with GPT-4o..."
- Make real call to OpenAI Chat Completions API

**API Call:**

```
POST https://api.openai.com/v1/chat/completions
Headers: Authorization: Bearer {VITE_OPENAI_API_KEY}
Body:
{
  "model": "gpt-4o",
  "response_format": { "type": "json_object" },
  "messages": [
    { "role": "system", "content": "<system prompt — see below>" },
    { "role": "user", "content": "<user prompt — see below>" }
  ]
}
```

**System Prompt (exact, use as-is in code):**

```
You are a clinical AI assistant specialized in post-operative physical therapy.
You help physicians design precise, safe home exercise programs for orthopedic surgery patients.

Rules:
- Follow evidence-based PT protocols for the given surgery type and recovery week.
- Every program must include stop conditions and safety precautions.
- Calibrate intensity to the patient's post-op week — do not over-prescribe.
- Output ONLY a valid JSON object matching the schema below. No prose. No markdown fences.

Output schema:
{
  "program_name": string,
  "phase": string,
  "total_duration_minutes": number,
  "frequency_per_week": number,
  "exercises": [
    {
      "exercise_name": string,
      "sets": number,
      "reps": number,
      "hold_seconds": number | null,
      "target_flexion_degree": number | null,
      "rest_between_sets_seconds": number,
      "difficulty": "light" | "moderate" | "hard",
      "instructions": string,
      "stop_conditions": string,
      "precautions": string
    }
  ],
  "notes_to_patient": string
}
```

**User Prompt Template (interpolate patient data at runtime):**

```
Patient:
- Name: {display_name}, Age: {age}
- Diagnosis: {condition} — {surgery_type}, {affected_side}
- Post-op Week: {post_op_week}
- Recovery Goal: {goal}
- Consent: camera_tracking={camera_tracking}, voice_command={voice_command}

Physician Order (transcribed by voice):
"{transcribed_order}"

Generate a safe, evidence-based home exercise program based on the physician's order above.
Follow standard {surgery_type} post-op Week {post_op_week} PT protocol.
Return only the JSON object — no explanation, no markdown.
```

---

## Step 4 — Review Generated Program Screen

- Parse JSON response from GPT-4o
- Display as a structured card UI:

**Program Header Card:**

- Program name, phase, total duration, frequency per week

**Exercise Cards** (one per exercise in the array):

| Field | Displayed As |
| --- | --- |
| Exercise name | Card title (bold) |
| Sets × Reps | e.g., "3 sets × 10 reps" |
| Hold | e.g., "Hold 5 sec" (hide if null) |
| Target flexion | e.g., "Target: 110°" (hide if null) |
| Rest | e.g., "Rest 60s between sets" |
| Difficulty | Badge: Light / Moderate / Hard |
| Instructions | Paragraph text |
| Stop conditions | ⚠️ highlighted box |
| Precautions | ⚠️ highlighted box |

**Notes to Patient** section below exercise cards

**Action Buttons:**

- **Confirm & Send** (primary green button)
- **Re-generate** (secondary, re-calls GPT with same inputs)

**Note:** Fields are display-only for demo. No inline editing required.

---

## Step 5 — Success Screen

- Checkmark icon animation
- "Program confirmed for Pa Sri"
- Show program name and total duration as summary
- Two CTA buttons: "Back to Patient List" | "View Dashboard"

---

# Workflow 2 — Patient Dashboard (`/dashboard`)

## Purpose

Physician selects patient, sees a clean summary of ROM progress, pain score, and adherence — plus an AI-generated progress summary from GPT-4o.

## Screen Flow

```
Step 1: Patient Selection (reuse same list component)
        ↓
Step 2: Dashboard View
         ├── Patient Header
         ├── 3 Metric Cards (ROM / Pain / Adherence)
         ├── AI Summary Panel  ← Real GPT-4o call
         └── Alert Badges
```

---

## Step 1 — Patient Selection

- Reuse the same patient list component from Workflow 1
- Same cards, same click behavior — just routes to `/dashboard/:id`

---

## Step 2 — Dashboard View

### Panel A — Patient Header

- Name, age, condition, post-op week badge (e.g., "Week 4 of 12")
- Goal statement in italics
- Alert status badge: 🔴 / 🟡 / 🟢 (derived from mock data)

---

### Panel B — 3 Metric Cards (Mock Data)

**Card 1: ROM Progress**

- Label: "Knee Flexion ROM"
- Progress bar: 92° achieved / 110° target
- Sub-label: "+7° improvement this week"
- Color: blue

**Card 2: Pain Score**

- Label: "Avg Pain Score (This Week)"
- Large number display: 3.5 / 10
- Trend indicator: ↓ Improving (green) or ↑ Worsening (red)
- Sparkline of last 5 sessions: [3, 4, 5, 3.5, 3]

**Card 3: Adherence**

- Label: "Session Adherence"
- Large percentage: 60%
- Sub-label: "3 of 5 sessions completed this week"
- Color: orange (below 80% target)

---

### Panel C — AI Progress Summary

- On page load, automatically call GPT-4o with mock session data
- Show skeleton loading state while waiting
- Display result in a clean card with "AI Summary" label and subtle bot icon

**API Call:** Same OpenAI Chat endpoint as Workflow 1

**System Prompt (exact):**

```
You are a clinical AI assistant helping physicians monitor post-operative physical therapy patients.
Analyze the patient's workout data and provide a concise, actionable progress summary.
Be medically precise. Flag concerns clearly. Keep language direct and professional.
Output ONLY a valid JSON object. No prose. No markdown fences.

Output schema:
{
  "status": "improving" | "plateau" | "declining",
  "summary": string (2-3 sentences, clinical language for physician),
  "suggestions": [string, string, string],
  "flags": [
    { "level": "red" | "yellow" | "green", "message": string }
  ]
}
```

**User Prompt (hardcoded mock data for demo):**

```
Patient:
- Name: Pa Sri, Age: 68
- Diagnosis: Post-TKA Recovery — Total Knee Arthroplasty, Right Knee
- Post-op Week: 4
- Goal: Walk independently without a cane

Session Data (last 7 days):
[
  { "date": "May 6", "exercise": "Heel Slide", "reps_done": 10, "rom": 92, "pain": 3, "form_score": 88 },
  { "date": "May 5", "exercise": "Heel Slide", "reps_done": 8, "rom": 89, "pain": 4, "form_score": 75 },
  { "date": "May 4", "exercise": "Quad Set",   "reps_done": 10, "rom": null, "pain": 2, "form_score": 91 },
  { "date": "May 3", "exercise": "Heel Slide", "reps_done": 6, "rom": 85, "pain": 5, "form_score": 70 },
  { "date": "May 1", "exercise": "Heel Slide", "reps_done": 10, "rom": 88, "pain": 3, "form_score": 82 }
]

Current Metrics:
- ROM Flexion: 92° (target: 110°)
- Avg Pain Score: 3.5/10
- Adherence: 60% (3/5 sessions this week)

Generate a progress summary for the physician. Return only the JSON object.
```

**Display the response as:**

- Status badge at top: "🟢 Improving" / "🟡 Plateau" / "🔴 Declining"
- Summary paragraph
- Suggestions as a bulleted list
- Flags as colored inline badges

---

### Panel D — Alert Summary (derived from mock data)

Static mock alerts displayed below AI summary:

- 🟡 Adherence 60% — below 80% weekly target
- 🟡 Pain score 5/10 on May 3 — monitor trend
- 🟢 ROM improved +7° this week — on track

---

# UI / UX Specifications

| Element | Spec |
| --- | --- |
| Background | `#f9fafb` (light gray) |
| Card background | `#ffffff` with `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` |
| Primary color | Blue `#2563eb` |
| Success color | Green `#16a34a` |
| Warning color | Amber `#d97706` |
| Danger color | Red `#dc2626` |
| Font | Inter, system-ui fallback |
| Border radius | 8px cards, 6px buttons |
| Nav height | 56px |
| Max content width | 1024px centered |
| Loading states | Spinner + descriptive label (never blank) |
| Error states | Friendly message + retry button |
| Responsive | Desktop-first, readable on tablet |

---

# File Structure

```
src/
├── main.jsx
├── App.jsx                  # Router setup, nav bar
├── config/
│   └── openai.js            # API key from import.meta.env
├── data/
│   └── mockPatients.js      # Mock patient array
├── pages/
│   ├── OrderPage.jsx        # Workflow 1 root
│   └── DashboardPage.jsx    # Workflow 2 root
├── components/
│   ├── PatientCard.jsx      # Shared patient list card
│   ├── MetricCard.jsx       # ROM / Pain / Adherence card
│   ├── ProgramCard.jsx      # Generated exercise display
│   ├── AISummaryPanel.jsx   # GPT summary display
│   └── AlertBadge.jsx       # 🔴🟡🟢 badge
└── hooks/
    ├── useWhisper.js        # MediaRecorder + Whisper API
    └── useOpenAI.js         # Chat completion helper
```

---

> 📌 **Demo focus:** The two real API integrations to showcase are (1) Whisper live transcription in the Order flow, and (2) GPT-4o structured JSON output in both flows. Everything else can be mock.
>