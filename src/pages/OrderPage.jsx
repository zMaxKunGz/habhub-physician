import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Mic, RefreshCcw, Send } from 'lucide-react'
import PatientCard from '../components/PatientCard'
import ProgramCard from '../components/ProgramCard'
import { patients } from '../data/mockPatients'
import { generateProgram } from '../hooks/useOpenAI'
import { useWhisper } from '../hooks/useWhisper'

function OrderPage() {
  const navigate = useNavigate()
  const { patientId } = useParams()
  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.patient_id === patientId) || null,
    [patientId],
  )
  const [step, setStep] = useState(patientId ? 'record' : 'select')
  const [transcription, setTranscription] = useState('')
  const [program, setProgram] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [lang, setLang] = useState('en')
  const whisper = useWhisper()

  const langConfig = lang === 'th'
    ? { whisper: 'th', recognition: 'th-TH' }
    : { whisper: 'en', recognition: 'en-US' }

  const patient = selectedPatient || patients[0]

  function selectPatient(nextPatient) {
    setStep('record')
    navigate(`/order/${nextPatient.patient_id}`)
  }

  async function handleStartRecording() {
    setTranscription('')
    await whisper.startRecording(langConfig)
  }

  async function handleStopRecording() {
    const text = await whisper.stopRecording()
    if (text) setTranscription(text)
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setGenerationError('')
    setStep('generating')

    try {
      const result = await generateProgram(patient, transcription)
      setProgram(result)
      setStep('review')
    } catch (error) {
      setGenerationError(error.message || 'Unable to generate program.')
      setStep('record')
    } finally {
      setIsGenerating(false)
    }
  }

  function resetOrder() {
    setStep('select')
    setTranscription('')
    setProgram(null)
    setGenerationError('')
    navigate('/order')
  }

  if (step === 'select' || !selectedPatient) {
    return (
      <div className="fade-in space-y-4">
        <ScreenHeader eyebrow="Workout Order" title="Select patient" />
        {patients.map((patientItem) => (
          <PatientCard key={patientItem.patient_id} patient={patientItem} onSelect={selectPatient} />
        ))}
      </div>
    )
  }

  if (step === 'generating' || isGenerating) {
    return (
      <div className="fade-in flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="spinner" />
        <p className="mt-4 text-sm font-semibold text-gray-900">Generating exercise program with GPT-4o...</p>
        <p className="mt-2 text-sm text-gray-500">Clinical structure, precautions, and stop conditions are being prepared.</p>
      </div>
    )
  }

  if (step === 'review' && program) {
    return (
      <div className="fade-in space-y-4">
        <ScreenHeader eyebrow="Workout Order" title="Review program" />
        <section className="rounded-card bg-white p-4 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">{program.program_name}</h2>
          <p className="mt-1 text-sm text-gray-500">{program.phase}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <SummaryStat label="Duration" value={`${program.total_duration_minutes} min`} />
            <SummaryStat label="Frequency" value={`${program.frequency_per_week} / week`} />
          </div>
        </section>

        {program.exercises?.map((exercise) => (
          <ProgramCard key={exercise.exercise_name} exercise={exercise} />
        ))}

        <section className="rounded-card bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Notes to patient</p>
          <p className="mt-2 text-sm leading-6 text-gray-700">{program.notes_to_patient}</p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center justify-center gap-2 rounded-button border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-card transition hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Re-generate
          </button>
          <button
            type="button"
            onClick={() => setStep('success')}
            className="inline-flex items-center justify-center gap-2 rounded-button bg-success px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            Confirm & Send
          </button>
        </div>
      </div>
    )
  }

  if (step === 'success' && program) {
    return (
      <div className="fade-in flex min-h-[62vh] flex-col items-center justify-center text-center">
        <CheckCircle2 className="success-pop h-20 w-20 text-success" />
        <h2 className="mt-5 text-xl font-semibold text-gray-900">Program confirmed for {patient.display_name}</h2>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          {program.program_name} • {program.total_duration_minutes} minutes
        </p>
        <div className="mt-8 grid w-full grid-cols-2 gap-3">
          <button
            type="button"
            onClick={resetOrder}
            className="rounded-button border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-card transition hover:bg-gray-50"
          >
            Back to Patient List
          </button>
          <button
            type="button"
            onClick={() => navigate(`/dashboard/${patient.patient_id}`)}
            className="rounded-button bg-primary px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-hover"
          >
            View Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in space-y-4">
      <ScreenHeader eyebrow="Workout Order" title="Voice order input" />
      <PatientSummary patient={patient} />

      <section className="rounded-card bg-white p-4 shadow-card">
        <div className="flex flex-col items-center py-4">
          <button
            type="button"
            onClick={whisper.isRecording ? handleStopRecording : handleStartRecording}
            className={`flex h-28 w-28 flex-col items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg transition ${
              whisper.isRecording
                ? 'recording-pulse scale-105 bg-danger'
                : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            <Mic className="mb-2 h-8 w-8" />
            {whisper.isRecording ? 'Tap to Stop' : 'Tap to Record'}
          </button>
          <p className="mt-3 text-center text-sm text-gray-500">Tap to start or stop recording</p>

          <div className="mt-4 flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              disabled={whisper.isRecording}
              onClick={() => setLang('en')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                lang === 'en' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              disabled={whisper.isRecording}
              onClick={() => setLang('th')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                lang === 'th' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              TH
            </button>
          </div>
          {whisper.isRecording && whisper.liveTranscript ? (
            <p className="mt-2 text-xs text-danger font-medium">Live — words appear as you speak</p>
          ) : null}
          {whisper.isTranscribing ? (
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <div className="spinner" />
              Finalizing...
            </div>
          ) : null}
        </div>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="transcription">
          Transcription
        </label>
        <textarea
          id="transcription"
          value={whisper.isRecording ? whisper.liveTranscript : transcription}
          onChange={(event) => { if (!whisper.isRecording) setTranscription(event.target.value) }}
          readOnly={whisper.isRecording}
          placeholder="Transcription will appear here in real time as you speak."
          className={`mt-2 min-h-36 w-full resize-none rounded-card border p-3 text-sm leading-6 text-gray-900 outline-none transition ${
            whisper.isRecording
              ? 'border-danger bg-red-50 text-gray-700'
              : 'border-gray-200 bg-gray-50 focus:border-primary focus:bg-white focus:ring-2 focus:ring-blue-100'
          }`}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          <span>{(whisper.isRecording ? whisper.liveTranscript : transcription).length} characters</span>
          <span>Editable before generation</span>
        </div>

        {whisper.error ? (
          <div className="mt-4 rounded-card border border-red-100 bg-red-50 p-3">
            <p className="text-sm leading-6 text-danger">{whisper.error}</p>
            <button
              type="button"
              onClick={() => whisper.setError('')}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : null}

        {generationError ? (
          <div className="mt-4 rounded-card border border-red-100 bg-red-50 p-3">
            <p className="text-sm leading-6 text-danger">{generationError}</p>
            <button
              type="button"
              onClick={() => { setGenerationError(''); handleGenerate() }}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : null}
      </section>

      <button
        type="button"
        disabled={!transcription.trim() || whisper.isRecording || whisper.isTranscribing}
        onClick={handleGenerate}
        className="w-full rounded-button bg-primary px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Generate Program
      </button>
    </div>
  )
}

function ScreenHeader({ eyebrow, title }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-semibold text-gray-900">{title}</h2>
    </div>
  )
}

function PatientSummary({ patient }) {
  return (
    <section className="rounded-card bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{patient.display_name}</h2>
          <p className="mt-1 text-sm text-gray-500">{patient.condition}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary">Week {patient.post_op_week}</span>
      </div>
      <p className="mt-4 text-sm italic leading-6 text-gray-500">"{patient.goal}"</p>
    </section>
  )
}

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-card bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default OrderPage
