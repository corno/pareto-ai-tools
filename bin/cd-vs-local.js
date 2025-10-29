#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * cd-local: Change directory while staying within VS Code workspace bounds
 * 
 * This tool finds the VS Code workspace root and ensures you don't cd outside of it.
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
        console.log('Usage: cd-vs-local <directory>');
        console.log('');
        console.log('Change directory while staying within VS Code workspace bounds.');
        console.log('');
        console.log('This tool:');
        console.log('  - Finds the workspace root (looks for .vscode/, .git/, package.json, *.code-workspace)');
        console.log('  - Prevents cd outside of the workspace');
        console.log('  - Shows the resolved path and workspace context');
        console.log('');
        console.log('Options:');
        console.log('  --help, -h      Show this help message');
        console.log('  --check         Just check if a path is within workspace (no cd)');
        console.log('  --show-root     Show the detected workspace root');
        console.log('');
        console.log('Examples:');
        console.log('  cd-vs-local ../other-project     # cd to sibling project if within workspace');
        console.log('  cd-vs-local ../../               # Blocked if it would exit workspace');
        console.log('  cd-vs-local --show-root          # Show workspace root');
        console.log('  cd-vs-local --check ../path      # Check if path is within workspace');
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
    
    const targetPath = args.find(arg => !arg.startsWith('--'));
    if (!targetPath) {
        console.error('❌ Please provide a target directory');
        console.error('Usage: cd-vs-local <directory>');
        console.error('Use --help for more information');
        process.exit(1);
    }
    
    const absoluteTargetPath = path.resolve(currentDir, targetPath);
    
    if (args.includes('--check')) {
        const withinWorkspace = isWithinWorkspace(absoluteTargetPath, workspaceRoot);
        console.log(`Path: ${absoluteTargetPath}`);
        console.log(`Workspace: ${workspaceRoot}`);
        console.log(`Within workspace: ${withinWorkspace ? '✅ Yes' : '❌ No'}`);
        process.exit(withinWorkspace ? 0 : 1);
    }
    
    if (!fs.existsSync(absoluteTargetPath)) {
        console.error(`❌ Directory does not exist: ${absoluteTargetPath}`);
        process.exit(1);
    }
    
    if (!fs.statSync(absoluteTargetPath).isDirectory()) {
        console.error(`❌ Not a directory: ${absoluteTargetPath}`);
        process.exit(1);
    }
    
    if (!isWithinWorkspace(absoluteTargetPath, workspaceRoot)) {
        console.error(`❌ Target directory is outside workspace bounds`);
        console.error(`   Target: ${absoluteTargetPath}`);
        console.error(`   Workspace: ${workspaceRoot}`);
        console.error(`   Use regular 'cd' if you need to go outside the workspace`);
        process.exit(1);
    }
    
    // Success! The path is valid and within workspace
    const relativePath = path.relative(currentDir, absoluteTargetPath);
    const relativeToWorkspace = path.relative(workspaceRoot, absoluteTargetPath);
    
    console.log(`✅ cd ${relativePath}`);
    console.log(`📁 ${absoluteTargetPath}`);
    console.log(`🏠 Workspace: ${relativeToWorkspace || '(root)'}`);
    
    // For shell integration, output the cd command
    // Shell wrapper can source this output
    console.log(`CHANGE_DIR=${absoluteTargetPath}`);
}

main();