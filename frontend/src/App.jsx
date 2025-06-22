import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Progress } from "./components/ui/progress";
import { ThemeToggle } from "./components/theme-toggle";
import {
  Upload,
  FileAudio,
  LoaderPinwheel,
  Clock,
  CheckCircle,
  MessageSquare,
  FileText,
  BarChart3,
  Download,
  Cpu,
  AlertCircle,
  Info,
  HardDrive,
  X,
} from "lucide-react";
import { cn, truncateText } from "./lib/utils";
import { Trash2 } from "lucide-react";

function AskQuestionSection({ audioId }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAsk = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const form = new FormData();
      form.append("question", question);
      const res = await fetch(`http://localhost:8000/files/${audioId}/ask`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        throw new Error("Failed to get answer");
      }
      const data = await res.json();
      setAnswer(data.answer);
    } catch (err) {
      setError("Could not get answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 mt-6">
      <form onSubmit={handleAsk} className="flex flex-col md:flex-row items-stretch gap-2">
        <Input
          type="text"
          placeholder="Ask a question about the audio"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          required
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={loading || !question.trim()}
          className="cursor-pointer hover:cursor-pointer border-2 border-primary bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-md hover:shadow-lg"
        >
          {loading ? "Searching…" : "Ask"}
        </Button>
      </form>
      {answer && (
        <div className="bg-background/70 border border-border rounded-lg p-4 mt-2">
          <span className="font-semibold text-primary">Answer : </span>
          <span>{answer}</span>
        </div>
      )}
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </div>
  );
}

