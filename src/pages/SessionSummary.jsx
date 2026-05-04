import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getChat } from "../services/firestoreService";
import {
  Clock,
  Target,
  Brain,
  Award,
  TrendingUp,
  Lightbulb,
  CheckCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import "./SessionSummary.css";

export default function SessionSummary() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChat();
  }, [chatId]);

  const loadChat = async () => {
    try {
      const data = await getChat(user.uid, chatId);
      if (!data) {
        navigate("/");
        return;
      }
      setChat(data);

      // If session is still in progress, redirect to the appropriate page
      if (data.status !== "completed") {
        if (!data.topics || data.topics.length === 0) {
          navigate("/");
        } else if (data.status === "in_progress" && data.currentTopicIndex !== undefined) {
          navigate(`/chat/${chatId}/setup`);
        } else {
          navigate(`/chat/${chatId}/setup`);
        }
        return;
      }
    } catch (err) {
      console.error(err);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !chat) {
    return (
      <div className="session-summary">
        <div className="session-summary-container">
          <div className="eval-loading glass">
            <div className="spinner spinner-lg" />
            <p>Loading session...</p>
          </div>
        </div>
      </div>
    );
  }

  const results = chat?.results || [];
  const totalScore = results.reduce((s, r) => s + (r.quizScore || 0), 0);
  const totalQs = results.reduce((s, r) => s + (r.totalQuestions || 0), 0);
  const totalStudyTime = results.reduce((s, r) => s + (r.timeTaken || 0), 0);
  const completionRate = results.filter(
    (r) => r.timeTaken <= r.timeAllotted
  ).length;
  const avgPercentage =
    totalQs > 0 ? Math.round((totalScore / totalQs) * 100) : 0;

  const emoji = avgPercentage >= 70 ? "🏆" : avgPercentage >= 40 ? "📈" : "📚";

  const fileNames = chat.fileNames || (chat.fileName ? [chat.fileName] : []);
  const createdDate = chat.createdAt?.toDate
    ? chat.createdAt.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="session-summary">
      <div className="session-summary-container">
        {/* Header */}
        <div className="session-hero glass-strong">
          <div className="session-emoji">{emoji}</div>
          <h1>{chat.title || "Study Session"}</h1>
          <p className="session-meta">
            {createdDate && <span>{createdDate}</span>}
            {fileNames.length > 0 && (
              <span>
                · {fileNames.length} file{fileNames.length > 1 ? "s" : ""}
              </span>
            )}
            <span>· {results.length} topics</span>
          </p>
        </div>

        {/* Stats */}
        {results.length > 0 && (
          <>
            <div className="session-stats-grid">
              <div className="session-stat glass">
                <div className="session-stat-icon purple">
                  <Target size={18} />
                </div>
                <div className="session-stat-value">{avgPercentage}%</div>
                <div className="session-stat-label">Avg Score</div>
              </div>
              <div className="session-stat glass">
                <div className="session-stat-icon green">
                  <CheckCircle size={18} />
                </div>
                <div className="session-stat-value">
                  {completionRate}/{results.length}
                </div>
                <div className="session-stat-label">On-time</div>
              </div>
              <div className="session-stat glass">
                <div className="session-stat-icon blue">
                  <Clock size={18} />
                </div>
                <div className="session-stat-value">
                  {Math.round(totalStudyTime / 60)}m
                </div>
                <div className="session-stat-label">Study Time</div>
              </div>
              <div className="session-stat glass">
                <div className="session-stat-icon amber">
                  <Brain size={18} />
                </div>
                <div className="session-stat-value">
                  {totalScore}/{totalQs}
                </div>
                <div className="session-stat-label">Total Score</div>
              </div>
            </div>

            {/* Topic Results */}
            <div className="session-topics glass">
              <h2>📋 Topic Results</h2>
              <table className="session-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>Level</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td>{r.topicTitle}</td>
                      <td>
                        {r.quizScore}/{r.totalQuestions}
                      </td>
                      <td>{Math.floor(r.timeTaken / 60)}m</td>
                      <td>
                        <span
                          className={`badge badge-${r.understanding?.replace(
                            "_",
                            "-"
                          )}`}
                        >
                          {r.understanding?.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Evaluation */}
            {chat.finalEvaluation && (
              <div className="session-feedback glass">
                <h2>
                  <TrendingUp size={18} /> AI Analysis
                </h2>
                <p className="session-feedback-text">
                  {chat.finalEvaluation.overallFeedback}
                </p>
                {chat.finalEvaluation.studyRecommendations?.length > 0 && (
                  <>
                    <h3>
                      <Lightbulb size={16} /> Recommendations
                    </h3>
                    <ul className="session-recommendations">
                      {chat.finalEvaluation.studyRecommendations.map(
                        (r, i) => (
                          <li key={i}>
                            <Lightbulb size={14} />
                            {r}
                          </li>
                        )
                      )}
                    </ul>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {results.length === 0 && (
          <div className="session-empty glass">
            <p>This session has no results yet.</p>
          </div>
        )}

        {/* Actions */}
        <div className="session-actions">
          <button
            className="btn-secondary"
            onClick={() => navigate(`/chat/${chatId}/final`)}
            id="view-full-eval-btn"
          >
            <Award size={18} />
            Full Evaluation
          </button>
          <button
            className="btn-primary"
            onClick={() => navigate("/")}
            id="new-session-btn"
          >
            <Play size={18} />
            New Session
          </button>
        </div>
      </div>
    </div>
  );
}
