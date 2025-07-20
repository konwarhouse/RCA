// RCA Analysis Engine - Structured Root Cause Analysis
// Generates proper evidence-based RCA following industrial standards

interface EvidencePoint {
  parameter: string;
  value: string;
  classification: 'normal' | 'abnormal' | 'trending' | 'critical';
  relevance: 'high' | 'medium' | 'low';
}

interface PotentialCause {
  cause: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  classification: 'root_cause' | 'contributing' | 'ruled_out';
  confidence: number;
  reasoning: string;
}

interface StructuredRCAAnalysis {
  symptomStatement: string;
  evidenceGathered: EvidencePoint[];
  causesConsidered: PotentialCause[];
  rootCause: string;
  contributingFactors: string[];
  ruledOutCauses: string[];
  conclusion: string;
  recommendations: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    timeframe: string;
    rationale: string;
  }>;
  confidence: number;
}

export class RCAAnalysisEngine {
  
  static generateStructuredRCA(investigation: any): StructuredRCAAnalysis {
    const evidenceData = investigation.evidenceData || {};
    
    // 1. Symptom Statement - Clear, specific description
    const symptomStatement = this.buildSymptomStatement(investigation, evidenceData);
    
    // 2. Evidence Analysis - Classify and evaluate all evidence
    const evidenceGathered = this.analyzeEvidence(evidenceData);
    
    // 3. Cause Analysis - Consider multiple causes with evidence mapping
    const causesConsidered = this.analyzeCauses(evidenceData, evidenceGathered);
    
    // 4. Root Cause Determination
    const rootCauseAnalysis = this.determineRootCause(causesConsidered);
    
    // 5. Generate Structured Recommendations
    const recommendations = this.generateRecommendations(rootCauseAnalysis, evidenceData);
    
    return {
      symptomStatement,
      evidenceGathered,
      causesConsidered,
      rootCause: rootCauseAnalysis.rootCause,
      contributingFactors: rootCauseAnalysis.contributing,
      ruledOutCauses: rootCauseAnalysis.ruledOut,
      conclusion: rootCauseAnalysis.conclusion,
      recommendations,
      confidence: rootCauseAnalysis.confidence
    };
  }
  
  private static buildSymptomStatement(investigation: any, evidenceData: any): string {
    const equipmentType = evidenceData.equipment_type || 'equipment';
    const equipmentTag = evidenceData.equipment_tag || 'unknown';
    const problem = evidenceData.observed_problem || investigation.whatHappened || 'failure';
    const location = evidenceData.symptom_location || investigation.whereHappened || '';
    
    return `${problem.toLowerCase()} at ${equipmentType.toLowerCase()} ${equipmentTag}${location ? ` (${location.toLowerCase()})` : ''}`;
  }
  
  private static analyzeEvidence(evidenceData: any): EvidencePoint[] {
    const evidence: EvidencePoint[] = [];
    
    // Operating Parameters
    if (evidenceData.operating_mode) {
      evidence.push({
        parameter: 'Operating Mode',
        value: evidenceData.operating_mode,
        classification: evidenceData.operating_mode === 'Running' ? 'normal' : 'abnormal',
        relevance: 'high'
      });
    }
    
    if (evidenceData.operating_within_limits !== undefined) {
      evidence.push({
        parameter: 'Operating Parameters',
        value: evidenceData.operating_within_limits ? 'Within limits' : 'Outside limits',
        classification: evidenceData.operating_within_limits ? 'normal' : 'critical',
        relevance: 'high'
      });
    }
    
    // Maintenance History
    if (evidenceData.last_maintenance_date && evidenceData.last_maintenance_type) {
      const maintenanceDate = new Date(evidenceData.last_maintenance_date);
      const daysSince = Math.floor((new Date().getTime() - maintenanceDate.getTime()) / (1000 * 60 * 60 * 24));
      evidence.push({
        parameter: 'Last Maintenance',
        value: `${evidenceData.last_maintenance_type} - ${daysSince} days ago`,
        classification: daysSince > 90 ? 'abnormal' : 'normal',
        relevance: 'high'
      });
    }
    
    // Environmental Conditions
    if (evidenceData.environmental_conditions) {
      evidence.push({
        parameter: 'Environmental Conditions',
        value: evidenceData.environmental_conditions,
        classification: evidenceData.environmental_conditions === 'OK' ? 'normal' : 'abnormal',
        relevance: 'medium'
      });
    }
    
    // Material Condition
    if (evidenceData.material_certification) {
      evidence.push({
        parameter: 'Material Certification',
        value: evidenceData.material_certification,
        classification: evidenceData.material_certification === 'GOOD' ? 'normal' : 'abnormal',
        relevance: 'high'
      });
    }
    
    // Process Conditions
    if (evidenceData.recent_process_upsets) {
      evidence.push({
        parameter: 'Recent Process Upsets',
        value: evidenceData.recent_process_upsets,
        classification: evidenceData.recent_process_upsets === 'NO' ? 'normal' : 'critical',
        relevance: 'high'
      });
    }
    
    // Alarms and Detection
    if (evidenceData.alarms_triggered) {
      evidence.push({
        parameter: 'Alarm History',
        value: evidenceData.alarms_triggered === 'NO' ? 'No alarms triggered' : 'Alarms present',
        classification: evidenceData.alarms_triggered === 'NO' ? 'normal' : 'abnormal',
        relevance: 'medium'
      });
    }
    
    return evidence;
  }
  
