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

  // Generate tree structure from analysis data with enhanced universal logic
  const generateTreeData = (): TreeNode & { 
    equipmentContext?: string; 
    evidenceAdequacy?: number; 
    eliminatedCauses?: TreeNode[];
    originalSymptoms?: string[];
    operatingContext?: string[];
  } => {
    if (!analysis) {
      return {
        id: 'root',
        label: 'No Analysis Data',
        confidence: 0,
        evidence: [],
        type: 'root'
      };
    }

    // Universal equipment identification logic - works for ANY equipment combination
    const equipmentContext = analysis.equipmentGroup && analysis.equipmentType 
      ? `${analysis.equipmentGroup} → ${analysis.equipmentType}${analysis.equipmentSubtype ? ` → ${analysis.equipmentSubtype}` : ''}`
      : 'Equipment Type Not Specified';
      
    const rootCause = analysis.failureMode || analysis.rootCause || 'Equipment Failure';
    
    // Extract original symptoms from incident data (universal for all equipment)
    const originalSymptoms: string[] = [];
    if (analysis.symptoms) originalSymptoms.push(...analysis.symptoms);
    if (analysis.description) originalSymptoms.push(`Reported: ${analysis.description}`);
    
    // Extract operating context (universal approach)
    const operatingContext: string[] = [];
    if (analysis.operatingParameters) {
      const params = analysis.operatingParameters;
      Object.keys(params).forEach(key => {
        if (params[key] && typeof params[key] === 'object') {
          Object.entries(params[key]).forEach(([subKey, value]) => {
            operatingContext.push(`${key}.${subKey}: ${value}`);
          });
        } else if (params[key]) {
          operatingContext.push(`${key}: ${params[key]}`);
        }
      });
    }
    
    // Calculate evidence adequacy score (universal formula)
    let evidenceAdequacy = 0;
    const evidenceFactors = [
      analysis.evidenceFiles?.length || 0, // Files uploaded
      analysis.evidenceChecklist?.filter((item: any) => item.completed)?.length || 0, // Checklist completion
      analysis.crossMatchResults?.libraryMatches?.length || 0, // Library matches
      originalSymptoms.length, // Symptom detail
      operatingContext.length // Operating context detail
    ];
    evidenceAdequacy = Math.min(100, Math.round((evidenceFactors.reduce((a, b) => a + b, 0) / 15) * 100));
    
    // Extract contributing factors from analysis results
    const contributingFactors: TreeNode[] = [];
    
    // Extract eliminated causes (universal logic for all equipment)
    const eliminatedCauses: TreeNode[] = [];
    if (analysis.eliminationResults) {
      analysis.eliminationResults.forEach((elimination: any, index: number) => {
        eliminatedCauses.push({
          id: `eliminated-${index}`,
          label: elimination.failureMode || `Eliminated Cause ${index + 1}`,
          confidence: 0, // Eliminated = 0% confidence
          evidence: [elimination.reason || 'Eliminated by analysis'],
          type: 'evidence'
        });
      });
    }

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

    // Return the enhanced tree structure with universal context
    return {
      id: 'root',
      label: rootCause,
      confidence: analysis.overallConfidence || 85,
      evidence: ['Analysis results'],
      type: 'root',
      children: contributingFactors,
      equipmentContext,
      evidenceAdequacy,
      eliminatedCauses,
      originalSymptoms,
      operatingContext
    };
  };

  const treeData = generateTreeData();

  // Render causal arrow connector (universal for all failure types)
  const renderCausalArrow = (fromType: string, toType: string) => {
    const getArrowColor = () => {
      if (fromType === 'root' && toType === 'primary') return 'text-red-500';
      if (fromType === 'primary' && toType === 'secondary') return 'text-orange-500';
      return 'text-blue-500';
    };
    
    return (
      <div className={`flex items-center justify-center my-2 ${getArrowColor()}`}>
        <div className="text-lg">↓</div>
        <span className="text-xs ml-1">leads to</span>
      </div>
    );
  };

  // Render tree node recursively with enhanced universal logic
  const renderTreeNode = (node: TreeNode, depth: number = 0, parentType?: string): JSX.Element => {
    const getNodeColor = (type: string, confidence: number) => {
      if (type === 'root') return 'bg-red-100 border-red-300 text-red-800';
      if (type === 'primary') return confidence >= 80 ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-yellow-100 border-yellow-300 text-yellow-800';
      if (type === 'secondary') return 'bg-blue-100 border-blue-300 text-blue-800';
      return 'bg-gray-100 border-gray-300 text-gray-800';
    };

    return (
      <div key={node.id} className={`ml-${depth * 8} mb-4`}>
        {/* Causal arrow from parent (universal logic) */}
        {parentType && depth > 0 && renderCausalArrow(parentType, node.type)}
        
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
          
          {/* Show failure logic connection for root nodes */}
          {node.type === 'root' && node.children && node.children.length > 0 && (
            <div className="text-xs mt-2 p-2 bg-white/50 rounded border">
              <strong>Failure Logic:</strong> {node.children.length} contributing factor{node.children.length > 1 ? 's' : ''} identified
            </div>
          )}
        </div>
        
        {node.children && node.children.map(child => renderTreeNode(child, depth + 1, node.type))}
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
            {/* Enhanced header with equipment context and evidence adequacy */}
            <div className="text-center mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Root Cause Analysis Tree</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Equipment:</strong> {treeData.equipmentContext || 'Equipment type not specified'} | 
                  <strong> Analysis Confidence:</strong> {analysis?.overallConfidence || 0}%
                </p>
                <div className="flex justify-center items-center gap-4">
                  <Badge variant={treeData.evidenceAdequacy >= 80 ? 'default' : treeData.evidenceAdequacy >= 60 ? 'secondary' : 'destructive'}>
                    Evidence Adequacy: {treeData.evidenceAdequacy}%
                  </Badge>
                  {treeData.eliminatedCauses && treeData.eliminatedCauses.length > 0 && (
                    <Badge variant="outline">
                      {treeData.eliminatedCauses.length} Causes Eliminated
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Original symptoms and operating context (universal) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {treeData.originalSymptoms && treeData.originalSymptoms.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-sm text-blue-800 mb-2">🔧 Original Symptoms</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {treeData.originalSymptoms.map((symptom, index) => (
                      <li key={index}>• {symptom}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {treeData.operatingContext && treeData.operatingContext.length > 0 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-sm text-green-800 mb-2">⚙️ Operating Context</h4>
                  <ul className="text-xs text-green-700 space-y-1">
                    {treeData.operatingContext.slice(0, 4).map((context, index) => (
                      <li key={index}>• {context}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Main RCA Tree */}
            {renderTreeNode(treeData)}
            
            {/* Eliminated causes section (universal logic) */}
            {treeData.eliminatedCauses && treeData.eliminatedCauses.length > 0 && (
              <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-sm text-gray-800 mb-3">📉 Eliminated Causes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {treeData.eliminatedCauses.map((cause, index) => (
                    <div key={index} className="bg-white p-2 rounded border border-gray-300 opacity-60">
                      <div className="flex items-center justify-between">
                        <span className="text-sm line-through">{cause.label}</span>
                        <Badge variant="outline" className="text-xs">Eliminated</Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{cause.evidence[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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