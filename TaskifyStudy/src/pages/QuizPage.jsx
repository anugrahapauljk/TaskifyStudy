import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getChat } from "../services/firestoreService";
import { generateQuiz } from "../services/groqService";
import { CheckCircle, Send } from "lucide-react";
import "./QuizPage.css";

export default function QuizPage() {
  const { chatId, topicIndex } = useParams();
  const idx = parseInt(topicIndex);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const timeTaken = location.state?.timeTaken || 0;

  const [chat, setChat] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAndGenerate();
  }, [chatId, topicIndex]);

  const loadAndGenerate = async () => {
    try {
      const data = await getChat(user.uid, chatId);
      if (!data || !data.topics[idx]) {
        navigate("/");
        return;
      }
      setChat(data);

      const topic = data.topics[idx];
      const qs = await generateQuiz(topic.title, topic.content, topic.questionCount || 5);
      setQuestions(qs);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate quiz.");
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }
    setSubmitted(true);
  };

  const getScore = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) correct++;
    });
    return correct;
  };

  const handleContinue = () => {
    const score = getScore();
    const answersDetail = questions.map((q, i) => ({
      question: q.question,
      selected: q.options[answers[i]],
      correct: q.options[q.correctAnswer],
      isCorrect: answers[i] === q.correctAnswer,
      explanation: q.explanation,
    }));

    navigate(`/chat/${chatId}/eval/${idx}`, {
      state: {
        timeTaken,
        timeAllotted: (chat.topics[idx].timerMinutes || 10) * 60,
        quizScore: score,
        totalQuestions: questions.length,
        answers: answersDetail,
        topicTitle: chat.topics[idx].title,
      },
    });
  };

  const optionLabel = (i) => ["A", "B", "C", "D"][i];

  if (loading) {
    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <div className="quiz-loading glass">
            <div className="spinner spinner-lg" />
            <p>🧠 Generating quiz questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <div className="quiz-error glass">
            <p>❌ {error}</p>
            <button className="btn-primary" onClick={loadAndGenerate}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const topic = chat?.topics?.[idx];

  return (
    <div className="quiz-page">
      <div className="quiz-container">
        <div className="quiz-header">
          <div className="quiz-header-badge">
            Topic {idx + 1} of {chat.topics.length}
          </div>
          <h1>Quiz: {topic?.title}</h1>
          <p>Answer all questions then submit to see your results</p>
        </div>

        <div className="quiz-questions">
          {questions.map((q, qIdx) => {
            const isAnswered = answers[qIdx] !== undefined;
            return (
              <div
                key={qIdx}
                className={`quiz-card glass ${isAnswered ? "answered" : ""}`}
              >
                <div className="quiz-question-number">
                  Question {qIdx + 1}
                </div>
                <div className="quiz-question-text">{q.question}</div>
                <div className="quiz-options">
                  {q.options.map((opt, oIdx) => {
                    let cls = "quiz-option";
                    if (!submitted && answers[qIdx] === oIdx) cls += " selected";
                    if (submitted) {
                      if (oIdx === q.correctAnswer) cls += " correct";
                      else if (answers[qIdx] === oIdx && oIdx !== q.correctAnswer) cls += " wrong";
                    }
                    return (
                      <div
                        key={oIdx}
                        className={cls}
                        onClick={() => selectAnswer(qIdx, oIdx)}
                      >
                        <div className="quiz-option-marker">
                          {submitted && oIdx === q.correctAnswer ? (
                            <CheckCircle size={14} />
                          ) : (
                            optionLabel(oIdx)
                          )}
                        </div>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
                {submitted && q.explanation && (
                  <div className="quiz-explanation">
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="quiz-footer">
          <div className="quiz-progress-text">
            <strong>{Object.keys(answers).length}</strong> of{" "}
            <strong>{questions.length}</strong> answered
            {submitted && (
              <span>
                {" "}· Score: <strong>{getScore()}/{questions.length}</strong>
              </span>
            )}
          </div>

          {!submitted ? (
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < questions.length}
              id="submit-quiz-btn"
            >
              <Send size={18} />
              Submit Answers
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={handleContinue}
              id="continue-btn"
            >
              View Evaluation →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
