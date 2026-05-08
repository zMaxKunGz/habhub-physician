import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { ActivitySquare, ClipboardList } from 'lucide-react'
import OrderPage from './pages/OrderPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface text-gray-900">
        <div className="mx-auto min-h-screen max-w-[480px] bg-surface">
          <header className="fixed left-1/2 top-0 z-30 flex h-[52px] w-full max-w-[480px] -translate-x-1/2 items-center border-b border-blue-100 bg-white px-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <ActivitySquare className="h-4 w-4 text-white" strokeWidth={2.2} />
              </div>
              <h1 className="text-base font-semibold text-gray-900">HomePhysio AI</h1>
            </div>
          </header>

          <main className="px-4 pb-28 pt-[68px]">
            <Routes>
              <Route path="/" element={<Navigate to="/order" replace />} />
              <Route path="/order" element={<OrderPage />} />
              <Route path="/order/:patientId" element={<OrderPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/:patientId" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/order" replace />} />
            </Routes>
          </main>

          <nav className="safe-bottom fixed bottom-0 left-1/2 z-30 grid h-[72px] w-full max-w-[480px] -translate-x-1/2 grid-cols-2 border-t border-blue-100 bg-white px-4 pt-2 shadow-[0_-1px_6px_rgba(29,78,216,0.07)]">
            <TabLink to="/order" label="Order" icon={ClipboardList} />
            <TabLink to="/dashboard" label="Dashboard" icon={ActivitySquare} />
          </nav>
        </div>
      </div>
    </BrowserRouter>
  )
}

function TabLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 rounded-button text-xs font-semibold transition ${
          isActive ? 'bg-blue-50 text-primary' : 'text-gray-400 hover:text-gray-600'
        }`
      }
    >
      <Icon className="h-5 w-5" strokeWidth={2.4} />
      <span>{label}</span>
    </NavLink>
  )
}

export default App
