"""
FC Barcelona Dashboard - Flask Backend
API routes for serving scraped data.
"""

from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

import scraper

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path=""
)

# Enable CORS (Cross-Origin Resource Sharing) to allow frontend requests
CORS(app)

# Cache for scraped data (in production, use Redis or a database)
data_cache = {
    "data": None,
    "timestamp": None
}


def get_cached_data():
    """
    Get cached data or scrape new data if cache is old.
    Returns: dict with all Barcelona data.
    """
    now = datetime.now()

    # Refresh cache every 30 minutes (1800 seconds)
    if data_cache["data"] is None or (now - data_cache["timestamp"]).total_seconds() > 1800:
        print("Fetching fresh data...")
        data_cache["data"] = scraper.get_all_data()
        data_cache["timestamp"] = now

    return data_cache["data"]


# ==================== UI Route ====================

@app.route("/", methods=["GET"])
def home():
    """Serve the main dashboard HTML page."""
    if not FRONTEND_DIR.exists():
        return "Frontend folder not found.", 404
    return send_from_directory(FRONTEND_DIR, "index.html")


# ==================== API Routes ====================

@app.route("/api/club", methods=["GET"])
def get_club_info():
    """API endpoint: Return club information."""
    try:
        data = get_cached_data()
        return jsonify({"success": True, "data": data["club"]}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/squad", methods=["GET"])
def get_squad():
    """API endpoint: Return squad players."""
    try:
        data = get_cached_data()
        return jsonify({"success": True, "count": len(data["squad"]), "data": data["squad"]}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/news", methods=["GET"])
def get_news():
    """API endpoint: Return latest news."""
    try:
        data = get_cached_data()
        return jsonify({"success": True, "count": len(data["news"]), "data": data["news"]}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/matches", methods=["GET"])
def get_matches():
    """API endpoint: Return upcoming matches and recent results."""
    try:
        data = get_cached_data()
        return jsonify({"success": True, "data": data["matches"]}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500



@app.route("/api/trophies", methods=["GET"])
def get_trophies():
    """API endpoint: Return trophy history."""
    try:
        data = get_cached_data()
        return jsonify({"success": True, "count": len(data["trophies"]), "data": data["trophies"]}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/all", methods=["GET"])
def get_all():
    """API endpoint: Return all data at once."""
    try:
        data = get_cached_data()
        return jsonify({"success": True, "data": data}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


# ==================== Error Handlers ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors."""
    return jsonify({"success": False, "error": "Internal server error"}), 500


# ==================== Main ====================

if __name__ == "__main__":
    print("=" * 50)
    print("FC Barcelona Dashboard - Backend Server")
    print("=" * 50)
    print("Starting Flask server on http://localhost:5000")
    print("API endpoints:")
    print("  GET /api/club       - Club information")
    print("  GET /api/squad      - Squad players")
    print("  GET /api/news       - Latest news")
    print("  GET /api/matches    - Matches (upcoming & recent)")
    print("  GET /api/trophies   - Trophy history")
    print("  GET /api/all        - All data")
    print("=" * 50)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
