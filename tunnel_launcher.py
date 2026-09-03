"""
eRPAS Tunnel Auto-Pairing Launcher
Automatically pairs the Cloudflare Tunnel with Passkey: 33Land25PA0
Zero link copying needed on phone or laptop!
"""

import os
import sys
import subprocess
import time
import re
import hashlib
import urllib.request
import urllib.error
import socket

PASSKEY = "33Land25PA0"
DEFAULT_TOPIC = "egaps-relay-" + hashlib.sha256(PASSKEY.encode('utf-8')).hexdigest()[:16]
PORT = 8080

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def find_cloudflared():
    candidates = [
        r"C:\Program Files (x86)\cloudflared\cloudflared.exe",
        r"C:\Program Files\cloudflared\cloudflared.exe",
        "cloudflared.exe",
        "cloudflared"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return "cloudflared"

def publish_tunnel_url(url):
    try:
        req = urllib.request.Request(
            f"https://ntfy.sh/{DEFAULT_TOPIC}",
            data=url.encode('utf-8'),
            headers={"Title": "eRPAS Tunnel Active", "Tags": "key,globe"}
        )
        with urllib.request.urlopen(req, timeout=8) as res:
            return res.status == 200
    except Exception as e:
        print(f"[!] Warning publishing to relay: {e}")
        return False

def main():
    os.system("cls" if os.name == "nt" else "clear")
    print("==============================================================================")
    print("                eRPAS Database Bridge & Auto-Pair Launcher")
    print("==============================================================================\n")

    # 1. Ensure server.py is running
    if not is_port_in_use(PORT):
        print("[*] Local eRPAS server (server.py) is not active. Starting it now...")
        server_script = os.path.join(os.path.dirname(__file__), "server.py")
        subprocess.Popen([sys.executable, server_script], creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
        time.sleep(2.5)
        print("[OK] eRPAS local server started on port 8080.\n")
    else:
        print("[OK] eRPAS local server is already running on port 8080.\n")

    # 2. Find cloudflared
    cf_bin = find_cloudflared()
    print(f"[*] Starting Cloudflare Tunnel using {cf_bin}...")
    print("[*] Generating secure connection...")

    cmd = [cf_bin, "tunnel", "--url", f"http://127.0.0.1:{PORT}"]
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
    except Exception as e:
        print(f"[X] Failed to launch cloudflared: {e}")
        input("Press Enter to exit...")
        return

    tunnel_url = None
    url_pattern = re.compile(r"(https://[a-zA-Z0-9\.\-]+\.trycloudflare\.com)")

    # Read output until tunnel URL is found
    for line in proc.stdout:
        line_clean = line.strip()
        match = url_pattern.search(line_clean)
        if match:
            tunnel_url = match.group(1)
            break
        # Still show progress
        if "Registered tunnel" in line_clean or "Connection" in line_clean:
            print(f"    {line_clean}")

    if tunnel_url:
        # Publish to pairing relay
        published = publish_tunnel_url(tunnel_url)
        os.system("cls" if os.name == "nt" else "clear")
        print("==============================================================================")
        print("                 eRPAS DATABASE BRIDGE IS NOW ONLINE!")
        print("==============================================================================")
        print(f"  [✓] Passkey:              {PASSKEY}")
        print(f"  [✓] Local Server:         http://127.0.0.1:{PORT} (Active)")
        print(f"  [✓] Database:             OpenEdge rpadb / globaldb (192.168.4.1)")
        print(f"  [✓] Auto-Pair Status:     {'Ready & Paired' if published else 'Relay Offline (Use Direct Link)'}")
        print("------------------------------------------------------------------------------")
        print("  ON YOUR PHONE OR OTHER LAPTOP (VERCEL):")
        print("  1. Open your Vercel web page.")
        print(f"  2. In the 'Database Bridge' box, just enter passkey: {PASSKEY}")
        print("  3. Tap 'Connect'!")
        print("  --> YOU DO NOT NEED TO COPY OR PASTE ANY LINKS!")
        print("------------------------------------------------------------------------------")
        print(f"  (Behind the scenes link: {tunnel_url})")
        print("==============================================================================")
        print("  Keep this window open while using the app remotely.")
        print("  Press Ctrl+C to disconnect.")
        print("==============================================================================\n")
    else:
        print("\n[!] Could not automatically capture tunnel URL. Check Cloudflare output below:")

    # Keep reading so process stays alive
    try:
        for line in proc.stdout:
            pass
    except KeyboardInterrupt:
        print("\n[*] Stopping tunnel...")
        proc.terminate()

if __name__ == "__main__":
    main()
