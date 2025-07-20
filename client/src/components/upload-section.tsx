import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ProcessingStatus from "./processing-status";
import { CloudUpload, FileText, X, Play, Settings, Gauge } from "lucide-react";
import { EQUIPMENT_TYPES } from "@shared/schema";

interface UploadedFile {
  file: File;
  id: string;
}

export default function UploadSection() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [issueDescription, setIssueDescription] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [location, setLocation] = useState("");
  const [operatingParameters, setOperatingParameters] = useState({
    pressure: { upstream: "", downstream: "", unit: "PSI" },
    temperature: { inlet: "", outlet: "", bearing: "", unit: "°F" },
    flow: { rate: "", unit: "GPM" },
    vibration: { horizontal: "", vertical: "", axial: "", unit: "mm/s" },
    power: { consumption: "", unit: "kW" },
    speed: { rpm: "" }
  });
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createAnalysisMutation = useMutation({
    mutationFn: async ({ files, formData }: { files: File[]; formData: any }) => {
      const data = new FormData();
      data.append("issueDescription", formData.issueDescription);
      data.append("equipmentType", formData.equipmentType);
      data.append("equipmentId", formData.equipmentId);
      data.append("location", formData.location);
      data.append("operatingParameters", JSON.stringify(formData.operatingParameters));
      
      files.forEach((file) => {
        data.append("files", file);
      });

      const response = await fetch("/api/analyses", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        throw new Error("Failed to create analysis");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setCurrentAnalysisId(data.id);
      setUploadedFiles([]);
      setIssueDescription("");
      setEquipmentType("");
      setEquipmentId("");
      setLocation("");
      setOperatingParameters({
        pressure: { upstream: "", downstream: "", unit: "PSI" },
        temperature: { inlet: "", outlet: "", bearing: "", unit: "°F" },
        flow: { rate: "", unit: "GPM" },
        vibration: { horizontal: "", vertical: "", axial: "", unit: "mm/s" },
        power: { consumption: "", unit: "kW" },
        speed: { rpm: "" }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      toast({
        title: "Analysis Started",
        description: "Your files have been uploaded and analysis has begun.",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your files. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/pdf": [".pdf"],
      "application/json": [".json"],
      "text/plain": [".txt"],
    },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAnalyze = () => {
    if (uploadedFiles.length === 0 || !issueDescription.trim() || !equipmentType) {
      toast({
        title: "Missing Information",
        description: "Please upload files, provide issue description, and select equipment type.",
        variant: "destructive",
      });
      return;
    }

    // Convert operating parameters to proper format
    const formattedParameters: any = {};
    
    if (operatingParameters.pressure.upstream || operatingParameters.pressure.downstream) {
      formattedParameters.pressure = {
        upstream: parseFloat(operatingParameters.pressure.upstream) || undefined,
        downstream: parseFloat(operatingParameters.pressure.downstream) || undefined,
        unit: operatingParameters.pressure.unit
      };
    }
    
    if (operatingParameters.temperature.inlet || operatingParameters.temperature.outlet || operatingParameters.temperature.bearing) {
      formattedParameters.temperature = {
        inlet: parseFloat(operatingParameters.temperature.inlet) || undefined,
        outlet: parseFloat(operatingParameters.temperature.outlet) || undefined,
        bearing: parseFloat(operatingParameters.temperature.bearing) || undefined,
        unit: operatingParameters.temperature.unit
      };
    }
    
    if (operatingParameters.flow.rate) {
      formattedParameters.flow = {
        rate: parseFloat(operatingParameters.flow.rate),
        unit: operatingParameters.flow.unit
      };
    }
    
    if (operatingParameters.vibration.horizontal || operatingParameters.vibration.vertical || operatingParameters.vibration.axial) {
      formattedParameters.vibration = {
        horizontal: parseFloat(operatingParameters.vibration.horizontal) || undefined,
        vertical: parseFloat(operatingParameters.vibration.vertical) || undefined,
        axial: parseFloat(operatingParameters.vibration.axial) || undefined,
        unit: operatingParameters.vibration.unit
      };
    }
    
    if (operatingParameters.power.consumption) {
      formattedParameters.power = {
        consumption: parseFloat(operatingParameters.power.consumption),
        unit: operatingParameters.power.unit
      };
    }
    
    if (operatingParameters.speed.rpm) {
      formattedParameters.speed = {
        rpm: parseFloat(operatingParameters.speed.rpm)
      };
    }

    createAnalysisMutation.mutate({
      files: uploadedFiles.map((f) => f.file),
      formData: {
        issueDescription,
        equipmentType,
        equipmentId,
        location,
        operatingParameters: formattedParameters
      }
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Work Order Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Issue Description */}
          <div className="space-y-2">
            <Label htmlFor="issue-description">Issue Description</Label>
            <Textarea
              id="issue-description"
              placeholder="Describe the issue you want to analyze..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Equipment Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="equipment-type">Equipment Type *</Label>
              <Select value={equipmentType} onValueChange={setEquipmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(EQUIPMENT_TYPES).map((type) => (
                    <SelectItem key={type} value={type}>
                      {EQUIPMENT_TYPES[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="equipment-id">Equipment ID</Label>
              <Input
                id="equipment-id"
                placeholder="e.g., PUMP-A001"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Building A - Level 2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Operating Parameters */}
          {equipmentType && (
            <Card className="border-dashed">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center">
                  <Gauge className="w-5 h-5 mr-2" />
                  Operating Parameters
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Provide current operating conditions for more accurate analysis
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pressure Parameters */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Pressure</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="pressure-upstream" className="text-xs text-muted-foreground">Upstream</Label>
                      <Input
                        id="pressure-upstream"
                        type="number"
                        placeholder="45.2"
                        value={operatingParameters.pressure.upstream}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          pressure: { ...prev.pressure, upstream: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pressure-downstream" className="text-xs text-muted-foreground">Downstream</Label>
                      <Input
                        id="pressure-downstream"
                        type="number"
                        placeholder="42.8"
                        value={operatingParameters.pressure.downstream}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          pressure: { ...prev.pressure, downstream: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pressure-unit" className="text-xs text-muted-foreground">Unit</Label>
                      <Select 
                        value={operatingParameters.pressure.unit} 
                        onValueChange={(value) => setOperatingParameters(prev => ({
                          ...prev,
                          pressure: { ...prev.pressure, unit: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PSI">PSI</SelectItem>
                          <SelectItem value="bar">bar</SelectItem>
                          <SelectItem value="kPa">kPa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Temperature Parameters */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Temperature</Label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label htmlFor="temp-inlet" className="text-xs text-muted-foreground">Inlet</Label>
                      <Input
                        id="temp-inlet"
                        type="number"
                        placeholder="68"
                        value={operatingParameters.temperature.inlet}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          temperature: { ...prev.temperature, inlet: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="temp-outlet" className="text-xs text-muted-foreground">Outlet</Label>
                      <Input
                        id="temp-outlet"
                        type="number"
                        placeholder="89"
                        value={operatingParameters.temperature.outlet}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          temperature: { ...prev.temperature, outlet: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="temp-bearing" className="text-xs text-muted-foreground">Bearing</Label>
                      <Input
                        id="temp-bearing"
                        type="number"
                        placeholder="145"
                        value={operatingParameters.temperature.bearing}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          temperature: { ...prev.temperature, bearing: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="temp-unit" className="text-xs text-muted-foreground">Unit</Label>
                      <Select 
                        value={operatingParameters.temperature.unit} 
                        onValueChange={(value) => setOperatingParameters(prev => ({
                          ...prev,
                          temperature: { ...prev.temperature, unit: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="°F">°F</SelectItem>
                          <SelectItem value="°C">°C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Additional Parameters based on equipment type */}
                {(equipmentType === 'pump' || equipmentType === 'compressor') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="flow-rate" className="text-sm font-medium">Flow Rate</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="flow-rate"
                          type="number"
                          placeholder="450"
                          value={operatingParameters.flow.rate}
                          onChange={(e) => setOperatingParameters(prev => ({
                            ...prev,
                            flow: { ...prev.flow, rate: e.target.value }
                          }))}
                        />
                        <Select 
                          value={operatingParameters.flow.unit} 
                          onValueChange={(value) => setOperatingParameters(prev => ({
                            ...prev,
                            flow: { ...prev.flow, unit: value }
                          }))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GPM">GPM</SelectItem>
                            <SelectItem value="L/min">L/min</SelectItem>
                            <SelectItem value="m³/h">m³/h</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="speed-rpm" className="text-sm font-medium">Speed (RPM)</Label>
                      <Input
                        id="speed-rpm"
                        type="number"
                        placeholder="1750"
                        value={operatingParameters.speed.rpm}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          speed: { ...prev.speed, rpm: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                )}

                {/* Power and Vibration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="power-consumption" className="text-sm font-medium">Power Consumption</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="power-consumption"
                        type="number"
                        placeholder="15.4"
                        value={operatingParameters.power.consumption}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          power: { ...prev.power, consumption: e.target.value }
                        }))}
                      />
                      <Select 
                        value={operatingParameters.power.unit} 
                        onValueChange={(value) => setOperatingParameters(prev => ({
                          ...prev,
                          power: { ...prev.power, unit: value }
                        }))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kW">kW</SelectItem>
                          <SelectItem value="HP">HP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Vibration (mm/s)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="H: 2.3"
                        value={operatingParameters.vibration.horizontal}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          vibration: { ...prev.vibration, horizontal: e.target.value }
                        }))}
                      />
                      <Input
                        placeholder="V: 1.8"
                        value={operatingParameters.vibration.vertical}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          vibration: { ...prev.vibration, vertical: e.target.value }
                        }))}
                      />
                      <Input
                        placeholder="A: 0.9"
                        value={operatingParameters.vibration.axial}
                        onChange={(e) => setOperatingParameters(prev => ({
                          ...prev,
                          vibration: { ...prev.vibration, axial: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drag and Drop Zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary"
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto bg-muted rounded-lg flex items-center justify-center">
                <CloudUpload className="text-muted-foreground text-xl" />
              </div>
              <div>
                <p className="text-foreground font-medium">
                  {isDragActive
                    ? "Drop files here..."
                    : "Drag and drop files here, or click to browse"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supports CSV, Excel, PDF, JSON, and TXT files
                </p>
              </div>
            </div>
          </div>

          {/* Supported Formats */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">CSV</Badge>
            <Badge variant="secondary">Excel</Badge>
            <Badge variant="secondary">PDF</Badge>
            <Badge variant="secondary">JSON</Badge>
            <Badge variant="secondary">TXT</Badge>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Uploaded Files</h3>
              <div className="space-y-2">
                {uploadedFiles.map((uploadedFile) => (
                  <div
                    key={uploadedFile.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="text-muted-foreground" size={16} />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadedFile.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={
              uploadedFiles.length === 0 ||
              !issueDescription.trim() ||
              createAnalysisMutation.isPending
            }
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            {createAnalysisMutation.isPending ? "Starting Analysis..." : "Start Analysis"}
          </Button>
        </CardContent>
      </Card>

      {/* AI Processing Section */}
      <ProcessingStatus analysisId={currentAnalysisId} />
    </div>
  );
}
