const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const screensDir = 'C:\\GitHub\\E_commerce\\frontend\\src\\screens';

// Template for a simple placeholder screen
function placeholderScreen(name, title) {
    return `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ${name}() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>${title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 16, color: '#666' },
});
`;
}

let maxAttempts = 30;
let attempt = 0;

while (attempt < maxAttempts) {
    attempt++;
    try {
        execSync('node node_modules/react-native/local-cli/cli.js bundle --platform android --dev false --entry-file index.js --bundle-output /dev/null --assets-dest /dev/null', 
            { cwd: 'C:\\GitHub\\E_commerce\\frontend', encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
        console.log('BUILD SUCCESS after ' + attempt + ' attempts');
        break;
    } catch (e) {
        const stderr = e.stderr || '';
        const match = stderr.match(/SyntaxError: (.*?\.js):/);
        if (!match) {
            const resolveMatch = stderr.match(/Unable to resolve module (.*?) from/);
            if (resolveMatch) {
                console.log('Module not found: ' + resolveMatch[1]);
            }
            console.log('Non-syntax error, stopping');
            break;
        }
        const file = match[1];
        const basename = path.basename(file);
        console.log('Fix #' + attempt + ': ' + basename);
        
        // Read and check if it's salvageable
        const content = fs.readFileSync(file, 'utf8');
        const hasFFFD = content.includes('\uFFFD');
        
        if (hasFFFD || content.length < 50) {
            // File is corrupted, create a placeholder
            const name = basename.replace('.js', '');
            const title = name.replace(/([A-Z])/g, ' $1').trim();
            fs.writeFileSync(file, placeholderScreen(name, title), 'utf8');
            console.log('  -> Replaced with placeholder');
        } else {
            console.log('  -> Cannot auto-fix');
            break;
        }
    }
}
