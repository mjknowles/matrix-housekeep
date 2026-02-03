# Implementation Plan

Goal: Turn this project into a Synapse monitoring/moderation tool that authenticates via
matrix-authentication-service (MAS), receives Synapse usage statistics, and renders key metrics.

Checklist (we will track progress by checking items as we implement):

- [ ] Confirm cluster resources and expectations
- [ ] Define authentication + authorization model (MAS + privileges)
- [x] Implement stats ingestion endpoint (Synapse usage reporting)
- [x] Persist and aggregate usage data
- [ ] Build UI for usage analytics
- [x] Wire Synapse to report to this app via Tilt patching
- [ ] Add local dev wiring and verification steps
- [ ] Add tests and operational docs
- [x] Persist dev DB data across rebuilds (PVC for sqlite)

Details

1) Confirm cluster resources and expectations
- [x] Inspect existing Synapse deployment, namespace, configmaps, and service names in the cluster.
- [x] Identify MAS issuer URL, client registration requirements, and callback URLs.
- [x] Decide where this app will be exposed inside the cluster (service name/port, ingress).
- [ ] Align on which Synapse instances should report to this app (single vs multiple).
- [ ] Confirm/record cluster facts (current):
      Synapse: statefulset `ess-synapse-main`, service `ess-synapse` (8008/8009), configmap `ess-synapse`
      MAS: service `ess-matrix-authentication-service` (8080 public, 8081 internal), public_base `https://account.ess.localhost`
      App: service `matrix-housekeep` (80 -> 5173)
      Synapse config: `report_stats: false` (currently disabled)

2) Define authentication + authorization model (MAS + privileges)
- [ ] Decide how app users are identified (Matrix user IDs? groups? admin users?).
- [ ] Choose privilege model (simple allowlist, Matrix groups/roles, or claims-based via MAS).
- [ ] Define role/permission matrix (e.g., admin, moderator, viewer).
- [ ] Document how to bootstrap the first admin user.
- [ ] Confirm MAS OIDC/OAuth2 flow and required scopes/claims for the app.
- [ ] Confirm MAS discovery URL and issuer (expected: `https://account.ess.localhost/.well-known/openid-configuration`).
- [ ] Decide where app client registration lives (MAS admin UI vs config).
- [ ] Decide authorization source of truth:
      Option A: allowlist of Matrix user IDs in app env/config.
      Option B: claim-based roles from MAS (if available).
      Option C: verify Matrix server admin via Synapse admin API.
- [ ] Decide whether to populate MAS `policy.data.admin_users` or `admin_clients` for app access.
- [ ] If using `can_request_admin`, document how to set it for admin users in MAS.
- [ ] Choose auth flow: MAS user login -> exchange for Synapse access token -> verify admin via Synapse Admin API.
- [x] Identify the Synapse endpoint to verify admin status with the user's access token.
      Use `GET /_synapse/admin/v2/users/<user_id>` and check the `admin` field in the response.
- [ ] Ensure MAS client is allowed to request admin scope (`urn:synapse:admin:*`)
      and client API scope (`urn:matrix:org.matrix.msc2967.client:api:*`) for whoami.
- [x] Implement MAS login routes, token exchange, whoami lookup, and admin check in the app.
- [x] In MAS/MSC3861 environments, bootstrap Synapse admin via DB update script.

3) Implement stats ingestion endpoint (Synapse usage reporting)
- [ ] Study Synapse usage stats payload fields and frequency from the Synapse docs.
- [ ] Plan for stats cadence: initial report ~5 minutes after startup, then every ~3 hours.
- [ ] Map key fields we want to surface:
      `total_users`, `total_room_count`, `daily_active_users`, `monthly_active_users`,
      `daily_messages`, `daily_sent_messages`, `daily_active_rooms`, `server_context`, `homeserver`.
- [x] Define the HTTP endpoint path and authentication mechanism for Synapse posts
      (shared secret, mTLS, or allowlist by source).
- [x] Ensure the usage collection endpoint is not publicly accessible.
- [x] Add a SvelteKit server route to receive and validate the payload.
- [x] Add request validation and error handling (schema, size limits, rate limiting).
- [ ] Capture origin metadata (server name, server_context).

