import "dotenv/config";
import express from "express";
import { Scenes, session, Telegraf, Markup } from "telegraf";
import { parse, isValid, differenceInDays } from "date-fns";

import { Context } from "./types.js";
import { WIZARD_ID } from "./constants.js";
import { data } from "./data.js";
import { messages } from "./messages.js";

const wizard = new Scenes.WizardScene<Context>(
  WIZARD_ID,
  async (ctx) => {
    await ctx.sendMessage(messages.dateOfBirth.question);
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const parsedDate = parse(ctx.message.text, "dd.MM.yyyy", new Date());
      const isParsedDateValid = isValid(parsedDate);
      const isTooOld = differenceInDays(new Date(), parsedDate) > 365 * 122;

      if (isTooOld) {
        await ctx.reply(messages.dateOfBirth.error.tooOld);
        return;
      }

      if (!isParsedDateValid) {
        await ctx.reply(messages.dateOfBirth.error.invalidFormat);
        return;
      }

      ctx.scene.session.dateOfBirth = parsedDate;

      await ctx.reply(
        messages.sex.question,
        Markup.inlineKeyboard([
          Markup.button.callback("🕺", "male"),
          Markup.button.callback("💃", "female"),
        ])
      );
    } else {
      await ctx.reply(messages.dateOfBirth.error.invalidFormat);
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
        await ctx.reply(messages.sex.error.invalidFormat);
        return;
      }

      ctx.scene.session.sex = answer as "male";
    } else {
      await ctx.reply(messages.sex.error.invalidFormat);
      return;
    }

    await ctx.reply(
      messages.country.question,
      Markup.inlineKeyboard([Markup.button.callback("Пропустить", "skip")])
    );
    return ctx.wizard.next();
  },

  async (ctx) => {
    const hasAnswer = ctx.message && "text" in ctx.message;
    const hasSkip = ctx.callbackQuery && "data" in ctx.callbackQuery;

    if (hasAnswer || hasSkip) {
      const input =
        hasAnswer && ctx.message.text ? ctx.message.text.toLowerCase() : "Мир";

      const item =
        input && data.find((record) => record.country.toLowerCase() === input);

      if (!item) {
        await ctx.reply(messages.country.error.invalidFormat);
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
        messages.statistics({
          chartFilled,
          chartLength: CHART_LENGTH,
          daysLived,
          leftDays,
          percentage,
        })
      );

      await ctx.reply(messages.promo);
    } else {
      await ctx.reply(messages.country.error.invalidFormat);
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

app.get("/health", (_, res) => {
  res.send({ status: "ok" });
});

app.listen(process.env.PORT, () =>
  console.log("Listening on port", process.env.PORT)
);
