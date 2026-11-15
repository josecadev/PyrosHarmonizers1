"""API PyrosHarmonizer."""

import sys
import types
from pathlib import Path

_backend_dir = Path(__file__).resolve().parent.parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

if "backend" not in sys.modules:
    _pkg = types.ModuleType("backend")
    _pkg.__path__ = [str(_backend_dir)]
    sys.modules["backend"] = _pkg

if "backend.app" not in sys.modules:
    sys.modules["backend.app"] = sys.modules[__name__]