export default function App() {
  // State for files and related
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [numQuestions, setNumQuestions] = useState(() => {
    const saved = localStorage.getItem("numQuestions");
    return saved ? Number(saved) : 3;
  });
  const [autoGenerateQuestions, setAutoGenerateQuestions] = useState(true);
  const pollIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedRef = useRef(null);

  // Search state for My Files
  const [searchTerm, setSearchTerm] = useState("");
  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // State for "Generate More Questions" panel
  const [moreCount, setMoreCount] = useState(3);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMore, setErrorMore] = useState("");
  const [successMore, setSuccessMore] = useState("");

  const handleGenerateMore = async (audioId) => {
    setLoadingMore(true);
    setErrorMore("");
    setSuccessMore("");
    try {
      const res = await fetch(`http://localhost:8000/files/${audioId}/generate_questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num_questions: moreCount }),
      });
      if (!res.ok) throw new Error("Failed to generate more questions");
      setSuccessMore("Questions generated.");
      await fetchFiles();
    } catch (e) {
      setErrorMore("Could not generate more questions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const deleteFile = async (fileId) => {
    try {
      await fetch(`http://localhost:8000/files/${fileId}`, {
        method: "DELETE",
      });
      setSelected(null);
      await fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8000/files");
      const data = await res.json();
      const currentSelected = selectedRef.current;
      setFiles(data);

      // Update selected file if it exists and ensure it's always the latest data
      if (currentSelected) {
        const updatedSelected = data.find((d) => d.id === currentSelected.id);
        if (updatedSelected) {
          setSelected(updatedSelected);
        }
      }

      // Check if there are any files still processing OR if selected file is still processing
      const hasProcessingFiles = data.some(
        (f) =>
          f.processing_stage !== "complete" && f.processing_stage !== "error"
      );
      const selectedFileProcessing =
        currentSelected &&
        data.find(
          (f) =>
            f.id === currentSelected.id &&
            f.processing_stage !== "complete" &&
            f.processing_stage !== "error"
        );

      if (
        (hasProcessingFiles || selectedFileProcessing) &&
        !pollIntervalRef.current
      ) {
        startPolling();
      } else if (
        !hasProcessingFiles &&
        !selectedFileProcessing &&
        pollIntervalRef.current
      ) {
        stopPolling();
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch("http://localhost:8000/models");
      const data = await res.json();
      setAvailableModels(data.models || []);
      if (data.models && data.models.length > 0) {
        setSelectedModel(data.models[0].name);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      // Set default models on error
      setAvailableModels([
        { name: "vatistasdim/boXai", display_name: "boXai (Default)" },
      ]);
      setSelectedModel("vatistasdim/boXai");
    }
  };

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(fetchFiles, 2000);
  }, [fetchFiles]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleUpload = async () => {
    if (!file) {
      console.warn("No file selected for upload");
      return;
    }
    setIsProcessing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (selectedModel) {
        form.append("selected_model", selectedModel);
      }
      if (autoGenerateQuestions) {
        form.append("num_questions", 3); // Default to 3 if auto-generate is enabled
      }
      form.append("auto_generate_questions", autoGenerateQuestions ? "true" : "false");
      await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: form,
      });
      setFile(null);
      await fetchFiles();
      startPolling();
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("audio/")) {
        setFile(droppedFile);
      }
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchModels();

    return () => {
      stopPolling();
    };
  }, []);

  // Keep selectedRef in sync with selected state
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Start polling when a processing file is selected
  useEffect(() => {
    if (
      selected &&
      selected.processing_stage !== "complete" &&
      selected.processing_stage !== "error"
    ) {
      if (!pollIntervalRef.current) {
        startPolling();
      }
    }
  }, [selected]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 transition-all duration-500">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-lg bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <FileAudio className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">OratorIQ</h1>
              <p className="text-sm text-muted-foreground">
                Your teacher assistant for audio analysis
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Auto-generate questions preference */}
            <div className="flex items-center space-x-2">
              <label htmlFor="auto-generate-toggle" className="text-sm font-medium">
                Auto-generate Questions
              </label>
              <input
                id="auto-generate-toggle"
                type="checkbox"
                checked={autoGenerateQuestions}
                onChange={() => setAutoGenerateQuestions((v) => !v)}
                className="accent-primary h-4 w-4"
                style={{ accentColor: "var(--primary)", cursor: "pointer" }}
              />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Processing Status - Top Full Width */}
        {pollIntervalRef.current &&
          (() => {
            const processingFiles = files.filter(
              (f) =>
                f.processing_stage !== "complete" &&
                f.processing_stage !== "error"
            );

            // Only consider files that are not complete for progress
            const processingFilesOnly = files.filter(
              (f) => f.processing_stage !== "complete"
            );
            const totalFiles = processingFilesOnly.length;
            const completedFiles = processingFilesOnly.filter(
              (f) => f.processing_stage === "complete"
            ).length;
            const overallProgress =
              totalFiles > 0
                ? Math.round(
                  processingFiles.reduce(
                    (sum, f) => sum + (f.progress_percentage || 0),
                    0
                  ) / totalFiles
                )
                : 0;

            const stageGroups = processingFiles.reduce((acc, file) => {
              acc[file.processing_stage] =
                (acc[file.processing_stage] || 0) + 1;
              return acc;
            }, {});

            const getStatusMessage = () => {
              if (processingFiles.length === 1) {
                const file = processingFiles[0];
                const stageText =
                  {
                    downloading_model: "Downloading AI model",
                    transcribing: "Transcribing audio",
                    analyzing: "Analyzing content",
                  }[file.processing_stage] || "Processing";
                return `${stageText} for ${file.filename}`;
              } else if (processingFiles.length > 1) {
                return `Processing ${processingFiles.length} files in background`;
              }
              return "Processing files in background...";
            };

            const getDetailMessage = () => {
              const stages = Object.entries(stageGroups).map(
                ([stage, count]) => {
                  const stageText =
                    {
                      downloading_model: "downloading model",
                      transcribing: "transcribing",
                      analyzing: "analyzing",
                    }[stage] || "processing";
                  return `${count} ${stageText}`;
                }
              );

              if (stages.length > 0) {
                return `Currently: ${stages.join(
                  ", "
                )}. You can leave and come back later to check status.`;
              }
              return "Your files are being processed. You can continue to upload more files or check the status of existing ones.";
            };

            return (
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 animate-slide-up mb-8">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <LoaderPinwheel className="h-5 w-5 text-blue-600 animate-spin" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        {getStatusMessage()}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {getDetailMessage()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                      <span>Overall Progress</span>
                      <span>
                        {completedFiles}/{totalFiles} files completed
                      </span>
                    </div>
                    <Progress value={overallProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })()}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: Uploads and My Files */}
          <div className="space-y-8 lg:col-span-1">
            {/* Upload Section */}
            <Card className="glass-effect animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload Audio File</span>
                </CardTitle>
                <CardDescription>
                  Upload your audio file to get AI-powered transcription and
                  analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Model Selector */}
                {availableModels.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center space-x-2">
                      <Cpu className="h-4 w-4" />
                      <span>AI Model for Analysis</span>
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-2 py-1 border border-border rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      disabled={isProcessing}
                      style={{
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)",
                        maxWidth: 240,
                        minHeight: 32,
                      }}
                    >
                      {availableModels.map((model) => (
                        <option
                          key={model.name}
                          value={model.name}
                          className="bg-background text-foreground"
                          style={{
                            backgroundColor: "hsl(var(--background))",
                            color: "hsl(var(--foreground))",
                          }}
                        >
                          {model.display_name || model.name}
                        </option>
                      ))}
                    </select>
                    <span
                      className="ml-2 align-middle inline-flex relative"
                      tabIndex={0}
                      style={{ verticalAlign: "middle" }}
                      onMouseEnter={e => {
                        const tooltip = e.currentTarget.querySelector('.custom-tooltip');
                        if (tooltip) tooltip.style.display = 'block';
                      }}
                      onMouseLeave={e => {
                        const tooltip = e.currentTarget.querySelector('.custom-tooltip');
                        if (tooltip) tooltip.style.display = 'none';
                      }}
                      onFocus={e => {
                        const tooltip = e.currentTarget.querySelector('.custom-tooltip');
                        if (tooltip) tooltip.style.display = 'block';
                      }}
                      onBlur={e => {
                        const tooltip = e.currentTarget.querySelector('.custom-tooltip');
                        if (tooltip) tooltip.style.display = 'none';
                      }}
                    >
                      <Info
                        className="h-4 w-4 text-muted-foreground cursor-pointer"
                        aria-label="Help: Choose the AI model for generating the summary"
                        role="img"
                        tabIndex={-1}
                        style={{ verticalAlign: "middle" }}
                      />
                      <span
                        className="custom-tooltip absolute left-6 top-1/2 -translate-y-1/2 z-50 px-3 py-2 rounded bg-gray-900 text-white text-xs shadow-lg"
                        style={{ display: "none", whiteSpace: "nowrap" }}
                        role="tooltip"
                      >
                        Choose the AI model for generating the summary
                      </span>
                    </span>
                  </div>
                )}

                <label className="block text-sm font-medium mb-2 text-primary">
                  Select or drop your audio file
                </label>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 group",
                    dragActive ? "border-primary bg-primary/5" : "border-border",
                    file
                      ? ""
                      : "cursor-pointer hover:border-primary/70 hover:bg-primary/5 hover:shadow-lg"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  style={{ cursor: file ? "default" : "pointer" }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                    disabled={isProcessing}
                  />

                  {file ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <FileAudio className="h-12 w-12 mx-auto text-primary" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md hover:shadow-lg cursor-pointer"
                          title="Remove file"
                          style={{ cursor: "pointer" }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div>
                        <span className="font-medium">
                          {(() => {
                            // Truncate file name in the middle, keep extension
                            const name = file.name;
                            const maxLen = 28;
                            const dotIdx = name.lastIndexOf(".");
                            const ext = dotIdx !== -1 ? name.slice(dotIdx) : "";
                            const base = dotIdx !== -1 ? name.slice(0, dotIdx) : name;
                            if (name.length <= maxLen) return name;
                            const keep = Math.max(8, maxLen - ext.length - 5);
                            return (
                              base.slice(0, Math.ceil(keep / 2)) +
                              "..." +
                              base.slice(-Math.floor(keep / 2)) +
                              ext
                            );
                          })()}
                        </span>
                        <span className="text-sm text-muted-foreground"> - {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpload();
                          fileInputRef.current.value = ""; // Reset file input
                        }}
                        onMouseEnter={(e) => e.stopPropagation()}
                        onMouseLeave={(e) => e.stopPropagation()}
                        disabled={isProcessing}
                        className="w-full py-3 text-base font-bold rounded-lg bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all border-2 border-primary mt-2"
                        style={{
                          cursor: "pointer",
                          boxShadow: "0 4px 16px 0 rgba(80,80,200,0.10)",
                          letterSpacing: "0.02em",
                        }}
                        title="Upload the selected audio file for analysis"
                      >
                        {isProcessing ? (
                          <>
                            <LoaderPinwheel className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                          </>
                        )}
                      </Button>
                      {!fileInputRef.current && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Only MP3, WAV, or M4A audio files are supported. Max size: 100MB.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium">
                          Drop your audio file here
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Or click to browse files • Supports MP3, WAV, M4A
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* My Files Section */}
            <div className="space-y-6 w-full">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold flex items-center space-x-2">
                  <FileText className="h-6 w-6" />
                  <span>My Files</span>
                  {files.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {files.length}
                    </Badge>
                  )}
                </h2>
                <Input
                  type="text"
                  placeholder="Search files"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-40 ml-4"
                  style={{
                    minWidth: 120,
                  }}
                />
              </div>

              {files.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileAudio className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No files uploaded yet
                    </h3>
                    <p className="text-muted-foreground">
                      Upload your first audio file to get started with AI analysis
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div
                  className="space-y-4"
                  style={{
                    maxHeight: "600px",
                    overflowY: "auto",
                    overflowX: "hidden",
                  }}
                >
                  {filteredFiles.slice(0, 3).map((f) => {
                    const getStageIcon = (stage) => {
                      switch (stage) {
                        case "downloading_model":
                          return <Download className="h-3 w-3" />;
                        case "transcribing":
                          return <FileAudio className="h-3 w-3" />;
                        case "analyzing":
                          return <BarChart3 className="h-3 w-3" />;
                        case "complete":
                          return <CheckCircle className="h-3 w-3" />;
                        case "error":
                          return <AlertCircle className="h-3 w-3" />;
                        default:
                          return <LoaderPinwheel className="h-3 w-3" />;
                      }
                    };

                    const getStageText = (stage) => {
                      switch (stage) {
                        case "uploading":
                          return "Uploading";
                        case "downloading_model":
                          return "Downloading Model";
                        case "transcribing":
                          return "Transcribing";
                        case "analyzing":
                          return "Analyzing";
                        case "complete":
                          return "Complete";
                        case "error":
                          return "Error";
                        default:
                          return "Processing";
                      }
                    };

                    const formatFileSize = (bytes) => {
                      if (!bytes) return "Unknown size";
                      const mb = bytes / (1024 * 1024);
                      return `${mb.toFixed(1)} MB`;
                    };

                    const formatDuration = (seconds) => {
                      if (!seconds) return "Unknown duration";
                      const mins = Math.floor(seconds / 60);
                      const secs = Math.floor(seconds % 60);
                      return `${mins}:${secs.toString().padStart(2, "0")}`;
                    };

                    return (
                      <Card
                        key={f.id}
                        className={cn(
                          "cursor-pointer transition-all shadow-lg animate-slide-up border-2",
                          selected?.id === f.id
                            ? "border-4 border-primary ring-2 ring-primary bg-gradient-to-br from-primary/10 via-background to-primary/5 dark:from-primary/20 dark:via-background dark:to-primary/10 shadow-xl"
                            : "border border-border hover:border-primary/60 hover:shadow-xl bg-background dark:bg-background"
                        )}
                        onClick={() => {
                          setSelected(selected?.id === f.id ? null : f);
                        }}
                        style={{
                          cursor: "pointer",
                          transition: "box-shadow 0.2s, border-color 0.2s, background 0.2s, transform 0.2s",
                          boxShadow:
                            selected?.id === f.id
                              ? "0 6px 32px 0 rgba(80,80,200,0.13)"
                              : "0 2px 12px 0 rgba(80,80,200,0.07)",
                        }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle
                              className={cn(
                                "text-lg truncate pr-2 font-semibold",
                                selected?.id === f.id
                                  ? "text-primary"
                                  : "text-foreground"
                              )}
                            >
                              {f.filename}
                            </CardTitle>
                            <Badge
                              variant={
                                f.processing_stage === "complete"
                                  ? "success"
                                  : f.processing_stage === "error"
                                    ? "destructive"
                                    : "processing"
                              }
                              className={cn(
                                "shrink-0 px-2 py-1 rounded-full font-semibold text-xs flex items-center gap-1",
                                f.processing_stage === "complete"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                  : f.processing_stage === "error"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                              )}
                            >
                              {getStageIcon(f.processing_stage)}
                              <span className="ml-1">{getStageText(f.processing_stage)}</span>
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Progress Bar */}
                          {f.processing_stage !== "complete" &&
                            f.processing_stage !== "error" && (
                              <div className="flex items-center space-x-2 text-xs text-foreground">
                                <span>{getStageText(f.processing_stage)}</span>
                                <Progress
                                  value={f.progress_percentage || 0}
                                  className={cn(
                                    "h-2 flex-1 rounded-full",
                                    selected?.id === f.id
                                      ? "bg-primary/20"
                                      : "bg-muted"
                                  )}
                                />
                                <span className="font-medium">
                                  {f.progress_percentage || 0}%
                                </span>
                              </div>
                            )}

                          {/* Model Info for Complete Files */}
                          {f.processing_stage === "complete" &&
                            f.selected_model && (
                              <div className="flex items-center space-x-1 text-xs text-foreground">
                                <Cpu className="h-3 w-3" />
                                <span className="font-semibold">
                                  {f.selected_model.split("/").pop()}
                                </span>
                              </div>
                            )}

                          {/* File Metadata */}
                          <div className="flex items-center justify-between text-xs text-foreground">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <HardDrive className="h-3 w-3" />
                                <span>{formatFileSize(f.file_size)}</span>
                              </div>
                              {f.audio_duration && (
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDuration(f.audio_duration)}</span>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  window.confirm(
                                    `Are you sure you want to delete and stop processing '${f.filename}'?`
                                  )
                                ) {
                                  deleteFile(f.id);
                                }
                              }}
                              className="text-red-500 hover:text-red-600 transition-colors ml-2 rounded-full p-1 bg-red-50 dark:bg-red-900/40 hover:bg-red-100 dark:hover:bg-red-800"
                              title="Delete file"
                              style={{ cursor: "pointer" }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: File Details */}
          <div className="lg:col-span-2">
            {selected ? (
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Analysis: {selected.filename}</span>
                  </CardTitle>
                  <CardDescription>
                    Detailed analysis and insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selected.transcription ? (
                    <div className="space-y-6">
                      {/* Transcription */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>Transcription</span>
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {selected.transcription}
                          </p>
                        </div>
                        <div className="flex items-center justify-end text-sm text-gray-500">
                          <span>{selected.word_count || 0} words</span>
                        </div>
                      </div>

                      {/* Ask a Question */}
                      <AskQuestionSection audioId={selected.id} />

                      {/* Summary */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center space-x-2">
                          <BarChart3 className="h-4 w-4" />
                          <span>Summary</span>
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-sm leading-relaxed">
                            {selected.summary || "No summary available"}
                          </p>
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center space-x-2 ">
                          <MessageSquare className="h-4 w-4" />
                          <span>Generated Questions</span>
                        </h3>
                        <div className="bg-muted/50 rounded-lg p-4">
                          {selected.questions ? (
                            <div className="space-y-3">
                              {selected.questions
                                .split("\n")
                                .filter((q) => q.trim())
                                .map((question, index) => {
                                  // Remove any leading number and dot (e.g., "1. " or "2. ")
                                  const cleanQuestion = question.replace(/^\d+\.\s*/, "").trim();
                                  return (
                                    <div
                                      key={index}
                                      className="flex items-start space-x-3 p-3 bg-background/50 rounded-lg"
                                    >
                                      <div className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                        {index + 1}
                                      </div>
                                      <p className="text-sm leading-relaxed flex-1">
                                        {cleanQuestion}
                                      </p>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No questions generated
                            </p>
                          )}
                          {/* Generate more questions if auto-generate is off */}
                          <div className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mt-4 flex flex-col md:flex-row md:items-end gap-2">
                            <div className="flex-1 flex flex-col">
                              <label className="text-sm font-medium flex items-center space-x-2 mb-1">
                                <MessageSquare className="h-4 w-4" />
                                <span>Add more questions about this audio</span>
                                <div className="flex flex-col justify-end min-h-[1.5rem]">
                                  {errorMore && <span className="text-red-500 text-xs">{errorMore}</span>}
                                  {successMore && <span className="text-green-600 text-xs">{successMore}</span>}
                                </div>
                              </label>
                              <select
                                value={moreCount}
                                onChange={e => setMoreCount(Number(e.target.value))}
                                disabled={loadingMore}
                                className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                style={{ cursor: "pointer" }}
                              >
                                {[...Array(10)].map((_, i) => (
                                  <option
                                    key={i + 1}
                                    value={i + 1}
                                    className="bg-background text-foreground p-2"
                                    style={{
                                      backgroundColor: "hsl(var(--background))",
                                      color: "hsl(var(--foreground))",
                                    }}
                                  >
                                    {i + 1}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Button
                              onClick={() => handleGenerateMore(selected.id)}
                              disabled={loadingMore}
                              style={{ cursor: "pointer" }}
                              className="min-w-32 cursor-pointer hover:cursor-pointer border-2 border-primary bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-md hover:shadow-lg relative z-10 md:ml-2"
                            >
                              {loadingMore ? "Generating..." : "Generate More Questions"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      {selected.processing_stage === "error" ? (
                        <>
                          <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
                          <h3 className="text-lg font-medium mb-2 text-red-600">
                            Processing Failed
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            An error occurred while processing this file
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="relative mb-4">
                            {selected.processing_stage === "downloading_model" && (
                              <Download className="h-16 w-16 mx-auto text-blue-500 animate-pulse" />
                            )}
                            {selected.processing_stage === "transcribing" && (
                              <FileAudio className="h-16 w-16 mx-auto text-green-500 animate-pulse" />
                            )}
                            {selected.processing_stage === "analyzing" && (
                              <BarChart3 className="h-16 w-16 mx-auto text-purple-500 animate-pulse" />
                            )}
                            {![
                              "downloading_model",
                              "transcribing",
                              "analyzing",
                            ].includes(selected.processing_stage) && (
                                <LoaderPinwheel className="h-16 w-16 mx-auto text-muted-foreground animate-spin" />
                              )}
                          </div>
                          <h3 className="text-lg font-medium mb-2">
                            {selected.processing_stage === "downloading_model" &&
                              "Downloading AI Model"}
                            {selected.processing_stage === "transcribing" &&
                              "Transcribing Audio"}
                            {selected.processing_stage === "analyzing" &&
                              "Generating Analysis"}
                            {![
                              "downloading_model",
                              "transcribing",
                              "analyzing",
                            ].includes(selected.processing_stage) &&
                              "Processing Audio File"}
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {selected.processing_stage === "downloading_model" &&
                              "Preparing the AI model for analysis..."}
                            {selected.processing_stage === "transcribing" &&
                              "Converting speech to text..."}
                            {selected.processing_stage === "analyzing" &&
                              "Generating summary and questions..."}
                            {![
                              "downloading_model",
                              "transcribing",
                              "analyzing",
                            ].includes(selected.processing_stage) &&
                              "This may take a few moments depending on file size"}
                          </p>
                          <div className="max-w-xs mx-auto space-y-2">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{selected.progress_percentage || 0}%</span>
                            </div>
                            <Progress
                              value={selected.progress_percentage || 0}
                              className="h-2"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="flex flex-col items-center justify-center h-full min-h-[400px] animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No file selected
                  </h3>
                  <p className="text-muted-foreground text-center">
                    Select a file from the left to view its details and analysis.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
