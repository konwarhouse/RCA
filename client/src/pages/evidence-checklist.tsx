import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Circle, FileText, Upload, AlertTriangle, ChevronRight, Brain, Lightbulb, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EvidenceItem {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  required: boolean;
  aiGenerated: boolean;
  specificToEquipment: boolean;
  examples: string[];
  completed: boolean;
  notes?: string;
  files?: File[];
}

interface Incident {
  id: number;
  title: string;
  equipmentGroup: string;
  equipmentType: string;
  equipmentSubtype?: string; // FIXED: Added missing equipmentSubtype field
  equipmentId: string;
  symptoms: string;
  currentStep: number;
  workflowStatus: string;
}

export default function EvidenceChecklist() {
  const [, setLocation] = useLocation();
  const [incidentId, setIncidentId] = useState<number | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

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

  // Generate AI evidence checklist - Enhanced with Elimination Logic
  const generateChecklistMutation = useMutation({
    mutationFn: async (incidentData: Incident) => {
      console.log(`[Frontend Evidence] Requesting elimination-aware checklist for ${incidentData.equipmentGroup}→${incidentData.equipmentType}→${incidentData.equipmentSubtype || ''}`);
      
      const response = await fetch(`/api/incidents/${incidentData.id}/generate-evidence-checklist`, {
        method: 'POST',
        body: JSON.stringify({
          equipmentGroup: incidentData.equipmentGroup,
          equipmentType: incidentData.equipmentType,
          equipmentSubtype: incidentData.equipmentSubtype, // FIXED: Added missing equipmentSubtype
          symptoms: incidentData.symptoms,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate checklist: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Evidence checklist generated:', data);
      if (data && data.evidenceItems && Array.isArray(data.evidenceItems)) {
        setEvidenceItems(data.evidenceItems);
      } else {
        console.error('Invalid evidence items format:', data);
        setEvidenceItems([]);
      }
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('Failed to generate evidence checklist:', error);
      setIsGenerating(false);
    },
  });

  // Update evidence checklist progress
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { incidentId: number; evidenceItems: EvidenceItem[] }) => {
      return apiRequest(`/api/incidents/${data.incidentId}/evidence-progress`, {
        method: 'PUT',
        body: JSON.stringify({
          currentStep: 3,
          workflowStatus: "evidence_checklist_complete",
          evidenceChecklist: data.evidenceItems,
        }),
      });
    },
  });

  // Generate evidence checklist when incident loads
  useEffect(() => {
    if (incident && Array.isArray(evidenceItems) && evidenceItems.length === 0) {
      setIsGenerating(true);
      generateChecklistMutation.mutate(incident as Incident);
    }
  }, [incident]);

  // Calculate completion percentage
  useEffect(() => {
    if (evidenceItems && Array.isArray(evidenceItems) && evidenceItems.length > 0) {
      const completed = evidenceItems.filter(item => item.completed).length;
      const percentage = Math.round((completed / evidenceItems.length) * 100);
      setCompletionPercentage(percentage);
    }
  }, [evidenceItems]);

  const handleItemToggle = (itemId: string, completed: boolean) => {
    setEvidenceItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, completed } : item
      )
    );
  };

  const handleNotesUpdate = (itemId: string, notes: string) => {
    setEvidenceItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  const handleFileUpload = (itemId: string, files: File[]) => {
    setEvidenceItems(prev => 
      prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          files: [...(item.files || []), ...files],
          completed: true // Auto-mark as completed when files are uploaded
        } : item
      )
    );
  };

  const handleFileRemove = (itemId: string, fileIndex: number) => {
    setEvidenceItems(prev => 
      prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          files: (item.files || []).filter((_, index) => index !== fileIndex)
        } : item
      )
    );
  };

  const handleProceedToCollection = () => {
    if (incidentId && evidenceItems.length > 0) {
      updateProgressMutation.mutate({ 
        incidentId, 
        evidenceItems 
      }, {
        onSuccess: () => {
          setLocation(`/evidence-collection?incident=${incidentId}`);
        }
      });
    }
  };

  const criticalItems = evidenceItems?.filter(item => item.priority === "Critical") || [];
  const highItems = evidenceItems?.filter(item => item.priority === "High") || [];
  const mediumItems = evidenceItems?.filter(item => item.priority === "Medium") || [];
  const lowItems = evidenceItems?.filter(item => item.priority === "Low") || [];

  const canProceed = criticalItems.every(item => item.completed) && 
                   highItems.filter(item => item.completed).length >= Math.ceil(highItems.length * 0.8);

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
                <img 
                  src="/quanntaum-logo.jpg" 
                  alt="Quanntaum Logo" 
                  className="h-5 w-5 rounded object-contain"
                />
                <h1 className="text-xl font-bold">Step 3: AI Evidence Checklist</h1>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Incident #{(incident as Incident)?.id}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {(incident as Incident)?.title}
                </CardTitle>
                <CardDescription>
                  Equipment: {(incident as Incident)?.equipmentGroup} → {(incident as Incident)?.equipmentType} ({(incident as Incident)?.equipmentId})
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{completionPercentage}%</div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
            <Progress value={completionPercentage} className="mt-4" />
          </CardHeader>
        </Card>

        {isGenerating && (
          <Alert className="mb-6">
            <Brain className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <strong>AI Analysis in Progress:</strong> Generating equipment-specific evidence checklist based on your incident details and symptoms...
            </AlertDescription>
          </Alert>
        )}

        {/* AI Insights */}
        {evidenceItems.length > 0 && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>AI Generated Checklist:</strong> Based on your equipment type ({(incident as Incident)?.equipmentType}) and reported symptoms, 
              our AI has identified {evidenceItems?.length || 0} evidence items. Focus on completing all Critical items and at least 80% of High priority items.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Evidence */}
          {criticalItems.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Critical Evidence ({criticalItems.filter(i => i.completed).length}/{criticalItems.length})
                </CardTitle>
                <CardDescription>
                  Required for accurate analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {criticalItems.map((item) => (
                  <EvidenceItemCard 
                    key={item.id}
                    item={item}
                    onToggle={handleItemToggle}
                    onNotesUpdate={handleNotesUpdate}
                    onFileUpload={handleFileUpload}
                    onFileRemove={handleFileRemove}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* High Priority Evidence */}
          {highItems.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                  High Priority Evidence ({highItems.filter(i => i.completed).length}/{highItems.length})
                </CardTitle>
                <CardDescription>
                  Complete at least 80% for optimal analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {highItems.map((item) => (
                  <EvidenceItemCard 
                    key={item.id}
                    item={item}
                    onToggle={handleItemToggle}
                    onNotesUpdate={handleNotesUpdate}
                    onFileUpload={handleFileUpload}
                    onFileRemove={handleFileRemove}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Medium Priority Evidence */}
          {mediumItems.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <FileText className="h-5 w-5" />
                  Medium Priority Evidence ({mediumItems.filter(i => i.completed).length}/{mediumItems.length})
                </CardTitle>
                <CardDescription>
                  Helpful for comprehensive analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mediumItems.map((item) => (
                  <EvidenceItemCard 
                    key={item.id}
                    item={item}
                    onToggle={handleItemToggle}
                    onNotesUpdate={handleNotesUpdate}
                    onFileUpload={handleFileUpload}
                    onFileRemove={handleFileRemove}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Low Priority Evidence */}
          {lowItems.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <FileText className="h-5 w-5" />
                  Additional Evidence ({lowItems.filter(i => i.completed).length}/{lowItems.length})
                </CardTitle>
                <CardDescription>
                  Optional but valuable context
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {lowItems.map((item) => (
                  <EvidenceItemCard 
                    key={item.id}
                    item={item}
                    onToggle={handleItemToggle}
                    onNotesUpdate={handleNotesUpdate}
                    onFileUpload={handleFileUpload}
                    onFileRemove={handleFileRemove}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setLocation(`/equipment-selection?incident=${incidentId}`)}
          >
            ← Back to Equipment Selection
          </Button>
          <Button 
            onClick={handleProceedToCollection}
            disabled={!canProceed || updateProgressMutation.isPending}
            className="flex items-center gap-2"
          >
            {updateProgressMutation.isPending ? (
              <>
                <Brain className="h-4 w-4 animate-spin" />
                Saving Progress...
              </>
            ) : (
              <>
                Proceed to Evidence Collection
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Requirements Alert */}
        {!canProceed && evidenceItems.length > 0 && (
          <Alert className="mt-4 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Requirements:</strong> Complete all Critical items and at least 80% of High priority items to proceed.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

function EvidenceItemCard({ 
  item, 
  onToggle, 
  onNotesUpdate,
  onFileUpload,
  onFileRemove
}: { 
  item: EvidenceItem; 
  onToggle: (id: string, completed: boolean) => void;
  onNotesUpdate: (id: string, notes: string) => void;
  onFileUpload: (itemId: string, files: File[]) => void;
  onFileRemove: (itemId: string, fileIndex: number) => void;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(item.id, acceptedFiles);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'text/plain': ['.txt']
    },
    maxFiles: 5
  });
  return (
    <div className={`p-4 border rounded-lg ${item.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={item.completed}
          onCheckedChange={(checked) => onToggle(item.id, !!checked)}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium">{item.title}</h4>
            <Badge variant={item.priority === "Critical" ? "destructive" : 
                          item.priority === "High" ? "default" : 
                          item.priority === "Medium" ? "secondary" : "outline"}>
              {item.priority}
            </Badge>
            {item.aiGenerated && (
              <Badge variant="outline" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                AI Generated
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
          
          {item.examples.length > 0 && (
            <div className="mb-3">
              <Label className="text-xs font-medium text-muted-foreground">Examples:</Label>
              <ul className="text-xs text-muted-foreground mt-1 ml-4">
                {item.examples.map((example, idx) => (
                  <li key={idx} className="list-disc">{example}</li>
                ))}
              </ul>
            </div>
          )}

          {/* File Upload Zone */}
          <div className="mb-3">
            <Label className="text-xs font-medium">Upload Evidence Files</Label>
            <div
              {...getRootProps()}
              className={`mt-1 border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
              <p className="text-xs text-gray-600">
                {isDragActive ? 'Drop files here' : 'Drag files or click to browse'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PDF, Excel, CSV, Images, Text files
              </p>
            </div>
          </div>

          {/* Uploaded Files */}
          {item.files && item.files.length > 0 && (
            <div className="mb-3">
              <Label className="text-xs font-medium">Uploaded Files ({item.files.length})</Label>
              <div className="mt-1 space-y-1">
                {item.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded text-xs">
                    <span className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFileRemove(item.id, index)}
                      className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium">Notes (optional)</Label>
            <Textarea
              placeholder="Add notes about this evidence item..."
              value={item.notes || ''}
              onChange={(e) => onNotesUpdate(item.id, e.target.value)}
              className="mt-1 text-sm"
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
}