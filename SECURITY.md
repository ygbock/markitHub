# Security Remediation Plan

This document records the production-security baseline for markitHub.

## Current security posture

The application has been placed in a fail-closed Firestore mode on the
`security/remediation-phase-1` branch.

### Firestore

Browser writes are disabled for all collections. Public reads remain limited
to storefront-safe `products`, `categories`, and `reviews`.

Sensitive collections are not readable or writable directly from the browser:

- `customers`
- `staff`
- `orders`
- `audit_logs`
- `settings`
- `coupons`
- `monime_sessions`

This is intentionally breaking for existing client-side administration until
authenticated server-side operations are implemented.

## Required production architecture

Sensitive operations must follow:

1. Authenticate the caller.
2. Resolve tenant membership.
3. Resolve branch membership.
4. Check role/permission.
5. Validate the request against canonical server-side data.
6. Execute the business operation transactionally.
7. Write an audit event from the authenticated server identity.

The browser must never be authoritative for:

- product price
- inventory quantity
- customer identity
- coupon definition
- payment status
- order total
- staff role
- audit actor
- payment credentials

## Payment requirements

Payment settlement must only happen after a verified provider event.

A redirect such as `monime_success=true` is not payment proof.

The webhook implementation must verify:

- provider signature/authentication
- event ID / replay protection
- provider session ID
- internal order ID
- amount
- currency
- merchant/space
- provider payment status

Settlement must be idempotent and transactional.

## Secrets

Payment API tokens, webhook secrets, service-role keys, and other credentials
must remain server-side. They must not be stored in client-readable Firestore
settings or bundled into the frontend.

Any real credential that has previously been committed to source control or
exposed through client-readable settings should be rotated.

## Inventory

Inventory reservations must be durable and transactional. In-memory
reservation maps are not authoritative and cannot be used for production
stock control.

## API hardening

Sensitive API endpoints require authentication and authorization.

External URLs supplied by browsers must not be used as arbitrary server-side
fetch destinations. Provider endpoints must be configured server-side using
an allowlist.

Expensive AI/image endpoints require request-size limits, authentication
where appropriate, rate limiting, and provider usage controls.

## Remediation order

### P0
- Firestore access control
- secret removal and rotation
- payment settlement security
- webhook authentication and idempotency
- server-side cart/catalog authority
- inventory transactionality
- API authentication
- SSRF prevention

### P1
- centralized tenant/branch/RBAC middleware
- schema validation
- durable reservations
- immutable ledger transitions
- audit event integrity
- rate limiting and security headers

### P2
- strict TypeScript
- comprehensive unit/integration/security tests
- component decomposition
- dependency upgrades
- CI security gates
