# MediaWall

Учебная общая галерея изображений и видео. Посетители могут загружать файлы без аккаунта, смотреть публикации и переключаться между фото и видео. Лента обновляется каждые 10 секунд.

## Стек

- Frontend: Next.js 15, React 19, TypeScript, CSS.
- Backend: PHP 8.3, Laravel 12, REST API.
- База данных: PostgreSQL 16.
- Хранение: локальный диск Laravel в отдельном Docker-томе.
- Разработка: Docker Compose, SVG-макеты для импорта в Figma, GitHub.

В проекте нет необходимости устанавливать Node.js, PHP, Composer, PostgreSQL или их зависимости непосредственно на компьютер. Docker загрузит образы Node.js/PostgreSQL/PHP, а во время сборки установит Composer, Laravel и npm-пакеты в контейнеры. На самом компьютере понадобится Docker Desktop и работающий Docker Engine.

## Railway: общая онлайн-галерея

Пошаговая настройка PostgreSQL, backend, frontend, приватного API и постоянного хранения файлов находится в [RAILWAY.md](RAILWAY.md). Локальный запуск ниже продолжает работать без изменений.

## Windows: запуск одной командой

1. Скачайте репозиторий как ZIP и распакуйте или выполните `git clone <ссылка-на-ваш-репозиторий>`.
2. Откройте PowerShell в корне `mediawall`.
3. Дважды нажмите `START.cmd` либо выполните:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Скрипт создаёт локальный `.env` со случайными ключом приложения и паролем базы данных. Если Docker Desktop отсутствует, запускает его установку через `winget` и стандартный установщик Windows. Затем запускает Docker Desktop, собирает три контейнера, проверяет доступность сайта и открывает браузер.

**Важно:** первый запуск требует интернета для установки Docker Desktop и скачивания образов, PHP-библиотек и npm-пакетов. Потребуется свободное место на диске. Установка Docker Desktop может запросить права администратора, включение виртуализации/WSL 2, принятие условий и перезагрузку Windows. Эти системные шаги нельзя надёжно выполнить полностью без участия владельца компьютера. После перезагрузки повторно выполните `start.ps1`.

Если Windows не находит `winget`, установите Docker Desktop самостоятельно с официального сайта: https://www.docker.com/products/docker-desktop/ . Запустите Docker Desktop и снова выполните `start.ps1`.

После успешного запуска:

- Галерея: http://localhost:3000
- API Laravel: http://localhost:8000/api/media
- Проверка Laravel: http://localhost:8000/up

Остановить контейнеры без удаления загруженных медиа и базы: дважды нажмите `STOP.cmd` или выполните:

```powershell
powershell -ExecutionPolicy Bypass -File .\stop.ps1
```

Повторный запуск: `powershell -ExecutionPolicy Bypass -File .\start.ps1`.

## macOS и Linux

Установите и запустите Docker с поддержкой `docker compose`. После этого в корне проекта выполните `./start.sh`. Скрипт создаст `.env` (требуется `openssl`) и запустит контейнеры. Для остановки выполните `docker compose down`.

## Где лежат файлы

```text
mediawall/
├── START.cmd
├── STOP.cmd
├── start.ps1
├── stop.ps1
├── start.sh
├── compose.yaml
├── .env.example
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── app/
│       ├── page.tsx
│       ├── layout.tsx
│       └── globals.css
├── backend/
│   ├── Dockerfile
│   ├── bootstrap/app.php
│   ├── routes/api.php
│   ├── app/Http/Controllers/MediaController.php
│   ├── database/migrations/2026_09_20_000001_create_media_table.php
│   └── docker/
│       ├── entrypoint.sh
│       └── uploads.ini
└── design/
    ├── desktop.svg
    ├── mobile.svg
    ├── upload-dialog.svg
    └── README.md
```

Dockerfile backend автоматически скачивает стандартный каркас Laravel 12, устанавливает только зависимости для запуска и добавляет исходники проекта. Сам каркас Laravel не дублируется в репозитории. Сборка backend без доступа к Composer/Packagist и frontend без доступа к npm не сработает на первом запуске. После первой сборки код галереи берётся из этого репозитория.


