import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, ChevronRight, Upload, FileText, Brain } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { EvidenceData, QuestionDefinition } from "@shared/schema";

// Question definitions from the Evidence Engine
const BASE_QUESTIONS: QuestionDefinition[] = [
  // Phase 1: Asset Context
  {
    id: "equipment_type",
    phase: "Asset Context",
    text: "What is the equipment type?",
    type: "select",
    options: ["valve", "pump", "motor", "compressor", "conveyor", "fan", "heat_exchanger", "turbine", "gearbox", "bearing", "reactor", "vessel", "other"],
    required: true
  },
  {
    id: "equipment_subtype", 
    phase: "Asset Context",
    text: "What is the specific subtype or model?",
    type: "text",
    required: false
  },
  {
    id: "main_function",
    phase: "Asset Context", 
    text: "What is the equipment's main function/service?",
    type: "text",
    required: false
  },
  {
    id: "location",
    phase: "Asset Context",
    text: "Where is the equipment located? (site, plant area, line number, asset ID)",
    type: "text", 
    required: true
  },
  {
    id: "in_service_since",
    phase: "Asset Context",
    text: "When was this equipment put in service?",
    type: "date",
    required: false
  },
  
  // Phase 2: Symptom Definition
  {
    id: "observed_problem",
    phase: "Symptom Definition",
    text: "What is the observed problem/symptom?",
    type: "select",
    options: ["leak", "noise", "high vibration", "low output", "failure to start", "trip", "overheating", "excessive wear", "contamination", "other"],
    required: true
  },
  {
    id: "symptom_location",
    phase: "Symptom Definition", 
    text: "Where is the symptom observed? (specific location)",
    type: "text",
    required: false
  },
  {
    id: "first_noticed",
    phase: "Symptom Definition",
    text: "When was the problem first noticed?",
    type: "date",
    required: false
  },
  {
    id: "problem_pattern",
    phase: "Symptom Definition",
    text: "Is the problem constant, intermittent, or recurring?",
    type: "select",
    options: ["constant", "intermittent", "recurring", "one-time event"],
    required: false
  },

  // Phase 3: Operating Conditions
  {
    id: "current_flow_rate",
    phase: "Operating Conditions",
    text: "Current flow rate (if applicable)",
    type: "number",
    required: false
  },
  {
    id: "current_pressure_upstream", 
    phase: "Operating Conditions",
    text: "Current upstream pressure (if applicable)",
    type: "number",
    required: false
  },
  {
    id: "current_temperature_inlet",
    phase: "Operating Conditions",
    text: "Current inlet temperature (if applicable)",
    type: "number", 
    required: false
  },
  {
    id: "current_vibration_level",
    phase: "Operating Conditions", 
    text: "Current vibration level (if applicable)",
    type: "number",
    required: false
  },
  {
    id: "recent_process_changes",
    phase: "Operating Conditions",
    text: "Have any process or control conditions changed recently?",
    type: "text",
    required: false
  },

  // Phase 4: Maintenance History
  {
    id: "last_maintenance_date",
    phase: "Maintenance History", 
    text: "When was the last maintenance performed?",
    type: "date",
    required: false
  },
  {
    id: "last_maintenance_type",
    phase: "Maintenance History",
    text: "Type of last maintenance",
    type: "select",
    options: ["preventive", "corrective", "overhaul", "inspection", "unknown"],
    required: false
  },
  {
    id: "recent_parts_replaced",
    phase: "Maintenance History",
    text: "What parts/components were recently replaced or adjusted?",
    type: "text", 
    required: false
  },
  {
    id: "similar_problems_history", 
    phase: "Maintenance History",
    text: "Is there a history of similar problems/failures on this equipment?",
    type: "text",
    required: false
  },

  // Phase 5: Human Factors
  {
    id: "operator_at_failure",
    phase: "Human Factors",
    text: "Who was operating the equipment when the issue occurred?",
    type: "text",
    required: false
  },
  {
    id: "operator_experience",
    phase: "Human Factors", 
    text: "Operator experience level",
    type: "select",
    options: ["experienced", "new", "in training", "unknown"],
    required: false
  },

  // Phase 6: External Factors
  {
    id: "installation_compliance",
    phase: "External Factors",
    text: "Is the equipment installed according to manufacturer specifications?",
    type: "select",
    options: ["yes", "no", "unknown"],
    required: false
  },
  {
    id: "external_factors",
    phase: "External Factors", 
    text: "Any external factors that could have contributed? (weather, vibration, construction, etc.)",
    type: "text",
    required: false
  },

  // Phase 7: Additional Evidence
  {
    id: "photos_available",
    phase: "Additional Evidence",
    text: "Are photos or videos available?", 
    type: "boolean",
    required: false
  },
  {
    id: "other_observations",
    phase: "Additional Evidence",
    text: "Anything else observed or suspected that might be relevant?",
    type: "text",
    required: false
  }
];

