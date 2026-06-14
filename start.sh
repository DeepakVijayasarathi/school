#!/bin/sh
# Start frontend in background; container exit code = backend exit code
cd /frontend && HOSTNAME=0.0.0.0 PORT=3000 node server.js &
FRONTEND_PID=$!

cd /backend && dotnet SchoolKart.API.dll
RC=$?

# Backend exited — stop frontend and propagate exit code
kill "$FRONTEND_PID" 2>/dev/null || true
wait "$FRONTEND_PID" 2>/dev/null || true
exit $RC
