const styles = {
  red: 'bg-red-50 text-danger border-red-100',
  yellow: 'bg-amber-50 text-warning border-amber-100',
  green: 'bg-green-50 text-success border-green-100',
}

const dots = {
  red: '🔴',
  yellow: '🟡',
  green: '🟢',
}

function AlertBadge({ level = 'green', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[level]}`}>
      <span aria-hidden="true">{dots[level]}</span>
      {children}
    </span>
  )
}

export default AlertBadge
