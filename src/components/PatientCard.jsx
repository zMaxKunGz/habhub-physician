import { ChevronRight } from 'lucide-react'

const alertBorder = {
  red: 'border-l-4 border-l-danger',
  yellow: 'border-l-4 border-l-warning',
  green: 'border-l-4 border-l-success',
}

function PatientCard({ patient, onSelect }) {
  const borderClass = patient.alert_status ? alertBorder[patient.alert_status] : ''

  return (
    <button
      type="button"
      onClick={() => onSelect(patient)}
      className={`w-full rounded-card bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{patient.display_name}</p>
          <p className="mt-0.5 text-xs text-gray-500">{patient.full_name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary">
          Week {patient.post_op_week}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-700">{patient.condition}</p>
          <p className="mt-1 text-xs text-gray-400">Last session: {patient.last_session_date}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
      </div>
    </button>
  )
}

export default PatientCard
