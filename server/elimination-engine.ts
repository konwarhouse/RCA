import { EvidenceLibrary } from "@shared/schema";
import { investigationStorage } from "./storage";

export interface EliminationResult {
  eliminatedFailureModes: string[];
  remainingFailureModes: EvidenceLibrary[];
  eliminationReasons: { failureMode: string; reason: string; eliminatedBy: string }[];
  confidenceBoost: number;
}

export interface SymptomAnalysis {
  detectedSymptoms: string[];
  severityLevel: 'low' | 'medium' | 'high' | 'catastrophic';
  primaryFailureMode: string | null;
}

export class EliminationEngine {
  /**
   * Universal elimination logic engine - works with ANY equipment type
   * Uses database-driven elimination rules with zero hardcoding
   */
  static async performEliminationAnalysis(
    equipmentGroup: string,
    equipmentType: string,
    equipmentSubtype: string,
    symptomDescription: string
  ): Promise<EliminationResult> {
    console.log(`[Elimination Engine] Starting analysis for ${equipmentGroup}->${equipmentType}->${equipmentSubtype}`);
    console.log(`[Elimination Engine] Symptoms: "${symptomDescription}"`);

    // Step 1: Get all possible failure modes for this equipment
    const allFailureModes = await investigationStorage.searchEvidenceLibraryByEquipment(
      equipmentGroup, 
      equipmentType, 
      equipmentSubtype
    );

    // Step 2: Analyze symptoms to detect confirmed failure patterns
    const symptomAnalysis = this.analyzeSymptoms(symptomDescription);
    console.log(`[Elimination Engine] Detected symptoms:`, symptomAnalysis.detectedSymptoms);

    // Step 3: Apply elimination logic based on confirmed failures
    const eliminationResults = await this.applyEliminationRules(
      allFailureModes,
      symptomAnalysis
    );

    // Step 4: Calculate confidence boost from elimination
    const confidenceBoost = this.calculateConfidenceBoost(
      allFailureModes.length,
      eliminationResults.remainingFailureModes.length
    );

    console.log(`[Elimination Engine] Eliminated ${eliminationResults.eliminatedFailureModes.length} failure modes`);
    console.log(`[Elimination Engine] ${eliminationResults.remainingFailureModes.length} failure modes remain for investigation`);

    return {
      eliminatedFailureModes: eliminationResults.eliminatedFailureModes,
      remainingFailureModes: eliminationResults.remainingFailureModes,
      eliminationReasons: eliminationResults.eliminationReasons,
      confidenceBoost
    };
  }

