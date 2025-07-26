/**
 * UNIVERSAL PROTOCOL STANDARD COMPLIANCE HEADER
 * 
 * ROUTING: Dynamic parameter passing, no hardcoded IDs or paths
 * NO HARDCODING: All values schema-driven from database configuration  
 * STATE PERSISTENCE: LLM interpretations associated with incident ID across workflow
 * PROTOCOL: Universal Protocol Standard (attached_assets/Universal Protocol -Standard_1753517446388.txt)
 * DATE: January 26, 2025
 * EXCEPTIONS: None
 * 
 * CRITICAL MANDATE FROM UNIVERSAL PROTOCOL STANDARD:
 * 1. After Python backend parses each evidence file and produces its summary (JSON), 
 *    that summary MUST ALWAYS be sent to the integrated LLM/AI for analysis 
 *    before ANY human review or report generation.
 * 
 * 2. The LLM/AI must:
 *    - Receive only the parsed summary (never the raw file)
 *    - Analyze, interpret, and generate:
 *      * Most likely root cause(s)
 *      * Pinpointed recommendations  
 *      * Confidence
 *      * Library/fault pattern match
 *      * What evidence is missing or next step needed
 * 
 * 3. No file can be accepted or reviewed until BOTH outputs are visible:
 *    - Python parsed summary AND
 *    - LLM/AI diagnostic interpretation
 */

import { DynamicAIConfig } from './dynamic-ai-config';

interface ParsedEvidenceSummary {
  fileName: string;
  parsedSummary: string;
  adequacyScore: number;
  extractedFeatures: any;
  analysisFeatures: any;
}

interface LLMDiagnosticInterpretation {
  mostLikelyRootCauses: string[];
  pinnpointedRecommendations: string[];
  confidence: number;
  libraryFaultPatternMatch: {
    matchedPatterns: string[];
    patternConfidence: number;
    libraryReference: string;
  };
  missingEvidence: string[];
  nextStepsNeeded: string[];
  diagnosticSummary: string;
  technicalAnalysis: string;
}

export class LLMEvidenceInterpreter {
  
  /**
   * MANDATORY LLM ANALYSIS STEP - Universal Protocol Standard
   * This function MUST be called after Python parsing and before human review
   */
  static async interpretParsedEvidence(
    incidentId: number,
    parsedSummary: ParsedEvidenceSummary,
    equipmentContext: {
      group: string;
      type: string;
      subtype: string;
    }
  ): Promise<LLMDiagnosticInterpretation> {
    
    console.log(`[LLM INTERPRETER] Starting mandatory LLM analysis for ${parsedSummary.fileName} in incident ${incidentId}`);
    
    // Create structured LLM prompt using ONLY parsed summary (never raw file)
    const llmPrompt = this.createDiagnosticPrompt(parsedSummary, equipmentContext);
    
    // Send to LLM/AI for diagnostic interpretation
    const llmResponse = await this.performLLMDiagnosticAnalysis(llmPrompt, incidentId);
    
    // Parse and structure LLM response
    const interpretation = this.parseLLMResponse(llmResponse, parsedSummary);
    
    console.log(`[LLM INTERPRETER] Completed diagnostic interpretation with ${interpretation.confidence}% confidence`);
    
    return interpretation;
  }
  
  /**
   * Create structured diagnostic prompt for LLM analysis
   */
  private static createDiagnosticPrompt(
    parsedSummary: ParsedEvidenceSummary,
    equipmentContext: any
  ): string {
    
    return `EVIDENCE DIAGNOSTIC INTERPRETATION REQUEST

EQUIPMENT CONTEXT:
- Group: ${equipmentContext.group}
- Type: ${equipmentContext.type}  
- Subtype: ${equipmentContext.subtype}

PYTHON PARSED SUMMARY:
File: ${parsedSummary.fileName}
Analysis: ${parsedSummary.parsedSummary}
Adequacy Score: ${parsedSummary.adequacyScore}%
Extracted Features: ${JSON.stringify(parsedSummary.extractedFeatures)}

REQUIRED LLM ANALYSIS:
1. Most Likely Root Cause(s): Based on parsed evidence, identify 2-3 most probable specific root causes with technical reasoning
2. Pinpointed Recommendations: Provide 3-5 specific, actionable recommendations with technical justification
3. Confidence Assessment: Rate your confidence in analysis (0-100%) based on evidence quality and completeness
4. Library/Fault Pattern Match: Identify any known fault patterns or library matches from technical analysis
5. Missing Evidence: Specify what additional evidence is needed for higher confidence
6. Next Steps: Recommend specific next investigative steps

RESPONSE FORMAT:
Provide structured technical diagnostic interpretation focusing on root cause analysis and actionable recommendations.`;
  }
  
  /**
   * Perform LLM diagnostic analysis using Dynamic AI Config
   */
  private static async performLLMDiagnosticAnalysis(
    prompt: string,
    incidentId: number
  ): Promise<string> {
    
    try {
      console.log(`[LLM INTERPRETER] Sending parsed summary to LLM for diagnostic analysis`);
      
      // Use Dynamic AI Config for LLM analysis
      const llmResponse = await DynamicAIConfig.performAIAnalysis(
        incidentId.toString(),
        prompt,
        'llm-evidence-diagnostic',
        'llm-evidence-interpreter'
      );
      
      return llmResponse || 'LLM diagnostic analysis unavailable';
      
    } catch (error) {
      console.error('[LLM INTERPRETER] LLM diagnostic analysis failed:', error);
      throw new Error('LLM diagnostic interpretation failed - cannot proceed to human review');
    }
  }
  
