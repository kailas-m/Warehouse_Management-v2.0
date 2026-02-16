import os
import django
from django.urls import resolve

import sys
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inventory_project.settings")
django.setup()

with open("url_test_log.txt", "w") as f:
    try:
        match = resolve("/api/auth/login/")
        f.write(f"Resolved /api/auth/login/ to {match.view_name}\n")
        f.write(f"View: {match.func.view_class.__name__}\n")
    except Exception as e:
        f.write(f"Error resolving /api/auth/login/: {e}\n")
        import traceback
        f.write(traceback.format_exc())
