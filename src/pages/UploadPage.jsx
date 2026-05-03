import { useState, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { extractText } from "../services/ocrService";
import { organizeTopics } from "../services/groqService";
import { createChat } from "../services/firestoreService";
import { Upload, FileText, X, Sparkles } from "lucide-react";
import "./UploadPage.css";

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { triggerRefresh } = useOutletContext();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("idle"); // idle, extracting, organizing, done
  const [error, setError] = useState("");

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ["image/png", "image/jpeg", "image/bmp", "image/tiff", "application/pdf", "text/plain"];
    if (!allowed.includes(f.type) && !f.name.endsWith(".txt")) {
      setError("Please upload an image (PNG, JPG), PDF, or text file.");
      return;
    }
    setFile(f);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleProcess = async () => {
    if (!file) return;
    setError("");

    try {
      // Step 1: Extract text
      setStep("extracting");
      setProgress(0);
      const rawText = await extractText(file, setProgress);

      if (!rawText || rawText.trim().length < 20) {
        setError("Could not extract enough text from the file. Try a clearer image or PDF.");
        setStep("idle");
        return;
      }

      // Step 2: Organize into topics
      setStep("organizing");
      setProgress(0);
      const topics = await organizeTopics(rawText);

      if (!topics || topics.length === 0) {
        setError("Could not organize topics from the extracted text. Please try again.");
        setStep("idle");
        return;
      }

      // Step 3: Create chat in Firestore
      const topicsWithDefaults = topics.map((t) => ({
        ...t,
        timerMinutes: 10,
        questionCount: 5,
      }));

      const chatId = await createChat(user.uid, {
        title: file.name.replace(/\.[^/.]+$/, ""),
        fileName: file.name,
        extractedText: rawText.slice(0, 50000),
        topics: topicsWithDefaults,
      });

      triggerRefresh();
      setStep("done");

      // Navigate to topic setup
      navigate(`/chat/${chatId}/setup`);
    } catch (err) {
      console.error("Processing error:", err);
      setError(err.message || "An error occurred during processing.");
      setStep("idle");
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-header">
          <h1>📚 New Study Session</h1>
          <p>Upload your study material to get started</p>
        </div>

        <div
          className={`upload-zone glass ${dragOver ? "drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          id="upload-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className="upload-icon-wrap">
            <Upload size={32} />
          </div>
          <h3>Drop your file here or click to browse</h3>
          <p>Supports images (PNG, JPG), PDFs, and text files</p>
        </div>

        {file && (
          <div className="upload-file-info glass">
            <div className="upload-file-icon">
              <FileText size={20} />
            </div>
            <div className="upload-file-details">
              <div className="upload-file-name">{file.name}</div>
              <div className="upload-file-size">{formatSize(file.size)}</div>
            </div>
            {step === "idle" && (
              <button
                className="upload-file-remove"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {step === "extracting" && (
          <div className="upload-progress-section">
            <div className="upload-progress-label">
              <span>Extracting text...</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {step === "organizing" && (
          <div className="upload-status glass">
            <div className="spinner spinner-lg" />
            <p>🧠 AI is organizing your topics...</p>
          </div>
        )}

        {error && <div className="upload-error">{error}</div>}

        {file && step === "idle" && (
          <div className="upload-actions">
            <button
              className="btn-primary"
              onClick={handleProcess}
              id="process-btn"
            >
              <Sparkles size={18} />
              Generate Overview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
