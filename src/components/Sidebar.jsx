import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserChats, deleteChat } from "../services/firestoreService";
import {
  BookOpen,
  Plus,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Trash2,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";
import "./Sidebar.css";

export default function Sidebar({ sidebarOpen, setSidebarOpen, refreshKey }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { chatId } = useParams();
  const location = useLocation();
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, refreshKey]);

  const loadChats = async () => {
    try {
      const userChats = await getUserChats(user.uid);
      setChats(userChats);
    } catch (err) {
      console.error("Failed to load chats:", err);
    }
  };

  const handleNewChat = () => {
    setSidebarOpen(false);
    navigate("/");
  };

  const handleChatClick = (chat) => {
    setSidebarOpen(false);
    if (chat.status === "completed") {
      // Navigate to session summary for completed sessions
      navigate(`/chat/${chat.id}`);
    } else {
      // Navigate to setup for in-progress sessions
      navigate(`/chat/${chat.id}/setup`);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteChat(user.uid, id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (chatId === id) {
        navigate("/");
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusIcon = (status) => {
    if (status === "completed") return <CheckCircle size={12} className="status-icon completed" />;
    return <Clock size={12} className="status-icon in-progress" />;
  };

  const getTopicCount = (chat) => {
    const count = chat.topics?.length || 0;
    return count > 0 ? `${count} topic${count > 1 ? "s" : ""}` : "";
  };

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        id="sidebar-toggle"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <BookOpen size={20} />
          </div>
          <span className="sidebar-brand">StudyFlow</span>
        </div>

        <button
          className="sidebar-new-chat"
          onClick={handleNewChat}
          id="new-chat-btn"
        >
          <Plus size={18} />
          New Study Session
        </button>

        <div className="sidebar-chats">
          <div className="sidebar-chats-label">Study Sessions</div>
          {chats.length === 0 ? (
            <div className="sidebar-empty">
              No sessions yet. Upload a document to get started!
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`sidebar-chat-item ${
                  chatId === chat.id ? "active" : ""
                }`}
                onClick={() => handleChatClick(chat)}
              >
                <div className="sidebar-chat-icon">
                  {chat.status === "completed" ? (
                    <CheckCircle size={15} />
                  ) : (
                    <FileText size={15} />
                  )}
                </div>
                <div className="sidebar-chat-info">
                  <div className="sidebar-chat-title">
                    {chat.title || "Untitled Session"}
                  </div>
                  <div className="sidebar-chat-meta">
                    <span
                      className={`sidebar-status-label ${
                        chat.status === "completed" ? "completed" : "in-progress"
                      }`}
                    >
                      {chat.status === "completed" ? "Completed" : "In Progress"}
                    </span>
                    {getTopicCount(chat) && <span>· {getTopicCount(chat)}</span>}
                    {chat.createdAt && (
                      <span>· {formatDate(chat.createdAt)}</span>
                    )}
                  </div>
                </div>
                <button
                  className="sidebar-delete-btn"
                  onClick={(e) => handleDelete(e, chat.id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {user && (
          <div className="sidebar-user">
            <img
              className="sidebar-avatar"
              src={
                user.photoURL ||
                `https://ui-avatars.com/api/?name=${user.displayName}&background=8b5cf6&color=fff`
              }
              alt={user.displayName}
            />
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.displayName}</div>
              <div className="sidebar-user-email">{user.email}</div>
            </div>
            <button
              className="sidebar-logout"
              onClick={handleLogout}
              title="Sign out"
              id="logout-btn"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
