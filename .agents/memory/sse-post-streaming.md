---
name: SSE over POST streaming
description: How the WA bulk-send streaming endpoint is built (backend+frontend pattern)
---

## Rule
Use `res.setHeader("Content-Type", "text/event-stream")` on a POST route, then `res.write("data: {...}\n\n")` per event. Frontend reads with `fetch` + `response.body.getReader()` + `TextDecoder`, splitting on `\n` and parsing lines that start with `data: `.

**Why:** Native `EventSource` only supports GET; POST is needed to pass message payloads. This pattern works fine with fetch ReadableStream.

**How to apply:** Any long-running batch operation that needs realtime frontend progress — just write SSE-format lines to the response body. Set `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform` to prevent proxy buffering. Always call `res.flushHeaders()` before the loop.
