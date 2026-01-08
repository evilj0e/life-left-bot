package main

import (
	"context"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/go-telegram/bot"
	"github.com/go-telegram/bot/models"
)

// WizardStep represents the current step in the wizard
type WizardStep int

const (
	StepStart WizardStep = iota
	StepDateOfBirth
	StepSex
	StepCountry
)

// UserSession stores user data during the wizard flow
type UserSession struct {
	Step        WizardStep
	DateOfBirth time.Time
	Sex         string
}

// SessionManager manages user sessions
type SessionManager struct {
	sessions map[int64]*UserSession
	mu       sync.RWMutex
}

// NewSessionManager creates a new session manager
func NewSessionManager() *SessionManager {
	return &SessionManager{
		sessions: make(map[int64]*UserSession),
	}
}

// Get returns the session for a user
func (sm *SessionManager) Get(userID int64) *UserSession {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	return sm.sessions[userID]
}

// GetOrCreate returns or creates a session for a user
func (sm *SessionManager) GetOrCreate(userID int64) *UserSession {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	if sm.sessions[userID] == nil {
		sm.sessions[userID] = &UserSession{Step: StepStart}
	}
	return sm.sessions[userID]
}

// Delete removes a user session
func (sm *SessionManager) Delete(userID int64) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.sessions, userID)
}

// Bot wraps the telegram bot with session management
type Bot struct {
	bot      *bot.Bot
	sessions *SessionManager
}

// NewBot creates a new bot instance
func NewBot(token string) (*Bot, error) {
	sm := NewSessionManager()
	b := &Bot{sessions: sm}

	opts := []bot.Option{
		bot.WithDefaultHandler(b.handleMessage),
		bot.WithCallbackQueryDataHandler("male", bot.MatchTypeExact, b.handleSexCallback),
		bot.WithCallbackQueryDataHandler("female", bot.MatchTypeExact, b.handleSexCallback),
		bot.WithCallbackQueryDataHandler("skip", bot.MatchTypeExact, b.handleSkipCallback),
	}

	telegramBot, err := bot.New(token, opts...)
	if err != nil {
		return nil, err
	}

	b.bot = telegramBot
	return b, nil
}

// Start starts the bot
func (b *Bot) Start(ctx context.Context) {
	b.bot.Start(ctx)
}

// handleMessage processes incoming messages
func (b *Bot) handleMessage(ctx context.Context, telegramBot *bot.Bot, update *models.Update) {
	if update.Message == nil {
		return
	}

	userID := update.Message.From.ID
	chatID := update.Message.Chat.ID
	text := update.Message.Text

	// Handle /start command
	if text == "/start" {
		b.sessions.Delete(userID)
		session := b.sessions.GetOrCreate(userID)
		session.Step = StepDateOfBirth
		b.sendDateOfBirthQuestion(ctx, chatID)
		return
	}

	session := b.sessions.Get(userID)
	if session == nil {
		// No active session, start new wizard
		session = b.sessions.GetOrCreate(userID)
		session.Step = StepDateOfBirth
		b.sendDateOfBirthQuestion(ctx, chatID)
		return
	}

	switch session.Step {
	case StepDateOfBirth:
		b.handleDateOfBirth(ctx, chatID, userID, text)
	case StepSex:
		b.handleSexText(ctx, chatID, userID, text)
	case StepCountry:
		b.handleCountry(ctx, chatID, userID, text)
	}
}

// sendDateOfBirthQuestion sends the date of birth question
func (b *Bot) sendDateOfBirthQuestion(ctx context.Context, chatID int64) {
	b.bot.SendMessage(ctx, &bot.SendMessageParams{
		ChatID:    chatID,
		Text:      Messages.DateOfBirth.Question,
		ParseMode: models.ParseModeHTML,
	})
}

// handleDateOfBirth processes the date of birth input
func (b *Bot) handleDateOfBirth(ctx context.Context, chatID, userID int64, text string) {
	session := b.sessions.Get(userID)
	if session == nil {
		return
	}

	parsedDate, err := time.Parse("02.01.2006", text)
	if err != nil {
		b.bot.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: chatID,
			Text:   Messages.DateOfBirth.Error.InvalidFormat,
		})
		return
	}

	// Check if too old (> 122 years)
	daysSinceBirth := int(time.Since(parsedDate).Hours() / 24)
	if daysSinceBirth > 365*122 {
		b.bot.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: chatID,
			Text:   Messages.DateOfBirth.Error.TooOld,
		})
		return
	}

	session.DateOfBirth = parsedDate
	session.Step = StepSex

	kb := &models.InlineKeyboardMarkup{
		InlineKeyboard: [][]models.InlineKeyboardButton{
			{
				{Text: "🕺", CallbackData: "male"},
				{Text: "💃", CallbackData: "female"},
			},
		},
	}

	b.bot.SendMessage(ctx, &bot.SendMessageParams{
		ChatID:      chatID,
		Text:        Messages.Sex.Question,
		ReplyMarkup: kb,
	})
}

