#!/usr/bin/env python3
"""Fetch the lab lead's publications from OpenAlex into a committed JSON file.

The website renders from assets/data/publications.json; the browser never calls
OpenAlex directly. A weekly GitHub Action re-runs this script to refresh it.

Standard library only — no pip dependencies.

Usage:
    python3 scripts/fetch-publications.py
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ORCID = "0000-0002-2246-9905"           # lab lead's ORCID iD
MAILTO = "droy@gssst.iitkgp.ac.in"      # OpenAlex "polite pool" contact
API = "https://api.openalex.org"
USER_AGENT = f"LAN-Lab-website/1.0 (mailto:{MAILTO})"

# Two works are treated as the same paper when their title token sets overlap
# at least this much (catches preprint/published pairs with reworded titles).
SIMILARITY_THRESHOLD = 0.75

OUT_PATH = (
    Path(__file__).resolve().parent.parent / "assets" / "data" / "publications.json"
)


def get_json(url):
    """GET a URL and parse JSON, retrying a couple of times on failure."""
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001 - retry on any transport error
            if attempt == 2:
                raise
            print(f"  request failed ({exc}); retrying...", file=sys.stderr)
            time.sleep(2)


def resolve_author_id(orcid):
    """Resolve an ORCID iD to an OpenAlex author id (e.g. A5012345678)."""
    url = f"{API}/authors/orcid:{orcid}?mailto={MAILTO}"
    try:
        data = get_json(url)
        author_id = data.get("id", "") or ""        # https://openalex.org/A...
        short = author_id.rsplit("/", 1)[-1]
        if short.startswith("A"):
            return short
    except Exception as exc:  # noqa: BLE001
        print(f"  author-id resolution failed: {exc}", file=sys.stderr)
    return None


def fetch_works(filter_expr):
    """Cursor-paginate every work matching an OpenAlex filter expression."""
    works = []
    cursor = "*"
    while cursor:
        params = urllib.parse.urlencode(
            {
                "filter": filter_expr,
                "per-page": 200,
                "sort": "publication_date:desc",
                "cursor": cursor,
                "mailto": MAILTO,
            }
        )
        data = get_json(f"{API}/works?{params}")
        results = data.get("results", []) or []
        works.extend(results)
        cursor = data.get("meta", {}).get("next_cursor")
        if not results:
            break
    return works


def clean_title(title):
    """Strip stray escape artifacts and collapse whitespace in a title."""
    if not title:
        return "Untitled"
    return " ".join(title.replace("\\n", " ").split())


def orcid_matches(orcid_url, orcid):
    return bool(orcid_url) and orcid in orcid_url


def extract(work, orcid):
    """Reduce a raw OpenAlex work to the fields the website needs."""
    authorships = work.get("authorships") or []
    authors = []
    lead_index = -1
    for i, authorship in enumerate(authorships):
        author = authorship.get("author") or {}
        authors.append(author.get("display_name") or "Unknown")
        if lead_index < 0 and orcid_matches(author.get("orcid"), orcid):
            lead_index = i

    primary = work.get("primary_location") or {}
    source = primary.get("source") or {}

    best_oa = work.get("best_oa_location") or {}
    pdf_url = best_oa.get("pdf_url")
    if not pdf_url:
        pdf_url = (work.get("open_access") or {}).get("oa_url")

    return {
        "title": clean_title(work.get("title") or work.get("display_name")),
        "authors": authors,
        "lead_author_index": lead_index,
        "year": work.get("publication_year"),
        "date": work.get("publication_date"),
        "venue": source.get("display_name"),
        "type": work.get("type"),
        "doi_url": work.get("doi"),
        "openalex_url": work.get("id"),
        "pdf_url": pdf_url,
        "cited_by_count": work.get("cited_by_count", 0),
    }


# --- de-duplication -------------------------------------------------------

def title_tokens(title):
    """Lowercased alphanumeric word set for a title."""
    norm = "".join(c if (c.isalnum() or c == " ") else " " for c in title.lower())
    return set(norm.split())


def same_paper(a, b):
    """True when two works look like the same paper (incl. preprint twins)."""
    ta, tb = title_tokens(a["title"]), title_tokens(b["title"])
    if not ta or not tb:
        return False
    if ta == tb:
        return True
    jaccard = len(ta & tb) / len(ta | tb)
    return jaccard >= SIMILARITY_THRESHOLD


def is_preprint(work):
    """Heuristic: arXiv / preprint records vs. published versions."""
    venue = (work.get("venue") or "").lower()
    doi = (work.get("doi_url") or "").lower()
    return work.get("type") == "preprint" or "arxiv" in venue or "arxiv" in doi


def dedupe(works):
    """Cluster duplicate/preprint records; keep one primary per paper."""
    n = len(works)
    parent = list(range(n))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        parent[find(a)] = find(b)

    for i in range(n):
        for j in range(i + 1, n):
            if same_paper(works[i], works[j]):
                union(i, j)

    clusters = {}
    for i, work in enumerate(works):
        clusters.setdefault(find(i), []).append(work)

    deduped = []
    merges = []
    for cluster in clusters.values():
        # primary: prefer published over preprint, then most-cited, then has venue
        cluster.sort(
            key=lambda w: (
                is_preprint(w),
                -(w.get("cited_by_count") or 0),
                w.get("venue") is None,
            )
        )
        primary, *dropped = cluster
        if dropped:
            # keep the best available PDF and the highest citation count
            if not primary.get("pdf_url"):
                for w in dropped:
                    if w.get("pdf_url"):
                        primary["pdf_url"] = w["pdf_url"]
                        break
            primary["cited_by_count"] = max(
                w.get("cited_by_count") or 0 for w in cluster
            )
            merges.append((primary, dropped))
        deduped.append(primary)

    if merges:
        print(f"\nMerged {len(merges)} duplicate/preprint group(s):")
        for primary, dropped in merges:
            print(f'  kept   "{primary["title"]}" ({primary.get("venue") or "—"})')
            for w in dropped:
                print(f'  dropped "{w["title"]}" ({w.get("venue") or "—"})')

    return deduped


def main():
    print(f"Resolving ORCID {ORCID} ...")
    author_id = resolve_author_id(ORCID)
    if author_id:
        print(f"  OpenAlex author id: {author_id}")
        filter_expr = f"author.id:{author_id}"
    else:
        print("  could not resolve author id; falling back to author.orcid filter")
        filter_expr = f"author.orcid:{ORCID}"

    print(f"Fetching works ({filter_expr}) ...")
    raw = [extract(w, ORCID) for w in fetch_works(filter_expr)]
    print(f"  fetched {len(raw)} raw records")

    works = dedupe(raw)

    # newest first; works with no date sort to the end
    works.sort(key=lambda w: (w.get("date") or "", w.get("year") or 0), reverse=True)

    payload = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "OpenAlex",
        "orcid": ORCID,
        "openalex_author_id": author_id,
        "raw_count": len(raw),
        "count": len(works),
        "works": works,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"\nWrote {len(works)} works ({len(raw)} raw) to {OUT_PATH}")


if __name__ == "__main__":
    main()
