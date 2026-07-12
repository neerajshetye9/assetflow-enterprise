# AssetFlow Enterprise

A full-stack enterprise asset management system built for organizations to manage their physical and shared assets, employee allocations, maintenance workflows, bookings, and audit cycles.

---

## 👥 Team

| Member | GitHub | Role | Feature Area |
|--------|--------|------|--------------|
| Neeraj | [@neerajshetye9](https://github.com/neerajshetye9) | Owner | Authentication, Organization Setup, Audit |
| Atharva | [@atharvashirke18](https://github.com/atharvashirke18) | Collaborator | Asset Lifecycle, Allocation, Maintenance |
| Vignesh | [@vignesh752006](https://github.com/vignesh752006) | Collaborator | Booking, Dashboard, Reports, Deployment |

---

## 🌿 Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — merge via approved PR only |
| `develop` | Integration — all features merge here first |
| `feature/neeraj-auth-organization-audit` | Neeraj's feature branch |
| `feature/atharva-assets-allocation-maintenance` | Atharva's feature branch |
| `feature/vignesh-booking-dashboard-deployment` | Vignesh's feature branch |

---

## 🏗️ Project Structure

```
assetflow-enterprise/
├── frontend/          # React/Next.js frontend
├── backend/           # Node.js/Express backend
├── database/          # Schema migrations and seeds
├── docs/              # Project documentation
└── tests/             # Test suites
```

---

## 📚 Documentation

- [Team Module Ownership](docs/team-module-ownership.md)
- [Git Workflow](docs/git-workflow.md)
- [API Contract Guidelines](docs/api-contract-guidelines.md)
- [Database Ownership](docs/database-ownership.md)
- [Manual Integration Checklist](docs/manual-integration-checklist.md)

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

---

## ⚠️ Development Rules

- **Never push directly to `main`**
- **Never push directly to `develop`** without a reviewed PR
- **Never commit** `.env`, secrets, private keys, or `node_modules`
- All features must be developed on personal feature branches
- All PRs must target `develop`, not `main`
