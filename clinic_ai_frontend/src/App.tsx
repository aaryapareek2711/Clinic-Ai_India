import { Navigate, Route, Routes } from 'react-router-dom'
import ProviderLayout from './layout/ProviderLayout'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ForgotPasswordOtpPage from './pages/ForgotPasswordOtpPage'
import SignupPage from './pages/SignupPage'
import SignupOtpPage from './pages/SignupOtpPage'
import ClinicSetupPage from './pages/ClinicSetupPage'
import AbdmSetupPage from './pages/AbdmSetupPage'
import WhatsAppSetupPage from './pages/WhatsAppSetupPage'
import ProviderDashboardPage from './pages/ProviderDashboardPage'
import CalendarPage from './pages/CalendarPage'
import VisitsPage from './pages/VisitsPage'
import VisitDetailPage from './pages/VisitDetailPage'
import TemplatesPage from './pages/TemplatesPage'
import SettingsPage from './pages/SettingsPage'
import SettingsEditProfilePage from './pages/SettingsEditProfilePage'
import SettingsOrganizationPage from './pages/SettingsOrganizationPage'
import SettingsTeamMembersPage from './pages/SettingsTeamMembersPage'
import NewAppointmentPage from './pages/NewAppointmentPage'
import NewVisitPage from './pages/NewVisitPage'
import PatientsPage from './pages/PatientsPage'
import PatientDetailPage from './pages/PatientDetailPage'
import CarePrepPage from './pages/CarePrepPage'
import CarePrepIntakeDetailPage from './pages/CarePrepIntakeDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/signup-otp" element={<SignupOtpPage />} />
      <Route path="/clinic-setup" element={<ClinicSetupPage />} />
      <Route path="/abdm-setup" element={<AbdmSetupPage />} />
      <Route path="/whatsapp-setup" element={<WhatsAppSetupPage />} />
      <Route element={<ProviderLayout />}>
        <Route path="/dashboard" element={<ProviderDashboardPage />} />
        <Route path="/careprep" element={<CarePrepPage />} />
        <Route path="/careprep/intake/:tokenKey" element={<CarePrepIntakeDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/new-appointment" element={<NewAppointmentPage />} />
        <Route path="/new-visit" element={<NewVisitPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/detail" element={<PatientDetailPage />} />
        <Route path="/visits" element={<VisitsPage />} />
        <Route path="/visits/detail" element={<VisitDetailPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/edit-profile" element={<SettingsEditProfilePage />} />
        <Route path="/settings/organization" element={<SettingsOrganizationPage />} />
        <Route path="/settings/team-members" element={<SettingsTeamMembersPage />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/forgot-password-otp" element={<ForgotPasswordOtpPage />} />
    </Routes>
  )
}

export default App
