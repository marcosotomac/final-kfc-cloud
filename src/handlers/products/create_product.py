import json

from src.common.utils import get_table, new_id, now_iso, response, to_decimal, get_tenant_from_event


def handler(event, _context):
    tenant_id = get_tenant_from_event(event)
    if not tenant_id:
        return response(400, {"message": "tenantId es requerido"})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "JSON inválido"})

    name = (body.get("name") or "").strip()
    price = body.get("price")
    stock = body.get("stock")
    description = body.get("description")

    if not name:
        return response(400, {"message": "name es requerido"})
    if price is None or price < 0:
        return response(400, {"message": "price es requerido y debe ser >= 0"})
    if stock is None or stock < 0:
        return response(400, {"message": "stock es requerido y debe ser >= 0"})

    product_id = new_id("prod")
    now = now_iso()
    item = {
        "tenantId": tenant_id,
        "productId": product_id,
        "name": name,
        "price": float(price),
        "stock": int(stock),
        "description": description,
        "createdAt": now,
        "updatedAt": now,
    }

    table = get_table("PRODUCTS_TABLE")
    table.put_item(Item=to_decimal(item))
    return response(201, {"productId": product_id, "name": name, "price": price, "stock": stock})

