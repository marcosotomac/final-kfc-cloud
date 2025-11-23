from src.handlers.workflow.worker_base import process_stage


def handler(event, context):
    return process_stage(
        event,
        stage_name="packaging",
        start_status="packaging_in_progress",
        done_status="packaging_done",
    )

