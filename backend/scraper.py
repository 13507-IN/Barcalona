"""
FC Barcelona Web Scraper
Scrapes club info, squad, news, matches, and trophies from public sources.
Includes clear console logs to show live vs demo data.
"""

from __future__ import annotations

import html as html_lib
import logging
import os
import re
import time
import unicodedata
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from typing import Dict, List, Optional, Tuple

import requests
from bs4 import BeautifulSoup

# ------------------------------
# Config
# ------------------------------

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/121.0 Safari/537.36"
    )
}

TIMEOUT = 15

WIKI_URL = "https://en.wikipedia.org/wiki/FC_Barcelona"

SCHEDULE_URL = "https://www.fcbarcelona.com/en/football/first-team/schedule"
RESULTS_URL = "https://www.fcbarcelona.com/en/football/first-team/results"

FCBARCA_NEWS_URL = "https://www.fcbarcelona.com/en/football/first-team/"
GUARDIAN_RSS_URL = "https://www.theguardian.com/football/barcelona/rss"

# Log level can be overridden with SCRAPER_LOG_LEVEL=DEBUG
LOG_LEVEL = os.getenv("SCRAPER_LOG_LEVEL", "INFO").upper()

logger = logging.getLogger("barca.scraper")
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=LOG_LEVEL,
        format="%(asctime)s | %(levelname)s | %(message)s"
    )

# ------------------------------
# Defaults (demo / fallback)
# ------------------------------

DEFAULT_CLUB = {
    "name": "FC Barcelona",
    "founded": "1899",
    "stadium": "Spotify Camp Nou",
    "capacity": "99,354",
    "manager": "Hansi Flick",
    "city": "Barcelona, Spain",
    "country": "Spain",
    "colors": "Blue and Garnet",
    "nickname": "Blaugrana",
    "history": "FC Barcelona is one of the most successful clubs in world football."
}

DEFAULT_SQUAD = [
    {"name": "Marc-Andre ter Stegen", "position": "Goalkeeper", "number": 1, "nationality": "Germany"},
    {"name": "Ronald Araujo", "position": "Defender", "number": 4, "nationality": "Uruguay"},
    {"name": "Jules Kounde", "position": "Defender", "number": 23, "nationality": "France"},
    {"name": "Alejandro Balde", "position": "Defender", "number": 3, "nationality": "Spain"},
    {"name": "Frenkie de Jong", "position": "Midfielder", "number": 21, "nationality": "Netherlands"},
    {"name": "Pedri", "position": "Midfielder", "number": 8, "nationality": "Spain"},
    {"name": "Gavi", "position": "Midfielder", "number": 6, "nationality": "Spain"},
    {"name": "Robert Lewandowski", "position": "Forward", "number": 9, "nationality": "Poland"},
    {"name": "Raphinha", "position": "Forward", "number": 11, "nationality": "Brazil"},
    {"name": "Ferran Torres", "position": "Forward", "number": 7, "nationality": "Spain"},
    {"name": "Lamine Yamal", "position": "Forward", "number": 19, "nationality": "Spain"}
]

DEFAULT_TROPHIES = [
    {"name": "La Liga", "count": 27, "lastWon": 2023, "color": "gold"},
    {"name": "Copa del Rey", "count": 31, "lastWon": 2021, "color": "silver"},
    {"name": "UEFA Champions League", "count": 5, "lastWon": 2015, "color": "gold"},
    {"name": "UEFA Super Cup", "count": 5, "lastWon": 2015, "color": "silver"},
    {"name": "Spanish Super Cup", "count": 13, "lastWon": 2023, "color": "gold"},
    {"name": "FIFA Club World Cup", "count": 3, "lastWon": 2015, "color": "gold"}
]

DEFAULT_MATCHES = {
    "upcoming": [
        {
            "opponent": "Real Madrid",
            "date": "2026-03-15",
            "competition": "La Liga",
            "status": "upcoming",
            "venue": "Spotify Camp Nou"
        },
        {
            "opponent": "Newcastle United",
            "date": "2026-03-18",
            "competition": "UEFA Champions League",
            "status": "upcoming",
            "venue": "Spotify Camp Nou"
        }
    ],
    "recent": [
        {
            "opponent": "Villarreal",
            "date": "2026-02-28",
            "result": "4-1",
            "competition": "La Liga",
            "status": "completed",
            "venue": "Spotify Camp Nou"
        },
        {
            "opponent": "Girona",
            "date": "2026-02-16",
            "result": "1-2",
            "competition": "La Liga",
            "status": "completed",
            "venue": "Municipal de Montilivi"
        }
    ]
}


