import React, { useState, useEffect, useRef } from "react";
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
  Clock,
  CheckCircle,
  MessageSquare,
  FileText,
  BarChart3,
  Download,
  Cpu,
  AlertCircle,
  HardDrive,
} from "lucide-react";
import { cn, truncateText } from "./lib/utils";

export default function App() {
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const pollIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch("http://localhost:8000/files");
      const data = await res.json();
      console.log("Fetched files:", data);
      setFiles(data);

      // Check if there are any files still processing OR if selected file is still processing
      const hasProcessingFiles = data.some(
        (f) =>
          f.processing_stage !== "complete" && f.processing_stage !== "error"
      );
      const selectedFileProcessing =
        selected &&
        data.find(
          (f) =>
            f.id === selected.id &&
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
  };

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

  const startPolling = () => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(fetchFiles, 2000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (selectedModel) {
        form.append("selected_model", selectedModel);
      }
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

    // Set dark mode by default
    document.documentElement.classList.add("dark");

    return () => {
      stopPolling();
    };
  }, []);

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
                AI-Powered Audio Analysis
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
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
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isProcessing}
                  style={{
                    backgroundColor: "var(--background)",
                    color: "var(--foreground)",
                  }}
                >
                  {availableModels.map((model) => (
                    <option
                      key={model.name}
                      value={model.name}
                      className="bg-background text-foreground p-2"
                      style={{
                        backgroundColor: "hsl(var(--background))",
                        color: "hsl(var(--foreground))",
                      }}
                    >
                      {model.display_name || model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Choose the AI model for generating summaries and questions
                </p>
              </div>
            )}

            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                "cursor-pointer"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
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
                  <FileAudio className="h-12 w-12 mx-auto text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpload();
                    }}
                    disabled={isProcessing}
                    className="min-w-32 cursor-pointer hover:cursor-pointer border-2 border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {isProcessing ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
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

        {/* Processing Status */}
        {pollIntervalRef.current && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50 animate-slide-up">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Processing files in background...
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Analytics will appear automatically when ready
                  </p>
                </div>
              </div>
              <Progress value={60} className="mt-3 h-2" />
            </CardContent>
          </Card>
        )}

        {/* Files Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold flex items-center space-x-2">
              <FileText className="h-6 w-6" />
              <span>Uploaded Files</span>
              {files.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {files.length}
                </Badge>
              )}
            </h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map((f) => {
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
                      return <Clock className="h-3 w-3" />;
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
                      "transition-all duration-300 hover:scale-[1.02] shadow-lg animate-slide-up",
                      f.processing_stage === "complete"
                        ? "cursor-pointer"
                        : "cursor-default",
                      selected?.id === f.id
                        ? "bg-gray-50 dark:bg-gray-800 ring-2 ring-primary shadow-lg"
                        : ""
                    )}
                    onClick={() => {
                      if (f.processing_stage === "complete") {
                        setSelected(selected?.id === f.id ? null : f);
                      }
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg truncate pr-2 text-black dark:text-white">
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
                          className="shrink-0"
                        >
                          {getStageIcon(f.processing_stage)}
                          <span className="ml-1">
                            {getStageText(f.processing_stage)}
                          </span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Progress Bar */}
                      {f.processing_stage !== "complete" &&
                        f.processing_stage !== "error" && (
                          <div className="flex items-center space-x-2 text-xs text-black dark:text-white">
                            <span>{getStageText(f.processing_stage)}</span>
                            <Progress
                              value={f.progress_percentage || 0}
                              className="h-2 flex-1"
                            />
                            <span className="font-medium">
                              {f.progress_percentage || 0}%
                            </span>
                          </div>
                        )}

                      {/* File Metadata */}
                      <div className="flex items-center space-x-4 text-xs text-black dark:text-white">
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

                      {/* Model Info for Complete Files */}
                      {f.processing_stage === "complete" &&
                        f.selected_model && (
                          <div className="flex items-center space-x-1 text-xs text-black dark:text-white">
                            <Cpu className="h-3 w-3" />
                            <span>{f.selected_model.split("/").pop()}</span>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Analysis Details */}
        {selected && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Analysis: {selected.filename}</span>
              </CardTitle>
              <CardDescription>
                Detailed AI-powered analysis and insights
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
                    <div className="flex items-center text-sm text-gray-500">
                      <span>Word count: {selected.word_count || 0} words</span>
                    </div>
                  </div>

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
                    <h3 className="text-lg font-semibold flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Generated Questions</span>
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      {selected.questions ? (
                        <div className="space-y-3">
                          {selected.questions
                            .split("\n")
                            .filter((q) => q.trim())
                            .map((question, index) => (
                              <div
                                key={index}
                                className="flex items-start space-x-3 p-3 bg-background/50 rounded-lg"
                              >
                                <div className="flex items-center justify-center w-6 h-6 bg-primary/10 text-primary rounded-full text-xs font-medium">
                                  {index + 1}
                                </div>
                                <p className="text-sm leading-relaxed flex-1">
                                  {question.replace(/^\d+\.\s*/, "").trim()}
                                </p>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No questions generated
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
