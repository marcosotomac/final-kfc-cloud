from src.common.utils import get_table, response


def handler(event, _context):
    path_params = event.get("pathParameters") or {}
    tenant_id = path_params.get("tenantId")
    order_id = path_params.get("orderId")

    if not tenant_id or not order_id:
        return response(400, {"message": "tenantId and orderId are required"})

    table = get_table("ORDERS_TABLE")
    result = table.get_item(Key={"tenantId": tenant_id, "orderId": order_id})
    item = result.get("Item")
    if not item:
        return response(404, {"message": "Order not found"})

    return response(200, item)