4) Persist and aggregate usage data
- [x] Define DB schema to store raw stats snapshots (timestamped).
- [ ] Add aggregate/materialized views for common metrics (daily/weekly counts).
- [ ] Decide retention and compaction strategy for raw data.
- [ ] Build queries for key metrics:
      total rooms/users, DAU/MAU, messages/day, users per room.
- [x] Remove the arbitrary 10-report UI limit and add pagination/windowing for large datasets.

5) Build UI for usage analytics
- [x] Define data API endpoints for chart/summary widgets.
- [ ] Implement dashboard views:
      - Overview cards (rooms, users, DAU/MAU)
      - Activity trends (messages/day)
      - Distribution (users per room, messages per room)
      - [x] Initial charts: message volume and users/rooms trends
- [ ] Add filters (date range, server_context).
- [ ] Add loading/empty/error states.
- [ ] Add SSE or polling to auto-refresh dashboards as new reports arrive.
- [ ] Charting library: use `svelte-echarts` + Apache ECharts with tree-shaking (import only needed charts/components/renderers).
- [ ] Visualization plan (based on Synapse usage payloads):
      - Summary cards: total users, total rooms, DAU, MAU, daily messages, uptime.
      - Trend lines: total users/rooms over time; DAU/MAU; daily messages & sent messages.
      - E2EE activity: daily e2ee messages vs total messages; daily active e2ee rooms vs total active rooms.
      - User composition: native vs bridged vs guest (daily_user_type_*).
      - Resource health: cpu_average and memory_rss over time, cache_factor and event_cache_size as annotations.
      - Client activity: r30v2_users_* stacked bar/area (when non-zero).
      - Context breakdown: server_context split if multiple contexts report.

6) Wire Synapse to report to this app via Tilt patching
- [x] Identify Synapse configmap keys for `report_stats_endpoint` and related options.
- [x] Add Tilt k8s patch to inject the reporting endpoint into Synapse configmap `ess-synapse`
      (in `01-homeserver-underrides.yaml` where `report_stats: false` currently lives).
- [x] Set `report_stats: true` and `report_stats_endpoint: http://matrix-housekeep.ess.svc.cluster.local/report-usage-stats/push?access_token=...`
      (or another agreed endpoint path).
- [x] Ensure the app service DNS name resolves within the cluster.
- [ ] Validate Synapse reload/restart behavior after config change.

7) Add local dev wiring and verification steps
- [ ] Provide a dev seed script to simulate stats posts.
- [x] Add example environment configuration for MAS + stats endpoint.
- [ ] Document how to restart Synapse to trigger a new usage report (~5 min after startup).
- [ ] Document how to verify ingestion (logs, DB rows, UI).
- [ ] Add port-forward/ingress notes for MAS callbacks in local dev.

8) Tests and operational docs
- [ ] Add endpoint tests for stats ingestion (valid + invalid payloads).
- [ ] Add authorization tests for privileged access.
- [ ] Add a short RUNBOOK section (debugging, common failures, data retention).

9) Productionization checklist (later)
- [ ] Convert dev-only Tilt patches into Helm values for MAS and Synapse.
- [ ] Add Helm values for MAS clients (client_id, redirect_uris) and policy/admins.
- [ ] Move MAS client secrets to Kubernetes Secrets (not ConfigMaps).
- [ ] Add separate redirect URIs for production domains.
- [ ] Add Synapse `report_stats`/`report_stats_endpoint` via Helm values.
- [ ] Add app config values (MAS issuer, client_id, Synapse base URL) via Helm chart values.
- [ ] Add ingress/hostname for the app + TLS.
- [ ] Document required scopes and admin policy for MAS.
- [ ] Ensure MAS config sync behavior is understood (restart/sync) when changing clients.
- [ ] Replace dev-only auto-migration with proper migrations (and/or init job) for production.

10) Synapse Admin API capabilities (later)
- [ ] Enumerate admin endpoints we want in Housekeep (user admin, rooms, media, federation, etc.).
- [ ] Implement an API client wrapper that uses the MAS-issued access token.
- [ ] Add server-side routes for admin actions (ban/deactivate, shadow-ban, media quarantine).
- [ ] Add UI for common workflows with audit logging.
- [ ] Add permission checks per action and rate limiting.
