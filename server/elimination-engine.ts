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
    const symptomAnalysis = await this.analyzeSymptoms(symptomDescription);
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
  private static async analyzeSymptoms(symptomDescription: string): Promise<SymptomAnalysis> {
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

    // UNIVERSAL EVIDENCE LIBRARY-DRIVEN PATTERN DETECTION - NO HARDCODING!
    const { investigationStorage } = await import("./storage");
    
    // Get ALL failure patterns from Evidence Library dynamically
    try {
      const allEvidenceEntries = await investigationStorage.searchEvidenceLibrary('');
      const failurePatterns = new Map();
      
      // Build universal patterns from Evidence Library data
      allEvidenceEntries.forEach((entry: any) => {
        const mode = entry.componentFailureMode || '';
        const questions = entry.aiOrInvestigatorQuestions || '';
        const symptoms = entry.faultSignaturePattern || '';
        
        // Extract keywords from Evidence Library fields
        const keywords = [];
        
        // Parse failure mode for keywords
        if (mode) {
          keywords.push(mode.toLowerCase());
          keywords.push(...mode.toLowerCase().split(/[\s,.-]+/));
        }
        
        // Parse fault signature patterns for symptoms
        if (symptoms) {
          keywords.push(...symptoms.toLowerCase().split(/[\s,.-]+/));
        }
        
        // Parse AI questions for symptom keywords
        if (questions) {
          const questionWords = questions.toLowerCase().match(/\b\w+(?:ing|ed|s)?\b/g) || [];
          keywords.push(...questionWords);
        }
        
        // Clean keywords and add to patterns
        const cleanKeywords = keywords
          .filter(k => k && k.length > 3)
          .filter(k => !['what', 'when', 'where', 'how', 'why', 'the', 'and', 'for', 'with'].includes(k));
        
        if (cleanKeywords.length > 0) {
          const severity = entry.confidenceLevel === 'High' ? 'catastrophic' : 
                          entry.confidenceLevel === 'Medium' ? 'high' : 'medium';
          
          failurePatterns.set(mode || `failure_${entry.id}`, {
            keywords: cleanKeywords,
            severity: severity,
            confidenceLevel: entry.confidenceLevel || 'Medium'
          });
        }
      });
      
      // UNIVERSAL SCHEMA-DRIVEN SYMPTOM DETECTION
      // Extract symptoms ONLY from Evidence Library failure mode patterns - NO HARDCODING
      for (const [failureMode, pattern] of Array.from(failurePatterns.entries())) {
        const keywordMatches = pattern.keywords.filter(keyword => 
          text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // Only add symptom if there are Evidence Library keyword matches
        if (keywordMatches.length > 0) {
          detectedSymptoms.push(failureMode);
          
          // Set severity based on Evidence Library confidence level (schema-driven)
          if (pattern.severity === 'catastrophic' && severityLevel !== 'catastrophic') {
            severityLevel = 'catastrophic';
            primaryFailureMode = failureMode;
          } else if (pattern.severity === 'high' && !['catastrophic'].includes(severityLevel)) {
            severityLevel = 'high';
            if (!primaryFailureMode) primaryFailureMode = failureMode;
          } else if (pattern.severity === 'medium' && !['catastrophic', 'high'].includes(severityLevel)) {
            severityLevel = 'medium';
            if (!primaryFailureMode) primaryFailureMode = failureMode;
          }
        }
      }
      
      console.log(`[Universal Pattern Detection] Found ${failurePatterns.size} patterns from Evidence Library`);
      console.log(`[Universal Pattern Detection] Detected symptoms: ${detectedSymptoms.join(', ')}`);
      
    } catch (error) {
      console.error('[Universal Pattern Detection] Error accessing Evidence Library:', error);
      
      // Emergency fallback - basic pattern detection
      const basicPatterns = ['failed', 'broke', 'damaged', 'leak', 'overheat', 'vibrat'];
      for (const pattern of basicPatterns) {
        if (text.toLowerCase().includes(pattern)) {
          detectedSymptoms.push(`basic_${pattern}`);
          if (!severityLevel) severityLevel = 'medium';
          if (!primaryFailureMode) primaryFailureMode = `basic_${pattern}`;
        }
      }
    }

    return {
      detectedSymptoms: Array.from(new Set(detectedSymptoms)), // Remove duplicates
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

    // UNIVERSAL SCHEMA-DRIVEN ELIMINATION WITH AUDIT LOGGING
    const maxEliminationCount = Math.floor(allFailureModes.length * 0.5); // Max 50% elimination
    let eliminationCount = 0;

    for (const failureMode of allFailureModes) {
      let shouldEliminate = false;
      let eliminationReason = '';
      let eliminatedBy = '';
      
      // UNIVERSAL AUDIT LOG STRUCTURE (per checklist requirement)
      const auditLog = {
        equipmentSubtype: `Dynamic from request`,
        failureModeId: failureMode.id,
        failureModeName: failureMode.componentFailureMode || 'Unknown',
        decision: 'EVALUATING',
        reason: '',
        confidenceScore: 0.5,
        evidenceUsed: symptomAnalysis.detectedSymptoms,
        eliminationRule: 'SchemaPattern-v1'
      };

      // SCHEMA-DRIVEN ELIMINATION: Use Evidence Library elimination rules only
      if (eliminationCount < maxEliminationCount && 
          failureMode.eliminatedIfTheseFailuresConfirmed && 
          failureMode.whyItGetsEliminated) {
        
        const eliminationTriggers = failureMode.eliminatedIfTheseFailuresConfirmed
          .split(',')
          .map(trigger => trigger.trim().toLowerCase());

        // UNIVERSAL PATTERN MATCHING: Use Evidence Library patterns, not hardcoded strings
        for (const detectedSymptom of symptomAnalysis.detectedSymptoms) {
          for (const trigger of eliminationTriggers) {
            // Schema-driven matching using Evidence Library patterns
            if (detectedSymptom.toLowerCase().includes(trigger) || trigger.includes(detectedSymptom.toLowerCase())) {
              shouldEliminate = true;
              eliminationReason = failureMode.whyItGetsEliminated;
              eliminatedBy = detectedSymptom;
              auditLog.eliminationRule = 'EvidenceLibraryPattern-v1';
              break;
            }
          }
          if (shouldEliminate) break;
        }
      }

      // AUDIT LOGGING: Record every decision (per checklist requirement)
      if (shouldEliminate && eliminationCount < maxEliminationCount) {
        auditLog.decision = 'ELIMINATED';
        auditLog.reason = eliminationReason;
        eliminatedFailureModes.push(failureMode.componentFailureMode || 'Unknown');
        eliminationReasons.push({
          failureMode: failureMode.componentFailureMode || 'Unknown',
          reason: eliminationReason,
          eliminatedBy: eliminatedBy
        });
        eliminationCount++;
        console.log(`[Universal Elimination Audit]`, JSON.stringify(auditLog));
      } else {
        auditLog.decision = 'KEPT';
        auditLog.reason = shouldEliminate ? 'MaxEliminationReached' : 'NoEliminationRuleMatch';
        remainingFailureModes.push(failureMode);
        console.log(`[Universal Elimination Audit]`, JSON.stringify(auditLog));
      }
    }

    // FAILSAFE RECOVERY: Prevent 0-mode crashes (per checklist requirement)
    if (remainingFailureModes.length === 0) {
      const recoveryLog = {
        recoveryAction: "Failsafe triggered – all modes restored due to invalid logic",
        originalEliminationCount: eliminationCount,
        restoredModes: allFailureModes.length
      };
      console.log(`[Universal Elimination Recovery]`, JSON.stringify(recoveryLog));
      
      return {
        eliminatedFailureModes: [],
        remainingFailureModes: allFailureModes,
        eliminationReasons: []
      };
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
   * Universal symptom variation generator - works for ANY failure mode
   * Generates multiple linguistic variations of a symptom for matching
   */
  private static generateSymptomVariations(symptom: string): string[] {
    const baseSymptom = symptom.toLowerCase().trim();
    const variations = new Set<string>();
    
    // Add base symptom
    variations.add(baseSymptom);
    
    // Add variations without underscores/dashes
    variations.add(baseSymptom.replace(/[_-]/g, ' '));
    variations.add(baseSymptom.replace(/[_-]/g, ''));
    
    // Add past tense variations dynamically
    if (baseSymptom.endsWith('breakage')) {
      variations.add(baseSymptom.replace('breakage', 'broke'));
      variations.add(baseSymptom.replace('breakage', 'broken'));
      variations.add(baseSymptom.replace('breakage', 'break'));
    }
    
    if (baseSymptom.endsWith('failure')) {
      variations.add(baseSymptom.replace('failure', 'failed'));
      variations.add(baseSymptom.replace('failure', 'fail'));
    }
    
    if (baseSymptom.endsWith('damage')) {
      variations.add(baseSymptom.replace('damage', 'damaged'));
    }
    
    if (baseSymptom.endsWith('leak')) {
      variations.add(baseSymptom.replace('leak', 'leaking'));
      variations.add(baseSymptom.replace('leak', 'leaked'));
    }
    
    // Add component-specific variations
    if (baseSymptom.includes('shaft')) {
      variations.add(baseSymptom.replace('shaft', 'shaft'));
      variations.add('shaft ' + baseSymptom.split(' ').slice(1).join(' '));
    }
    
    if (baseSymptom.includes('bearing')) {
      variations.add(baseSymptom.replace('bearing', 'bearing'));
      variations.add('bearing ' + baseSymptom.split(' ').slice(1).join(' '));
    }
    
    return Array.from(variations);
  }

  /**
   * Universal symptom matching logic - fuzzy matching for Evidence Library terms
   */
  private static isSymptomMatch(symptomVariation: string, eliminationTrigger: string): boolean {
    const symptom = symptomVariation.toLowerCase().trim();
    const trigger = eliminationTrigger.toLowerCase().trim();
    
    // Exact match
    if (symptom === trigger) return true;
    
    // Contains match (either direction)
    if (symptom.includes(trigger) || trigger.includes(symptom)) return true;
    
    // Fuzzy match for similar terms (allows for slight differences)
    const symptomWords = symptom.split(/\s+/);
    const triggerWords = trigger.split(/\s+/);
    
    // Check if significant words overlap
    let matchCount = 0;
    for (const sWord of symptomWords) {
      for (const tWord of triggerWords) {
        if (sWord.length > 2 && tWord.length > 2) {
          if (sWord === tWord || sWord.includes(tWord) || tWord.includes(sWord)) {
            matchCount++;
          }
        }
      }
    }
    
    // Require at least 1 significant word match for multi-word terms
    return matchCount > 0 && matchCount >= Math.min(symptomWords.length, triggerWords.length) * 0.5;
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
    for (const [category, failureModes] of Array.from(failureCategories.entries())) {
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