import os
import sys
import traceback

log_file = "startup_traceback.txt"

with open(log_file, "w") as f:
    f.write("Starting Django Setup Debug...\n")
    
    # Add project to path
    sys.path.append(os.getcwd())
    f.write(f"CWD: {os.getcwd()}\n")
    
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inventory_project.settings")
    
    try:
        import django
        f.write("Django imported.\n")
        django.setup()
        f.write("Django setup successfully complete!\n")
    except Exception as e:
        f.write(f"ERROR: {e}\n")
        f.write(traceback.format_exc())
