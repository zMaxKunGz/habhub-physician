import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PatientCard from '../components/PatientCard'
import MetricCard from '../components/MetricCard'
import AISummaryPanel from '../components/AISummaryPanel'
import AlertBadge from '../components/AlertBadge'
import { dashboardMetrics, patients } from '../data/mockPatients'
import { generateDashboardSummary } from '../hooks/useOpenAI'

const alertLabel = {
  red: 'Needs attention',
  yellow: 'Monitor',
  green: 'On track',
}

function DashboardPage() {
  const navigate = useNavigate()
  const { patientId } = useParams()
  const patient = useMemo(
    () => patients.find((patientItem) => patientItem.patient_id === patientId) || null,
    [patientId],
  )
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadSummary() {
    setIsLoading(true)
    setError('')

    try {
      const result = await generateDashboardSummary()
      setSummary(result)
    } catch (summaryError) {
      setError(summaryError.message || 'Unable to generate AI summary.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (patient) {
      loadSummary()
    }
  }, [patient])

  if (!patient) {
    return (
      <div className="fade-in space-y-4">
        <ScreenHeader eyebrow="Patient Monitoring" title="Select patient" />
        {patients.map((patientItem) => (
          <PatientCard
            key={patientItem.patient_id}
            patient={patientItem}
            onSelect={(nextPatient) => navigate(`/dashboard/${nextPatient.patient_id}`)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="fade-in space-y-4">
      <PatientHeader patient={patient} onBack={() => navigate('/dashboard')} />
      <RomCard />
      <PainCard />
      <AdherenceCard />
      <AISummaryPanel summary={summary} isLoading={isLoading} error={error} onRetry={loadSummary} />
      <AlertSummary />
    </div>
  )
}

function PatientHeader({ patient, onBack }) {
  return (
    <section className="rounded-card bg-white p-4 shadow-card">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-xs font-semibold text-primary transition hover:opacity-70"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        All patients
      </button>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Patient Dashboard</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">{patient.display_name}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {patient.age} yrs • {patient.condition}
          </p>
        </div>
        <AlertBadge level={patient.alert_status}>{alertLabel[patient.alert_status] ?? 'Monitor'}</AlertBadge>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-primary">
          Week {patient.post_op_week} of 12
        </span>
      </div>
      <p className="mt-3 text-sm italic leading-6 text-gray-500">"{patient.goal}"</p>
    </section>
  )
}

function RomCard() {
  const metric = dashboardMetrics.rom
  const percent = Math.round((metric.achieved / metric.target) * 100)

  return (
    <MetricCard title={metric.label}>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-semibold text-gray-900">{metric.achieved}°</p>
        <p className="text-sm text-gray-400">Target {metric.target}°</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-2 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-semibold text-primary">{metric.change}</p>
    </MetricCard>
  )
}

function PainCard() {
  const metric = dashboardMetrics.pain
  const max = Math.max(...metric.sessions)

  return (
    <MetricCard title={metric.label} type="success">
      <div className="flex items-end justify-between">
        <p className="text-3xl font-semibold text-gray-900">{metric.average} / 10</p>
        <p className="text-sm font-semibold text-success">↓ {metric.trend}</p>
      </div>
      <div className="mt-4 flex items-end gap-1.5">
        {metric.sessions.map((score, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-green-200"
              style={{ height: `${Math.max(10, (score / max) * 44)}px` }}
            />
            <span className="text-[10px] leading-none text-gray-400">
              {metric.session_dates[index]?.replace('May ', '')}
            </span>
          </div>
        ))}
      </div>
    </MetricCard>
  )
}

function AdherenceCard() {
  const metric = dashboardMetrics.adherence

  return (
    <MetricCard title={metric.label} type="warning">
      <div className="flex items-end justify-between">
        <p className="text-3xl font-semibold text-gray-900">{metric.percentage}%</p>
        <p className="text-sm font-semibold text-warning">Below target</p>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {metric.completed} of {metric.target} sessions completed this week
      </p>
    </MetricCard>
  )
}

function AlertSummary() {
  return (
    <section className="rounded-card bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Alert Summary</p>
      <div className="mt-3 flex flex-col gap-2">
        <AlertBadge level="yellow">Adherence 60% — below 80% weekly target</AlertBadge>
        <AlertBadge level="yellow">Pain score 5/10 on May 3 — monitor trend</AlertBadge>
        <AlertBadge level="green">ROM improved +7° this week — on track</AlertBadge>
      </div>
    </section>
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

export default DashboardPage
