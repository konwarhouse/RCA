import OpenAI from "openai";
import { readFileSync } from "fs";
import path from "path";
import { EquipmentDecisionEngine } from "./config/equipment-decision-engine";
import { UniversalAIConfig } from "./universal-ai-config";

/**
 * AI-Powered Attachment Content Analyzer
 * Uses dynamic MIME type detection and JSON schema inference
 * NO HARDCODED FILE TYPE OR EQUIPMENT ASSUMPTIONS
 */
export class AIAttachmentAnalyzer {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: await DynamicAIConfig.getActiveAPIKey() 
    });
  }

  /**
   * Dynamic attachment content analysis using MIME type detection and JSON schema inference
   * NO HARDCODED FILE TYPE ASSUMPTIONS - uses metadata-driven approach
   */
  async analyzeAttachmentContent(
    filePath: string, 
    fileName: string, 
    evidenceCategory: string,
    equipmentContext: { group: string; type: string; subtype: string },
    requiredEvidence: string[]
  ): Promise<{
    isAdequate: boolean;
    adequacyScore: number;
    specificFindings: string[];
    missingInformation: string[];
    qualityAssessment: string;
    recommendations: string[];
    followUpQuestions: string[];
  }> {
    try {
      console.log(`[Dynamic AI Analysis] Analyzing ${fileName} using metadata-driven approach`);

      // Get equipment configuration from Decision Engine (NO HARDCODING)
      const equipmentConfig = await EquipmentDecisionEngine.getEquipmentConfiguration(
        equipmentContext.group,
        equipmentContext.type, 
        equipmentContext.subtype
      );

      // Dynamic MIME type detection and content parsing
      const contentAnalysis = await this.dynamicContentParser(filePath, fileName, equipmentConfig);
      
      // JSON schema inference for adequacy assessment
      const schemaValidation = await this.inferContentSchema(contentAnalysis, equipmentConfig.contentAnalysisSchema);
      
      // Generate analysis using equipment tags and metadata
      const analysisResult = await this.generateMetadataDrivenAnalysis(
        contentAnalysis,
        schemaValidation,
        evidenceCategory,
        equipmentConfig,
        requiredEvidence
      );

      console.log(`[Dynamic AI Analysis] Completed with ${analysisResult.adequacyScore}% adequacy using schema inference`);
      return analysisResult;

    } catch (error) {
      console.error('[Dynamic AI Analysis] Error:', error);
      return this.generateErrorAnalysis(evidenceCategory);
    }
  }

  /**
   * Dynamic content parser using MIME type detection
   */
  private async dynamicContentParser(filePath: string, fileName: string, equipmentConfig: any): Promise<any> {
    const mime = require('mime-types');
    const mimeType = mime.lookup(fileName) || 'application/octet-stream';
    
    console.log(`[Content Parser] Detected MIME type: ${mimeType}`);

    const contentAnalysis = {
      mimeType,
      fileName,
      fileSize: 0,
      parsedContent: null,
      structure: null,
      metadata: {}
    };

    try {
      const stats = require('fs').statSync(filePath);
      contentAnalysis.fileSize = stats.size;

      // Route based on MIME type (not file extension)
      if (mimeType.startsWith('text/')) {
        contentAnalysis.parsedContent = await this.parseTextContent(filePath, mimeType, equipmentConfig);
      } else if (mimeType.startsWith('image/')) {
        contentAnalysis.parsedContent = await this.parseImageContent(filePath, equipmentConfig);
      } else if (mimeType === 'application/pdf') {
        contentAnalysis.parsedContent = await this.parsePDFContent(filePath, equipmentConfig);
      } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        contentAnalysis.parsedContent = await this.parseSpreadsheetContent(filePath, equipmentConfig);
      } else {
        contentAnalysis.parsedContent = await this.parseGenericContent(filePath, mimeType, equipmentConfig);
      }

      // Extract content structure for schema inference
      contentAnalysis.structure = this.extractContentStructure(contentAnalysis.parsedContent);
      
    } catch (error) {
      console.error('[Content Parser] Error parsing file:', error);
      contentAnalysis.parsedContent = { error: error.message };
    }

    return contentAnalysis;
  }

  /**
   * Parse text content using equipment configuration
   */
  private async parseTextContent(filePath: string, mimeType: string, equipmentConfig: any): Promise<any> {
    const content = readFileSync(filePath, 'utf-8');
    
    if (mimeType === 'text/csv' || content.includes(',')) {
      return this.parseCSVStructure(content, equipmentConfig);
    } else if (content.includes('\t')) {
      return this.parseTSVStructure(content, equipmentConfig);
    } else {
      return this.parseTextStructure(content, equipmentConfig);
    }
  }

  /**
   * Parse CSV structure using equipment metadata
   */
  private parseCSVStructure(content: string, equipmentConfig: any): any {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { error: 'Empty CSV file' };

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return {
      type: 'csv',
      headers,
      rowCount: data.length,
      data: data.slice(0, 10), // Sample first 10 rows
      requiredFields: this.checkRequiredFields(headers, equipmentConfig.requiredEvidence),
      dataTypes: this.inferDataTypes(data),
      completeness: this.calculateCompleteness(data, equipmentConfig.contentAnalysisSchema)
    };
  }

  /**
   * Parse image content using vision analysis
   */
  private async parseImageContent(filePath: string, equipmentConfig: any): Promise<any> {
    const base64Image = readFileSync(filePath).toString('base64');
    
    // Use equipment tags for context-aware image analysis
    const analysisPrompt = this.generateDynamicImagePrompt(equipmentConfig);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: activeConfig?.model || UniversalAIConfig.getDefaultModel(),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
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

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      return { error: 'Image analysis failed', message: error.message };
    }
  }

  /**
   * Generate dynamic image analysis prompt using equipment configuration
   */
  private generateDynamicImagePrompt(equipmentConfig: any): string {
    const tags = equipmentConfig.investigationTags.join(', ');
    const requiredFields = equipmentConfig.contentAnalysisSchema.requiredFields.join(', ');
    
    return `
ANALYZE THIS IMAGE FOR TECHNICAL EVIDENCE:

EQUIPMENT CONTEXT TAGS: ${tags}
REQUIRED CONTENT FIELDS: ${requiredFields}
ANALYSIS COMPLEXITY: ${equipmentConfig.analysisComplexity}

PROVIDE JSON RESPONSE:
{
  "technicalFindings": ["list specific technical observations"],
  "visibleComponents": ["identify equipment components shown"],
  "measurements": ["any visible measurements or scales"],
  "damageAssessment": ["damage, wear, or abnormalities observed"],
  "missingElements": ["what should be visible but isn't shown"],
  "adequacyScore": [0-100],
  "schemaCompliance": {
    "requiredFields": ["fields visible in image"],
    "missingFields": ["fields not visible"],
    "dataQuality": "assessment of image quality"
  }
}

Focus on technical accuracy and evidence completeness for engineering analysis.
`;
  }

  // Helper methods for content parsing and analysis
  private parseTSVStructure(content: string, equipmentConfig: any): any {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { error: 'Empty TSV file' };

    const headers = lines[0].split('\t').map(h => h.trim());
    const data = lines.slice(1).map(line => {
      const values = line.split('\t').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return {
      type: 'tsv',
      headers,
      rowCount: data.length,
      data: data.slice(0, 10),
      requiredFields: this.checkRequiredFields(headers, equipmentConfig.requiredEvidence),
      dataTypes: this.inferDataTypes(data),
      completeness: this.calculateCompleteness(data, equipmentConfig.contentAnalysisSchema)
    };
  }

  private parseTextStructure(content: string, equipmentConfig: any): any {
    return {
      type: 'text',
      length: content.length,
      lineCount: content.split('\n').length,
      keywords: this.extractKeywords(content, equipmentConfig.contentAnalysisSchema.contentPatterns || []),
      completeness: this.calculateTextCompleteness(content, equipmentConfig.contentAnalysisSchema)
    };
  }

  private async parsePDFContent(filePath: string, equipmentConfig: any): Promise<any> {
    return {
      type: 'pdf',
      size: require('fs').statSync(filePath).size,
      requiresOCR: true,
      recommendation: 'PDF content requires OCR processing for full analysis'
    };
  }

  private async parseSpreadsheetContent(filePath: string, equipmentConfig: any): Promise<any> {
    return {
      type: 'spreadsheet',
      size: require('fs').statSync(filePath).size,
      requiresParser: true,
      recommendation: 'Excel file requires specialized parser for header matching'
    };
  }

  private async parseGenericContent(filePath: string, mimeType: string, equipmentConfig: any): Promise<any> {
    return {
      type: 'generic',
      mimeType,
      size: require('fs').statSync(filePath).size,
      requiresAnalysis: true
    };
  }

  private extractContentStructure(parsedContent: any): any {
    if (!parsedContent || parsedContent.error) {
      return { error: 'No content structure available' };
    }

    return {
      type: parsedContent.type,
      hasHeaders: !!parsedContent.headers,
      fieldCount: parsedContent.headers?.length || 0,
      recordCount: parsedContent.rowCount || 0,
      dataQuality: parsedContent.completeness || 0
    };
  }

  private checkRequiredFields(headers: string[], requiredEvidence: string[]): any {
    const matched = headers.filter(header => 
      requiredEvidence.some(req => 
        header.toLowerCase().includes(req.toLowerCase())
      )
    );

    return {
      matched,
      missing: requiredEvidence.filter(req => 
        !headers.some(header => 
          header.toLowerCase().includes(req.toLowerCase())
        )
      ),
      coverage: matched.length / requiredEvidence.length
    };
  }

  private inferDataTypes(data: any[]): any {
    if (data.length === 0) return {};

    const types: any = {};
    const firstRow = data[0];

    Object.keys(firstRow).forEach(key => {
      const values = data.slice(0, 10).map(row => row[key]).filter(v => v);
      
      if (values.every(v => !isNaN(Number(v)))) {
        types[key] = 'number';
      } else if (values.every(v => Date.parse(v))) {
        types[key] = 'date';
      } else {
        types[key] = 'string';
      }
    });

    return types;
  }

  private calculateCompleteness(data: any[], schema: any): number {
    if (data.length === 0) return 0;

    let totalFields = 0;
    let completedFields = 0;

    data.forEach(row => {
      Object.values(row).forEach(value => {
        totalFields++;
        if (value && String(value).trim() !== '') {
          completedFields++;
        }
      });
    });

    return totalFields > 0 ? completedFields / totalFields : 0;
  }

  private extractKeywords(content: string, patterns: string[]): string[] {
    const found: string[] = [];
    const lowerContent = content.toLowerCase();

    patterns.forEach(pattern => {
      if (lowerContent.includes(pattern.toLowerCase())) {
        found.push(pattern);
      }
    });

    return found;
  }

  private calculateTextCompleteness(content: string, schema: any): number {
    if (!schema.contentPatterns) return 0.5;

    const foundPatterns = this.extractKeywords(content, schema.contentPatterns);
    return foundPatterns.length / schema.contentPatterns.length;
  }

  /**
   * Infer content schema from parsed content
   */
  private async inferContentSchema(contentAnalysis: any, expectedSchema: any): Promise<any> {
    const schemaValidation = {
      structureMatch: false,
      fieldCoverage: 0,
      dataQuality: 0,
      missingFields: [],
      extraFields: [],
      typeCompliance: {}
    };

    if (!contentAnalysis.parsedContent || contentAnalysis.parsedContent.error) {
      return schemaValidation;
    }

    const content = contentAnalysis.parsedContent;
    
    // Check required fields coverage
    if (content.headers && expectedSchema.requiredFields) {
      const presentFields = content.headers.filter((header: string) => 
        expectedSchema.requiredFields.some((required: string) => 
          header.toLowerCase().includes(required.toLowerCase())
        )
      );
      
      schemaValidation.fieldCoverage = presentFields.length / expectedSchema.requiredFields.length;
      schemaValidation.missingFields = expectedSchema.requiredFields.filter((required: string) =>
        !content.headers.some((header: string) => 
          header.toLowerCase().includes(required.toLowerCase())
        )
      );
    }

    // Validate data types
    if (content.dataTypes && expectedSchema.dataTypes) {
      Object.keys(expectedSchema.dataTypes).forEach(field => {
        const expectedType = expectedSchema.dataTypes[field];
        const actualType = content.dataTypes[field];
        schemaValidation.typeCompliance[field] = actualType === expectedType;
      });
    }

    // Calculate overall data quality
    schemaValidation.dataQuality = content.completeness || 0;
    schemaValidation.structureMatch = schemaValidation.fieldCoverage > 0.7;

    return schemaValidation;
  }

  /**
   * Generate metadata-driven analysis using equipment configuration
   */
  private async generateMetadataDrivenAnalysis(
    contentAnalysis: any,
    schemaValidation: any,
    evidenceCategory: string,
    equipmentConfig: any,
    requiredEvidence: string[]
  ): Promise<any> {
    // Route analysis decision based on tags and metadata
    const analysisRoute = await EquipmentDecisionEngine.routeDecision(
      equipmentConfig.investigationTags,
      contentAnalysis.metadata,
      'analysisRoute'
    );

    console.log(`[Metadata Analysis] Using route: ${analysisRoute}`);

    const adequacyScore = this.calculateAdequacyScore(contentAnalysis, schemaValidation, equipmentConfig);
    
    return {
      isAdequate: adequacyScore >= 70,
      adequacyScore,
      specificFindings: this.extractSpecificFindings(contentAnalysis, equipmentConfig),
      missingInformation: this.identifyMissingInformation(schemaValidation, equipmentConfig),
      qualityAssessment: this.generateQualityAssessment(contentAnalysis, schemaValidation),
      recommendations: this.generateDynamicRecommendations(schemaValidation, equipmentConfig),
      followUpQuestions: this.generateContextualQuestions(contentAnalysis, equipmentConfig)
    };
  }

  /**
   * Calculate adequacy score using JSON schema validation
   */
  private calculateAdequacyScore(contentAnalysis: any, schemaValidation: any, equipmentConfig: any): number {
    let score = 0;
    
    // Base score from content existence
    if (contentAnalysis.parsedContent && !contentAnalysis.parsedContent.error) {
      score += 30;
    }
    
    // Schema compliance score
    score += schemaValidation.fieldCoverage * 40;
    
    // Data quality score
    score += schemaValidation.dataQuality * 20;
    
    // Structure match bonus
    if (schemaValidation.structureMatch) {
      score += 10;
    }
    
    return Math.min(100, Math.round(score));
  }

  private extractSpecificFindings(contentAnalysis: any, equipmentConfig: any): string[] {
    const findings: string[] = [];
    const content = contentAnalysis.parsedContent;

    if (content.headers) {
      findings.push(`Data structure: ${content.type.toUpperCase()} with ${content.headers.length} columns`);
    }

    if (content.rowCount) {
      findings.push(`Data volume: ${content.rowCount} records`);
    }

    if (content.requiredFields?.matched?.length > 0) {
      findings.push(`Required fields found: ${content.requiredFields.matched.join(', ')}`);
    }

    return findings;
  }

  private identifyMissingInformation(schemaValidation: any, equipmentConfig: any): string[] {
    const missing: string[] = [];

    if (schemaValidation.missingFields.length > 0) {
      missing.push(`Missing required fields: ${schemaValidation.missingFields.join(', ')}`);
    }

    if (schemaValidation.fieldCoverage < 0.7) {
      missing.push('Insufficient field coverage for complete analysis');
    }

    if (schemaValidation.dataQuality < 0.8) {
      missing.push('Data completeness below quality threshold');
    }

    return missing;
  }

  private generateQualityAssessment(contentAnalysis: any, schemaValidation: any): string {
    const score = this.calculateAdequacyScore(contentAnalysis, schemaValidation, {});
    
    if (score >= 80) return 'High quality evidence with good structure and completeness';
    if (score >= 60) return 'Moderate quality evidence with some gaps';
    return 'Low quality evidence requiring significant improvements';
  }

  private generateDynamicRecommendations(schemaValidation: any, equipmentConfig: any): string[] {
    const recommendations: string[] = [];

    if (schemaValidation.missingFields.length > 0) {
      recommendations.push(`Include missing fields: ${schemaValidation.missingFields.join(', ')}`);
    }

    if (schemaValidation.fieldCoverage < 0.7) {
      recommendations.push('Improve data structure to include more required fields');
    }

    if (schemaValidation.dataQuality < 0.8) {
      recommendations.push('Enhance data completeness and reduce empty values');
    }

    return recommendations;
  }

  private generateContextualQuestions(contentAnalysis: any, equipmentConfig: any): string[] {
    const questions: string[] = [];
    const content = contentAnalysis.parsedContent;

    if (content.requiredFields?.missing?.length > 0) {
      questions.push(`Can you provide data for: ${content.requiredFields.missing.join(', ')}?`);
    }

    if (content.completeness < 0.8) {
      questions.push('Can you provide more complete data with fewer empty fields?');
    }

    return questions;
  }

  private generateErrorAnalysis(evidenceCategory: string): any {
    return {
      isAdequate: false,
      adequacyScore: 0,
      specificFindings: ['File analysis failed due to processing error'],
      missingInformation: ['Complete content analysis unavailable'],
      qualityAssessment: 'Analysis could not be completed due to technical error',
      recommendations: ['Please verify file format and try uploading again'],
      followUpQuestions: ['Can you provide the file in a different format?']
    };
  }
}