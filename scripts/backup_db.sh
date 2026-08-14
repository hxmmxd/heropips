#!/bin/bash
# Backup Script for Dockerized PostgreSQL
# Should be run via cron (e.g., 0 3 * * * /path/to/backup_db.sh)

BACKUP_DIR="/var/backups/heropips_db"
CONTAINER_NAME="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Execute pg_dump inside the docker container
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -F c -b -v -f /tmp/db_$DATE.dump $DB_NAME

# Copy the dump from the container to the host
docker cp $CONTAINER_NAME:/tmp/db_$DATE.dump $BACKUP_DIR/db_$DATE.dump

# Clean up the dump inside the container
docker exec $CONTAINER_NAME rm /tmp/db_$DATE.dump

echo "[$(date)] Backup completed: $BACKUP_DIR/db_$DATE.dump"

# Remove backups older than retention days
find "$BACKUP_DIR" -type f -name "db_*.dump" -mtime +$RETENTION_DAYS -exec rm {} \;
echo "[$(date)] Old backups cleaned up."
