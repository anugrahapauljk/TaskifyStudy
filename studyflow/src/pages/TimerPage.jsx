import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getChat, updateChat } from "../services/firestoreService";
import { SkipForward } from "lucide-react";
import "./TimerPage.css";

export default function TimerPage() {
  const { chatId, topicIndex } = useParams();
  const idx = parseInt(topicIndex);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadChat();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [chatId, topicIndex]);

  const loadChat = async () => {
    try {
      const data = await getChat(user.uid, chatId);
      if (!data || !data.topics[idx]) {
        navigate("/");
        return;
      }
      setChat(data);
      const secs = (data.topics[idx].timerMinutes || 10) * 60;
      setTotalSeconds(secs);
      setSecondsLeft(secs);
      startTimeRef.current = Date.now();
      startTimer(secs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (secs) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let remaining = secs;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        handleTimerEnd();
      }
    }, 1000);
  };

  const handleTimerEnd = () => {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    navigate(`/chat/${chatId}/quiz/${idx}`, { state: { timeTaken: elapsed } });
  };

  const handleEndEarly = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    navigate(`/chat/${chatId}/quiz/${idx}`, { state: { timeTaken: elapsed } });
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) : 0;
  const circumference = 2 * Math.PI * 125;
  const strokeOffset = circumference * (1 - progress);

  const topic = chat?.topics?.[idx];
  const minutesLeft = Math.ceil(secondsLeft / 60);

  if (loading || !topic) {
    return (
      <div className="timer-page">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div className="timer-page">
      <div className="timer-pulse-ring" />
      <div className="timer-pulse-ring" />

      <div className="timer-topic-badge">
        Topic {idx + 1} of {chat.topics.length}
      </div>
      <h2 className="timer-topic-title">{topic.title}</h2>

      <div className="timer-ring-container">
        <div className="timer-ring-bg" />
        <svg className="timer-ring-svg" viewBox="0 0 260 260">
          <defs>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <circle
            className="timer-ring-circle-bg"
            cx="130" cy="130" r="125"
          />
          <circle
            className="timer-ring-circle"
            cx="130" cy="130" r="125"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
          />
        </svg>
        <div className="timer-display">
          <div className="timer-time">{formatTime(secondsLeft)}</div>
          <div className="timer-label">remaining</div>
        </div>
      </div>

      {secondsLeft > 0 && secondsLeft <= 60 && (
        <div className="timer-alert urgent">
          ⚡ Quiz incoming in {secondsLeft}s!
        </div>
      )}
      {secondsLeft > 60 && secondsLeft <= 300 && (
        <div className="timer-alert warning">
          📝 Quiz incoming in {minutesLeft} min!
        </div>
      )}

      <div className="timer-actions">
        <button
          className="btn-secondary"
          onClick={handleEndEarly}
          id="end-early-btn"
        >
          <SkipForward size={18} />
          End Early & Take Quiz
        </button>
      </div>
    </div>
  );
}