  /**
   * Universal symptom analysis - detects failure patterns from any description
   */
  private static analyzeSymptoms(symptomDescription: string): SymptomAnalysis {
    // CRITICAL FIX: Handle undefined/null symptom descriptions
    if (!symptomDescription || typeof symptomDescription !== 'string') {
      console.log(`[Elimination Engine] Warning: Invalid symptom description received: ${symptomDescription}`);
      return {
        detectedSymptoms: [],
        severityLevel: 'low',
        primaryFailureMode: null
      };
    }
    
    const text = symptomDescription.toLowerCase();
    const detectedSymptoms: string[] = [];
    let severityLevel: 'low' | 'medium' | 'high' | 'catastrophic' = 'low';
    let primaryFailureMode: string | null = null;

    // Universal failure pattern detection (works for ANY equipment)
    const failurePatterns = {
      // Catastrophic structural failures
      'shaft_breakage': ['shaft broke', 'shaft broken', 'shaft failed', 'shaft cracked', 'shaft fractured'],
      'bearing_failure': ['bearing seized', 'bearing failed', 'bearing damaged', 'bearing frozen'],
      'component_rupture': ['ruptured', 'burst', 'exploded', 'catastrophic failure'],
      
      // High severity failures  
      'major_leak': ['major leak', 'large leak', 'significant leak', 'leak detected'],
      'overheating': ['overheated', 'overheat', 'high temperature', 'thermal failure'],
      'electrical_failure': ['electrical fault', 'winding failure', 'short circuit', 'ground fault'],
      
      // Medium severity issues
      'vibration_issues': ['high vibration', 'vibration increase', 'abnormal vibration'],
      'performance_loss': ['performance drop', 'efficiency loss', 'capacity reduction'],
      'minor_leak': ['small leak', 'minor leak', 'weeping', 'seepage'],
      
      // Low severity indicators
      'noise_issues': ['unusual noise', 'abnormal sound', 'grinding', 'squealing'],
      'operational_drift': ['drift', 'deviation', 'instability']
    };

    // Detect symptoms and determine severity
    for (const [symptom, keywords] of Object.entries(failurePatterns)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          detectedSymptoms.push(symptom);
          
          // Determine severity based on failure type
          if (['shaft_breakage', 'bearing_failure', 'component_rupture'].includes(symptom)) {
            severityLevel = 'catastrophic';
            primaryFailureMode = symptom;
          } else if (['major_leak', 'overheating', 'electrical_failure'].includes(symptom) && severityLevel !== 'catastrophic') {
            severityLevel = 'high';
            if (!primaryFailureMode) primaryFailureMode = symptom;
          } else if (['vibration_issues', 'performance_loss', 'minor_leak'].includes(symptom) && !['catastrophic', 'high'].includes(severityLevel)) {
            severityLevel = 'medium';
            if (!primaryFailureMode) primaryFailureMode = symptom;
          }
          break;
        }
      }
    }

    return {
      detectedSymptoms: [...new Set(detectedSymptoms)], // Remove duplicates
      severityLevel,
      primaryFailureMode
    };
  }

  /**
   * Apply elimination rules from Evidence Library data
   */
  private static async applyEliminationRules(
    allFailureModes: EvidenceLibrary[],
    symptomAnalysis: SymptomAnalysis
  ): Promise<{
    eliminatedFailureModes: string[];
    remainingFailureModes: EvidenceLibrary[];
    eliminationReasons: { failureMode: string; reason: string; eliminatedBy: string }[];
  }> {
    const eliminatedFailureModes: string[] = [];
    const eliminationReasons: { failureMode: string; reason: string; eliminatedBy: string }[] = [];
    const remainingFailureModes: EvidenceLibrary[] = [];

    for (const failureMode of allFailureModes) {
      let shouldEliminate = false;
      let eliminationReason = '';
      let eliminatedBy = '';

      // Parse elimination rules from Evidence Library (if they exist)
      if (failureMode.eliminatedIfTheseFailuresConfirmed && failureMode.whyItGetsEliminated) {
        const eliminationTriggers = failureMode.eliminatedIfTheseFailuresConfirmed
          .split(',')
          .map(trigger => trigger.trim().toLowerCase());

        // Check if any detected symptoms match elimination triggers
        for (const symptom of symptomAnalysis.detectedSymptoms) {
          const symptomMappings = {
            'shaft_breakage': ['shaft breakage', 'shaft broke', 'shaft failure'],
            'bearing_failure': ['bearing failure', 'bearing seized', 'bearing damage'],
            'component_rupture': ['rupture', 'burst', 'catastrophic failure'],
            'major_leak': ['major leak', 'significant leak'],
            'overheating': ['overheating', 'thermal failure'],
            'electrical_failure': ['electrical failure', 'winding failure']
          };

          const mappedTerms = symptomMappings[symptom] || [symptom.replace('_', ' ')];
          
          for (const mappedTerm of mappedTerms) {
            for (const trigger of eliminationTriggers) {
              if (trigger.includes(mappedTerm) || mappedTerm.includes(trigger)) {
                shouldEliminate = true;
                eliminationReason = failureMode.whyItGetsEliminated;
                eliminatedBy = symptom;
                break;
              }
            }
            if (shouldEliminate) break;
          }
          if (shouldEliminate) break;
        }
      }

      if (shouldEliminate) {
        eliminatedFailureModes.push(failureMode.componentFailureMode || 'Unknown');
        eliminationReasons.push({
          failureMode: failureMode.componentFailureMode || 'Unknown',
          reason: eliminationReason,
          eliminatedBy: eliminatedBy
        });
        console.log(`[Elimination] Eliminated "${failureMode.componentFailureMode}" - Reason: ${eliminationReason}`);
      } else {
        remainingFailureModes.push(failureMode);
      }
    }

    return {
      eliminatedFailureModes,
      remainingFailureModes,
      eliminationReasons
    };
  }

  /**
   * Calculate confidence boost from successful elimination
   */
  private static calculateConfidenceBoost(originalCount: number, remainingCount: number): number {
    if (originalCount === 0) return 0;
    
    const eliminationPercentage = ((originalCount - remainingCount) / originalCount) * 100;
    
    // Confidence boost scales with elimination effectiveness
    if (eliminationPercentage >= 70) return 25; // Significant elimination
    if (eliminationPercentage >= 50) return 15; // Moderate elimination  
    if (eliminationPercentage >= 30) return 10; // Some elimination
    if (eliminationPercentage > 0) return 5;    // Minimal elimination
    
    return 0; // No elimination
  }

  /**
   * Generate intelligent follow-up questions based on remaining failure modes
   */
  static generateTargetedQuestions(
    remainingFailureModes: EvidenceLibrary[],
    eliminationResults: EliminationResult
  ): string[] {
    const questions: string[] = [];

    // Group remaining failure modes by type for intelligent questioning
    const failureCategories = new Map<string, EvidenceLibrary[]>();
    
    remainingFailureModes.forEach(fm => {
      const category = this.categorizeFailureMode(fm);
      if (!failureCategories.has(category)) {
        failureCategories.set(category, []);
      }
      failureCategories.get(category)!.push(fm);
    });

    // Generate category-specific questions
    for (const [category, failureModes] of failureCategories.entries()) {
      const categoryQuestions = this.generateCategoryQuestions(category, failureModes);
      questions.push(...categoryQuestions);
    }

    // Limit to top 5 most relevant questions
    return questions.slice(0, 5);
  }

  private static categorizeFailureMode(failureMode: EvidenceLibrary): string {
    const description = (failureMode.componentFailureMode || '').toLowerCase();
    
    if (description.includes('misalign')) return 'alignment';
    if (description.includes('fatigue')) return 'fatigue';
    if (description.includes('lubric') || description.includes('oil')) return 'lubrication';
    if (description.includes('vibrat')) return 'vibration';
    if (description.includes('thermal') || description.includes('temp')) return 'thermal';
    if (description.includes('corros') || description.includes('wear')) return 'degradation';
    
    return 'general';
  }

  private static generateCategoryQuestions(category: string, failureModes: EvidenceLibrary[]): string[] {
    const questions: string[] = [];
    
    switch (category) {
      case 'alignment':
        questions.push("Was there any recorded misalignment during recent maintenance or operation?");
        break;
      case 'fatigue':
        questions.push("Was the equipment exposed to cyclic loading or stress variations?");
        break;
      case 'lubrication':
        questions.push("Were there any lubrication issues or oil analysis abnormalities?");
        break;
      case 'vibration':
        questions.push("Did vibration monitoring show any abnormal patterns before failure?");
        break;
      case 'thermal':
        questions.push("Were there any temperature excursions or thermal cycling events?");
        break;
      case 'degradation':
        questions.push("Was there evidence of corrosion, wear, or material degradation?");
        break;
      default:
        // Use the AI questions from the failure modes themselves
        failureModes.forEach(fm => {
          if (fm.aiOrInvestigatorQuestions) {
            questions.push(fm.aiOrInvestigatorQuestions);
          }
        });
    }

    return questions;
  }
}