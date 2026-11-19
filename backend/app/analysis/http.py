"""Shared httpx client scoping: tests inject a client (MockTransport); production makes its own."""

from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx


@asynccontextmanager
async def http_client_scope(client: httpx.AsyncClient | None, timeout_seconds: float) -> AsyncIterator[httpx.AsyncClient]:
    if client is not None:
        yield client
        return
    async with httpx.AsyncClient(timeout=timeout_seconds) as own_client:
        yield own_client
