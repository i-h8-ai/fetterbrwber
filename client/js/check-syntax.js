// Simple syntax checker for Node.js
// Run with: node check-syntax.js

const fs = require('fs');
const path = require('path');

const jsFiles = [
    'client/js/math.js',
    'client/js/renderer.js',
    'client/js/input.js', 
    'client/js/network.js',
    'client/js/effects.js',
    'client/js/ui.js',
    'client/js/player.js',
    'client/js/game.js',
    'client/js/main.js'
];

console.log('🔍 Checking JavaScript syntax...\n');

let hasErrors = false;

for (const file of jsFiles) {
    try {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            
            // Basic syntax check
            new Function(content.replace(/import|export/g, '//'));
            
            // Check for common issues
            const issues = [];
            
            // Check for unmatched braces
            const openBraces = (content.match(/{/g) || []).length;
            const closeBraces = (content.match(/}/g) || []).length;
            if (openBraces !== closeBraces) {
                issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
            }
            
            // Check for unmatched parentheses
            const openParens = (content.match(/\(/g) || []).length;
            const closeParens = (content.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
            }
            
            // Check for trailing commas in objects
            if (content.match(/,\s*[}\]]/)) {
                issues.push('Possible trailing comma before closing brace/bracket');
            }
            
            if (issues.length > 0) {
                console.log(`⚠️  ${file}:`);
                issues.forEach(issue => console.log(`   - ${issue}`));
                hasErrors = true;
            } else {
                console.log(`✅ ${file} - OK`);
            }
        } else {
            console.log(`❌ ${file} - File not found`);
            hasErrors = true;
        }
    } catch (error) {
        console.log(`❌ ${file} - Syntax Error:`);
        console.log(`   ${error.message}`);
        hasErrors = true;
    }
}

console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.log('❌ Issues found! Check the files above.');
    process.exit(1);
} else {
    console.log('✅ All files pass syntax check!');
}
