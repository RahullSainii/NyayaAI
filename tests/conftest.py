"""Minimal async test support without requiring the pytest-asyncio plugin.

Runs any test coroutine (marked with @pytest.mark.asyncio) via asyncio.run so
the suite works with a plain `pytest` install.
"""

import asyncio
import inspect

import pytest


def pytest_configure(config):
    config.addinivalue_line("markers", "asyncio: run the test as an asyncio coroutine")


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem):
    test_fn = pyfuncitem.obj
    if inspect.iscoroutinefunction(test_fn):
        funcargs = pyfuncitem.funcargs
        kwargs = {name: funcargs[name] for name in pyfuncitem._fixtureinfo.argnames}
        asyncio.run(test_fn(**kwargs))
        return True
    return None
