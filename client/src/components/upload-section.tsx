import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ProcessingStatus from "./processing-status";
import { CloudUpload, FileText, X, Play } from "lucide-react";

interface UploadedFile {
  file: File;
  id: string;
}

export default function UploadSection() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [issueDescription, setIssueDescription] = useState("");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createAnalysisMutation = useMutation({
    mutationFn: async ({ files, description }: { files: File[]; description: string }) => {
      const formData = new FormData();
      formData.append("issueDescription", description);
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/analyses", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to create analysis");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setCurrentAnalysisId(data.id);
      setUploadedFiles([]);
      setIssueDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      toast({
        title: "Analysis Started",
        description: "Your files have been uploaded and analysis has begun.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your files. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/pdf": [".pdf"],
      "application/json": [".json"],
      "text/plain": [".txt"],
    },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAnalyze = () => {
    if (uploadedFiles.length === 0 || !issueDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please upload files and provide an issue description.",
        variant: "destructive",
      });
      return;
    }

    createAnalysisMutation.mutate({
      files: uploadedFiles.map((f) => f.file),
      description: issueDescription,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Work Order Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Issue Description */}
          <div className="space-y-2">
            <Label htmlFor="issue-description">Issue Description</Label>
            <Input
              id="issue-description"
              placeholder="Describe the issue you want to analyze..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
            />
          </div>

          {/* Drag and Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary"
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto bg-muted rounded-lg flex items-center justify-center">
                <CloudUpload className="text-muted-foreground text-xl" />
              </div>
              <div>
                <p className="text-foreground font-medium">
                  {isDragActive
                    ? "Drop files here..."
                    : "Drag and drop files here, or click to browse"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports CSV, Excel, PDF, JSON, and TXT files
                </p>
              </div>
            </div>
          </div>

          {/* Supported Formats */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">CSV</Badge>
            <Badge variant="secondary">Excel</Badge>
            <Badge variant="secondary">PDF</Badge>
            <Badge variant="secondary">JSON</Badge>
            <Badge variant="secondary">TXT</Badge>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Uploaded Files</h3>
              <div className="space-y-2">
                {uploadedFiles.map((uploadedFile) => (
                  <div
                    key={uploadedFile.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="text-muted-foreground" size={16} />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadedFile.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={
              uploadedFiles.length === 0 ||
              !issueDescription.trim() ||
              createAnalysisMutation.isPending
            }
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            {createAnalysisMutation.isPending ? "Starting Analysis..." : "Start Analysis"}
          </Button>
        </CardContent>
      </Card>

      {/* AI Processing Section */}
      <ProcessingStatus analysisId={currentAnalysisId} />
    </div>
  );
}
