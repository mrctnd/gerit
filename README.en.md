<p align="center">
  <img src="public/brand/gerit-mark.png" alt="Gerit logo" width="116">
</p>

<h1 align="center">Gerit</h1>

<p align="center"><strong>A local workspace for tasks, opportunities, specifications, BOMs, and presales actions.</strong></p>

<p align="center"><a href="README.md">Türkçe</a> · <strong>English</strong></p>

<p align="center">
  <a href="https://github.com/mrctnd/gerit/actions/workflows/ci.yml"><img alt="Test status" src="https://github.com/mrctnd/gerit/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/mrctnd/gerit/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/mrctnd/gerit?display_name=tag"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-2563eb.svg"></a>
  <a href="https://nodejs.org/"><img alt="Node.js 22 or newer" src="https://img.shields.io/badge/Node.js-22%2B-3c873a.svg"></a>
</p>

<p align="center">
  <a href="https://github.com/mrctnd/gerit/releases/download/v0.3.1/Gerit-Setup-0.3.1-x64.exe"><img alt="Download Windows x64 setup" src="https://img.shields.io/badge/Windows_x64-Download_setup-0a66c2?logo=windows11&logoColor=white"></a>
  <a href="https://github.com/mrctnd/gerit/releases/download/v0.3.1/gerit-v0.3.1-linux-x64.tar.gz"><img alt="Download Linux x64 bundle" src="https://img.shields.io/badge/Linux_x64-Download_bundle-333333?logo=linux&logoColor=white"></a>
  <a href="https://github.com/mrctnd/gerit/releases"><img alt="All releases" src="https://img.shields.io/badge/GitHub-All_releases-24292f?logo=github&logoColor=white"></a>
</p>

**Gerit** is a Turkish, keyboard-first, local-first workspace for tasks and presales delivery without an account or cloud dependency. There is no telemetry, advertising, collaboration, or offline sync. All data stays in one SQLite file you control.

The name comes from the Latin *gerere*: “to carry out” or “to accomplish.”

## Quick start

