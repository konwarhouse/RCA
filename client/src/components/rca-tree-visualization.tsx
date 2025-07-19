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

      // Pressure-related factors
      if (params.pressure) {
        const pressureIssues = [];
        const pressureDiff = params.pressure.upstream - params.pressure.downstream;
        if (pressureDiff > 50) pressureIssues.push('High pressure differential');
        if (params.pressure.upstream > 150) pressureIssues.push('Excessive upstream pressure');
        
        if (pressureIssues.length > 0) {
          contributingFactors.push({
            id: 'pressure-factor',
            label: 'Pressure Issues',
            confidence: 78,
            evidence: pressureIssues,
            type: 'primary',
            children: pressureIssues.map((issue, idx) => ({
              id: `pressure-evidence-${idx}`,
              label: issue,
              confidence: 75,
              evidence: [`Operating parameter: ${params.pressure.upstream} PSI upstream`],
              type: 'evidence'
            }))
          });
        }
      }

      // Vibration-related factors
      if (params.vibration) {
        const vibrationIssues = [];
        if (params.vibration.amplitude > 10) vibrationIssues.push('High vibration amplitude');
        if (params.vibration.frequency > 60) vibrationIssues.push('Abnormal frequency detected');
        
        if (vibrationIssues.length > 0) {
          contributingFactors.push({
            id: 'vibration-factor',
            label: 'Vibration Issues',
            confidence: 82,
            evidence: vibrationIssues,
            type: 'primary',
            children: vibrationIssues.map((issue, idx) => ({
              id: `vibration-evidence-${idx}`,
              label: issue,
              confidence: 80,
              evidence: [`Operating parameter: ${params.vibration.amplitude} mm/s amplitude`],
              type: 'evidence'
            }))
          });
        }
      }
    }

    // Add default contributing factors if none detected
    if (contributingFactors.length === 0) {
      contributingFactors.push({
        id: 'default-factor',
        label: 'Operational Factors',
        confidence: 75,
        evidence: ['General operational conditions', 'Equipment age and wear'],
        type: 'primary',
        children: [
          {
            id: 'wear-evidence',
            label: 'Normal wear and tear',
            confidence: 70,
            evidence: ['Equipment usage patterns'],
            type: 'evidence'
          }
        ]
      });
    }

    return {
      id: 'root-node',
      label: rootCause,
      confidence: analysis.confidence || 85,
      evidence: ['Analysis completed', 'Equipment data reviewed'],
      type: 'root',
      children: contributingFactors
    };
  };

  // Generate fishbone diagram data
  const generateFishboneData = () => {
    const categories = [
      { name: 'Methods', factors: ['Operating procedures', 'Maintenance schedule', 'Training protocols'] },
      { name: 'Materials', factors: ['Lubricant quality', 'Spare parts', 'Consumables'] },
      { name: 'Machines', factors: ['Equipment age', 'Design limitations', 'Wear patterns'] },
      { name: 'Environment', factors: ['Temperature', 'Humidity', 'Contamination'] },
      { name: 'People', factors: ['Training level', 'Experience', 'Workload'] },
      { name: 'Measurements', factors: ['Sensor accuracy', 'Data quality', 'Monitoring frequency'] }
    ];

    // Add specific factors based on analysis
    if (analysis.operatingParameters) {
      const params = analysis.operatingParameters as any;
      if (params.temperature?.bearing > 130) {
        categories[3].factors.push('Excessive heat generation');
      }
      if (params.vibration?.amplitude > 10) {
        categories[2].factors.push('Mechanical imbalance');
      }
      if (params.pressure) {
        categories[2].factors.push('Pressure system issues');
      }
    }

    return {
      rootCause: analysis.rootCause || 'Unknown root cause',
      categories
    };
  };

  const treeData = generateTreeData();
  const fishboneData = generateFishboneData();

  // Render tree node recursively
  const renderTreeNode = (node: TreeNode, level = 0) => {
    const getNodeStyle = (type: string) => {
      switch (type) {
        case 'root':
          return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200';
        case 'primary':
          return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-200';
        case 'secondary':
          return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200';
        case 'evidence':
          return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200';
        default:
          return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200';
      }
    };

    return (
      <div key={node.id} className={`ml-${level * 4}`}>
        <div className={`p-3 rounded-lg border-2 mb-3 ${getNodeStyle(node.type)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4" />
              <span className="font-medium">{node.label}</span>
            </div>
            <Badge variant="outline">
              {node.confidence}% confidence
            </Badge>
          </div>
          
          {node.evidence.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Evidence:</p>
              <ul className="text-xs space-y-1">
                {node.evidence.map((evidence, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="w-1 h-1 bg-current rounded-full mt-1.5 mr-2 flex-shrink-0" />
                    {evidence}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {node.children && node.children.length > 0 && (
          <div className="ml-4 border-l-2 border-gray-300 dark:border-gray-600 pl-4">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render fishbone diagram
  const renderFishboneDiagram = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-block bg-red-100 border-2 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200 px-6 py-3 rounded-lg font-bold text-lg">
            {fishboneData.rootCause}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fishboneData.categories.map((category, idx) => (
            <Card key={idx} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-center">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {category.factors.map((factor, factorIdx) => (
                    <li key={factorIdx} className="flex items-start text-sm">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 mr-2 flex-shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5" />
            <span>RCA Tree Visualization</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onEdit?.(analysis)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Analysis
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Diagram
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'tree' | 'fishbone')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tree">Tree View</TabsTrigger>
            <TabsTrigger value="fishbone">Fishbone Diagram</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tree" className="mt-6">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Interactive root cause analysis tree showing the primary root cause, contributing factors, and supporting evidence with confidence levels.
              </div>
              <div className="max-h-96 overflow-y-auto">
                {renderTreeNode(treeData)}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="fishbone" className="mt-6">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Fishbone (Ishikawa) diagram categorizing potential causes across the 6M framework: Methods, Materials, Machines, Environment, People, and Measurements.
              </div>
              {renderFishboneDiagram()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}