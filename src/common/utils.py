import json
import os
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
eventbridge = boto3.client("events")
sns = boto3.client("sns")
sfn = boto3.client("stepfunctions")


def get_ws_client():
    """
    Lazily create ApiGatewayManagementApi client using the websocket endpoint
    provided by Serverless. We create a new client per invocation to avoid
    cross-endpoint reuse when deployed across stages.
    """
    endpoint = os.environ["WEBSOCKET_API_ENDPOINT"]
    return boto3.client("apigatewaymanagementapi", endpoint_url=endpoint)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def to_decimal(value):
    if isinstance(value, list):
        return [to_decimal(v) for v in value]
    if isinstance(value, dict):
        return {k: to_decimal(v) for k, v in value.items()}
    if isinstance(value, float):
        return Decimal(str(value))
    return value


def json_dumps(obj) -> str:
    def _convert(o):
        if isinstance(o, (datetime,)):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        return str(o)

    return json.dumps(obj, default=_convert)


def response(status: int, body: dict | list | str, headers: dict | None = None):
    default_headers = {"Content-Type": "application/json"}
    default_headers.update(headers or {})
    payload = body if isinstance(body, str) else json_dumps(body)
    return {"statusCode": status, "headers": default_headers, "body": payload}


def get_table(name_env: str):
    return dynamodb.Table(os.environ[name_env])


def publish_event(detail_type: str, detail: dict, source: str = "kfc.orders"):
    eventbridge.put_events(
        Entries=[
            {
                "Source": source,
                "DetailType": detail_type,
                "Detail": json_dumps(detail),
                "EventBusName": os.environ["EVENT_BUS_NAME"],
            }
        ]
    )


def publish_notification(message: str, subject: str | None = None):
    sns.publish(
        TopicArn=os.environ["NOTIFICATIONS_TOPIC_ARN"],
        Message=message,
        Subject=subject or "kfc-order-notification",
    )


def send_ws_message(connection_id: str, payload: dict):
    client = get_ws_client()
    try:
        client.post_to_connection(ConnectionId=connection_id, Data=json_dumps(payload))
    except ClientError as exc:
        # If gone, caller should clean up.
        if exc.response["Error"]["Code"] in {"GoneException", "410"}:
            raise ConnectionGone(connection_id) from exc
        raise


def get_tenant_from_event(event) -> str:
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    path_params = event.get("pathParameters") or {}
    return headers.get("x-tenant-id") or path_params.get("tenantId")


def get_user_from_event(event) -> dict:
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    return {
        "userId": headers.get("x-user-id"),
        "role": headers.get("x-role"),
    }


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class ConnectionGone(Exception):
    def __init__(self, connection_id: str):
        super().__init__(f"connection {connection_id} is gone")
        self.connection_id = connection_id

