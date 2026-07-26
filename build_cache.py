"""Build data/.chunk_cache.json by parsing each PDF in an isolated subprocess.

Running one PDF per process caps peak memory (pdfplumber/pdfminer accumulate
memory within a process), so this works even on low-RAM machines and produces a
committable cache that lets hosts like Render skip parsing entirely at startup.

Usage:  python build_cache.py
"""

import hashlib
import json
import os
import subprocess
import sys

from backend.config import DATA_DIR, PARSE_CACHE_PATH

_CHILD = (
    "import sys, json; "
    "from backend.ingestion import _parse_pdf; "
    "print(json.dumps([c.model_dump() for c in _parse_pdf(sys.argv[1])]))"
)


def _signature(path: str) -> dict:
    md5 = hashlib.md5()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            md5.update(block)
    return {"size": os.path.getsize(path), "md5": md5.hexdigest()}


def main() -> int:
    pdfs = sorted(f for f in os.listdir(DATA_DIR) if f.lower().endswith(".pdf"))
    cache = {"version": 2, "files": {}}
    total_chunks = 0

    for name in pdfs:
        path = os.path.join(DATA_DIR, name)
        proc = subprocess.run(
            [sys.executable, "-c", _CHILD, path],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0 or not proc.stdout.strip():
            print(f"  WARN: failed to parse {name}: {proc.stderr.strip()[:200]}")
            chunks = []
        else:
            try:
                chunks = json.loads(proc.stdout)
            except json.JSONDecodeError:
                print(f"  WARN: bad output for {name}")
                chunks = []
        cache["files"][name] = {"signature": _signature(path), "chunks": chunks}
        total_chunks += len(chunks)
        print(f"  {name}: {len(chunks)} chunks")

    os.makedirs(os.path.dirname(PARSE_CACHE_PATH), exist_ok=True)
    with open(PARSE_CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f)

    size_mb = os.path.getsize(PARSE_CACHE_PATH) / (1024 * 1024)
    print(f"\nWrote {PARSE_CACHE_PATH}: {len(pdfs)} files, {total_chunks} chunks, {size_mb:.2f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
