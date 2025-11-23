from boto3.dynamodb.conditions import Key

from src.common.utils import get_table, get_tenant_from_event, response


def handler(event, _context):
    tenant_id = get_tenant_from_event(event)
    if not tenant_id:
        return response(400, {"message": "tenantId is required"})

    params = event.get("queryStringParameters") or {}
    status = params.get("status") if params else None
    limit = int(params.get("limit") or 50)

    table = get_table("ORDERS_TABLE")
    if status:
        result = table.query(
            IndexName="status-index",
            KeyConditionExpression=Key("tenantId").eq(tenant_id)
            & Key("status").begins_with(status),
            Limit=limit,
            ScanIndexForward=False,
        )
    else:
        result = table.query(
            KeyConditionExpression=Key("tenantId").eq(tenant_id),
            Limit=limit,
            ScanIndexForward=False,
        )

    return response(200, {"items": result.get("Items", [])})

