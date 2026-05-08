import { Bot } from 'lucide-react'
import AlertBadge from './AlertBadge'

const statusLabel = {
  improving: 'Improving',
  plateau: 'Plateau',
  declining: 'Declining',
}

const statusLevel = {
  improving: 'green',
  plateau: 'yellow',
  declining: 'red',
}

function AISummaryPanel({ summary, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <section className="rounded-card bg-white p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-gray-300" />
          <div className="skeleton h-3.5 w-20 rounded" />
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-5/6 rounded" />
          <div className="skeleton h-3 w-4/6 rounded" />
        </div>
        <div className="mt-5 space-y-2">
          <div className="skeleton h-3 w-3/4 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="skeleton h-6 w-28 rounded-full" />
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-card bg-white p-4 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">AI Summary</p>
        <p className="mt-2 text-sm leading-6 text-danger">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-button bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          Retry
        </button>
      </section>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <section className="rounded-card bg-white p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold text-gray-900">AI Summary</h2>
        </div>
        <AlertBadge level={statusLevel[summary.status]}>{statusLabel[summary.status]}</AlertBadge>
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-700">{summary.summary}</p>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-gray-700">
        {summary.suggestions?.map((suggestion) => (
          <li key={suggestion} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{suggestion}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {summary.flags?.map((flag) => (
          <AlertBadge key={flag.message} level={flag.level}>
            {flag.message}
          </AlertBadge>
        ))}
      </div>
    </section>
  )
}

export default AISummaryPanel
