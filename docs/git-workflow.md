# Git Workflow

## Daily Development Workflow

At the beginning of work, always synchronize with the main integration branch before working on your feature branch:

```bash
git status
git fetch origin
git switch develop
git pull origin develop
git switch <member-feature-branch>
git merge develop
```

### Resolving Merge Conflicts
If merge conflicts occur:
1. **Do not automatically choose one side.**
2. Explain the conflicting files.
3. Explain both changes.
4. Ask before resolving business-logic conflicts.

### Commit Guidelines
Before a commit, verify your changes:
```bash
git status
git diff
```
Run relevant tests.

**Never commit:**
- `.env` files
- Passwords
- API secrets
- Database passwords
- Private keys
- `node_modules`
- Build folders
- Temporary AI files

Before push, verify your identity and current branch:
```bash
git config user.name
git config user.email
git remote -v
git branch --show-current
```

Then stage specific files (avoid `git add .` when unrelated files are present):
```bash
git add <specific-files>
git commit -m "feat(module): description"
git push
```

**Do not push to main.**

---

### Meaningful Commit Examples

**Neeraj examples:**
- `feat(auth): implement employee login`
- `feat(rbac): block self-assigned privileged roles`
- `feat(organization): add department management`
- `feat(audit): implement audit cycle workflow`
- `test(auth): add login API tests`

**Atharva examples:**
- `feat(assets): implement asset registration`
- `feat(allocation): prevent duplicate allocation`
- `feat(transfer): add approval workflow`
- `feat(returns): record asset condition`
- `feat(maintenance): implement approval lifecycle`
- `test(assets): validate lifecycle transitions`

**Vignesh examples:**
- `feat(booking): implement resource reservation`
- `fix(booking): reject overlapping time slots`
- `feat(dashboard): add operational KPI APIs`
- `feat(notifications): add overdue alerts`
- `feat(reports): implement export functionality`
- `chore(deploy): configure production deployment`
