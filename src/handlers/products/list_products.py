from boto3.dynamodb.conditions import Key

from src.common.utils import get_table, get_tenant_from_event, response


def handler(event, _context):
    tenant_id = get_tenant_from_event(event)
    if not tenant_id:
        return response(400, {"message": "tenantId es requerido"})

    table = get_table("PRODUCTS_TABLE")
    result = table.query(
        KeyConditionExpression=Key("tenantId").eq(tenant_id),
        ScanIndexForward=True,
    )
    return response(200, {"items": result.get("Items", [])})

