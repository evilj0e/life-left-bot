import { Format } from "telegraf";

export const messages = {
  dateOfBirth: {
    question: Format.fmt`Дата рождения (${Format.italic`например, 23.11.1990`})`,
    error: {
      tooOld:
        "Ух ты! Вы превзошли Жанну Кальман, самого долгоживущего человека в мире! Переключаем вас на “Книгу рекордов Гиннесса”.",
      invalidFormat:
        "Для продолжения нам нужна дата в формате дд.мм.гггг – будет использоваться для подсчёта дней. Эти данные нигде не сохраняются.",
    },
  },
  sex: {
    question: Format.fmt`Пол`,
    error: {
      invalidFormat:
        "Для продолжения нам нужнен пол – он влияет на продолжительность жизни. Эти данные нигде не сохраняются.",
    },
  },
  country: {
    question: Format.fmt`Страна (${Format.italic`например, Россия`})`,
    error: {
      invalidFormat:
        "Для продолжения нам нужна страна – оно влияет на продолжительность жизни. Эти данные нигде не сохраняются.",
    },
  },
  statistics: ({
    chartFilled,
    chartLength,
    daysLived,
    percentage,
    leftDays,
  }: {
    chartFilled: number;
    chartLength: number;
    daysLived: number;
    percentage: number;
    leftDays: number;
  }) => Format.fmt`${Array(chartFilled).fill("■").join("")}${Array(
    chartLength - chartFilled
  )
    .fill("□")
    .join("")}
        
Вы уже прожили ${daysLived} ${
    daysLived === 1 ? "день" : "дней"
  }, что составляет ${percentage.toFixed(2)}% от всей вашей жизни.

Вам осталось жить ${Format.underline`${leftDays} ${
    leftDays === 1 ? "день" : "дней"
  }`}.

(На основе данных о средней продолжительности жизни по данным ООН)`,
  promo: `Кстати, не забудьте подписаться на канал автора — @antonkonevcom.

Я не обещаю продлить вашу жизнь, но помогу не тратить её на бесполезные вещи.

🏴`,
};
