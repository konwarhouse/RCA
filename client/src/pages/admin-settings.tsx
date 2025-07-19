import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, TestTube, Save, Shield, AlertTriangle } from "lucide-react";
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
  const { toast } = useToast();

  // Fetch current AI settings
  const { data: aiSettings, isLoading } = useQuery<AiSettings[]>({
    queryKey: ["/api/admin/ai-settings"],
    retry: false,
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">Manage AI provider settings and API keys</p>
        </div>
      </div>

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
    </div>
  );
}