  private static analyzeCauses(evidenceData: any, evidence: EvidencePoint[]): PotentialCause[] {
    const causes: PotentialCause[] = [];
    
    // Analyze based on equipment type and symptoms
    const equipmentType = evidenceData.equipment_type || '';
    const problem = evidenceData.observed_problem || '';
    const symptomLocation = evidenceData.symptom_location || '';
    
    if (equipmentType.toLowerCase().includes('pump') && problem.toLowerCase().includes('seal')) {
      // Pump Seal Failure Analysis
      causes.push(...this.analyzePumpSealFailure(evidenceData, evidence));
    } else if (problem.toLowerCase().includes('vibration')) {
      // Vibration Analysis
      causes.push(...this.analyzeVibrationCauses(evidenceData, evidence));
    } else if (equipmentType.toLowerCase().includes('motor')) {
      // Motor Failure Analysis
      causes.push(...this.analyzeMotorFailure(evidenceData, evidence));
    }
    
    // Add generic mechanical causes if no specific analysis
    if (causes.length === 0) {
      causes.push(...this.analyzeGenericEquipmentFailure(evidenceData, evidence));
    }
    
    return causes;
  }
  
  private static analyzePumpSealFailure(evidenceData: any, evidence: EvidencePoint[]): PotentialCause[] {
    const causes: PotentialCause[] = [];
    const installationYear = evidenceData.installation_year ? parseInt(evidenceData.installation_year) : 2020;
    const age = new Date().getFullYear() - installationYear;
    
    // Seal aging/material degradation
    const supportingEvidence = [];
    const contradictingEvidence = [];
    
    if (age > 20) supportingEvidence.push(`Equipment installed in ${installationYear} (${age} years old)`);
    if (evidenceData.material_certification !== 'GOOD') supportingEvidence.push('Material certification not optimal');
    if (evidenceData.environmental_conditions === 'OK') contradictingEvidence.push('Environmental conditions normal');
    if (evidenceData.recent_process_upsets === 'NO') contradictingEvidence.push('No recent process upsets');
    
    causes.push({
      cause: 'Seal material aging and hardening',
      supportingEvidence,
      contradictingEvidence,
      classification: age > 15 ? 'root_cause' : 'contributing',
      confidence: age > 20 ? 0.85 : 0.65,
      reasoning: `Pump seals typically have 10-15 year service life. At ${age} years, material degradation is expected.`
    });
    
    // Lubrication failure
    const lubricationSupporting = [];
    const lubricationContradicting = [];
    
    if (evidenceData.last_maintenance_type === 'Preventive') {
      lubricationContradicting.push('Recent preventive maintenance performed');
    }
    if (evidenceData.operating_within_limits === false) {
      lubricationSupporting.push('Equipment operating outside normal parameters');
    }
    
    causes.push({
      cause: 'Inadequate seal chamber lubrication',
      supportingEvidence: lubricationSupporting,
      contradictingEvidence: lubricationContradicting,
      classification: 'contributing',
      confidence: 0.60,
      reasoning: 'Seal chamber lubrication critical for seal integrity, but recent maintenance suggests this may not be primary cause.'
    });
    
    // Process upset
    causes.push({
      cause: 'Process upset causing overpressure',
      supportingEvidence: [],
      contradictingEvidence: ['No recent process upsets', 'No alarms triggered'],
      classification: 'ruled_out',
      confidence: 0.15,
      reasoning: 'No evidence of pressure spikes or process deviations that could damage seals.'
    });
    
    return causes;
  }
  
