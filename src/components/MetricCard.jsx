const leftBorder = {
  warning: 'border-l-warning',
  success: 'border-l-success',
  default: 'border-l-primary',
}

function MetricCard({ type, title, children }) {
  const border = leftBorder[type] ?? leftBorder.default

  return (
    <section className={`rounded-card border-l-4 bg-white px-4 py-4 shadow-card ${border}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default MetricCard
