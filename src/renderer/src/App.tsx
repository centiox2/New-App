import { HashRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './state/ThemeProvider'
import { AppLockGate } from './state/AppLockGate'
import { ShortcutHelpModal } from './components/ShortcutHelpModal'
import { Dashboard } from './pages/Dashboard'
import { ClientWorkspace } from './pages/ClientWorkspace'

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppLockGate>
        <ShortcutHelpModal />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients/:clientId" element={<ClientWorkspace />} />
            <Route path="/clients/:clientId/:stage" element={<ClientWorkspace />} />
          </Routes>
        </HashRouter>
      </AppLockGate>
    </ThemeProvider>
  )
}

export default App
