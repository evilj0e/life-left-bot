import "dotenv/config";
import express from "express";
import { Scenes, session, Telegraf, Format, Markup } from "telegraf";
import { parse, isValid, differenceInDays } from "date-fns";

import { Context } from "./types.js";
import { WIZARD_ID } from "./constants.js";
import { data } from "./data.js";

const wizard = new Scenes.WizardScene<Context>(
  WIZARD_ID,
  async (ctx) => {
    await ctx.sendMessage(
      Format.fmt`Дата рождения (${Format.italic`например, 23.11.1990`})`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const parsedDate = parse(ctx.message.text, "dd.MM.yyyy", new Date());
      const isParsedDateValid = isValid(parsedDate);
      const isTooOld = differenceInDays(new Date(), parsedDate) > 365 * 122;

      if (isTooOld) {
        await ctx.reply(
          "Ух ты! Вы превзошли Жанну Кальман, самого долгоживущего человека в мире! Переключаем вас на “Книгу рекордов Гиннесса”."
        );
        return;
      }

      if (!isParsedDateValid) {
        await ctx.reply("Для продолжения нам нужна дата в формате дд.мм.гггг");
        return;
      }

      ctx.scene.session.dateOfBirth = parsedDate;

      await ctx.reply(
        Format.fmt`Пол`,
        Markup.inlineKeyboard([
          Markup.button.callback("🕺", "male"),
          Markup.button.callback("💃", "female"),
        ])
      );
    } else {
      await ctx.reply(
        "Для продолжения нам нужна дата в формате дд.мм.гггг – будет использоваться для подсчёта дней. Эти данные нигде не сохраняются."
      );
      return;
    }

    return ctx.wizard.next();
  },

  async (ctx) => {
    const hasAnswer = ctx.message && "text" in ctx.message;
    const hasQuery = ctx.callbackQuery && "data" in ctx.callbackQuery;

    if (hasAnswer || hasQuery) {
      const answer = hasQuery
        ? ctx.callbackQuery.data
        : hasAnswer
        ? ctx.message.text
        : "";

      if (!["male", "female"].includes(answer)) {
        await ctx.reply(
          "Для продолжения нам нужнен пол – он влияет на продолжительность жизни. Эти данные нигде не сохраняются."
        );
        return;
      }

      ctx.scene.session.sex = answer as "male";
    } else {
      await ctx.reply(
        "Для продолжения нам нужнен пол – он влияет на продолжительность жизни. Эти данные нигде не сохраняются."
      );
      return;
    }

    await ctx.reply(
      Format.fmt`Страна (${Format.italic`например, Россия`})`,
      Markup.inlineKeyboard([Markup.button.callback("Пропустить", "skip")])
    );
    return ctx.wizard.next();
  },

  async (ctx) => {
    const hasAnswer = ctx.message && "text" in ctx.message;
    const hasSkip = ctx.callbackQuery && "data" in ctx.callbackQuery;

    if (hasAnswer || hasSkip) {
      const input =
        hasAnswer && ctx.message.text
          ? ctx.message.text.toLowerCase()
          : "world";

      const item =
        input && data.find((record) => record.country.toLowerCase() === input);

      if (!item) {
        await ctx.reply(
          "Для продолжения нам нужна страна – оно влияет на продолжительность жизни. Эти данные нигде не сохраняются."
        );
        return;
      }

      ctx.scene.session.country = input;

      const daysLived = differenceInDays(
        new Date(),
        ctx.scene.session.dateOfBirth
      );
      const totalDays = Math.round(365 * item[ctx.scene.session.sex]);
      const percentage = (daysLived / totalDays) * 100;
      const leftDays = totalDays - daysLived;

      const CHART_LENGTH = 380;
      const chartFilled = Math.floor((CHART_LENGTH * percentage) / 100);

      await ctx.reply(
        Format.fmt`${Array(chartFilled).fill("■").join("")}${Array(
          CHART_LENGTH - chartFilled
        )
          .fill("□")
          .join("")}
        
Вы уже прожили ${daysLived} ${
          daysLived === 1 ? "день" : "дней"
        }, что составляет ${percentage.toFixed(2)}% от всей вашей жизни.

Вам осталось жить ${Format.underline`${leftDays} ${
          leftDays === 1 ? "день" : "дней"
        }`}.

(На основе данных о средней продолжительности жизни по данным ООН)`
      );

      await ctx.reply(
        `Кстати, не забудьте подписаться на канал автора — @antonkonevcom.

Я не обещаю продлить вашу жизнь, но помогу не тратить её на бесполезные вещи.

🏴`
      );
    } else {
      await ctx.reply(
        "Для продолжения нам нужна страна – оно влияет на продолжительность жизни. Эти данные нигде не сохраняются."
      );
      return;
    }

    return ctx.scene.leave();
  }
);

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw Error(
    "Before start you have to specify TELEGRAM_BOT_TOKEN in the .env"
  );
}

const bot = new Telegraf<Context>(process.env.TELEGRAM_BOT_TOKEN);
const stage = new Scenes.Stage<Context>([wizard], {
  default: WIZARD_ID,
});
bot.use(session());
bot.use(stage.middleware());
bot.launch();

const app = express();
// app.use(
//   await bot.createWebhook({
//     domain: process.env.HOST || "",
//   })
// );

app.get("/health", (_, res) => {
  res.send({ status: "ok" });
});

app.listen(process.env.PORT, () =>
  console.log("Listening on port", process.env.PORT)
);
