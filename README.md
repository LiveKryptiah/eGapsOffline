# eGapsOffline

Offline & Fieldwork Real Property Assessment System (RPAS) Web Application for Isabela Provincial Assessor Services.

## Features
- **Offline Inspection Mode**: View, evaluate, and edit land, building, and machinery assessments without an active server connection.
- **Modern Web Interface**: Responsive HTML5, Vanilla CSS, and JavaScript interface designed for high-performance field use.
- **Local Data Caching**: Preloaded barangay records, unapproved assessments, and calculation tools for offline fieldwork.
- **Two-Way Sync**: Commit and sync local field records back to the central database (`rpadb` / `192.168.4.1`) upon returning to the office network.

## Quick Start
1. Run `run.bat` or execute:
   ```bash
   python server.py
   ```
2. Open your browser and navigate to:
   ```text
   http://localhost:8080
   ```
