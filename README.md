# InternInsight

InternInsight turns fast-moving engineering meeting transcripts into a visual workspace of operational insight cards. It is built as a working prototype for interns who need to quickly understand ownership, decisions, blockers, uncertainty, and follow-up questions without reading a wall of notes.

## What Is This App?

The app has two parts:

- **Frontend:** A Next.js workspace where users paste a transcript, generate insight cards, move cards around, send cards to trash, restore them, and create lightweight connections between related cards.
- **Backend:** A Flask API that stores meetings and cards with SQLAlchemy, calls Gemini to extract structured insights, and returns meeting data to the workspace.

The core workflow is:

1. Paste a meeting transcript and optional agenda items.
2. Generate an operational workspace.
3. Review AI cards for summaries, actions, decisions, blockers, questions, and uncertainty.
4. Move cards, link related ideas, add manual notes/todos/blockers/actions, and trash or restore cards.

## Project Structure

```text
intern-insight/
├── app/                  # Flask backend
│   ├── api/              # Meeting and card endpoints
│   ├── services/         # Gemini extraction service
│   ├── main.py           # Flask app factory
│   ├── models.py         # SQLAlchemy models
│   └── schemas.py        # Marshmallow schemas
└── frontend/             # Next.js frontend
    ├── app/              # App Router pages
    └── src/              # Components, services, and types
```

## Environment Variables

Backend:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=sqlite:////tmp/interninsight.db
SECRET_KEY=change-this-for-production
FLASK_ENV=development
```

Frontend:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
```

Notes:

- `GEMINI_API_KEY` is required for meeting analysis.
- `DATABASE_URL` is optional locally; if omitted, the backend defaults to SQLite at `/tmp/interninsight.db`.
- Use a production database URL for deployment.

## How To Run Locally

### 1. Start The Backend

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install flask flask-cors flask-sqlalchemy marshmallow python-dotenv requests
$env:GEMINI_API_KEY="your_gemini_api_key"
python -m flask --app app.main run --debug --port 5000
```

The API should be available at:

```text
http://127.0.0.1:5000
```

Useful endpoints:

- `GET /health`
- `POST /api/meetings/analyze`
- `GET /api/meetings/`
- `GET /api/cards/`

### 2. Start The Frontend

In a second terminal:

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
```

Then run:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## How To Deploy

### Recommended Prototype Deployment

For the cleanest prototype deployment, deploy the frontend and backend as separate services:

- **Frontend:** Vercel
- **Backend:** Render, Railway, Fly.io, or another Python-friendly host
- **Database:** Managed Postgres or another production database supported by SQLAlchemy

### Deploy The Frontend To Vercel

1. Create a new Vercel project from this repository.
2. Set the Vercel **Root Directory** to `frontend`.
3. Add this environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url
```

4. Build command:

```text
npm run build
```

5. Output/framework preset:

```text
Next.js
```

### Deploy The Backend

Deploy the Flask service with these environment variables:

```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=your_production_database_url
SECRET_KEY=a_long_random_secret
FLASK_ENV=production
```

Backend start command:

```text
python -m flask --app app.main run --host 0.0.0.0 --port $PORT
```

If your host uses a WSGI server, point it at:

```text
app.main:app
```

For Postgres deployments, make sure the appropriate database driver is installed by your backend host, for example `psycopg2-binary`.

### CORS

The backend currently allows API CORS for development. Before a real production launch, restrict allowed origins to your deployed frontend domain.

## Prototype Notes

- Meeting analysis and extracted cards are persisted by the backend.
- Workspace-only interactions such as local card positions, trash state, and card-to-card links are currently browser state. They are ideal follow-up candidates for backend persistence.
- Manual cards created in the workspace are currently local UI cards, even though the backend has card CRUD endpoints.

## Useful Commands

Frontend:

```powershell
cd frontend
npm run build
npm run lint
```

Backend syntax check:

```powershell
python -m py_compile app\main.py app\api\meetings.py app\api\cards.py app\services\extraction_service.py
```