# ------------------------------
# Helpers
# ------------------------------

MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12
}

DOW_RE = r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun)"
DATE_RE = re.compile(rf"{DOW_RE}\s+(\d{{1,2}})\s+([A-Za-z]{{3}})")
DATE_TIME_RE = re.compile(
    rf"^{DOW_RE}\s+\d{{1,2}}\s+[A-Za-z]{{3}}\s+(?:KO:\s*)?(?:\d{{2}}:\d{{2}}|TBA)\s+"
)
SCORE_RE = re.compile(r"(\d+)\s*-\s*(\d+)")
AGG_RE = re.compile(r"AGG:\s*Agg\.\s*\d+\s*-\s*\d+", re.IGNORECASE)

VENUE_KEYWORDS = [
    "Stadium", "Arena", "Estadio", "Camp Nou", "Park", "Metropolitano",
    "Centre", "Center", "Ground", "Field", "St.", "St ", "Stade", "Stadion"
]

KNOWN_COMPETITIONS = [
    "La Liga",
    "UEFA Champions League",
    "Copa Del Rey",
    "Supercopa",
    "Friendly",
    "Trofeo Joan Gamper",
    "Other Club Friendlies"
]


def clean_text(value: str) -> str:
    """Normalize whitespace, remove control tokens and footnotes."""
    if not value:
        return ""
    text = html_lib.unescape(value)
    text = text.replace("\xa0", " ")
    text = re.sub(r"label\.aria\.[A-Za-z0-9_-]+", "", text)
    text = re.sub(r"\[\d+\]", "", text)
    text = " ".join(text.split())
    return text.strip()


def strip_accents(value: str) -> str:
    """Remove accents for easier matching."""
    if not value:
        return ""
    return "".join(
        ch for ch in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(ch)
    )


def fetch_text(url: str, label: str) -> Optional[str]:
    """Fetch text from a URL with logging and error handling."""
    logger.info("FETCH %s -> %s", label, url)
    start = time.perf_counter()
    try:
        response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        elapsed = time.perf_counter() - start
        logger.info("FETCH OK %s status=%s time=%.2fs", label, response.status_code, elapsed)
        response.raise_for_status()
        response.encoding = response.apparent_encoding or response.encoding
        return response.text
    except Exception as exc:
        elapsed = time.perf_counter() - start
        logger.warning("FETCH FAIL %s time=%.2fs error=%s", label, elapsed, exc)
        return None


def parse_month_year(line: str) -> Optional[Tuple[int, int]]:
    """Parse lines like 'March 2026' or 'Mar 2026'."""
    if not line:
        return None
    parts = clean_text(line).split()
    if len(parts) != 2:
        return None
    month = MONTHS.get(parts[0].lower())
    if not month:
        return None
    if not parts[1].isdigit() or len(parts[1]) != 4:
        return None
    return month, int(parts[1])


def parse_date_from_line(line: str, fallback_year: int) -> Optional[str]:
    """Extract a YYYY-MM-DD date from a match line."""
    match = DATE_RE.search(line)
    if not match:
        return None
    day = int(match.group(2))
    month_key = match.group(3).lower()
    month = MONTHS.get(month_key)
    if not month:
        return None
    try:
        dt = datetime(fallback_year, month, day)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return None


def safe_int(value: str) -> Optional[int]:
    if not value:
        return None
    match = re.search(r"\d+", value)
    return int(match.group(0)) if match else None


def extract_competition(text: str) -> Tuple[str, str]:
    """Return (competition, remainder)."""
    cleaned = clean_text(text)
    for comp in KNOWN_COMPETITIONS:
        if cleaned.lower().startswith(comp.lower()):
            return comp, cleaned[len(comp):].strip()
    return "Unknown", cleaned


def strip_stage(text: str) -> str:
    """Remove stage tokens like Matchday or Round of 16."""
    stage_patterns = [
        r"Matchday\s+\d+",
        r"Round\s+of\s+\d+",
        r"Quarter-finals",
        r"Semi-finals",
        r"Final",
        r"Group\s+stage"
    ]
    cleaned = text
    for pattern in stage_patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    return clean_text(cleaned)


def split_venue_opponent_home(left: str, opponent: str) -> str:
    """If Barca are home, remove 'FC Barcelona' from left to get venue."""
    venue = left.replace("FC Barcelona", "").strip()
    return clean_text(venue) if venue else "TBD"


