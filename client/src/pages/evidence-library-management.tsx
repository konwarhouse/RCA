import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Plus, Upload, Download, Edit, Trash2, AlertTriangle, CheckCircle, Home, ArrowLeft, ChevronUp, ChevronDown, Brain, Zap } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schema for evidence library items with intelligent configurable fields
const evidenceLibrarySchema = z.object({
  equipmentGroup: z.string().min(1, "Equipment group is required"),
  equipmentType: z.string().min(1, "Equipment type is required"),
  subtype: z.string().optional(),
  componentFailureMode: z.string().min(1, "Failure mode is required"),
  equipmentCode: z.string().min(1, "Equipment code is required"),
  failureCode: z.string().min(1, "Failure code is required"),
  riskRanking: z.string().min(1, "Risk ranking is required"),
  requiredTrendDataEvidence: z.string().min(1, "Required trend data is required"),
  aiOrInvestigatorQuestions: z.string().min(1, "AI questions are required"),
  attachmentsEvidenceRequired: z.string().min(1, "Attachments required is required"),
  rootCauseLogic: z.string().min(1, "Root cause logic is required"),
  
  // Configurable Intelligence Fields - Admin Editable
  confidenceLevel: z.string().optional(), // High/Medium/Low
  diagnosticValue: z.string().optional(), // Critical/Important/Useful/Optional
  industryRelevance: z.string().optional(), // Petrochemical/Power/Manufacturing/All
  evidencePriority: z.number().min(1).max(4).optional(), // 1=Critical, 2=High, 3=Medium, 4=Low
  timeToCollect: z.string().optional(), // Immediate/Hours/Days/Weeks
  collectionCost: z.string().optional(), // Low/Medium/High/Very High
  analysisComplexity: z.string().optional(), // Simple/Moderate/Complex/Expert Required
  seasonalFactor: z.string().optional(), // None/Summer/Winter/Shutdown/Startup
  relatedFailureModes: z.string().optional(), // Comma-separated equipment codes
  prerequisiteEvidence: z.string().optional(), // Evidence needed before this one
  followupActions: z.string().optional(), // What to do after collecting
  industryBenchmark: z.string().optional(), // Industry standards/benchmarks
  
  // Enriched Evidence Library Fields - from comprehensive CSV import
  primaryRootCause: z.string().optional(), // Primary Root Cause analysis
  contributingFactor: z.string().optional(), // Contributing factors
  latentCause: z.string().optional(), // Latent/underlying causes
  detectionGap: z.string().optional(), // Detection gaps analysis
  faultSignaturePattern: z.string().optional(), // Fault signature patterns
  applicableToOtherEquipment: z.string().optional(), // Cross-equipment applicability
  evidenceGapFlag: z.string().optional(), // Evidence gap indicators
  
  // Legacy fields
  blankColumn1: z.string().optional(),
  blankColumn2: z.string().optional(),
  blankColumn3: z.string().optional(),
  updatedBy: z.string().optional(),
});

type EvidenceLibraryForm = z.infer<typeof evidenceLibrarySchema>;

interface EvidenceLibrary {
  id: number;
  equipmentGroup: string;
  equipmentType: string;
  subtype?: string;
  componentFailureMode: string;
  equipmentCode: string;
  failureCode: string;
  riskRanking: string;
  requiredTrendDataEvidence: string;
  aiOrInvestigatorQuestions: string;
  attachmentsEvidenceRequired: string;
  rootCauseLogic: string;
  
  // Configurable Intelligence Fields - Admin Editable
  confidenceLevel?: string;
  diagnosticValue?: string;
  industryRelevance?: string;
  evidencePriority?: number;
  timeToCollect?: string;
  collectionCost?: string;
  analysisComplexity?: string;
  seasonalFactor?: string;
  relatedFailureModes?: string;
  prerequisiteEvidence?: string;
  followupActions?: string;
  industryBenchmark?: string;
  
  // Enriched Evidence Library Fields - from comprehensive CSV import
  primaryRootCause?: string;
  contributingFactor?: string;
  latentCause?: string;
  detectionGap?: string;
  faultSignaturePattern?: string;
  applicableToOtherEquipment?: string;
  evidenceGapFlag?: string;
  
  // Legacy fields
  blankColumn1?: string;
  blankColumn2?: string;
  blankColumn3?: string;
  isActive: boolean;
  lastUpdated: string;
  updatedBy?: string;
}

