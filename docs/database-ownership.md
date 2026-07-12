# Database Ownership

## Database Ownership Rule

Members may reference shared IDs but **should not rename or modify another member’s tables without agreement.**

### Examples

**Atharva** may use:
- `user_id`
- `department_id`
- `category_id`
*(but should not independently rename the users, departments, or categories schema.)*

**Vignesh** may use:
- `user_id`
- `asset_id`
- `resource_id`
*(but cross-module changes must be documented and reviewed.)*
