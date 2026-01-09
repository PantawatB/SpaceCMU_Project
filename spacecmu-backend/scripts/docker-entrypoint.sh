#!/bin/sh
set -e

# Wait for postgres to be ready (optional but helpful)
# We can just let db:push fail and the container restart, 
# but a small delay or loop is better for UX.
echo "Waiting for database to be ready..."
# Simple wait loop for port 5432 on the host 'database' (from docker-compose)
until nc -z $POSTGRES_HOST 5432; do
  echo "Database is not ready yet - sleeping..."
  sleep 2
done

echo "Database is ready. Running schema push..."
npm run db:push

echo "Starting application in development mode..."
exec npm run dev