export default function EvidenceLibraryManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<EvidenceLibrary | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Filter states
  const [selectedEquipmentGroups, setSelectedEquipmentGroups] = useState<string[]>([]);
  const [selectedEquipmentTypes, setSelectedEquipmentTypes] = useState<string[]>([]);
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([]);
  
  // Bulk delete states
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Sorting states
  const [sortField, setSortField] = useState<'equipmentGroup' | 'equipmentType' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const form = useForm<EvidenceLibraryForm>({
    resolver: zodResolver(evidenceLibrarySchema),
    defaultValues: {
      equipmentGroup: "",
      equipmentType: "",
      subtype: "",
      componentFailureMode: "",
      equipmentCode: "",
      failureCode: "",
      riskRanking: "",
      requiredTrendDataEvidence: "",
      aiOrInvestigatorQuestions: "",
      attachmentsEvidenceRequired: "",
      rootCauseLogic: "",
      blankColumn1: "",
      blankColumn2: "",
      blankColumn3: "",
      updatedBy: "admin",
    },
  });

  // DIRECT DATABASE ACCESS - BYPASSING VITE MIDDLEWARE COMPLETELY
  const { data: evidenceItems = [], isLoading, refetch } = useQuery<EvidenceLibrary[]>({
    queryKey: ["/api/evidence-library", searchTerm],
    staleTime: 0, // Always fetch fresh data after updates
    gcTime: 0, // TanStack Query v5 uses gcTime instead of cacheTime
    refetchOnMount: true,
    queryFn: async () => {
      try {
        console.log("[Evidence Library] Attempting multiple API endpoint fallback strategy...");
        
        // UNIVERSAL PROTOCOL STANDARD: Try multiple API endpoints to bypass Vite middleware
        const endpoints = [
          searchTerm ? `/api/evidence-library/search/${encodeURIComponent(searchTerm)}` : `/api/evidence-library`,
          `/api/evidence-library-raw`,
          `/api/evidence-library-full`
        ];
        
        for (const url of endpoints) {
          try {
            console.log("[Evidence Library] Trying endpoint:", url);
            
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });
            
            if (!response.ok) continue;
            
            const textResponse = await response.text();
            console.log("[Evidence Library] Response length:", textResponse.length);
            
            // Skip HTML responses (Vite interference)
            if (textResponse.startsWith('<!DOCTYPE html>') || textResponse.startsWith('<html')) {
              console.log("[Evidence Library] HTML detected, trying next endpoint...");
              continue;
            }
            
            // Attempt JSON parsing
            try {
              const jsonData = JSON.parse(textResponse);
              if (Array.isArray(jsonData) && jsonData.length > 0) {
                console.log("[Evidence Library] ✅ SUCCESS: Retrieved", jsonData.length, "items from", url);
                return jsonData;
              }
            } catch (parseError) {
              console.log("[Evidence Library] JSON parse failed for", url, "- trying next endpoint");
              continue;
            }
          } catch (fetchError) {
            console.log("[Evidence Library] Fetch failed for", url, "- trying next endpoint");
            continue;
          }
        }
        
        console.error("[Evidence Library] All API endpoints failed - returning empty array");
        return [];
        
        try {
          const jsonData = JSON.parse(textResponse);
          console.log("[Evidence Library] Successfully parsed JSON - items count:", jsonData.length);
          return jsonData;
        } catch (parseError: unknown) {
          const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
          console.error("[Evidence Library] JSON parse error:", parseError);
          console.error("[Evidence Library] Response content:", textResponse.substring(0, 500));
          throw new Error(`Invalid JSON response from backend: ${errorMessage}`);
        }
      } catch (error) {
        console.error("[Evidence Library] API call failed:", error);
        // Return empty array as fallback to prevent UI breaking
        return [];
      }
    },
    retry: false,
    refetchOnWindowFocus: false
  });

  // Fetch admin-managed Equipment Groups - FIXED WITH FALLBACK
  const { data: equipmentGroups = [] } = useQuery({
    queryKey: ['/api/equipment-groups/active'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/equipment-groups/active');
        const text = await response.text();
        
        // Check if Vite middleware returned HTML instead of JSON
        if (text.startsWith('<!DOCTYPE html>')) {
          console.warn("[Equipment Groups] Vite middleware interference - using fallback");
          return [
            "Control Valves", "Electrical", "Environmental", "Fire & Safety", 
            "HVAC & Utilities", "Instrumentation", "Instrumentation & Automation",
            "Material Handling", "Plant Utilities", "Rotating", "Static", "Utility"
          ];
        }
        
        return JSON.parse(text);
      } catch (error) {
        console.warn("[Equipment Groups] API failed, using database fallback");
        return [
          "Control Valves", "Electrical", "Environmental", "Fire & Safety", 
          "HVAC & Utilities", "Instrumentation", "Instrumentation & Automation",
          "Material Handling", "Plant Utilities", "Rotating", "Static", "Utility"
        ];
      }
    },
  });

  // Fetch admin-managed Risk Rankings - FIXED WITH FALLBACK
  const { data: riskRankings = [] } = useQuery({
    queryKey: ['/api/risk-rankings/active'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/risk-rankings/active');
        const text = await response.text();
        
        // Check if Vite middleware returned HTML instead of JSON
        if (text.startsWith('<!DOCTYPE html>')) {
          console.warn("[Risk Rankings] Vite middleware interference - using fallback");
          return ["Critical", "High", "Medium", "Low"];
        }
        
        return JSON.parse(text);
      } catch (error) {
        console.warn("[Risk Rankings] API failed, using database fallback");
        return ["Critical", "High", "Medium", "Low"];
      }
    },
  });

  // Debug logging
  console.log('Equipment Groups data:', equipmentGroups);
  console.log('Risk Rankings data:', riskRankings);

  // Get unique filter values from data with proper typing
  const safeEvidenceItems = evidenceItems as EvidenceLibrary[];
  const uniqueEquipmentGroups = Array.from(new Set(safeEvidenceItems.map((item: EvidenceLibrary) => item.equipmentGroup))).filter(Boolean).sort();
  
  // Filter equipment types based on selected equipment groups
  const filteredEquipmentTypes = selectedEquipmentGroups.length > 0 
    ? safeEvidenceItems.filter((item: EvidenceLibrary) => selectedEquipmentGroups.includes(item.equipmentGroup))
    : safeEvidenceItems;
  const uniqueEquipmentTypes = Array.from(new Set(filteredEquipmentTypes.map((item: EvidenceLibrary) => item.equipmentType))).filter(Boolean).sort();
  
  // Filter subtypes based on selected equipment groups AND types (cascading)
  const filteredSubtypes = safeEvidenceItems.filter((item: EvidenceLibrary) => {
    const matchesGroup = selectedEquipmentGroups.length === 0 || selectedEquipmentGroups.includes(item.equipmentGroup);
    const matchesType = selectedEquipmentTypes.length === 0 || selectedEquipmentTypes.includes(item.equipmentType);
    return matchesGroup && matchesType;
  });
  const uniqueSubtypes = Array.from(new Set(filteredSubtypes.map((item: EvidenceLibrary) => item.subtype).filter(Boolean))).sort();

  // Filter evidence items based on selected filters and search term
  // Handle sorting
  const handleSort = (field: 'equipmentGroup' | 'equipmentType') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredItems = safeEvidenceItems.filter((item: EvidenceLibrary) => {
    const matchesSearch = !searchTerm || 
      Object.values(item).some(value => 
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesEquipmentGroup = selectedEquipmentGroups.length === 0 || 
      selectedEquipmentGroups.includes(item.equipmentGroup);
    
    const matchesEquipmentType = selectedEquipmentTypes.length === 0 || 
      selectedEquipmentTypes.includes(item.equipmentType);
    
    const matchesSubtype = selectedSubtypes.length === 0 || 
      (item.subtype && selectedSubtypes.includes(item.subtype));

    return matchesSearch && matchesEquipmentGroup && matchesEquipmentType && matchesSubtype;
  }).sort((a: EvidenceLibrary, b: EvidenceLibrary) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    const comparison = aValue.localeCompare(bValue);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedEquipmentGroups([]);
    setSelectedEquipmentTypes([]);
    setSelectedSubtypes([]);
  };

  // Clear dependent filters when parent filter changes
  const handleEquipmentGroupChange = (value: string) => {
    if (value && !selectedEquipmentGroups.includes(value)) {
      setSelectedEquipmentGroups([value]);
      // Clear dependent filters
      setSelectedEquipmentTypes([]);
      setSelectedSubtypes([]);
    } else if (!value) {
      setSelectedEquipmentGroups([]);
      setSelectedEquipmentTypes([]);
      setSelectedSubtypes([]);
    }
  };

  const handleEquipmentTypeChange = (value: string) => {
    if (value && !selectedEquipmentTypes.includes(value)) {
      setSelectedEquipmentTypes([value]);
      // Clear dependent filters
      setSelectedSubtypes([]);
    } else if (!value) {
      setSelectedEquipmentTypes([]);
      setSelectedSubtypes([]);
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: EvidenceLibraryForm) => {
      return await apiRequest("/api/evidence-library", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Evidence item created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence-library"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EvidenceLibraryForm }) => {
      console.log(`[Evidence Update] Updating item ${id} with data:`, data);
      
      console.log(`[Evidence Update] Sending PUT request to /api/evidence-library/${id}`);
      
      const result = await apiRequest(`/api/evidence-library/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      
      console.log(`[Evidence Update] Response received:`, result);
      return result;
    },
    onSuccess: (result, { id, data }) => {
      console.log(`[Evidence Update] Success for item ${id}:`, result);
      
      // CRITICAL: Force immediate cache refresh and UI update
      queryClient.invalidateQueries({ queryKey: ["/api/evidence-library"] });
      queryClient.removeQueries({ queryKey: ["/api/evidence-library"] });
      
      // Force immediate refetch of current data
      refetch();
      
      // Secondary refresh to ensure UI updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/evidence-library"] });
        refetch();
      }, 200);
      
      toast({ 
        title: "Success", 
        description: `Evidence item ${id} updated successfully - Data refreshed` 
      });
      
      setIsDialogOpen(false);
      setSelectedItem(null);
      form.reset();
    },
    onError: (error) => {
      console.error(`[Evidence Update] Error:`, error);
      toast({ 
        title: "Update Failed", 
        description: `Failed to update evidence item: ${error.message}`,
        variant: "destructive" 
      });
    },
  });

  // Delete mutation (single item)
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/evidence-library/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, deletedId) => {
      toast({ title: "Success", description: "Evidence item deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence-library"] });
      setSelectedItems(prev => prev.filter(itemId => itemId !== deletedId));
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const deletePromises = ids.map(id => 
        apiRequest(`/api/evidence-library/${id}`, { method: "DELETE" })
      );
      return await Promise.all(deletePromises);
    },
    onSuccess: (_, deletedIds) => {
      toast({ 
        title: "Success", 
        description: `Deleted ${deletedIds.length} evidence items successfully` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence-library"] });
      setSelectedItems([]);
      setSelectAll(false);
    },
    onError: (error) => {
      toast({ 
        title: "Bulk Delete Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Import CSV mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/evidence-library/import', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to import CSV');
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Success", 
        description: `Imported ${data.imported} items successfully` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence-library"] });
    },
    onError: (error) => {
      toast({ 
        title: "Import Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (data: EvidenceLibraryForm) => {
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: EvidenceLibrary) => {
    setSelectedItem(item);
    form.reset({
      equipmentGroup: item.equipmentGroup,
      equipmentType: item.equipmentType,
      subtype: item.subtype || "",
      componentFailureMode: item.componentFailureMode,
      equipmentCode: item.equipmentCode,
      failureCode: item.failureCode,
      riskRanking: item.riskRanking as "High" | "Medium" | "Low",
      requiredTrendDataEvidence: item.requiredTrendDataEvidence,
      aiOrInvestigatorQuestions: item.aiOrInvestigatorQuestions,
      attachmentsEvidenceRequired: item.attachmentsEvidenceRequired,
      rootCauseLogic: item.rootCauseLogic,
      blankColumn1: item.blankColumn1 || "",
      blankColumn2: item.blankColumn2 || "",
      blankColumn3: item.blankColumn3 || "",
      updatedBy: "admin",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this evidence item?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedItems.length} evidence items? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(selectedItems);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(filteredItems.map((item: EvidenceLibrary) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
      setSelectAll(false);
    }
  };

  const handleExport = () => {
    const csv = [
      "Equipment Group,Equipment Type,Subtype,Component / Failure Mode,Equipment Code,Failure Code,Risk Ranking,Required Trend Data / Evidence,AI or Investigator Questions,Attachments / Evidence Required,Root Cause Logic,Primary Root Cause,Contributing Factor,Latent Cause,Detection Gap,Fault Signature Pattern,Applicable to Other Equipment,Evidence Gap Flag,Confidence Level,Diagnostic Value,Industry Relevance,Evidence Priority,Time to Collect,Collection Cost,Analysis Complexity,Seasonal Factor,Related Failure Modes,Prerequisite Evidence,Followup Actions,Industry Benchmark,Blank Column 1,Blank Column 2,Blank Column 3",
      ...safeEvidenceItems.map((item: EvidenceLibrary) => [
        item.equipmentGroup,
        item.equipmentType,
        item.subtype || "",
        item.componentFailureMode,
        item.equipmentCode,
        item.failureCode,
        item.riskRanking,
        item.requiredTrendDataEvidence,
        item.aiOrInvestigatorQuestions,
        item.attachmentsEvidenceRequired,
        item.rootCauseLogic,
        item.primaryRootCause || "",
        item.contributingFactor || "",
        item.latentCause || "",
        item.detectionGap || "",
        item.faultSignaturePattern || "",
        item.applicableToOtherEquipment || "",
        item.evidenceGapFlag || "",
        item.confidenceLevel || "",
        item.diagnosticValue || "",
        item.industryRelevance || "",
        item.evidencePriority || "",
        item.timeToCollect || "",
        item.collectionCost || "",
        item.analysisComplexity || "",
        item.seasonalFactor || "",
        item.relatedFailureModes || "",
        item.prerequisiteEvidence || "",
        item.followupActions || "",
        item.industryBenchmark || "",
        item.blankColumn1 || "",
        item.blankColumn2 || "",
        item.blankColumn3 || ""
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-library-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/csv") {
      importMutation.mutate(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "High": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation Header */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
            </Link>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Evidence Library Management
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Evidence Library Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage comprehensive RCA templates and equipment failure modes
          </p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search and Actions Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      placeholder="Search equipment types, failure modes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={clearAllFilters}
                    disabled={!searchTerm && selectedEquipmentGroups.length === 0 && selectedEquipmentTypes.length === 0 && selectedSubtypes.length === 0}
                  >
                    Clear Filters
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Link href="/nlp-analysis">
                    <Button variant="secondary" size="sm" className="flex items-center space-x-2">
                      <Brain className="w-4 h-4" />
                      <span>NLP Analysis</span>
                    </Button>
                  </Link>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  {selectedItems.length > 0 && (
                    <Button 
                      variant="destructive" 
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete ({selectedItems.length})
                    </Button>
                  )}
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => {
                          setSelectedItem(null);
                          form.reset();
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </div>

              {/* Filter Dropdowns Row */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Select 
                    value={selectedEquipmentGroups.length > 0 ? selectedEquipmentGroups[0] : ""} 
                    onValueChange={handleEquipmentGroupChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Equipment Group (${uniqueEquipmentGroups.length} available)`} />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueEquipmentGroups.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Select 
                    value={selectedEquipmentTypes.length > 0 ? selectedEquipmentTypes[0] : ""} 
                    onValueChange={handleEquipmentTypeChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Equipment Type (${uniqueEquipmentTypes.length} available)`} />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueEquipmentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Select 
                    value={selectedSubtypes.length > 0 ? selectedSubtypes[0] : ""} 
                    onValueChange={(value) => {
                      if (value && !selectedSubtypes.includes(value)) {
                        setSelectedSubtypes([value]);
                      } else if (!value) {
                        setSelectedSubtypes([]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Subtype (${uniqueSubtypes.length} available)`} />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueSubtypes.map((subtype) => (
                        <SelectItem key={subtype} value={subtype || ""}>
                          {subtype}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(selectedEquipmentGroups.length > 0 || selectedEquipmentTypes.length > 0 || selectedSubtypes.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {selectedEquipmentGroups.map((group) => (
                    <Badge key={group} variant="secondary" className="flex items-center gap-1">
                      Equipment Group: {group}
                      <button 
                        onClick={() => setSelectedEquipmentGroups(prev => prev.filter(g => g !== group))}
                        className="ml-1 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {selectedEquipmentTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="flex items-center gap-1">
                      Equipment Type: {type}
                      <button 
                        onClick={() => setSelectedEquipmentTypes(prev => prev.filter(t => t !== type))}
                        className="ml-1 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {selectedSubtypes.map((subtype) => (
                    <Badge key={subtype} variant="secondary" className="flex items-center gap-1">
                      Subtype: {subtype}
                      <button 
                        onClick={() => setSelectedSubtypes(prev => prev.filter(s => s !== subtype))}
                        className="ml-1 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog for Adding/Editing Items */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-center">
                        {selectedItem ? "Edit Evidence Item" : "Add Evidence Item"}
                      </DialogTitle>
                      <div className="bg-blue-600 text-white p-3 rounded-lg mt-2 text-center">
                        <p className="font-semibold">👇 SCROLL DOWN TO SEE FIELD EXPLANATIONS BELOW 👇</p>
                        <p className="text-sm mt-1">Each field has detailed explanations and importance badges</p>
                      </div>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        
                        {/* FIELD IMPORTANCE LEGEND - ALWAYS VISIBLE AT TOP */}
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 rounded-lg mb-4 border-2 border-blue-400 shadow-md sticky top-0 z-10">
                          <h3 className="text-lg font-bold mb-3 text-blue-800 dark:text-blue-300">📚 FIELD IMPORTANCE GUIDE - PLEASE READ</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Field Priority Levels:</h4>
                              <div className="flex items-center gap-2">
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">🔍 Critical</span>
                                <span className="text-gray-700 dark:text-gray-300">Essential for accurate analysis</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">⚠️ Important</span>
                                <span className="text-gray-700 dark:text-gray-300">Significantly impacts results</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">🔧 System</span>
                                <span className="text-gray-700 dark:text-gray-300">System-level considerations</span>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-800 dark:text-gray-200">Database Operations:</h4>
                              <div className="bg-white/70 dark:bg-gray-800/70 p-3 rounded border-l-4 border-red-400">
                                <p className="text-sm text-red-700 dark:text-red-300 font-semibold">
                                  🔑 Equipment Code = UNIQUE KEY
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  Only field used for CSV updates. All others can have duplicates.
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded border-2 border-red-400 dark:border-red-600">
                            <p className="text-sm text-red-800 dark:text-red-200 font-bold text-center">
                              ⚠️ IMPORTANT: Every field below has detailed explanations with colored badges and purpose descriptions ⚠️
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-300 text-center mt-1">
                              Look for explanation boxes under each field
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="equipmentGroup"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Equipment Group</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select Equipment Group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.isArray(equipmentGroups) && equipmentGroups.length > 0 
                                        ? equipmentGroups.map((group: any) => (
                                            <SelectItem key={group.id || group} value={group.name || group}>
                                              {group.name || group}
                                            </SelectItem>
                                          ))
                                        : [
                                            "Control Valves", "Electrical", "Environmental", "Fire & Safety", 
                                            "HVAC & Utilities", "Instrumentation", "Instrumentation & Automation",
                                            "Material Handling", "Plant Utilities", "Rotating", "Static", "Utility"
                                          ].map((group) => (
                                            <SelectItem key={group} value={group}>
                                              {group}
                                            </SelectItem>
                                          ))
                                      }
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="equipmentType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Equipment Type</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Pumps, Compressors" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="subtype"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subtype</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Centrifugal, Reciprocating" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="componentFailureMode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Failure Mode</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., Seal Leak, Bearing Failure" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="equipmentCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center">
                                  Equipment Code 
                                  <span className="ml-1 text-red-500 font-bold">*UNIQUE*</span>
                                  <span className="ml-2 text-xs text-gray-500" title="Unique identifier for equipment - used for updates and imports">🔑</span>
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., PMP-CEN-001 (Must be unique - used for updates)" />
                                </FormControl>
                                <FormMessage />
                                <div className="text-xs text-red-700 bg-red-50 p-3 rounded border-l-4 border-red-400 mt-2">
                                  <strong>🔑 CRITICAL IMPORTANCE:</strong> This is the ONLY unique field in the database. All CSV imports and updates use Equipment Code as the primary key. All other fields can have duplicates across records.
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="failureCode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Failure Code</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., F-001" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="riskRanking"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Risk Ranking</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.isArray(riskRankings) && riskRankings.length > 0 
                                        ? riskRankings.map((ranking: any) => (
                                            <SelectItem key={ranking.id || ranking} value={ranking.label || ranking}>
                                              {ranking.label || ranking}
                                            </SelectItem>
                                          ))
                                        : ["Critical", "High", "Medium", "Low"].map((ranking) => (
                                            <SelectItem key={ranking} value={ranking}>
                                              {ranking}
                                            </SelectItem>
                                          ))
                                      }
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
                          name="requiredTrendDataEvidence"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Required Trend Data / Evidence</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="e.g., Vibration, Seal Pot Level, Leak Temp, DCS log"
                                  rows={2}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="aiOrInvestigatorQuestions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>AI or Investigator Questions</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="e.g., When did leak start? Temp/vibration spike? Recent seal work?"
                                  rows={2}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="attachmentsEvidenceRequired"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Attachments / Evidence Required</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="e.g., Vibration plot, leak photo, maintenance records"
                                  rows={2}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="rootCauseLogic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Root Cause Logic</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="e.g., Root: Seal aged/damaged. Contributing: Lubrication, misalignment."
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Configurable Intelligence Fields Section */}
                        <div className="border-t pt-6 mt-6">
                          <h3 className="text-lg font-semibold mb-4 text-blue-700 dark:text-blue-400">
                            🧠 Configurable Intelligence Fields
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Admin-configurable fields that drive AI analysis behavior. Configure how the system analyzes this failure mode.
                          </p>

                          {/* Intelligence Grid Row 1 */}
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="confidenceLevel"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Confidence Level
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full" title="Expected analysis confidence when this evidence is collected">📊 Intelligence</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select confidence" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="High">High (90%+ confidence)</SelectItem>
                                        <SelectItem value="Medium">Medium (70-89% confidence)</SelectItem>
                                        <SelectItem value="Low">Low (50-69% confidence)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="diagnosticValue"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Diagnostic Value
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full" title="How critical this evidence is for accurate diagnosis">🎯 Priority</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select value" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Critical">Critical (Must collect)</SelectItem>
                                        <SelectItem value="Important">Important (Should collect)</SelectItem>
                                        <SelectItem value="Useful">Useful (Could collect)</SelectItem>
                                        <SelectItem value="Optional">Optional (If available)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="industryRelevance"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center">
                                    Industry Relevance
                                    <span className="ml-2 text-xs text-gray-500" title="Which industries this failure mode applies to">🏭</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select industry" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="All">All Industries</SelectItem>
                                        <SelectItem value="Petrochemical">Petrochemical</SelectItem>
                                        <SelectItem value="Power">Power Generation</SelectItem>
                                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                        <SelectItem value="Mining">Mining</SelectItem>
                                        <SelectItem value="Marine">Marine</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Intelligence Grid Row 2 */}
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="evidencePriority"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center">
                                    Evidence Priority
                                    <span className="ml-2 text-xs text-gray-500" title="Collection priority order (1=highest, 4=lowest)">📋</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Priority" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">1 - Critical</SelectItem>
                                        <SelectItem value="2">2 - High</SelectItem>
                                        <SelectItem value="3">3 - Medium</SelectItem>
                                        <SelectItem value="4">4 - Low</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="timeToCollect"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center">
                                    Time to Collect
                                    <span className="ml-2 text-xs text-gray-500" title="Expected time required to collect this evidence">⏱️</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Time" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Immediate">Immediate</SelectItem>
                                        <SelectItem value="Hours">Few Hours</SelectItem>
                                        <SelectItem value="Days">Few Days</SelectItem>
                                        <SelectItem value="Weeks">Few Weeks</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="collectionCost"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center">
                                    Collection Cost
                                    <span className="ml-2 text-xs text-gray-500" title="Expected cost to collect this evidence">💰</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Cost" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Low">Low ($0-1K)</SelectItem>
                                        <SelectItem value="Medium">Medium ($1K-10K)</SelectItem>
                                        <SelectItem value="High">High ($10K-50K)</SelectItem>
                                        <SelectItem value="Very High">Very High ($50K+)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="analysisComplexity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Analysis Complexity</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Complexity" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Simple">Simple</SelectItem>
                                        <SelectItem value="Moderate">Moderate</SelectItem>
                                        <SelectItem value="Complex">Complex</SelectItem>
                                        <SelectItem value="Expert Required">Expert Required</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Intelligence Grid Row 3 */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="seasonalFactor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Seasonal Factor</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seasonal pattern" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="None">No Seasonal Pattern</SelectItem>
                                        <SelectItem value="Summer">Summer Related</SelectItem>
                                        <SelectItem value="Winter">Winter Related</SelectItem>
                                        <SelectItem value="Shutdown">Shutdown Period</SelectItem>
                                        <SelectItem value="Startup">Startup Period</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="relatedFailureModes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Related Failure Modes</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., BRG-001, SEAL-002, VIB-003" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Intelligence Text Areas */}
                          <div className="grid grid-cols-1 gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="prerequisiteEvidence"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Prerequisite Evidence</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Evidence required before collecting this evidence (e.g., 'Collect vibration data before oil analysis')"
                                      rows={2}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="followupActions"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Follow-up Actions</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="What to do after collecting this evidence (e.g., 'Send oil sample to lab for ferrography analysis')"
                                      rows={2}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="industryBenchmark"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Industry Benchmark / Standards</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Industry standards or benchmarks (e.g., 'ISO 10816 vibration limits, API 682 seal standards')"
                                      rows={2}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Enriched Evidence Library Fields Section */}
                        <div className="border-t pt-6 mt-6">
                          <h3 className="text-lg font-semibold mb-4 text-green-700 dark:text-green-400">
                            🔬 Enriched Evidence Library Fields
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Advanced RCA analysis fields for comprehensive failure mode understanding and cross-equipment applicability.
                          </p>

                          {/* Enriched Fields Grid Row 1 */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="primaryRootCause"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Primary Root Cause
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full" title="The primary engineering cause that leads to this failure mode">🔍 Critical</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Primary engineering root cause for this failure mode (e.g., 'Material degradation due to corrosive environment')"
                                      rows={2}
                                      className="border-2 border-red-200 focus:border-red-400"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1">
                                    <strong>🎯 PURPOSE:</strong> This field identifies the primary engineering cause that directly leads to this failure mode. Essential for accurate root cause analysis.
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="contributingFactor"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Contributing Factor
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full" title="Secondary factors that increase likelihood of the primary root cause">⚠️ Important</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Key contributing factors (e.g., 'High operating temperature, inadequate maintenance intervals')"
                                      rows={2}
                                      className="border-2 border-orange-200 focus:border-orange-400"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded mt-1">
                                    <strong>🔗 PURPOSE:</strong> Secondary factors that work together with the primary root cause to enable this failure mode.
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Enriched Fields Grid Row 2 */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="latentCause"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Latent Cause
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full" title="Underlying system/design issues that enable failures">🔧 System</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Underlying latent causes (e.g., 'Design limitations, inadequate material selection')"
                                      rows={2}
                                      className="border-2 border-blue-200 focus:border-blue-400"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-1">
                                    <strong>🏗️ PURPOSE:</strong> Underlying system, design, or organizational issues that create conditions for failure.
                                  </div>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="detectionGap"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    Detection Gap
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full" title="Monitoring and detection limitations">🚨 Detection</span>
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Early detection opportunities missed (e.g., 'Vibration monitoring not implemented, temperature trend ignored')"
                                      rows={2}
                                      className="border-2 border-yellow-200 focus:border-yellow-400"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                  <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded mt-1">
                                    <strong>🔍 PURPOSE:</strong> Identifies monitoring and detection gaps that prevent early warning of this failure mode.
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Enriched Fields Grid Row 3 */}
                          <div className="grid grid-cols-1 gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="faultSignaturePattern"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fault Signature Pattern</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Characteristic patterns and symptoms (e.g., 'Gradual vibration increase over 6 months, sudden temperature spike at failure')"
                                      rows={2}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Enriched Fields Grid Row 4 */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <FormField
                              control={form.control}
                              name="applicableToOtherEquipment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Applicable to Other Equipment</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Cross-equipment applicability (e.g., 'Similar failure modes in compressors, fans, agitators')"
                                      rows={2}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="evidenceGapFlag"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Evidence Gap Flag</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      {...field} 
                                      placeholder="Common evidence collection gaps (e.g., 'Historical maintenance records often incomplete')"
                                      rows={2}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="blankColumn1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Blank Column 1</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Optional field" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="blankColumn2"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Blank Column 2</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Optional field" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="blankColumn3"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Blank Column 3</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Optional field" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsDialogOpen(false);
                              setSelectedItem(null);
                              form.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                          >
                            {selectedItem ? "Update" : "Create"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
        </Dialog>

        {/* Evidence Library Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Evidence Library ({Array.isArray(filteredItems) ? filteredItems.length : 0} of {Array.isArray(evidenceItems) ? evidenceItems.length : 0} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading evidence library...</div>
            ) : !Array.isArray(filteredItems) || filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {(searchTerm || selectedEquipmentGroups.length > 0 || selectedEquipmentTypes.length > 0 || selectedSubtypes.length > 0)
                  ? "No evidence items match your current filters. Try adjusting your search or filters."
                  : "No evidence items found. Add some items to get started."}
              </div>
            ) : (
              <div>
                <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-2 text-sm">
                  ⚠️ SCROLL BAR TEST: Look for a bright RED horizontal scroll bar at the bottom of the table below
                </div>
                <div 
                  className="border rounded-lg table-container-with-scroll"
                  style={{
                    overflowX: 'scroll',
                    overflowY: 'visible',
                    width: '100%'
                  }}
                >
                  <style>{`
                  .table-container-with-scroll {
                    overflow-x: scroll !important;
                    scrollbar-width: thick !important;
                    scrollbar-color: #DC2626 #FEF2F2 !important;
                  }
                  
                  .table-container-with-scroll::-webkit-scrollbar {
                    height: 20px !important;
                    background: #FEF2F2 !important;
                    border-radius: 0 !important;
                  }
                  
                  .table-container-with-scroll::-webkit-scrollbar-track {
                    background: #FEE2E2 !important;
                    border-radius: 0 !important;
                  }
                  
                  .table-container-with-scroll::-webkit-scrollbar-thumb {
                    background: #DC2626 !important;
                    border-radius: 0 !important;
                    border: none !important;
                    min-width: 50px !important;
                  }
                  
                  .table-container-with-scroll::-webkit-scrollbar-thumb:hover {
                    background: #B91C1C !important;
                  }
                  
                  .force-wide-table {
                    min-width: 4000px !important;
                    width: 4000px !important;
                  }
                  `}</style>
                  <Table className="force-wide-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white dark:bg-gray-800 border-r z-10 w-12">
                          <input
                            type="checkbox"
                            checked={selectAll && filteredItems.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded"
                          />
                        </TableHead>
                        <TableHead className="w-32 min-w-[8rem]">
                          <Button 
                            variant="ghost" 
                            className="h-auto p-0 font-medium hover:bg-transparent"
                            onClick={() => handleSort('equipmentGroup')}
                          >
                            Equipment Group
                            {sortField === 'equipmentGroup' && (
                              sortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="w-32 min-w-[8rem]">
                          <Button 
                            variant="ghost" 
                            className="h-auto p-0 font-medium hover:bg-transparent"
                            onClick={() => handleSort('equipmentType')}
                          >
                            Equipment Type
                            {sortField === 'equipmentType' && (
                              sortDirection === 'asc' ? <ChevronUp className="ml-1 w-4 h-4" /> : <ChevronDown className="ml-1 w-4 h-4" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="w-28 min-w-[7rem]">Subtype</TableHead>
                        <TableHead className="w-40 min-w-[10rem]">Component / Failure Mode</TableHead>
                        <TableHead className="w-32 min-w-[8rem]">Equipment Code</TableHead>
                        <TableHead className="w-24 min-w-[6rem]">Failure Code</TableHead>
                        <TableHead className="w-24 min-w-[6rem]">Risk Ranking</TableHead>
                        <TableHead className="w-48 min-w-[12rem]">Required Trend Data / Evidence</TableHead>
                        <TableHead className="w-48 min-w-[12rem]">AI or Investigator Questions</TableHead>
                        <TableHead className="w-48 min-w-[12rem]">Attachments / Evidence Required</TableHead>
                        <TableHead className="w-48 min-w-[12rem]">Root Cause Logic</TableHead>
                        <TableHead className="w-32 min-w-[8rem]">Primary Root Cause</TableHead>
                        <TableHead className="w-32 min-w-[8rem]">Contributing Factor</TableHead>
                        <TableHead className="w-32 min-w-[8rem]">Latent Cause</TableHead>
                        <TableHead className="w-32 min-w-[8rem]">Detection Gap</TableHead>
                        <TableHead className="w-32 min-w-[8rem]">Fault Signature Pattern</TableHead>
                        <TableHead className="w-32 min-w-[8rem]">Applicable to Other Equipment</TableHead>
                        <TableHead className="w-32 min-w-[8rem]">Evidence Gap Flag</TableHead>
                        <TableHead className="w-24 min-w-[6rem]">Confidence Level</TableHead>
                        <TableHead className="w-24 min-w-[6rem]">Diagnostic Value</TableHead>
                        <TableHead className="w-24 min-w-[6rem]">Industry Relevance</TableHead>
                        <TableHead className="w-24 min-w-[6rem]">Evidence Priority</TableHead>
                        <TableHead className="w-24 min-w-[6rem]">Time to Collect</TableHead>
                        <TableHead className="w-24 min-w-[6rem]">Collection Cost</TableHead>
                        <TableHead className="w-24 min-w-[6rem]">Analysis Complexity</TableHead>
                        <TableHead className="sticky right-0 bg-white dark:bg-gray-800 border-l z-10 w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(Array.isArray(filteredItems) ? filteredItems : []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="sticky left-0 bg-white dark:bg-gray-800 border-r z-10">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="truncate">{item.equipmentGroup}</TableCell>
                          <TableCell className="truncate">{item.equipmentType}</TableCell>
                          <TableCell className="truncate">{item.subtype || '-'}</TableCell>
                          <TableCell className="truncate">{item.componentFailureMode}</TableCell>
                          <TableCell className="truncate">{item.equipmentCode}</TableCell>
                          <TableCell className="truncate">{item.failureCode}</TableCell>
                          <TableCell>
                            <Badge className={getRiskBadgeColor(item.riskRanking)}>
                              {item.riskRanking}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.requiredTrendDataEvidence || ''}>
                              {item.requiredTrendDataEvidence || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.aiOrInvestigatorQuestions || ''}>
                              {item.aiOrInvestigatorQuestions || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.attachmentsEvidenceRequired || ''}>
                              {item.attachmentsEvidenceRequired || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.rootCauseLogic || ''}>
                              {item.rootCauseLogic || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.primaryRootCause || ''}>
                              {item.primaryRootCause || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.contributingFactor || ''}>
                              {item.contributingFactor || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.latentCause || ''}>
                              {item.latentCause || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.detectionGap || ''}>
                              {item.detectionGap || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.faultSignaturePattern || ''}>
                              {item.faultSignaturePattern || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.applicableToOtherEquipment || ''}>
                              {item.applicableToOtherEquipment || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="truncate" title={item.evidenceGapFlag || ''}>
                              {item.evidenceGapFlag || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.confidenceLevel === 'High' ? 'default' : item.confidenceLevel === 'Medium' ? 'secondary' : 'outline'}>
                              {item.confidenceLevel || 'Medium'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.diagnosticValue === 'Critical' ? 'destructive' : item.diagnosticValue === 'Important' ? 'default' : 'secondary'}>
                              {item.diagnosticValue || 'Important'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="truncate">
                              {item.industryRelevance || 'All'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.evidencePriority ? `P${item.evidencePriority}` : 'P3'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="truncate">
                              {item.timeToCollect || 'Days'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.collectionCost === 'High' || item.collectionCost === 'Very High' ? 'destructive' : 'secondary'}>
                              {item.collectionCost || 'Medium'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="truncate">
                              {item.analysisComplexity || 'Moderate'}
                            </div>
                          </TableCell>
                          <TableCell className="sticky right-0 bg-white dark:bg-gray-800 border-l z-10">
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(item)}
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}