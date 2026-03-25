# backend/api/poller.py
from fastapi import APIRouter, Depends, HTTPException, Request

from backend.schemas import PollerStatusResponse
from backend.api.deps import require_admin
from backend.config import settings

router = APIRouter(prefix="/poller", tags=["Poller"])


def _get_poller(request: Request):
    p = request.app.state.poller
    if p is None:
        raise HTTPException(status_code=503, detail="Poller not initialized")
    return p


@router.get("/status", response_model=PollerStatusResponse)
def poller_status(request: Request):
    """Get current poller status."""
    p = _get_poller(request)
    return PollerStatusResponse(
        running=p.is_running,
        symbol=settings.SYMBOL,
        interval_seconds=settings.POLL_INTERVAL,
    )


@router.post("/start", dependencies=[Depends(require_admin)])
def poller_start(request: Request):
    """Start the background strategy poller."""
    p = _get_poller(request)
    p.start()
    return {"status": "started", "running": p.is_running}


@router.post("/stop", dependencies=[Depends(require_admin)])
def poller_stop(request: Request):
    """Stop the background strategy poller."""
    p = _get_poller(request)
    p.stop()
    return {"status": "stopped"}
