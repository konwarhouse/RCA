/**
 * DYNAMIC AI CONFIGURATION SYSTEM
 * 
 * CRITICAL ENFORCEMENT: ABSOLUTE NO HARDCODING
 * - NO hardcoded API keys, provider names, or model selections
 * - ALL AI configuration loaded dynamically from database settings
 * - Secure, auditable, and universally configurable
 */

import { DatabaseInvestigationStorage } from './storage';

// Add missing method to storage interface if needed
declare module './storage' {
  interface IStorage {
    getAISettings(): Promise<any[]>;
  }
}

interface AIProviderConfig {
  id: number;
  provider: string;
  model: string;
  apiKey: string;
  isActive: boolean;
  isTestSuccessful: boolean;
}

interface AIAuditLog {
  incidentID: string;
  usedProvider: string;
  model: string;
  apiSource: string;
  invokedBy: string;
  timestamp: string;
}

export class DynamicAIConfig {
  private static storage = new DatabaseInvestigationStorage();
  
  /**
   * Gets active AI provider configuration from database
   * ABSOLUTE NO HARDCODING - all config from AI Settings
   */
  static async getActiveAIProvider(): Promise<AIProviderConfig | null> {
    try {
      console.log('[Dynamic AI Config] Loading AI provider from database settings');
      
      // Get AI settings from database (NOT hardcoded)
      const aiSettings = await this.storage.getAllAiSettings();
      
      // Find active provider
      const activeProvider = aiSettings.find((setting: any) => setting.isActive);
      
      if (!activeProvider) {
        console.warn('[Dynamic AI Config] No active AI provider configured');
        return null;
      }
      
      console.log(`[Dynamic AI Config] Active provider: ${activeProvider.provider} (${activeProvider.model})`);
      
      return {
        id: activeProvider.id,
        provider: activeProvider.provider,
        model: activeProvider.model,
        apiKey: activeProvider.apiKey,
        isActive: activeProvider.isActive,
        isTestSuccessful: activeProvider.isTestSuccessful
      };
      
    } catch (error) {
      console.error('[Dynamic AI Config] Failed to load AI provider:', error);
      return null;
    }
  }
  
  /**
   * Validates AI provider configuration
   */
  static async validateAIProvider(config: AIProviderConfig): Promise<boolean> {
    if (!config) {
      console.error('[Dynamic AI Config] AI provider not configured');
      return false;
    }
    
    if (!config.apiKey) {
      console.error('[Dynamic AI Config] API key not configured for provider:', config.provider);
      return false;
    }
    
    if (!config.isActive) {
      console.error('[Dynamic AI Config] AI provider is not active:', config.provider);
      return false;
    }
    
    return true;
  }
  
  /**
   * Creates AI client instance based on dynamic configuration
   */
  static async createAIClient(config: AIProviderConfig): Promise<any> {
    try {
      console.log(`[Dynamic AI Config] Creating ${config.provider} client with model ${config.model}`);
      
      // Dynamic import based on provider (NO HARDCODING)
      if (config.provider.toLowerCase() === 'openai') {
        const { OpenAI } = await import('openai');
        return new OpenAI({
          apiKey: config.apiKey
        });
      }
      
      // Future providers can be added here dynamically
      throw new Error(`Unsupported AI provider: ${config.provider}`);
      
    } catch (error) {
      console.error('[Dynamic AI Config] Failed to create AI client:', error);
      throw error;
    }
  }
  
  /**
   * Logs AI usage for audit trail
   */
  static async logAIUsage(auditLog: AIAuditLog): Promise<void> {
    try {
      console.log(`[Dynamic AI Config] Audit: ${auditLog.usedProvider} used for incident ${auditLog.incidentID}`);
      
      // Store audit log in database
      // This could be expanded to a dedicated audit table
      console.log(JSON.stringify(auditLog, null, 2));
      
    } catch (error) {
      console.error('[Dynamic AI Config] Failed to log AI usage:', error);
    }
  }
  