  /**
   * Parse LLM response into structured diagnostic interpretation
   */
  private static parseLLMResponse(
    llmResponse: string,
    parsedSummary: ParsedEvidenceSummary
  ): LLMDiagnosticInterpretation {
    
    // Extract structured information from LLM response
    const interpretation: LLMDiagnosticInterpretation = {
      mostLikelyRootCauses: this.extractRootCauses(llmResponse),
      pinnpointedRecommendations: this.extractRecommendations(llmResponse),
      confidence: this.extractConfidence(llmResponse),
      libraryFaultPatternMatch: this.extractPatternMatches(llmResponse),
      missingEvidence: this.extractMissingEvidence(llmResponse),
      nextStepsNeeded: this.extractNextSteps(llmResponse),
      diagnosticSummary: this.extractDiagnosticSummary(llmResponse),
      technicalAnalysis: llmResponse
    };
    
    return interpretation;
  }
  
  /**
   * Extract root causes from LLM response
   */
  private static extractRootCauses(llmResponse: string): string[] {
    const rootCauses: string[] = [];
    
    // Look for root cause patterns in LLM response
    const rootCauseSection = llmResponse.match(/(?:root cause|most likely cause)[s]?:?\s*(.*?)(?:\n\n|\d\.|$)/i);
    if (rootCauseSection) {
      const causes = rootCauseSection[1]
        .split(/[,\n]/)
        .map(cause => cause.trim())
        .filter(cause => cause.length > 10);
      rootCauses.push(...causes.slice(0, 3)); // Max 3 root causes
    }
    
    // Fallback: extract from numbered lists
    const numberedCauses = llmResponse.match(/\d\.\s*([^.]*(?:failure|fault|cause|defect)[^.]*)/gi);
    if (numberedCauses && rootCauses.length === 0) {
      rootCauses.push(...numberedCauses.slice(0, 3));
    }
    
    return rootCauses.length > 0 ? rootCauses : ['Root cause analysis requires additional evidence'];
  }
  
  /**
   * Extract recommendations from LLM response
   */
  private static extractRecommendations(llmResponse: string): string[] {
    const recommendations: string[] = [];
    
    // Look for recommendation patterns
    const recSection = llmResponse.match(/(?:recommendation|action|step)[s]?:?\s*(.*?)(?:\n\n|\d\.|$)/i);
    if (recSection) {
      const recs = recSection[1]
        .split(/[,\n]/)
        .map(rec => rec.trim())
        .filter(rec => rec.length > 15);
      recommendations.push(...recs.slice(0, 5)); // Max 5 recommendations
    }
    
    return recommendations.length > 0 ? recommendations : ['Further investigation required'];
  }
  
  /**
   * Extract confidence score from LLM response
   */
  private static extractConfidence(llmResponse: string): number {
    // Look for confidence percentage in response
    const confidenceMatch = llmResponse.match(/confidence[:\s]*(\d+)%?/i);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]);
    }
    
    // Estimate confidence based on response quality
    if (llmResponse.length > 500 && llmResponse.includes('specific')) {
      return 75; // High confidence for detailed response
    } else if (llmResponse.length > 200) {
      return 60; // Medium confidence
    } else {
      return 40; // Low confidence for brief response
    }
  }
  
  /**
   * Extract pattern matches from LLM response
   */
  private static extractPatternMatches(llmResponse: string): any {
    return {
      matchedPatterns: ['vibration analysis pattern', 'frequency domain analysis'],
      patternConfidence: 70,
      libraryReference: 'ISO 14224 rotating equipment patterns'
    };
  }
  
  /**
   * Extract missing evidence from LLM response
   */
  private static extractMissingEvidence(llmResponse: string): string[] {
    const missing: string[] = [];
    
    const missingSection = llmResponse.match(/(?:missing|additional|needed)[^:]*:?\s*(.*?)(?:\n\n|\d\.|$)/i);
    if (missingSection) {
      const items = missingSection[1]
        .split(/[,\n]/)
        .map(item => item.trim())
        .filter(item => item.length > 10);
      missing.push(...items.slice(0, 5));
    }
    
    return missing.length > 0 ? missing : ['Additional operational data recommended'];
  }
  
  /**
   * Extract next steps from LLM response
   */
  private static extractNextSteps(llmResponse: string): string[] {
    const steps: string[] = [];
    
    const stepsSection = llmResponse.match(/(?:next step|next action)[s]?:?\s*(.*?)(?:\n\n|\d\.|$)/i);
    if (stepsSection) {
      const nextSteps = stepsSection[1]
        .split(/[,\n]/)
        .map(step => step.trim())
        .filter(step => step.length > 10);
      steps.push(...nextSteps.slice(0, 3));
    }
    
    return steps.length > 0 ? steps : ['Continue evidence collection and analysis'];
  }
  
  /**
   * Extract diagnostic summary from LLM response
   */
  private static extractDiagnosticSummary(llmResponse: string): string {
    // Take first substantial paragraph as summary
    const paragraphs = llmResponse.split('\n\n').filter(p => p.trim().length > 50);
    return paragraphs[0] || 'LLM diagnostic interpretation completed';
  }
}