import json

from botocore.exceptions import ClientError

from src.common.utils import (
    get_table,
    get_tenant_from_event,
    hash_password,
    new_id,
    now_iso,
    response,
    to_decimal,
)


def handler(event, _context):
    tenant_id = get_tenant_from_event(event)
    if not tenant_id:
        return response(400, {"message": "tenantId es requerido"})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return response(400, {"message": "JSON inválido"})

    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    role = (body.get("role") or "staff").lower()

    if not email or not password:
        return response(400, {"message": "email y password son requeridos"})

    salt, hashed = hash_password(password)
    user_id = new_id("user")
    now = now_iso()
    item = {
        "tenantId": tenant_id,
        "userId": user_id,
        "email": email,
        "passwordSalt": salt,
        "passwordHash": hashed,
        "role": role,
        "createdAt": now,
        "updatedAt": now,
    }

    table = get_table("USERS_TABLE")
    try:
        table.put_item(
            Item=to_decimal(item),
            ConditionExpression="attribute_not_exists(userId) AND attribute_not_exists(email)",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return response(409, {"message": "Usuario ya existe"})
        raise

    return response(201, {"userId": user_id, "email": email, "role": role})

