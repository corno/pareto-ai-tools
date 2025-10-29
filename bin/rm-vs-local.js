#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * rm-vslocal: Remove files while staying within VS Code workspace bounds
 * 
 * This tool finds the VS Code workspace root and ensures you don't remove files outside of it.
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

function removeRecursively(targetPath) {
    const stats = fs.statSync(targetPath);
    
    if (stats.isDirectory()) {
        const files = fs.readdirSync(targetPath);
        for (const file of files) {
            removeRecursively(path.join(targetPath, file));
        }
        fs.rmdirSync(targetPath);
    } else {
        fs.unlinkSync(targetPath);
    }
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('Usage: rm-vs-local [options] <file1> [file2] ...');
        console.log('');
        console.log('Remove files while staying within VS Code workspace bounds.');
        console.log('');
        console.log('This tool:');
        console.log('  - Finds the workspace root (looks for .vscode/, .git/, package.json, *.code-workspace)');
        console.log('  - Prevents removing files outside of the workspace');
        console.log('  - Shows the resolved paths and workspace context');
        console.log('');
        console.log('Options:');
        console.log('  --help, -h      Show this help message');
        console.log('  --check         Just check if paths are within workspace (no removal)');
        console.log('  --show-root     Show the detected workspace root');
        console.log('  --recursive, -r Remove directories recursively');
        console.log('  --force, -f     Force removal without confirmation');
        console.log('');
        console.log('Examples:');
        console.log('  rm-vs-local temp.txt                      # Remove file');
        console.log('  rm-vs-local file1.txt file2.txt          # Remove multiple files');
        console.log('  rm-vs-local --recursive temp/             # Remove directory recursively');
        console.log('  rm-vs-local --check ../outside-file.txt  # Check if removal would be allowed');
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
    
    const isRecursive = args.includes('--recursive') || args.includes('-r');
    const isForce = args.includes('--force') || args.includes('-f');
    const isCheck = args.includes('--check');
    
    const targetPaths = args.filter(arg => !arg.startsWith('--') && arg !== '-r' && arg !== '-f');
    
    if (targetPaths.length === 0) {
        console.error('❌ Please provide at least one file or directory to remove');
        console.error('Usage: rm-vs-local [options] <file1> [file2] ...');
        console.error('Use --help for more information');
        process.exit(1);
    }
    
    const resolvedPaths = targetPaths.map(p => {
        const absolute = path.resolve(currentDir, p);
        return { original: p, absolute, relative: path.relative(currentDir, absolute) };
    });
    
    if (isCheck) {
        console.log(`Workspace: ${workspaceRoot}`);
        for (const pathInfo of resolvedPaths) {
            const withinWorkspace = isWithinWorkspace(pathInfo.absolute, workspaceRoot);
            console.log(`${pathInfo.absolute}: ${withinWorkspace ? '✅ Within workspace' : '❌ Outside workspace'}`);
        }
        const allWithin = resolvedPaths.every(p => isWithinWorkspace(p.absolute, workspaceRoot));
        process.exit(allWithin ? 0 : 1);
    }
    
    // Validate all paths are within workspace before removing any
    for (const pathInfo of resolvedPaths) {
        if (!isWithinWorkspace(pathInfo.absolute, workspaceRoot)) {
            console.error(`❌ Target is outside workspace bounds`);
            console.error(`   Target: ${pathInfo.absolute}`);
            console.error(`   Workspace: ${workspaceRoot}`);
            console.error(`   Use regular 'rm' if you need to work outside the workspace`);
            process.exit(1);
        }
        
        if (!fs.existsSync(pathInfo.absolute)) {
            console.error(`❌ File does not exist: ${pathInfo.absolute}`);
            process.exit(1);
        }
        
        const stats = fs.statSync(pathInfo.absolute);
        if (stats.isDirectory() && !isRecursive) {
            console.error(`❌ ${pathInfo.absolute} is a directory`);
            console.error('   Use --recursive to remove directories');
            process.exit(1);
        }
    }
    
    // Show what will be removed and ask for confirmation (unless forced)
    if (!isForce && resolvedPaths.length > 0) {
        console.log('Will remove:');
        for (const pathInfo of resolvedPaths) {
            const stats = fs.statSync(pathInfo.absolute);
            const type = stats.isDirectory() ? 'directory' : 'file';
            const relativeToWorkspace = path.relative(workspaceRoot, pathInfo.absolute);
            console.log(`  ${type}: ${pathInfo.relative} (workspace: ${relativeToWorkspace || '(root)'})`);
        }
        
        // In a real interactive environment, you'd want to prompt here
        // For now, we'll proceed since this is meant for AI use
        console.log('⚠️  Proceeding with removal (use --force to skip this message)');
    }
    
    // Perform the removals
    let removedCount = 0;
    for (const pathInfo of resolvedPaths) {
        try {
            const stats = fs.statSync(pathInfo.absolute);
            
            if (stats.isDirectory()) {
                removeRecursively(pathInfo.absolute);
                console.log(`🗂️  Removed directory: ${pathInfo.relative}`);
            } else {
                fs.unlinkSync(pathInfo.absolute);
                console.log(`🗑️  Removed file: ${pathInfo.relative}`);
            }
            removedCount++;
            
        } catch (error) {
            console.error(`❌ Failed to remove ${pathInfo.relative}: ${error.message}`);
        }
    }
    
    if (removedCount > 0) {
        const relativeToWorkspace = resolvedPaths.map(p => 
            path.relative(workspaceRoot, p.absolute) || '(root)'
        ).join(', ');
        console.log(`✅ Removed ${removedCount} item(s)`);
        console.log(`🏠 Workspace: ${relativeToWorkspace}`);
    }
}

main();