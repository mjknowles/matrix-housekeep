# Matrix Housekeep

Matrix Housekeep is a Synapse monitoring/moderation tool. It authenticates via
Matrix Authentication Service (MAS), verifies admin status through the Synapse
Admin API, and ingests Synapse usage statistics for reporting.

## Development

Use Tilt to run the app and patch Synapse/MAS configs locally:

```sh
tilt up
```

## Creating an admin user (MAS)

```sh
kubectl exec -n ess -it deploy/ess-matrix-authentication-service -- mas-cli manage register-user
```

Note: the MAS `--admin` flag makes the user a MAS admin. To request Synapse admin
scopes, the user must have `can_request_admin` enabled in MAS policy or via the
MAS admin API (dev policy uses `admin_users: []`).

## Creating a Synapse admin user (Synapse)

```sh
scripts/register_synapse_admin.sh
```

If it fails with 404, your Synapse deployment may not expose the shared-secret
registration endpoint when MAS/MSC3861 is enabled.
In this environment the script sets the admin flag directly in the Synapse
database.
