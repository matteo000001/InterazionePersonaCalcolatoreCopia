import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './auth/login.page';
import { LogoutPage } from './auth/logout.page';
import { ProtectedRoute } from './auth/protectedRoute';
import { SecretaryDashboard } from './components/secretary-dashboard';
import { TeacherDashboard } from './components/teacher-dashboard';

export function App() {
  return (
    <Routes>
      <Route
        path="/teacher"
        element={
          <ProtectedRoute>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/secretary/*"
        element={
          <ProtectedRoute>
            <SecretaryDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="*" element={<Navigate to="/teacher" replace />} />
    </Routes>
  );
}

export default App;