// Equipment-specific follow-up questions
const EQUIPMENT_SPECIFIC_QUESTIONS: Record<string, QuestionDefinition[]> = {
  valve: [
    {
      id: "valve_actuator_type",
      phase: "Equipment Specific",
      text: "What type of actuator?",
      type: "select",
      options: ["manual", "electric", "pneumatic", "hydraulic"],
      required: false
    },
    {
      id: "valve_leak_location",
      phase: "Equipment Specific", 
      text: "Where is the leak located?",
      type: "select",
      options: ["seat", "stem", "body", "bonnet", "unknown"],
      required: false
    }
  ],
  pump: [
    {
      id: "pump_type",
      phase: "Equipment Specific",
      text: "What type of pump?",
      type: "select",
      options: ["centrifugal", "reciprocating", "screw", "diaphragm", "other"],
      required: false
    },
    {
      id: "pump_cavitation_signs",
      phase: "Equipment Specific",
      text: "Were there signs of cavitation?",
      type: "boolean",
      required: false
    }
  ],
  motor: [
    {
      id: "motor_overcurrent_trip",
      phase: "Equipment Specific",
      text: "Was there an overcurrent/trip event?",
      type: "boolean",
      required: false
    }
  ]
};

export default function EvidenceCollection() {
  const [match, params] = useRoute("/evidence/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentPhase, setCurrentPhase] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState("questionnaire");

  // Get analysis data
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["/api/analyses", params?.id],
    enabled: !!params?.id
  });

  // Initialize answers from existing evidence data
  useEffect(() => {
    if (analysis?.evidenceData) {
      // Convert structured evidence back to flat answers format
      const flatAnswers: Record<string, any> = {};
      const evidence = analysis.evidenceData as EvidenceData;
      
      // Map evidence data back to question answers
      flatAnswers.equipment_type = evidence.assetContext.equipmentType;
      flatAnswers.equipment_subtype = evidence.assetContext.subtype;
      flatAnswers.location = evidence.assetContext.location;
      flatAnswers.observed_problem = evidence.symptomDefinition.observedProblem;
      flatAnswers.symptom_location = evidence.symptomDefinition.symptomLocation;
      // Add more mappings as needed...
      
      setAnswers(flatAnswers);
    }
  }, [analysis]);

  // Group questions by phase
  const phases = [
    "Asset Context",
    "Symptom Definition", 
    "Operating Conditions",
    "Maintenance History",
    "Human Factors",
    "External Factors",
    "Additional Evidence"
  ];

  const getQuestionsForPhase = (phase: string) => {
    const baseQuestions = BASE_QUESTIONS.filter(q => q.phase === phase);
    
    // Add equipment-specific questions if we're on the last phase and have equipment type
    if (phase === "Additional Evidence" && answers.equipment_type) {
      const equipmentQuestions = EQUIPMENT_SPECIFIC_QUESTIONS[answers.equipment_type] || [];
      return [...baseQuestions, ...equipmentQuestions];
    }
    
    return baseQuestions;
  };

  const currentPhaseQuestions = getQuestionsForPhase(phases[currentPhase] || "Asset Context");

  // Calculate progress
  const totalQuestions = BASE_QUESTIONS.length + (answers.equipment_type ? EQUIPMENT_SPECIFIC_QUESTIONS[answers.equipment_type]?.length || 0 : 0);
  const answeredQuestions = Object.keys(answers).filter(key => answers[key] !== "" && answers[key] !== null && answers[key] !== undefined).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  // Check if required questions are answered
  const requiredAnswered = BASE_QUESTIONS
    .filter(q => q.required)
    .every(q => answers[q.id]);

  const canProceedToAnalysis = requiredAnswered && answeredQuestions >= 5; // Minimum threshold

  // Update answer
  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Save evidence data
  const saveEvidenceMutation = useMutation({
    mutationFn: async () => {
      if (!params?.id) throw new Error("No analysis ID");
      
      // Structure the answers into EvidenceData format
      const evidenceData: Partial<EvidenceData> = {
        assetContext: {
          equipmentType: answers.equipment_type || "",
          subtype: answers.equipment_subtype,
          mainFunction: answers.main_function,
          location: answers.location || ""
        },
        symptomDefinition: {
          observedProblem: answers.observed_problem || "",
          symptomLocation: answers.symptom_location,
          problemPattern: answers.problem_pattern
        },
        operatingConditions: {
          currentParameters: {
            flow: answers.current_flow_rate ? { rate: answers.current_flow_rate } : undefined,
            pressure: { upstream: answers.current_pressure_upstream },
            temperature: { inlet: answers.current_temperature_inlet },
            vibration: answers.current_vibration_level ? { horizontal: answers.current_vibration_level } : undefined
          }
        },
        maintenanceHistory: {
          lastMaintenance: {
            date: answers.last_maintenance_date,
            type: answers.last_maintenance_type
          }
        },
        completedPhases: phases.slice(0, currentPhase + 1),
        requiredFollowUps: []
      };

      return apiRequest(`/api/analyses/${params.id}/evidence`, {
        method: "PUT",
        body: JSON.stringify({ evidenceData, answers })
      });
    },
    onSuccess: () => {
      toast({
        title: "Evidence Saved",
        description: "Your evidence data has been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses", params?.id] });
    }
  });

  // Proceed to AI Analysis
  const proceedToAnalysisMutation = useMutation({
    mutationFn: async () => {
      if (!params?.id) throw new Error("No analysis ID");
      
      return apiRequest(`/api/analyses/${params.id}/proceed-to-analysis`, {
        method: "POST",
        body: JSON.stringify({ answers })
      });
    },
    onSuccess: () => {
      toast({
        title: "Analysis Started",
        description: "AI analysis has begun based on your evidence."
      });
      setLocation(`/analysis/${params?.id}`);
    }
  });

  const renderQuestion = (question: QuestionDefinition) => {
    const value = answers[question.id] || "";

    switch (question.type) {
      case "select":
        return (
          <Select value={value} onValueChange={(val) => updateAnswer(question.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox 
              id={question.id}
              checked={value === true}
              onCheckedChange={(checked) => updateAnswer(question.id, checked)}
            />
            <Label htmlFor={question.id}>Yes</Label>
          </div>
        );
      
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateAnswer(question.id, parseFloat(e.target.value) || "")}
            placeholder="Enter a number"
          />
        );
      
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
          />
        );
      
      case "text":
      default:
        return value && value.length > 100 ? (
          <Textarea
            value={value}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="Enter details..."
            className="min-h-[100px]"
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="Enter details..."
          />
        );
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Evidence Collection
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive evidence gathering for {analysis?.analysisId}
        </p>
      </div>

      {/* Progress Indicator */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Collection Progress</CardTitle>
              <CardDescription>
                {answeredQuestions} of {totalQuestions} questions answered
              </CardDescription>
            </div>
            <Badge variant={canProceedToAnalysis ? "default" : "secondary"}>
              {canProceedToAnalysis ? "Ready for Analysis" : "In Progress"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="w-full" />
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>Evidence Collection</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="questionnaire" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Evidence Questionnaire
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Supporting Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questionnaire" className="space-y-6">
          {/* Phase Navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            {phases.map((phase, index) => (
              <Button
                key={phase}
                variant={index === currentPhase ? "default" : index < currentPhase ? "outline" : "ghost"}
                size="sm"
                onClick={() => setCurrentPhase(index)}
                className="flex items-center gap-1"
              >
                {index < currentPhase && <CheckCircle className="h-3 w-3" />}
                {phase}
              </Button>
            ))}
          </div>

          {/* Current Phase Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Phase {currentPhase + 1}: {phases[currentPhase]}
                <Badge variant="outline">{currentPhaseQuestions.length} questions</Badge>
              </CardTitle>
              <CardDescription>
                Please provide as much detail as possible to enable accurate root cause analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentPhaseQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={question.id} className="flex items-center gap-2">
                    {question.text}
                    {question.required && (
                      <span className="text-red-500">*</span>
                    )}
                  </Label>
                  {renderQuestion(question)}
                  {question.required && !answers[question.id] && (
                    <p className="text-sm text-red-500">This field is required</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentPhase(Math.max(0, currentPhase - 1))}
              disabled={currentPhase === 0}
            >
              Previous Phase
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => saveEvidenceMutation.mutate()}
                disabled={saveEvidenceMutation.isPending}
              >
                Save Progress
              </Button>
              
              {currentPhase < phases.length - 1 ? (
                <Button
                  onClick={() => setCurrentPhase(currentPhase + 1)}
                  className="flex items-center gap-2"
                >
                  Next Phase <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => proceedToAnalysisMutation.mutate()}
                  disabled={!canProceedToAnalysis || proceedToAnalysisMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  Proceed to AI Analysis
                </Button>
              )}
            </div>
          </div>

          {/* Required Fields Alert */}
          {!canProceedToAnalysis && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please complete the required fields (marked with *) to proceed to AI analysis.
                Minimum required: Equipment Type, Location, and Observed Problem.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supporting Documentation</CardTitle>
              <CardDescription>
                Upload any relevant files such as inspection reports, photos, maintenance records, or trend data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Upload Supporting Files
                </p>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Drag and drop files here, or click to browse
                </p>
                <Button variant="outline">
                  Choose Files
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}