| Installation | Best for | Requirement | Start here |
| --- | --- | --- | --- |
| **Windows x64 setup** (recommended) | Windows 10/11 users | None | [Download the setup directly](https://github.com/mrctnd/gerit/releases/download/v0.3.1/Gerit-Setup-0.3.1-x64.exe) |
| **Docker Compose** | Portable service installs and simple updates | Docker Desktop or Docker Engine | [Open the Docker steps](#docker-setup) |
| **Linux x64 bundle** | Running with production dependencies bundled | Node.js 22.13+ | [Download the Linux bundle directly](https://github.com/mrctnd/gerit/releases/download/v0.3.1/gerit-v0.3.1-linux-x64.tar.gz) |
| **Source code** | Developers and custom deployments | Git, Node.js 22.13+, npm 10+ | [Open the Node.js steps](#install-with-nodejs) |

On Windows, download the first option, run setup, and launch the **Gerit** shortcut. To update, close Gerit and install the new setup over the existing installation; tasks, presales cases, and appearance settings remain intact.

All assets are available on [GitHub Releases](https://github.com/mrctnd/gerit/releases). GitHub CLI users can also download the installer from a terminal:

```powershell
gh release download v0.3.1 --repo mrctnd/gerit --pattern "Gerit-Setup-*.exe"
```

For source archives, use the [ZIP](https://github.com/mrctnd/gerit/archive/refs/tags/v0.3.1.zip) or [tar.gz](https://github.com/mrctnd/gerit/archive/refs/tags/v0.3.1.tar.gz) download.

## Features

- Keyboard workflow: `n` to add, `x` to complete, `/` to search
- Turkish and English natural dates through chrono-node
- Projects with `#tags`, priorities `p1`–`p3`, and free-text notes
- Recurrence from Turkish/English phrases or standard RRULE strings
- Today, a large monthly Calendar, All Tasks, project, and Completed views
- A seven-column month plan on desktop and a date-based agenda on narrow screens
- A simplified All Tasks queue grouped into Now, To do, and Waiting / Blocked
- Per-task progress, detailed descriptions, and timestamped work notes
- Overdue tasks pinned in red at the top of Today
- Four color palettes, four local font sets, 80-160% interface scaling, and device-local appearance preferences
- Distinct but restrained micro-interactions across system, full, and reduced motion profiles
- Local Windows notifications on desktop, with optional ntfy phone notifications
- A Presales Center for customer/opportunity data, tender references, vendors, products, competitors, deadlines, and bid decisions
- Weighted pipeline with opportunity type, priority, value, estimated cost, margin, win probability, and currency
- Eight-dimension MEDDPICC qualification, stakeholder mapping, and an owned internal action plan
- An Action and Alert Center combining critical findings, clarifications, deadlines, and overdue actions
- Detailed records for specification clauses, BOM/kitlists, product decisions, competition, change requests, responses, cost risks, and vendor questions
- Separate evidence gates for platform capability, quoted inclusion, configuration compatibility, and license/service entitlement
- Standard compliance statuses, scored risk, owners/actions, local reminders, and per-case JSON export
- Terminal capture with `t add "..."`
- Server-rendered Express + EJS UI and the built-in `node:sqlite` module

The interface is currently Turkish. English UI localization is welcome as a future contribution.

## Windows desktop setup

1. Download [`Gerit-Setup-0.3.1-x64.exe`](https://github.com/mrctnd/gerit/releases/download/v0.3.1/Gerit-Setup-0.3.1-x64.exe).
2. Run setup and choose an installation folder for your Windows user.
3. Open **Gerit** from the Start menu or desktop shortcut.
4. Allow notifications when prompted so reminders can reach you.

- No Node.js, Docker, account, or internet connection is required.
- The app listens only on `127.0.0.1` on your computer and is not exposed to the local network.
- Tasks, presales cases, and appearance preferences stay in `%APPDATA%\Gerit\data\tasks.sqlite3` and are not sent to another computer.
- Reminders and the daily digest are delivered as local Windows notifications in the desktop app.
- Uninstalling preserves the data file, so reinstalling restores the same tasks.
- Until release binaries are code-signed, Windows SmartScreen may show an unknown-publisher warning.

### Verify the download

Compare your setup hash with the value published in [`SHA256SUMS.txt`](https://github.com/mrctnd/gerit/releases/download/v0.3.1/SHA256SUMS.txt):

```powershell
Get-FileHash .\Gerit-Setup-0.3.1-x64.exe -Algorithm SHA256
```

## Docker setup

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with Compose.

```sh
git clone https://github.com/mrctnd/gerit.git
cd gerit
docker compose up -d --build
```

Open [http://127.0.0.1:3030](http://127.0.0.1:3030). Compose publishes the port only on the host loopback interface, even though the process listens on `0.0.0.0` inside the container.

## Linux x64 release bundle

Download [`gerit-v0.3.1-linux-x64.tar.gz`](https://github.com/mrctnd/gerit/releases/download/v0.3.1/gerit-v0.3.1-linux-x64.tar.gz). Node.js 22.13+ is still required, but production dependencies are bundled.

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

Open [http://127.0.0.1:3030](http://127.0.0.1:3030). The first run prepares `.env` and the local data directory.

To run the desktop app from source or produce the Windows installer:

```powershell
npm run desktop
npm run desktop:dist
```

The installer is written to `release/desktop`.

## Quick-add examples

```text
Müşteri teklifini yarın 16:00 gönder #satış p1
Operasyon toplantısı her pazartesi,perşembe 09:00 #operasyon p2
call Sam tomorrow 4pm #home p2
water plants every mon,thu 9am #home p3
```

Tasks without a date appear as `Tarihsiz` in All Tasks. The task detail screen keeps status, deadline, project, and priority immediately visible while progress, custom reminders, and recurrence live under optional details. Timestamped work notes remain searchable, and completing a recurring task creates the next occurrence automatically.

## Presales Center

Use **Presales Merkezi** in the sidebar to open a separate case for each customer request, tender, or opportunity. A case tracks the customer and reference; multiple vendor, product-family, and proposed-model rows; competitors, owner, deadline, next action, sales stage, and the current bid/no-bid decision. Add product rows with the compact `+` control. The available stages include **Yaklaşık maliyet çalışması** for estimated-cost work.

Case records cover specification clauses, atomic requirements, BOM/kitlist lines and quantities, product selection, same-segment competition, change requests, specification responses, cost/responsibility risks, and vendor confirmations. Platform capability, quoted inclusion, configuration compatibility, and license/service entitlement are stored as independent evidence gates. Records use the Turkish compliance standard (`Uygun`, `Şartlı Uygun`, `Uygun Değil - Değişiklik Gerekli`, `Teyit / Netleştirme`, and `Kapsam Dışı`), calculate priority from probability, impact, and evidence gap, and can trigger local Windows reminders. JSON export includes the full case and all records.

The case control room also tracks opportunity type, priority, currency, estimated proposal value, cost, margin, win probability, customer deadline, and an earlier internal quality gate. Qualification covers measurable value, economic buyer, decision criteria and process, paper process, pain, champion, and competition. Stakeholders carry role, influence, and stance; project actions carry owner, status, priority, internal due date, and reminder.

The **Aksiyon Merkezi** combines critical risks, noncompliance, clarifications, qualification blockers, customer deadlines, and overdue internal actions in one prioritized queue. The portfolio keeps currencies separate while presenting total and probability-weighted pipeline.

The workflow adapts the bid/no-bid, compliance matrix, and staged-review practices from the [APMP Winning Business Ecosystem](https://apmp.org/Web/Web/About-Us/Winning-Business-Ecosystem.aspx), stage/probability/contact-role visibility from [Salesforce Opportunity Management](https://trailhead.salesforce.com/content/learn/modules/leads_opportunities_lightning_experience/work-your-opportunities), and the eight [MEDDPICC](https://meddicc.com/meddpicc-sales-methodology-and-process) qualification dimensions to a local single-user presales workspace.

## Personalize the interface

Use the **Görünüm** button in the top bar or press `g`. Choose between Atlas, Forest, Violet, and Ember palettes; Modern, Humanist, Editorial, and Technical font sets; and system, full, or reduced motion. Scale the complete interface from 80% to 160% for high-density displays, or use `Ctrl` + `+`, `Ctrl` + `-`, and `Ctrl` + `0`. Motion changes are reflected immediately in the live preview.

These preferences remain in the same local SQLite database as your tasks. They are not sent to an external service and are preserved across desktop app restarts. Logo assets and usage guidance live in [`public/brand`](public/brand/README.md).

## ntfy phone setup

1. Install [ntfy for Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [ntfy for iOS](https://apps.apple.com/app/ntfy/id1625396347).
2. Subscribe to a long, unpredictable topic name.
3. Run `npm run setup` and set the same topic in `.env`:

   ```dotenv
   NTFY_TOPIC=your-long-secret-topic
   ```

4. Restart Gerit.

In the desktop app, use **Dene** in the top bar to test local notifications. Gerit checks task, case, analysis-record, and project-action reminders every minute. Clicking a notification opens the relevant record. The Action Center configures the digest hour, presales coverage, and quiet hours; alerts that become due while quiet are retained and delivered afterward.

In Node.js/web installs, Gerit uses ntfy for phone notifications. Treat a public ntfy topic name like a password. Custom reminder times are configured on each task and must be earlier than the deadline. `APP_TIMEZONE` controls reminder and digest time; `NTFY_SERVER` can point to a self-hosted ntfy instance.

## Database location and backup

The Windows desktop installer stores the database here by default:

```text
%APPDATA%\Gerit\data\tasks.sqlite3
```

Each Windows user gets a separate local database. Tasks, work notes, presales cases, multi-product rows, qualification, stakeholders, project actions, evidence records, reminder settings, and appearance preferences are persisted in the same SQLite file. Existing data is migrated into the expanded schema automatically on first launch. The desktop app does not send this data to the cloud, and notifications are shown locally by Windows.

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
