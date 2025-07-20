import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Database, 
  Download, 
  Upload, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  CheckCircle,
  Settings,
  FileText,
  TrendingUp,
  Camera,
  Brain,
  History
} from "lucide-react";

interface EquipmentType {
  equipmentType: string;
  iso14224Code: string;
  subtypes: string[];
  lastUpdated: string;
  updatedBy: string;
}

interface TrendRequirement {
  id: string;
  name: string;
  description: string;
  units: string;
  mandatory: boolean;
  samplingFrequency: string;
  typicalRange?: string;
  alertThresholds?: {
    warning: string;
    alarm: string;
  };
}

interface AttachmentRequirement {
  id: string;
  name: string;
  description: string;
  fileTypes: string[];
  mandatory: boolean;
  maxSizeMB: number;
  validationCriteria?: string;
}

export default function EvidenceLibraryAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTrend, setEditingTrend] = useState<TrendRequirement | null>(null);
  const [newTrend, setNewTrend] = useState<Partial<TrendRequirement>>({});

  // Fetch all equipment types
  const { data: equipmentTypes, isLoading } = useQuery({
    queryKey: ['/api/evidence-library/equipment-types'],
    queryFn: () => apiRequest('/api/evidence-library/equipment-types'),
  });

  // Equipment type to profile key mapping - expanded to match user table
  const equipmentProfileMap = {
    'Pumps': 'pumps_centrifugal',
    'Compressors': 'compressors_reciprocating',
    'Turbines': 'turbines_gas',
    'Electric Motors': 'motors_electric',
    'Generators': 'generators_synchronous',
    'Fans / Blowers': 'fans_centrifugal',
    'Agitators / Mixers': 'mixers_top_entry',
    'Heat Exchangers': 'heat_exchangers_shell_tube',
    'Boilers': 'boilers_water_tube',
    'Pressure Vessels': 'vessels_pressure',
    'Columns/Towers': 'columns_distillation',
    'Filters/Strainers': 'filters_basket',
    'Tanks': 'tanks_atmospheric',
    'Piping': 'piping_process',
    'Valves': 'valves_control',
    'Switchgear': 'switchgear_mv',
    'Transformers': 'transformers_power',
    'UPS/Rectifiers': 'ups_static',
    'Cables/Busbars': 'cables_power',
    'Sensors/Transmitters': 'sensors_pressure',
    'PLCs/DCS Systems': 'plc_redundant',
    'Control Valves': 'control_valves_pneumatic',
    'Analyzers': 'analyzers_gc',
    'HVAC Units': 'hvac_air_handler',
    'Cranes/Hoists': 'cranes_bridge',
    'Fire Protection Systems': 'fire_systems_deluge'
  };

  // Fetch selected equipment profile
  const { data: equipmentProfile } = useQuery({
    queryKey: ['/api/evidence-library/equipment', selectedEquipment],
    queryFn: () => apiRequest(`/api/evidence-library/equipment/${selectedEquipment}`),
    enabled: !!selectedEquipment,
  });

  // Fetch update history
  const { data: updateHistory } = useQuery({
    queryKey: ['/api/evidence-library/admin/history', selectedEquipment],
    queryFn: () => apiRequest(`/api/evidence-library/admin/history?equipmentType=${selectedEquipment}`),
    enabled: !!selectedEquipment,
  });

  // Update trend requirement mutation
  const updateTrendMutation = useMutation({
    mutationFn: async ({ equipmentType, trendId, updates }: { equipmentType: string; trendId: string; updates: any }) => {
      return apiRequest(`/api/evidence-library/admin/equipment/${equipmentType}/trends/${trendId}`, {
        method: 'PATCH',
        body: JSON.stringify({ updates, updatedBy: 'Admin User' }),
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'admin-key-here' // In production, use proper auth
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evidence-library/equipment', selectedEquipment] });
      toast({
        title: "Success",
        description: "Trend requirement updated successfully",
      });
      setEditingTrend(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trend requirement",
        variant: "destructive",
      });
    },
  });

  // Export library mutation
  const exportMutation = useMutation({
    mutationFn: () => apiRequest('/api/evidence-library/admin/export', {
      headers: { 'x-admin-key': 'admin-key-here' }
    }),
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-library-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Evidence library exported successfully",
      });
    },
  });

  const handleUpdateTrend = () => {
    if (!editingTrend || !selectedEquipment) return;
    
    updateTrendMutation.mutate({
      equipmentType: selectedEquipment,
      trendId: editingTrend.id,
      updates: editingTrend
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Loading evidence library...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8 text-blue-600" />
            Evidence Library Administration
          </h1>
          <p className="text-gray-600 mt-2">
            Manage equipment-specific evidence requirements and AI prompts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Library
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Import Library
          </Button>
        </div>
      </div>

      {/* Equipment Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Equipment Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="equipment-select">Select Equipment Type</Label>
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose equipment type..." />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes?.equipmentTypes?.map((equipment: EquipmentType) => {
                    const profileKey = equipmentProfileMap[equipment.equipmentType as keyof typeof equipmentProfileMap];
                    
                    return (
                      <SelectItem 
                        key={equipment.equipmentType} 
                        value={profileKey || equipment.equipmentType.toLowerCase().replace(/\s+/g, '_')}
                      >
                        {equipment.equipmentType} ({equipment.iso14224Code})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Equipment Type
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Equipment Type Form */}
      {showAddForm && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Add New Equipment Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Equipment Type Name</Label>
                <Input
                  placeholder="e.g., Heat Exchangers"
                  value={newTrend.name || ''}
                  onChange={(e) => setNewTrend(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>ISO 14224 Code</Label>
                <Input
                  placeholder="e.g., HE-003"
                  value={newTrend.id || ''}
                  onChange={(e) => setNewTrend(prev => ({ ...prev, id: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subtypes (comma-separated)</Label>
              <Input
                placeholder="e.g., Shell and Tube, Plate, Air Cooled"
                value={newTrend.units || ''}
                onChange={(e) => setNewTrend(prev => ({ ...prev, units: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of equipment type and its applications"
                value={newTrend.description || ''}
                onChange={(e) => setNewTrend(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  // Here you would normally call an API to add the equipment type
                  toast({
                    title: "Feature Coming Soon",
                    description: "Equipment type addition will be implemented in the next update",
                  });
                  setShowAddForm(false);
                }}
                disabled={!newTrend.name || !newTrend.id}
              >
                Add Equipment Type
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  setNewTrend({});
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {selectedEquipment && equipmentProfile && (
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-fit">
            <TabsTrigger value="trends">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trend Data
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Camera className="h-4 w-4 mr-2" />
              Attachments
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <Brain className="h-4 w-4 mr-2" />
              AI Prompts
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Trend Data Requirements */}
          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Trend Data Requirements</span>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Trend
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {equipmentProfile?.profile?.requiredTrendData?.map((trend: TrendRequirement) => (
                    <div key={trend.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{trend.name}</h4>
                          <Badge variant={trend.mandatory ? "default" : "secondary"}>
                            {trend.mandatory ? "Mandatory" : "Optional"}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTrend(trend)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{trend.description}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Units:</span> {trend.units}
                        </div>
                        <div>
                          <span className="font-medium">Sampling:</span> {trend.samplingFrequency}
                        </div>
                        <div>
                          <span className="font-medium">Range:</span> {trend.typicalRange || 'Not specified'}
                        </div>
                      </div>
                      {trend.alertThresholds && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Thresholds:</span>
                          <span className="ml-2 text-amber-600">Warning: {trend.alertThresholds.warning}</span>
                          <span className="ml-4 text-red-600">Alarm: {trend.alertThresholds.alarm}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachment Requirements */}
          <TabsContent value="attachments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Attachment Requirements</span>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Attachment
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {equipmentProfile?.profile?.requiredAttachments?.map((attachment: AttachmentRequirement) => (
                    <div key={attachment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{attachment.name}</h4>
                          <Badge variant={attachment.mandatory ? "default" : "secondary"}>
                            {attachment.mandatory ? "Mandatory" : "Optional"}
                          </Badge>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{attachment.description}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">File Types:</span> {attachment.fileTypes.join(', ')}
                        </div>
                        <div>
                          <span className="font-medium">Max Size:</span> {attachment.maxSizeMB}MB
                        </div>
                        <div>
                          <span className="font-medium">Validation:</span> {attachment.validationCriteria || 'None'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Prompts */}
          <TabsContent value="prompts">
            <Card>
              <CardHeader>
                <CardTitle>AI Prompt Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {equipmentProfile?.data?.profile?.aiPromptTemplates?.map((template: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold capitalize">{template.fieldType.replace('_', ' ')}</h4>
                        <Button size="sm" variant="ghost">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{template.context}</p>
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <strong>Prompt:</strong> {template.prompt}
                      </div>
                      {template.examples && template.examples.length > 0 && (
                        <div className="mt-2">
                          <strong className="text-sm">Examples:</strong>
                          <ul className="text-sm text-gray-600 mt-1 space-y-1">
                            {template.examples.map((example: string, i: number) => (
                              <li key={i} className="pl-2 border-l-2 border-gray-200">"{example}"</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Update History */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Update History</CardTitle>
              </CardHeader>
              <CardContent>
                {updateHistory?.data?.history?.length > 0 ? (
                  <div className="space-y-2">
                    {updateHistory.data.history.map((log: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{log.changeType}</Badge>
                          <span className="font-medium">{log.fieldChanged}</span>
                          <span className="text-gray-500">by {log.updatedBy}</span>
                          <span className="text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{log.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No update history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Trend Modal */}
      {editingTrend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Trend Requirement: {editingTrend.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="trend-name">Name</Label>
                <Input
                  id="trend-name"
                  value={editingTrend.name}
                  onChange={(e) => setEditingTrend({ ...editingTrend, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="trend-description">Description</Label>
                <Textarea
                  id="trend-description"
                  value={editingTrend.description}
                  onChange={(e) => setEditingTrend({ ...editingTrend, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trend-units">Units</Label>
                  <Input
                    id="trend-units"
                    value={editingTrend.units}
                    onChange={(e) => setEditingTrend({ ...editingTrend, units: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="trend-sampling">Sampling Frequency</Label>
                  <Input
                    id="trend-sampling"
                    value={editingTrend.samplingFrequency}
                    onChange={(e) => setEditingTrend({ ...editingTrend, samplingFrequency: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingTrend(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateTrend}
                  disabled={updateTrendMutation.isPending}
                >
                  {updateTrendMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}