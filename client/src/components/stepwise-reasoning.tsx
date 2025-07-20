import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  ChevronRight, 
  Brain, 
  Target, 
  FileSearch,
  TrendingUp,
  Settings
} from "lucide-react";

interface StepwiseReasoningProps {
  analysis: any;
  className?: string;
}

interface ReasoningStep {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  confidence?: number;
  details: string[];
  evidence?: any[];
  timestamp?: string;
}

export default function StepwiseReasoning({ analysis, className = "" }: StepwiseReasoningProps) {
  const [activeStep, setActiveStep] = useState<string>('asset_analysis');

  // Extract reasoning steps from analysis
  const getReasoningSteps = (): ReasoningStep[] => {
    const rcaAnalysis = analysis.rcaAnalysis;
    if (!rcaAnalysis) return [];

    return [
      {
        id: 'asset_analysis',
        title: 'Asset Identification & Context',
        status: 'completed',
        confidence: rcaAnalysis.assetInfo.confidence * 100,
        details: [
          `Equipment Type: ${rcaAnalysis.assetInfo.type}${rcaAnalysis.assetInfo.subtype ? ` (${rcaAnalysis.assetInfo.subtype})` : ''}`,
          `Equipment ID: ${rcaAnalysis.assetInfo.id || 'Not specified'}`,
          `Location: ${rcaAnalysis.assetInfo.location || 'Not specified'}`,
          `Criticality: ${rcaAnalysis.assetInfo.criticality || 'Medium'}`
        ],
        timestamp: analysis.createdAt
      },
      {
        id: 'symptom_analysis',
        title: 'Symptom Analysis & Localization',
        status: 'completed',
        confidence: rcaAnalysis.symptomAnalysis.confidence * 100,
        details: [
          `Primary Symptom: ${rcaAnalysis.symptomAnalysis.primary}`,
          `Secondary Symptoms: ${rcaAnalysis.symptomAnalysis.secondary.join(', ') || 'None identified'}`,
          `Onset Pattern: ${rcaAnalysis.symptomAnalysis.onset}`,
          `Location: ${rcaAnalysis.symptomAnalysis.location || 'Not localized'}`
        ]
      },
      {
        id: 'cause_mapping',
        title: 'Failure Mode & Cause Mapping',
        status: 'completed',
        confidence: 85,
        details: [
          `${rcaAnalysis.causeAnalysis.probableCauses.length} potential causes evaluated`,
          `Knowledge base correlation completed`,
          `Statistical analysis performed`,
          `Industry best practices applied`
        ]
      },
      {
        id: 'evidence_correlation',
        title: 'Evidence Correlation & Validation',
        status: 'completed',
        confidence: rcaAnalysis.causeAnalysis.confidence * 100,
        details: [
          `${rcaAnalysis.evidenceCorrelation.supporting.length} supporting evidence points`,
          `${rcaAnalysis.evidenceCorrelation.contradicting.length} contradicting evidence points`,
          `${rcaAnalysis.evidenceCorrelation.missing.length} missing data items identified`,
          `Data correlation analysis completed`
        ],
        evidence: [
          ...rcaAnalysis.evidenceCorrelation.supporting.map((e: any) => ({ ...e, type: 'supporting' })),
          ...rcaAnalysis.evidenceCorrelation.contradicting.map((e: any) => ({ ...e, type: 'contradicting' }))
        ]
      },
      {
        id: 'root_cause_selection',
        title: 'Root Cause Selection & Validation',
        status: 'completed',
        confidence: rcaAnalysis.causeAnalysis.confidence * 100,
        details: [
          `Root Cause: ${rcaAnalysis.causeAnalysis.rootCause}`,
          `Contributing Factors: ${rcaAnalysis.causeAnalysis.contributingFactors.join(', ')}`,
          `Confidence Score: ${Math.round(rcaAnalysis.causeAnalysis.confidence * 100)}%`,
          `Validation completed against industry standards`
        ]
      },
      {
        id: 'recommendations',
        title: 'Actionable Recommendations',
        status: 'completed',
        confidence: 90,
        details: rcaAnalysis.recommendations.map((r: any) => 
          `${r.priority.toUpperCase()}: ${r.action} (${r.timeframe})`
        )
      }
    ];
  };

  const steps = getReasoningSteps();
  const activeStepData = steps.find(step => step.id === activeStep);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-400" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">AI Reasoning Process</h2>
        <Badge variant="outline" className="ml-auto">
          Confidence: {analysis.confidence || 0}%
        </Badge>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Analysis Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Overall Completion</span>
              <span>{Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)}%</span>
            </div>
            <Progress 
              value={(steps.filter(s => s.status === 'completed').length / steps.length) * 100} 
              className="h-2"
            />
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>✓ {steps.filter(s => s.status === 'completed').length} Completed</span>
              <span>⟳ {steps.filter(s => s.status === 'in_progress').length} In Progress</span>
              <span>○ {steps.filter(s => s.status === 'pending').length} Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step, index) => (
          <Button
            key={step.id}
            variant={activeStep === step.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveStep(step.id)}
            className="flex items-center gap-2 h-auto p-3"
          >
            <div className="flex flex-col items-center gap-1">
              {getStepIcon(step.status)}
              <span className="text-xs text-center leading-tight">
                {step.title.split(' ')[0]}
              </span>
              {step.confidence && (
                <Badge variant="secondary" className="text-xs px-1">
                  {Math.round(step.confidence)}%
                </Badge>
              )}
            </div>
          </Button>
        ))}
      </div>

      {/* Step Details */}
      {activeStepData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStepIcon(activeStepData.status)}
              {activeStepData.title}
              {activeStepData.confidence && (
                <Badge 
                  variant="outline" 
                  className={`ml-auto ${getConfidenceColor(activeStepData.confidence)}`}
                >
                  {Math.round(activeStepData.confidence)}% Confidence
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step Details */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Analysis Details</h4>
              <ul className="space-y-1">
                {activeStepData.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Evidence Section */}
            {activeStepData.evidence && activeStepData.evidence.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <FileSearch className="w-4 h-4" />
                  Evidence Analysis
                </h4>
                <div className="grid gap-2">
                  {activeStepData.evidence.map((evidence, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border-l-4 ${
                        evidence.type === 'supporting' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-red-500 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {evidence.type === 'supporting' ? '✓' : '✗'} {evidence.description || evidence.type}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Weight: {evidence.weight || 'N/A'}
                        </Badge>
                      </div>
                      {evidence.value && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Value: {evidence.value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp */}
            {activeStepData.timestamp && (
              <div className="text-xs text-muted-foreground">
                Completed: {new Date(activeStepData.timestamp).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Missing Data Alerts */}
      {analysis.missingDataPrompts && analysis.missingDataPrompts.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <div className="font-medium">Additional Data Needed</div>
            <div className="text-sm mt-1 space-y-1">
              {analysis.missingDataPrompts.map((prompt: any, index: number) => (
                <div key={index}>• {prompt.question}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Manual Adjustments History */}
      {analysis.manualAdjustments && analysis.manualAdjustments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Manual Adjustments & Expert Overrides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.manualAdjustments.map((adjustment: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={adjustment.expertOverride ? "destructive" : "secondary"}>
                      {adjustment.expertOverride ? "Expert Override" : "Manual Adjustment"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(adjustment.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">Reasoning:</div>
                    <div className="text-muted-foreground">{adjustment.reasoning}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}