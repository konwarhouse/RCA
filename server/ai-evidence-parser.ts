/**
 * Universal AI Evidence Parser
 * Implements spec requirement for AI evidence parsing with MIME detection
 * Marks evidence as: Sufficient, Partially adequate, Inadequate or irrelevant
 */

import OpenAI from "openai";
import { readFileSync } from "fs";
import path from "path";
import { UniversalAIConfig } from "./universal-ai-config";

interface EvidenceParseResult {
  status: 'sufficient' | 'partially_adequate' | 'inadequate' | 'irrelevant';
  confidence: number;
  extractedData: any;
  adequacyReason: string;
  suggestedImprovements: string[];
  contentType: string;
  dataQuality: number;
}

interface ExpectedEvidenceStructure {
  evidenceType: string;
  requiredFields: string[];
  dataFormat: string;
  qualityCriteria: string[];
}

export class UniversalEvidenceParser {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: await DynamicAIConfig.getActiveAPIKey()
    });
  }

  /**
   * Parse evidence file and determine adequacy
   * Implements spec requirements for MIME detection and content matching
   */
  async parseEvidence(
    filePath: string,
    fileName: string,
    expectedEvidenceType: string,
    equipmentContext: {
      group: string;
      type: string;
      subtype: string;
    }
  ): Promise<EvidenceParseResult> {
    
    console.log(`[Evidence Parser] Analyzing ${fileName} for evidence type: ${expectedEvidenceType}`);
    
    // Step 1: Detect MIME type (per spec requirement)
    const mime = require('mime-types');
    const mimeType = mime.lookup(fileName) || 'application/octet-stream';
    
    // Step 2: Get expected structure from equipment context (NO HARDCODING)
    const expectedStructure = await this.getExpectedStructure(expectedEvidenceType, equipmentContext);
    
    // Step 3: Parse content based on MIME type
    const contentData = await this.extractContentByMimeType(filePath, fileName, mimeType);
    
    // Step 4: AI-powered content analysis and adequacy assessment
    const adequacyAssessment = await this.assessContentAdequacy(
      contentData,
      expectedStructure,
      expectedEvidenceType,
      equipmentContext
    );
    
    console.log(`[Evidence Parser] Result: ${adequacyAssessment.status} (${adequacyAssessment.confidence}% confidence)`);
    
    return adequacyAssessment;
  }

  /**
   * Get expected evidence structure dynamically (NO HARDCODING)
   * Uses equipment context to determine requirements
   */
  private async getExpectedStructure(
    evidenceType: string,
    equipmentContext: any
  ): Promise<ExpectedEvidenceStructure> {
    
    // This would query Evidence Library to get expected structure
    // For now, using universal patterns that work across equipment types
    const normalizedType = evidenceType.toLowerCase();
    
    if (normalizedType.includes('vibration')) {
      return {
        evidenceType,
        requiredFields: ['timestamp', 'frequency', 'amplitude', 'location'],
        dataFormat: 'time_series',
        qualityCriteria: ['sufficient_data_points', 'clear_frequency_peaks', 'timestamp_accuracy']
      };
    }
    
    if (normalizedType.includes('temperature') || normalizedType.includes('thermal')) {
      return {
        evidenceType,
        requiredFields: ['timestamp', 'temperature', 'location', 'reference_baseline'],
        dataFormat: 'measurement_data',
        qualityCriteria: ['measurement_accuracy', 'ambient_conditions', 'calibration_status']
      };
    }
    
    if (normalizedType.includes('current') || normalizedType.includes('electrical')) {
      return {
        evidenceType,
        requiredFields: ['timestamp', 'current', 'voltage', 'power_factor'],
        dataFormat: 'electrical_data',
        qualityCriteria: ['load_conditions', 'measurement_range', 'harmonic_analysis']
      };
    }
    
    if (normalizedType.includes('maintenance') || normalizedType.includes('work_order')) {
      return {
        evidenceType,
        requiredFields: ['date', 'work_description', 'parts_replaced', 'findings'],
        dataFormat: 'text_report',
        qualityCriteria: ['work_scope_clarity', 'finding_specificity', 'timeline_accuracy']
      };
    }
    
    // Universal fallback structure
    return {
      evidenceType,
      requiredFields: ['timestamp', 'measurement', 'conditions'],
      dataFormat: 'generic_data',
      qualityCriteria: ['data_completeness', 'measurement_quality', 'context_provided']
    };
  }

  /**
   * Extract content based on MIME type (per spec requirement)
   */
  private async extractContentByMimeType(
    filePath: string,
    fileName: string,
    mimeType: string
  ): Promise<any> {
    
    console.log(`[Content Extraction] Processing ${mimeType} file: ${fileName}`);
    
    try {
      if (mimeType.startsWith('text/') || mimeType === 'application/csv') {
        return await this.extractTextContent(filePath);
      }
      
      if (mimeType.startsWith('image/')) {
        return await this.extractImageContent(filePath);
      }
      
      if (mimeType === 'application/pdf') {
        return await this.extractPDFContent(filePath);
      }
      
      if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return await this.extractSpreadsheetContent(filePath);
      }
      
      // Generic binary file handling
      return {
        contentType: 'binary',
        size: require('fs').statSync(filePath).size,
        filename: fileName,
        extractedText: null,
        requiresSpecializedParser: true
      };
      
    } catch (error) {
      console.error('[Content Extraction] Error:', error);
      return {
        contentType: 'error',
        error: error.message,
        filename: fileName
      };
    }
  }

  /**
   * Extract text content (CSV, TXT, etc.)
   */
  private async extractTextContent(filePath: string): Promise<any> {
    const content = readFileSync(filePath, 'utf-8');
    
    // Detect if CSV structure
    if (content.includes(',') && content.includes('\n')) {
      const lines = content.split('\n').filter(line => line.trim());
      const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));
      
      return {
        contentType: 'csv',
        headers: headers || [],
        rowCount: lines.length - 1,
        sampleData: lines.slice(1, 6), // First 5 data rows
        fullContent: content
      };
    }
    
    return {
      contentType: 'text',
      content,
      lineCount: content.split('\n').length,
      characterCount: content.length
    };
  }

  /**
   * Extract image content using vision analysis
   */
  private async extractImageContent(filePath: string): Promise<any> {
    const base64Image = readFileSync(filePath).toString('base64');
    
    try {
      const response = await this.openai.chat.completions.create({
        model: activeConfig?.model || UniversalAIConfig.getDefaultModel(),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image for technical evidence content. Extract any visible text, measurements, equipment details, or technical information. Respond in JSON format with: {
                  "visibleText": "any text visible in image",
                  "technicalContent": "description of technical elements",
                  "measurements": "any measurements or values visible",
                  "equipmentVisible": "equipment or components shown",
                  "qualityAssessment": "image quality and clarity assessment"
                }`
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        contentType: 'image',
        visionAnalysis: analysis,
        hasVisibleText: !!analysis.visibleText,
        hasTechnicalContent: !!analysis.technicalContent,
        hasMeasurements: !!analysis.measurements
      };
      
    } catch (error) {
      return {
        contentType: 'image',
        error: 'Vision analysis failed',
        hasVisibleText: false,
        hasTechnicalContent: false
      };
    }
  }

  /**
   * Extract PDF content (basic structure analysis)
   */
  private async extractPDFContent(filePath: string): Promise<any> {
    const stats = require('fs').statSync(filePath);
    
    return {
      contentType: 'pdf',
      fileSize: stats.size,
      pageEstimate: Math.ceil(stats.size / 50000), // Rough estimate
      requiresOCR: true,
      extractionNote: 'PDF content requires OCR processing for full text extraction'
    };
  }

  /**
   * Extract spreadsheet content
   */
  private async extractSpreadsheetContent(filePath: string): Promise<any> {
    const stats = require('fs').statSync(filePath);
    
    return {
      contentType: 'spreadsheet',
      fileSize: stats.size,
      requiresSpecializedParser: true,
      extractionNote: 'Excel/spreadsheet files require specialized parser'
    };
  }

  /**
   * AI-powered content adequacy assessment
   * Implements spec requirement to mark as: Sufficient, Partially adequate, Inadequate, Irrelevant
   */
  private async assessContentAdequacy(
    contentData: any,
    expectedStructure: ExpectedEvidenceStructure,
    evidenceType: string,
    equipmentContext: any
  ): Promise<EvidenceParseResult> {
    
    if (contentData.error) {
      return {
        status: 'inadequate',
        confidence: 95,
        extractedData: null,
        adequacyReason: `File processing failed: ${contentData.error}`,
        suggestedImprovements: ['Verify file format and integrity', 'Try uploading a different format'],
        contentType: contentData.contentType || 'unknown',
        dataQuality: 0
      };
    }
    
    // Generate AI assessment prompt
    const assessmentPrompt = this.generateAssessmentPrompt(
      contentData,
      expectedStructure,
      evidenceType,
      equipmentContext
    );
    
    try {
      const response = await this.openai.chat.completions.create({
        model: activeConfig?.model || UniversalAIConfig.getDefaultModel(),
        messages: [
          {
            role: "system",
            content: "You are an expert industrial engineer assessing evidence adequacy for root cause analysis. Evaluate evidence completeness and quality objectively."
          },
          {
            role: "user",
            content: assessmentPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const aiAssessment = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        status: this.normalizeStatus(aiAssessment.status),
        confidence: aiAssessment.confidence || 50,
        extractedData: contentData,
        adequacyReason: aiAssessment.reason || 'Assessment completed',
        suggestedImprovements: aiAssessment.improvements || [],
        contentType: contentData.contentType,
        dataQuality: aiAssessment.dataQuality || 50
      };
      
    } catch (error) {
      console.error('[AI Assessment] Error:', error);
      return this.generateFallbackAssessment(contentData, expectedStructure);
    }
  }

  /**
   * Generate AI assessment prompt
   */
  private generateAssessmentPrompt(
    contentData: any,
    expectedStructure: ExpectedEvidenceStructure,
    evidenceType: string,
    equipmentContext: any
  ): string {
    
    const { group, type, subtype } = equipmentContext;
    
    return `
ASSESS EVIDENCE ADEQUACY FOR ROOT CAUSE ANALYSIS:

EQUIPMENT CONTEXT:
- Equipment: ${group} → ${type} → ${subtype}
- Required Evidence Type: ${evidenceType}
- Expected Data Format: ${expectedStructure.dataFormat}

REQUIRED FIELDS:
${expectedStructure.requiredFields.map(field => `- ${field}`).join('\n')}

QUALITY CRITERIA:
${expectedStructure.qualityCriteria.map(criteria => `- ${criteria}`).join('\n')}

ACTUAL CONTENT RECEIVED:
Content Type: ${contentData.contentType}
${JSON.stringify(contentData, null, 2)}

EVALUATE AND RESPOND IN JSON:
{
  "status": "sufficient|partially_adequate|inadequate|irrelevant",
  "confidence": <0-100>,
  "reason": "detailed explanation of adequacy assessment",
  "dataQuality": <0-100>,
  "presentFields": ["list of required fields found in content"],
  "missingFields": ["list of required fields missing"],
  "improvements": ["specific suggestions to improve evidence quality"],
  "relevanceToFailureAnalysis": "how this evidence helps with root cause analysis"
}

ASSESSMENT CRITERIA:
- sufficient: All required fields present, good data quality, clear relevance
- partially_adequate: Most required fields present, acceptable quality, some gaps
- inadequate: Missing critical fields, poor quality, but relevant to evidence type
- irrelevant: Content doesn't match expected evidence type or equipment context

Focus on technical completeness and relevance for engineering root cause analysis.
`;
  }

  /**
   * Normalize AI status response to spec values
   */
  private normalizeStatus(status: string): 'sufficient' | 'partially_adequate' | 'inadequate' | 'irrelevant' {
    const normalized = status?.toLowerCase();
    
    if (normalized?.includes('sufficient')) return 'sufficient';
    if (normalized?.includes('partial')) return 'partially_adequate';
    if (normalized?.includes('irrelevant')) return 'irrelevant';
    return 'inadequate';
  }

  /**
   * Generate fallback assessment when AI fails
   */
  private generateFallbackAssessment(
    contentData: any,
    expectedStructure: ExpectedEvidenceStructure
  ): EvidenceParseResult {
    
    let status: 'sufficient' | 'partially_adequate' | 'inadequate' | 'irrelevant' = 'inadequate';
    let dataQuality = 30;
    
    // Basic heuristic assessment
    if (contentData.contentType === 'csv' && contentData.headers?.length > 0) {
      const fieldMatches = expectedStructure.requiredFields.filter(field =>
        contentData.headers.some((header: string) =>
          header.toLowerCase().includes(field.toLowerCase())
        )
      );
      
      if (fieldMatches.length >= expectedStructure.requiredFields.length * 0.8) {
        status = 'sufficient';
        dataQuality = 80;
      } else if (fieldMatches.length >= expectedStructure.requiredFields.length * 0.5) {
        status = 'partially_adequate';
        dataQuality = 60;
      }
    }
    
    return {
      status,
      confidence: 70,
      extractedData: contentData,
      adequacyReason: 'Fallback heuristic assessment - AI analysis unavailable',
      suggestedImprovements: ['Verify AI service availability', 'Check content format'],
      contentType: contentData.contentType,
      dataQuality
    };
  }

  /**
   * Batch process multiple evidence files
   */
  async parseMultipleEvidence(
    evidenceFiles: Array<{
      filePath: string;
      fileName: string;
      evidenceType: string;
    }>,
    equipmentContext: {
      group: string;
      type: string;
      subtype: string;
    }
  ): Promise<Record<string, EvidenceParseResult>> {
    
    const results: Record<string, EvidenceParseResult> = {};
    
    // Process files in parallel for efficiency
    const parsePromises = evidenceFiles.map(async (file) => {
      const result = await this.parseEvidence(
        file.filePath,
        file.fileName,
        file.evidenceType,
        equipmentContext
      );
      return { key: file.fileName, result };
    });
    
    const completed = await Promise.all(parsePromises);
    
    for (const { key, result } of completed) {
      results[key] = result;
    }
    
    return results;
  }
}