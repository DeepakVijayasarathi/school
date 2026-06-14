#!/bin/sh
# Start backend in background, frontend in foreground
cd /frontend && HOSTNAME=0.0.0.0 PORT=3000 node server.js &
cd /backend && dotnet SchoolKart.API.dll
