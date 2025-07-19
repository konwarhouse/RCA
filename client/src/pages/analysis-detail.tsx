import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Settings, Download, Edit, History, MessageCircle } from "lucide-react";
import type { Analysis } from "@shared/schema";
import RCATreeVisualization from "@/components/rca-tree-visualization";
import EvidenceGathering from "@/components/evidence-gathering";
import ManualAdjustment from "@/components/manual-adjustment";
import ReportExport from "@/components/report-export";
import VersionHistory from "@/components/version-history";

export default function AnalysisDetail() {
  const [, params] = useRoute("/analysis/:id");
  const [activeTab, setActiveTab] = useState("overview");
  const [showManualAdjustment, setShowManualAdjustment] = useState(false);
  
  const analysisId = params?.id ? parseInt(params.id) : null;

  const { data: analysis, isLoading, error } = useQuery<Analysis>({
    queryKey: [`/api/analyses/${analysisId}`],
    enabled: !!analysisId,
    queryFn: async () => {
      const response = await fetch(`/api/analyses/${analysisId}`);
      if (!response.ok) throw new Error("Failed to fetch analysis");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load analysis</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "priority-high";
      case "medium": return "priority-medium";
      case "low": return "priority-low";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "confidence-high";
    if (confidence >= 70) return "confidence-medium";
    return "confidence-low";
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => window.history.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {analysis.analysisId}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {analysis.equipmentId} • {analysis.location}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getPriorityColor(analysis.priority || 'medium')}>
                {(analysis.priority || 'medium').toUpperCase()}
              </Badge>
              <Badge className={getConfidenceColor(analysis.confidence || 0)}>
                {analysis.confidence}% Confidence
              </Badge>
              <Button 
                variant="outline" 
                onClick={() => setShowManualAdjustment(!showManualAdjustment)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showManualAdjustment ? (
          <ManualAdjustment
            analysis={analysis}
            onSave={() => setShowManualAdjustment(false)}
            onCancel={() => setShowManualAdjustment(false)}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rca-tree">RCA Tree</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Analysis Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Issue Description</h4>
                      <p className="text-sm text-muted-foreground">{analysis.issueDescription}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Equipment Details</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div><strong>Type:</strong> {analysis.equipmentType}</div>
                        <div><strong>ID:</strong> {analysis.equipmentId}</div>
                        <div><strong>Location:</strong> {analysis.location}</div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Root Cause Analysis</h4>
                    <p className="text-sm text-muted-foreground">{analysis.rootCause}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {(analysis.recommendations || []).map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{analysis.confidence}%</div>
                      <div className="text-xs text-muted-foreground">Confidence Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{analysis.status}</div>
                      <div className="text-xs text-muted-foreground">Status</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {analysis.completedAt ? formatDate(analysis.completedAt) : 'In Progress'}
                      </div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Operating Parameters */}
              {analysis.operatingParameters && (
                <Card>
                  <CardHeader>
                    <CardTitle>Operating Parameters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(analysis.operatingParameters as any).map(([key, value]) => (
                        <div key={key} className="p-3 border rounded-lg">
                          <h4 className="font-medium text-sm mb-2 capitalize">{key}</h4>
                          {typeof value === 'object' && value !== null ? (
                            <div className="text-sm text-muted-foreground space-y-1">
                              {Object.entries(value).map(([k, v]) => (
                                <div key={k}><strong>{k}:</strong> {String(v)}</div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">{String(value)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rca-tree">
              <RCATreeVisualization 
                analysis={analysis}
                onEdit={() => setShowManualAdjustment(true)}
              />
            </TabsContent>

            <TabsContent value="evidence">
              <EvidenceGathering analysis={analysis} />
            </TabsContent>

            <TabsContent value="export">
              <ReportExport analysis={analysis} />
            </TabsContent>

            <TabsContent value="history">
              <VersionHistory analysis={analysis} />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Analysis Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Auto Re-analysis</h4>
                        <p className="text-sm text-muted-foreground">
                          Automatically trigger re-analysis when new evidence is added
                        </p>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Confidence Threshold</h4>
                        <p className="text-sm text-muted-foreground">
                          Minimum confidence score for auto-completion
                        </p>
                      </div>
                      <select className="border rounded px-3 py-1">
                        <option value="80">80%</option>
                        <option value="85">85%</option>
                        <option value="90">90%</option>
                        <option value="95">95%</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Notification Alerts</h4>
                        <p className="text-sm text-muted-foreground">
                          Send notifications for analysis status changes
                        </p>
                      </div>
                      <input type="checkbox" defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}