def split_venue_opponent_away(left: str, opponent: str) -> str:
    """If Barca are away, try to split venue from opponent using keywords."""
    if not left:
        return "TBD"
    for kw in VENUE_KEYWORDS:
        if kw in left:
            idx = left.rfind(kw) + len(kw)
            venue = left[:idx].strip()
            return clean_text(venue) if venue else "TBD"
    # Fallback if we cannot split venue from opponent
    return "TBD"


def parse_relative_or_absolute_date(text: str) -> str:
    """Parse dates like '9 hrs ago' or '31 Dec 25'."""
    text = clean_text(text)
    lower = text.lower()

    if "mins ago" in lower:
        minutes = safe_int(lower)
        dt = datetime.now() - timedelta(minutes=minutes or 0)
        return dt.strftime("%Y-%m-%d")
    if "hrs ago" in lower or "hr ago" in lower:
        hours = safe_int(lower)
        dt = datetime.now() - timedelta(hours=hours or 0)
        return dt.strftime("%Y-%m-%d")

    # Absolute date with 2-digit year, e.g. 31 Dec 25
    try:
        dt = datetime.strptime(text, "%d %b %y")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        pass

    # Fallback to today
    return datetime.now().strftime("%Y-%m-%d")


def parse_rss_date(value: str) -> str:
    """Parse RSS/Atom dates into YYYY-MM-DD."""
    if not value:
        return datetime.now().strftime("%Y-%m-%d")
    try:
        dt = parsedate_to_datetime(value)
        return dt.date().isoformat()
    except Exception:
        pass
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.date().isoformat()
    except Exception:
        return datetime.now().strftime("%Y-%m-%d")


def parse_feed(xml_text: str, source_name: str) -> List[Dict]:
    """Parse RSS or Atom XML and return news items."""
    import xml.etree.ElementTree as ET

    items: List[Dict] = []

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        logger.warning("NEWS parse error for %s: %s", source_name, exc)
        return items

    tag = root.tag.lower()
    if tag.endswith("rss"):
        channel = root.find("channel") or root.find("{*}channel")
        if channel is None:
            return items
        entries = channel.findall("item") + channel.findall("{*}item")
        for item in entries:
            title = (item.findtext("title") or item.findtext("{*}title") or "").strip()
            pub_date = item.findtext("pubDate") or item.findtext("{*}pubDate")
            link = item.findtext("link") or item.findtext("{*}link")
            if title:
                items.append({
                    "title": clean_text(title),
                    "date": parse_rss_date(pub_date),
                    "source": source_name,
                    "category": "News",
                    "url": link
                })
        return items

    # Atom
    entries = root.findall("{*}entry")
    for entry in entries:
        title = (entry.findtext("{*}title") or "").strip()
        pub_date = entry.findtext("{*}updated") or entry.findtext("{*}published")
        link_elem = entry.find("{*}link")
        link = link_elem.get("href") if link_elem is not None else None
        if title:
            items.append({
                "title": clean_text(title),
                "date": parse_rss_date(pub_date),
                "source": source_name,
                "category": "News",
                "url": link
            })
    return items


# ------------------------------
# Scrapers
# ------------------------------


def scrape_club_info() -> Dict:
    """Scrape club info from Wikipedia (name, stadium, manager, history, etc.)."""
    logger.info("SCRAPE club info (Wikipedia)")
    html_text = fetch_text(WIKI_URL, "Wikipedia club page")
    if not html_text:
        logger.warning("CLUB fallback demo data used")
        return DEFAULT_CLUB.copy()

    soup = BeautifulSoup(html_text, "html.parser")
    data = DEFAULT_CLUB.copy()

    # Parse infobox
    infobox = soup.find("table", class_=lambda c: c and "infobox" in c)
    if infobox:
        for row in infobox.find_all("tr"):
            th = row.find("th")
            td = row.find("td")
            if not th or not td:
                continue
            key = clean_text(th.get_text(" ", strip=True)).lower()
            value = clean_text(td.get_text(" ", strip=True))

            if "founded" in key:
                data["founded"] = value.split("(")[0].strip()
            elif "ground" in key or "stadium" in key:
                data["stadium"] = value.split("(")[0].strip()
            elif "capacity" in key:
                data["capacity"] = value.split("[")[0].strip()
            elif "manager" in key or "head coach" in key:
                data["manager"] = value.split("(")[0].strip()
            elif "nickname" in key:
                data["nickname"] = value
            elif "colours" in key or "colors" in key:
                data["colors"] = value
            elif "location" in key or "city" in key:
                data["city"] = value

    # Extract short history from the first paragraphs
    history_paragraphs: List[str] = []
    content = soup.find("div", class_="mw-parser-output")
    if content:
        for p in content.find_all("p", recursive=False):
            text = clean_text(p.get_text(" ", strip=True))
            if text and len(text) > 80:
                history_paragraphs.append(text)
            if len(history_paragraphs) >= 2:
                break

    if history_paragraphs:
        data["history"] = " ".join(history_paragraphs)

    logger.info("CLUB live data loaded (manager=%s, stadium=%s)", data.get("manager"), data.get("stadium"))
    return data


