import os
import django
import sys

# Add the project directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inventory_project.settings")

print("--- Starting Django Setup Debug ---")
try:
    django.setup()
    print("--- Django Setup Complete ---")
except Exception as e:
    print(f"!!! Error during setup: {e}")
    import traceback
    traceback.print_exc()
