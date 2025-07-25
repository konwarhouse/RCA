import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { FileText, Brain, CheckCircle, AlertTriangle, X, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  categoryId: string;
  description?: string;
  uploadedAt: string;
  universalAnalysis?: {
    success: boolean;
    fileType: string;
    analysisEngine: string;
    aiSummary: string;
    adequacyScore: number;
    userPrompt: string;
    confidence: number;
    missingRequirements?: string[];
  };
  reviewStatus?: 'UNREVIEWED' | 'ACCEPTED' | 'NEEDS_MORE_INFO' | 'REPLACED';
  reviewComments?: string;
}

interface Incident {
  id: number;
  title: string;
  equipmentGroup: string;
  equipmentType: string;
  equipmentSubtype?: string;
  evidenceFiles: EvidenceFile[];
}

export default function HumanReview() {
  const [, setLocation] = useLocation();
  const [incidentId, setIncidentId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);
  const [reviewComments, setReviewComments] = useState("");

  // Extract incident ID from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('incident');
    if (id) {
      setIncidentId(parseInt(id));
    } else {
      // Extract from path: /incidents/:id/human-review
      const pathParts = window.location.pathname.split('/');
      const incidentIndex = pathParts.indexOf('incidents');
      if (incidentIndex >= 0 && pathParts[incidentIndex + 1]) {
        const extractedId = parseInt(pathParts[incidentIndex + 1]);
        if (!isNaN(extractedId)) {
          setIncidentId(extractedId);
        }
      }
    }
  }, []);

  // Fetch incident details with evidence files
  const { data: incident, isLoading, refetch } = useQuery({
    queryKey: ['/api/incidents', incidentId],
    enabled: !!incidentId,
  });

  // Action mutations for human review
  const acceptFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/incidents/${incidentId}/human-review/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, comments: reviewComments })
      });
      
      if (!response.ok) {
        throw new Error('Failed to accept file');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setReviewComments("");
      refetch();
    }
  });

  const requestMoreInfoMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/incidents/${incidentId}/human-review/need-more-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, comments: reviewComments })
      });
      
      if (!response.ok) {
        throw new Error('Failed to request more info');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setReviewComments("");
      refetch();
    }
  });

  const replaceFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/incidents/${incidentId}/human-review/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, comments: reviewComments })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark for replacement');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setReviewComments("");
      refetch();
    }
  });

  // Check if can proceed to RCA
  const { data: canProceedData } = useQuery({
    queryKey: [`/api/incidents/${incidentId}/can-proceed-to-rca`],
    enabled: !!incidentId
  });

  const proceedToRCAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/incidents/${incidentId}/post-evidence-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error('Failed to proceed to RCA');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setLocation(`/incidents/${incidentId}/analysis`);
    }
  });

  if (isLoading || !incident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading incident details...</p>
        </div>
      </div>
    );
  }

  // Fix: Evidence files are stored in evidenceResponses, not evidenceFiles
  const evidenceFiles = (incident.evidenceResponses || []).map((response: any, index: number) => ({
    id: response.id || `file-${index}`,
    name: response.name || 'unknown',
    size: response.size || 0,
    type: response.type || 'text/plain',
    categoryId: response.categoryId || 'general',
    description: response.description,
    uploadedAt: response.uploadedAt || new Date().toISOString(),
    universalAnalysis: response.universalAnalysis,
    reviewStatus: response.reviewStatus || 'UNREVIEWED',
    reviewComments: response.reviewComments
  }));
  const reviewedFiles = evidenceFiles.filter(f => f.reviewStatus && f.reviewStatus !== 'UNREVIEWED').length;
  const acceptedFiles = evidenceFiles.filter(f => f.reviewStatus === 'ACCEPTED').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation(`/evidence-collection?incident=${incidentId}`)}
              >
                ← Back to Evidence Collection
              </Button>
              <div className="flex items-center space-x-2">
                <img 
                  src="/quanntaum-logo.jpg" 
                  alt="Quanntaum Logo" 
                  className="h-5 w-5 rounded object-contain"
                />
                <h1 className="text-xl font-bold">Stage 3B: Mandatory Human Review</h1>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Incident #{incident.id}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Human Review Panel
                </CardTitle>
                <CardDescription>
                  Review all uploaded evidence files before proceeding to RCA analysis
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{reviewedFiles}/{evidenceFiles.length}</div>
                <div className="text-sm text-muted-foreground">Files Reviewed</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Equipment Context */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Equipment:</strong> {incident.equipmentGroup} → {incident.equipmentType} 
            {incident.equipmentSubtype && ` → ${incident.equipmentSubtype}`}
            <br />
            <strong>Incident:</strong> {incident.title}
          </AlertDescription>
        </Alert>

        {/* Evidence Files Review */}
        {evidenceFiles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">No Evidence Files Found</p>
              <p className="text-muted-foreground">Please upload evidence files first.</p>
              <Button 
                className="mt-4"
                onClick={() => setLocation(`/evidence-collection?incident=${incidentId}`)}
              >
                Go to Evidence Collection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Files List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Evidence Files ({evidenceFiles.length})</h2>
              {evidenceFiles.map((file) => (
                <Card 
                  key={file.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedFile?.id === file.id ? 'ring-2 ring-primary' : ''
                  } ${
                    file.reviewStatus === 'ACCEPTED' ? 'border-green-300 bg-green-50' :
                    file.reviewStatus === 'NEEDS_MORE_INFO' ? 'border-amber-300 bg-amber-50' :
                    file.reviewStatus === 'REPLACED' ? 'border-red-300 bg-red-50' :
                    'border-gray-300'
                  }`}
                  onClick={() => setSelectedFile(file)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.reviewStatus === 'ACCEPTED' && (
                          <Badge className="bg-green-100 text-green-800">Accepted</Badge>
                        )}
                        {file.reviewStatus === 'NEEDS_MORE_INFO' && (
                          <Badge className="bg-amber-100 text-amber-800">Needs More Info</Badge>
                        )}
                        {file.reviewStatus === 'REPLACED' && (
                          <Badge className="bg-red-100 text-red-800">Replaced</Badge>
                        )}
                        {!file.reviewStatus || file.reviewStatus === 'UNREVIEWED' && (
                          <Badge variant="outline">Unreviewed</Badge>
                        )}
                      </div>
                    </div>
                    
                    {file.universalAnalysis && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium">Analysis Summary:</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {file.universalAnalysis.aiSummary}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs">
                            Engine: {file.universalAnalysis.analysisEngine}
                          </span>
                          <span className="text-xs">
                            Adequacy: {file.universalAnalysis.adequacyScore}%
                          </span>
                          <span className="text-xs">
                            Confidence: {file.universalAnalysis.confidence}%
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Review Panel */}
            <div className="lg:sticky lg:top-4">
              {selectedFile ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Review: {selectedFile.name}</CardTitle>
                    <CardDescription>
                      Assess the quality and adequacy of this evidence file
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedFile.universalAnalysis && (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">AI Analysis Summary</Label>
                          <div className="p-3 bg-muted rounded-lg mt-1">
                            <p className="text-sm">{selectedFile.universalAnalysis.aiSummary}</p>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">AI Recommendations</Label>
                          <div className="p-3 bg-muted rounded-lg mt-1">
                            <p className="text-sm">{selectedFile.universalAnalysis.userPrompt}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-sm font-medium">Analysis Engine</p>
                            <p className="text-sm text-muted-foreground">{selectedFile.universalAnalysis.analysisEngine}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Adequacy Score</p>
                            <p className="text-sm text-muted-foreground">{selectedFile.universalAnalysis.adequacyScore}%</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Confidence</p>
                            <p className="text-sm text-muted-foreground">{selectedFile.universalAnalysis.confidence}%</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="review-comments">Your Review Comments</Label>
                      <Textarea
                        id="review-comments"
                        placeholder="Add your review comments, observations, or feedback about this evidence file..."
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    {/* Review Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full"
                        onClick={() => acceptFileMutation.mutate(selectedFile.id)}
                        disabled={acceptFileMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept File as Valid for RCA
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => requestMoreInfoMutation.mutate(selectedFile.id)}
                        disabled={requestMoreInfoMutation.isPending}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Request More Information
                      </Button>
                      
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => replaceFileMutation.mutate(selectedFile.id)}
                        disabled={replaceFileMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Mark for Replacement
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">Select a File to Review</p>
                    <p className="text-muted-foreground">Click on any evidence file to start reviewing</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Proceed to RCA Button */}
        {evidenceFiles.length > 0 && (
          <div className="mt-8 flex justify-center">
            {canProceedData?.canProceed ? (
              <Button
                size="lg"
                onClick={() => proceedToRCAMutation.mutate()}
                disabled={proceedToRCAMutation.isPending}
                className="flex items-center gap-2"
              >
                {proceedToRCAMutation.isPending ? (
                  <>
                    <Brain className="h-5 w-5 animate-spin" />
                    Starting RCA Analysis...
                  </>
                ) : (
                  <>
                    Proceed to RCA Analysis (Stage 5-6)
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            ) : (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Human Review Required:</strong> {canProceedData?.reason || 'Please review and accept all evidence files before proceeding to RCA analysis.'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
}