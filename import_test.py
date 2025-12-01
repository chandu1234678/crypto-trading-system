import importlib, traceback, sys

try:
    importlib.import_module("backend.main")
    print("OK: backend.main imported successfully")
except Exception as e:
    traceback.print_exc()
    sys.exit(1)
