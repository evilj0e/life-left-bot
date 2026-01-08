package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		log.Fatal("TELEGRAM_BOT_TOKEN is required")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// Create bot
	b, err := NewBot(token)
	if err != nil {
		log.Fatal("Failed to create bot:", err)
	}

	// Setup context with signal handling
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()

	// Start health check server
	go func() {
		http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{"status":"ok"}`))
		})
		log.Println("Health server listening on port", port)
		if err := http.ListenAndServe(":"+port, nil); err != nil {
			log.Println("Health server error:", err)
		}
	}()

	log.Println("Bot started")
	b.Start(ctx)
}
