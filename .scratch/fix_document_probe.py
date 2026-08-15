from pathlib import Path


path = Path("backend/scripts/check_document_version_rls.py")
text = path.read_text(encoding="utf-8")
text = text.replace("{RUNTIME_ROLE}", "eadmin_document_version_runtime")
text = text.replace('f"""', '"""')
text = text.replace('f"SET LOCAL ROLE eadmin_document_version_runtime"', '"SET LOCAL ROLE eadmin_document_version_runtime"')

marker = '''def _set_context(cur, *, tenant: str, institution: str) -> None:
'''
helper = '''def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


'''
if text.count(marker) != 1:
    raise SystemExit("probe helper insertion marker mismatch")
text = text.replace(marker, helper + marker, 1)

replacements = {
    "assert cur.fetchone()[0] == 1": '_require(cur.fetchone()[0] == 1, "expected one visible row")',
    "assert cur.fetchone()[0] == 0": '_require(cur.fetchone()[0] == 0, "hidden row leaked through RLS")',
    "assert cur.fetchone()[0] == 2": '_require(cur.fetchone()[0] == 2, "allowed version insert was not persisted")',
    "assert cur.rowcount == 0": '_require(cur.rowcount == 0, "direct version mutation must be denied")',
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f"probe replacement missing: {old}")
    text = text.replace(old, new)

path.write_text(text, encoding="utf-8")
