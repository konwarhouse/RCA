// Fault Tree Analysis Engine for Equipment RCA (ISO 14224 compliant)
import { FAULT_TREE_TEMPLATES, type FaultTreeNode } from "@shared/iso14224-taxonomy";

export interface FaultTreeAnalysisResult {
  topEvent: string;
  faultTree: FaultTreeNode;
  criticalPath: FaultTreeNode[];
  probabilityCalculations: Record<string, number>;
  evidenceMapping: Record<string, string[]>;
  confidenceScore: number;
  recommendations: RecommendationItem[];
}

export interface RecommendationItem {
  id: string;
  type: 'corrective' | 'preventive' | 'monitoring';
  priority: 'immediate' | 'short_term' | 'long_term';
  category: 'maintenance' | 'design' | 'operations' | 'training';
  description: string;
  justification: string;
  evidenceSupport: string[];
  estimatedCost?: 'low' | 'medium' | 'high';
  implementation?: string;
}

export class FaultTreeEngine {
  private templates: Record<string, FaultTreeNode>;

  constructor() {
    this.templates = FAULT_TREE_TEMPLATES;
  }

  // Main analysis method
  analyzeFaultTree(
    equipmentType: string,
    evidenceData: Record<string, any>
  ): FaultTreeAnalysisResult {
    
    // Get appropriate fault tree template
    const template = this.getFaultTreeTemplate(equipmentType);
    if (!template) {
      throw new Error(`No fault tree template available for equipment type: ${equipmentType}`);
    }

    // Build specific fault tree based on evidence
    const faultTree = this.buildSpecificFaultTree(template, evidenceData);
    
    // Calculate probabilities
    const probabilities = this.calculateProbabilities(faultTree, evidenceData);
    
    // Find critical path
    const criticalPath = this.findCriticalPath(faultTree, probabilities);
    
    // Map evidence to fault tree nodes
    const evidenceMapping = this.mapEvidenceToNodes(faultTree, evidenceData);
    
    // Calculate overall confidence
    const confidenceScore = this.calculateConfidenceScore(evidenceMapping, evidenceData);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(criticalPath, evidenceData, equipmentType);

    return {
      topEvent: template.description,
      faultTree,
      criticalPath,
      probabilityCalculations: probabilities,
      evidenceMapping,
      confidenceScore,
      recommendations
    };
  }

  private getFaultTreeTemplate(equipmentType: string): FaultTreeNode | null {
    // Map equipment types to fault tree templates
    const templateMap: Record<string, string> = {
      'centrifugal_pump': 'pump_failure',
      'reciprocating_pump': 'pump_failure', 
      'rotary_pump': 'pump_failure',
      'gate_valve': 'valve_failure',
      'globe_valve': 'valve_failure',
      'ball_valve': 'valve_failure',
      'butterfly_valve': 'valve_failure',
      'control_valve': 'valve_failure'
    };

    const templateKey = templateMap[equipmentType];
    return templateKey ? this.templates[templateKey] : null;
  }

  private buildSpecificFaultTree(
    template: FaultTreeNode, 
    evidenceData: Record<string, any>
  ): FaultTreeNode {
    // Deep clone the template
    const faultTree = JSON.parse(JSON.stringify(template));
    
    // Prune irrelevant branches based on evidence
    this.pruneIrrelevantBranches(faultTree, evidenceData);
    
    // Add equipment-specific branches if needed
    this.addEquipmentSpecificBranches(faultTree, evidenceData);
    
    return faultTree;
  }

  private pruneIrrelevantBranches(node: FaultTreeNode, evidenceData: Record<string, any>): void {
    if (!node.children) return;

    // Remove branches that are clearly not applicable based on evidence
    node.children = node.children.filter(child => {
      if (child.evidenceRequired) {
        // Check if we have contradictory evidence
        return !this.hasContradictoryEvidence(child, evidenceData);
      }
      return true;
    });

    // Recursively prune children
    node.children.forEach(child => this.pruneIrrelevantBranches(child, evidenceData));
  }

  private hasContradictoryEvidence(node: FaultTreeNode, evidenceData: Record<string, any>): boolean {
    if (!node.evidenceRequired) return false;

    // Define contradictory evidence rules
    const contradictions: Record<string, any> = {
      'cavitation': {
        'suction_pressure': (value: number) => value > 2.0, // High suction pressure contradicts cavitation
        'cavitation_signs': (value: boolean) => value === false
      },
      'dry_running': {
        'flow_rate': (value: number) => value > 0.1, // Significant flow contradicts dry running
        'suction_level': (value: string) => value === 'normal' || value === 'high'
      },
      'seal_failure': {
        'leak_location': (value: string) => !['stem', 'body'].includes(value) // External leak not from seal
      }
    };

    const nodeId = node.id;
    if (contradictions[nodeId]) {
      for (const [evidenceKey, checkFunc] of Object.entries(contradictions[nodeId])) {
        const evidenceValue = evidenceData[evidenceKey];
        if (evidenceValue !== undefined && checkFunc(evidenceValue)) {
          return true; // Contradictory evidence found
        }
      }
    }

    return false;
  }

