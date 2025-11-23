import json

from botocore.exceptions import ClientError

from src.common.utils import get_table, now_iso, publish_event, response, sfn


STAGE_DONE_STATUS = {
    "kitchen": "kitchen_done",
    "packaging": "packaging_done",
    "delivery": "delivered",
}


def handler(event, _context):
    path = event.get("pathParameters") or {}
    tenant_id = path.get("tenantId")
    order_id = path.get("orderId")
    stage = path.get("stage")

    if not tenant_id or not order_id or not stage:
        return response(400, {"message": "tenantId, orderId y stage son requeridos"})

    stage = stage.lower()
    if stage not in STAGE_DONE_STATUS:
        return response(400, {"message": "stage invalido"})

    done_status = STAGE_DONE_STATUS[stage]
    now = now_iso()
    actor = _get_actor(event)
    table = get_table("ORDERS_TABLE")

    try:
        update_result = table.update_item(
            Key={"tenantId": tenant_id, "orderId": order_id},
            UpdateExpression=(
                "SET #status = :doneStatus, "
                "workflow.#stage.#stageStatus = :stageDone, "
                "workflow.#stage.completedAt = :now, "
                "workflow.#stage.actor = :actor, "
                "updatedAt = :now "
                "REMOVE workflow.#stage.taskToken"
            ),
            ConditionExpression="attribute_exists(workflow.#stage.taskToken)",
            ExpressionAttributeNames={
                "#status": "status",
                "#stage": stage,
                "#stageStatus": "status",
            },
            ExpressionAttributeValues={
                ":doneStatus": done_status,
                ":stageDone": "completed",
                ":now": now,
                ":actor": actor,
            },
            ReturnValues="ALL_OLD",
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return response(
                409, {"message": "No hay tarea pendiente para este stage"}
            )
        raise

    attrs = update_result.get("Attributes", {}) or {}
    token = attrs.get("workflow", {}).get(stage, {}).get("taskToken")

    if not token:
        return response(500, {"message": "No se encontró taskToken para el stage"})

    publish_event(
        "order.stage.completed",
        {
            "tenantId": tenant_id,
            "orderId": order_id,
            "stage": stage,
            "status": done_status,
            "completedAt": now,
            "actor": actor,
        },
    )

    sfn.send_task_success(
        taskToken=token,
        output=json.dumps(
            {
                "tenantId": tenant_id,
                "orderId": order_id,
                "stage": stage,
                "status": done_status,
                "completedAt": now,
            }
        ),
    )

    return response(200, {"orderId": order_id, "stage": stage, "status": done_status})


def _get_actor(event):
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    return headers.get("x-user-id") or headers.get("x-role") or "operator"
