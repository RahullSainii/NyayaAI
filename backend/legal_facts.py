from __future__ import annotations

import re
from typing import Dict, List, Optional

from backend.ipc_bns_map import IPC_BNS_MAP
from backend.models import LegalChunk

COMMON_SECTION_FACTS: Dict[str, Dict[str, object]] = {
    "302": {"bailable": False, "cognizable": True, "summary": "Punishment for murder"},
    "304": {
        "bailable": False,
        "cognizable": True,
        "summary": "Punishment for culpable homicide not amounting to murder",
    },
    "376": {"bailable": False, "cognizable": True, "summary": "Punishment for rape"},
    "420": {
        "bailable": False,
        "cognizable": True,
        "summary": "Cheating and dishonestly inducing delivery of property",
    },
    "498A": {
        "bailable": False,
        "cognizable": True,
        "summary": "Cruelty by husband or his relatives",
    },
}


def normalize_section(section: str) -> str:
    return section.strip().upper().replace("SECTION ", "").replace("SEC ", "").replace(".", "")


def extract_section_from_query(query: str) -> Optional[str]:
    match = re.search(r"\b(\d+[A-Z]?)\b", query.upper())
    return match.group(1) if match else None


def get_section_profile(section: Optional[str]) -> Optional[Dict[str, object]]:
    if not section:
        return None

    clean = normalize_section(section)
    fact = COMMON_SECTION_FACTS.get(clean)
    mapping = IPC_BNS_MAP.get(clean)

    if not fact and not mapping:
        return None

    profile: Dict[str, object] = {
        "section": clean,
        "summary": fact["summary"] if fact else (mapping["description"] if mapping else ""),
        "bns": mapping["bns"] if mapping else "N/A",
        "bailable": fact["bailable"] if fact else None,
        "cognizable": fact["cognizable"] if fact else None,
    }
    return profile


def build_builtin_chunks() -> List[LegalChunk]:
    chunks: List[LegalChunk] = []

    for section, mapping in IPC_BNS_MAP.items():
        fact = COMMON_SECTION_FACTS.get(section)
        summary = fact["summary"] if fact else mapping["description"]
        status_bits: List[str] = []
        if fact:
            status_bits.append("cognizable" if fact["cognizable"] else "non-cognizable")
            status_bits.append("non-bailable" if not fact["bailable"] else "bailable")

        extra = f" Status: {', '.join(status_bits)}." if status_bits else ""
        text = (
            f"IPC Section {section}: {mapping['description']}. "
            f"BNS equivalent: Section {mapping['bns']}. "
            f"Summary: {summary}.{extra}"
        )

        chunks.append(
            LegalChunk(
                text=text,
                section_number=section,
                law_type="IPC",
                page_number=0,
                source_file="builtin_legal_reference",
            )
        )

    return chunks
