import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getChat, updateChat } from "../services/firestoreService";
import {
  Play,
  Clock,
  HelpCircle,
  Pencil,
  Trash2,
  Plus,
  GripVertical,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import "./TopicSetup.css";

export default function TopicSetup() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [topics, setTopics] = useState([]);
  const [originalTopics, setOriginalTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadChat();
  }, [chatId]);

  useEffect(() => {
    if (originalTopics.length > 0) {
      setHasChanges(JSON.stringify(topics) !== JSON.stringify(originalTopics));
    }
  }, [topics, originalTopics]);

  const loadChat = async () => {
    try {
      const data = await getChat(user.uid, chatId);
      if (!data) {
        navigate("/");
        return;
      }
      setChat(data);
      const loadedTopics = (data.topics || []).map((t) => ({
        ...t,
        timerMinutes: t.timerMinutes || 10,
        questionCount: t.questionCount || 5,
      }));
      setTopics(loadedTopics);
      setOriginalTopics(JSON.parse(JSON.stringify(loadedTopics)));
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

  const startEditing = (index) => {
    setEditingIndex(index);
    setEditTitle(topics[index].title);
    setEditContent(topics[index].content);
    setExpandedIndex(index);
  };

  const saveEditing = () => {
    if (editingIndex === null) return;
    if (!editTitle.trim()) return;
    setTopics((prev) => {
      const updated = [...prev];
      updated[editingIndex] = {
        ...updated[editingIndex],
        title: editTitle.trim(),
        content: editContent.trim(),
      };
      return updated;
    });
    setEditingIndex(null);
    setEditTitle("");
    setEditContent("");
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditTitle("");
    setEditContent("");
  };

  const addTopic = () => {
    const newTopic = {
      title: `New Topic ${topics.length + 1}`,
      content: "",
      timerMinutes: 10,
      questionCount: 5,
    };
    setTopics((prev) => [...prev, newTopic]);
    // Immediately start editing the new topic
    const newIndex = topics.length;
    setTimeout(() => {
      startEditing(newIndex);
    }, 50);
  };

  const removeTopic = (index) => {
    if (topics.length <= 1) {
      alert("You need at least one topic.");
      return;
    }
    if (editingIndex === index) cancelEditing();
    if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    setTopics((prev) => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
    else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const moveTopic = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= topics.length) return;
    setTopics((prev) => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
    if (editingIndex === index) setEditingIndex(newIndex);
    else if (editingIndex === newIndex) setEditingIndex(index);
    if (expandedIndex === index) setExpandedIndex(newIndex);
    else if (expandedIndex === newIndex) setExpandedIndex(index);
  };

  const resetTopics = () => {
    setTopics(JSON.parse(JSON.stringify(originalTopics)));
    setEditingIndex(null);
    setExpandedIndex(null);
  };

  const toggleExpand = (index) => {
    if (editingIndex !== null) return;
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const totalTime = topics.reduce(
    (sum, t) => sum + (parseInt(t.timerMinutes) || 0),
    0
  );
  const totalQuestions = topics.reduce(
    (sum, t) => sum + (parseInt(t.questionCount) || 0),
    0
  );

  const handleStart = async () => {
    // Validate
    for (const t of topics) {
      if (!t.title || !t.title.trim()) {
        alert("Each topic needs a title.");
        return;
      }
      if (!t.timerMinutes || t.timerMinutes < 1 || t.timerMinutes > 60) {
        alert("Timer must be between 1 and 60 minutes.");
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
          <div className="topic-setup-header-top">
            <div>
              <h1>📋 Set Your Study Plan</h1>
              <p>
                Edit topics, adjust timers and quiz settings, then start
                studying.
              </p>
            </div>
            <div className="topic-setup-header-actions">
              {hasChanges && (
                <button
                  className="btn-ghost btn-sm"
                  onClick={resetTopics}
                  title="Reset to original AI analysis"
                  id="reset-topics-btn"
                >
                  <RotateCcw size={15} />
                  Reset
                </button>
              )}
              <button
                className="btn-outline btn-sm"
                onClick={addTopic}
                id="add-topic-btn"
              >
                <Plus size={15} />
                Add Topic
              </button>
            </div>
          </div>
        </div>

        <div className="topic-list">
          {topics.map((topic, idx) => (
            <div
              key={idx}
              className={`topic-card glass ${
                editingIndex === idx ? "editing" : ""
              } ${expandedIndex === idx ? "expanded" : ""}`}
            >
              {/* Reorder controls */}
              <div className="topic-reorder">
                <button
                  className="reorder-btn"
                  onClick={() => moveTopic(idx, -1)}
                  disabled={idx === 0}
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <GripVertical size={14} className="grip-icon" />
                <button
                  className="reorder-btn"
                  onClick={() => moveTopic(idx, 1)}
                  disabled={idx === topics.length - 1}
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="topic-card-main">
                {/* Header */}
                <div className="topic-card-header">
                  <div className="topic-number">{idx + 1}</div>
                  {editingIndex === idx ? (
                    <input
                      className="topic-title-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Topic title..."
                      autoFocus
                      id={`topic-title-input-${idx}`}
                    />
                  ) : (
                    <div
                      className="topic-title clickable"
                      onClick={() => toggleExpand(idx)}
                    >
                      {topic.title}
                    </div>
                  )}
                  <div className="topic-card-actions">
                    {editingIndex === idx ? (
                      <>
                        <button
                          className="topic-action-btn save"
                          onClick={saveEditing}
                          title="Save changes"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          className="topic-action-btn cancel"
                          onClick={cancelEditing}
                          title="Cancel editing"
                        >
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="topic-action-btn edit"
                          onClick={() => startEditing(idx)}
                          title="Edit topic"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="topic-action-btn delete"
                          onClick={() => removeTopic(idx)}
                          title="Remove topic"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                {editingIndex === idx ? (
                  <textarea
                    className="topic-content-edit"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Topic content / study notes..."
                    rows={6}
                    id={`topic-content-input-${idx}`}
                  />
                ) : (
                  <div
                    className={`topic-content-preview ${
                      expandedIndex === idx ? "expanded" : ""
                    }`}
                    onClick={() => toggleExpand(idx)}
                  >
                    {topic.content || (
                      <span className="empty-content">
                        No content — click edit to add study notes
                      </span>
                    )}
                  </div>
                )}

                {/* Controls */}
                <div className="topic-controls">
                  <div className="topic-control">
                    <label>
                      <Clock size={12} /> Timer (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={topic.timerMinutes}
                      onChange={(e) =>
                        updateTopic(
                          idx,
                          "timerMinutes",
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                  </div>
                  <div className="topic-control">
                    <label>
                      <HelpCircle size={12} /> Questions (1–50)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={topic.questionCount}
                      onChange={(e) =>
                        updateTopic(
                          idx,
                          "questionCount",
                          parseInt(e.target.value) || 5
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {topics.length === 0 && (
          <div className="topic-empty-state glass">
            <p>No topics yet. Click "Add Topic" to create one.</p>
          </div>
        )}

        <div className="topic-setup-footer">
          <div className="topic-setup-summary">
            <strong>{topics.length}</strong> topics ·{" "}
            <strong>{totalTime}</strong> min total ·{" "}
            <strong>{totalQuestions}</strong> questions
            {hasChanges && (
              <span className="unsaved-badge">· Modified</span>
            )}
          </div>
          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={topics.length === 0 || editingIndex !== null}
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
