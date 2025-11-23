from boto3.dynamodb.conditions import Key

from src.common.utils import (
    ConnectionGone,
    get_table,
    publish_notification,
    response,
    send_ws_message,
)


def handler(event, _context):
    """
    Fan-out EventBridge events to WebSocket clients and SNS subscribers.
    """
    detail = event.get("detail") or {}
    detail_type = event.get("detail-type") or event.get("detailType") or "order.event"
    tenant_id = detail.get("tenantId")

    if not tenant_id:
        # Nothing to deliver
        return response(200, {"message": "No tenant on event"})

    payload = {"type": detail_type, "detail": detail}
    connections_table = get_table("CONNECTIONS_TABLE")
    stale_connections = []

    result = connections_table.query(
        KeyConditionExpression=Key("tenantId").eq(tenant_id)
    )
    for conn in result.get("Items", []):
        try:
            send_ws_message(conn["connectionId"], payload)
        except ConnectionGone:
            stale_connections.append(conn["connectionId"])

    # Clean up disconnected clients
    for connection_id in stale_connections:
        connections_table.delete_item(
            Key={"tenantId": tenant_id, "connectionId": connection_id}
        )

    publish_notification(
        message=f"{detail_type} for tenant {tenant_id}: {detail}",
        subject=f"{detail_type} - {tenant_id}",
    )

    return response(200, {"delivered": len(result.get("Items", [])), "stale": len(stale_connections)})

