import { DataParser, ASSET_TYPES, SYMPTOM_PATTERNS } from './data-parser';

// Failure mode and effects analysis (FMEA) knowledge base
export const FAILURE_MODES = {
  pump: {
    seal_leak: {
      causes: ['seal_wear', 'dry_running', 'cavitation', 'misalignment', 'contamination'],
      symptoms: ['fluid_leak', 'low_pressure', 'noise'],
      evidence: ['seal_condition', 'operating_hours', 'vibration_data', 'process_conditions']
    },
    bearing_failure: {
      causes: ['inadequate_lubrication', 'overload', 'misalignment', 'contamination', 'fatigue'],
      symptoms: ['vibration', 'noise', 'overheating', 'metal_particles'],
      evidence: ['lubrication_analysis', 'vibration_trending', 'temperature_data', 'runtime_hours']
    },
    cavitation: {
      causes: ['insufficient_npsh', 'suction_restriction', 'vapor_pressure', 'flow_restriction'],
      symptoms: ['noise', 'vibration', 'erosion', 'performance_loss'],
      evidence: ['npsh_calculation', 'pressure_data', 'flow_measurements', 'impeller_condition']
    }
  },
  motor: {
    bearing_failure: {
      causes: ['lubrication_failure', 'overload', 'misalignment', 'contamination', 'electrical_stress'],
      symptoms: ['vibration', 'noise', 'overheating', 'current_fluctuation'],
      evidence: ['lubrication_condition', 'vibration_analysis', 'current_signature', 'temperature_trending']
    },
    winding_failure: {
      causes: ['overheating', 'insulation_breakdown', 'moisture', 'overvoltage', 'contamination'],
      symptoms: ['overheating', 'current_imbalance', 'ground_fault', 'reduced_torque'],
      evidence: ['insulation_resistance', 'winding_temperature', 'current_analysis', 'power_quality']
    },
    rotor_failure: {
      causes: ['thermal_cycling', 'mechanical_stress', 'electrical_stress', 'manufacturing_defect'],
      symptoms: ['vibration', 'current_fluctuation', 'speed_variation', 'torque_pulsation'],
      evidence: ['current_signature_analysis', 'vibration_spectrum', 'thermal_imaging', 'motor_testing']
    }
  },
  valve: {
    seat_leak: {
      causes: ['seat_wear', 'foreign_material', 'pressure_surge', 'thermal_cycling', 'corrosion'],
      symptoms: ['internal_leakage', 'pressure_drop', 'flow_deviation', 'noise'],
      evidence: ['leak_test_results', 'pressure_data', 'flow_measurements', 'valve_position']
    },
    actuator_failure: {
      causes: ['air_supply_loss', 'mechanical_wear', 'seal_failure', 'control_signal_loss'],
      symptoms: ['positioning_error', 'slow_response', 'hunting', 'failure_to_operate'],
      evidence: ['air_pressure', 'position_feedback', 'control_signal', 'mechanical_inspection']
    }
  }
};

// Cause-and-effect mapping with statistical weights
export const CAUSE_EFFECT_WEIGHTS = {
  pump: {
    seal_leak: {
      operating_hours: 0.8,     // High correlation
      vibration_level: 0.7,    // High correlation
      temperature: 0.6,        // Medium correlation
      pressure_spikes: 0.8,    // High correlation
      maintenance_overdue: 0.9 // Very high correlation
    },
    bearing_failure: {
      lubrication_condition: 0.9,
      vibration_trending: 0.85,
      operating_temperature: 0.8,
      runtime_hours: 0.7,
      alignment_condition: 0.8
    }
  },
  motor: {
    bearing_failure: {
      lubrication_analysis: 0.9,
      vibration_data: 0.85,
      temperature_data: 0.8,
      current_analysis: 0.6,
      environmental_conditions: 0.5
    },
    winding_failure: {
      insulation_resistance: 0.9,
      temperature_excursion: 0.85,
      voltage_stress: 0.8,
      moisture_exposure: 0.7,
      operating_hours: 0.6
    }
  }
};

