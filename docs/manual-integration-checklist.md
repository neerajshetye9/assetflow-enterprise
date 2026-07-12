# Manual Integration Checklist

## Final Integration

After all three feature PRs are merged into `develop`:

1. Pull the latest `develop` branch.
2. Install dependencies.
3. Apply database migrations.
4. Run backend tests.
5. Run frontend tests.
6. Run validation tests.
7. Run integration tests.
8. Run production build.
9. Test role-based access.
10. Test shared workflows.

### Mandatory Integration Workflows

**Authentication:**
- Employee signup → Login → Role-based access

**Asset workflow:**
- Register asset → Available → Allocate → Transfer → Return

**Maintenance workflow:**
- Raise maintenance request → Pending → Approved → Under Maintenance → Resolved → Available

**Booking workflow:**
- Create booking → Prevent overlap → Allow back-to-back booking → Cancel or reschedule

**Audit workflow:**
- Create cycle → Assign auditor → Verify assets → Flag discrepancy → Close cycle

**Dashboard workflow:**
- Show live KPIs → Overdue returns → Active bookings → Maintenance activity → Pending transfers

---

Only after all tests pass:
Create a Pull Request: `develop` → `main`

**Do not merge automatically.**
**Wait for explicit approval.**
