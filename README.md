# VeritusOS Community Edition

Open-source school management platform. Modern, modular, and built for real school operations.

## What is VeritusOS?

VeritusOS is a modern operating system for schools — handling finance, enrollment, pedagogy, kitchen, library, events, and more in a single platform.

**Community Edition** is the free, open-source core that any school can self-host and use immediately.

## Tech Stack

- **React 19** + **Vite 5** — fast, modern frontend
- **Tailwind CSS 4** — utility-first styling
- **React Router 7** — client-side routing
- **Supabase** — auth, database, and real-time (optional — works offline with localStorage)
- **Repository Pattern** — swap between local and Supabase backends transparently

## Features

- Dashboard with financial KPIs and trend charts
- Student, family, and responsible management
- Financial records with 6-status state machine (pending, paid, overdue, cancelled, conciliated, renegotiated)
- Chart of accounts (plano de contas) with hierarchical categories
- Contract engine with automatic installment generation
- Bank reconciliation with auto-matching
- Recurring transaction templates
- Period locking for accounting safety
- Audit trail with before/after snapshots
- Scholarship and discount tracking
- Employee management
- Kitchen/meal management
- Event management with orders
- Pedagogical module (class reports, plans, attendance)
- Asset catalog and library
- Role-based access (admin, secretaria, cozinha)
- CSV and Excel export
- Works fully offline (localStorage) or online (Supabase)

## Quick Start

```bash
git clone https://github.com/veritus-os/veritus-community.git
cd veritus-community
npm install
npm run dev
```

The app runs fully offline out of the box using localStorage.

### With Supabase (optional)

Create a `.env` file:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Apply migrations:

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
```

## Project Structure

```
veritus-community/
├── src/
│   ├── components/        # Shared UI components
│   ├── core/
│   │   ├── auth/          # Authentication and role context
│   │   ├── data/          # Seed data (chart of accounts, etc.)
│   │   ├── repositories/  # Data access layer (local + supabase)
│   │   └── services/      # Business logic services
│   ├── lib/               # Utilities (export, supabase client)
│   └── pages/             # Page components
├── supabase/
│   ├── migrations/        # Database schema migrations
│   └── seed.sql           # Seed data
├── docs/                  # Internal documentation
└── lib/                   # Shared libraries
```

## Architecture

VeritusOS uses a **repository pattern** with a service layer:

```
Pages → Services → Repositories → Storage (localStorage or Supabase)
```

This means:
- Business logic lives in services, not components
- Data access is abstracted — swap backends without touching UI
- Each module (finance, pedagogy, kitchen) is self-contained

## Related Repos

| Repo | Description |
|------|-------------|
| [veritus-core](https://github.com/veritus-os/veritus-core) | Enterprise features, billing, advanced RBAC, AI integrations |
| [veritus-ui](https://github.com/veritus-os/veritus-ui) | Shared design system and UI components |
| [veritus-docs](https://github.com/veritus-os/veritus-docs) | Documentation site |

## License

MIT License — see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome. Please open an issue before submitting large PRs.
