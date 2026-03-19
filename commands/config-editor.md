---
name: config-editor
description: Launch Claude Config Editor - visual GUI for editing ~/.claude/ settings
---

# Config Editor Launch

Launch the Claude Config Editor web application.

## Steps

1. Find the plugin installation directory by checking where this command is running from
2. Run the following commands in the plugin directory:

```bash
# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  npm install
fi

# Start both frontend and backend
npm start
```

3. Tell the user:
   - Config Editor is running at **http://localhost:5173**
   - Backend API is running at **http://localhost:3850**
   - Press `Ctrl+C` in the terminal to stop

## Important

- Requires **memory-bank** plugin for project list functionality
- Both servers run concurrently via a single `npm start` command