## Ошибка сборки Composer

Если `START.cmd` заканчивается сообщением `Docker image build failed`, в PowerShell из корня проекта выполните:

```powershell
docker compose --progress plain build --no-cache backend *> backend-build.log
```

Откройте `backend-build.log`: реальная причина содержится в первой ошибке Composer выше строки `failed to solve` (например, ошибка сети, недоступность Packagist или несовместимость пакета). `docker compose logs` показывает журналы уже запущенных контейнеров, но не объясняет ошибку на этапе сборки образа. Можно отправить лог разработчику, предварительно убедившись, что он не содержит паролей или токенов.

Чтобы обновить прежнюю версию проекта, распакуйте новый архив поверх существующей папки, согласившись на замену файлов. Не удаляйте `.env` и не запускайте `docker compose down -v`: это удалит данные PostgreSQL и загруженные файлы. Затем повторно запустите `START.cmd`.

## API

| Метод | URL | Описание |
| --- | --- | --- |
| GET | `/api/media` | Последние 100 публикаций по убыванию даты добавления |
| POST | `/api/media` | Публикация: multipart/form-data, поля `file` и необязательное `title` |

Форматы: JPG, PNG, GIF, WEBP, MP4, WEBM. Максимальный размер одного файла — 20 МиБ. Для POST установлен лимит 10 запросов в минуту на клиента.

## Работа команды

Все изменения frontend в `frontend/app` и конфигурации Next.js применяются в dev-сервере автоматически. Изменения PHP-контроллера и `routes/api.php` доступны в контейнере через файловые подключения. После изменения миграции или backend Dockerfile следует перезапустить backend:

```powershell
docker compose up --build -d backend
```

После изменения `frontend/package.json` пересоберите frontend и обновите том зависимостей:

```powershell
docker compose build frontend
docker compose stop frontend
docker compose rm -f frontend
docker volume rm mediawall_frontend_node_modules
docker compose up -d frontend
```

Если том отсутствует, команда `docker volume rm` сообщит об этом; можно продолжать.

Просмотр логов:

```powershell
docker compose logs -f --tail=100
```

Подключиться к PostgreSQL:

```powershell
docker compose exec db psql -U mediawall -d mediawall
```

Проверить API:

```powershell
Invoke-RestMethod http://localhost:8000/api/media
```

База данных и медиа хранятся в отдельных Docker-томах и сохраняются после `docker compose down`. Команда `docker compose down -v` **удалит** базу и загруженные файлы. Не применяйте её без необходимости.

## GitHub

Создайте пустой репозиторий `mediawall`, затем в корне проекта выполните:

```powershell
git init
git add .
git commit -m "MediaWall MVP"
git branch -M main
git remote add origin https://github.com/ВАШ-АККАУНТ/mediawall.git
git push -u origin main
```

Замените адрес на URL созданного репозитория. При работе в команде приглашайте сокомандников в настройках репозитория или работайте через ветки и pull request. Файл `.env`, пароли, зависимости и загруженные медиа не включаются в Git.

## Figma

Откройте Figma и перетащите файлы `design/desktop.svg`, `design/mobile.svg` и `design/upload-dialog.svg` на холст. Это стартовые редактируемые макеты в SVG, а не готовый облачный документ `.fig`. После импорта создайте командный Figma-проект, настройте размеры фреймов и поделитесь ссылкой с командой.

Ссылка на Figma: добавьте после импорта.

## Ограничения учебной версии

Каждый, кто запускает проект на своём компьютере, получает **собственную** локальную галерею и базу данных. Чтобы одни и те же публикации видели все участники команды с разных компьютеров, разверните один экземпляр проекта на общем сервере. Docker Desktop на локальном компьютере сам по себе не публикует сайт в интернете.

Сервис предназначен для локальной разработки: у него нет авторизации, модерации, антивирусной проверки, HTTPS и промышленной защиты от злоупотреблений. Не выставляйте его в публичный интернет без дополнительной настройки и ограничений. Полезно использовать тестовые изображения и видео, не содержащие персональных данных.
