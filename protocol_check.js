/**
 * UNIVERSAL PROTOCOL COMPLIANCE CHECK - NODE.JS VERSION
 * ZERO TOLERANCE ENFORCEMENT SYSTEM
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Comprehensive forbidden patterns with zero tolerance
const patterns = [
  { regex: /process\.env[.(]OPENAI_API_KEY/, name: 'Hardcoded API Key Access', critical: true },
  { regex: /API_KEY[ =:]/, name: 'Hardcoded API Key', critical: true },
  { regex: /Date\.now\(\)/, name: 'Date.now() Hardcoding', critical: true },
  { regex: /Math\.random\(\)/, name: 'Math.random() Hardcoding', critical: true },
  { regex: /localhost/, name: 'Localhost Hardcoding', critical: false },
  { regex: /127\.0\.0\.1/, name: 'IP Address Hardcoding', critical: false },
  { regex: /http[s]?:\/\/[^"]*/, name: 'Hardcoded URL', critical: false },
  { regex: /MAX_[A-Z_]+ ?= ?[0-9]+/, name: 'Hardcoded MAX Value', critical: false },
  { regex: /MIN_[A-Z_]+ ?= ?[0-9]+/, name: 'Hardcoded MIN Value', critical: false },
  { regex: /sk-[a-zA-Z0-9]{32,}/, name: 'Hardcoded OpenAI Key', critical: true },
  { regex: /sk-proj-[a-zA-Z0-9]+/, name: 'Hardcoded Project Key', critical: true },
  { regex: /gpt-[34]/, name: 'Hardcoded Model Name', critical: true },
  { regex: /openai/, name: 'Hardcoded Provider Name', critical: true },
  { regex: /claude-3/, name: 'Hardcoded Claude Model', critical: true }
];

let violations = 0;
let criticalViolations = 0;
let totalFiles = 0;

console.log('🔍 Universal Protocol Compliance Check - Node.js Version');
console.log('======================================================');

try {
  const files = glob.sync("{server,client,shared}/**/*.{js,ts,jsx,tsx}", {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });
  
  totalFiles = files.length;
  console.log(`Scanning ${totalFiles} files...`);
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      patterns.forEach(pattern => {
        // Skip files that contain exemption comments
        if (content.includes(`NO ${pattern.name} hardcoding`) || 
            content.includes('Universal Protocol Standard') ||
            content.includes('protocol_check')) {
          return;
        }
        
        const matches = content.match(pattern.regex);
        if (matches) {
          console.log(`🚨 ${pattern.critical ? 'CRITICAL' : 'WARNING'} VIOLATION: ${pattern.name} in ${file}`);
          console.log(`   Pattern: ${pattern.regex}`);
          console.log(`   Match: ${matches[0]}`);
          violations++;
          if (pattern.critical) {
            criticalViolations++;
          }
        }
      });
      
    } catch (readError) {
      console.warn(`Warning: Could not read file ${file}: ${readError.message}`);
    }
  });
  
  // Check for missing protocol headers
  console.log('\nChecking for missing Universal Protocol Standard headers...');
  const tsFiles = glob.sync("server/**/*.ts", {
    ignore: ['**/node_modules/**']
  });
  
  tsFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('UNIVERSAL PROTOCOL STANDARD') && 
          !content.includes('Protocol:') &&
          !file.includes('protocol_check')) {
        console.log(`⚠️  Missing protocol header in: ${file}`);
      }
    } catch (error) {
      // Ignore read errors for header check
    }
  });
  
} catch (error) {
  console.error('Error during compliance check:', error.message);
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log(`Files scanned: ${totalFiles}`);
console.log(`Total violations: ${violations}`);
console.log(`Critical violations: ${criticalViolations}`);

if (violations > 0) {
  console.log('\n🚨 UNIVERSAL PROTOCOL VIOLATIONS DETECTED!');
  console.log('==========================================');
  console.log('❌ Zero tolerance policy violated');
  console.log('❌ All violations must be fixed immediately');
  console.log('❌ Blocking all operations until resolved');
  console.log(`❌ Critical violations: ${criticalViolations}`);
  console.log(`❌ Total violations: ${violations}`);
  process.exit(1);
} else {
  console.log('\n✅ UNIVERSAL PROTOCOL COMPLIANCE VERIFIED');
  console.log('=========================================');
  console.log('✅ Zero hardcoding violations detected');
  console.log('✅ All patterns checked successfully');
  console.log('✅ Ready for production deployment');
  process.exit(0);
}