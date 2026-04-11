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

Swagger API docs: [http://localhost:3003/docs/](http://localhost:3000/docs/) 

## Deployment

**Live API URL:** [https://notifier.deadsign-api.xyz](https://notifier.deadsign-api.xyz)

> [!NOTE]  
> This service is currently running on a self-hosted Ubuntu server. If the service is temporarily unavailable, it may be due to local power outages.

### Test the Public API
You can test the subscription endpoint using the following `curl` command:

```bash
curl -X POST https://notifier.deadsign-api.xyz/api/subscribe \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","repo":"owner/repo"}'
```

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

## Showcasing the Workflow

This section demonstrates the end-to-step process of subscribing to a repository and managing notifications.

### 1. Initiate Subscription
<img width="100%" alt="Subscription Request" src="https://github.com/user-attachments/assets/737892ce-7524-429e-a5fa-c81eed629e7a" />

---

### 2. Confirmation Email
<img width="100%" alt="Verification Email" src="https://github.com/user-attachments/assets/f5673d6f-0e36-4ad3-9058-4bf8fdbb5cda" />

---

### 3. Confirming the Subscription
<img width="100%" alt="Confirmation UI" src="https://github.com/user-attachments/assets/4d72ad18-73f9-44fa-a017-23bb52385dcf" />

---

### 4. New Release Notifications
<img width="1497" height="247" alt="New Release" src="https://github.com/user-attachments/assets/008193eb-a473-4472-81ec-9a4dd0b90205" />

---

### 5. View Subscriptions
<img width="100%" alt="View Subscriptions" src="https://github.com/user-attachments/assets/27e2b304-4e71-484d-8b79-9168bc0cfab0" />


