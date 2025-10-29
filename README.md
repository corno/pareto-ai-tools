# Pareto AI Tools

AI-safe development tools designed for VS Code workspaces.

## Installation

```bash
npm install -g pareto-ai-tools
```

## Tools

### `cd-vs-local`

A workspace-bounded directory navigation tool that prevents accidentally navigating outside your VS Code workspace.

**Features:**
- Automatically detects VS Code workspace root (looks for `.vscode/`, `.git/`, `package.json`, `*.code-workspace`)
- Prevents navigation outside workspace boundaries
- Clear error messages when attempting to leave workspace
- Integrates with VS Code's auto-approval system for AI tools

**Usage:**
```bash
cd-vs-local <directory>          # Navigate within workspace
cd-vs-local --help               # Show help
cd-vs-local --show-root          # Show detected workspace root
cd-vs-local --check <path>       # Check if path is within workspace
```

### `mv-vs-local`

A workspace-bounded file/directory move tool that prevents moving files outside your VS Code workspace.

**Features:**
- Workspace boundary enforcement for both source and destination
- Automatic directory creation for destination paths
- Support for file and directory operations
- Clear feedback on workspace context

**Usage:**
```bash
mv-vs-local <source> <dest>       # Move/rename within workspace
mv-vs-local --help                # Show help
mv-vs-local --check <src> <dest>  # Check if move would be allowed
mv-vs-local --show-root           # Show detected workspace root
```

### `rm-vs-local`

A workspace-bounded file/directory removal tool that prevents deleting files outside your VS Code workspace.

**Features:**
- Workspace boundary enforcement for all target paths
- Support for multiple files and recursive directory removal
- Confirmation prompts (unless using --force)
- Safe operation within workspace bounds only

**Usage:**
```bash
rm-vs-local <file1> [file2] ...   # Remove files within workspace
rm-vs-local --recursive <dir>     # Remove directory recursively
rm-vs-local --force <files>       # Remove without confirmation
rm-vs-local --check <files>       # Check if removal would be allowed
rm-vs-local --help                # Show help
```

**Examples:**
```bash
cd-vs-local ../other-project     # Navigate to sibling project if within workspace
cd-vs-local ../../               # Blocked if it would exit workspace
cd-vs-local --show-root          # Show workspace root
cd-vs-local --check ../path      # Check if path is within workspace

mv-vs-local old.txt new.txt                # Rename file
mv-vs-local src/file.js lib/file.js        # Move file within workspace
mv-vs-local temp/ archive/                 # Move directory
mv-vs-local --check src/file.js ../outside # Check if move would be allowed

rm-vs-local temp.txt                      # Remove file
rm-vs-local file1.txt file2.txt          # Remove multiple files
rm-vs-local --recursive temp/             # Remove directory recursively
rm-vs-local --check ../outside-file.txt  # Check if removal would be allowed
```

## VS Code Integration

Add this to your VS Code settings.json to auto-approve the tools:

```json
{
  "chat.tools.terminal.autoApprove": {
    "cd-vs-local": true,
    "mv-vs-local": true,
    "rm-vs-local": true
  }
}
```

This allows AI assistants to suggest workspace-bounded navigation without requiring manual approval for each command.

## License

ISC