import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  FileText, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  MapPin,
  Settings,
  BarChart3,
  Download,
  History,
  Zap
} from "lucide-react";

export default function AnalysisDetails() {
  const { incidentId } = useParams<{ incidentId: string }>();
  
  const { data: incident, isLoading: incidentLoading } = useQuery({
    queryKey: [`/api/incidents/${incidentId}`],
    enabled: !!incidentId,
  });

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: [`/api/incidents/${incidentId}/analysis`],
    enabled: !!incidentId,
  });

  const { data: summaryReport, isLoading: reportLoading } = useQuery({
    queryKey: [`/api/incidents/${incidentId}/summary-report`],
    enabled: !!incidentId,
  });

  if (incidentLoading || analysisLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analysis details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Incident not found.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis || Object.keys(analysis).length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Analysis data not available. Please complete the analysis first.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const confidenceColor = analysis.overallConfidence >= 80 ? "text-green-600" : 
                         analysis.overallConfidence >= 60 ? "text-yellow-600" : "text-red-600";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'finalized':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'analysis_complete':
        return <Badge className="bg-blue-100 text-blue-800">Analysis Complete</Badge>;
      case 'under_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">In Progress</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analysis Details</h1>
            <p className="text-gray-600">
              {incident.equipmentId} • {incident.equipmentGroup} → {incident.equipmentType}
              {incident.equipmentSubtype ? ` → ${incident.equipmentSubtype}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Confidence:</span>
              <span className={`text-2xl font-bold ${confidenceColor}`}>
                {analysis.overallConfidence}%
              </span>
            </div>
            {getStatusBadge(incident.workflowStatus)}
          </div>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Analysis Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="diagrams">Diagrams</TabsTrigger>
          <TabsTrigger value="rca-tree">RCA Tree</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="reasoning">AI Reasoning</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Issue Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Issue Description
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{incident.title}</h4>
                  <p className="text-gray-600 mt-2">{incident.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Reported:</span>
                    <p className="font-medium">{formatDate(incident.incidentDateTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <p className="font-medium">{incident.priority}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equipment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Equipment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <p className="font-medium">
                    {incident.equipmentGroup} → {incident.equipmentType}
                    {incident.equipmentSubtype ? ` → ${incident.equipmentSubtype}` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">ID:</span>
                  <p className="font-medium">{incident.equipmentId}</p>
                </div>
                <div>
                  <span className="text-gray-500">Location:</span>
                  <p className="font-medium">{incident.location}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Root Cause Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Root Cause Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.rootCauses && analysis.rootCauses.length > 0 ? (
                <div className="space-y-4">
                  {analysis.rootCauses.map((cause: any, index: number) => (
                    <div key={cause.id || index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{cause.description}</h4>
                        <Badge variant="outline" className="ml-2">
                          {cause.confidence}% confidence
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        <span className="font-medium">Category:</span> {cause.category} • 
                        <span className="font-medium ml-2">Impact:</span> {cause.impact} • 
                        <span className="font-medium ml-2">Likelihood:</span> {cause.likelihood}
                      </div>
                      {cause.evidence && cause.evidence.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Evidence:</span>
                          <ul className="text-sm text-gray-600 ml-4 mt-1">
                            {cause.evidence.map((item: string, idx: number) => (
                              <li key={idx} className="list-disc">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No root causes identified yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.recommendations && analysis.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {analysis.recommendations.map((rec: any, index: number) => (
                    <div key={rec.id || index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                        <Badge variant={rec.priority === 'Immediate' ? 'destructive' : 
                                     rec.priority === 'Short-term' ? 'default' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{rec.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Cost:</span>
                          <p className="font-medium">{rec.estimatedCost}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Timeframe:</span>
                          <p className="font-medium">{rec.timeframe}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Responsible:</span>
                          <p className="font-medium">{rec.responsible}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Prevention:</span>
                          <p className="font-medium">{rec.preventsProbability}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No recommendations available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evidence Collection Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {incident.evidenceChecklist && incident.evidenceChecklist.length > 0 ? (
                <div className="space-y-4">
                  {incident.evidenceChecklist.map((item: any, index: number) => (
                    <div key={item.id || index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="mt-0.5">
                        {item.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {item.priority} Priority
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                        {item.files && item.files.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-500">Files: </span>
                            <span className="text-xs">{item.files.length} uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No evidence checklist available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Reasoning Tab */}
        <TabsContent value="reasoning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analysis Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.crossMatchResults && (
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {analysis.crossMatchResults.libraryMatches || 0}
                    </div>
                    <div className="text-sm text-gray-500">Library Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analysis.crossMatchResults.patternSimilarity || 0}%
                    </div>
                    <div className="text-sm text-gray-500">Pattern Similarity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {analysis.overallConfidence}%
                    </div>
                    <div className="text-sm text-gray-500">Overall Confidence</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {analysis.evidenceGaps && analysis.evidenceGaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Evidence Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.evidenceGaps.map((gap: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="text-gray-700">{gap}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {analysis.crossMatchResults?.historicalData && analysis.crossMatchResults.historicalData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historical References
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.crossMatchResults.historicalData.map((ref: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-gray-700">{ref}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <p className="text-sm text-gray-600">Generate comprehensive reports in various formats</p>
            </CardHeader>
            <CardContent>
              {!reportLoading && summaryReport ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-12 flex items-center gap-3" variant="outline">
                    <FileText className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Summary Report</div>
                      <div className="text-xs text-gray-500">Comprehensive 9-section report</div>
                    </div>
                  </Button>
                  <Button className="h-12 flex items-center gap-3" variant="outline">
                    <Download className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Export PDF</div>
                      <div className="text-xs text-gray-500">Professional format</div>
                    </div>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Preparing export options...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Investigation Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium">Analysis Completed</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(analysis.analysisDate)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium">Investigation Started</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(incident.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}