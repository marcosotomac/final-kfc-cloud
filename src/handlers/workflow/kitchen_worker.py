from src.handlers.workflow.worker_base import process_stage


def handler(event, context):
    return process_stage(
        event,
        stage_name="kitchen",
        start_status="kitchen_in_progress",
        done_status="kitchen_done",
    )

