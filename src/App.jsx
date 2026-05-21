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
import { FeatureFlagsProvider } from './core/config/featureFlagsContext'
import StudentCheckoutPage from './pages/StudentCheckoutPage'

function HomeRedirect() {
  const { role, isAuthenticated, isDemoMode } = useRole()

  const homeByRole = {
    super_admin: '/admin',
    admin: '/dashboard',
    secretaria: '/dashboard',
    reception: '/checkout',
    infantil_coordination: '/checkout',
    fundamental_coordination: '/checkout',
    support: '/checkout',
    cozinha: '/cozinha',
    financeiro: '/finance',
    professor: '/pedagogico',
  }

  if (isDemoMode) return <Navigate to="/checkout-demo" replace />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Navigate to={homeByRole[role] ?? '/families'} replace />
}

function App() {
  return (
    <RoleProvider>
      <FeatureFlagsProvider>
      <EntityInfoProvider>
        <BugReporter />
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
              allowedRoles={['super_admin', 'admin', 'secretaria', 'professor', 'reception', 'infantil_coordination', 'fundamental_coordination', 'support']}
              redirectTo="/home"
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
      </EntityInfoProvider>
      </FeatureFlagsProvider>
    </RoleProvider>
  )
}

export default App
