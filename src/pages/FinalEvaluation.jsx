import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getChat, updateChat } from "../services/firestoreService";
import { generateFinalEvaluation } from "../services/groqService";
import {
  Home, Clock, Target, Brain, Award, TrendingUp, Lightbulb, CheckCircle
} from "lucide-react";
import "./FinalEvaluation.css";

export default function FinalEvaluation() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAndEvaluate();
  }, [chatId]);

  const loadAndEvaluate = async () => {
    try {
      const data = await getChat(user.uid, chatId);
      if (!data) {
        navigate("/");
        return;
      }
      setChat(data);

      // If we already have a saved evaluation, use it
      if (data.finalEvaluation) {
        setEvaluation(data.finalEvaluation);
      } else {
        const evalResult = await generateFinalEvaluation(data.results || []);
        setEvaluation(evalResult);

        // Save evaluation and mark session as completed
        try {
          await updateChat(user.uid, chatId, {
            finalEvaluation: evalResult,
            status: "completed",
          });
        } catch (saveErr) {
          console.error("Failed to save evaluation:", saveErr);
        }
      }
    } catch (err) {
      console.error(err);
      setEvaluation({
        overallUnderstanding: "can_improve",
        overallFeedback: "Session completed. Review individual topic results.",
        studyRecommendations: [],
        topicInsights: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="final-eval">
        <div className="final-eval-container">
          <div className="eval-loading glass">
            <div className="spinner spinner-lg" />
            <p>Generating your final evaluation...</p>
          </div>
        </div>
      </div>
    );
  }

  const results = chat?.results || [];
  const totalScore = results.reduce((s, r) => s + (r.quizScore || 0), 0);
  const totalQs = results.reduce((s, r) => s + (r.totalQuestions || 0), 0);
  const totalStudyTime = results.reduce((s, r) => s + (r.timeTaken || 0), 0);
  const totalAllotted = results.reduce((s, r) => s + (r.timeAllotted || 0), 0);
  const completionRate = results.filter((r) => r.timeTaken <= r.timeAllotted).length;
  const avgPercentage = totalQs > 0 ? Math.round((totalScore / totalQs) * 100) : 0;

  const emoji =
    evaluation?.overallUnderstanding === "strong" ? "🏆" :
    evaluation?.overallUnderstanding === "can_improve" ? "📈" : "📚";

  const understandingLabel = {
    strong: "Strong Understanding",
    can_improve: "Can Improve",
    weak: "Needs More Study",
  };

  return (
    <div className="final-eval">
      <div className="final-eval-container">
        <div className="final-eval-hero glass-strong">
          <div className="final-eval-emoji">{emoji}</div>
          <h1>Study Session Complete!</h1>
          <p>Here's your comprehensive performance breakdown</p>
          <div style={{ marginTop: "1rem" }}>
            <span className={`badge badge-${evaluation?.overallUnderstanding?.replace("_", "-")}`}>
              {understandingLabel[evaluation?.overallUnderstanding] || "Evaluated"}
            </span>
          </div>
        </div>

        <div className="final-stats-grid">
          <div className="final-stat-card glass">
            <div className="final-stat-icon purple">
              <Target size={20} />
            </div>
            <div className="final-stat-value">{avgPercentage}%</div>
            <div className="final-stat-label">Avg Score</div>
          </div>
          <div className="final-stat-card glass">
            <div className="final-stat-icon green">
              <CheckCircle size={20} />
            </div>
            <div className="final-stat-value">{completionRate}/{results.length}</div>
            <div className="final-stat-label">On-time</div>
          </div>
          <div className="final-stat-card glass">
            <div className="final-stat-icon blue">
              <Clock size={20} />
            </div>
            <div className="final-stat-value">{Math.round(totalStudyTime / 60)}m</div>
            <div className="final-stat-label">Study Time</div>
          </div>
          <div className="final-stat-card glass">
            <div className="final-stat-icon amber">
              <Brain size={20} />
            </div>
            <div className="final-stat-value">{totalScore}/{totalQs}</div>
            <div className="final-stat-label">Total Score</div>
          </div>
        </div>

        <div className="final-topic-table glass">
          <h2>📋 Topic Breakdown</h2>
          <table className="final-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Score</th>
                <th>Time</th>
                <th>Status</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{r.topicTitle}</td>
                  <td>{r.quizScore}/{r.totalQuestions}</td>
                  <td>{Math.floor(r.timeTaken / 60)}m</td>
                  <td>{r.timeTaken <= r.timeAllotted ? "✅" : "⏰"}</td>
                  <td>
                    <span className={`badge badge-${r.understanding?.replace("_", "-")}`}>
                      {r.understanding?.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="final-feedback-section glass">
          <h2><TrendingUp size={20} /> AI Analysis</h2>
          <p className="final-feedback-text">{evaluation?.overallFeedback}</p>

          {evaluation?.studyRecommendations?.length > 0 && (
            <>
              <h2><Lightbulb size={20} /> Recommendations</h2>
              <ul className="final-recommendations">
                {evaluation.studyRecommendations.map((r, i) => (
                  <li key={i}>
                    <Lightbulb size={16} />
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}

          {evaluation?.topicInsights?.length > 0 && (
            <div className="final-topic-insights" style={{ marginTop: "1.5rem" }}>
              <h2><Award size={20} /> Topic Insights</h2>
              {evaluation.topicInsights.map((t, i) => (
                <div key={i} className="final-insight">
                  <span className="final-insight-topic">{t.topic}:</span>
                  <span className="final-insight-verdict">{t.verdict}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="final-actions">
          <button
            className="btn-primary"
            onClick={() => navigate("/")}
            id="back-dashboard-btn"
          >
            <Home size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
