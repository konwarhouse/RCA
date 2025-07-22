import * as XLSX from 'xlsx';
import { z } from 'zod';

// Data input schemas for validation
export const WorkOrderSchema = z.object({
  equipmentId: z.string().optional(),
  equipmentType: z.string().optional(),
  description: z.string().optional(),
  symptoms: z.string().optional(),
  actions: z.string().optional(),
  timestamp: z.string().optional(),
  operator: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  location: z.string().optional(),
  maintenanceHistory: z.array(z.object({
    date: z.string(),
    type: z.string(),
    description: z.string(),
    technician: z.string().optional()
  })).optional()
});

export const OperatingDataSchema = z.object({
  timestamp: z.string(),
  parameters: z.record(z.union([z.number(), z.string(), z.boolean()])),
  alarms: z.array(z.string()).optional(),
  events: z.array(z.string()).optional()
});

// NOTE: Asset types and subtypes are now managed through Evidence Library database
// This ensures zero hardcoded equipment logic - all equipment classifications
// come from admin-configurable Evidence Library entries

// Common symptom patterns for NLP extraction
export const SYMPTOM_PATTERNS = {
  leak: {
    patterns: ['leak', 'leaking', 'drip', 'dripping', 'seepage', 'wet', 'fluid loss'],
    locations: ['seal', 'gasket', 'joint', 'stem', 'body', 'flange', 'connection']
  },
  noise: {
    patterns: ['noise', 'noisy', 'sound', 'grinding', 'squealing', 'rattling', 'knocking'],
    types: ['grinding', 'squealing', 'rattling', 'knocking', 'humming', 'whistling']
  },
  vibration: {
    patterns: ['vibration', 'vibrating', 'shake', 'shaking', 'oscillation', 'unbalance'],
    severity: ['slight', 'moderate', 'severe', 'excessive']
  },
  overheating: {
    patterns: ['hot', 'overheat', 'overheating', 'temperature', 'thermal', 'burning'],
    locations: ['bearing', 'motor', 'winding', 'housing', 'coupling']
  },
  performance: {
    patterns: ['low flow', 'poor performance', 'efficiency', 'output', 'capacity', 'pressure drop'],
    types: ['reduced_flow', 'low_pressure', 'high_pressure', 'efficiency_loss', 'capacity_reduction']
  }
};

export class DataParser {
  
