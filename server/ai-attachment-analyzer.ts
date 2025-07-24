import OpenAI from "openai";
import { readFileSync } from "fs";
import path from "path";

// AI-Powered Attachment Content Analysis System
// Analyzes uploaded files for evidence adequacy and provides specific feedback
export class AIAttachmentAnalyzer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }

  /**
   * Universal attachment content analysis for ANY equipment type
   * Analyzes file content and provides specific feedback on evidence adequacy
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
      console.log(`[AI Attachment Analysis] Analyzing ${fileName} for ${evidenceCategory}`);

      const fileExtension = path.extname(fileName).toLowerCase();
      let analysisPrompt = "";
      let fileContent = "";

      // Universal file content extraction
      if (['.txt', '.csv', '.log'].includes(fileExtension)) {
        fileContent = readFileSync(filePath, 'utf-8');
        analysisPrompt = this.generateTextAnalysisPrompt(fileContent, evidenceCategory, equipmentContext, requiredEvidence);
      } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
        const base64Image = readFileSync(filePath).toString('base64');
        analysisPrompt = this.generateImageAnalysisPrompt(evidenceCategory, equipmentContext, requiredEvidence);
        
        // Analyze image content with vision model
        return await this.analyzeImageContent(base64Image, analysisPrompt);
      } else if (['.pdf'].includes(fileExtension)) {
        // For PDF files, provide analysis framework
        analysisPrompt = this.generatePDFAnalysisPrompt(evidenceCategory, equipmentContext, requiredEvidence);
        return await this.analyzeDocumentStructure(analysisPrompt);
      } else {
        // Unknown file type - provide generic analysis framework
        return this.generateGenericAnalysis(evidenceCategory, equipmentContext, requiredEvidence);
      }

      // Analyze text-based content
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // Latest OpenAI model
        messages: [
          {
            role: "system",
            content: "You are an expert industrial engineer analyzing evidence attachments for root cause analysis. Provide specific, technical feedback on evidence adequacy and missing information."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      console.log(`[AI Attachment Analysis] Completed analysis with ${analysis.adequacyScore}% adequacy`);

      return {
        isAdequate: analysis.adequacyScore >= 70,
        adequacyScore: analysis.adequacyScore || 0,
        specificFindings: analysis.specificFindings || [],
        missingInformation: analysis.missingInformation || [],
        qualityAssessment: analysis.qualityAssessment || 'Analysis completed',
        recommendations: analysis.recommendations || [],
        followUpQuestions: analysis.followUpQuestions || []
      };

    } catch (error) {
      console.error('[AI Attachment Analysis] Error:', error);
      return this.generateErrorAnalysis(evidenceCategory);
    }
  }

  /**
   * Generate analysis prompt for text-based files (CSV, TXT, LOG)
   */
  private generateTextAnalysisPrompt(
    content: string, 
    evidenceCategory: string, 
    equipmentContext: any, 
    requiredEvidence: string[]
  ): string {
    return `
ANALYZE THIS ATTACHMENT CONTENT FOR RCA EVIDENCE ADEQUACY:

EQUIPMENT CONTEXT:
- Equipment: ${equipmentContext.group} → ${equipmentContext.type} → ${equipmentContext.subtype}
- Evidence Category: ${evidenceCategory}
- Required Evidence: ${requiredEvidence.join(', ')}

FILE CONTENT TO ANALYZE:
${content.substring(0, 5000)} ${content.length > 5000 ? '[... content truncated ...]' : ''}

PROVIDE DETAILED ANALYSIS IN JSON FORMAT:
{
  "adequacyScore": <number 0-100>,
  "specificFindings": [
    "list specific data points, measurements, or observations found",
    "identify key technical parameters present"
  ],
  "missingInformation": [
    "list specific missing data that should be present",
    "identify gaps in technical documentation"
  ],
  "qualityAssessment": "detailed assessment of data quality and completeness",
  "recommendations": [
    "specific actions to improve evidence quality",
    "additional data collection needed"
  ],
  "followUpQuestions": [
    "specific technical questions about missing data",
    "clarification needed on equipment parameters"
  ]
}

Focus on technical accuracy, data completeness, and equipment-specific requirements.
`;
  }

  /**
   * Generate analysis prompt for image files
   */
  private generateImageAnalysisPrompt(
    evidenceCategory: string, 
    equipmentContext: any, 
    requiredEvidence: string[]
  ): string {
    return `
ANALYZE THIS IMAGE FOR RCA EVIDENCE ADEQUACY:

EQUIPMENT CONTEXT:
- Equipment: ${equipmentContext.group} → ${equipmentContext.type} → ${equipmentContext.subtype}
- Evidence Category: ${evidenceCategory}
- Required Evidence: ${requiredEvidence.join(', ')}

PROVIDE DETAILED VISUAL ANALYSIS IN JSON FORMAT:
{
  "adequacyScore": <number 0-100>,
  "specificFindings": [
    "describe what is visible in the image",
    "identify equipment components shown",
    "note any damage, wear, or abnormalities"
  ],
  "missingInformation": [
    "list what should be visible but isn't shown",
    "identify missing visual documentation"
  ],
  "qualityAssessment": "assessment of image quality, clarity, and documentation value",
  "recommendations": [
    "suggest additional photos needed",
    "recommend better angles or documentation"
  ],
  "followUpQuestions": [
    "ask for specific visual details not shown",
    "request measurements or additional context"
  ]
}

Focus on visual evidence quality and completeness for engineering analysis.
`;
  }

  /**
   * Analyze image content using OpenAI Vision
   */
  private async analyzeImageContent(base64Image: string, prompt: string): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
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
      isAdequate: analysis.adequacyScore >= 70,
      adequacyScore: analysis.adequacyScore || 0,
      specificFindings: analysis.specificFindings || [],
      missingInformation: analysis.missingInformation || [],
      qualityAssessment: analysis.qualityAssessment || 'Image analysis completed',
      recommendations: analysis.recommendations || [],
      followUpQuestions: analysis.followUpQuestions || []
    };
  }

  /**
   * Generate analysis for PDF documents
   */
  private generatePDFAnalysisPrompt(
    evidenceCategory: string, 
    equipmentContext: any, 
    requiredEvidence: string[]
  ): string {
    return `PDF document analysis for ${evidenceCategory} evidence in ${equipmentContext.group} → ${equipmentContext.type} → ${equipmentContext.subtype} investigation.`;
  }

  /**
   * Analyze document structure for PDFs
   */
  private async analyzeDocumentStructure(prompt: string): Promise<any> {
    return {
      isAdequate: false,
      adequacyScore: 50,
      specificFindings: ['PDF document uploaded'],
      missingInformation: ['PDF content analysis requires OCR processing'],
      qualityAssessment: 'PDF format detected - manual review recommended',
      recommendations: ['Convert to text format if possible', 'Provide key excerpts as text'],
      followUpQuestions: ['What are the key findings in this document?', 'Can you provide specific data points from the PDF?']
    };
  }

  /**
   * Generate generic analysis for unknown file types
   */
  private generateGenericAnalysis(
    evidenceCategory: string, 
    equipmentContext: any, 
    requiredEvidence: string[]
  ): any {
    return {
      isAdequate: false,
      adequacyScore: 30,
      specificFindings: ['File uploaded successfully'],
      missingInformation: ['File content analysis not available for this format'],
      qualityAssessment: 'Unable to analyze file content automatically',
      recommendations: [
        'Consider converting to supported format (TXT, CSV, JPG, PNG)',
        'Provide key information as text summary'
      ],
      followUpQuestions: [
        'What are the main findings in this file?',
        'Can you provide a summary of the key data points?'
      ]
    };
  }

  /**
   * Generate error analysis when AI analysis fails
   */
  private generateErrorAnalysis(evidenceCategory: string): any {
    return {
      isAdequate: false,
      adequacyScore: 0,
      specificFindings: ['File uploaded but analysis failed'],
      missingInformation: ['Automatic content analysis unavailable'],
      qualityAssessment: 'Manual review required due to system error',
      recommendations: ['Review file manually', 'Provide text summary of key points'],
      followUpQuestions: ['What are the main findings in this evidence?']
    };
  }
}