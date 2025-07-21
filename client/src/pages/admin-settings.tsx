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
import { Eye, EyeOff, TestTube, Save, Shield, AlertTriangle, Database, Plus, Edit3, Download, Upload, Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { AiSettings, InsertAiSettings } from "@shared/schema";

export default function AdminSettings() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<InsertAiSettings>({
    provider: "openai",
    apiKey: "",
    isActive: false,
    createdBy: 1, // Mock admin user ID
    testStatus: null
  });
  const [newEquipmentType, setNewEquipmentType] = useState({
    equipmentType: "",
    iso14224Code: "",
    subtypes: "",
    description: ""
  });
  const [showAddEquipmentForm, setShowAddEquipmentForm] = useState(false);
  const { toast } = useToast();

  // Fetch current AI settings
  const { data: aiSettings, isLoading } = useQuery<AiSettings[]>({
    queryKey: ["/api/admin/ai-settings"],
    retry: false,
  });

  // Fetch equipment types for Evidence Library management
  const { data: equipmentTypes, isLoading: equipmentLoading } = useQuery({
    queryKey: ['/api/evidence-library/equipment-types'],
    queryFn: () => apiRequest('/api/evidence-library/equipment-types'),
  });

  // Fetch evidence library data
  const { data: evidenceLibrary, isLoading: evidenceLoading } = useQuery({
    queryKey: ['/api/evidence-library'],
    queryFn: () => apiRequest('/api/evidence-library'),
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
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="ai-settings" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            AI Settings
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
              {equipmentLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading equipment types...</div>
              ) : !equipmentTypes?.equipmentTypes || equipmentTypes.equipmentTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No equipment types configured. Add one above to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment Type</TableHead>
                      <TableHead>ISO 14224 Code</TableHead>
                      <TableHead>Subtypes</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equipmentTypes.equipmentTypes.map((equipment: any) => (
                      <TableRow key={equipment.equipmentType}>
                        <TableCell className="font-medium">
                          {equipment.equipmentType}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{equipment.iso14224Code}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {equipment.subtypes?.slice(0, 3).map((subtype: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {subtype}
                              </Badge>
                            ))}
                            {equipment.subtypes?.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{equipment.subtypes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {equipment.lastUpdated ? new Date(equipment.lastUpdated).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/admin/evidence-library?equipment=${equipment.equipmentType.toLowerCase().replace(/\s+/g, '_')}`}>
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/evidence-library-management">
                    <Database className="w-4 h-4 mr-2" />
                    Manage Evidence Library
                  </Link>
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Library
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Evidence Library Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Evidence Library Data ({Array.isArray(evidenceLibrary) ? evidenceLibrary.length : 0} items)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete evidence requirements database with 14-column CSV template structure
              </p>
            </CardHeader>
            <CardContent>
              {evidenceLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading evidence library...</div>
              ) : !evidenceLibrary || evidenceLibrary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No evidence library data found. Import your CSV template to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Showing {Array.isArray(evidenceLibrary) ? evidenceLibrary.length : 0} evidence requirements from CSV template
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/evidence-library-management">
                        View Full Library →
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Equipment Group</TableHead>
                          <TableHead>Equipment Type</TableHead>
                          <TableHead>Component / Failure Mode</TableHead>
                          <TableHead>Risk Ranking</TableHead>
                          <TableHead>Required Evidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(Array.isArray(evidenceLibrary) ? evidenceLibrary : []).slice(0, 5).map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.equipmentGroup}</TableCell>
                            <TableCell>{item.equipmentType}</TableCell>
                            <TableCell>{item.componentFailureMode}</TableCell>
                            <TableCell>
                              <Badge className={
                                item.riskRanking === 'High' ? 'bg-red-100 text-red-800' :
                                item.riskRanking === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }>
                                {item.riskRanking}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{item.requiredTrendDataEvidence}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {Array.isArray(evidenceLibrary) && evidenceLibrary.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/evidence-library-management">
                          View all {Array.isArray(evidenceLibrary) ? evidenceLibrary.length : 0} items →
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}