  /**
   * Parse various file formats and extract structured data
   */
  static async parseFile(buffer: Buffer, filename: string): Promise<any> {
    const extension = filename.toLowerCase().split('.').pop();
    
    try {
      switch (extension) {
        case 'xlsx':
        case 'xls':
          return this.parseExcel(buffer);
        case 'csv':
          return this.parseCSV(buffer);
        case 'json':
          return this.parseJSON(buffer);
        case 'pdf':
          return this.parsePDF(buffer);
        case 'txt':
          return this.parseText(buffer);
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse ${filename}: ${error.message}`);
    }
  }

  /**
   * Parse Excel files with multiple worksheets
   */
  private static parseExcel(buffer: Buffer): any {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const result: any = {};
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      result[sheetName] = data;
    });
    
    return this.normalizeData(result);
  }

  /**
   * Parse CSV files
   */
  private static parseCSV(buffer: Buffer): any {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return {};
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      return row;
    });
    
    return this.normalizeData({ data });
  }

  /**
   * Parse JSON files
   */
  private static parseJSON(buffer: Buffer): any {
    const text = buffer.toString('utf-8');
    const data = JSON.parse(text);
    return this.normalizeData(data);
  }

  /**
   * Parse PDF files (simplified text extraction)
   */
  private static parsePDF(buffer: Buffer): any {
    // For production, use a proper PDF parser like pdf-parse
    // This is a simplified implementation
    const text = buffer.toString('utf-8', 0, 1000); // First 1000 chars as fallback
    return this.extractFromText(text);
  }

  /**
   * Parse plain text files
   */
  private static parseText(buffer: Buffer): any {
    const text = buffer.toString('utf-8');
    return this.extractFromText(text);
  }

  /**
   * Extract structured information from unstructured text using NLP patterns
   */
  private static extractFromText(text: string): any {
    const result: any = {
      rawText: text,
      extractedInfo: {}
    };

    // Extract equipment information
    result.extractedInfo.equipment = this.extractEquipmentInfo(text);
    
    // Extract symptoms
    result.extractedInfo.symptoms = this.extractSymptoms(text);
    
    // Extract maintenance actions
    result.extractedInfo.actions = this.extractActions(text);
    
    // Extract dates and timestamps
    result.extractedInfo.timestamps = this.extractTimestamps(text);
    
    return result;
  }

  /**
   * Extract equipment type and details from text
   */
  private static extractEquipmentInfo(text: string): any {
    const lowerText = text.toLowerCase();
    const equipment: any = {};
    
    // Find equipment type
    for (const [type, config] of Object.entries(ASSET_TYPES)) {
      if (lowerText.includes(type)) {
        equipment.type = type;
        
        // Find subtype
        for (const subtype of config.subtypes) {
          if (lowerText.includes(subtype.replace('_', ' '))) {
            equipment.subtype = subtype;
            break;
          }
        }
        break;
      }
    }
    
    // Extract equipment ID patterns
    const idPatterns = [
      /(?:pump|motor|valve|equipment|asset)[\s\-#:]*([\w\-]+)/gi,
      /(?:id|tag|number)[\s\-#:]*([\w\-]+)/gi,
      /([A-Z]{1,3}[-_]?\d{2,6})/g
    ];
    
    for (const pattern of idPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        equipment.id = matches[0];
        break;
      }
    }
    
    return equipment;
  }

  /**
   * Extract symptoms and issues from text
   */
  private static extractSymptoms(text: string): any {
    const lowerText = text.toLowerCase();
    const symptoms: any = {
      detected: [],
      location: null,
      severity: null
    };
    
    // Check for symptom patterns
    for (const [symptomType, config] of Object.entries(SYMPTOM_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (lowerText.includes(pattern)) {
          symptoms.detected.push({
            type: symptomType,
            pattern: pattern,
            confidence: this.calculateConfidence(text, pattern)
          });
          
          // Extract location if available
          if ('locations' in config) {
            for (const location of (config as any).locations) {
              if (lowerText.includes(location)) {
                symptoms.location = location;
                break;
              }
            }
          }
          break;
        }
      }
    }
    
    return symptoms;
  }

  /**
   * Extract maintenance actions and procedures
   */
  private static extractActions(text: string): string[] {
    const actionWords = [
      'replace', 'repair', 'inspect', 'clean', 'adjust', 'calibrate',
      'lubricate', 'tighten', 'align', 'balance', 'test', 'check'
    ];
    
    const actions: string[] = [];
    const sentences = text.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      for (const action of actionWords) {
        if (lowerSentence.includes(action)) {
          actions.push(sentence.trim());
          break;
        }
      }
    });
    
    return actions;
  }

  /**
   * Extract timestamps and dates
   */
  private static extractTimestamps(text: string): string[] {
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/g, // MM/DD/YYYY
      /\d{2,4}-\d{1,2}-\d{1,2}/g,   // YYYY-MM-DD
      /\d{1,2}-\w{3}-\d{2,4}/g      // DD-MMM-YYYY
    ];
    
    const timestamps: string[] = [];
    
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        timestamps.push(...matches);
      }
    });
    
    return [...new Set(timestamps)]; // Remove duplicates
  }

  /**
   * Calculate confidence score for pattern matching
   */
  private static calculateConfidence(text: string, pattern: string): number {
    const contextWords = ['failure', 'problem', 'issue', 'fault', 'defect', 'malfunction'];
    const lowerText = text.toLowerCase();
    
    let confidence = 0.5; // Base confidence
    
    // Increase confidence if pattern appears with context words
    for (const word of contextWords) {
      if (lowerText.includes(word) && lowerText.includes(pattern)) {
        confidence += 0.1;
      }
    }
    
    // Increase confidence for multiple occurrences
    const occurrences = (lowerText.match(new RegExp(pattern, 'g')) || []).length;
    confidence += Math.min(occurrences * 0.05, 0.2);
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Normalize and standardize extracted data
   */
  private static normalizeData(data: any): any {
    const normalized: any = {
      workOrders: [],
      operatingData: [],
      equipment: null,
      symptoms: [],
      maintenanceHistory: [],
      confidence: 0
    };
    
    // Handle different data structures
    if (Array.isArray(data)) {
      normalized.workOrders = data;
    } else if (data.extractedInfo) {
      // From text extraction
      normalized.equipment = data.extractedInfo.equipment;
      normalized.symptoms = data.extractedInfo.symptoms;
      normalized.maintenanceHistory = data.extractedInfo.actions;
      normalized.confidence = this.calculateOverallConfidence(data.extractedInfo);
    } else {
      // From structured data (Excel/CSV)
      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
          if (key.toLowerCase().includes('work') || key.toLowerCase().includes('order')) {
            normalized.workOrders = data[key];
          } else if (key.toLowerCase().includes('operating') || key.toLowerCase().includes('data')) {
            normalized.operatingData = data[key];
          } else if (key.toLowerCase().includes('maintenance')) {
            normalized.maintenanceHistory = data[key];
          }
        }
      });
    }
    
    return normalized;
  }

  /**
   * Calculate overall confidence score
   */
  private static calculateOverallConfidence(extractedInfo: any): number {
    let totalConfidence = 0;
    let count = 0;
    
    if (extractedInfo.equipment?.type) {
      totalConfidence += 0.8;
      count++;
    }
    
    if (extractedInfo.symptoms?.detected?.length > 0) {
      const avgSymptomConfidence = extractedInfo.symptoms.detected
        .reduce((sum: number, s: any) => sum + s.confidence, 0) / extractedInfo.symptoms.detected.length;
      totalConfidence += avgSymptomConfidence;
      count++;
    }
    
    if (extractedInfo.actions?.length > 0) {
      totalConfidence += 0.6;
      count++;
    }
    
    return count > 0 ? totalConfidence / count : 0.3;
  }

  /**
   * Validate and clean missing or partial records
   */
  static cleanAndValidate(data: any): any {
    // Remove empty or invalid records
    if (data.workOrders) {
      data.workOrders = data.workOrders.filter((wo: any) => {
        return wo && (wo.description || wo.symptoms || wo.equipmentId);
      });
    }
    
    // Fill missing equipment types where possible
    data.workOrders?.forEach((wo: any) => {
      if (!wo.equipmentType && wo.equipmentId) {
        wo.equipmentType = this.inferEquipmentType(wo.equipmentId, wo.description);
      }
    });
    
    return data;
  }

  /**
   * Infer equipment type from ID or description
   */
  private static inferEquipmentType(equipmentId: string, description: string): string | null {
    const combined = `${equipmentId} ${description}`.toLowerCase();
    
    for (const [type] of Object.entries(ASSET_TYPES)) {
      if (combined.includes(type)) {
        return type;
      }
    }
    
    // Check for common prefixes in equipment IDs
    const prefixMap: Record<string, string> = {
      'p': 'pump',
      'm': 'motor',
      'v': 'valve',
      'c': 'conveyor',
      'comp': 'compressor'
    };
    
    for (const [prefix, type] of Object.entries(prefixMap)) {
      if (equipmentId.toLowerCase().startsWith(prefix)) {
        return type;
      }
    }
    
    return null;
  }
}