  private addEquipmentSpecificBranches(node: FaultTreeNode, evidenceData: Record<string, any>): void {
    // Add branches based on specific equipment parameters or conditions
    const equipmentType = evidenceData.equipment_type;
    
    if (equipmentType?.includes('pump') && evidenceData.vibration_level > 10) {
      // Add vibration-related failure modes for pumps
      this.addVibrationFailureBranch(node, evidenceData);
    }
    
    if (equipmentType?.includes('valve') && evidenceData.actuator_type === 'pneumatic') {
      // Add actuator-specific failure modes
      this.addActuatorFailureBranch(node, evidenceData);
    }
  }

  private addVibrationFailureBranch(node: FaultTreeNode, evidenceData: Record<string, any>): void {
    if (node.id === 'mechanical_failure' && node.children) {
      const vibrationBranch: FaultTreeNode = {
        id: 'excessive_vibration',
        type: 'basic_event',
        description: 'Excessive Vibration',
        evidenceRequired: ['vibration_level', 'operating_speed', 'alignment_condition']
      };
      node.children.push(vibrationBranch);
    }
  }

  private addActuatorFailureBranch(node: FaultTreeNode, evidenceData: Record<string, any>): void {
    if (node.id === 'valve_failure' && node.children) {
      const actuatorBranch: FaultTreeNode = {
        id: 'actuator_failure',
        type: 'intermediate_event',
        description: 'Actuator Failure',
        gate: 'OR',
        children: [
          {
            id: 'air_supply_failure',
            type: 'basic_event',
            description: 'Air Supply Failure',
            evidenceRequired: ['air_pressure', 'air_quality']
          },
          {
            id: 'actuator_seal_failure',
            type: 'basic_event',
            description: 'Actuator Seal Failure',
            evidenceRequired: ['actuator_leak_signs', 'maintenance_history']
          }
        ]
      };
      node.children.push(actuatorBranch);
    }
  }

  private calculateProbabilities(
    faultTree: FaultTreeNode, 
    evidenceData: Record<string, any>
  ): Record<string, number> {
    const probabilities: Record<string, number> = {};
    
    this.calculateNodeProbability(faultTree, evidenceData, probabilities);
    
    return probabilities;
  }

  private calculateNodeProbability(
    node: FaultTreeNode,
    evidenceData: Record<string, any>,
    probabilities: Record<string, number>
  ): number {
    // If already calculated, return cached value
    if (probabilities[node.id] !== undefined) {
      return probabilities[node.id];
    }

    let probability: number;

    if (node.type === 'basic_event') {
      // Calculate basic event probability based on evidence
      probability = this.calculateBasicEventProbability(node, evidenceData);
    } else if (node.children && node.children.length > 0) {
      // Calculate intermediate event probability based on gate logic
      const childProbabilities = node.children.map(child => 
        this.calculateNodeProbability(child, evidenceData, probabilities)
      );

      switch (node.gate) {
        case 'OR':
          // P(A OR B) = P(A) + P(B) - P(A AND B)
          probability = this.calculateOrGateProbability(childProbabilities);
          break;
        case 'AND':
          // P(A AND B) = P(A) * P(B)
          probability = childProbabilities.reduce((acc, p) => acc * p, 1);
          break;
        default:
          probability = 0.5; // Default uncertainty
      }
    } else {
      probability = 0.5; // Default for undeveloped events
    }

    probabilities[node.id] = Math.min(Math.max(probability, 0), 1); // Clamp to [0,1]
    return probabilities[node.id];
  }

  private calculateBasicEventProbability(
    node: FaultTreeNode,
    evidenceData: Record<string, any>
  ): number {
    if (!node.evidenceRequired) {
      return 0.1; // Default low probability for events without evidence
    }

    let probability = 0;
    let evidenceCount = 0;

    // Check each required evidence item
    for (const evidenceKey of node.evidenceRequired) {
      const evidenceValue = evidenceData[evidenceKey];
      
      if (evidenceValue !== undefined) {
        evidenceCount++;
        probability += this.evaluateEvidenceForProbability(evidenceKey, evidenceValue, node.id);
      }
    }

    if (evidenceCount === 0) {
      return 0.1; // Low probability if no evidence available
    }

    return probability / evidenceCount; // Average of evidence-based probabilities
  }