def scrape_squad() -> List[Dict]:
    """Scrape current squad from Wikipedia."""
    logger.info("SCRAPE squad (Wikipedia)")
    html_text = fetch_text(WIKI_URL, "Wikipedia squad")
    if not html_text:
        logger.warning("SQUAD fallback demo data used")
        return DEFAULT_SQUAD.copy()

    soup = BeautifulSoup(html_text, "html.parser")

    def find_squad_table() -> Optional[BeautifulSoup]:
        header = soup.find(id=re.compile("Current_squad", re.IGNORECASE))
        if header:
            heading = header.find_parent(["h2", "h3"])
            if heading:
                table = heading.find_next("table", class_="wikitable")
                if table:
                    return table
        # Fallback: any table with typical squad headers
        for table in soup.select("table.wikitable"):
            headers = [clean_text(th.get_text(" ", strip=True)).lower() for th in table.find_all("th")]
            if any("pos" in h for h in headers) and any("player" in h for h in headers):
                return table
        return None

    table = find_squad_table()
    if not table:
        logger.warning("SQUAD table not found, using demo data")
        return DEFAULT_SQUAD.copy()

    rows = table.find_all("tr")
    if not rows:
        logger.warning("SQUAD table empty, using demo data")
        return DEFAULT_SQUAD.copy()

    headers = [clean_text(cell.get_text(" ", strip=True)).lower() for cell in rows[0].find_all(["th", "td"])]

    def header_index(candidates: List[str]) -> Optional[int]:
        for idx, h in enumerate(headers):
            for name in candidates:
                if name in h:
                    return idx
        return None

    idx_no = header_index(["no", "number"])
    idx_pos = header_index(["pos", "position"])
    idx_player = header_index(["player", "name"])
    idx_nat = header_index(["nation", "nat", "nationality"])

    players: List[Dict] = []

    for row in rows[1:]:
        cells = row.find_all(["th", "td"])
        if not cells or len(cells) < 3:
            continue

        def cell_text(index: Optional[int]) -> str:
            if index is None or index >= len(cells):
                return ""
            return clean_text(cells[index].get_text(" ", strip=True))

        number_text = cell_text(idx_no)
        player_name = cell_text(idx_player)
        position = cell_text(idx_pos)
        nationality = cell_text(idx_nat)

        if not player_name:
            continue

        players.append({
            "name": player_name,
            "position": position or "Unknown",
            "number": safe_int(number_text) or None,
            "nationality": nationality or "Unknown"
        })

        if len(players) >= 30:
            break

    if len(players) < 11:
        logger.warning("SQUAD parsed %d players (<11), using demo data", len(players))
        return DEFAULT_SQUAD.copy()

    logger.info("SQUAD live data loaded (%d players)", len(players))
    return players


