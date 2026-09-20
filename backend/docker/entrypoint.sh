#!/bin/sh
set -eu

php artisan storage:link --force
php artisan migrate --force
exec "$@"
