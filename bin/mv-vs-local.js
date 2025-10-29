#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * mv-vslocal: Move/rename files while staying within VS Code workspace bounds
 * 
 * This tool finds the VS Code workspace root and ensures you don't move files outside of it.
 * It looks for workspace indicators like .vscode/, .git/, package.json, etc.
 */

function findWorkspaceRoot(startPath) {
    let currentPath = path.resolve(startPath);
    
    while (currentPath !== path.dirname(currentPath)) { // Not at filesystem root
        // Check for VS Code workspace indicators
        const vscodeDir = path.join(currentPath, '.vscode');
        const gitDir = path.join(currentPath, '.git');
        const packageJson = path.join(currentPath, 'package.json');
        const workspaceFile = fs.readdirSync(currentPath).find(file => file.endsWith('.code-workspace'));
        
        if (fs.existsSync(vscodeDir) || 
            fs.existsSync(gitDir) || 
            fs.existsSync(packageJson) || 
            workspaceFile) {
            return currentPath;
        }
        
        currentPath = path.dirname(currentPath);
    }
    
    return null;
}

function isWithinWorkspace(targetPath, workspaceRoot) {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedWorkspace = path.resolve(workspaceRoot);
    
    return resolvedTarget.startsWith(resolvedWorkspace + path.sep) || resolvedTarget === resolvedWorkspace;
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Usage: mv-vs-local <source> <destination>');
        console.log('');
        console.log('Move/rename files while staying within VS Code workspace bounds.');
        console.log('');
        console.log('This tool:');
        console.log('  - Finds the workspace root (looks for .vscode/, .git/, package.json, *.code-workspace)');
        console.log('  - Prevents moving files outside of the workspace');
        console.log('  - Shows the resolved paths and workspace context');
        console.log('');
        console.log('Options:');
        console.log('  --help, -h      Show this help message');
        console.log('  --check         Just check if paths are within workspace (no move)');
        console.log('  --show-root     Show the detected workspace root');
        console.log('');
        console.log('Examples:');
        console.log('  mv-vs-local old.txt new.txt                # Rename file');
        console.log('  mv-vs-local src/file.js lib/file.js        # Move file within workspace');
        console.log('  mv-vs-local temp/ archive/                 # Move directory');
        console.log('  mv-vs-local --check src/file.js ../outside # Check if move would be allowed');
        process.exit(0);
    }
    
    const currentDir = process.cwd();
    const workspaceRoot = findWorkspaceRoot(currentDir);
    
    if (!workspaceRoot) {
        console.error('❌ Could not find workspace root');
        console.error('   (looked for .vscode/, .git/, package.json, *.code-workspace)');
        process.exit(1);
    }
    
    if (args.includes('--show-root')) {
        console.log(`📁 Workspace root: ${workspaceRoot}`);
        process.exit(0);
    }
    
    const nonFlagArgs = args.filter(arg => !arg.startsWith('--'));
    if (nonFlagArgs.length !== 2) {
        console.error('❌ Please provide source and destination paths');
        console.error('Usage: mv-vs-local <source> <destination>');
        console.error('Use --help for more information');
        process.exit(1);
    }
    
    const [sourcePath, destPath] = nonFlagArgs;
    const absoluteSourcePath = path.resolve(currentDir, sourcePath);
    const absoluteDestPath = path.resolve(currentDir, destPath);
    
    if (args.includes('--check')) {
        const sourceWithinWorkspace = isWithinWorkspace(absoluteSourcePath, workspaceRoot);
        const destWithinWorkspace = isWithinWorkspace(absoluteDestPath, workspaceRoot);
        console.log(`Source: ${absoluteSourcePath}`);
        console.log(`Destination: ${absoluteDestPath}`);
        console.log(`Workspace: ${workspaceRoot}`);
        console.log(`Source within workspace: ${sourceWithinWorkspace ? '✅ Yes' : '❌ No'}`);
        console.log(`Destination within workspace: ${destWithinWorkspace ? '✅ Yes' : '❌ No'}`);
        process.exit((sourceWithinWorkspace && destWithinWorkspace) ? 0 : 1);
    }
    
    if (!fs.existsSync(absoluteSourcePath)) {
        console.error(`❌ Source does not exist: ${absoluteSourcePath}`);
        process.exit(1);
    }
    
    if (!isWithinWorkspace(absoluteSourcePath, workspaceRoot)) {
        console.error(`❌ Source is outside workspace bounds`);
        console.error(`   Source: ${absoluteSourcePath}`);
        console.error(`   Workspace: ${workspaceRoot}`);
        console.error(`   Use regular 'mv' if you need to work outside the workspace`);
        process.exit(1);
    }
    
    if (!isWithinWorkspace(absoluteDestPath, workspaceRoot)) {
        console.error(`❌ Destination is outside workspace bounds`);
        console.error(`   Destination: ${absoluteDestPath}`);
        console.error(`   Workspace: ${workspaceRoot}`);
        console.error(`   Use regular 'mv' if you need to work outside the workspace`);
        process.exit(1);
    }
    
    // Create destination directory if needed
    const destDir = path.dirname(absoluteDestPath);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`📁 Created directory: ${destDir}`);
    }
    
    // Perform the move
    try {
        fs.renameSync(absoluteSourcePath, absoluteDestPath);
        
        const relativeSource = path.relative(currentDir, absoluteSourcePath);
        const relativeDest = path.relative(currentDir, absoluteDestPath);
        const relativeSourceToWorkspace = path.relative(workspaceRoot, absoluteSourcePath);
        const relativeDestToWorkspace = path.relative(workspaceRoot, absoluteDestPath);
        
        console.log(`✅ mv ${relativeSource} → ${relativeDest}`);
        console.log(`📂 ${absoluteSourcePath} → ${absoluteDestPath}`);
        console.log(`🏠 Workspace: ${relativeSourceToWorkspace || '(root)'} → ${relativeDestToWorkspace || '(root)'}`);
        
    } catch (error) {
        console.error(`❌ Failed to move: ${error.message}`);
        process.exit(1);
    }
}

main();