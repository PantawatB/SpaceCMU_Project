# SpaceCMU Artillery Load Tests

Load test scripts for SpaceCMU Backend using [Artillery](https://www.artillery.io/).

## File Structure

```
tests/artillery/
├── config.yml              # Shared config (base URL, token, phases)
├── 00-e2e-full.yml         # Full end-to-end realistic traffic simulation ⭐
├── 01-auth.yml             # Auth & Health Check
├── 02-users.yml            # User profile endpoints
├── 03-posts.yml            # Posts: Feed, Create, Like, Comment, Delete
├── 04-friends.yml          # Friends & Follows
├── 05-market.yml           # Market: Browse, Create, Update, Delete
├── 06-messaging.yml        # Chat Rooms & Messages
└── 07-calendar-notif.yml   # Calendar & Notifications
```

## Setup

Make sure the backend is running:
```bash
docker-compose up -d
```

Install Artillery (if not already):
```bash
npm install -g artillery
```

## Running Tests

### Quick test — single module
```bash
cd spacecmu-backend/tests/artillery

# Auth & Health
artillery run 01-auth.yml

# Posts
artillery run 03-posts.yml

# Market
artillery run 05-market.yml
```

### Full E2E load test (recommended)
```bash
artillery run 00-e2e-full.yml
```

### With HTML report
```bash
artillery run --output report.json 00-e2e-full.yml
artillery report report.json
```

## ⚠️ Important: Messaging Test Setup

Before running `06-messaging.yml`, replace `REPLACE_WITH_REAL_ROOM_ID` in the variables section with an actual chat room ID that your user is a member of. You can get one from:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/chat-rooms/me
```

## Load Phases

Each module test uses these phases by default:

| Phase | Duration | Virtual Users |
|-------|----------|--------------|
| Warm Up | 15s | 5/s |
| Ramp Up | 30s | 5 → 20/s |
| Sustained | 30s | 20/s |

The **E2E full test** runs for ~7 minutes with peak 15 VU/s.

## Performance Thresholds

Tests will fail if:
- `p95` response time > **2,000ms**
- `p99` response time > **5,000ms**
- Any `5xx` errors (E2E test only)

## Token

The test token is already embedded in each file. Token expires: **2026-03-15**. Generate a new one by logging in via the CMU EntraID flow.
