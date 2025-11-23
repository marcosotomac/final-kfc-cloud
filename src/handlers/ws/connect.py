import os
import time

from src.common.utils import get_table, now_iso, response


def handler(event, _context):
    params = event.get("queryStringParameters") or {}
    tenant_id = params.get("tenantId")
    role = params.get("role") or "guest"
    user_id = params.get("userId")

    if not tenant_id:
        return response(400, {"message": "tenantId is required"})

    connection_id = event["requestContext"]["connectionId"]
    ttl_seconds = int(os.environ.get("CONNECTION_TTL_SECONDS", "3600"))
    expires_at = int(time.time()) + ttl_seconds

    table = get_table("CONNECTIONS_TABLE")
    table.put_item(
        Item={
            "tenantId": tenant_id,
            "connectionId": connection_id,
            "role": role,
            "userId": user_id,
            "connectedAt": now_iso(),
            "expiresAt": expires_at,
        }
    )

    return response(200, {"message": "connected", "connectionId": connection_id})

