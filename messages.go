package main

import (
	"fmt"
	"strings"
)

var Messages = struct {
	DateOfBirth struct {
		Question string
		Error    struct {
			TooOld        string
			InvalidFormat string
		}
	}
	Sex struct {
		Question string
		Error    struct {
			InvalidFormat string
		}
	}
	Country struct {
		Question string
		Error    struct {
			InvalidFormat string
		}
	}
	Promo string
	Skip  string
}{
	DateOfBirth: struct {
		Question string
		Error    struct {
			TooOld        string
			InvalidFormat string
		}
	}{
		Question: "Дата рождения (<i>например, 23.11.1990</i>)",
		Error: struct {
			TooOld        string
			InvalidFormat string
		}{
			TooOld:        "Ух ты! Вы превзошли Жанну Кальман, самого долгоживущего человека в мире! Переключаем вас на \"Книгу рекордов Гиннесса\".",
			InvalidFormat: "Для продолжения нам нужна дата в формате дд.мм.гггг – будет использоваться для подсчёта дней. Эти данные нигде не сохраняются.",
		},
	},
	Sex: struct {
		Question string
		Error    struct {
			InvalidFormat string
		}
	}{
		Question: "Пол",
		Error: struct {
			InvalidFormat string
		}{
			InvalidFormat: "Для продолжения нам нужнен пол – он влияет на продолжительность жизни. Эти данные нигде не сохраняются.",
		},
	},
	Country: struct {
		Question string
		Error    struct {
			InvalidFormat string
		}
	}{
		Question: "Страна (<i>например, Россия</i>)",
		Error: struct {
			InvalidFormat string
		}{
			InvalidFormat: "Для продолжения нам нужна страна – оно влияет на продолжительность жизни. Эти данные нигде не сохраняются.",
		},
	},
	Promo: `Кстати, не забудьте подписаться на канал автора — @antonkonevcom.

Я не обещаю продлить вашу жизнь, но помогу не тратить её на бесполезные вещи.

🏴`,
	Skip: "Пропустить",
}

// StatisticsParams contains parameters for statistics message
type StatisticsParams struct {
	ChartFilled int
	ChartLength int
	DaysLived   int
	Percentage  float64
	LeftDays    int
}

// FormatStatistics generates the statistics message
func FormatStatistics(p StatisticsParams) string {
	filled := strings.Repeat("■", p.ChartFilled)
	empty := strings.Repeat("□", p.ChartLength-p.ChartFilled)

	daysWord := pluralizeDays(p.DaysLived)
	leftDaysWord := pluralizeDays(p.LeftDays)

	return fmt.Sprintf(`%s%s
        
Вы уже прожили %d %s, что составляет %.2f%% от всей вашей жизни.

Вам осталось жить <u>%d %s</u>.

(На основе данных о средней продолжительности жизни по данным ООН)`,
		filled, empty, p.DaysLived, daysWord, p.Percentage, p.LeftDays, leftDaysWord)
}

// pluralizeDays returns the correct Russian word form for days
func pluralizeDays(n int) string {
	abs := n
	if abs < 0 {
		abs = -abs
	}

	lastTwo := abs % 100
	lastOne := abs % 10

	if lastTwo >= 11 && lastTwo <= 19 {
		return "дней"
	}

	switch lastOne {
	case 1:
		return "день"
	case 2, 3, 4:
		return "дня"
	default:
		return "дней"
	}
}