export interface RCAAnalysis {
  assetInfo: {
    type: string;
    subtype?: string;
    id?: string;
    location?: string;
    criticality?: string;
  };
  symptomAnalysis: {
    primary: string;
    secondary: string[];
    location?: string;
    onset: 'sudden' | 'gradual' | 'intermittent';
    context: string;
  };
  causeAnalysis: {
    probableCauses: CauseAnalysis[];
    rootCause: string;
    contributingFactors: string[];
    confidence: number;
  };
  evidenceCorrelation: {
    supporting: EvidenceItem[];
    contradicting: EvidenceItem[];
    missing: string[];
  };
  recommendations: RecommendationItem[];
  reasoning: {
    stepByStep: string[];
    dataReferences: string[];
    confidenceFactors: string[];
  };
}

export interface CauseAnalysis {
  cause: string;
  probability: number;
  confidence: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  dataCorrelation: number;
}

export interface EvidenceItem {
  type: string;
  value: any;
  timestamp?: string;
  source: string;
  weight: number;
}

export interface RecommendationItem {
  action: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  category: 'repair' | 'maintenance' | 'monitoring' | 'investigation';
  estimatedCost?: string;
  timeframe: string;
}

export class RCAEngine {
  
  /**
   * Perform comprehensive RCA analysis
   */
  static async performAnalysis(
    parsedData: any,
    userInputs?: any,
    historicalData?: any
  ): Promise<RCAAnalysis> {
    
    // Step 1: Asset identification and context understanding
    const assetInfo = this.identifyAsset(parsedData, userInputs);
    
    // Step 2: Symptom analysis and localization
    const symptomAnalysis = this.analyzeSymptoms(parsedData, assetInfo);
    
    // Step 3: Generate probable causes using knowledge base
    const probableCauses = this.generateProbableCauses(assetInfo, symptomAnalysis);
    
    // Step 4: Correlate with available evidence
    const evidenceCorrelation = this.correlateEvidence(probableCauses, parsedData, historicalData);
    
    // Step 5: Calculate confidence scores and select root cause
    const causeAnalysis = this.analyzeCauses(probableCauses, evidenceCorrelation);
    
    // Step 6: Generate actionable recommendations
    const recommendations = this.generateRecommendations(causeAnalysis, assetInfo);
    
    // Step 7: Create reasoning explanation
    const reasoning = this.generateReasoning(assetInfo, symptomAnalysis, causeAnalysis, evidenceCorrelation);
    
    return {
      assetInfo,
      symptomAnalysis,
      causeAnalysis,
      evidenceCorrelation,
      recommendations,
      reasoning
    };
  }

  /**
   * Step 1: Asset identification and context understanding
   */
  private static identifyAsset(parsedData: any, userInputs?: any): any {
    const asset: any = {
      type: 'unknown',
      confidence: 0
    };

    // Priority 1: User-provided information
    if (userInputs?.equipmentType) {
      asset.type = userInputs.equipmentType;
      asset.confidence = 0.95;
    }

    // Priority 2: Extracted from data
    if (parsedData.equipment?.type) {
      asset.type = parsedData.equipment.type;
      asset.subtype = parsedData.equipment.subtype;
      asset.id = parsedData.equipment.id;
      asset.confidence = Math.max(asset.confidence, 0.8);
    }

    // Priority 3: Infer from work orders
    if (parsedData.workOrders?.length > 0) {
      const wo = parsedData.workOrders[0];
      if (wo.equipmentType) {
        asset.type = wo.equipmentType;
        asset.confidence = Math.max(asset.confidence, 0.7);
      }
      if (wo.equipmentId) {
        asset.id = wo.equipmentId;
      }
      if (wo.location) {
        asset.location = wo.location;
      }
    }

    // Determine criticality based on asset type and context
    asset.criticality = this.determineCriticality(asset.type, parsedData);

    return asset;
  }

