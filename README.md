# FC Barcelona Web Scraping Dashboard

A full-stack web application that aggregates FC Barcelona information from public sources using web scraping and displays it in a responsive dashboard.

## Features
- Club information (stadium, manager, colors, nickname)
- Squad players
- Latest news headlines
- Upcoming matches and recent results
- Trophy history
- Responsive card-based UI

## Tech Stack
Backend: Python, Flask, Requests, BeautifulSoup, Flask-CORS
Frontend: HTML, CSS, JavaScript

## Project Structure
```
barcelona-scraper-app/
├── backend/
│   ├── app.py
│   ├── scraper.py
│   ├── requirements.txt
│   ├── data/
│   │   └── barcelona.json
│   └── utils/
│       └── helpers.py
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── assets/
│       ├── images/
│       └── icons/
├── scraper_jobs/
│   └── scheduler.py
├── README.md
└── .gitignore
```

## Quick Start
1. Create a virtual environment (optional)
```
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies
```
pip install -r backend/requirements.txt
```

3. Run the backend
```
python backend/app.py
```

4. Open the dashboard
- http://localhost:5000 (served by Flask)
- or open frontend/index.html directly

## API Endpoints
- GET /api/club
- GET /api/squad
- GET /api/news
- GET /api/matches
- GET /api/trophies
- GET /api/all

## Configuration
- Update the API base URL in frontend/script.js if running the backend on another host/port.

## Notes
Scraping uses public pages and includes fallback data if a site blocks requests.

Last Updated: March 4, 2026
