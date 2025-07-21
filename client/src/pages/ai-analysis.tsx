import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Brain, CheckCircle, AlertTriangle, ChevronRight, FileText, Zap, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Incident {
  id: number;
  title: string;
  equipmentGroup: string;
  equipmentType: string;
  equipmentId: string;
  symptoms: string;
  currentStep: number;
  workflowStatus: string;
  evidenceChecklist?: any[];
  evidenceFiles?: any[];
}

interface RootCause {
  id: string;
  description: string;
  confidence: number;
  category: string;
  evidence: string[];
  likelihood: "Very High" | "High" | "Medium" | "Low";
  impact: "Critical" | "High" | "Medium" | "Low";
  priority: number;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "Immediate" | "Short-term" | "Long-term";
  category: string;
  estimatedCost: string;
  timeframe: string;
  responsible: string;
  preventsProbability: number;
}

interface AnalysisResults {
  overallConfidence: number;
  analysisDate: Date;
  rootCauses: RootCause[];
  recommendations: Recommendation[];
  crossMatchResults: {
    libraryMatches: number;
    patternSimilarity: number;
    historicalData: string[];
  };
  evidenceGaps: string[];
  additionalInvestigation: string[];
}

export default function AIAnalysis() {
  const [, setLocation] = useLocation();
  const [incidentId, setIncidentId] = useState<number | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState<string>("initializing");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Extract incident ID from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('incident');
    if (id) {
      setIncidentId(parseInt(id));
    }
  }, []);

  // Fetch incident details
  const { data: incident, isLoading } = useQuery({
    queryKey: ['/api/incidents', incidentId],
    enabled: !!incidentId,
  });

  // Perform AI analysis
  const performAnalysisMutation = useMutation({
    mutationFn: async (incidentData: Incident) => {
      return apiRequest(`/api/incidents/${incidentData.id}/perform-analysis`, {
        method: 'POST',
        body: JSON.stringify({
          equipmentGroup: incidentData.equipmentGroup,
          equipmentType: incidentData.equipmentType,
          symptoms: incidentData.symptoms,
          evidenceChecklist: incidentData.evidenceChecklist,
          evidenceFiles: incidentData.evidenceFiles,
        }),
      });
    },
    onSuccess: (data) => {
      setAnalysisResults(data.analysis);
      setAnalysisPhase("completed");
      setAnalysisProgress(100);
      setIsAnalyzing(false);
    },
  });

  // Start analysis when incident loads
  useEffect(() => {
    if (incident && !analysisResults && !isAnalyzing) {
      setIsAnalyzing(true);
      simulateAnalysisProgress();
      performAnalysisMutation.mutate(incident);
    }
  }, [incident]);

  const simulateAnalysisProgress = () => {
    const phases = [
      { name: "Cross-matching with Evidence Library", duration: 2000 },
      { name: "Pattern Recognition Analysis", duration: 3000 },
      { name: "Root Cause Identification", duration: 4000 },
      { name: "Recommendation Generation", duration: 2000 },
      { name: "Confidence Scoring", duration: 1000 }
    ];

    let totalDuration = 0;
    phases.forEach((phase, index) => {
      setTimeout(() => {
        setAnalysisPhase(phase.name);
        setAnalysisProgress((index + 1) * 20);
      }, totalDuration);
      totalDuration += phase.duration;
    });
  };

  const handleProceedToReview = () => {
    if (incidentId) {
      setLocation(`/engineer-review?incident=${incidentId}`);
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/')}
              >
                ← Back to Home
              </Button>
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Steps 5-6: AI Analysis & Draft RCA</h1>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Incident #{incident.id}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analysis Progress */}
        {isAnalyzing && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 animate-spin" />
                AI Analysis in Progress
              </CardTitle>
              <CardDescription>
                Advanced root cause analysis using evidence library cross-matching and pattern recognition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{analysisPhase}</span>
                  <span className="text-sm text-muted-foreground">{analysisProgress}%</span>
                </div>
                <Progress value={analysisProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysisResults && (
          <div className="space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Analysis Complete
                    </CardTitle>
                    <CardDescription>
                      {incident.title} - {incident.equipmentGroup} → {incident.equipmentType}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">{analysisResults.overallConfidence}%</div>
                    <div className="text-sm text-muted-foreground">Confidence</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Tabs defaultValue="root-causes" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="root-causes">Root Causes</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                <TabsTrigger value="cross-match">Library Match</TabsTrigger>
                <TabsTrigger value="gaps">Evidence Gaps</TabsTrigger>
              </TabsList>

              <TabsContent value="root-causes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Identified Root Causes</CardTitle>
                    <CardDescription>
                      Ranked by confidence and impact assessment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysisResults.rootCauses.map((cause, index) => (
                      <div key={cause.id} className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">#{index + 1}</Badge>
                            <div>
                              <h4 className="font-semibold">{cause.description}</h4>
                              <p className="text-sm text-muted-foreground">{cause.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{cause.confidence}%</div>
                            <div className="text-xs text-muted-foreground">Confidence</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Likelihood</span>
                            <Badge variant={
                              cause.likelihood === "Very High" ? "destructive" :
                              cause.likelihood === "High" ? "default" :
                              cause.likelihood === "Medium" ? "secondary" : "outline"
                            } className="ml-2">
                              {cause.likelihood}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Impact</span>
                            <Badge variant={
                              cause.impact === "Critical" ? "destructive" :
                              cause.impact === "High" ? "default" :
                              cause.impact === "Medium" ? "secondary" : "outline"
                            } className="ml-2">
                              {cause.impact}
                            </Badge>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Supporting Evidence</span>
                          <ul className="mt-1 text-sm text-muted-foreground">
                            {cause.evidence.map((item, idx) => (
                              <li key={idx} className="list-disc list-inside">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Corrective Recommendations</CardTitle>
                    <CardDescription>
                      Prioritized action items to prevent recurrence
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysisResults.recommendations.map((rec, index) => (
                      <div key={rec.id} className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={
                                rec.priority === "Immediate" ? "destructive" :
                                rec.priority === "Short-term" ? "default" : "secondary"
                              }>
                                {rec.priority}
                              </Badge>
                              <h4 className="font-semibold">{rec.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-medium">{rec.estimatedCost}</div>
                            <div className="text-muted-foreground">{rec.timeframe}</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Category:</span> {rec.category}
                          </div>
                          <div>
                            <span className="font-medium">Responsible:</span> {rec.responsible}
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">Prevention Effectiveness:</span>
                            <Progress value={rec.preventsProbability} className="flex-1 h-2" />
                            <span className="text-xs text-muted-foreground">{rec.preventsProbability}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cross-match" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Evidence Library Cross-Match Results
                    </CardTitle>
                    <CardDescription>
                      Comparison with historical equipment failures and patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-3xl font-bold text-primary">{analysisResults.crossMatchResults.libraryMatches}</div>
                        <div className="text-sm text-muted-foreground">Similar Cases Found</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-3xl font-bold text-primary">{analysisResults.crossMatchResults.patternSimilarity}%</div>
                        <div className="text-sm text-muted-foreground">Pattern Similarity</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-3xl font-bold text-primary">{analysisResults.crossMatchResults.historicalData.length}</div>
                        <div className="text-sm text-muted-foreground">Historical References</div>
                      </div>
                    </div>
                    
                    {analysisResults.crossMatchResults.historicalData.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium mb-3">Historical Data References</h4>
                        <ul className="space-y-2">
                          {analysisResults.crossMatchResults.historicalData.map((ref, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              {ref}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="gaps" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Evidence Gaps & Additional Investigation
                    </CardTitle>
                    <CardDescription>
                      Areas requiring further investigation for complete analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {analysisResults.evidenceGaps.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-orange-700">Evidence Gaps Identified</h4>
                        <ul className="space-y-2">
                          {analysisResults.evidenceGaps.map((gap, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysisResults.additionalInvestigation.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-blue-700">Additional Investigation Recommended</h4>
                        <ul className="space-y-2">
                          {analysisResults.additionalInvestigation.map((item, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/evidence-collection?incident=${incidentId}`)}
              >
                ← Back to Evidence Collection
              </Button>
              <Button 
                onClick={handleProceedToReview}
                className="flex items-center gap-2"
              >
                Proceed to Engineer Review
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}