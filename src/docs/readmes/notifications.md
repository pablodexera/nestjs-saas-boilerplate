# Notifications Module

This module provides simple email and in-app notifications. It lives under `src/notifications` and exposes a `NotificationsService` along with a REST controller.

## Resend Configuration

Email sending uses [Resend](https://resend.com). Configure these variables in your `.env` file:

- `RESEND_API_KEY` – your Resend API key
- `RESEND_FROM_EMAIL` – from address used when sending emails
- `ENABLE_EMAIL` – set to `true` to actually deliver emails (logs to console when `false`)

See `.env.example` for sample values.

## Email Templates

Handlebars templates reside in `src/notifications/email-templates`. Each template has a matching `.hbs` file and is referenced by name when calling `sendEmail`. The service caches compiled templates at runtime.

Existing templates:

- `welcome.hbs`
- `workspace-invite.hbs`
- `subscription-expiring.hbs`

Add new templates by dropping a `.hbs` file in the folder and referencing its name when sending.

## NotificationsService

Key methods exposed by `NotificationsService`:

- `sendEmail(to, templateName, data)` – render a template and send via Resend. Always persists a notification record.
- `findAll()` – list all notifications in the system (admin use).
- `findByUser(userId, unreadOnly?)` – list notifications for a specific user, optionally filtering unread only.
- `markAsRead(userId, notificationId)` – set `read_at` on a notification.
- `dismiss(userId, notificationId)` – set `dismissed_at` on a notification.
- `sendNotification(dto)` – create a notification record; will call `sendEmail` when `sent_via` is `email`.

Each method returns a `NotificationDto` object.
