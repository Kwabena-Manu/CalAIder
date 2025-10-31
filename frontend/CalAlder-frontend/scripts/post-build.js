// scripts/post-build.js
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function postBuild() {
    try {
        const distDir = path.join(projectRoot, 'dist');

        // Ensure the manifest.json is in the right place
        if (!fs.existsSync(path.join(distDir, 'manifest.json'))) {
            console.error('manifest.json not found in dist directory!');
            process.exit(1);
        }

        // Check for required extension files
        const requiredFiles = ['background.js', 'content.js', 'index.html'];
        for (const file of requiredFiles) {
            if (!fs.existsSync(path.join(distDir, file))) {
                console.error(`Required file ${file} not found in dist directory!`);
                process.exit(1);
            }
        }

        // Create a zip file for extension submission (optional)
        // if you have the zip-lib installed
        // await zip(distDir, path.join(projectRoot, 'extension.zip'));

        console.log('Extension build completed successfully!');
        console.log('You can now load the dist directory as an unpacked extension in Chrome.');
    } catch (error) {
        console.error('Error in post-build script:', error);
        process.exit(1);
    }
}

postBuild();