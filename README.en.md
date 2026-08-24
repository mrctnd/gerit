# Gerit

<p align="center">
  <img src="public/brand/gerit-mark.png" alt="Gerit logo" width="116">
</p>

[Türkçe](README.md) · [English](README.en.md)

[![Test](https://github.com/mrctnd/gerit/actions/workflows/ci.yml/badge.svg)](https://github.com/mrctnd/gerit/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/mrctnd/gerit?display_name=tag)](https://github.com/mrctnd/gerit/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-2563eb.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-3c873a.svg)](https://nodejs.org/)

**Gerit** is a Turkish, keyboard-first, local-first personal task manager for capturing and completing work without an account or cloud dependency. There is no telemetry, advertising, collaboration, or offline sync. All task data stays in one SQLite file you control.

The name comes from the Latin *gerere*: “to carry out” or “to accomplish.”

## Features

- Keyboard workflow: `n` to add, `x` to complete, `/` to search
- Turkish and English natural dates through chrono-node
- Projects with `#tags`, priorities `p1`–`p3`, and free-text notes
- Recurrence from Turkish/English phrases or standard RRULE strings
- Today, Upcoming, Inbox, project, and Completed views
- A Workflow view for Planned, In progress, Waiting, and Blocked stages
- Per-task progress, detailed descriptions, and timestamped work notes
- Overdue tasks pinned in red at the top of Today
- Four color palettes, four local font sets, and device-local appearance preferences
- Restrained micro-interactions for buttons, completion, and appearance controls, plus reduced motion
- ntfy custom reminders, due alerts, and a daily 07:00 digest
- Terminal capture with `t add "..."`
- Server-rendered Express + EJS UI and a single better-sqlite3 database

The interface is currently Turkish. English UI localization is welcome as a future contribution.

## Fastest setup: Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with Compose.

```sh
git clone https://github.com/mrctnd/gerit.git
cd gerit
docker compose up -d --build
```

Open [http://127.0.0.1:3030](http://127.0.0.1:3030). Compose publishes the port only on the host loopback interface, even though the process listens on `0.0.0.0` inside the container.

## Release bundle

Download the Windows or Linux archive from [GitHub Releases](https://github.com/mrctnd/gerit/releases). Node.js 22+ is still required, but production dependencies are bundled.

```powershell
# Windows PowerShell
.\gerit\scripts\start.ps1
```

```sh
# Linux
chmod +x gerit/scripts/start.sh
./gerit/scripts/start.sh
```

## Install with Node.js

```sh
git clone https://github.com/mrctnd/gerit.git
cd gerit
npm ci
npm run setup
npm start
```

## Quick-add examples

```text
Müşteri teklifini yarın 16:00 gönder #satış p1
Operasyon toplantısı her pazartesi,perşembe 09:00 #operasyon p2
call Sam tomorrow 4pm #home p2
water plants every mon,thu 9am #home p3
```

Tasks without a date go to Inbox. The task detail screen tracks stage, progress, deadline, a custom reminder, and timestamped work notes. Completing a recurring task creates the next occurrence automatically.

## Personalize the interface

Use the **Görünüm** button in the top bar or press `g`. Choose between Atlas, Forest, Violet, and Ember palettes; Modern, Humanist, Editorial, and Technical font sets; and system, full, or reduced motion.

These preferences remain in the browser's local storage and are never sent to the database or an external service. Logo assets and usage guidance live in [`public/brand`](public/brand/README.md).

## ntfy phone setup

1. Install [ntfy for Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [ntfy for iOS](https://apps.apple.com/app/ntfy/id1625396347).
2. Subscribe to a long, unpredictable topic name.
3. Run `npm run setup` and set the same topic in `.env`:

   ```dotenv
   NTFY_TOPIC=your-long-secret-topic
   ```

4. Restart Gerit.

Treat a public ntfy topic name like a password. Custom reminder times are configured on each task and must be earlier than the deadline. `APP_TIMEZONE` controls reminder and digest time; `NTFY_SERVER` can point to a self-hosted ntfy instance.

## Database location and backup

The default Node.js database is `data/tasks.sqlite3`. Override it with `DATABASE_PATH`.

Docker stores the same file at `/app/data/tasks.sqlite3` in the `gerit_gerit-data` volume. Inspect its host location with:

```sh
docker volume inspect gerit_gerit-data
```

Create a consistent Docker backup with:

```sh
docker compose exec gerit sh -c 'sqlite3 /app/data/tasks.sqlite3 ".backup /app/data/tasks-backup.sqlite3"'
docker compose cp gerit:/app/data/tasks-backup.sqlite3 ./tasks-backup.sqlite3
```

## Security model

Gerit has no accounts. It binds to `127.0.0.1` by default and must not be exposed directly to the internet. For remote access, place it behind HTTPS, authentication, and a company VPN or trusted network. The detailed [Linux VM guide](docs/LINUX_VM_KURULUMU.md) is written in Turkish; production installation is intentionally deferred until the application reaches its final deployment stage.

## Development

```sh
npm run dev
npm test
npm run check
```

CI runs on every push and pull request. Pushing a `v*` tag builds Windows and Linux bundles and publishes a GitHub Release. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CHANGELOG.md](CHANGELOG.md).

Gerit is available under the [MIT License](LICENSE).
