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
import { Search, Plus, Upload, Download, Edit, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schema for evidence library items
const evidenceLibrarySchema = z.object({
  equipmentGroup: z.string().min(1, "Equipment group is required"),
  equipmentType: z.string().min(1, "Equipment type is required"),
  subtypeExample: z.string().optional(),
  componentFailureMode: z.string().min(1, "Failure mode is required"),
  equipmentCode: z.string().min(1, "Equipment code is required"),
  failureCode: z.string().min(1, "Failure code is required"),
  riskRanking: z.enum(["High", "Medium", "Low"]),
  requiredTrendDataEvidence: z.string().min(1, "Required trend data is required"),
  aiOrInvestigatorQuestions: z.string().min(1, "AI questions are required"),
  attachmentsEvidenceRequired: z.string().min(1, "Attachments required is required"),
  rootCauseLogic: z.string().min(1, "Root cause logic is required"),
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
  subtypeExample?: string;
  componentFailureMode: string;
  equipmentCode: string;
  failureCode: string;
  riskRanking: string;
  requiredTrendDataEvidence: string;
  aiOrInvestigatorQuestions: string;
  attachmentsEvidenceRequired: string;
  rootCauseLogic: string;
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

  const form = useForm<EvidenceLibraryForm>({
    resolver: zodResolver(evidenceLibrarySchema),
    defaultValues: {
      equipmentGroup: "",
      equipmentType: "",
      subtypeExample: "",
      componentFailureMode: "",
      equipmentCode: "",
      failureCode: "",
      riskRanking: "Medium",
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

  // Query for evidence library items
  const { data: evidenceItems = [], isLoading, refetch } = useQuery<EvidenceLibrary[]>({
    queryKey: ["/api/evidence-library"],
    queryFn: async () => {
      const url = searchTerm 
        ? `/api/evidence-library/search?q=${encodeURIComponent(searchTerm)}`
        : "/api/evidence-library";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch evidence library");
      return response.json();
    },
  });

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
      return await apiRequest(`/api/evidence-library/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Evidence item updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence-library"] });
      setIsDialogOpen(false);
      setSelectedItem(null);
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/evidence-library/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Evidence item deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/evidence-library"] });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
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
      subtypeExample: item.subtypeExample || "",
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

  const handleExport = () => {
    const csv = [
      "Equipment Group,Equipment Type,Subtype / Example,Component / Failure Mode,Equipment Code,Failure Code,Risk Ranking,Required Trend Data / Evidence,AI or Investigator Questions,Attachments / Evidence Required,Root Cause Logic,Blank Column 1,Blank Column 2,Blank Column 3",
      ...evidenceItems.map(item => [
        item.equipmentGroup,
        item.equipmentType,
        item.subtypeExample || "",
        item.componentFailureMode,
        item.equipmentCode,
        item.failureCode,
        item.riskRanking,
        item.requiredTrendDataEvidence,
        item.aiOrInvestigatorQuestions,
        item.attachmentsEvidenceRequired,
        item.rootCauseLogic,
        item.blankColumn1 || "",
        item.blankColumn2 || "",
        item.blankColumn3 || ""
      ].map(field => `"${field.replace(/"/g, '""')}"`).join(","))
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
              </div>
              
              <div className="flex space-x-2">
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
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {selectedItem ? "Edit Evidence Item" : "Add Evidence Item"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                                      <SelectValue placeholder="Select group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Rotating">Rotating</SelectItem>
                                      <SelectItem value="Static">Static</SelectItem>
                                      <SelectItem value="Electrical">Electrical</SelectItem>
                                      <SelectItem value="Instrumentation">Instrumentation</SelectItem>
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
                            name="subtypeExample"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subtype / Example</FormLabel>
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
                                <FormLabel>Equipment Code</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g., PMP-CEN-001" />
                                </FormControl>
                                <FormMessage />
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
                                      <SelectItem value="High">High</SelectItem>
                                      <SelectItem value="Medium">Medium</SelectItem>
                                      <SelectItem value="Low">Low</SelectItem>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evidence Library Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Evidence Library ({evidenceItems.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading evidence library...</div>
            ) : evidenceItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No evidence items found. Add some items to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment Group</TableHead>
                      <TableHead>Equipment Type</TableHead>
                      <TableHead>Subtype / Example</TableHead>
                      <TableHead>Component / Failure Mode</TableHead>
                      <TableHead>Equipment Code</TableHead>
                      <TableHead>Failure Code</TableHead>
                      <TableHead>Risk Ranking</TableHead>
                      <TableHead>Required Trend Data / Evidence</TableHead>
                      <TableHead>AI or Investigator Questions</TableHead>
                      <TableHead>Attachments / Evidence Required</TableHead>
                      <TableHead>Root Cause Logic</TableHead>
                      <TableHead>Blank Column 1</TableHead>
                      <TableHead>Blank Column 2</TableHead>
                      <TableHead>Blank Column 3</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evidenceItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.equipmentGroup}</TableCell>
                        <TableCell>{item.equipmentType}</TableCell>
                        <TableCell>{item.subtypeExample || '-'}</TableCell>
                        <TableCell>{item.componentFailureMode}</TableCell>
                        <TableCell>{item.equipmentCode}</TableCell>
                        <TableCell>{item.failureCode}</TableCell>
                        <TableCell>
                          <Badge className={getRiskBadgeColor(item.riskRanking)}>
                            {item.riskRanking}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{item.requiredTrendDataEvidence || '-'}</div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{item.aiOrInvestigatorQuestions || '-'}</div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{item.attachmentsEvidenceRequired || '-'}</div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{item.rootCauseLogic || '-'}</div>
                        </TableCell>
                        <TableCell>{item.blankColumn1 || '-'}</TableCell>
                        <TableCell>{item.blankColumn2 || '-'}</TableCell>
                        <TableCell>{item.blankColumn3 || '-'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}