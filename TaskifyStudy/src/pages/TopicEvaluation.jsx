import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getChat, updateChat } from "../services/firestoreService";
import { evaluateTopic } from "../services/groqService";
import { ArrowRight, CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp, Star } from "lucide-react";
import "./TopicEvaluation.css";

export default function TopicEvaluation() {
  const { chatId, topicIndex } = useParams();
  const idx = parseInt(topicIndex);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerRefresh } = useOutletContext();

  const {
    timeTaken = 0,
    timeAllotted = 600,
    quizScore = 0,
    totalQuestions = 0,
    answers = [],
    topicTitle = "",
  } = location.state || {};

  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState(null);

  useEffect(() => {
    runEvaluation();
  }, []);

  const runEvaluation = async () => {
    try {
      const data = await getChat(user.uid, chatId);
      setChat(data);

      const evalResult = await evaluateTopic(topicTitle, quizScore, totalQuestions, answers);
      setEvaluation(evalResult);

      // Save result to Firestore
      const newResult = {
        topicTitle,
        quizScore,
        totalQuestions,
        timeTaken,
        timeAllotted,
        understanding: evalResult.understanding,
        feedback: evalResult.feedback,
        answers,
      };

      const existingResults = data.results || [];
      existingResults[idx] = newResult;

      await updateChat(user.uid, chatId, {
        results: existingResults,
        currentTopicIndex: idx + 1,
      });

      triggerRefresh();
    } catch (err) {
      console.error(err);
      setEvaluation({
        understanding: quizScore / totalQuestions >= 0.7 ? "strong" : quizScore / totalQuestions >= 0.4 ? "can_improve" : "weak",
        feedback: `You scored ${quizScore}/${totalQuestions}.`,
        strengths: [],
        improvements: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    const totalTopics = chat?.topics?.length || 0;
    if (idx + 1 < totalTopics) {
      navigate(`/chat/${chatId}/timer/${idx + 1}`);
    } else {
      await updateChat(user.uid, chatId, { status: "completed" });
      triggerRefresh();
      navigate(`/chat/${chatId}/final`);
    }
  };

  const percentage = totalQuestions > 0 ? Math.round((quizScore / totalQuestions) * 100) : 0;
  const circumference = 2 * Math.PI * 70;
  const strokeOffset = circumference * (1 - percentage / 100);
  const isOnTime = timeTaken <= timeAllotted;
  const isLastTopic = chat && idx + 1 >= chat.topics.length;

  const understandingIcon = {
    strong: <CheckCircle size={18} />,
    can_improve: <AlertTriangle size={18} />,
    weak: <XCircle size={18} />,
  };

  if (loading) {
    return (
      <div className="topic-eval">
        <div className="topic-eval-container">
          <div className="eval-loading glass">
            <div className="spinner spinner-lg" />
            <p>Evaluating your performance...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-eval">
      <div className="topic-eval-container">
        <div className="topic-eval-header">
          <h1>📊 Topic Evaluation</h1>
          <p>{topicTitle}</p>
        </div>

        <div className="eval-score-card glass-strong">
          <div className="eval-score-ring">
            <svg viewBox="0 0 160 160" width="160" height="160">
              <circle className="eval-score-ring-bg" cx="80" cy="80" r="70" />
              <circle
                className={`eval-score-ring-fill ${evaluation?.understanding}`}
                cx="80" cy="80" r="70"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
              />
            </svg>
            <div className="eval-score-center">
              <div className={`eval-score-value ${evaluation?.understanding}`}>
                {percentage}%
              </div>
              <div className="eval-score-label">correct</div>
            </div>
          </div>
          <span className={`badge badge-${evaluation?.understanding?.replace("_", "-")}`}>
            {understandingIcon[evaluation?.understanding]} {evaluation?.understanding?.replace("_", " ")}
          </span>
        </div>

        <div className="eval-stats">
          <div className="eval-stat glass">
            <div className="eval-stat-value">{quizScore}/{totalQuestions}</div>
            <div className="eval-stat-label">Score</div>
          </div>
          <div className="eval-stat glass">
            <div className="eval-stat-value">{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</div>
            <div className="eval-stat-label">Time Used</div>
          </div>
          <div className="eval-stat glass">
            <div className="eval-stat-value">{Math.floor(timeAllotted / 60)}m</div>
            <div className="eval-stat-label">Time Allotted</div>
          </div>
        </div>

        <div className={`eval-time-card glass`}>
          <div className={`eval-time-icon ${isOnTime ? "on-time" : "over-time"}`}>
            <Clock size={22} />
          </div>
          <div className="eval-time-text">
            <strong>{isOnTime ? "✅ Completed on time!" : "⏰ Went over time"}</strong>
            <span>
              {isOnTime
                ? `Finished ${Math.floor((timeAllotted - timeTaken) / 60)}m early`
                : `Exceeded by ${Math.floor((timeTaken - timeAllotted) / 60)}m`}
            </span>
          </div>
        </div>

        <div className="eval-feedback-card glass">
          <h3><TrendingUp size={18} /> AI Feedback</h3>
          <p className="eval-feedback-text">{evaluation?.feedback}</p>

          {evaluation?.strengths?.length > 0 && (
            <>
              <h3><Star size={18} /> Strengths</h3>
              <ul className="eval-feedback-list">
                {evaluation.strengths.map((s, i) => (
                  <li key={i}>
                    <CheckCircle size={14} color="var(--accent-green)" />
                    {s}
                  </li>
                ))}
              </ul>
            </>
          )}

          {evaluation?.improvements?.length > 0 && (
            <>
              <h3 style={{ marginTop: "1rem" }}><AlertTriangle size={18} /> Areas to Improve</h3>
              <ul className="eval-feedback-list">
                {evaluation.improvements.map((s, i) => (
                  <li key={i}>
                    <AlertTriangle size={14} color="var(--accent-amber)" />
                    {s}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="eval-actions">
          <button className="btn-primary" onClick={handleNext} id="next-topic-btn">
            {isLastTopic ? "View Final Results" : "Next Topic"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
