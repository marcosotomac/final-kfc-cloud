import json

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

    order_item = {
        "tenantId": tenant_id,
        "orderId": order_id,
        "status": "placed",
        "items": items,
        "customer": customer,
        "notes": notes,
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

