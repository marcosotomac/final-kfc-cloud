import os
import time

from boto3.dynamodb.conditions import Key

from src.common.utils import get_table, response


def handler(event, _context):
    connection_id = event["requestContext"]["connectionId"]
    table = get_table("CONNECTIONS_TABLE")

    lookup = table.query(
        IndexName="connection-index",
        KeyConditionExpression=Key("connectionId").eq(connection_id),
    )
    items = lookup.get("Items", [])
    if not items:
        return response(404, {"message": "connection not found"})

    ttl_seconds = int(os.environ.get("CONNECTION_TTL_SECONDS", "3600"))
    expires_at = int(time.time()) + ttl_seconds

    for item in items:
        table.update_item(
            Key={"tenantId": item["tenantId"], "connectionId": connection_id},
            UpdateExpression="SET expiresAt = :exp",
            ExpressionAttributeValues={":exp": expires_at},
        )

    return response(200, {"message": "pong"})

