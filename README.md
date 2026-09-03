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

## Connecting Vercel / Mobile to Local Database (Zero Cloud Upload)
When accessing your deployed Vercel website on your cellphone or laptop outside the office:
1. On your office PC, start the secure tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```
   *(or `ngrok http 8080`)*
2. On your cellphone or laptop, open your Vercel URL.
3. Click the **"Database Bridge"** badge in the bottom-right corner.
4. Paste your `https://...trycloudflare.com` link and click **Test & Connect**.
5. Your Vercel app is now directly connected to your office OpenEdge database in real time!

