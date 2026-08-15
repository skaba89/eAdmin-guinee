from pathlib import Path

path = Path("backend/tests/test_document_version_scope.py")
text = path.read_text(encoding="utf-8")
old = '''from contextlib import AbstractAsyncContextManager
from unittest.mock import AsyncMock, MagicMock

import pytest

import app.services.document_version_service as version_module
from app.services.document_version_service import DocumentVersionService
'''
new = '''from contextlib import AbstractAsyncContextManager
import importlib
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.document_version_service import DocumentVersionService

version_module = importlib.import_module("app.services.document_version_service")
'''
if text.count(old) != 1:
    raise SystemExit("document scope test import marker mismatch")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
