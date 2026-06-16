# Landmark cases in Indian law for reference
LANDMARK_CASES = {
    "302": {
        "section": "302 IPC",
        "cases": [
            {
                "name": "Bachan Singh v. State of Punjab (1980)",
                "summary": "Established the principle that murder with premeditation deserves death penalty",
                "key_point": "Death penalty is reserved only for rarest of rare cases"
            },
            {
                "name": "Hari Singh v. State of Haryana (1993)",
                "summary": "Clarified the distinction between murder and culpable homicide",
                "key_point": "Intent to cause death is essential for murder conviction"
            }
        ]
    },
    "304": {
        "section": "304 IPC (Culpable Homicide)",
        "cases": [
            {
                "name": "Rex v. Govinda (1876)",
                "summary": "Established that lack of intent to kill = culpable homicide not murder",
                "key_point": "Rash or negligent act causing death falls under this section"
            }
        ]
    },
    "420": {
        "section": "420 IPC (Cheating)",
        "cases": [
            {
                "name": "Gyan Singh v. State (1954)",
                "summary": "Cheating requires dishonest inducement, not just deception",
                "key_point": "Must involve delivery of property through fraudulent means"
            }
        ]
    },
    "376": {
        "section": "376 IPC (Rape)",
        "cases": [
            {
                "name": "Nirbhaya Case (2015)",
                "summary": "Enhanced punishment provisions for rape crimes",
                "key_point": "Minimum imprisonment raised from 7 to 10 years in heinous cases"
            },
            {
                "name": "Rajesh Masrani v. State of Gujarat (2010)",
                "summary": "Victim's testimony sufficient for conviction even without medical evidence",
                "key_point": "Corroboration not always mandatory for rape conviction"
            }
        ]
    }
}

def get_case_examples(section: str) -> list:
    """Get landmark cases related to a specific IPC section"""
    return LANDMARK_CASES.get(section, {}).get("cases", [])