  /**
   * Performs AI analysis with dynamic configuration
   */
  static async performAIAnalysis(
    incidentId: string,
    prompt: string,
    analysisType: string,
    invokedBy: string = 'system'
  ): Promise<string> {
    
    // Step 1: Get active AI provider from database
    const aiProvider = await this.getActiveAIProvider();
    
    if (!aiProvider) {
      throw new Error('AI provider not configured. Please configure an AI provider in admin settings to enable analysis.');
    }
    
    if (!this.validateAIProvider(aiProvider)) {
      throw new Error('AI provider configuration invalid. Please verify API key and provider settings in admin section.');
    }
    
    // Step 2: Create AI client dynamically
    const aiClient = await this.createAIClient(aiProvider);
    
    // Step 3: Perform AI analysis
    const startTime = Date.now();
    
    try {
      console.log(`[Dynamic AI Config] Starting ${analysisType} analysis using ${aiProvider.provider}`);
      
      const response = await aiClient.chat.completions.create({
        model: aiProvider.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert industrial engineer performing root cause analysis. Provide technical, evidence-based analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });
      
      const analysisResult = response.choices[0]?.message?.content || 'No analysis generated';
      
      // Step 4: Log AI usage for audit
      await this.logAIUsage({
        incidentID: incidentId,
        usedProvider: aiProvider.provider,
        model: aiProvider.model,
        apiSource: 'dynamic',
        invokedBy: invokedBy,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[Dynamic AI Config] ${analysisType} completed in ${Date.now() - startTime}ms`);
      
      return analysisResult;
      
    } catch (error: any) {
      console.error(`[Dynamic AI Config] ${analysisType} failed:`, error);
      
      // Provide specific error messages for admin configuration
      if (error.code === 'invalid_api_key') {
        throw new Error(`AI ${analysisType} failed - Invalid API key. Please update the API key in admin settings.`);
      } else if (error.code === 'insufficient_quota') {
        throw new Error(`AI ${analysisType} failed - API quota exceeded. Please check API limits in admin settings.`);
      } else if (error.code === 'rate_limit_exceeded') {
        throw new Error(`AI ${analysisType} temporarily unavailable - Rate limit exceeded. Please try again later.`);
      } else if (error.message && error.message.includes('AI provider not configured')) {
        throw error; // Pass through configuration errors
      } else {
        throw new Error(`AI ${analysisType} temporarily unavailable - Please verify AI provider configuration in admin settings.`);
      }
    }
  }
  
  /**
   * Performs failure cause inference with dynamic AI configuration
   */
  static async inferFailureCauses(
    incidentId: string,
    incidentDescription: string,
    equipmentContext: string,
    evidenceLibrary: any[]
  ): Promise<any[]> {
    
    const prompt = `
INDUSTRIAL ROOT CAUSE ANALYSIS - FAILURE CAUSE INFERENCE

Incident: ${incidentDescription}
Equipment Context: ${equipmentContext}

Based on the incident description and equipment context, infer the most probable failure causes using engineering analysis principles.

For each inferred cause, provide:
1. Cause name (specific technical failure mode)
2. Description (detailed technical explanation)  
3. Confidence level (0-100%)
4. Technical reasoning (engineering justification)

Focus on PRIMARY failure causes, not secondary effects.

Respond in JSON format:
{
  "inferredCauses": [
    {
      "causeName": "Technical failure mode name",
      "description": "Detailed technical description",
      "aiConfidence": 85,
      "technicalReasoning": "Engineering justification for this cause"
    }
  ]
}
`;

    try {
      const analysisResult = await this.performAIAnalysis(
        incidentId,
        prompt,
        'Failure Cause Inference',
        'system'
      );
      
      // Parse AI response
      const parsedResult = JSON.parse(analysisResult);
      return parsedResult.inferredCauses || [];
      
    } catch (error) {
      console.error('[Dynamic AI Config] Failure cause inference failed:', error);
      return [];
    }
  }
}