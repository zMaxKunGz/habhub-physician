import { AlertTriangle, Clock3, Repeat2, Target } from 'lucide-react'

function ProgramCard({ exercise }) {
  const instruction = shortenText(exercise.instructions, 130)
  const stopConditions = shortenText(exercise.stop_conditions, 95)
  const precautions = shortenText(exercise.precautions, 95)

  return (
    <article className="overflow-hidden rounded-card border border-blue-100 bg-white shadow-card">
      <div className="bg-blue-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-blue-950">{exercise.exercise_name}</h3>
          <span className={difficultyClass(exercise.difficulty)}>{exercise.difficulty}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <Info icon={Repeat2} label="Dose" value={`${exercise.sets} × ${exercise.reps}`} tone="blue" />
          <Info icon={Clock3} label="Rest" value={`${exercise.rest_between_sets_seconds}s`} tone="slate" />
          {exercise.hold_seconds ? <Info icon={Clock3} label="Hold" value={`${exercise.hold_seconds}s`} tone="green" /> : null}
          {exercise.target_flexion_degree ? <Info icon={Target} label="Target" value={`${exercise.target_flexion_degree}°`} tone="indigo" /> : null}
        </div>

        <div className="mt-4 rounded-card border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-emerald-700">How to do it</p>
          <p className="mt-1 text-sm leading-6 text-emerald-950">{instruction}</p>
        </div>

        <WarningBox label="Stop if" text={stopConditions} tone="red" />
        <WarningBox label="Be careful" text={precautions} tone="amber" />
      </div>
    </article>
  )
}

function Info({ icon: Icon, label, value, tone }) {
  const styles = {
    blue: 'border-blue-100 bg-blue-50 text-blue-950',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-950',
    slate: 'border-slate-200 bg-slate-50 text-slate-950',
  }

  return (
    <div className={`rounded-card border p-3 ${styles[tone]}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold opacity-75">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function WarningBox({ label, text, tone }) {
  const styles = {
    red: 'border-red-100 bg-red-50 text-danger',
    amber: 'border-amber-100 bg-amber-50 text-warning',
  }

  return (
    <div className={`mt-3 rounded-card border p-3 ${styles[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold">
        <AlertTriangle className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-1 text-sm leading-6 text-gray-800">{text}</p>
    </div>
  )
}

function difficultyClass(difficulty = '') {
  const normalized = difficulty.toLowerCase()

  if (normalized === 'hard') return 'rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold capitalize text-danger'
  if (normalized === 'moderate') return 'rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold capitalize text-warning'
  return 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold capitalize text-success'
}

function shortenText(text = '', maxLength) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

export default ProgramCard
