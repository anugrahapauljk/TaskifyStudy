import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BookOpen, Brain, Timer, BarChart3 } from "lucide-react";
import "./LoginPage.css";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await login();
      navigate("/");
    } catch (err) {
      setError("Failed to sign in. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orbs">
          <div className="login-orb"></div>
          <div className="login-orb"></div>
          <div className="login-orb"></div>
        </div>
      </div>

      <div className="login-card glass-strong">
        <div className="login-icon">
          <BookOpen size={36} />
        </div>
        <h1 className="login-title">StudyFlow</h1>
        <p className="login-subtitle">
          AI-powered study sessions with smart quizzes and real-time evaluation
        </p>

        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
          id="google-login-btn"
        >
          {loading ? (
            <div className="spinner" />
          ) : (
            <>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
              />
              Sign in with Google
            </>
          )}
        </button>

        {error && <div className="login-error">{error}</div>}

        <div className="login-features">
          <div className="login-feature">
            <Brain size={18} />
            <span>AI extracts topics from your study material</span>
          </div>
          <div className="login-feature">
            <Timer size={18} />
            <span>Timed study sessions keep you on track</span>
          </div>
          <div className="login-feature">
            <BarChart3 size={18} />
            <span>Smart quizzes measure real understanding</span>
          </div>
        </div>
      </div>
    </div>
  );
}
