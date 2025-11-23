from src.handlers.workflow.worker_base import process_stage


def handler(event, context):
    return process_stage(
        event,
        stage_name="delivery",
        start_status="delivery_in_progress",
        done_status="delivered",
    )