  private evaluateEvidenceForProbability(
    evidenceKey: string, 
    evidenceValue: any, 
    nodeId: string
  ): number {
    // Evidence-based probability rules
    const evidenceRules: Record<string, Record<string, (value: any) => number>> = {
      'seal_failure': {
        'leak_location': (value: string) => value === 'stem' ? 0.8 : 0.3,
        'operating_pressure': (value: number) => value > 50 ? 0.7 : 0.4,
        'seal_condition': (value: string) => value === 'poor' ? 0.9 : 0.2
      },
      'cavitation': {
        'suction_pressure': (value: number) => value < 1.0 ? 0.9 : 0.1,
        'cavitation_signs': (value: boolean) => value ? 0.95 : 0.05,
        'npsh_available': (value: number) => value < 3.0 ? 0.8 : 0.2
      },
      'bearing_failure': {
        'vibration_level': (value: number) => value > 10 ? 0.8 : 0.3,
        'operating_temperature': (value: number) => value > 80 ? 0.7 : 0.3,
        'lubrication_condition': (value: string) => value === 'poor' ? 0.9 : 0.1
      }
    };

    const nodeRules = evidenceRules[nodeId];
    if (nodeRules && nodeRules[evidenceKey]) {
      return nodeRules[evidenceKey](evidenceValue);
    }

    // Default evidence evaluation
    if (typeof evidenceValue === 'boolean') {
      return evidenceValue ? 0.7 : 0.3;
    }
    
    return 0.5; // Default uncertainty
  }

  private calculateOrGateProbability(probabilities: number[]): number {
    // For multiple events: P(A OR B OR C) = 1 - P(not A AND not B AND not C)
    const complementProbability = probabilities.reduce((acc, p) => acc * (1 - p), 1);
    return 1 - complementProbability;
  }

  private findCriticalPath(
    faultTree: FaultTreeNode,
    probabilities: Record<string, number>
  ): FaultTreeNode[] {
    const path: FaultTreeNode[] = [faultTree];
    
    this.traverseCriticalPath(faultTree, probabilities, path);
    
    return path;
  }

  private traverseCriticalPath(
    node: FaultTreeNode,
    probabilities: Record<string, number>,
    path: FaultTreeNode[]
  ): void {
    if (!node.children || node.children.length === 0) {
      return; // Reached a leaf node
    }

    // Find child with highest probability
    let maxProbability = 0;
    let criticalChild: FaultTreeNode | null = null;

    for (const child of node.children) {
      const childProbability = probabilities[child.id] || 0;
      if (childProbability > maxProbability) {
        maxProbability = childProbability;
        criticalChild = child;
      }
    }

    if (criticalChild) {
      path.push(criticalChild);
      this.traverseCriticalPath(criticalChild, probabilities, path);
    }
  }

  private mapEvidenceToNodes(
    faultTree: FaultTreeNode,
    evidenceData: Record<string, any>
  ): Record<string, string[]> {
    const mapping: Record<string, string[]> = {};
    
    this.collectEvidenceMapping(faultTree, evidenceData, mapping);
    
    return mapping;
  }

  private collectEvidenceMapping(
    node: FaultTreeNode,
    evidenceData: Record<string, any>,
    mapping: Record<string, string[]>
  ): void {
    if (node.evidenceRequired) {
      const availableEvidence: string[] = [];
      
      for (const evidenceKey of node.evidenceRequired) {
        if (evidenceData[evidenceKey] !== undefined) {
          availableEvidence.push(evidenceKey);
        }
      }
      
      mapping[node.id] = availableEvidence;
    }

    if (node.children) {
      node.children.forEach(child => 
        this.collectEvidenceMapping(child, evidenceData, mapping)
      );
    }
  }

  private calculateConfidenceScore(
    evidenceMapping: Record<string, string[]>,
    evidenceData: Record<string, any>
  ): number {
    const totalEvidence = Object.values(evidenceMapping).flat().length;
    const availableEvidence = Object.values(evidenceData).filter(v => 
      v !== undefined && v !== null && v !== ''
    ).length;

    if (totalEvidence === 0) return 0;

    // Base confidence from evidence completeness
    const evidenceCompleteness = Math.min(availableEvidence / totalEvidence, 1);
    
    // Adjust for evidence quality
    const qualityFactor = this.assessEvidenceQuality(evidenceData);
    
    return Math.round(evidenceCompleteness * qualityFactor * 100);
  }

