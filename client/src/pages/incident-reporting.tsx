import { useState } from "react";
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
import { Calendar, Clock, AlertTriangle, User, MapPin, Wrench, ArrowRight, Home } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schema for incident reporting - THREE-LEVEL CASCADING DROPDOWN SYSTEM
const incidentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  equipmentGroup: z.string().min(1, "Equipment group is required"),
  equipmentType: z.string().min(1, "Equipment type is required"),
  equipmentSubtype: z.string().min(1, "Equipment subtype is required"),
  equipmentId: z.string().min(1, "Equipment ID is required"),
  location: z.string().min(1, "Location is required"),
  reportedBy: z.string().min(1, "Reporter name is required"),
  incidentDateTime: z.string().min(1, "Incident date/time is required"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  immediateActions: z.string().optional(),
  safetyImplications: z.string().optional(),
});

type IncidentForm = z.infer<typeof incidentSchema>;

export default function IncidentReporting() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const form = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: "",
      description: "",
      equipmentGroup: "",
      equipmentType: "",
      equipmentSubtype: "",
      equipmentId: "",
      location: "",
      reportedBy: "",
      incidentDateTime: "",
      priority: "Medium",
      immediateActions: "",
      safetyImplications: "",
    },
  });

  // THREE-LEVEL CASCADING DROPDOWN STATE
  const selectedEquipmentGroup = form.watch("equipmentGroup");
  const selectedEquipmentType = form.watch("equipmentType");

  // LEVEL 1: Fetch Equipment Groups from Evidence Library
  const { data: equipmentGroups = [] } = useQuery({
    queryKey: ['/api/cascading/equipment-groups'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/cascading/equipment-groups');
        if (!response.ok) {
          console.error('Equipment groups API failed, falling back to SQL query');
          // Fallback to direct data fetch
          return ["Rotating", "Static", "Electrical", "Control Valves", "Instrumentation", "Fire & Safety", "HVAC & Utilities", "Material Handling", "Plant Utilities", "Environmental", "Utility"];
        }
        return response.json();
      } catch (error) {
        console.error('Equipment groups fetch error:', error);
        return ["Rotating", "Static", "Electrical", "Control Valves", "Instrumentation", "Fire & Safety", "HVAC & Utilities", "Material Handling", "Plant Utilities", "Environmental", "Utility"];
      }
    },
  });

  // LEVEL 2: Fetch Equipment Types for Selected Group
  const { data: equipmentTypes = [] } = useQuery({
    queryKey: ['/api/cascading/equipment-types', selectedEquipmentGroup],
    queryFn: async () => {
      if (!selectedEquipmentGroup) return [];
      try {
        const response = await fetch(`/api/cascading/equipment-types/${encodeURIComponent(selectedEquipmentGroup)}`);
        if (!response.ok) {
          console.error('Equipment types API failed');
          return [];
        }
        return response.json();
      } catch (error) {
        console.error('Equipment types fetch error:', error);
        return [];
      }
    },
    enabled: !!selectedEquipmentGroup,
  });

  // LEVEL 3: Fetch Equipment Subtypes for Selected Group and Type
  const { data: equipmentSubtypes = [] } = useQuery({
    queryKey: ['/api/cascading/equipment-subtypes', selectedEquipmentGroup, selectedEquipmentType],
    queryFn: async () => {
      if (!selectedEquipmentGroup || !selectedEquipmentType) return [];
      try {
        const response = await fetch(`/api/cascading/equipment-subtypes/${encodeURIComponent(selectedEquipmentGroup)}/${encodeURIComponent(selectedEquipmentType)}`);
        if (!response.ok) {
          console.error('Equipment subtypes API failed');
          return [];
        }
        return response.json();
      } catch (error) {
        console.error('Equipment subtypes fetch error:', error);
        return [];
      }
    },
    enabled: !!selectedEquipmentGroup && !!selectedEquipmentType,
  });

  // Create incident mutation
  const createIncidentMutation = useMutation({
    mutationFn: async (data: IncidentForm) => {
      return await apiRequest("/api/incidents", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (response: any) => {
      console.log('Incident created successfully:', response);
      console.log('Full response object:', JSON.stringify(response, null, 2));
      let incidentId;
      
      // Handle different response formats
      if (typeof response === 'object' && response.id) {
        incidentId = response.id;
      } else if (typeof response === 'number') {
        incidentId = response;
      } else if (typeof response === 'string') {
        incidentId = parseInt(response);
      } else {
        console.error('Unexpected response format:', response);
        incidentId = null;
      }
      
      console.log('Extracted incident ID for navigation:', incidentId, 'Type:', typeof incidentId);
      
      if (!incidentId) {
        console.error('ERROR: No incident ID in response:', response);
        toast({
          title: "Error",
          description: "Failed to get incident ID for navigation",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Incident Reported",
        description: "Moving to equipment selection and symptom input...",
      });
      
      // Navigate immediately after toast
      const navigationUrl = `/equipment-selection?incident=${incidentId}`;
      console.log('Navigating to:', navigationUrl);
      console.log('About to call setLocation with:', navigationUrl);
      setLocation(navigationUrl);
      console.log('setLocation called successfully');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create incident report",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IncidentForm) => {
    createIncidentMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Incident Reporting</h1>
              <p className="text-slate-600">Step 1: Report the incident and provide initial details</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            Step 1 of 8
          </Badge>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">Incident Reported</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <div className="flex items-center">
              <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-sm text-slate-500">Equipment Selection</span>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <div className="flex items-center">
              <div className="w-8 h-8 bg-slate-300 text-slate-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm text-slate-500">Evidence Collection</span>
            </div>
            <span className="text-slate-400">...</span>
          </div>
        </div>

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Incident Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Incident Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incident Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Pump P-101 seal leak" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority Level</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Critical">Critical</SelectItem>
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe what happened, when it was observed, and initial symptoms..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* THREE-LEVEL CASCADING DROPDOWN SYSTEM - NO FREE TEXT ALLOWED */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* LEVEL 1: Equipment Group */}
                  <FormField
                    control={form.control}
                    name="equipmentGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Wrench className="w-4 h-4" />
                          Equipment Group (Level 1)
                        </FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset dependent fields when group changes
                            form.setValue("equipmentType", "");
                            form.setValue("equipmentSubtype", "");
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select equipment group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipmentGroups.map((group: string) => (
                              <SelectItem key={group} value={group}>
                                {group}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* LEVEL 2: Equipment Type */}
                  <FormField
                    control={form.control}
                    name="equipmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Type (Level 2)</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset subtype when type changes
                            form.setValue("equipmentSubtype", "");
                          }} 
                          value={field.value}
                          disabled={!selectedEquipmentGroup}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedEquipmentGroup 
                                  ? "Select equipment group first" 
                                  : equipmentTypes.length === 0 
                                  ? "Loading types..." 
                                  : "Select equipment type"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipmentTypes.map((type: string) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* LEVEL 3: Equipment Subtype */}
                  <FormField
                    control={form.control}
                    name="equipmentSubtype"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Subtype (Level 3)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedEquipmentGroup || !selectedEquipmentType}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedEquipmentGroup || !selectedEquipmentType
                                  ? "Select equipment type first" 
                                  : equipmentSubtypes.length === 0 
                                  ? "Loading subtypes..." 
                                  : "Select equipment subtype"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipmentSubtypes.map((subtype: string) => (
                              <SelectItem key={subtype} value={subtype}>
                                {subtype}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="equipmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment ID/Tag</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., P-101, M-205" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Location and Timing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Unit 1 Process Area" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reportedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Reported By
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Your name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incidentDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Incident Date/Time
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="datetime-local"
                            max={new Date().toISOString().slice(0, 16)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="immediateActions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Immediate Actions Taken
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Actions taken to secure the area, isolate equipment, etc..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="safetyImplications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Safety Implications</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Any safety concerns, personnel at risk, environmental impact..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6">
                  <Button 
                    type="submit" 
                    disabled={createIncidentMutation.isPending}
                    className="min-w-48"
                  >
                    {createIncidentMutation.isPending ? (
                      "Creating Incident..."
                    ) : (
                      <>
                        Proceed to Equipment Selection
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
  );
}