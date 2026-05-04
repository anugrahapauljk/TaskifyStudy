import { useState, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { extractTextFromMultipleFiles } from "../services/ocrService";
import { condenseText, organizeTopics } from "../services/groqService";
import { createChat } from "../services/firestoreService";
import { Upload, FileText, X, Sparkles, Image, FileSpreadsheet } from "lucide-react";
import "./UploadPage.css";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/bmp",
  "image/tiff",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp", ".pdf", ".txt", ".pptx", ".ppt"];

function isAllowedFile(file) {
  if (ALLOWED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function getFileIcon(file) {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return <Image size={18} />;
  if (name.endsWith(".pptx") || name.endsWith(".ppt")) return <FileSpreadsheet size={18} />;
  return <FileText size={18} />;
}

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { triggerRefresh } = useOutletContext();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("idle"); // idle, extracting, organizing, done
  const [error, setError] = useState("");

  const handleFiles = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return;

    const validFiles = [];
    const invalidFiles = [];

    for (const f of newFiles) {
      if (isAllowedFile(f)) {
        validFiles.push(f);
      } else {
        invalidFiles.push(f.name);
      }
    }

    if (invalidFiles.length > 0) {
      setError(
        `Unsupported file(s): ${invalidFiles.join(", ")}. Supported: images, PDFs, PPTX, and text files.`
      );
    } else {
      setError("");
    }

    if (validFiles.length > 0) {
      setFiles((prev) => {
        // Avoid duplicates by name+size
        const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
        const unique = validFiles.filter(
          (f) => !existing.has(`${f.name}-${f.size}`)
        );
        return [...prev, ...unique];
      });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setError("");

    try {
      // Step 1: Extract text from all files
      setStep("extracting");
      setProgress(0);
      const rawText = await extractTextFromMultipleFiles(files, setProgress);

      if (!rawText || rawText.trim().length < 20) {
        setError(
          "Could not extract enough text from the file(s). Try clearer images or different documents."
        );
        setStep("idle");
        return;
      }

      // Step 2: Condense text — extract only main topics & definitions
      setStep("organizing");
      setProgress(0);
      const condensed = await condenseText(rawText);

      // Step 3: Organize condensed text into topics
      const topics = await organizeTopics(condensed);

      if (!topics || topics.length === 0) {
        setError(
          "Could not organize topics from the extracted text. Please try again."
        );
        setStep("idle");
        return;
      }

      // Step 3: Create chat in Firestore
      const topicsWithDefaults = topics.map((t) => ({
        ...t,
        timerMinutes: 10,
        questionCount: 5,
      }));

      const fileNames = files.map((f) => f.name);
      const sessionTitle =
        files.length === 1
          ? files[0].name.replace(/\.[^/.]+$/, "")
          : `${files[0].name.replace(/\.[^/.]+$/, "")} +${files.length - 1} more`;

      const chatId = await createChat(user.uid, {
        title: sessionTitle,
        fileNames: fileNames,
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

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="upload-page">
      <div className="upload-container">
        <div className="upload-header">
          <h1>📚 New Study Session</h1>
          <p>Upload your study materials to get started</p>
        </div>

        <div
          className={`upload-zone glass ${dragOver ? "drag-over" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          id="upload-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.pptx,.ppt"
            multiple
            onChange={(e) => handleFiles(Array.from(e.target.files))}
          />
          <div className="upload-icon-wrap">
            <Upload size={32} />
          </div>
          <h3>Drop your files here or click to browse</h3>
          <p>
            Supports images (PNG, JPG), PDFs, PowerPoint (PPTX), and text files
          </p>
          <div className="upload-formats">
            <span className="format-tag">PDF</span>
            <span className="format-tag">PPTX</span>
            <span className="format-tag">PNG</span>
            <span className="format-tag">JPG</span>
            <span className="format-tag">TXT</span>
          </div>
        </div>

        {files.length > 0 && (
          <div className="upload-file-list">
            <div className="upload-file-list-header">
              <span>
                {files.length} file{files.length > 1 ? "s" : ""} selected
              </span>
              <span className="upload-total-size">{formatSize(totalSize)}</span>
            </div>
            {files.map((file, index) => (
              <div key={`${file.name}-${file.size}`} className="upload-file-info glass">
                <div className="upload-file-icon">{getFileIcon(file)}</div>
                <div className="upload-file-details">
                  <div className="upload-file-name">{file.name}</div>
                  <div className="upload-file-size">
                    {formatSize(file.size)}
                  </div>
                </div>
                {step === "idle" && (
                  <button
                    className="upload-file-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {step === "extracting" && (
          <div className="upload-progress-section">
            <div className="upload-progress-label">
              <span>
                Extracting text from {files.length} file
                {files.length > 1 ? "s" : ""}...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
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

        {files.length > 0 && step === "idle" && (
          <div className="upload-actions">
            <button
              className="btn-secondary"
              onClick={() => setFiles([])}
              id="clear-files-btn"
            >
              <X size={18} />
              Clear All
            </button>
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