  private assessEvidenceQuality(evidenceData: Record<string, any>): number {
    let qualityScore = 1.0;
    
    // Required evidence present
    const requiredFields = ['equipment_tag', 'failure_description', 'event_datetime'];
    const requiredPresent = requiredFields.filter(field => 
      evidenceData[field] !== undefined && evidenceData[field] !== ''
    ).length;
    
    if (requiredPresent < requiredFields.length) {
      qualityScore *= 0.7; // Reduce confidence if required evidence missing
    }

    // Measurement data present (higher quality)
    const measurementFields = ['operating_pressure', 'temperature', 'vibration_level', 'flow_rate'];
    const measurementsPresent = measurementFields.filter(field => 
      typeof evidenceData[field] === 'number'
    ).length;
    
    if (measurementsPresent > 0) {
      qualityScore *= (1 + measurementsPresent * 0.1); // Boost confidence for measurements
    }

    return Math.min(qualityScore, 1.0);
  }

  private generateRecommendations(
    criticalPath: FaultTreeNode[],
    evidenceData: Record<string, any>,
    equipmentType: string
  ): RecommendationItem[] {
    const recommendations: RecommendationItem[] = [];

    // Generate recommendations based on critical path
    for (const node of criticalPath) {
      if (node.type === 'basic_event') {
        const nodeRecommendations = this.getRecommendationsForNode(node, evidenceData, equipmentType);
        recommendations.push(...nodeRecommendations);
      }
    }

    // Add general recommendations based on equipment type
    const generalRecommendations = this.getGeneralRecommendations(equipmentType, evidenceData);
    recommendations.push(...generalRecommendations);

    return recommendations;
  }

  private getRecommendationsForNode(
    node: FaultTreeNode,
    evidenceData: Record<string, any>,
    equipmentType: string
  ): RecommendationItem[] {
    const recommendations: RecommendationItem[] = [];
    
    // Node-specific recommendations
    const nodeRecommendations: Record<string, RecommendationItem[]> = {
      'seal_failure': [
        {
          id: 'replace_mechanical_seal',
          type: 'corrective',
          priority: 'immediate',
          category: 'maintenance',
          description: 'Replace mechanical seal with upgraded design',
          justification: 'Seal failure identified as primary cause based on leak location and operating conditions',
          evidenceSupport: ['leak_location', 'operating_pressure', 'seal_condition'],
          estimatedCost: 'medium',
          implementation: 'Schedule maintenance shutdown, procure OEM seal kit, follow manufacturer procedures'
        },
        {
          id: 'seal_monitoring',
          type: 'preventive',
          priority: 'short_term',
          category: 'monitoring',
          description: 'Implement seal monitoring system',
          justification: 'Prevent future seal failures through early detection',
          evidenceSupport: ['maintenance_history'],
          estimatedCost: 'low'
        }
      ],
      'cavitation': [
        {
          id: 'increase_npsh',
          type: 'corrective',
          priority: 'short_term',
          category: 'design',
          description: 'Modify suction line to increase NPSH available',
          justification: 'Cavitation damage due to insufficient NPSH margin',
          evidenceSupport: ['suction_pressure', 'npsh_available'],
          estimatedCost: 'high'
        }
      ],
      'bearing_failure': [
        {
          id: 'replace_bearings',
          type: 'corrective',
          priority: 'immediate',
          category: 'maintenance',
          description: 'Replace bearings and check shaft alignment',
          justification: 'Bearing failure evidenced by high vibration and temperature',
          evidenceSupport: ['vibration_level', 'operating_temperature'],
          estimatedCost: 'medium'
        }
      ]
    };

    if (nodeRecommendations[node.id]) {
      recommendations.push(...nodeRecommendations[node.id]);
    }

    return recommendations;
  }

  private getGeneralRecommendations(
    equipmentType: string,
    evidenceData: Record<string, any>
  ): RecommendationItem[] {
    const recommendations: RecommendationItem[] = [];

    // Equipment-specific general recommendations
    if (equipmentType?.includes('pump')) {
      recommendations.push({
        id: 'pump_condition_monitoring',
        type: 'preventive',
        priority: 'long_term',
        category: 'monitoring',
        description: 'Implement comprehensive pump condition monitoring program',
        justification: 'Systematic monitoring prevents unexpected failures and optimizes maintenance',
        evidenceSupport: ['equipment_type'],
        estimatedCost: 'medium',
        implementation: 'Install vibration sensors, temperature monitors, and performance tracking systems'
      });
    }

    if (evidenceData.maintenance_history?.includes('overdue') || !evidenceData.last_maintenance_date) {
      recommendations.push({
        id: 'maintenance_schedule_update',
        type: 'preventive',
        priority: 'short_term',
        category: 'maintenance',
        description: 'Update and strictly follow preventive maintenance schedule',
        justification: 'Inadequate maintenance identified as contributing factor',
        evidenceSupport: ['maintenance_history', 'last_maintenance_date'],
        estimatedCost: 'low'
      });
    }

    return recommendations;
  }
}