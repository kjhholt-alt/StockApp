#!/usr/bin/env python
import os
import subprocess
import sys

# Run migrations
subprocess.run([sys.executable, "manage.py", "migrate"], check=True)

# Get port from environment, default to 8000
port = os.environ.get("PORT", "8000")

# Start gunicorn
os.execvp("gunicorn", [
    "gunicorn",
    "config.wsgi:application",
    "--bind", f"0.0.0.0:{port}",
    "--log-level", "info"
])
