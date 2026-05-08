import { OPENAI_API_KEY, OPENAI_MODEL } from '../config/openai'

const CHAT_URL = 'https://api.openai.com/v1/chat/completions'

async function callChatCompletion(messages) {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing VITE_OPENAI_API_KEY. Add it to .env and restart the dev server.')
  }

  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || 'OpenAI request failed.')
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('OpenAI returned an empty response.')
  }

  try {
    return JSON.parse(content)
  } catch {
    throw new Error('OpenAI returned invalid JSON. Please try again.')
  }
}

const programSystemPrompt = `You are a clinical AI assistant specialized in post-operative physical therapy.
You help physicians design precise, safe home exercise programs for orthopedic surgery patients.

Rules:
- Generate ONLY the exercises explicitly mentioned in the physician's order. Do not add extra exercises.
- If the physician orders one exercise, the output must contain exactly one exercise in the array.
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
}`

const noteExtractionSystemPrompt = `You are a clinical AI assistant. Extract structured diagnosis note fields from a physician's transcribed voice order.
Output ONLY a valid JSON object. No prose. No markdown fences.

Output schema:
{
  "diagnosis": string (chief complaint or diagnosis, 1-2 sentences),
  "key_findings": string (ROM, pain score, or notable clinical observations, 1-2 sentences),
  "plan": string (physician orders and next steps, 1-2 sentences)
}

If a field cannot be determined from the transcript, use an empty string "".`

const dashboardSystemPrompt = `You are a clinical AI assistant helping physicians monitor post-operative physical therapy patients.
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
}`

export async function extractDiagnosisNote(transcribedText) {
  const userPrompt = `Transcribed physician voice order:
"${transcribedText}"

Extract the diagnosis note fields from the above transcript. Return only the JSON object.`

  return callChatCompletion([
    { role: 'system', content: noteExtractionSystemPrompt },
    { role: 'user', content: userPrompt },
  ])
}

export async function generateProgram(patient, transcribedOrder, note = null) {
  const consent = patient.consent_status
  const noteSection = note
    ? `\nDiagnosis Note:
- Diagnosis / Chief Complaint: ${note.diagnosis}
- Key Findings: ${note.key_findings}
- Plan / Orders: ${note.plan}`
    : ''

  const userPrompt = `Patient:
- Name: ${patient.display_name}, Age: ${patient.age}
- Diagnosis: ${patient.condition} — ${patient.surgery_type}, ${patient.affected_side}
- Post-op Week: ${patient.post_op_week}
- Recovery Goal: ${patient.goal}
- Consent: camera_tracking=${consent.camera_tracking}, voice_command=${consent.voice_command}
${noteSection}
Physician Order (transcribed by voice):
"${transcribedOrder}"

Generate a home exercise program containing ONLY the exercise(s) the physician explicitly ordered above. Do not add supplementary or complementary exercises.
Return only the JSON object — no explanation, no markdown.`

  return callChatCompletion([
    { role: 'system', content: programSystemPrompt },
    { role: 'user', content: userPrompt },
  ])
}

export async function updateProgram(patient, currentProgram, updateRequest) {
  const userPrompt = `Patient:
- Name: ${patient.display_name}, Age: ${patient.age}
- Diagnosis: ${patient.condition} — ${patient.surgery_type}, ${patient.affected_side}
- Post-op Week: ${patient.post_op_week}
- Recovery Goal: ${patient.goal}

Current program JSON:
${JSON.stringify(currentProgram, null, 2)}

Physician voice update request:
"${updateRequest}"

Update the current program according to the physician's request.
Keep the program safe for the patient's post-op week.
Preserve useful existing exercises unless the physician clearly asks to change or remove them.
Return only the full updated JSON object matching the schema — no explanation, no markdown.`

  return callChatCompletion([
    { role: 'system', content: programSystemPrompt },
    { role: 'user', content: userPrompt },
  ])
}

export async function generateDashboardSummary() {
  const userPrompt = `Patient:
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

Generate a progress summary for the physician. Return only the JSON object.`

  return callChatCompletion([
    { role: 'system', content: dashboardSystemPrompt },
    { role: 'user', content: userPrompt },
  ])
}