def scrape_news() -> List[Dict]:
    """Scrape latest news from FC Barcelona official site and Guardian RSS."""
    logger.info("SCRAPE news (FC Barcelona + Guardian RSS)")
    news_items: List[Dict] = []

    # 1) FC Barcelona official news (first team page)
    html_text = fetch_text(FCBARCA_NEWS_URL, "FC Barcelona official news")
    if html_text:
        soup = BeautifulSoup(html_text, "html.parser")
        lines = [clean_text(line) for line in soup.get_text("\n").splitlines() if clean_text(line)]

        # Find the Latest Barca News section
        start_idx = None
        for i, line in enumerate(lines):
            normalized = strip_accents(line).lower()
            if "latest barca news" in normalized:
                start_idx = i + 1
                break

        if start_idx is not None:
            for line in lines[start_idx:]:
                normalized = strip_accents(line).lower()
                if "today's featured" in normalized or "first team players" in normalized:
                    break

                # Typical line includes: Title ... First Team ... 9 hrs ago
                if "First Team" in line:
                    match = re.match(r"(.+?)\s+First Team\s+(.*)$", line)
                    if match:
                        title = clean_text(match.group(1))
                        date_text = clean_text(match.group(2))
                        news_items.append({
                            "title": title,
                            "date": parse_relative_or_absolute_date(date_text),
                            "source": "FC Barcelona",
                            "category": "Official"
                        })

    # 2) The Guardian RSS
    rss_text = fetch_text(GUARDIAN_RSS_URL, "Guardian RSS")
    if rss_text:
        news_items.extend(parse_feed(rss_text, "The Guardian"))

    # De-duplicate by title
    seen = set()
    deduped: List[Dict] = []
    for item in news_items:
        key = (item.get("title") or "").lower()
        if key and key not in seen:
            seen.add(key)
            deduped.append(item)

    if len(deduped) < 3:
        logger.warning("NEWS parsed %d items (<3), using demo data", len(deduped))
        today = datetime.now().strftime("%Y-%m-%d")
        return [
            {"title": "Barca prepare for a key league fixture", "date": today, "source": "Demo", "category": "News"},
            {"title": "First-team training session highlights", "date": today, "source": "Demo", "category": "News"},
            {"title": "Club publishes matchday guide", "date": today, "source": "Demo", "category": "News"}
        ]

    logger.info("NEWS live data loaded (%d items)", len(deduped))
    return deduped[:10]


def scrape_matches() -> Dict:
    """Scrape upcoming fixtures and recent results from FC Barcelona official site."""
    logger.info("SCRAPE matches (FC Barcelona schedule + results)")

    upcoming: List[Dict] = []
    recent: List[Dict] = []

    # Upcoming fixtures
    schedule_text = fetch_text(SCHEDULE_URL, "FC Barcelona schedule")
    if schedule_text:
        soup = BeautifulSoup(schedule_text, "html.parser")
        lines = [clean_text(line) for line in soup.get_text("\n").splitlines() if clean_text(line)]

        current_year = datetime.now().year
        for line in lines:
            month_year = parse_month_year(line)
            if month_year:
                current_year = month_year[1]
                continue

            if "FC Barcelona" not in line or " vs. " not in line:
                continue

            # Remove prefix
            line = line.replace("Date and time to be announced ", "")

            # Extract date
            date = parse_date_from_line(line, current_year) or datetime.now().strftime("%Y-%m-%d")

            # Remove date and time part
            remainder = DATE_TIME_RE.sub("", line).strip()
            competition, rest = extract_competition(remainder)
            rest = strip_stage(rest)

            parts = rest.split(" vs. ")
            if len(parts) != 2:
                continue
            left, right = parts[0].strip(), parts[1].strip()

            if "FC Barcelona" in left:
                opponent = right
                venue = split_venue_opponent_home(left, opponent)
            else:
                opponent = left
                venue = split_venue_opponent_away(left, opponent)
                if venue != "TBD":
                    opponent = clean_text(left.replace(venue, ""))

            upcoming.append({
                "opponent": opponent,
                "date": date,
                "competition": competition,
                "status": "upcoming",
                "venue": venue
            })

    # Recent results
    results_text = fetch_text(RESULTS_URL, "FC Barcelona results")
    if results_text:
        soup = BeautifulSoup(results_text, "html.parser")
        lines = [clean_text(line) for line in soup.get_text("\n").splitlines() if clean_text(line)]

        current_year = datetime.now().year
        for line in lines:
            month_year = parse_month_year(line)
            if month_year:
                current_year = month_year[1]
                continue

            if "FC Barcelona" not in line:
                continue
            if not DATE_RE.search(line):
                continue
            if not SCORE_RE.search(line):
                continue

            date = parse_date_from_line(line, current_year) or datetime.now().strftime("%Y-%m-%d")

            # Remove date part
            line_wo_date = re.sub(rf"^{DOW_RE}\s+\d{{1,2}}\s+[A-Za-z]{{3}}\s+", "", line).strip()
            competition, rest = extract_competition(line_wo_date)
            rest = strip_stage(rest)

            score_match = SCORE_RE.search(rest)
            if not score_match:
                continue
            score = f"{score_match.group(1)}-{score_match.group(2)}"

            left = rest[:score_match.start()].strip()
            right = rest[score_match.end():].strip()
            right = AGG_RE.sub("", right).strip()

            if "FC Barcelona" in left:
                opponent = right
                venue = split_venue_opponent_home(left, opponent)
            else:
                opponent = left
                venue = split_venue_opponent_away(left, opponent)
                if venue != "TBD":
                    opponent = clean_text(left.replace(venue, ""))

            recent.append({
                "opponent": opponent,
                "date": date,
                "result": score,
                "competition": competition,
                "status": "completed",
                "venue": venue
            })

    if not upcoming and not recent:
        logger.warning("MATCHES failed to parse, using demo data")
        return DEFAULT_MATCHES.copy()

    logger.info("MATCHES live data loaded (upcoming=%d, recent=%d)", len(upcoming), len(recent))
    return {
        "upcoming": upcoming[:10],
        "recent": recent[:10]
    }


