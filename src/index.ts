import "dotenv/config";
import { Scenes, session, Telegraf, Format } from "telegraf";
import { parse, isValid, differenceInDays } from "date-fns";

import { fmt, bold, italic, underline } from "telegraf/format";

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

    await ctx.reply(Format.fmt`Country (${Format.italic`United Kingdom`})`);
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const input = ctx.message.text.toLowerCase();
      const item =
        ctx.message.text &&
        data.find((record) => record.country.toLowerCase() === input);

      if (!item) {
        await ctx.reply("Please enter the country for real");
        return;
      }

      ctx.scene.session.country = ctx.message.text;

      const daysLived = differenceInDays(
        new Date(),
        ctx.scene.session.dateOfBirth
      );
      const totalDays = Math.round(365 * item[ctx.scene.session.sex]);
      const percentage = ((daysLived / totalDays) * 100).toFixed(2);
      const leftDays = totalDays - daysLived;

      await ctx.reply(
        Format.fmt`You have already lived ${Format.underline`${daysLived} days`}, which makes up ${percentage}% of your entire life.

You have ${Format.underline`${leftDays} days left`} to live.

(Based on data on ${Format.link(
          "the average life expectancy",
          "https://en.wikipedia.org/wiki/List_of_countries_by_life_expectancy"
        )} in ${item.country})`
      );

      await ctx.reply(
        `By the way, don’t forget to subscribe to the bot author’s channel — @antonkonevcom.
        
We can’t promise to extend your life, but it will be interesting!
        
🖤`
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
