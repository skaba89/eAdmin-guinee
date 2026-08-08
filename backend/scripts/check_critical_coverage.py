#!/usr/bin/env python3
"""Risk-based coverage gate for government-readiness security controls.

A single repository-wide percentage can hide a regression in MFA/RLS by adding
coverage to unrelated modules. This guard therefore enforces both a global
floor and strict coverage thresholds on the security-critical execution path.
"""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

GLOBAL_MIN = 50.0
CORE_COMBINED_MIN = 85.0

# These floors are deliberately stricter for controls whose regression can
# expose another institution's data, bypass MFA, or invalidate revocation.
CRITICAL_MINIMUMS = {
    "api/auth_hardening.py": 70.0,
    "api/security_hardening.py": 80.0,
    "middleware/audit.py": 90.0,
    "middleware/mfa_guard.py": 95.0,
    "middleware/rate_limit.py": 80.0,
    "middleware/rls.py": 80.0,
    "middleware/security_headers.py": 85.0,
    "middleware/tenant.py": 80.0,
    "services/object_storage.py": 95.0,
    "services/token_blacklist.py": 95.0,
}


def _pct(covered: int, total: int) -> float:
    return 100.0 if total == 0 else covered * 100.0 / total


def read_coverage(path: Path) -> tuple[float, dict[str, tuple[int, int]]]:
    root = ET.parse(path).getroot()
    global_rate = float(root.attrib.get("line-rate", "0")) * 100.0
    files: dict[str, tuple[int, int]] = {}

    for cls in root.findall(".//class"):
        filename = cls.attrib.get("filename", "")
        covered = 0
        total = 0
        lines = cls.find("lines")
        if lines is not None:
            for line in lines.findall("line"):
                total += 1
                if int(line.attrib.get("hits", "0")) > 0:
                    covered += 1
        files[filename] = (covered, total)

    return global_rate, files


def main() -> int:
    report_path = Path(sys.argv[1] if len(sys.argv) > 1 else "coverage.xml")
    if not report_path.exists():
        print(f"CRITICAL_COVERAGE_ERROR missing report: {report_path}")
        return 2

    global_rate, files = read_coverage(report_path)
    failures: list[str] = []

    print(f"GLOBAL_COVERAGE={global_rate:.2f}% minimum={GLOBAL_MIN:.2f}%")
    if global_rate + 1e-9 < GLOBAL_MIN:
        failures.append(
            f"global coverage {global_rate:.2f}% is below {GLOBAL_MIN:.2f}%"
        )

    core_covered = 0
    core_total = 0
    for filename, minimum in CRITICAL_MINIMUMS.items():
        if filename not in files:
            failures.append(f"critical module missing from coverage report: {filename}")
            continue

        covered, total = files[filename]
        rate = _pct(covered, total)
        core_covered += covered
        core_total += total
        print(
            f"CRITICAL_COVERAGE {filename}={rate:.2f}% "
            f"({covered}/{total}) minimum={minimum:.2f}%"
        )
        if rate + 1e-9 < minimum:
            failures.append(f"{filename} coverage {rate:.2f}% is below {minimum:.2f}%")

    combined = _pct(core_covered, core_total)
    print(
        f"SECURITY_CORE_COMBINED={combined:.2f}% "
        f"({core_covered}/{core_total}) minimum={CORE_COMBINED_MIN:.2f}%"
    )
    if combined + 1e-9 < CORE_COMBINED_MIN:
        failures.append(
            f"security core coverage {combined:.2f}% is below {CORE_COMBINED_MIN:.2f}%"
        )

    if failures:
        print("CRITICAL_COVERAGE_GATE=FAIL")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print("CRITICAL_COVERAGE_GATE=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
