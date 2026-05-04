import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/UploadPage";
import TopicSetup from "./pages/TopicSetup";
import TimerPage from "./pages/TimerPage";
import QuizPage from "./pages/QuizPage";
import TopicEvaluation from "./pages/TopicEvaluation";
import FinalEvaluation from "./pages/FinalEvaluation";
import SessionSummary from "./pages/SessionSummary";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--bg-primary)"
      }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<UploadPage />} />
        <Route path="/chat/:chatId" element={<SessionSummary />} />
        <Route path="/chat/:chatId/setup" element={<TopicSetup />} />
        <Route path="/chat/:chatId/timer/:topicIndex" element={<TimerPage />} />
        <Route path="/chat/:chatId/quiz/:topicIndex" element={<QuizPage />} />
        <Route path="/chat/:chatId/eval/:topicIndex" element={<TopicEvaluation />} />
        <Route path="/chat/:chatId/final" element={<FinalEvaluation />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
