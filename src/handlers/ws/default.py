from src.common.utils import response


def handler(event, _context):
    return response(200, {"message": "Unsupported action", "input": event.get("body")})

