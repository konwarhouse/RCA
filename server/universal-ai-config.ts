/**
 * UNIVERSAL PROTOCOL STANDARD COMPLIANCE HEADER
 * 
 * ROUTING: Path parameter style (/api/incidents/:id/endpoint)
 * NO HARDCODING: All values dynamic, config-driven
 * STATE PERSISTENCE: Data associated with incident ID across all stages
 * PROTOCOL: UNIVERSAL_PROTOCOL_STANDARD.md
 * DATE: January 26, 2025
 * EXCEPTIONS: None
 */

import { DatabaseInvestigationStorage } from './storage';

interface AIConfiguration {
  id: number;
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UniversalAIConfig {
  private static storage = new DatabaseInvestigationStorage();
  
  /**
   * Get active AI configuration with NO hardcoded fallbacks
   * CRITICAL: NO hardcoded API keys, models, or providers
   */
  static async getActiveConfiguration(): Promise<AIConfiguration | null> {
    try {
      const activeConfig = await this.storage.getActiveAiSettings();
      if (!activeConfig) {
        console.log('[UNIVERSAL AI CONFIG] No active AI configuration found - admin setup required');
        return null;
      }
      
      return {
        id: activeConfig.id,
        name: activeConfig.name,
        provider: activeConfig.provider,
        model: activeConfig.model,
        apiKey: activeConfig.apiKey,
        isActive: activeConfig.isActive,
        createdAt: activeConfig.createdAt,
        updatedAt: activeConfig.updatedAt
      };
      
    } catch (error) {
      console.error('[UNIVERSAL AI CONFIG] Failed to load configuration:', error);
      return null;
    }
  }
  
  /**
   * Get dynamic model name with NO hardcoded fallback
   */
  static async getDynamicModel(): Promise<string | null> {
    const config = await this.getActiveConfiguration();
    return config?.model || null;
  }
  
  /**
   * Get dynamic API key with NO hardcoded fallback
   */
  static async getDynamicApiKey(): Promise<string | null> {
    const config = await this.getActiveConfiguration();
    return config?.apiKey || null;
  }
  
  /**
   * Validate AI configuration completeness
   */
  static async validateConfiguration(): Promise<{ isValid: boolean; error?: string }> {
    const config = await this.getActiveConfiguration();
    
    if (!config) {
      return { isValid: false, error: 'No active AI configuration found' };
    }
    
    if (!config.apiKey || !config.model || !config.provider) {
      return { isValid: false, error: 'Incomplete AI configuration - missing required fields' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Create OpenAI client with dynamic configuration
   */
  static async createDynamicClient(): Promise<any | null> {
    const config = await this.getActiveConfiguration();
    if (!config) return null;
    
    try {
      const { OpenAI } = await import('openai');
      return new OpenAI({
        apiKey: config.apiKey
      });
    } catch (error) {
      console.error('[UNIVERSAL AI CONFIG] Failed to create OpenAI client:', error);
      return null;
    }
  }
  
  /**
   * Generate unique identifier without Date.now() hardcoding
   */
  static generateDynamicId(prefix: string = 'ai'): string {
    return `${prefix}_${crypto.randomUUID()}`;
  }
}