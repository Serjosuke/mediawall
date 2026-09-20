FROM php:8.3-cli-bookworm

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1 \
    COMPOSER_PROCESS_TIMEOUT=900 \
    COMPOSER_MAX_PARALLEL_HTTP=4

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libpq-dev libonig-dev libzip-dev \
    && docker-php-ext-install -j2 pdo_pgsql mbstring zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/html

RUN set -eu; \
    for attempt in 1 2 3; do \
        if composer create-project laravel/laravel /tmp/mediawall-laravel "^12.0" --no-dev --no-interaction --prefer-dist --no-progress --no-scripts --no-audit -vvv; then \
            break; \
        fi; \
        if [ "$attempt" -eq 3 ]; then \
            printf '%s\n' 'Laravel installation failed. Check the Composer error above for network, dependency, or PHP extension details.' >&2; \
            exit 1; \
        fi; \
        rm -rf /tmp/mediawall-laravel; \
        sleep 5; \
    done; \
    cp -a /tmp/mediawall-laravel/. /var/www/html/; \
    rm -rf /tmp/mediawall-laravel /var/www/html/.env

COPY bootstrap/app.php ./bootstrap/app.php
COPY routes/api.php ./routes/api.php
COPY app/Http/Controllers/MediaController.php ./app/Http/Controllers/MediaController.php
COPY database/migrations/2026_09_20_000001_create_media_table.php ./database/migrations/2026_09_20_000001_create_media_table.php
COPY docker/entrypoint.sh /usr/local/bin/mediawall-entrypoint

RUN chmod +x /usr/local/bin/mediawall-entrypoint \
    && mkdir -p storage/app/public bootstrap/cache

ENTRYPOINT ["mediawall-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
