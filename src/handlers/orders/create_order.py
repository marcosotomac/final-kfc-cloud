import json
from decimal import Decimal

from src.common.utils import (
    get_table,
    get_tenant_from_event,
    new_id,
    now_iso,
    publish_event,
    response,
    to_decimal,
)


def handler(event, _context):
    tenant_id = get_tenant_from_event(event)
    if not tenant_id:
        return response(400, {"message": "tenantId is required"})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON body"})

    items = body.get("items") or []
    customer = body.get("customer") or {}
    notes = body.get("notes")

    if not items:
        return response(400, {"message": "items are required"})
    if not customer.get("name"):
        return response(400, {"message": "customer.name is required"})

    order_id = new_id("order")
    now = now_iso()
    workflow = {
        "kitchen": {"status": "pending"},
        "packaging": {"status": "pending"},
        "delivery": {"status": "pending"},
    }

    products_table = get_table("PRODUCTS_TABLE")
    enriched_items = []
    updates = []
    for item in items:
        product_id = item.get("productId")
        qty = int(item.get("quantity") or 0)
        if not product_id or qty <= 0:
            return response(400, {"message": "Cada item requiere productId y quantity > 0"})
        prod = products_table.get_item(Key={"tenantId": tenant_id, "productId": product_id}).get(
            "Item"
        )
        if not prod:
            return response(404, {"message": f"Producto {product_id} no encontrado"})
        if prod.get("stock", 0) < qty:
            return response(400, {"message": f"Stock insuficiente para {prod.get('name')}"})
        price = float(prod.get("price", 0))
        enriched_items.append(
            {
                "productId": product_id,
                "name": prod.get("name"),
                "price": price,
                "quantity": qty,
                "lineTotal": round(price * qty, 2),
            }
        )
        updates.append(
            {
                "Key": {"tenantId": tenant_id, "productId": product_id},
                "UpdateExpression": "SET stock = stock - :q",
                "ConditionExpression": "stock >= :q",
                "ExpressionAttributeValues": {":q": qty},
            }
        )

    # Decrement stock atomically
    client = products_table.meta.client
    transact_items = [
        {
            "Update": {
                "TableName": products_table.name,
                "Key": to_decimal(u["Key"]),
                "UpdateExpression": u["UpdateExpression"],
                "ConditionExpression": u["ConditionExpression"],
                "ExpressionAttributeValues": to_decimal(u["ExpressionAttributeValues"]),
            }
        }
        for u in updates
    ]
    if transact_items:
        client.transact_write_items(TransactItems=transact_items)

    total_amount = sum([item["lineTotal"] for item in enriched_items])
    order_item = {
        "tenantId": tenant_id,
        "orderId": order_id,
        "status": "placed",
        "items": enriched_items,
        "customer": customer,
        "notes": notes,
        "totalAmount": Decimal(str(total_amount)),
        "workflow": workflow,
        "createdAt": now,
        "updatedAt": now,
    }

    orders_table = get_table("ORDERS_TABLE")
    orders_table.put_item(Item=to_decimal(order_item))

    publish_event(
        "order.created",
        {
            "orderId": order_id,
            "tenantId": tenant_id,
            "status": "placed",
            "createdAt": now,
            "workflow": workflow,
            "customer": customer,
        },
    )

    return response(201, {"orderId": order_id, "status": "placed", "workflow": workflow})
