import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getChat, updateChat } from "../services/firestoreService";
import { Play, Clock, HelpCircle } from "lucide-react";
import "./TopicSetup.css";

export default function TopicSetup() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [topics, setTopics] = useState([]);
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
      setTopics(data.topics || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateTopic = (index, field, value) => {
    setTopics((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const totalTime = topics.reduce((sum, t) => sum + (parseInt(t.timerMinutes) || 0), 0);
  const totalQuestions = topics.reduce((sum, t) => sum + (parseInt(t.questionCount) || 0), 0);

  const handleStart = async () => {
    // Validate
    for (const t of topics) {
      if (!t.timerMinutes || t.timerMinutes < 1) {
        alert("Each topic needs at least 1 minute.");
        return;
      }
      if (!t.questionCount || t.questionCount < 1 || t.questionCount > 50) {
        alert("Question count must be between 1 and 50.");
        return;
      }
    }

    await updateChat(user.uid, chatId, {
      topics,
      currentTopicIndex: 0,
      results: [],
      status: "in_progress",
    });

    navigate(`/chat/${chatId}/timer/0`);
  };

  if (loading) {
    return (
      <div className="upload-page">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="topic-setup">
      <div className="topic-setup-container">
        <div className="topic-setup-header">
          <h1>📋 Set Your Study Plan</h1>
          <p>Configure timer and quiz settings for each topic, then start studying.</p>
        </div>

        <div className="topic-list">
          {topics.map((topic, idx) => (
            <div key={idx} className="topic-card glass">
              <div className="topic-card-header">
                <div className="topic-number">{idx + 1}</div>
                <div className="topic-title">{topic.title}</div>
              </div>
              <div className="topic-content-preview">
                {topic.content}
              </div>
              <div className="topic-controls">
                <div className="topic-control">
                  <label><Clock size={12} /> Timer (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={topic.timerMinutes}
                    onChange={(e) => updateTopic(idx, "timerMinutes", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="topic-control">
                  <label><HelpCircle size={12} /> Questions (1–50)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={topic.questionCount}
                    onChange={(e) => updateTopic(idx, "questionCount", parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="topic-setup-footer">
          <div className="topic-setup-summary">
            <strong>{topics.length}</strong> topics · <strong>{totalTime}</strong> min total · <strong>{totalQuestions}</strong> questions
          </div>
          <button
            className="btn-primary"
            onClick={handleStart}
            id="start-studying-btn"
          >
            <Play size={18} />
            Start Studying
          </button>
        </div>
      </div>
    </div>
  );
}
