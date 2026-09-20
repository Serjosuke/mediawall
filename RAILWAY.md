# MediaWall on Railway

Обновлённые исходники сохраняют локальный запуск через `START.cmd` и дополнительно поддерживают Railway. На Railway Docker Compose не запускаем: создаём три отдельных сервиса одного проекта. У каждого участника команды будет общая удалённая база и общая галерея по публичному адресу frontend.

## Перед началом

1. В корне `mediawall` создайте GitHub-репозиторий и отправьте туда исходники, включая `frontend/Dockerfile.railway`. Локальный `.env` не загружайте.
2. На https://railway.com создайте новый пустой проект.
3. Добавьте сервис PostgreSQL через `+ New` → `Database` → `PostgreSQL`. Переименуйте в `Postgres`, если хотите использовать приведённые ниже переменные дословно.
4. В том же проекте создайте два пустых сервиса: `backend` и `frontend`, подключите к обоим один GitHub-репозиторий.

## Backend (Laravel)

В `backend` → `Settings` установите:

- Root Directory: `/backend`
- Builder: Dockerfile (обнаруживается автоматически)
- Networking / Public Domain: не требуется
- Healthcheck Path: `/up` (по желанию)

В `backend` → `Variables` добавьте значения:

```dotenv
PORT=8000
APP_NAME=MediaWall
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:YOUR_SECRET_KEY
DB_CONNECTION=pgsql
DB_URL=${{Postgres.DATABASE_URL}}
FILESYSTEM_DISK=public
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
LOG_CHANNEL=stderr
```

`APP_KEY` — строка `base64:...`, которую надо сгенерировать отдельно для продакшена. Если локальный backend уже запущен, в PowerShell выполните `docker compose exec backend php artisan key:generate --show` и скопируйте только полученный ключ в Railway. Не публикуйте ключ в GitHub или чате.

Если сервис PostgreSQL имеет другое имя, измените `Postgres` в выражении `DB_URL` на точное имя вашего сервиса.

В `backend` → `Settings` → `Volumes` → `Add Volume` подключите постоянное хранилище к каталогу:

```text
/var/www/html/storage/app/public
```

Создайте volume *до первой загрузки файлов*. Это принципиально: без volume файлы после обновления сервиса могут исчезнуть, даже если записи о них остались в PostgreSQL.

Деплойте backend. При старте контейнера автоматически выполняются `php artisan storage:link --force` и `php artisan migrate --force`; отдельно создавать таблицу не нужно.

## Frontend (Next.js)

В `frontend` → `Settings` установите:

- Root Directory: `/frontend`
- Networking → Generate Domain (публичный домен нужен только frontend)
- Healthcheck Path: `/` (по желанию)

В `frontend` → `Variables` добавьте:

```dotenv
PORT=3000
RAILWAY_DOCKERFILE_PATH=Dockerfile.railway
MEDIAWALL_API_ORIGIN=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:8000
```

В некоторых интерфейсах Railway путь к Dockerfile можно указать в `Settings` → `Build` вместо переменной `RAILWAY_DOCKERFILE_PATH`. Достаточно одного из вариантов.

Важный момент: `MEDIAWALL_API_ORIGIN` должен быть задан **до сборки frontend**, потому что Next.js формирует правила проксирования во время `npm run build`. В production Dockerfile он передаётся в сборку через `ARG`. `backend` — точное имя backend-сервиса; если переименуете, используйте его новое имя в ссылке на переменную.

Внешний пользователь обращается только к домену frontend. Next.js отправляет `/api/*` и `/storage/*` на Laravel по приватной сети Railway. Laravel возвращает относительные ссылки на медиа, поэтому клиенту не нужен публичный домен backend. После изменения `MEDIAWALL_API_ORIGIN` необходимо пересобрать frontend.

## Проверка

1. Откройте публичный домен frontend, например `https://...up.railway.app`.
2. Проверьте `https://ВАШ-ДОМЕН/api/media`: сначала должно вернуться `[]`, если публикаций ещё нет.
3. Загрузите тестовую фотографию, обновите страницу и откройте сайт с другого устройства.
4. Перезапустите backend в Railway и проверьте, что фотография сохранилась.
5. Протестируйте короткое видео до 20 МиБ.

Если запрос `/api/media` отдаёт `502`, проверьте, что backend запущен, его имя совпадает с именем в ссылке на переменную, `PORT=8000`, миграция прошла и после добавления переменной frontend пересобран.

Если лог backend сообщает про PostgreSQL, проверьте имя сервиса в `DB_URL` и состояние PostgreSQL. Если `APP_KEY` отсутствует — установите случайный ключ в переменных backend. Если медиа исчезли после нового деплоя — проверьте volume mount path и факт его подключения к `backend`.

## Данные и стоимость

Локальные Docker-тома и Railway PostgreSQL — разные базы данных: публикации с локального компьютера не переносятся автоматически. Railway может взимать плату за вычисления, базу и volume; перед запуском установите бюджет/лимит расходов в своём аккаунте.

Анонимная публичная загрузка — только для учебного демо с тестовыми файлами. Не размещайте личные изображения или конфиденциальную информацию, следите за использованием объёма диска и при необходимости отключайте сервис. Для длительного публичного размещения нужны модерация, защита от злоупотреблений и ограничения загрузки.
