import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { RoleProvider } from './core/auth/roleContext'
import AssetsPage from './pages/AssetsPage'
import DashboardPage from './pages/DashboardPage'
import EventRegistrationsPage from './pages/EventRegistrationsPage'
import EventsArchivedPage from './pages/EventsArchivedPage'
import EventsPage from './pages/EventsPage'
import EventsServicesManagementPage from './pages/EventsServicesManagementPage'
// FuncionarioDetalhePage removed — CRUD is now in FuncionariosPage
import FuncionariosPage from './pages/FuncionariosPage'
import FamiliesPage from './pages/FamiliesPage'
import FinancePage from './pages/FinancePage'
import BibliotecaPage from './pages/BibliotecaPage'
import KitchenAccessPage from './pages/KitchenAccessPage'
import KitchenDashboardPage from './pages/KitchenDashboardPage'
import KitchenReportPage from './pages/KitchenReportPage'
import PedagogicoPlanejamentoPage from './pages/PedagogicoPlanejamentoPage'
import PedagogicoPresencaPage from './pages/PedagogicoPresencaPage'
import PedagogicoRelatoriosPage from './pages/PedagogicoRelatoriosPage'
import PedagogicoArquivadosPage from './pages/PedagogicoArquivadosPage'
import PortariaLivePage from './pages/PortariaLivePage'
import ServicosPage from './pages/ServicosPage'
import StudentsPage from './pages/StudentsPage'
// UsuariosPage removed — merged into FuncionariosPage
import { useRole } from './core/auth/roleContext'
import LoginPage from './pages/LoginPage'
import { EntityInfoProvider } from './components/EntityInfoDock'
import AdminPage from './pages/AdminPage'
import BugReporter from './components/BugReporter'
import AppUpdateWatcher from './components/AppUpdateWatcher'
import { FeatureFlagsProvider } from './core/config/featureFlagsContext'
import StudentCheckoutPage from './pages/StudentCheckoutPage'
import SearchPage from './pages/SearchPage'
import HubPage from './pages/HubPage'
import NoAccessPage from './pages/NoAccessPage'
import ErrorBoundary from './components/ErrorBoundary'
import { ModuleProvider, useModule } from './core/config/moduleContext'
import { getAvailableModules } from './core/auth/permissions'

function HomeRedirect() {
  const { role, modules, isAuthenticated, isDemoMode, mode, loadingAuth } = useRole()
  const mod = useModule()

  if (isDemoMode) return <Navigate to="/checkout-demo" replace />
  if (mode === 'real' && loadingAuth) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />

  // staff_users.modules is the source of truth for what a user can open.
  const available = getAvailableModules(modules, role)
  const keys = new Set(available.map((m) => m.key))

  // Honour a dedicated single-module deployment (out.* / ache.*) when the user
  // actually has that module — otherwise fall through to the unified hub.
  if (mod.id === 'checkout' && keys.has('checkout')) return <Navigate to="/checkout" replace />
  if (mod.id === 'search' && keys.has('search')) return <Navigate to="/search" replace />

  if (available.length === 0) return <Navigate to="/sem-acesso" replace />
  if (available.length === 1) return <Navigate to={available[0].path} replace />
  return <Navigate to="/hub" replace />
}

function App() {
  return (
    <ModuleProvider>
    <RoleProvider>
      <FeatureFlagsProvider>
      <EntityInfoProvider>
        <BugReporter />
        <AppUpdateWatcher />
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/demo" element={<Navigate to="/checkout-demo" replace />} />
          <Route path="/student-checkout" element={<Navigate to="/checkout-demo" replace />} />
          <Route
            path="/checkout-demo"
            element={
              <ProtectedRoute
                allowedRoles={['super_admin', 'admin', 'secretaria', 'professor', 'reception', 'infantil_coordination', 'fundamental_coordination', 'support']}
                redirectTo="/home"
              >
                <StudentCheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="/home" element={<HomeRedirect />} />
          {/* Unified internal hub — picks search/checkout/admin from modules. */}
          <Route path="/hub" element={<HubPage />} />
          <Route path="/app" element={<Navigate to="/hub" replace />} />
          <Route path="/sem-acesso" element={<NoAccessPage />} />
          <Route
            path="/search"
            element={
              <ProtectedRoute
                requireModule="search"
                allowedRoles={['super_admin', 'admin', 'secretaria', 'support']}
              >
                <SearchPage />
              </ProtectedRoute>
            }
          />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']} redirectTo="/home">
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria']} redirectTo="/home">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        {/* /usuarios removed — merged into /funcionarios */}
        <Route
          path="/families"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria']} redirectTo="/home">
              <FamiliesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria']} redirectTo="/home">
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/funcionarios"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria']} redirectTo="/home">
              <FuncionariosPage />
            </ProtectedRoute>
          }
        />
        {/* FuncionarioDetalhePage routes removed — CRUD is now in FuncionariosPage modal */}
        <Route
          path="/eventos"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria']} redirectTo="/home">
              <EventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eventos/gestao-servicos"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria']} redirectTo="/home">
              <EventsServicesManagementPage />
            </ProtectedRoute>
          }
        />
        <Route path="/eventos/servicos" element={<Navigate to="/eventos/gestao-servicos" replace />} />
        <Route
          path="/eventos/arquivados"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria']} redirectTo="/home">
              <EventsArchivedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eventos/pedidos"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria']} redirectTo="/home">
              <EventRegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cozinha"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'cozinha']} redirectTo="/home">
              <KitchenDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cozinha/relatorios"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'cozinha']} redirectTo="/home">
              <KitchenReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cozinha/visao"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'cozinha']} redirectTo="/home">
              <KitchenAccessPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pedagogico"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria', 'professor']} redirectTo="/home">
              <PedagogicoPresencaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedagogico/relatorios"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria', 'professor']} redirectTo="/home">
              <PedagogicoRelatoriosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedagogico/planejamento"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria', 'professor']} redirectTo="/home">
              <PedagogicoPlanejamentoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedagogico/arquivados"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria', 'professor']} redirectTo="/home">
              <PedagogicoArquivadosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/servicos"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']} redirectTo="/home">
              <ServicosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'financeiro']} redirectTo="/home">
              <FinancePage />
            </ProtectedRoute>
          }
        />
        <Route path="/portaria-live" element={<Navigate to="/live" replace />} />
        <Route
          path="/live"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'secretaria', 'professor']} redirectTo="/home">
              <PortariaLivePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute
              requireModule="checkout"
              allowedRoles={['super_admin', 'admin', 'secretaria', 'professor', 'reception', 'infantil_coordination', 'fundamental_coordination', 'support']}
            >
              <StudentCheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patrimonio"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'financeiro']} redirectTo="/home">
              <AssetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patrimonio/biblioteca"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'financeiro', 'secretaria', 'professor']} redirectTo="/home">
              <BibliotecaPage />
            </ProtectedRoute>
          }
        />
          <Route path="/assets" element={<Navigate to="/patrimonio" replace />} />
          <Route path="/biblioteca" element={<Navigate to="/patrimonio/biblioteca" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        </ErrorBoundary>
      </EntityInfoProvider>
      </FeatureFlagsProvider>
    </RoleProvider>
    </ModuleProvider>
  )
}

export default App
