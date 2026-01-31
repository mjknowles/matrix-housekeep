#!/usr/bin/env sh
set -eu

NAMESPACE=${NAMESPACE:-ess}
USERNAME=${USERNAME:-admin}
SERVER_NAME=${SERVER_NAME:-ess.localhost}
SERVER_NAME=${SERVER_NAME:-ess.localhost}
POSTGRES_STS=${POSTGRES_STS:-ess-postgres}
POSTGRES_CONTAINER=${POSTGRES_CONTAINER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-synapse}
POSTGRES_USER=${POSTGRES_USER:-synapse_user}
SYNAPSE_SECRET_NAME=${SYNAPSE_SECRET_NAME:-ess-synapse}

echo "Setting Synapse admin flag for '@${USERNAME}:${SERVER_NAME}' in ${NAMESPACE}/${POSTGRES_STS}..."
USER_ID="@${USERNAME}:${SERVER_NAME}"
PGPASSWORD=$(kubectl -n "${NAMESPACE}" get secret "${SYNAPSE_SECRET_NAME}" -o jsonpath='{.data.SYNAPSE_POSTGRES_PASSWORD}' | base64 --decode)
kubectl -n "${NAMESPACE}" exec "sts/${POSTGRES_STS}" -c "${POSTGRES_CONTAINER}" -- \
  sh -c "PGPASSWORD='${PGPASSWORD}' psql -U '${POSTGRES_USER}' -d '${POSTGRES_DB}' -c \"UPDATE users SET admin=1 WHERE name='${USER_ID}';\""
