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
      Format.fmt`Date of birth (${Format.italic`dd/mm/yyyy`})`
    );

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const parsedDate = parse(ctx.message.text, "dd/MM/yyyy", new Date());
      const isParsedDateValid = isValid(parsedDate);
      const isTooOld = differenceInDays(new Date(), parsedDate) > 365 * 125;

      if (!isParsedDateValid || isTooOld) {
        await ctx.reply("Please enter the date for real");
        return;
      }

      ctx.scene.session.dateOfBirth = parsedDate;

      await ctx.reply(Format.fmt`Sex (${Format.italic`Female or Male`})`);
    } else {
      await ctx.reply("Please enter the date for real");
      return;
    }

    return ctx.wizard.next();
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      if (!["female", "male"].includes(ctx.message.text.toLowerCase())) {
        await ctx.reply("Please enter the sex for real");
        return;
      }

      ctx.scene.session.sex = ctx.message.text.toLowerCase() as "male";
    } else {
      await ctx.reply("Please enter the sex for real");
      return;
    }

    await ctx.reply(
      Format.fmt`Country (${Format.italic`United Kingdom`})`,
      Markup.inlineKeyboard([Markup.button.callback("Skip", "skip")])
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
        await ctx.reply("Please enter the country for real");
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
        
You have already lived ${daysLived} days, which makes up ${percentage.toFixed(
          2
        )}% of your entire life.

You have ${Format.underline`${leftDays} days left`} to live.

(Based on data on the average life expectancy by UN)`
      );

      await ctx.reply(
        `By the way, don’t forget to subscribe to the bot author’s channel — @antonkonevcom.
        
We're not fishing to extend your life, but we'll help you not to spend it on the useless things.

🏴`
      );
    } else {
      await ctx.reply("Please enter the country for real");
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
app.use(
  await bot.createWebhook({
    domain: process.env.HOST || "",
  })
);

app.get("/health", (_, res) => {
  res.send({ status: "ok" });
});

app.listen(process.env.PORT, () =>
  console.log("Listening on port", process.env.PORT)
);
