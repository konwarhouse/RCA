/**
 * AI-Driven Hypothesis Generator - Universal RCA Instruction Step 2
 * 
 * Implements true AI-driven hypothesis generation using GPT as specified:
 * - Generate most likely POTENTIAL causes using GPT
 * - Use internal engineering knowledge (no preloaded templates)
 * - NO hardcoded mappings or dictionary-based logic
 * 
 * STRICT RULE: NO HARD CODING ANYWHERE - ZERO HARDCODING COMPLIANCE
 */

import { investigationStorage } from "./storage";
import { UniversalAIConfig } from "./universal-ai-config";

export interface AIHypothesis {
  id: string;
  failureMode: string;
  description: string;
  confidence: number;
  aiReasoning: string;
  requiredEvidence: string[];
  investigativeQuestions: string[];
  faultSignature: string;
  aiGenerated: true;
}

export interface AIHypothesisGenerationResult {
  hypotheses: AIHypothesis[];
  incidentAnalysis: {
    parsedSymptoms: string[];
    componentContext: string;
    operatingConditions: string[];
    severityAssessment: string;
  };
  generationMethod: "ai-driven";
  compliance: {
    noHardcoding: true;
    aiDriven: true;
    dynamicGeneration: true;
  };
}

export class AIHypothesisGenerator {
  
  /**
   * STEP 2: AI-DRIVEN HYPOTHESIS GENERATION (No Hardcoding)
   * 
   * AI generates most likely POTENTIAL causes using GPT internal engineering knowledge
   */
  static async generateAIHypotheses(incidentId: number): Promise<AIHypothesisGenerationResult> {
    console.log(`[AI HYPOTHESIS GENERATOR] Starting AI-driven hypothesis generation for incident ${incidentId}`);
    
    // Get incident data
    const incident = await investigationStorage.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }
    
    // STEP 1: NLP Context Extraction (as required by instruction)
    const incidentText = incident.symptomDescription || incident.description || '';
    const equipmentContext = `${incident.equipmentGroup || 'Unknown'} ${incident.equipmentType || 'Equipment'} ${incident.equipmentSubtype || ''}`.trim();
    
    console.log(`[AI HYPOTHESIS GENERATOR] Analyzing incident: "${incident.title}"`);
    console.log(`[AI HYPOTHESIS GENERATOR] Equipment context: ${equipmentContext}`);
    console.log(`[AI HYPOTHESIS GENERATOR] Symptom text: ${incidentText}`);
    
    // Get AI configuration dynamically (NO HARDCODING)
    const aiConfig = await this.getActiveAIConfiguration();
    if (!aiConfig) {
      throw new Error("AI provider not configured. Contact admin to set up AI configuration.");
    }
    
    // STEP 2: True AI-Driven Hypothesis Generation using GPT
    const hypotheses = await this.generateHypothesesWithAI(
      incidentText,
      equipmentContext,
      incident,
      aiConfig
    );
    
    // Parse incident symptoms using AI
    const incidentAnalysis = await this.analyzeIncidentContext(incidentText, equipmentContext, aiConfig);
    
    console.log(`[AI HYPOTHESIS GENERATOR] Generated ${hypotheses.length} AI-driven hypotheses`);
    
