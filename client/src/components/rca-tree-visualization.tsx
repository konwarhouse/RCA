import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";

interface RCATreeProps {
  analysis: any;
  onEdit?: (analysis: any) => void;
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
  const [zoom, setZoom] = useState(1);

  // Generate tree structure from analysis data
  const generateTreeData = (): TreeNode => {
    if (!analysis) {
      return {
        id: 'root',
        label: 'No Analysis Data',
        confidence: 0,
        evidence: [],
        type: 'root'
      };
    }

    const rootCause = analysis.failureMode || analysis.rootCause || 'Equipment Failure';
    
    // Extract contributing factors from analysis results
    const contributingFactors: TreeNode[] = [];

    // Extract root causes from analysis
    if (analysis.rootCauses && Array.isArray(analysis.rootCauses)) {
      analysis.rootCauses.forEach((cause: any, index: number) => {
        contributingFactors.push({
          id: `root-cause-${index}`,
          label: cause.description || cause.title || `Root Cause ${index + 1}`,
          confidence: cause.confidence || 75,
          evidence: cause.evidence || [cause.rationale || 'Analysis evidence'],
          type: 'primary',
          children: cause.contributingFactors?.map((factor: any, factorIndex: number) => ({
            id: `factor-${index}-${factorIndex}`,
            label: factor.description || factor.name || `Contributing Factor ${factorIndex + 1}`,
            confidence: factor.confidence || 70,
            evidence: factor.evidence || [],
            type: 'secondary'
          })) || []
        });
      });
    }

    // Extract recommendations as potential preventive measures
    if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
      const preventiveMeasures = analysis.recommendations.slice(0, 3).map((rec: any, index: number) => ({
        id: `prevention-${index}`,
        label: rec.title || rec.description || `Preventive Measure ${index + 1}`,
        confidence: 90,
        evidence: [rec.rationale || 'Recommended prevention'],
        type: 'evidence' as const
      }));

      if (preventiveMeasures.length > 0) {
        contributingFactors.push({
          id: 'prevention-root',
          label: 'Preventive Measures',
          confidence: 90,
          evidence: ['Analysis recommendations'],
          type: 'primary',
          children: preventiveMeasures
        });
      }
    }

    // Add default contributing factors if none detected
    if (contributingFactors.length === 0) {
      contributingFactors.push({
        id: 'default-factor',
        label: 'Analysis Results',
        confidence: analysis.overallConfidence || 75,
        evidence: ['AI analysis findings'],
        type: 'primary',
        children: [
          {
            id: 'default-evidence',
            label: 'Investigation Evidence',
            confidence: 70,
            evidence: ['Collected evidence from investigation'],
            type: 'evidence'
          }
        ]
      });
    }

    // Return the tree structure
    return {
      id: 'root',
      label: rootCause,
      confidence: analysis.overallConfidence || 85,
      evidence: ['Analysis results'],
      type: 'root',
      children: contributingFactors
    };
  };

  const treeData = generateTreeData();

  // Render tree node recursively
  const renderTreeNode = (node: TreeNode, depth: number = 0): JSX.Element => {
    const getNodeColor = (type: string, confidence: number) => {
      if (type === 'root') return 'bg-red-100 border-red-300 text-red-800';
      if (type === 'primary') return confidence >= 80 ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-yellow-100 border-yellow-300 text-yellow-800';
      if (type === 'secondary') return 'bg-blue-100 border-blue-300 text-blue-800';
      return 'bg-gray-100 border-gray-300 text-gray-800';
    };

    return (
      <div key={node.id} className={`ml-${depth * 8} mb-4`}>
        <div className={`inline-block p-3 rounded-lg border-2 ${getNodeColor(node.type, node.confidence)} max-w-md`}>
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm">{node.label}</h4>
            <Badge variant="outline" className="text-xs">
              {node.confidence}%
            </Badge>
          </div>
          {node.evidence && node.evidence.length > 0 && (
            <div className="text-xs opacity-75">
              <strong>Evidence:</strong> {node.evidence[0]}
            </div>
          )}
        </div>
        {node.children && node.children.map(child => renderTreeNode(child, depth + 1))}
      </div>
    );
  };

  // Fishbone diagram nodes
  const renderFishboneNode = (node: TreeNode, position: string) => {
    return (
      <div key={node.id} className={`p-2 rounded border ${position === 'main' ? 'bg-red-100 border-red-300' : 'bg-blue-100 border-blue-300'} text-sm`}>
        <div className="font-semibold">{node.label}</div>
        <div className="text-xs">Confidence: {node.confidence}%</div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'tree' | 'fishbone')}>
          <TabsList>
            <TabsTrigger value="tree">Tree View</TabsTrigger>
            <TabsTrigger value="fishbone">Fishbone View</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="bg-white border rounded-lg p-6 min-h-[400px] overflow-auto" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        {viewMode === 'tree' ? (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Root Cause Analysis Tree</h3>
              <p className="text-sm text-gray-600">Equipment: {analysis?.equipmentType || 'Unknown'} | Confidence: {analysis?.overallConfidence || 0}%</p>
            </div>
            
            {renderTreeNode(treeData)}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Fishbone Diagram</h3>
              <p className="text-sm text-gray-600">Cause and Effect Analysis</p>
            </div>
            
            <div className="grid grid-cols-3 gap-6 relative">
              {/* Main problem */}
              <div className="col-span-3 flex justify-center">
                {renderFishboneNode(treeData, 'main')}
              </div>
              
              {/* Contributing factors */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-center">Primary Causes</h4>
                {treeData.children?.filter(child => child.type === 'primary').slice(0, 2).map(node => renderFishboneNode(node, 'branch'))}
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-center">Secondary Causes</h4>
                {treeData.children?.filter(child => child.type === 'secondary').slice(0, 2).map(node => renderFishboneNode(node, 'branch'))}
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-center">Evidence</h4>
                {treeData.children?.filter(child => child.type === 'evidence').slice(0, 2).map(node => renderFishboneNode(node, 'branch'))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-sm mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>Root Cause</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
            <span>Primary Factor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Secondary Factor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Evidence</span>
          </div>
        </div>
      </div>
    </div>
  );
}