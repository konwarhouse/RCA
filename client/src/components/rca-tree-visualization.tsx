import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, FileText, Download, Edit } from "lucide-react";
import type { Analysis } from "@shared/schema";

interface RCATreeProps {
  analysis: Analysis;
  onEdit?: (analysis: Analysis) => void;
}

interface TreeNode {
  id: string;
  label: string;
  confidence: number;
  evidence: string[];
  children?: TreeNode[];
  type: 'root' | 'primary' | 'secondary' | 'evidence';
}

export default function RCATreeVisualization({ analysis, onEdit }: RCATreeProps) {
  const [viewMode, setViewMode] = useState<'tree' | 'fishbone'>('tree');

  // Generate tree structure from analysis data
  const generateTreeData = (): TreeNode => {
    const equipmentType = analysis.equipmentType || 'equipment';
    const rootCause = analysis.rootCause || 'Unknown root cause';
    
    // Extract contributing factors based on equipment type and operating parameters
    const contributingFactors: TreeNode[] = [];

    if (analysis.operatingParameters) {
      const params = analysis.operatingParameters as any;
      
      // Temperature-related factors
      if (params.temperature) {
        const tempIssues = [];
        if (params.temperature.bearing > 130) tempIssues.push('Excessive bearing temperature');
        if (params.temperature.outlet - params.temperature.inlet > 30) tempIssues.push('High temperature differential');
        
        if (tempIssues.length > 0) {
          contributingFactors.push({
            id: 'temp-factor',
            label: 'Temperature Issues',
            confidence: 85,
            evidence: tempIssues,
            type: 'primary',
            children: tempIssues.map((issue, idx) => ({
              id: `temp-evidence-${idx}`,
              label: issue,
              confidence: 80,
              evidence: [`Operating parameter: ${params.temperature.bearing}°F bearing temperature`],
              type: 'evidence'
            }))
          });
        }
      }

      // Vibration-related factors
      if (params.vibration) {
        const vibIssues = [];
        if (params.vibration.horizontal > 3.0) vibIssues.push('High horizontal vibration');
        if (params.vibration.vertical > 3.0) vibIssues.push('High vertical vibration');
        
        if (vibIssues.length > 0) {
          contributingFactors.push({
            id: 'vib-factor',
            label: 'Vibration Anomalies',
            confidence: 92,
            evidence: vibIssues,
            type: 'primary',
            children: vibIssues.map((issue, idx) => ({
              id: `vib-evidence-${idx}`,
              label: issue,
              confidence: 88,
              evidence: [`Measurement: ${params.vibration.horizontal} mm/s horizontal`],
              type: 'evidence'
            }))
          });
        }
      }

      // Pressure-related factors (for pumps)
      if (params.pressure && equipmentType === 'pump') {
        const pressureIssues = [];
        const pressureDrop = params.pressure.upstream - params.pressure.downstream;
        if (pressureDrop > 5) pressureIssues.push('Excessive pressure drop');
        
        if (pressureIssues.length > 0) {
          contributingFactors.push({
            id: 'pressure-factor',
            label: 'Pressure Anomalies',
            confidence: 78,
            evidence: pressureIssues,
            type: 'primary',
            children: pressureIssues.map((issue, idx) => ({
              id: `pressure-evidence-${idx}`,
              label: issue,
              confidence: 75,
              evidence: [`Pressure drop: ${pressureDrop.toFixed(1)} PSI`],
              type: 'evidence'
            }))
          });
        }
      }
    }

    // Add maintenance-related factors from historical data
    if (analysis.historicalData) {
      const histData = analysis.historicalData as any;
      if (histData.previousFailures && histData.previousFailures.length > 0) {
        contributingFactors.push({
          id: 'maintenance-factor',
          label: 'Maintenance History',
          confidence: 70,
          evidence: histData.previousFailures.map((f: any) => f.rootCause),
          type: 'secondary',
          children: histData.previousFailures.map((failure: any, idx: number) => ({
            id: `maint-evidence-${idx}`,
            label: failure.rootCause,
            confidence: 65,
            evidence: [`Previous failure: ${failure.date}`, `Downtime: ${failure.downtime} hours`],
            type: 'evidence'
          }))
        });
      }
    }

    return {
      id: 'root',
      label: rootCause,
      confidence: analysis.confidence || 0,
      evidence: [`Analysis ID: ${analysis.analysisId}`, `Equipment: ${analysis.equipmentId}`],
      type: 'root',
      children: contributingFactors
    };
  };

  const treeData = generateTreeData();

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const getNodeColor = (type: string, confidence: number) => {
      switch (type) {
        case 'root': return 'bg-red-100 border-red-300 text-red-800';
        case 'primary': return confidence > 80 ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-yellow-100 border-yellow-300 text-yellow-800';
        case 'secondary': return 'bg-blue-100 border-blue-300 text-blue-800';
        case 'evidence': return 'bg-green-100 border-green-300 text-green-800';
        default: return 'bg-gray-100 border-gray-300 text-gray-800';
      }
    };

    return (
      <div key={node.id} className={`ml-${level * 8}`}>
        <div className={`p-3 rounded-lg border-2 mb-3 ${getNodeColor(node.type, node.confidence)}`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">{node.label}</h4>
            <Badge variant="outline" className="text-xs">
              {node.confidence}% confidence
            </Badge>
          </div>
          {node.evidence.length > 0 && (
            <div className="text-xs opacity-80">
              <strong>Evidence:</strong>
              <ul className="list-disc list-inside mt-1">
                {node.evidence.map((evidence, idx) => (
                  <li key={idx}>{evidence}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {node.children && node.children.map(child => renderTreeNode(child, level + 1))}
      </div>
    );
  };

  const renderFishboneDiagram = () => {
    return (
      <div className="relative bg-white p-8 rounded-lg border">
        <svg width="100%" height="400" viewBox="0 0 800 400" className="overflow-visible">
          {/* Main spine */}
          <line x1="100" y1="200" x2="700" y2="200" stroke="#374151" strokeWidth="3" />
          
          {/* Head (problem) */}
          <rect x="680" y="170" width="100" height="60" fill="#ef4444" rx="8" />
          <text x="730" y="195" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
            Root Cause
          </text>
          <text x="730" y="210" textAnchor="middle" fill="white" fontSize="10">
            {analysis.issueDescription?.substring(0, 20)}...
          </text>

          {/* Primary branches */}
          {treeData.children?.slice(0, 6).map((factor, idx) => {
            const isTop = idx % 2 === 0;
            const x = 150 + (idx * 90);
            const y1 = 200;
            const y2 = isTop ? 120 : 280;
            const textY = isTop ? 110 : 295;
            
            return (
              <g key={factor.id}>
                {/* Branch line */}
                <line x1={x} y1={y1} x2={x + 50} y2={y2} stroke="#6b7280" strokeWidth="2" />
                
                {/* Factor box */}
                <rect 
                  x={x + 30} 
                  y={textY - 15} 
                  width="80" 
                  height="30" 
                  fill="#3b82f6" 
                  rx="4" 
                />
                <text 
                  x={x + 70} 
                  y={textY} 
                  textAnchor="middle" 
                  fill="white" 
                  fontSize="10"
                  fontWeight="bold"
                >
                  {factor.label.substring(0, 12)}
                </text>
                
                {/* Confidence badge */}
                <circle cx={x + 100} cy={textY} r="8" fill="#10b981" />
                <text x={x + 100} y={textY + 3} textAnchor="middle" fill="white" fontSize="8">
                  {factor.confidence}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5" />
            <span>Root Cause Analysis Tree</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(analysis)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Analysis
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'tree' | 'fishbone')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tree">Tree View</TabsTrigger>
            <TabsTrigger value="fishbone">Fishbone Diagram</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tree" className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-4">
                <strong>Analysis:</strong> {analysis.analysisId} | <strong>Equipment:</strong> {analysis.equipmentId} | <strong>Confidence:</strong> {analysis.confidence}%
              </div>
              {renderTreeNode(treeData)}
            </div>
          </TabsContent>
          
          <TabsContent value="fishbone">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-4">
                <strong>Ishikawa Diagram:</strong> Visual representation of contributing factors
              </div>
              {renderFishboneDiagram()}
            </div>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-xs">Root Cause</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
              <span className="text-xs">Primary Factor</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span className="text-xs">Secondary Factor</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-xs">Evidence</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}