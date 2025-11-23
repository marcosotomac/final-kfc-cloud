from boto3.dynamodb.conditions import Key

from src.common.utils import get_table, response


def handler(event, _context):
    connection_id = event["requestContext"]["connectionId"]
    table = get_table("CONNECTIONS_TABLE")

    # Find by connection GSI
    lookup = table.query(
        IndexName="connection-index",
        KeyConditionExpression=Key("connectionId").eq(connection_id),
    )
    items = lookup.get("Items", [])
    for item in items:
        table.delete_item(
            Key={"tenantId": item["tenantId"], "connectionId": connection_id}
        )

    return response(200, {"message": "disconnected"})
