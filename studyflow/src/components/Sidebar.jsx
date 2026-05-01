import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserChats, deleteChat } from "../services/firestoreService";
import { BookOpen, Plus, MessageSquare, LogOut, Menu, X, Trash2 } from "lucide-react";
import "./Sidebar.css";

export default function Sidebar({ sidebarOpen, setSidebarOpen, refreshKey }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { chatId } = useParams();
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

  const handleChatClick = (id) => {
    setSidebarOpen(false);
    navigate(`/chat/${id}`);
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
          <div className="sidebar-chats-label">Recent Sessions</div>
          {chats.length === 0 ? (
            <div className="sidebar-empty">
              No sessions yet. Upload a document to get started!
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`sidebar-chat-item ${chatId === chat.id ? "active" : ""}`}
                onClick={() => handleChatClick(chat.id)}
              >
                <MessageSquare size={16} />
                <span>{chat.title || "Untitled Session"}</span>
                <div
                  className={`sidebar-chat-status ${chat.status || "in-progress"}`}
                />
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
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=8b5cf6&color=fff`}
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