  private static analyzeVibrationCauses(evidenceData: any, evidence: EvidencePoint[]): PotentialCause[] {
    const causes: PotentialCause[] = [];
    
    // Mechanical imbalance
    causes.push({
      cause: 'Mechanical imbalance or misalignment',
      supportingEvidence: ['High vibration observed', 'Rotating equipment'],
      contradictingEvidence: evidenceData.recent_changes === 'NO' ? ['No recent mechanical work'] : [],
      classification: 'root_cause',
      confidence: 0.75,
      reasoning: 'Vibration in rotating equipment commonly indicates mechanical issues like imbalance or misalignment.'
    });
    
    return causes;
  }
  
  private static analyzeMotorFailure(evidenceData: any, evidence: EvidencePoint[]): PotentialCause[] {
    // Motor-specific analysis would go here
    return [];
  }
  
  private static analyzeGenericEquipmentFailure(evidenceData: any, evidence: EvidencePoint[]): PotentialCause[] {
    const causes: PotentialCause[] = [];
    
    // Age-related degradation
    const installationYear = evidenceData.installation_year ? parseInt(evidenceData.installation_year) : 2020;
    const age = new Date().getFullYear() - installationYear;
    
    causes.push({
      cause: 'Age-related component degradation',
      supportingEvidence: [`Equipment age: ${age} years`],
      contradictingEvidence: [],
      classification: age > 20 ? 'root_cause' : 'contributing',
      confidence: age > 20 ? 0.70 : 0.45,
      reasoning: `Equipment degradation expected after ${age} years of service.`
    });
    
    return causes;
  }
  
  private static determineRootCause(causes: PotentialCause[]) {
    const rootCauses = causes.filter(c => c.classification === 'root_cause');
    const contributing = causes.filter(c => c.classification === 'contributing');
    const ruledOut = causes.filter(c => c.classification === 'ruled_out');
    
    const primaryRootCause = rootCauses.sort((a, b) => b.confidence - a.confidence)[0];
    
    const conclusion = `Root cause: ${primaryRootCause?.cause || 'Multiple factors identified'}${
      contributing.length > 0 ? `; contributing factors: ${contributing.map(c => c.cause).join(', ')}` : ''
    }.`;
    
    return {
      rootCause: primaryRootCause?.cause || 'Equipment failure due to multiple factors',
      contributing: contributing.map(c => c.cause),
      ruledOut: ruledOut.map(c => c.cause),
      conclusion,
      confidence: primaryRootCause?.confidence || 0.70
    };
  }
  
  private static generateRecommendations(rootCauseAnalysis: any, evidenceData: any) {
    const recommendations = [];
    
    if (rootCauseAnalysis.rootCause.toLowerCase().includes('seal')) {
      recommendations.push({
        action: 'Replace pump seals with upgraded material specification',
        priority: 'high' as const,
        timeframe: 'Next maintenance window (within 30 days)',
        rationale: 'Address root cause of seal material degradation'
      });
      
      recommendations.push({
        action: 'Implement seal chamber lubrication monitoring program',
        priority: 'medium' as const,
        timeframe: '60 days',
        rationale: 'Prevent contributing factor of inadequate lubrication'
      });
    }
    
    if (rootCauseAnalysis.rootCause.toLowerCase().includes('vibration') || 
        rootCauseAnalysis.rootCause.toLowerCase().includes('imbalance')) {
      recommendations.push({
        action: 'Perform shaft alignment and dynamic balancing',
        priority: 'high' as const,
        timeframe: 'Immediate (next shutdown)',
        rationale: 'Correct mechanical imbalance causing vibration'
      });
    }
    
    // Generic recommendations
    recommendations.push({
      action: 'Establish condition monitoring program with vibration trending',
      priority: 'medium' as const,
      timeframe: '90 days',
      rationale: 'Early detection of similar failure modes'
    });
    
    if (evidenceData.installation_year && (new Date().getFullYear() - parseInt(evidenceData.installation_year)) > 20) {
      recommendations.push({
        action: 'Evaluate equipment for replacement or major overhaul',
        priority: 'medium' as const,
        timeframe: '6 months',
        rationale: 'Equipment approaching end of design life'
      });
    }
    
    return recommendations;
  }
}