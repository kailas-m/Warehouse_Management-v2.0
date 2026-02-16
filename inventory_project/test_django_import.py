import sys
import os

log_file = "import_log.txt"

with open(log_file, "w") as f:
    f.write("Starting import test...\n")
    try:
        import django
        f.write(f"Django imported successfully. Version: {django.get_version()}\n")
        f.write(f"Path: {django.__file__}\n")
    except ImportError as e:
        f.write(f"ImportError: {e}\n")
    except Exception as e:
        f.write(f"Exception: {e}\n")
    
    f.write("Sys Path:\n")
    for p in sys.path:
        f.write(f"{p}\n")
