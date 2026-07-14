"""
Python 3.12 removed the stdlib `imp` module. The `future` package (a
transitive dependency of `rubik_solver`) still does `import imp` at module
load time, which crashes on 3.12+ even though the actual functionality is
never exercised (it's only used for an opt-in auto-translation hook we never
enable). This restores a minimal shim so the import succeeds.

Import this BEFORE importing rubik_solver anywhere in the app (main.py does
this first, at the top, before the routers are imported).
"""

import sys
import types
import importlib
import importlib.util

if "imp" not in sys.modules:
    shim = types.ModuleType("imp")

    shim.PKG_DIRECTORY = 5
    shim.PY_SOURCE = 1
    shim.PY_COMPILED = 2
    shim.C_EXTENSION = 3
    shim.C_BUILTIN = 6
    shim.PY_FROZEN = 7

    def find_module(name, path=None):
        spec = importlib.machinery.PathFinder().find_spec(name, path)
        if spec is None:
            raise ImportError(name)
        return (None, spec.origin, ("", "", shim.PY_SOURCE))

    def load_module(name, *args, **kwargs):
        return importlib.import_module(name)

    def new_module(name):
        return types.ModuleType(name)

    def cache_from_source(path):
        return importlib.util.cache_from_source(path)

    shim.find_module = find_module
    shim.load_module = load_module
    shim.new_module = new_module
    shim.cache_from_source = cache_from_source
    shim.reload = importlib.reload

    sys.modules["imp"] = shim

# `past.translation` additionally needs the `lib2to3` stdlib module, which
# many minimal Python installs (e.g. slim Docker images, some Ubuntu builds)
# don't ship. We never use the auto-translate feature it provides, so stub
# the whole submodule out before `past/__init__.py` imports it.
if "past.translation" not in sys.modules:
    translation_shim = types.ModuleType("past.translation")
    translation_shim.install_hooks = lambda *a, **k: None
    translation_shim.remove_hooks = lambda *a, **k: None
    sys.modules["past.translation"] = translation_shim

# Python 3.10 moved the ABCs (Iterable, Mapping, etc.) out of `collections`
# into `collections.abc`. `past` (2015-era code) still does
# `from collections import Iterable`. Restore the old aliases.
import collections
import collections.abc as _abc

for _name in ("Iterable", "Mapping", "MutableMapping", "Sequence", "Set", "Callable"):
    if not hasattr(collections, _name):
        setattr(collections, _name, getattr(_abc, _name))