    return {
      hypotheses,
      incidentAnalysis,
      generationMethod: "ai-driven",
      compliance: {
        noHardcoding: true,
        aiDriven: true,
        dynamicGeneration: true
      }
    };
  }
  
  /**
   * Generate hypotheses using AI/GPT (NO preloaded templates or dictionaries)
   */
  private static async generateHypothesesWithAI(
    incidentText: string, 
    equipmentContext: string, 
    incident: any,
    aiConfig: any
  ): Promise<AIHypothesis[]> {
    
    const aiPrompt = `You are an expert industrial engineer performing root cause analysis. 

INCIDENT INFORMATION:
- Title: ${incident.title}
- Description: ${incidentText}
- Equipment: ${equipmentContext}
- Location: ${incident.location || 'Not specified'}
- Immediate Actions Taken: ${incident.immediateActions || 'None specified'}

TASK: Generate most likely POTENTIAL causes for this incident using your engineering knowledge.

For each hypothesis, provide:
1. Failure Mode Name (concise, technical)
2. Detailed Description (engineering explanation)
3. Confidence Level (0-100%)
4. AI Reasoning (why this is likely)
5. Required Evidence (specific data/measurements needed)
6. Investigation Questions (specific questions to ask)
7. Fault Signature (how this failure typically manifests)

RULES:
- Use your internal engineering knowledge
- No generic responses
- Focus on the specific symptoms described
- Consider the equipment type and operating context
- Provide actionable, specific hypotheses

Return your response as a JSON array with this structure:
[
  {
    "failureMode": "Technical failure mode name",
    "description": "Detailed engineering explanation",
    "confidence": 85,
    "aiReasoning": "Why this hypothesis fits the symptoms",
    "requiredEvidence": ["Specific evidence type 1", "Specific evidence type 2"],
    "investigativeQuestions": ["Specific question 1", "Specific question 2"],
    "faultSignature": "How this failure typically manifests"
  }
]`;

    try {
      // Create AI client dynamically
      const aiClient = await this.createAIClient(aiConfig);
      
      // Generate hypotheses using AI
      const response = await aiClient.chat.completions.create({
        model: aiConfig.model,
        messages: [
          {
            role: "system",
            content: "You are an expert industrial engineer. Respond only with valid JSON. No additional text or formatting."
          },
          {
            role: "user", 
            content: aiPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      
      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error("No AI response received");
      }
      
      // Parse AI response
      let aiHypotheses;
      try {
        // Clean response and parse JSON
        const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        aiHypotheses = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("[AI HYPOTHESIS GENERATOR] Failed to parse AI response:", aiResponse);
        throw new Error("AI response format invalid");
      }
      
      // Convert to AIHypothesis format
      return aiHypotheses.map((hypothesis: any, index: number) => ({
        id: `ai-hypothesis-${index + 1}-${UniversalAIConfig.generateTimestamp()}`,
        failureMode: hypothesis.failureMode,
        description: hypothesis.description,
        confidence: hypothesis.confidence,
        aiReasoning: hypothesis.aiReasoning,
        requiredEvidence: hypothesis.requiredEvidence || [],
        investigativeQuestions: hypothesis.investigativeQuestions || [],
        faultSignature: hypothesis.faultSignature,
        aiGenerated: true
      }));
      
    } catch (error) {
      console.error("[AI HYPOTHESIS GENERATOR] Error generating AI hypotheses:", error);
      throw new Error(`AI hypothesis generation failed: ${error.message}`);
    }
  }
  
  /**
   * Analyze incident context using AI
   */
  private static async analyzeIncidentContext(
    incidentText: string,
    equipmentContext: string, 
    aiConfig: any
  ) {
    const contextPrompt = `Analyze this industrial incident and extract key information:

INCIDENT: ${incidentText}
EQUIPMENT: ${equipmentContext}

Extract and return JSON with:
{
  "parsedSymptoms": ["symptom1", "symptom2"],
  "componentContext": "specific component involved",
  "operatingConditions": ["condition1", "condition2"], 
  "severityAssessment": "High/Medium/Low and reasoning"
}`;

    try {
      const aiClient = await this.createAIClient(aiConfig);
      
      const response = await aiClient.chat.completions.create({
        model: aiConfig.model,
        messages: [
          { role: "system", content: "You are an expert engineer. Respond only with valid JSON." },
          { role: "user", content: contextPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });
      
      const aiResponse = response.choices[0]?.message?.content;
      const cleanedResponse = aiResponse?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(cleanedResponse || '{}');
      
    } catch (error) {
      console.error("[AI HYPOTHESIS GENERATOR] Context analysis failed:", error);
      return {
        parsedSymptoms: [],
        componentContext: equipmentContext,
        operatingConditions: [],
        severityAssessment: "Medium - Analysis incomplete"
      };
    }
  }
  
  /**
   * Get active AI configuration (NO HARDCODING)
   */
  private static async getActiveAIConfiguration() {
    try {
      const aiSettings = await investigationStorage.getAllAiSettings();
      const activeConfig = aiSettings.find(config => config.isActive);
      
      if (!activeConfig) {
        console.error("[AI HYPOTHESIS GENERATOR] No active AI configuration found");
        return null;
      }
      
      return {
        provider: activeConfig.provider,
        model: activeConfig.model,
        apiKey: activeConfig.apiKey,
        isActive: activeConfig.isActive
      };
    } catch (error) {
      console.error("[AI HYPOTHESIS GENERATOR] Error getting AI configuration:", error);
      return null;
    }
  }
  
  /**
   * Create AI client dynamically based on configuration
   */
  private static async createAIClient(config: any) {
    if (config.provider === 'openai') {
      const { OpenAI } = await import('openai');
      return new OpenAI({
        apiKey: config.apiKey
      });
    }
    
    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}