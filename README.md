# FinTech

FinTech is a financial wellness web app for India. It helps people understand their monthly cash flow, emergency savings, debts, goals, and possible next steps with transparent, deterministic calculations.

## Current implementation

The application includes the cinematic FinTech landing experience, mobile-first welcome flow, account-authentication pages for login, registration, and password recovery, a secure FastAPI backend, and a local SQLite-backed user/session model for development. The app still keeps the existing local-financial assessment and dashboard flow, and the final assessment logic remains deterministic and explainable without using AI-generated numbers.

The authentication system stores user accounts and hashed passwords in a local SQLite database, validates registration and login via Pydantic, and uses server-side session cookies. Registration currently uses email and password only; mobile-number authentication is not part of the sign-up form. In local development, the API uses its clearly scoped development verification flow when SMTP is absent. No production SMS or email provider is configured by default. Any email delivery requires SMTP configuration and deployment testing.

The assessment profile and transaction data remain local to the browser, and the app warns clearly about the difference between browser storage and production-grade account records. Do not use a shared/public browser and do not enter passwords, OTPs, bank credentials, card details, or government identity numbers. The app does not connect to banks or AI services by default.

The financial assessment is for education and self-reflection, not regulated investment, insurance, credit, tax, or personal financial advice. Calculations depend on user-entered estimates; missing details are called out rather than invented.

## Requirements

- Windows 10/11
- Node.js 20.19+ or 22.12+ (the project was installed with Node 26)
- npm

## Run locally in Windows PowerShell

Open PowerShell in the project folder and start the backend first:

```powershell
Set-Location "$HOME\Downloads\FinTech"
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = "backend"
python -m pip install -r backend\requirements.txt
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Open a second PowerShell window for the frontend:

```powershell
Set-Location "$HOME\Downloads\FinTech"
npm install
npm run dev -- --host 127.0.0.1
```

Open the frontend URL (`http://127.0.0.1:5173`) and the backend health endpoint (`http://127.0.0.1:8000/health`). Keep both terminals open while using the app.

## Verify and build

```powershell
npm test
npm run build
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```

To serve the compiled frontend locally:

```powershell
npm run preview -- --host 127.0.0.1
```

## Transaction CSV format

Import a UTF-8 CSV with a header row and these columns:

```csv
date,type,amount,category,note
2026-10-01,income,85000,Salary,October salary
2026-10-02,expense,1200,Food and groceries,Market
```

Dates must use `YYYY-MM-DD`; type must be `income` or `expense`; amounts must be positive. Invalid rows are counted and reported. Transactions are separate from monthly assessment estimates and do not silently alter them.

## Financial calculation notes

- Cash flow is entered monthly income minus entered monthly expenses.
- The savings-rate estimate only counts the monthly value in the `Investments` expense category divided by entered income; unallocated surplus is not assumed to have been saved.
- Emergency coverage uses accessible emergency savings divided by entered essential expenses. An educational three-month reference is used for stable income and six months for variable/seasonal income; this is configurable in the calculation code, not a universal recommendation.
- Debt repayment ratio is shown only when income is available and is a screening indicator.
- Net worth includes the assets and liabilities entered in the assessment. It is not a complete measure of financial health.
- Goal contributions use a no-return calculation and do not account for fees or inflation.

## Delete or export your information

Open **Settings** from the application navigation to download a JSON export or delete the profile, goals, and transactions in this browser. Deleting local profile data cannot remove a JSON/CSV export already downloaded. Browser site-data clearing also removes local data.

## Project layout

```text
src/
  components/     Shared navigation and layout
  lib/            Local storage and deterministic calculation engine
  App.tsx         Routes and local profile state
  pages.tsx       Landing, onboarding, dashboard, tools, and learning pages
  styles.css      Responsive design system
```

## Next steps before production

Add a FastAPI service, a SQLAlchemy-backed SQLite/PostgreSQL-compatible database, secure registration/authentication, per-user authorization, migrations, server-side validation, and API tests before storing records centrally. Add accessibility and end-to-end coverage, and obtain appropriate Indian regulatory/privacy review before enabling regulated recommendations or processing financial accounts. Never expose secret keys in browser environment variables.
