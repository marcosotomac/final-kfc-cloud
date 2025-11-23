import json

from src.common.utils import get_table, now_iso, publish_event, response


def process_stage(event, stage_name: str, start_status: str, done_status: str):
    """
    Generic processor for each workflow stage. Called by kitchen/packaging/delivery
    workers that receive SQS events with Step Functions task tokens.
    """
    table = get_table("ORDERS_TABLE")
    processed = []

    for record in event.get("Records", []):
        try:
            body = json.loads(record["body"])
        except json.JSONDecodeError:
            processed.append(
                {"status": "skipped", "reason": "Invalid JSON message body"}
            )
            continue

        tenant_id = body.get("tenantId")
        order_id = body.get("orderId")
        task_token = body.get("taskToken")
        actor = body.get("actor") or stage_name

        if not all([tenant_id, order_id, task_token]):
            processed.append(
                {
                    "orderId": order_id,
                    "tenantId": tenant_id,
                    "status": "skipped",
                    "reason": "Missing identifiers",
                }
            )
            continue

        start_time = now_iso()
        table.update_item(
            Key={"tenantId": tenant_id, "orderId": order_id},
            UpdateExpression=(
                "SET #status = :orderStatus, "
                "workflow.#stage.#stageStatus = :stageInProgress, "
                "workflow.#stage.startedAt = if_not_exists(workflow.#stage.startedAt, :start), "
                "workflow.#stage.actor = :actor, "
                "workflow.#stage.taskToken = :token, "
                "updatedAt = :now"
            ),
            ExpressionAttributeNames={
                "#status": "status",
                "#stage": stage_name,
                "#stageStatus": "status",
            },
            ExpressionAttributeValues={
                ":orderStatus": start_status,
                ":stageInProgress": "in_progress",
                ":start": start_time,
                ":actor": actor,
                ":token": task_token,
                ":now": start_time,
            },
        )

        publish_event(
            "order.stage.started",
            {
                "tenantId": tenant_id,
                "orderId": order_id,
                "stage": stage_name,
                "status": start_status,
                "startedAt": start_time,
                "actor": actor,
            },
        )

        processed.append(
            {
                "orderId": order_id,
                "tenantId": tenant_id,
                "status": "in_progress",
                "stage": stage_name,
            }
        )

    return response(200, {"processed": processed})