  /**
   * Step 2: Symptom analysis and localization
   */
  private static analyzeSymptoms(parsedData: any, assetInfo: any): any {
    const symptoms: any = {
      primary: 'unknown',
      secondary: [],
      confidence: 0
    };

    // Analyze extracted symptoms
    if (parsedData.symptoms?.detected?.length > 0) {
      const detectedSymptoms = parsedData.symptoms.detected
        .sort((a: any, b: any) => b.confidence - a.confidence);
      
      symptoms.primary = detectedSymptoms[0].type;
      symptoms.secondary = detectedSymptoms.slice(1).map((s: any) => s.type);
      symptoms.location = parsedData.symptoms.location;
      symptoms.confidence = detectedSymptoms[0].confidence;
    }

    // Analyze work order descriptions
    if (parsedData.workOrders?.length > 0) {
      for (const wo of parsedData.workOrders) {
        const extractedSymptoms = this.extractSymptomsFromText(wo.description || wo.symptoms);
        if (extractedSymptoms.primary && symptoms.confidence < 0.8) {
          symptoms.primary = extractedSymptoms.primary;
          symptoms.secondary.push(...extractedSymptoms.secondary);
          symptoms.confidence = 0.8;
        }
      }
    }

    // Determine onset pattern
    symptoms.onset = this.determineOnsetPattern(parsedData);
    
    // Add context from maintenance history
    symptoms.context = this.buildSymptomContext(parsedData, assetInfo);

    return symptoms;
  }

