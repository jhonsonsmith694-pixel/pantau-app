# PANTAU API Documentation

Base URL: `https://pantau-api.dokumenhilang-id.workers.dev`

## Authentication

All endpoints (except health/version) require a `Bearer` token header:
```
Authorization: Bearer {userId}
```

## Endpoints

### Health & Version

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/version` | Version info |

### Auth

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/v2/auth/register` | `{ userId, name, avatar }` | Register user |
| POST | `/api/v2/auth/session` | | Get/create session |

### User

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/v2/users` | | Get user + related data |
| PUT | `/api/v2/users` | `{ name?, avatar? }` | Update profile |
| DELETE | `/api/v2/users` | | Delete account |

### Monitors

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/v2/monitors?category=` | | List monitors |
| POST | `/api/v2/monitors` | `{ title, category }` | Create monitor |
| PUT | `/api/v2/monitors/:id` | `{ title?, category?, active? }` | Update monitor |
| DELETE | `/api/v2/monitors/:id` | | Delete monitor |

### Notes

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/v2/notes?category=&search=` | | List notes |
| POST | `/api/v2/notes` | `{ title, content, category?, color? }` | Create note |
| PUT | `/api/v2/notes/:id` | `{ title?, content?, category?, color? }` | Update note |
| DELETE | `/api/v2/notes/:id` | | Delete note |

### Reminders

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/v2/reminders` | | List reminders |
| POST | `/api/v2/reminders` | `{ title, due_at }` | Create reminder |

### Sync

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/v2/sync` | `{ user?, monitors?, notes? }` | Full sync |

### Settings

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/v2/settings` | | Get settings |
| PUT | `/api/v2/settings` | `{ key, value }` | Update setting |

### Analytics

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/v2/track` | `{ event, properties?, userId? }` | Track event |

## Response Format

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

- 100 requests per minute per IP
- Uses KV for rate limit tracking
- Returns `429 Too Many Requests` when exceeded
