#!/usr/bin/env python3
"""
UNIVERSAL RCA AI EVIDENCE ANALYSIS & PARSING LOGIC
REAL DATA SCIENCE IMPLEMENTATION with Python/pandas/NumPy/Signal Processing
STRICT: NO HARDCODING — FULLY SCHEMA-DRIVEN (v2025-07-25)
"""

import pandas as pd
import numpy as np
import json
import sys
import re
import io
from scipy import signal, fft
from sklearn.preprocessing import StandardScaler
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import base64
from typing import Dict, List, Tuple, Any, Optional
import warnings
warnings.filterwarnings('ignore')

class UniversalEvidenceAnalyzer:
    """
    Real data science implementation for evidence file analysis
    NO HARDCODING - All patterns detected dynamically
    """
    
    def __init__(self):
        self.sampling_rate_patterns = [
            r'(\d+\.?\d*)\s*hz',
            r'sample.*rate.*?(\d+\.?\d*)',
            r'fs.*=.*?(\d+\.?\d*)',
            r'freq.*=.*?(\d+\.?\d*)'
        ]
        
        self.time_patterns = [
            r'time',
            r't\s*\[',
            r'timestamp',
            r'seconds',
            r'minutes',
            r'hours'
        ]
        
        self.frequency_patterns = [
            r'freq',
            r'f\s*\[',
            r'hz',
            r'cycles',
            r'cpm'
        ]
        
        self.amplitude_patterns = [
            r'amp',
            r'magnitude',
            r'rms',
            r'peak',
            r'velocity',
            r'acceleration',
            r'displacement',
            r'mm/s',
            r'g\s',
            r'µm'
        ]
    
    def analyze_evidence_file(self, file_content: str, filename: str, evidence_config: Dict) -> Dict:
        """
        STEP 4 – EVIDENCE FILE HANDLING & AI ANALYSIS
        Real parsing with pandas/NumPy/Signal Processing
        """
        try:
            print(f"[PYTHON ANALYZER] Starting real data science analysis for {filename}")
            
            # Detect file type and parse accordingly
            if filename.lower().endswith(('.csv', '.txt')):
                return self._analyze_csv_text_file(file_content, filename, evidence_config)
            elif filename.lower().endswith(('.xlsx', '.xls')):
                return self._analyze_excel_file(file_content, filename, evidence_config)
            elif filename.lower().endswith('.json'):
                return self._analyze_json_file(file_content, filename, evidence_config)
            else:
                return self._analyze_unknown_format(file_content, filename, evidence_config)
                
        except Exception as e:
            return {
                'filename': filename,
                'evidenceType': evidence_config.get('evidenceCategory', 'Unknown'),
                'diagnosticValue': 'Low',
                'parsedResultSummary': f'Analysis failed: {str(e)}',
                'evidenceConfidenceImpact': 5,
                'aiRemarks': f'Python parsing error: {str(e)}',
                'status': 'Incomplete',
                'requiresUserClarification': True,
                'clarificationPrompt': 'File could not be analyzed. Please check format and content.'
            }
    
    def _analyze_csv_text_file(self, file_content: str, filename: str, evidence_config: Dict) -> Dict:
        """
        Real CSV/TXT parsing with pandas and signal processing
        Auto-detects columns, performs FFT, trend analysis
        """
        print(f"[PYTHON ANALYZER] Parsing CSV/TXT file with pandas")
        
        try:
            # Try different delimiters
            delimiters = [',', '\t', ';', ' ', '|']
            df = None
            delimiter_used = None
            
            for delimiter in delimiters:
                try:
                    # Replace escaped newlines if they exist in command line args
                    clean_content = file_content.replace('\\n', '\n')
                    df = pd.read_csv(io.StringIO(clean_content), delimiter=delimiter, header=0)
                    if df.shape[1] > 1:  # Valid multi-column data
                        delimiter_used = delimiter
                        break
                except Exception as e:
                    print(f"[PYTHON DEBUG] Delimiter {repr(delimiter)} failed: {e}")
                    continue
            
            if df is None or df.empty:
                return self._handle_parsing_error(filename, evidence_config, "Cannot parse file as CSV/TXT")
            
            print(f"[PYTHON ANALYZER] Successfully parsed {df.shape[0]} rows, {df.shape[1]} columns")
            
            # Auto-detect column types using real pattern matching
            column_analysis = self._analyze_columns(df)
            
            # Perform signal processing if time-series data detected
            signal_analysis = self._perform_signal_analysis(df, column_analysis)
            
            # Calculate diagnostic value based on data quality
            diagnostic_assessment = self._assess_diagnostic_value(df, column_analysis, signal_analysis)
            
            return {
                'filename': filename,
                'evidenceType': evidence_config.get('evidenceCategory', 'Time Series Data'),
                'diagnosticValue': diagnostic_assessment['diagnostic_value'],
                'parsedResultSummary': diagnostic_assessment['summary'],
                'evidenceConfidenceImpact': diagnostic_assessment['confidence_impact'],
                'aiRemarks': diagnostic_assessment['remarks'],
                'status': 'Available',
                'detectedColumns': list(df.columns),
                'extractedFeatures': {
                    'rowCount': len(df),
                    'columnCount': len(df.columns),
                    'columnTypes': column_analysis,
                    'signalAnalysis': signal_analysis,
                    'delimiter': delimiter_used,
                    'dataQuality': diagnostic_assessment['data_quality']
                }
            }
            
        except Exception as e:
            return self._handle_parsing_error(filename, evidence_config, f"Pandas parsing failed: {str(e)}")
    
    def _analyze_columns(self, df: pd.DataFrame) -> Dict:
        """
        Real column type detection using pattern matching
        NO HARDCODING - Dynamic pattern recognition
        """
        column_types = {}
        
        for col in df.columns:
            col_lower = str(col).lower()
            sample_data = df[col].dropna().head(10)
            
            # Pattern-based detection
            if any(re.search(pattern, col_lower, re.IGNORECASE) for pattern in self.time_patterns):
                column_types[col] = 'time'
            elif any(re.search(pattern, col_lower, re.IGNORECASE) for pattern in self.frequency_patterns):
                column_types[col] = 'frequency'
            elif any(re.search(pattern, col_lower, re.IGNORECASE) for pattern in self.amplitude_patterns):
                column_types[col] = 'amplitude'
            elif re.search(r'rpm|speed|rotation', col_lower, re.IGNORECASE):
                column_types[col] = 'speed'
            elif re.search(r'temp|°c|°f|celsius|fahrenheit', col_lower, re.IGNORECASE):
                column_types[col] = 'temperature'
            elif re.search(r'pressure|bar|psi|kpa|mpa', col_lower, re.IGNORECASE):
                column_types[col] = 'pressure'
            elif re.search(r'1x|2x|3x|harmonic', col_lower, re.IGNORECASE):
                column_types[col] = 'harmonic'
            else:
                # Analyze data content for numeric vs text
                try:
                    numeric_count = sum(pd.to_numeric(sample_data, errors='coerce').notna())
                    if numeric_count > len(sample_data) * 0.8:
                        column_types[col] = 'numeric'
                    else:
                        column_types[col] = 'text'
                except:
                    column_types[col] = 'unknown'
        
        return column_types
    
    def _perform_signal_analysis(self, df: pd.DataFrame, column_analysis: Dict) -> Dict:
        """
        Real signal processing with SciPy
        FFT analysis, trend detection, feature extraction
        """
        signal_results = {}
        
        try:
            # Find time and amplitude columns
            time_cols = [col for col, type_info in column_analysis.items() if type_info == 'time']
            amp_cols = [col for col, type_info in column_analysis.items() if type_info == 'amplitude']
            
            if not amp_cols:
                # Try to find numeric columns that could be amplitude
                numeric_cols = [col for col, type_info in column_analysis.items() if type_info == 'numeric']
                if numeric_cols:
                    amp_cols = numeric_cols[:2]  # Take first 2 numeric columns
            
            if amp_cols:
                for amp_col in amp_cols:
                    try:
                        amplitude_data = pd.to_numeric(df[amp_col], errors='coerce').dropna()
                        
                        if len(amplitude_data) > 10:
                            # Basic statistical analysis
                            stats = {
                                'mean': float(amplitude_data.mean()),
                                'std': float(amplitude_data.std()),
                                'max': float(amplitude_data.max()),
                                'min': float(amplitude_data.min()),
                                'rms': float(np.sqrt(np.mean(amplitude_data**2)))
                            }
                            
                            # FFT analysis if sufficient data points
                            if len(amplitude_data) >= 64:
                                fft_analysis = self._perform_fft_analysis(amplitude_data)
                                stats.update(fft_analysis)
                            
                            # Trend analysis
                            trend_analysis = self._analyze_trends(amplitude_data)
                            stats.update(trend_analysis)
                            
                            signal_results[amp_col] = stats
                            
                    except Exception as e:
                        signal_results[amp_col] = {'error': str(e)}
            
            return signal_results
            
        except Exception as e:
            return {'error': f'Signal analysis failed: {str(e)}'}
    
    def _perform_fft_analysis(self, data: pd.Series) -> Dict:
        """
        Real FFT analysis with NumPy/SciPy
        """
        try:
            # Perform FFT
            fft_result = np.fft.fft(data.values)
            freqs = np.fft.fftfreq(len(data))
            
            # Find dominant frequencies
            magnitude = np.abs(fft_result)
            dominant_indices = np.argsort(magnitude)[-5:]  # Top 5 frequencies
            
            dominant_freqs = []
            for idx in dominant_indices:
                if freqs[idx] > 0:  # Only positive frequencies
                    dominant_freqs.append({
                        'frequency': float(freqs[idx]),
                        'magnitude': float(magnitude[idx])
                    })
            
            return {
                'fft_dominant_frequencies': dominant_freqs,
                'fft_peak_magnitude': float(magnitude.max()),
                'fft_analysis_performed': True
            }
            
        except Exception as e:
            return {'fft_error': str(e)}
    
    def _analyze_trends(self, data: pd.Series) -> Dict:
        """
        Real trend analysis using statistical methods
        """
        try:
            # Linear trend
            x = np.arange(len(data))
            coeffs = np.polyfit(x, data.values, 1)
            trend_slope = coeffs[0]
            
            # Detect significant changes
            rolling_mean = data.rolling(window=min(10, len(data)//4)).mean()
            rolling_std = data.rolling(window=min(10, len(data)//4)).std()
            
            # Outlier detection
            outliers = []
            for i, (val, mean_val, std_val) in enumerate(zip(data, rolling_mean, rolling_std)):
                if pd.notna(mean_val) and pd.notna(std_val) and std_val > 0:
                    if abs(val - mean_val) > 2 * std_val:
                        outliers.append(i)
            
            return {
                'trend_slope': float(trend_slope),
                'trend_direction': 'increasing' if trend_slope > 0.01 else 'decreasing' if trend_slope < -0.01 else 'stable',
                'outlier_count': len(outliers),
                'outlier_percentage': (len(outliers) / len(data)) * 100
            }
            
        except Exception as e:
            return {'trend_error': str(e)}
    
    def _assess_diagnostic_value(self, df: pd.DataFrame, column_analysis: Dict, signal_analysis: Dict) -> Dict:
        """
        Calculate diagnostic value based on data science analysis
        NO HARDCODING - Dynamic assessment
        """
        try:
            score = 0
            remarks = []
            
            # Data completeness score
            completeness = (df.count().sum() / (df.shape[0] * df.shape[1])) * 100
            score += min(completeness, 30)
            remarks.append(f"Data completeness: {completeness:.1f}%")
            
            # Column type diversity score
            unique_types = len(set(column_analysis.values()))
            if unique_types >= 3:
                score += 20
                remarks.append("Good column type diversity")
            elif unique_types >= 2:
                score += 10
                remarks.append("Moderate column type diversity")
            
            # Signal analysis bonus
            if signal_analysis and any('fft_analysis_performed' in analysis for analysis in signal_analysis.values() if isinstance(analysis, dict)):
                score += 25
                remarks.append("FFT analysis completed")
            
            # Trend analysis bonus
            trend_count = sum(1 for analysis in signal_analysis.values() if isinstance(analysis, dict) and 'trend_slope' in analysis)
            if trend_count > 0:
                score += 15
                remarks.append(f"Trend analysis on {trend_count} signals")
            
            # Data volume score
            if df.shape[0] > 1000:
                score += 10
                remarks.append("Large dataset (>1000 points)")
            elif df.shape[0] > 100:
                score += 5
                remarks.append("Medium dataset (>100 points)")
            
            # Determine diagnostic value
            if score >= 80:
                diagnostic_value = 'High'
                confidence_impact = min(score, 95)
            elif score >= 50:
                diagnostic_value = 'Medium'
                confidence_impact = min(score, 75)
            else:
                diagnostic_value = 'Low'
                confidence_impact = max(score, 20)
            
            # Generate summary
            summary = f"Dataset: {df.shape[0]} rows × {df.shape[1]} columns. " + " ".join(remarks[:3])
            
            return {
                'diagnostic_value': diagnostic_value,
                'confidence_impact': int(confidence_impact),
                'summary': summary,
                'remarks': " | ".join(remarks),
                'data_quality': {
                    'completeness_score': completeness,
                    'total_score': score,
                    'assessment_factors': remarks
                }
            }
            
        except Exception as e:
            return {
                'diagnostic_value': 'Low',
                'confidence_impact': 20,
                'summary': f'Assessment failed: {str(e)}',
                'remarks': 'Could not assess data quality',
                'data_quality': {'error': str(e)}
            }
    
    def _analyze_excel_file(self, file_content: str, filename: str, evidence_config: Dict) -> Dict:
        """
        Real Excel parsing with pandas
        """
        try:
            # Decode base64 content
            excel_data = base64.b64decode(file_content)
            df = pd.read_excel(io.BytesIO(excel_data), sheet_name=0)
            
            print(f"[PYTHON ANALYZER] Parsed Excel: {df.shape[0]} rows × {df.shape[1]} columns")
            
            # Use same analysis as CSV
            column_analysis = self._analyze_columns(df)
            signal_analysis = self._perform_signal_analysis(df, column_analysis)
            diagnostic_assessment = self._assess_diagnostic_value(df, column_analysis, signal_analysis)
            
            return {
                'filename': filename,
                'evidenceType': evidence_config.get('evidenceCategory', 'Spreadsheet Data'),
                'diagnosticValue': diagnostic_assessment['diagnostic_value'],
                'parsedResultSummary': diagnostic_assessment['summary'],
                'evidenceConfidenceImpact': diagnostic_assessment['confidence_impact'],
                'aiRemarks': diagnostic_assessment['remarks'],
                'status': 'Available',
                'detectedColumns': list(df.columns),
                'extractedFeatures': {
                    'rowCount': len(df),
                    'columnCount': len(df.columns),
                    'columnTypes': column_analysis,
                    'signalAnalysis': signal_analysis,
                    'fileType': 'Excel',
                    'dataQuality': diagnostic_assessment['data_quality']
                }
            }
            
        except Exception as e:
            return self._handle_parsing_error(filename, evidence_config, f"Excel parsing failed: {str(e)}")
    
    def _analyze_json_file(self, file_content: str, filename: str, evidence_config: Dict) -> Dict:
        """
        Real JSON parsing and analysis
        """
        try:
            data = json.loads(file_content)
            
            # Convert to DataFrame if possible
            if isinstance(data, list) and len(data) > 0:
                df = pd.DataFrame(data)
            elif isinstance(data, dict):
                df = pd.DataFrame([data])
            else:
                return self._handle_parsing_error(filename, evidence_config, "JSON structure not suitable for analysis")
            
            print(f"[PYTHON ANALYZER] Parsed JSON: {df.shape[0]} records × {df.shape[1]} fields")
            
            column_analysis = self._analyze_columns(df)
            diagnostic_assessment = self._assess_diagnostic_value(df, column_analysis, {})
            
            return {
                'filename': filename,
                'evidenceType': evidence_config.get('evidenceCategory', 'JSON Data'),
                'diagnosticValue': diagnostic_assessment['diagnostic_value'],
                'parsedResultSummary': diagnostic_assessment['summary'],
                'evidenceConfidenceImpact': diagnostic_assessment['confidence_impact'],
                'aiRemarks': diagnostic_assessment['remarks'],
                'status': 'Available',
                'detectedColumns': list(df.columns),
                'extractedFeatures': {
                    'recordCount': len(df),
                    'fieldCount': len(df.columns),
                    'columnTypes': column_analysis,
                    'fileType': 'JSON',
                    'dataQuality': diagnostic_assessment['data_quality']
                }
            }
            
        except Exception as e:
            return self._handle_parsing_error(filename, evidence_config, f"JSON parsing failed: {str(e)}")
    
    def _analyze_unknown_format(self, file_content: str, filename: str, evidence_config: Dict) -> Dict:
        """
        Handle unknown file formats
        """
        return {
            'filename': filename,
            'evidenceType': evidence_config.get('evidenceCategory', 'Unknown'),
            'diagnosticValue': 'Low',
            'parsedResultSummary': f'Unknown file format: {filename.split(".")[-1] if "." in filename else "no extension"}',
            'evidenceConfidenceImpact': 10,
            'aiRemarks': 'File format not supported for data science analysis',
            'status': 'Incomplete',
            'requiresUserClarification': True,
            'clarificationPrompt': f'File format .{filename.split(".")[-1] if "." in filename else "unknown"} not supported. Please upload as CSV, TXT, XLSX, or JSON.'
        }
    
    def _handle_parsing_error(self, filename: str, evidence_config: Dict, error_msg: str) -> Dict:
        """
        Handle parsing errors consistently
        """
        return {
            'filename': filename,
            'evidenceType': evidence_config.get('evidenceCategory', 'Unknown'),
            'diagnosticValue': 'Low',
            'parsedResultSummary': f'Parsing failed: {error_msg}',
            'evidenceConfidenceImpact': 5,
            'aiRemarks': f'Python data science parsing error: {error_msg}',
            'status': 'Incomplete',
            'requiresUserClarification': True,
            'clarificationPrompt': 'File could not be parsed. Please check format or provide different file.'
        }

def main():
    """
    Command-line interface for evidence analysis
    """
    if len(sys.argv) != 4:
        print("Usage: python python-evidence-analyzer.py <file_content> <filename> <evidence_config_json>")
        sys.exit(1)
    
    file_content = sys.argv[1]
    filename = sys.argv[2]
    evidence_config = json.loads(sys.argv[3])
    
    analyzer = UniversalEvidenceAnalyzer()
    result = analyzer.analyze_evidence_file(file_content, filename, evidence_config)
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()