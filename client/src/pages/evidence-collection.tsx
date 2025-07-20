import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { AlertCircle, CheckCircle, ChevronRight, Upload, FileText, Brain, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EQUIPMENT_TYPES } from "@shared/schema";
import AIEvidenceValidator from "@/components/ai-evidence-validator";
import IntelligentAIAssistant from "@/components/intelligent-ai-assistant";
import { getEquipmentEvidenceConfig, getRequiredEvidence } from "@shared/equipment-evidence-library";

export default function EvidenceCollection() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/investigation/:id/evidence");
  const { toast } = useToast();
  
  const investigationId = params?.id;
  const [currentSection, setCurrentSection] = useState<string>("");
  const [evidenceData, setEvidenceData] = useState<any>({});
  const [completeness, setCompleteness] = useState(0);
  const [questionnaire, setQuestionnaire] = useState<any[]>([]);
  const [aiValidation, setAiValidation] = useState<any>(null);
  const [showAIValidator, setShowAIValidator] = useState(true);
  const [currentFieldQuestion, setCurrentFieldQuestion] = useState<any>(null);
  const [fieldCompletionStatus, setFieldCompletionStatus] = useState<Record<string, boolean>>({});

  // Fetch investigation and questionnaire
  const { data: investigationData, isLoading } = useQuery({
    queryKey: ['/api/investigations', investigationId, 'questionnaire'],
    enabled: !!investigationId
  });

  useEffect(() => {
    if (investigationData?.questionnaire) {
      setQuestionnaire(investigationData.questionnaire);
      setEvidenceData(investigationData.investigation?.evidenceData || {});
      setCompleteness(parseFloat(investigationData.investigation?.evidenceCompleteness || "0"));
      
      // Set first section as current
      const sections = [...new Set(investigationData.questionnaire.map((q: any) => q.section))];
      if (sections.length > 0) {
        setCurrentSection(sections[0]);
      }
    }
  }, [investigationData]);

  // Update evidence mutation
  const updateEvidenceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/investigations/${investigationId}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setCompleteness(data.completeness);
      if (data.canProceedToAnalysis) {
        toast({
          title: "Evidence Complete",
          description: "You can now proceed to AI analysis."
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update evidence. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Proceed to analysis mutation
  const proceedToAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/investigations/${investigationId}/analyze`, {
        method: 'POST'
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: "Your investigation analysis is ready."
      });
      setLocation(`/investigation/${investigationId}`);
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to perform analysis. Please ensure evidence is complete.",
        variant: "destructive"
      });
    }
  });

  const handleFieldChange = (questionId: string, value: any) => {
    const updatedData = {
      ...evidenceData,
      [questionId]: value
    };
    setEvidenceData(updatedData);
    
    // Mark field as completed if it has a meaningful value
    if (value !== undefined && value !== null && value !== '') {
      setFieldCompletionStatus(prev => ({ ...prev, [questionId]: true }));
    } else {
      setFieldCompletionStatus(prev => ({ ...prev, [questionId]: false }));
    }
    
    // Debounce update to server
    setTimeout(() => {
      updateEvidenceMutation.mutate(updatedData);
    }, 500);
  };

  const getSelectOptions = (question: any) => {
    // Handle equipment subcategory
    if (question.id === 'equipment_subcategory') {
      const selectedCategory = evidenceData['equipment_category'];
      if (!selectedCategory || !EQUIPMENT_TYPES[selectedCategory]?.subcategories) return [];
      return Object.keys(EQUIPMENT_TYPES[selectedCategory].subcategories);
    }
    
    // Handle equipment type
    if (question.id === 'equipment_type') {
      const selectedCategory = evidenceData['equipment_category'];
      const selectedSubcategory = evidenceData['equipment_subcategory'];
      if (!selectedCategory || !selectedSubcategory || !EQUIPMENT_TYPES[selectedCategory]?.subcategories?.[selectedSubcategory]) return [];
      return EQUIPMENT_TYPES[selectedCategory].subcategories[selectedSubcategory].types || [];
    }
    
    return question.options || [];
  };

  const renderQuestionField = (question: any) => {
    const value = evidenceData[question.id] || "";

    switch (question.type) {
      case 'select':
        const options = getSelectOptions(question);
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleFieldChange(question.id, newValue)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(question.id, e.target.value)}
            placeholder="Provide detailed information..."
            rows={3}
            className="min-h-[100px]"
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(question.id, e.target.value)}
            placeholder="Enter numeric value"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(question.id, e.target.value)}
          />
        );

      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => handleFieldChange(question.id, e.target.value)}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-4">
            <Button
              type="button"
              variant={value === true ? "default" : "outline"}
              size="sm"
              onClick={() => handleFieldChange(question.id, true)}
              className={`px-6 py-2 ${
                value === true 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              YES
            </Button>
            <Button
              type="button"
              variant={value === false ? "default" : "outline"}
              size="sm"
              onClick={() => handleFieldChange(question.id, false)}
              className={`px-6 py-2 ${
                value === false 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              NO
            </Button>
          </div>
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(question.id, e.target.value)}
            placeholder="Enter information..."
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading evidence collection...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!investigationData?.investigation) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Investigation not found or investigation type not set. Please start from the beginning.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const investigation = investigationData.investigation;
  const sections = [...new Set(questionnaire.map(q => q.section))];
  
  // Filter questions based on conditional logic
  const shouldShowQuestion = (question: any) => {
    if (!question.conditionalLogic) return true;
    
    const { dependsOn, condition } = question.conditionalLogic;
    const dependentValue = evidenceData[dependsOn];
    
    if (condition === true) {
      return dependentValue === true;
    } else if (condition === false) {
      return dependentValue === false;
    } else if (condition === "any") {
      return dependentValue !== undefined && dependentValue !== null && dependentValue !== '';
    }
    
    return dependentValue === condition;
  };
  
  const currentSectionQuestions = questionnaire
    .filter(q => q.section === currentSection)
    .filter(shouldShowQuestion);
  const canProceedToAnalysis = completeness >= 80;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Evidence Collection
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Step 3 of 4: {investigation.investigationType === 'safety_environmental' ? 'ECFA' : 'Fault Tree'} Evidence Gathering
        </p>
      </div>

      {/* Progress Indicator */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Evidence Completeness</CardTitle>
            <Badge variant={canProceedToAnalysis ? "default" : "secondary"}>
              {completeness.toFixed(1)}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={completeness} className="mb-4" />
          <div className="flex items-center gap-2 text-sm">
            {canProceedToAnalysis ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-700 dark:text-green-400">
                  Ready for AI Analysis (80% minimum requirement met)
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-amber-700 dark:text-amber-400">
                  {(80 - completeness).toFixed(1)}% more evidence needed for analysis
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Smart Progress Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI-Assisted Evidence Collection
            <Badge variant={completeness >= 80 ? "default" : "secondary"}>
              {completeness.toFixed(1)}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completeness} className="mb-4" />
          <div className="text-sm text-gray-600">
            AI assistant will guide you through each field with context, examples, and smart suggestions.
            Click on any field to get personalized help.
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Section Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Sections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sections.map((section) => {
                const sectionQuestions = questionnaire.filter(q => q.section === section);
                const answeredQuestions = sectionQuestions.filter(q => {
                  const answer = evidenceData[q.id];
                  return answer !== undefined && answer !== null && answer !== '';
                });
                const sectionProgress = sectionQuestions.length > 0 
                  ? (answeredQuestions.length / sectionQuestions.length) * 100 
                  : 0;

                return (
                  <Button
                    key={section}
                    variant={currentSection === section ? "default" : "ghost"}
                    className="w-full justify-between text-left h-auto p-3"
                    onClick={() => setCurrentSection(section)}
                  >
                    <div>
                      <div className="font-medium">{section}</div>
                      <div className="text-xs opacity-70">
                        {answeredQuestions.length}/{sectionQuestions.length} completed
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${sectionProgress}%` }}
                        />
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Questions Form */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {currentSection}
              </CardTitle>
              <CardDescription>
                {investigation.investigationType === 'safety_environmental' 
                  ? 'ECFA evidence collection for safety/environmental incident'
                  : 'Fault Tree Analysis evidence collection with ISO 14224 taxonomy'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentSectionQuestions.map((question) => (
                <div key={question.id} className="space-y-4">
                  <div 
                    className="space-y-2"
                    onFocus={() => setCurrentFieldQuestion(question)}
                    onClick={() => setCurrentFieldQuestion(question)}
                  >
                    <Label htmlFor={question.id} className="text-base font-medium">
                      {question.question}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                      {question.unit && (
                        <span className="text-sm text-gray-500 ml-2">({question.unit})</span>
                      )}
                    </Label>
                    {renderQuestionField(question)}
                  </div>
                  
                  {/* AI Assistant for current field */}
                  {currentFieldQuestion?.id === question.id && (
                    <IntelligentAIAssistant
                      currentQuestion={question}
                      currentValue={evidenceData[question.id]}
                      evidenceData={evidenceData}
                      onSuggestion={(value) => handleFieldChange(question.id, value)}
                      onFieldComplete={() => setCurrentFieldQuestion(null)}
                      completedSections={sections.slice(0, sections.indexOf(currentSection))}
                      investigationType={investigationData?.investigationType}
                    />
                  )}
                </div>
              ))}

              {currentSectionQuestions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No questions available for this section.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-between">
            <div>
              {sections.indexOf(currentSection) > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = sections.indexOf(currentSection);
                    setCurrentSection(sections[currentIndex - 1]);
                  }}
                >
                  Previous Section
                </Button>
              )}
            </div>
            
            <div className="space-x-4">
              {sections.indexOf(currentSection) < sections.length - 1 ? (
                <Button
                  onClick={() => {
                    const currentIndex = sections.indexOf(currentSection);
                    setCurrentSection(sections[currentIndex + 1]);
                  }}
                >
                  Next Section
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : canProceedToAnalysis ? (
                <Button
                  onClick={() => {
                    if (completeness < 80) {
                      toast({
                        title: "More Evidence Needed",
                        description: "Please complete more fields before proceeding to analysis. The AI assistant will guide you.",
                        variant: "destructive"
                      });
                      return;
                    }
                    proceedToAnalysisMutation.mutate();
                  }}
                  disabled={proceedToAnalysisMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                  {proceedToAnalysisMutation.isPending ? (
                    "Generating Analysis..."
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Proceed to AI Analysis
                    </>
                  )}
                </Button>
              ) : (
                <Alert className="inline-block">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Complete more evidence to unlock AI analysis
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}