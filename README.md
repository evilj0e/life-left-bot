# Life Left Bot

[Life Left Bot](https://t.me/LifeLeftBot) — Telegram bot that calculates your remaining life expectancy based on UN data.

## Requirements

- Go 1.21+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and set your `TELEGRAM_BOT_TOKEN`
3. Run:

```bash
go mod tidy
go run .
```

## Environment Variables

| Variable             | Description                              | Required |
| -------------------- | ---------------------------------------- | -------- |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather        | Yes      |
| `PORT`               | Health check server port (default: 8080) | No       |

## Building

```bash
go build -o life-left-bot .
```

## Docker

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o life-left-bot .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/life-left-bot .
CMD ["./life-left-bot"]
```

## Features

- Asks for date of birth
- Asks for sex (affects life expectancy)
- Asks for country (optional, defaults to world average)
- Shows visual progress bar of life lived
- Displays days lived and days remaining

## Data Source

This project is licensed under the MIT License.