def scrape_trophies() -> List[Dict]:
    """Scrape trophy history from Wikipedia honours tables."""
    logger.info("SCRAPE trophies (Wikipedia honours)")
    html_text = fetch_text(WIKI_URL, "Wikipedia honours")
    if not html_text:
        logger.warning("TROPHIES fallback demo data used")
        return DEFAULT_TROPHIES.copy()

    soup = BeautifulSoup(html_text, "html.parser")
    trophies: List[Dict] = []

    # Try to locate honours section
    honours_tables: List[BeautifulSoup] = []
    honours_anchor = soup.find(id=re.compile("Honours", re.IGNORECASE))
    if honours_anchor:
        heading = honours_anchor.find_parent(["h2", "h3"])
        if heading:
            node = heading.find_next_sibling()
            while node and node.name not in ["h2", "h3"]:
                if node.name == "table" and "wikitable" in (node.get("class") or []):
                    honours_tables.append(node)
                node = node.find_next_sibling()

    # Fallback if honours section not found
    if not honours_tables:
        honours_tables = soup.select("table.wikitable")

    seen = set()

    for table in honours_tables:
        header_cells = table.find_all("th")
        headers = [clean_text(h.get_text(" ", strip=True)).lower() for h in header_cells]

        if "competition" not in " ".join(headers):
            continue

        rows = table.find_all("tr")[1:]
        for row in rows:
            cols = row.find_all(["th", "td"])
            if len(cols) < 2:
                continue

            name = clean_text(cols[0].get_text(" ", strip=True))
            count = safe_int(cols[1].get_text(" ", strip=True))

            last_won = None
            if len(cols) >= 3:
                years = re.findall(r"\d{4}", cols[2].get_text(" ", strip=True))
                if years:
                    last_won = int(years[-1])

            if not name or name.lower() in seen:
                continue
            seen.add(name.lower())

            color = "gold" if any(key in name.lower() for key in ["liga", "champions", "world", "copa del rey"]) else "silver"

            trophies.append({
                "name": name,
                "count": count or 0,
                "lastWon": last_won or "N/A",
                "color": color
            })

    if len(trophies) < 5:
        logger.warning("TROPHIES parsed %d items (<5), using demo data", len(trophies))
        return DEFAULT_TROPHIES.copy()

    logger.info("TROPHIES live data loaded (%d items)", len(trophies))
    return trophies


def get_all_data() -> Dict:
    """Scrape and return all Barcelona information."""
    data = {
        "club": scrape_club_info(),
        "squad": scrape_squad(),
        "news": scrape_news(),
        "matches": scrape_matches(),
        "trophies": scrape_trophies()
    }

    logger.info(
        "SUMMARY club=1 squad=%d news=%d upcoming=%d recent=%d trophies=%d",
        len(data["squad"]),
        len(data["news"]),
        len(data["matches"]["upcoming"]),
        len(data["matches"]["recent"]),
        len(data["trophies"])
    )

    return data


if __name__ == "__main__":
    # Manual test run
    print("Scraping FC Barcelona data...")
    all_data = get_all_data()

    print("\n=== Club Info ===")
    print(all_data["club"])

    print("\n=== Squad (first 3 players) ===")
    print(all_data["squad"][:3])

    print("\n=== News (first 3) ===")
    print(all_data["news"][:3])

    print("\n=== Upcoming Matches (first 3) ===")
    print(all_data["matches"]["upcoming"][:3])

    print("\n=== Recent Results (first 3) ===")
    print(all_data["matches"]["recent"][:3])

    print("\n=== Trophies (first 3) ===")
    print(all_data["trophies"][:3])
