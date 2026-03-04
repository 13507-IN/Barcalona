"""
Helper utilities for the scraper.
Keep small, reusable parsing helpers here.
"""

def clean_text(value: str) -> str:
    """Normalize whitespace and trim a string."""
    return " ".join(value.split()) if value else ""
