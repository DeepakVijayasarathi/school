#!/bin/sh
# Start backend in background, frontend in foreground
cd /frontend && node server.js &
cd /backend && dotnet SchoolKart.API.dll
