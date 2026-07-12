# API Contract Guidelines

## API Contract Rule

Create shared API contracts before independently implementing dependent modules.

When documenting an API contract, include the following details:
- **Endpoint path:** (e.g., `/api/v1/assets`)
- **HTTP method:** (e.g., `GET`, `POST`, `PUT`, `DELETE`)
- **Authentication requirement:** (e.g., Bearer Token required)
- **Allowed roles:** (e.g., `Admin`, `Employee`, `Auditor`)
- **Request body:** (Schema/Example)
- **Response structure:** (Schema/Example)
- **Validation errors:** (Expected error codes and messages)
- **Shared identifiers:** (e.g., `user_id`, `asset_id`)
