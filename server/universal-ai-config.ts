/**
 * Protocol: Universal Protocol Standard v1.0
 * Routing Style: Path param only (no mixed mode)
 * Last Reviewed: 2025-07-26
 * Purpose: Universal AI Configuration - ZERO HARDCODING POLICY
 * 🚨 MANDATORY LLM API KEY SECURITY CHECK EMBEDDED
 */

import * as crypto from "crypto";
import { validateLLMSecurity } from './llm-security-validator';

export const UniversalAIConfig = {
  // Dynamic model selection - NO HARDCODING
  getModelName: (): string => {
    return process.env.AI_MODEL || "gpt-4o";
  },

  // Universal timestamp generation - NO Date.now() hardcoding
  generateTimestamp: (): string => {
    return new Date().toISOString();
  },

  // Universal UUID provider - NO Math.random() hardcoding
  generateUUID: (): string => {
    return crypto.randomUUID();
  },

  // 🚨 MANDATORY LLM API KEY SECURITY CHECK - Dynamic API key retrieval
  getAPIKey: (): string => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    // 🔒 MANDATORY SECURITY VALIDATION
    validateLLMSecurity(apiKey, 'openai', 'universal-ai-config.ts');
    
    if (!apiKey) {
      throw new Error('❌ LLM API key not configured. Please check your server environment.');
    }
    
    return apiKey;
  },

  // Universal file path generation - NO hardcoded paths
  generateFilePath: (incidentId: string, filename: string): string => {
    const uuid = crypto.randomUUID();
    return `${incidentId}/evidence_files/${uuid}_${filename}`;
  },

  // Performance timing - NO Date.now() hardcoding
  getPerformanceTime: (): number => {
    return performance.now();
  }
};

// Export individual functions for backwards compatibility
export const { 
  getModelName, 
  generateTimestamp, 
  generateUUID, 
  getAPIKey, 
  generateFilePath, 
  getPerformanceTime 
} = UniversalAIConfig;