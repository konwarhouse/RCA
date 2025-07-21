import { useState, useEffect } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Wrench, Search, FileText, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema for equipment selection and symptom input
const equipmentSymptomSchema = z.object({
  specificPart: z.string().min(1, "Specific part/component is required"),
  symptomDescription: z.string().min(10, "Detailed symptom description is required"),
  operatingConditions: z.string().min(10, "Operating conditions are required"),
  whenObserved: z.string().min(1, "When symptoms were observed is required"),
  frequency: z.enum(["Continuous", "Intermittent", "One-time", "Increasing"]),
  severity: z.enum(["Minor", "Moderate", "Significant", "Severe"]),
  contextualFactors: z.string().optional(),
});

type EquipmentSymptomForm = z.infer<typeof equipmentSymptomSchema>;

export default function EquipmentSelection() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Extract incident ID directly from URL parameters with fallback methods
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
  const pathIncidentId = window.location.pathname.split('/').pop();
  
  let incidentId = null;
  
  // Try multiple methods to extract incident ID
  if (urlParams.get('incident')) {
    incidentId = parseInt(urlParams.get('incident')!);
    console.log('Found incident ID in URL params:', incidentId);
  } else if (hashParams.get('incident')) {
    incidentId = parseInt(hashParams.get('incident')!);
    console.log('Found incident ID in hash params:', incidentId);
  } else if (pathIncidentId && !isNaN(parseInt(pathIncidentId))) {
    incidentId = parseInt(pathIncidentId);
    console.log('Found incident ID in path:', incidentId);
  }
  
  console.log('DEBUG: Full URL:', window.location.href);
  console.log('DEBUG: Search params:', window.location.search);
  console.log('DEBUG: Hash:', window.location.hash);
  console.log('DEBUG: Final incident ID:', incidentId);
  
  const [selectedEquipmentFromLibrary, setSelectedEquipmentFromLibrary] = useState<any>(null);
  
  const form = useForm<EquipmentSymptomForm>({
    resolver: zodResolver(equipmentSymptomSchema),
    defaultValues: {
      specificPart: "",
      symptomDescription: "",
      operatingConditions: "",
      whenObserved: "",
      frequency: "Continuous",
      severity: "Moderate",
      contextualFactors: "",
    },
  });

  // Fetch incident details
  const { data: incident, isLoading: isLoadingIncident, error: incidentError } = useQuery({
    queryKey: [`/api/incidents/${incidentId}`],
    queryFn: async () => {
      console.log('Fetching incident:', incidentId);
      const response = await fetch(`/api/incidents/${incidentId}`);
      console.log('Response status:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch incident: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log('Incident data:', data);
      console.log('Is incident valid?', !!data, 'Has equipment group?', !!data?.equipmentGroup);
      return data;
    },
    enabled: !!incidentId,
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch evidence library items based on the equipment group
  const { data: libraryItems = [] } = useQuery({
    queryKey: [`/api/evidence-library/by-equipment`, incident?.equipmentGroup, incident?.equipmentType],
    queryFn: async () => {
      if (!incident?.equipmentType) return [];
      // Search for equipment type only (e.g., "CENTRIFUGAL PUMP" -> "Centrifugal Pump")
      const searchQuery = incident.equipmentType;
      console.log('Searching evidence library for equipment type:', searchQuery);
      const response = await fetch(`/api/evidence-library/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) return [];
      const results = await response.json();
      console.log('Evidence library results:', results.length, 'items');
      return results;
    },
    enabled: !!incident?.equipmentGroup,
  });

  // Update equipment selection mutation
  const updateIncidentMutation = useMutation({
    mutationFn: async (data: EquipmentSymptomForm & { equipmentLibraryId?: number }) => {
      return await apiRequest(`/api/incidents/${incidentId}/equipment-symptoms`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Equipment & Symptoms Updated",
        description: "Proceeding to AI evidence checklist generation...",
      });
      setLocation(`/evidence-checklist?incident=${incidentId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update equipment details",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EquipmentSymptomForm) => {
    const payload = {
      ...data,
      equipmentLibraryId: selectedEquipmentFromLibrary?.id,
    };
    updateIncidentMutation.mutate(payload);
  };

  if (!incidentId) {
    console.log('SHOWING NO INCIDENT ID ERROR - URL:', window.location.href);
    console.log('URL Search:', window.location.search);
    console.log('Incident ID parsed as:', incidentId);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">Error: No Incident ID</div>
          <div className="text-sm text-slate-600 mt-2">Please access this page from the incident reporting workflow.</div>
          <div className="text-xs text-slate-400 mt-4">Debug: URL = {window.location.href}</div>
        </div>
      </div>
    );
  }

  if (incidentError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">Error loading incident</div>
          <div className="text-sm text-slate-600 mt-2">Incident ID: {incidentId}</div>
          <div className="text-sm text-red-500 mt-1">{incidentError.message}</div>
        </div>
      </div>
    );
  }

  if (isLoadingIncident) {
    console.log('Loading incident data...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-slate-900">Loading incident data...</div>
          <div className="text-sm text-slate-600 mt-2">Incident ID: {incidentId}</div>
          <div className="text-sm text-blue-600 mt-1">Fetching from server...</div>
        </div>
      </div>
    );
  }
  
  if (!incident && !isLoadingIncident) {
    console.log('No incident found after loading complete');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-red-600">Incident Not Found</div>
          <div className="text-sm text-slate-600 mt-2">Incident ID: {incidentId}</div>
        </div>
      </div>
    );
  }

  console.log('RENDERING MAIN CONTENT - incident:', incident?.title, 'ID:', incidentId);
  console.log('Current location:', window.location.pathname, window.location.search);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* FORCE VISIBLE DEBUG */}
      <div style={{
        position: 'fixed', 
        top: '0', 
        left: '0', 
        right: '0', 
        backgroundColor: 'green', 
        color: 'white', 
        padding: '10px', 
        zIndex: 9999,
        fontSize: '18px'
      }}>
        ✅ EQUIPMENT SELECTION LOADED - Incident #{incidentId}: {incident?.title}
      </div>
      <div style={{marginTop: '60px'}}>
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Equipment Selection & Symptom Input</h1>
              <p className="text-slate-600">Step 2: Select specific equipment part and describe symptoms</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            Step 2 of 8
          </Badge>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ✓
              </div>
              <span className="ml-2 text-sm text-green-600">Incident Reported</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">Equipment Selection</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <div className="flex items-center">
              <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm text-slate-500">Evidence Checklist</span>
            </div>
            <span className="text-slate-400">...</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Evidence Library Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                Equipment Library Selection
              </CardTitle>
              <p className="text-sm text-slate-600">
                Select from evidence library for {incident?.equipmentGroup} - {incident?.equipmentType}
              </p>
            </CardHeader>
            <CardContent>
              {libraryItems.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {libraryItems.map((item: any) => (
                    <div 
                      key={item.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedEquipmentFromLibrary?.id === item.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedEquipmentFromLibrary(item)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-slate-900">{item.equipmentType}</h4>
                        <Badge variant={item.riskRanking === 'Critical' ? 'destructive' : 'secondary'}>
                          {item.riskRanking}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{item.componentFailureMode}</p>
                      <p className="text-xs text-slate-500">{item.subtypeExample}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>No library items found for this equipment type.</p>
                  <p className="text-sm">Proceed with manual entry.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Manual Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-500" />
                Symptom Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <FormField
                    control={form.control}
                    name="specificPart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific Part/Component</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="e.g., Mechanical seal, Bearing, Impeller"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="symptomDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detailed Symptom Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe exactly what you observed: leaks, noises, vibrations, performance issues..."
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Continuous">Continuous</SelectItem>
                                <SelectItem value="Intermittent">Intermittent</SelectItem>
                                <SelectItem value="One-time">One-time</SelectItem>
                                <SelectItem value="Increasing">Increasing</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Minor">Minor</SelectItem>
                                <SelectItem value="Moderate">Moderate</SelectItem>
                                <SelectItem value="Significant">Significant</SelectItem>
                                <SelectItem value="Severe">Severe</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="operatingConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operating Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Temperature, pressure, flow rate, load conditions when issue occurred..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whenObserved"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>When First Observed</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="During startup, at high load, after maintenance..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contextualFactors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Context (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Recent maintenance, weather conditions, process changes..."
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Selected Library Item Display */}
                  {selectedEquipmentFromLibrary && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Selected from Library:</span>
                      </div>
                      <p className="text-sm text-blue-800">
                        {selectedEquipmentFromLibrary.equipmentType} - {selectedEquipmentFromLibrary.componentFailureMode}
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end pt-6">
                    <Button 
                      type="submit" 
                      disabled={updateIncidentMutation.isPending}
                      className="min-w-48"
                    >
                      {updateIncidentMutation.isPending ? (
                        "Processing..."
                      ) : (
                        <>
                          Generate Evidence Checklist
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}