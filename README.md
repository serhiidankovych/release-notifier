<img width="1584" height="396" alt="GitHub Release Notification API Banner)" src="https://github.com/user-attachments/assets/83418173-8ea7-48b3-abd0-0b45dd2a2010" />

# GitHub Release Notification API

A service that allows users to subscribe to email notifications when new releases are published to GitHub repositories.

## How It Works

1. The user submits their email and a GitHub repository (`owner/repo`)
2. The service verifies that the repository exists on GitHub
3. A confirmation email is sent with a unique link
4. Once confirmed, the user receives an email whenever a new release is detected
5. Every email contains an unsubscribe link

## Endpoints

```
POST /api/subscribe
Subscribe an email to release notifications for a given GitHub repository (format: owner/repo)

GET /api/confirm/{token}
Confirm email subscription

GET /api/unsubscribe/{token}
Unsubscribe from release notifications

GET /api/subscriptions?email={email}
Get all active subscriptions for a given email
```

Swagger API docs: [http://localhost:3000/docs/](http://localhost:3000/docs/)

## Database

### `tracked_repos`

Stores each GitHub repository that has at least one subscriber.

| Column          | Type         | Description                                         |
| --------------- | ------------ | --------------------------------------------------- |
| `id`            | serial PK    | Auto-incremented ID                                 |
| `owner_repo`    | varchar(255) | Unique repository identifier in `owner/repo` format |
| `last_seen_tag` | varchar(255) | Last release tag detected by the scanner            |
| `created_at`    | timestamp    | Row creation time                                   |

### `subscriptions`

Stores one record per email and repository pair.

| Column              | Type                            | Description                                                       |
| ------------------- | ------------------------------- | ----------------------------------------------------------------- |
| `id`                | serial PK                       | Auto-incremented ID                                               |
| `email`             | varchar(255)                    | Subscriber email (stored in lowercase)                            |
| `repo_id`           | integer FK → `tracked_repos.id` | Reference to the subscribed repository                            |
| `confirm_token`     | varchar(36)                     | UUID used for email confirmation                                  |
| `unsubscribe_token` | varchar(36)                     | UUID included in each notification email                          |
| `confirmed_at`      | timestamp                       | Set when the user confirms the subscription (null if unconfirmed) |
| `created_at`        | timestamp                       | Row creation time                                                 |

---

If you want, I can also make a **stronger “production-level” README** (with setup, env variables, architecture, and improvements section) — that would help a lot for job applications.
