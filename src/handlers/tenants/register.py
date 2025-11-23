import json

from src.common.utils import (
    get_table,
    new_id,
    now_iso,
    publish_event,
    response,
    to_decimal,
)


def handler(event, _context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "Invalid JSON body"})

    name = (body.get("name") or "").strip()
    contact = body.get("contact", {})
    if not name:
        return response(400, {"message": "name is required"})

    tenant_id = new_id("tenant")
    item = {
        "tenantId": tenant_id,
        "name": name,
        "contact": contact,
        "status": "active",
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }

    table = get_table("TENANTS_TABLE")
    table.put_item(Item=to_decimal(item))

    publish_event(
        "tenant.created",
        {"tenantId": tenant_id, "name": name, "contact": contact},
    )

    return response(201, {"tenantId": tenant_id, "name": name, "status": "active"})

