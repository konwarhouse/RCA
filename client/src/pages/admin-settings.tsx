import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, TestTube, Save, Shield, AlertTriangle, Database, Plus, Edit3, Download, Upload, Home, ArrowLeft, FileUp, FileDown } from "lucide-react";
import { Link } from "wouter";
import type { AiSettings, InsertAiSettings, EquipmentGroup, RiskRanking } from "@shared/schema";

export default function AdminSettings() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<InsertAiSettings>({
    provider: "openai",
    apiKey: "",
    isActive: false,
    createdBy: 1, // Mock admin user ID
    testStatus: null
  });
  const [newEquipmentGroup, setNewEquipmentGroup] = useState({ name: "" });
  const [newRiskRanking, setNewRiskRanking] = useState({ label: "" });
  const [editingEquipmentGroup, setEditingEquipmentGroup] = useState<{id: number, name: string} | null>(null);
  const [editingRiskRanking, setEditingRiskRanking] = useState<{id: number, label: string} | null>(null);
  
  // File upload references
  const [equipmentGroupsFileRef, setEquipmentGroupsFileRef] = useState<HTMLInputElement | null>(null);
  const [riskRankingsFileRef, setRiskRankingsFileRef] = useState<HTMLInputElement | null>(null);
  const [showAddEquipmentForm, setShowAddEquipmentForm] = useState(false);
  const [newEquipmentType, setNewEquipmentType] = useState({
    equipmentType: "",
    iso14224Code: "",
    subtypes: "",
    description: ""
  });
  const { toast } = useToast();

  // Fetch current AI settings
  const { data: aiSettings, isLoading } = useQuery<AiSettings[]>({
    queryKey: ["/api/admin/ai-settings"],
    retry: false,
  });

  // Fetch equipment groups
  const { data: equipmentGroups, isLoading: equipmentGroupsLoading } = useQuery({
    queryKey: ['/api/equipment-groups'],
    queryFn: () => apiRequest('/api/equipment-groups'),
  });

  // Fetch risk rankings
  const { data: riskRankings, isLoading: riskRankingsLoading } = useQuery({
    queryKey: ['/api/risk-rankings'],
    queryFn: () => apiRequest('/api/risk-rankings'),
  });

  // Test API key mutation
  const testKeyMutation = useMutation({
    mutationFn: async (data: { provider: string; apiKey: string }) => {
      return await apiRequest("/api/admin/ai-settings/test", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Test Successful",
        description: "AI provider connection verified successfully",
      });
      setFormData(prev => ({ ...prev, testStatus: "success" }));
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: "Unable to connect to AI provider. Check your API key.",
        variant: "destructive",
      });
      setFormData(prev => ({ ...prev, testStatus: "failed" }));
    },
  });

  // Equipment Groups mutations
  const createEquipmentGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await apiRequest("/api/equipment-groups", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({ title: "Equipment Group Created", description: "Equipment group added successfully" });
      setNewEquipmentGroup({ name: "" });
      queryClient.invalidateQueries(["/api/equipment-groups"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message.includes("already exists") ? "Equipment group name already exists" : "Failed to create equipment group",
        variant: "destructive",
      });
    },
  });

  const updateEquipmentGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; isActive: boolean } }) => {
      return await apiRequest(`/api/equipment-groups/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({ title: "Equipment Group Updated", description: "Equipment group updated successfully" });
      setEditingEquipmentGroup(null);
      queryClient.invalidateQueries(["/api/equipment-groups"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message.includes("already exists") ? "Equipment group name already exists" : "Failed to update equipment group",
        variant: "destructive",
      });
    },
  });

  const deleteEquipmentGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/equipment-groups/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Equipment Group Deleted", description: "Equipment group deleted successfully" });
      queryClient.invalidateQueries(["/api/equipment-groups"]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete equipment group. It may be in use.",
        variant: "destructive",
      });
    },
  });

  // Risk Rankings mutations
  const createRiskRankingMutation = useMutation({
    mutationFn: async (data: { label: string }) => {
      return await apiRequest("/api/risk-rankings", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({ title: "Risk Ranking Created", description: "Risk ranking added successfully" });
      setNewRiskRanking({ label: "" });
      queryClient.invalidateQueries(["/api/risk-rankings"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message.includes("already exists") ? "Risk ranking label already exists" : "Failed to create risk ranking",
        variant: "destructive",
      });
    },
  });

  const updateRiskRankingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { label: string; isActive: boolean } }) => {
      return await apiRequest(`/api/risk-rankings/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({ title: "Risk Ranking Updated", description: "Risk ranking updated successfully" });
      setEditingRiskRanking(null);
      queryClient.invalidateQueries(["/api/risk-rankings"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message.includes("already exists") ? "Risk ranking label already exists" : "Failed to update risk ranking",
        variant: "destructive",
      });
    },
  });

  const deleteRiskRankingMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/risk-rankings/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Risk Ranking Deleted", description: "Risk ranking deleted successfully" });
      queryClient.invalidateQueries(["/api/risk-rankings"]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete risk ranking. It may be in use.",
        variant: "destructive",
      });
    },
  });

  // Equipment Groups Import/Export mutations
  const importEquipmentGroupsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/equipment-groups/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Completed",
        description: `Imported ${data.imported} equipment groups${data.errors > 0 ? `, ${data.errors} errors` : ''}`,
      });
      queryClient.invalidateQueries(['/api/equipment-groups']);
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import equipment groups",
        variant: "destructive",
      });
    },
  });

  const exportEquipmentGroups = async () => {
    try {
      const response = await fetch('/api/equipment-groups/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'equipment-groups.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: "Equipment groups exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export equipment groups",
        variant: "destructive",
      });
    }
  };

  // Risk Rankings Import/Export mutations
  const importRiskRankingsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/risk-rankings/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Import failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Completed",
        description: `Imported ${data.imported} risk rankings${data.errors > 0 ? `, ${data.errors} errors` : ''}`,
      });
      queryClient.invalidateQueries(['/api/risk-rankings']);
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import risk rankings",
        variant: "destructive",
      });
    },
  });

  const exportRiskRankings = async () => {
    try {
      const response = await fetch('/api/risk-rankings/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'risk-rankings.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Export Successful",
        description: "Risk rankings exported successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export risk rankings",
        variant: "destructive",
      });
    }
  };

  // Save AI settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: InsertAiSettings) => {
      return await apiRequest("/api/admin/ai-settings", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "AI settings have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
      setFormData(prev => ({ ...prev, apiKey: "" })); // Clear form
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: "Failed to save AI settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add new equipment type mutation
  const addEquipmentMutation = useMutation({
    mutationFn: async (equipmentData: any) => {
      const profile = {
        equipmentType: equipmentData.equipmentType,
        iso14224Code: equipmentData.iso14224Code,
        subtypes: equipmentData.subtypes.split(',').map((s: string) => s.trim()),
        requiredTrendData: [],
        requiredAttachments: [],
        aiPromptTemplates: [],
        failureModes: [],
        smartSuggestions: [],
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Admin User',
        notes: equipmentData.description
      };

      return apiRequest('/api/evidence-library/admin/equipment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'admin-key-here'
        },
        body: JSON.stringify({ profile, updatedBy: 'Admin User' })
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Equipment type added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-library/equipment-types'] });
      setNewEquipmentType({ equipmentType: "", iso14224Code: "", subtypes: "", description: "" });
      setShowAddEquipmentForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add equipment type",
        variant: "destructive",
      });
    },
  });

  const handleTestKey = () => {
    if (!formData.apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key before testing",
        variant: "destructive",
      });
      return;
    }
    
    testKeyMutation.mutate({
      provider: formData.provider,
      apiKey: formData.apiKey,
    });
  };

  const handleSave = () => {
    if (!formData.apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an API key before saving",
        variant: "destructive",
      });
      return;
    }

    if (formData.testStatus !== "success") {
      toast({
        title: "Test Required",
        description: "Please test the API key before saving",
        variant: "destructive",
      });
      return;
    }

    saveSettingsMutation.mutate(formData);
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case "openai": return "OpenAI";
      case "gemini": return "Google Gemini";
      case "anthropic": return "Anthropic Claude";
      default: return provider;
    }
  };

  const getStatusBadge = (status: string | null, isActive: boolean) => {
    if (!status) return <Badge variant="outline">Not Tested</Badge>;
    if (status === "success" && isActive) return <Badge variant="default" className="bg-green-500">Active</Badge>;
    if (status === "success") return <Badge variant="outline">Tested</Badge>;
    if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
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
          System Administration
        </div>
      </div>



      <Tabs defaultValue="ai-settings" className="space-y-6">
        <TabsList className="grid w-fit grid-cols-4">
          <TabsTrigger value="ai-settings" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            AI Settings
          </TabsTrigger>
          <TabsTrigger value="equipment-groups" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Equipment Groups
          </TabsTrigger>
          <TabsTrigger value="risk-rankings" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Risk Rankings
          </TabsTrigger>
          <TabsTrigger value="evidence-library" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Evidence Library
          </TabsTrigger>
        </TabsList>

        {/* AI Settings Tab */}
        <TabsContent value="ai-settings" className="space-y-6">

      {/* Security Warning */}
      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Security Notice</p>
              <p className="text-yellow-700 dark:text-yellow-300">
                API keys are encrypted and stored securely on the backend. They are never exposed to client-side code.
                All changes are logged with timestamps for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New AI Provider */}
      <Card>
        <CardHeader>
          <CardTitle>Add AI Provider</CardTitle>
          <p className="text-sm text-muted-foreground">Configure a new AI provider for root cause analysis</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">AI Provider</Label>
              <Select 
                value={formData.provider} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Enter API key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="isActive">Set as active provider</Label>
          </div>

          <div className="flex space-x-2">
            <Button 
              onClick={handleTestKey}
              disabled={testKeyMutation.isPending}
              variant="outline"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {testKeyMutation.isPending ? "Testing..." : "Test Key"}
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending || formData.testStatus !== "success"}
            >
              <Save className="w-4 h-4 mr-2" />
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>

          {formData.testStatus && (
            <div className="mt-2">
              {getStatusBadge(formData.testStatus, formData.isActive)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Current AI Providers</CardTitle>
          <p className="text-sm text-muted-foreground">Manage existing AI provider configurations</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
          ) : !aiSettings || aiSettings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No AI providers configured. Add one above to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Tested</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aiSettings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-medium">
                      {getProviderName(setting.provider)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(setting.testStatus, setting.isActive)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {setting.lastTestedAt ? new Date(setting.lastTestedAt).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(setting.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">Test</Button>
                        <Button variant="ghost" size="sm">Remove</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Equipment Groups Tab */}
        <TabsContent value="equipment-groups" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Equipment Groups Manager
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage equipment groups for the Evidence Library dropdown selection
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Equipment Group */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter equipment group name..."
                  value={newEquipmentGroup.name}
                  onChange={(e) => setNewEquipmentGroup({ name: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newEquipmentGroup.name.trim()) {
                      createEquipmentGroupMutation.mutate(newEquipmentGroup);
                    }
                  }}
                />
                <Button 
                  onClick={() => createEquipmentGroupMutation.mutate(newEquipmentGroup)}
                  disabled={!newEquipmentGroup.name.trim() || createEquipmentGroupMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Group
                </Button>
              </div>

              {/* Import/Export Controls */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  variant="outline"
                  onClick={() => equipmentGroupsFileRef?.click()}
                  disabled={importEquipmentGroupsMutation.isPending}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  {importEquipmentGroupsMutation.isPending ? "Importing..." : "Import CSV"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={exportEquipmentGroups}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  ref={setEquipmentGroupsFileRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      importEquipmentGroupsMutation.mutate(file);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Equipment Groups Table */}
              {equipmentGroupsLoading ? (
                <div className="text-center py-8">Loading equipment groups...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(equipmentGroups) && equipmentGroups.map((group: any) => (
                      <TableRow key={group.id}>
                        <TableCell>
                          {editingEquipmentGroup?.id === group.id ? (
                            <Input
                              value={editingEquipmentGroup.name}
                              onChange={(e) => setEditingEquipmentGroup({ ...editingEquipmentGroup, name: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  updateEquipmentGroupMutation.mutate({
                                    id: group.id,
                                    data: { name: editingEquipmentGroup.name, isActive: group.isActive }
                                  });
                                }
                              }}
                            />
                          ) : (
                            <span className="font-medium">{group.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={group.isActive ? "default" : "secondary"}>
                            {group.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(group.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingEquipmentGroup?.id === group.id ? (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    updateEquipmentGroupMutation.mutate({
                                      id: group.id,
                                      data: { name: editingEquipmentGroup.name, isActive: group.isActive }
                                    });
                                  }}
                                  disabled={updateEquipmentGroupMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setEditingEquipmentGroup(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setEditingEquipmentGroup({ id: group.id, name: group.name })}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => deleteEquipmentGroupMutation.mutate(group.id)}
                                  disabled={deleteEquipmentGroupMutation.isPending}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Rankings Tab */}
        <TabsContent value="risk-rankings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Rankings Manager
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage risk ranking labels for the Evidence Library dropdown selection
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Risk Ranking */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter risk ranking label..."
                  value={newRiskRanking.label}
                  onChange={(e) => setNewRiskRanking({ label: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newRiskRanking.label.trim()) {
                      createRiskRankingMutation.mutate(newRiskRanking);
                    }
                  }}
                />
                <Button 
                  onClick={() => createRiskRankingMutation.mutate(newRiskRanking)}
                  disabled={!newRiskRanking.label.trim() || createRiskRankingMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ranking
                </Button>
              </div>

              {/* Import/Export Controls */}
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  variant="outline"
                  onClick={() => riskRankingsFileRef?.click()}
                  disabled={importRiskRankingsMutation.isPending}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  {importRiskRankingsMutation.isPending ? "Importing..." : "Import CSV"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={exportRiskRankings}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  ref={setRiskRankingsFileRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      importRiskRankingsMutation.mutate(file);
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {/* Risk Rankings Table */}
              {riskRankingsLoading ? (
                <div className="text-center py-8">Loading risk rankings...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(riskRankings) && riskRankings.map((ranking: any) => (
                      <TableRow key={ranking.id}>
                        <TableCell>
                          {editingRiskRanking?.id === ranking.id ? (
                            <Input
                              value={editingRiskRanking.label}
                              onChange={(e) => setEditingRiskRanking({ ...editingRiskRanking, label: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  updateRiskRankingMutation.mutate({
                                    id: ranking.id,
                                    data: { label: editingRiskRanking.label, isActive: ranking.isActive }
                                  });
                                }
                              }}
                            />
                          ) : (
                            <span className="font-medium">{ranking.label}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ranking.isActive ? "default" : "secondary"}>
                            {ranking.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ranking.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editingRiskRanking?.id === ranking.id ? (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    updateRiskRankingMutation.mutate({
                                      id: ranking.id,
                                      data: { label: editingRiskRanking.label, isActive: ranking.isActive }
                                    });
                                  }}
                                  disabled={updateRiskRankingMutation.isPending}
                                >
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => setEditingRiskRanking(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setEditingRiskRanking({ id: ranking.id, label: ranking.label })}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => deleteRiskRankingMutation.mutate(ranking.id)}
                                  disabled={deleteRiskRankingMutation.isPending}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence Library Tab */}
        <TabsContent value="evidence-library" className="space-y-6">
          {/* Equipment Types Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Equipment Types Library
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage equipment types and their evidence requirements for RCA investigations
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Equipment Type */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Current Equipment Types</h3>
                <Button 
                  onClick={() => setShowAddEquipmentForm(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Equipment Type
                </Button>
              </div>

              {/* Add Evidence Library Item Form - 14 Column CSV Template */}
              {showAddEquipmentForm && (
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base">Add New Evidence Library Item (14-Column CSV Template)</CardTitle>
                    <p className="text-sm text-muted-foreground">Add equipment failure modes exactly matching your CSV template structure</p>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" asChild className="mb-4">
                      <Link href="/evidence-library-management">
                        Use Full Evidence Library Management →
                      </Link>
                    </Button>
                    <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      <p className="font-medium">Note:</p>
                      <p>For complete evidence library management with all 14 columns (Equipment Group, Equipment Type, Subtype/Example, Component/Failure Mode, Equipment Code, Failure Code, Risk Ranking, Required Trend Data/Evidence, AI Questions, Attachments Required, Root Cause Logic, plus 3 blank columns), please use the dedicated Evidence Library Management page.</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={() => setShowAddEquipmentForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Equipment Types Table */}
              <div className="text-center py-8 text-muted-foreground">
                <p>Equipment Types management has been moved to the dedicated Evidence Library Management page.</p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                  <Link href="/evidence-library-management">
                    Go to Evidence Library Management →
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}