  /**
   * Step 3: Generate probable causes using FMEA knowledge base
   */
  private static generateProbableCauses(assetInfo: any, symptomAnalysis: any): CauseAnalysis[] {
    const causes: CauseAnalysis[] = [];
    
    const assetFailureModes = FAILURE_MODES[assetInfo.type as keyof typeof FAILURE_MODES];
    if (!assetFailureModes) {
      return this.getGenericCauses(symptomAnalysis);
    }

    // Find failure modes that match the primary symptom
    for (const [failureMode, config] of Object.entries(assetFailureModes)) {
      const symptomMatch = config.symptoms.some((symptom: string) => 
        symptom.includes(symptomAnalysis.primary) || 
        symptomAnalysis.primary.includes(symptom)
      );

      if (symptomMatch) {
        // Generate cause analysis for each potential cause
        config.causes.forEach((cause: string) => {
          causes.push({
            cause,
            probability: this.calculateInitialProbability(cause, symptomAnalysis, assetInfo),
            confidence: 0.5, // Will be updated with evidence correlation
            supportingEvidence: [],
            contradictingEvidence: [],
            dataCorrelation: 0
          });
        });
      }
    }

    return causes.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Step 4: Correlate causes with available evidence
   */
  private static correlateEvidence(
    probableCauses: CauseAnalysis[], 
    parsedData: any, 
    historicalData?: any
  ): any {
    const evidence: any = {
      supporting: [],
      contradicting: [],
      missing: []
    };

    const availableData = this.catalogAvailableData(parsedData, historicalData);
    
    probableCauses.forEach(cause => {
      // Check for supporting evidence
      const supportingEvidence = this.findSupportingEvidence(cause.cause, availableData);
      const contradictingEvidence = this.findContradictingEvidence(cause.cause, availableData);
      
      cause.supportingEvidence = supportingEvidence.map(e => e.description);
      cause.contradictingEvidence = contradictingEvidence.map(e => e.description);
      
      evidence.supporting.push(...supportingEvidence);
      evidence.contradicting.push(...contradictingEvidence);
      
      // Calculate data correlation score
      cause.dataCorrelation = this.calculateDataCorrelation(cause.cause, availableData);
    });

    // Identify missing critical data
    evidence.missing = this.identifyMissingData(probableCauses, availableData);

    return evidence;
  }

  /**
   * Step 5: Analyze causes and determine root cause
   */
  private static analyzeCauses(probableCauses: CauseAnalysis[], evidenceCorrelation: any): any {
    // Update confidence scores based on evidence
    probableCauses.forEach(cause => {
      let confidenceScore = cause.probability;
      
      // Boost confidence for supporting evidence
      confidenceScore += cause.supportingEvidence.length * 0.1;
      
      // Reduce confidence for contradicting evidence
      confidenceScore -= cause.contradictingEvidence.length * 0.15;
      
      // Factor in data correlation
      confidenceScore += cause.dataCorrelation * 0.2;
      
      cause.confidence = Math.max(0.1, Math.min(0.99, confidenceScore));
    });

    // Sort by confidence and select root cause
    probableCauses.sort((a, b) => b.confidence - a.confidence);
    
    const rootCause = probableCauses[0];
    const contributingFactors = probableCauses
      .slice(1, 4)
      .filter(cause => cause.confidence > 0.3)
      .map(cause => cause.cause);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(probableCauses, evidenceCorrelation);

    return {
      probableCauses,
      rootCause: rootCause.cause,
      contributingFactors,
      confidence: overallConfidence
    };
  }

  /**
   * Step 6: Generate actionable recommendations
   */
  private static generateRecommendations(causeAnalysis: any, assetInfo: any): RecommendationItem[] {
    const recommendations: RecommendationItem[] = [];
    
    // Primary recommendation for root cause
    const rootCauseAction = this.getRootCauseAction(causeAnalysis.rootCause, assetInfo);
    if (rootCauseAction) {
      recommendations.push(rootCauseAction);
    }

    // Contributing factor recommendations
    causeAnalysis.contributingFactors.forEach((factor: string) => {
      const action = this.getContributingFactorAction(factor, assetInfo);
      if (action) {
        recommendations.push(action);
      }
    });

    // Monitoring recommendations based on confidence
    if (causeAnalysis.confidence < 0.8) {
      recommendations.push({
        action: "Implement enhanced monitoring to gather additional evidence",
        priority: 'high',
        category: 'monitoring',
        timeframe: "Immediate"
      });
    }

    // Preventive recommendations
    const preventiveActions = this.getPreventiveRecommendations(assetInfo, causeAnalysis);
    recommendations.push(...preventiveActions);

    return recommendations.sort((a, b) => {
      const priorityOrder = { immediate: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Step 7: Generate detailed reasoning explanation
   */
  private static generateReasoning(
    assetInfo: any, 
    symptomAnalysis: any, 
    causeAnalysis: any, 
    evidenceCorrelation: any
  ): any {
    const stepByStep = [
      `Equipment Analysis: ${assetInfo.type}${assetInfo.subtype ? ` (${assetInfo.subtype})` : ''} identified`,
      `Symptom Analysis: Primary symptom "${symptomAnalysis.primary}" with ${symptomAnalysis.onset} onset`,
      `Failure Mode Evaluation: ${causeAnalysis.probableCauses.length} potential causes evaluated`,
      `Evidence Correlation: ${evidenceCorrelation.supporting.length} supporting, ${evidenceCorrelation.contradicting.length} contradicting evidence points`,
      `Root Cause Selection: "${causeAnalysis.rootCause}" selected with ${Math.round(causeAnalysis.confidence * 100)}% confidence`
    ];

    const dataReferences = [
      ...evidenceCorrelation.supporting.map((e: any) => `Supporting: ${e.type} - ${e.description}`),
      ...evidenceCorrelation.contradicting.map((e: any) => `Contradicting: ${e.type} - ${e.description}`)
    ];

    const confidenceFactors = [
      `Equipment type identification: ${assetInfo.confidence > 0.8 ? 'High' : 'Medium'} confidence`,
      `Symptom clarity: ${symptomAnalysis.confidence > 0.7 ? 'Clear' : 'Unclear'} symptoms`,
      `Data availability: ${evidenceCorrelation.missing.length === 0 ? 'Complete' : 'Partial'} dataset`,
      `Historical correlation: ${causeAnalysis.probableCauses[0]?.dataCorrelation > 0.6 ? 'Strong' : 'Weak'} pattern match`
    ];

    return {
      stepByStep,
      dataReferences,
      confidenceFactors
    };
  }

  // Helper methods
  private static extractSymptomsFromText(text: string): any {
    // Implementation similar to DataParser.extractSymptoms
    return { primary: 'performance_issue', secondary: [] };
  }

  private static determineOnsetPattern(parsedData: any): 'sudden' | 'gradual' | 'intermittent' {
    // Analyze timestamps and descriptions to determine onset
    return 'gradual';
  }

  private static buildSymptomContext(parsedData: any, assetInfo: any): string {
    return `Equipment operating context and recent maintenance history`;
  }

  private static calculateInitialProbability(cause: string, symptomAnalysis: any, assetInfo: any): number {
    return 0.5; // Base probability, refined with evidence
  }

  private static getGenericCauses(symptomAnalysis: any): CauseAnalysis[] {
    return [
      {
        cause: 'maintenance_required',
        probability: 0.6,
        confidence: 0.4,
        supportingEvidence: [],
        contradictingEvidence: [],
        dataCorrelation: 0
      }
    ];
  }

  private static catalogAvailableData(parsedData: any, historicalData?: any): any {
    return {
      operating: parsedData.operatingData || [],
      maintenance: parsedData.maintenanceHistory || [],
      historical: historicalData || {},
      workOrders: parsedData.workOrders || []
    };
  }

  private static findSupportingEvidence(cause: string, availableData: any): any[] {
    return [];
  }

  private static findContradictingEvidence(cause: string, availableData: any): any[] {
    return [];
  }

  private static calculateDataCorrelation(cause: string, availableData: any): number {
    return 0.5;
  }

  private static identifyMissingData(probableCauses: CauseAnalysis[], availableData: any): string[] {
    return ['vibration_data', 'temperature_trending', 'lubrication_analysis'];
  }

  private static calculateOverallConfidence(probableCauses: CauseAnalysis[], evidenceCorrelation: any): number {
    if (probableCauses.length === 0) return 0.2;
    
    const topCauseConfidence = probableCauses[0].confidence;
    const evidenceQuality = evidenceCorrelation.supporting.length / 
      Math.max(1, evidenceCorrelation.supporting.length + evidenceCorrelation.missing.length);
    
    return Math.min(0.99, topCauseConfidence * 0.7 + evidenceQuality * 0.3);
  }

  private static determineCriticality(assetType: string, parsedData: any): string {
    // Determine based on asset type and context
    const criticalAssets = ['pump', 'compressor', 'turbine'];
    return criticalAssets.includes(assetType) ? 'high' : 'medium';
  }

  private static getRootCauseAction(rootCause: string, assetInfo: any): RecommendationItem | null {
    const actionMap: Record<string, RecommendationItem> = {
      seal_wear: {
        action: "Replace mechanical seal and inspect for wear patterns",
        priority: 'immediate',
        category: 'repair',
        timeframe: "Within 24 hours"
      },
      bearing_failure: {
        action: "Replace bearings and perform alignment check",
        priority: 'immediate',
        category: 'repair',
        timeframe: "Within 8 hours"
      },
      inadequate_lubrication: {
        action: "Replenish lubrication and establish proper maintenance schedule",
        priority: 'high',
        category: 'maintenance',
        timeframe: "Within 48 hours"
      }
    };

    return actionMap[rootCause] || null;
  }

  private static getContributingFactorAction(factor: string, assetInfo: any): RecommendationItem | null {
    return {
      action: `Address contributing factor: ${factor}`,
      priority: 'medium',
      category: 'maintenance',
      timeframe: "Within 1 week"
    };
  }

  private static getPreventiveRecommendations(assetInfo: any, causeAnalysis: any): RecommendationItem[] {
    return [
      {
        action: "Implement condition monitoring program",
        priority: 'medium',
        category: 'monitoring',
        timeframe: "Within 30 days"
      },
      {
        action: "Review and update maintenance procedures",
        priority: 'low',
        category: 'maintenance',
        timeframe: "Within 60 days"
      }
    ];
  }
}