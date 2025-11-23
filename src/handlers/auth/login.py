import json
import time

from boto3.dynamodb.conditions import Key

from src.common.utils import (
    get_table,
    get_tenant_from_event,
    response,
    sign_token,
    verify_password,
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
    if not email or not password:
        return response(400, {"message": "email y password son requeridos"})

    table = get_table("USERS_TABLE")
    result = table.query(
        IndexName="tenant-email-index",
        KeyConditionExpression=Key("tenantId").eq(tenant_id) & Key("email").eq(email),
        Limit=1,
    )
    items = result.get("Items") or []
    if not items:
        return response(401, {"message": "Credenciales inválidas"})

    user = items[0]
    if not verify_password(password, user["passwordSalt"], user["passwordHash"]):
        return response(401, {"message": "Credenciales inválidas"})

    secret = (event.get("headers") or {}).get("x-auth-secret") or "dev-secret"
    issued_at = int(time.time())
    token = sign_token(
        {
            "sub": user["userId"],
            "tenantId": tenant_id,
            "role": user.get("role"),
            "iat": issued_at,
        },
        secret,
    )

    return response(
        200,
        {
            "token": token,
            "user": {"userId": user["userId"], "email": user["email"], "role": user.get("role")},
        },
    )

