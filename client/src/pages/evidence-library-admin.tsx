import { useState, useMemo } from "react";
import * as React from "react";
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
  History,
  Search,
  Eye,
  Filter,
  SortAsc,
  SortDesc,
  X
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  
  // Smart Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("equipmentType");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  
  // Advanced filter states
  const [filterByComplexity, setFilterByComplexity] = useState<string>("all");
  const [filterByLastUpdated, setFilterByLastUpdated] = useState<string>("all");

  // Fetch all equipment types
  const { data: equipmentTypes, isLoading } = useQuery({
    queryKey: ['/api/evidence-library/equipment-types'],
    queryFn: () => apiRequest('/api/evidence-library/equipment-types'),
  });

  // Smart Search and Filtering Logic
  const filteredAndSortedEquipment = useMemo(() => {
    if (!equipmentTypes?.equipmentTypes) return [];
    
    let filtered = equipmentTypes.equipmentTypes;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((equipment: EquipmentType) => {
        const searchableText = [
          equipment.equipmentType,
          equipment.iso14224Code,
          ...equipment.subtypes
        ].join(' ').toLowerCase();
        
        return searchableText.includes(query);
      });
    }
    
    // Apply category filter
    if (filterBy !== "all") {
      filtered = filtered.filter((equipment: EquipmentType) => {
        switch (filterBy) {
          case "rotating":
            return ["Pumps", "Compressors", "Turbines", "Electric Motors", "Fans / Blowers", "Generators"].includes(equipment.equipmentType);
          case "static":
            return ["Heat Exchangers", "Pressure Vessels", "Tanks", "Piping", "Columns/Towers", "Filters/Strainers"].includes(equipment.equipmentType);
          case "electrical":
            return ["Electric Motors", "Generators", "Transformers", "Switchgear"].includes(equipment.equipmentType);
          case "process":
            return ["Heat Exchangers", "Columns/Towers", "Pressure Vessels", "Filters/Strainers", "Tanks"].includes(equipment.equipmentType);
          default:
            return true;
        }
      });
    }
    
    // Apply complexity filter
    if (filterByComplexity !== "all") {
      filtered = filtered.filter((equipment: EquipmentType) => {
        const subtypeCount = equipment.subtypes.length;
        switch (filterByComplexity) {
          case "simple":
            return subtypeCount <= 3;
          case "moderate":
            return subtypeCount > 3 && subtypeCount <= 6;
          case "complex":
            return subtypeCount > 6;
          default:
            return true;
        }
      });
    }
    
    // Apply last updated filter
    if (filterByLastUpdated !== "all") {
      const now = new Date();
      filtered = filtered.filter((equipment: EquipmentType) => {
        const updatedDate = new Date(equipment.lastUpdated);
        const daysDiff = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filterByLastUpdated) {
          case "recent":
            return daysDiff <= 7;
          case "week":
            return daysDiff <= 30;
          case "month":
            return daysDiff <= 90;
          case "old":
            return daysDiff > 90;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    filtered.sort((a: EquipmentType, b: EquipmentType) => {
      let aValue: string, bValue: string;
      
      switch (sortBy) {
        case "equipmentType":
          aValue = a.equipmentType;
          bValue = b.equipmentType;
          break;
        case "iso14224Code":
          aValue = a.iso14224Code;
          bValue = b.iso14224Code;
          break;
        case "lastUpdated":
          aValue = a.lastUpdated;
          bValue = b.lastUpdated;
          break;
        case "subtypeCount":
          return sortOrder === "asc" 
            ? a.subtypes.length - b.subtypes.length
            : b.subtypes.length - a.subtypes.length;
        default:
          aValue = a.equipmentType;
          bValue = b.equipmentType;
      }
      
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [equipmentTypes, searchQuery, filterBy, sortBy, sortOrder, filterByComplexity, filterByLastUpdated]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilterBy("all");
    setSortBy("equipmentType");
    setSortOrder("asc");
    setFilterByComplexity("all");
    setFilterByLastUpdated("all");
  };
  
  // Highlight search terms in text
  const highlightSearchTerm = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </span>
      ) : part
    );
  };
  
  // Get active filter count for display
  const activeFilterCount = [
    searchQuery.trim() !== "",
    filterBy !== "all",
    sortBy !== "equipmentType",
    sortOrder !== "asc",
    filterByComplexity !== "all",
    filterByLastUpdated !== "all"
  ].filter(Boolean).length;

  // Equipment type to profile key mapping - expanded to match user table
  const equipmentProfileMap: Record<string, string> = {
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
    'Piping': 'piping_systems',
    'Valves': 'valves_control',
    'Switchgear': 'switchgear_electrical',
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

  // Debug: log the API response
  console.log('Equipment Types API Response:', equipmentTypes);
  console.log('Is Loading:', isLoading);
  console.log('Equipment Types Array:', equipmentTypes?.equipmentTypes);

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
          'x-admin-key': 'admin123'
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
      headers: { 'x-admin-key': 'admin123' }
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
            Manage equipment-specific evidence requirements and AI prompts ({equipmentTypes?.equipmentTypes?.length || 0} equipment types)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const response = await fetch('/api/evidence-library/admin/export', {
                  headers: {
                    'x-admin-key': 'admin123'
                  }
                });
                if (response.ok) {
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'evidence-library-export.json';
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast({
                    title: "Export Successful",
                    description: "Evidence library exported successfully",
                  });
                } else {
                  toast({
                    title: "Export Failed",
                    description: "Unable to export library",
                    variant: "destructive",
                  });
                }
              } catch (error) {
                toast({
                  title: "Export Error",
                  description: "Failed to export evidence library",
                  variant: "destructive",
                });
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Library
          </Button>
          <Button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const response = await fetch('/api/evidence-library/admin/import', {
                      method: 'POST',
                      headers: {
                        'x-admin-key': 'admin123'
                      },
                      body: formData
                    });
                    
                    if (response.ok) {
                      toast({
                        title: "Import Successful",
                        description: "Evidence library imported successfully",
                      });
                      // Refresh the data
                      window.location.reload();
                    } else {
                      toast({
                        title: "Import Failed",
                        description: "Unable to import library",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Import Error",
                      description: "Failed to import evidence library",
                      variant: "destructive",
                    });
                  }
                }
              };
              input.click();
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Library
          </Button>
        </div>
      </div>

      {/* Equipment Types Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Equipment Types Library ({equipmentTypes?.equipmentTypes?.length || 0} Types)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Smart Search and Filters */}
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search equipment types, ISO codes, or subtypes..."
                  className="pl-10 pr-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filter and Sort Controls */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Equipment</SelectItem>
                      <SelectItem value="rotating">Rotating Equipment</SelectItem>
                      <SelectItem value="static">Static Equipment</SelectItem>
                      <SelectItem value="electrical">Electrical Equipment</SelectItem>
                      <SelectItem value="process">Process Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipmentType">Equipment Type</SelectItem>
                      <SelectItem value="iso14224Code">ISO Code</SelectItem>
                      <SelectItem value="lastUpdated">Last Updated</SelectItem>
                      <SelectItem value="subtypeCount">Subtype Count</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={showAdvancedFilters ? "bg-blue-50 border-blue-200" : ""}
                >
                  Advanced Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>

                {activeFilterCount > 0 && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All ({activeFilterCount})
                  </Button>
                )}

                <div className="text-sm text-gray-600 ml-auto">
                  Showing {filteredAndSortedEquipment.length} of {equipmentTypes?.equipmentTypes?.length || 0} equipment types
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <h4 className="font-medium mb-3">Advanced Filters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Equipment Complexity</Label>
                      <Select value={filterByComplexity} onValueChange={setFilterByComplexity}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Complexity Levels</SelectItem>
                          <SelectItem value="simple">Simple (≤ 3 subtypes)</SelectItem>
                          <SelectItem value="moderate">Moderate (4-6 subtypes)</SelectItem>
                          <SelectItem value="complex">Complex (&gt; 6 subtypes)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Last Updated</Label>
                      <Select value={filterByLastUpdated} onValueChange={setFilterByLastUpdated}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Time</SelectItem>
                          <SelectItem value="recent">Last 7 days</SelectItem>
                          <SelectItem value="week">Last 30 days</SelectItem>
                          <SelectItem value="month">Last 90 days</SelectItem>
                          <SelectItem value="old">Older than 90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setFilterByComplexity("all");
                          setFilterByLastUpdated("all");
                        }}
                        className="w-full"
                      >
                        Reset Advanced
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Equipment Types Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment Type</TableHead>
                    <TableHead>ISO 14224 Code</TableHead>
                    <TableHead>Subtypes</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedEquipment.map((equipment: EquipmentType) => (
                    <TableRow key={equipment.iso14224Code}>
                      <TableCell className="font-medium">
                        {highlightSearchTerm(equipment.equipmentType, searchQuery)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {highlightSearchTerm(equipment.iso14224Code, searchQuery)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {equipment.subtypes.slice(0, 3).map((subtype, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {subtype}
                            </Badge>
                          ))}
                          {equipment.subtypes.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{equipment.subtypes.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {equipment.lastUpdated}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {equipment.updatedBy}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedEquipment(equipment.equipmentType.toLowerCase().replace(/[^a-z0-9]/g, '_'))}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* No data state */}
            {(!equipmentTypes?.equipmentTypes || equipmentTypes.equipmentTypes.length === 0) && (
              <div className="text-center py-8">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No equipment types found</p>
                <p className="text-sm text-gray-500">Check API connection and try refreshing</p>
              </div>
            )}

            {/* No search results state */}
            {equipmentTypes?.equipmentTypes?.length > 0 && filteredAndSortedEquipment.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">No equipment types match your search</p>
                <p className="text-sm text-gray-500">Try adjusting your search terms or filters</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                  {isLoading ? (
                    <div className="p-2 text-center text-gray-500">Loading equipment types...</div>
                  ) : equipmentTypes?.equipmentTypes?.length > 0 ? (
                    equipmentTypes.equipmentTypes.map((equipment: EquipmentType) => {
                      const profileKey = equipmentProfileMap[equipment.equipmentType as keyof typeof equipmentProfileMap];
                      
                      return (
                        <SelectItem 
                          key={equipment.equipmentType} 
                          value={profileKey || equipment.equipmentType.toLowerCase().replace(/\s+/g, '_')}
                        >
                          {equipment.equipmentType} ({equipment.iso14224Code})
                        </SelectItem>
                      );
                    })
                  ) : (
                    <div className="p-2 text-center text-gray-500">No equipment types found</div>
                  )}
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