// handleSexCallback processes the sex selection callback
func (b *Bot) handleSexCallback(ctx context.Context, telegramBot *bot.Bot, update *models.Update) {
	if update.CallbackQuery == nil {
		return
	}

	userID := update.CallbackQuery.From.ID
	chatID := update.CallbackQuery.Message.Message.Chat.ID
	data := update.CallbackQuery.Data

	session := b.sessions.Get(userID)
	if session == nil || session.Step != StepSex {
		return
	}

	session.Sex = data
	session.Step = StepCountry

	// Answer callback query
	b.bot.AnswerCallbackQuery(ctx, &bot.AnswerCallbackQueryParams{
		CallbackQueryID: update.CallbackQuery.ID,
	})

	kb := &models.InlineKeyboardMarkup{
		InlineKeyboard: [][]models.InlineKeyboardButton{
			{
				{Text: Messages.Skip, CallbackData: "skip"},
			},
		},
	}

	b.bot.SendMessage(ctx, &bot.SendMessageParams{
		ChatID:      chatID,
		Text:        Messages.Country.Question,
		ParseMode:   models.ParseModeHTML,
		ReplyMarkup: kb,
	})
}

// handleSexText processes text input for sex (fallback)
func (b *Bot) handleSexText(ctx context.Context, chatID, userID int64, text string) {
	textLower := strings.ToLower(text)
	if textLower != "male" && textLower != "female" {
		b.bot.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: chatID,
			Text:   Messages.Sex.Error.InvalidFormat,
		})
		return
	}

	session := b.sessions.Get(userID)
	if session == nil {
		return
	}

	session.Sex = textLower
	session.Step = StepCountry

	kb := &models.InlineKeyboardMarkup{
		InlineKeyboard: [][]models.InlineKeyboardButton{
			{
				{Text: Messages.Skip, CallbackData: "skip"},
			},
		},
	}

	b.bot.SendMessage(ctx, &bot.SendMessageParams{
		ChatID:      chatID,
		Text:        Messages.Country.Question,
		ParseMode:   models.ParseModeHTML,
		ReplyMarkup: kb,
	})
}

// handleSkipCallback processes the skip button callback
func (b *Bot) handleSkipCallback(ctx context.Context, telegramBot *bot.Bot, update *models.Update) {
	if update.CallbackQuery == nil {
		return
	}

	userID := update.CallbackQuery.From.ID
	chatID := update.CallbackQuery.Message.Message.Chat.ID

	// Answer callback query
	b.bot.AnswerCallbackQuery(ctx, &bot.AnswerCallbackQueryParams{
		CallbackQueryID: update.CallbackQuery.ID,
	})

	b.calculateAndSendStatistics(ctx, chatID, userID, DefaultRegion)
}

// handleCountry processes the country input
func (b *Bot) handleCountry(ctx context.Context, chatID, userID int64, text string) {
	b.calculateAndSendStatistics(ctx, chatID, userID, text)
}

// calculateAndSendStatistics calculates and sends life statistics
func (b *Bot) calculateAndSendStatistics(ctx context.Context, chatID, userID int64, countryInput string) {
	session := b.sessions.Get(userID)
	if session == nil {
		return
	}

	country := FindCountry(countryInput)
	if country == nil {
		b.bot.SendMessage(ctx, &bot.SendMessageParams{
			ChatID: chatID,
			Text:   Messages.Country.Error.InvalidFormat,
		})
		return
	}

	daysLived := int(time.Since(session.DateOfBirth).Hours() / 24)

	var lifeExpectancy float64
	if session.Sex == "male" {
		lifeExpectancy = country.Male
	} else {
		lifeExpectancy = country.Female
	}

	totalDays := int(math.Round(365 * lifeExpectancy))
	percentage := float64(daysLived) / float64(totalDays) * 100
	leftDays := totalDays - daysLived

	const chartLength = 380
	chartFilled := int(float64(chartLength) * percentage / 100)
	if chartFilled > chartLength {
		chartFilled = chartLength
	}
	if chartFilled < 0 {
		chartFilled = 0
	}

	statsMessage := FormatStatistics(StatisticsParams{
		ChartFilled: chartFilled,
		ChartLength: chartLength,
		DaysLived:   daysLived,
		Percentage:  percentage,
		LeftDays:    leftDays,
	})

	b.bot.SendMessage(ctx, &bot.SendMessageParams{
		ChatID:    chatID,
		Text:      statsMessage,
		ParseMode: models.ParseModeHTML,
	})

	b.bot.SendMessage(ctx, &bot.SendMessageParams{
		ChatID: chatID,
		Text:   Messages.Promo,
	})

	// Clear session
	b.sessions.Delete(userID)
}
