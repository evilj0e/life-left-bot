import { Scenes } from "telegraf";

interface SessionStorage extends Scenes.WizardSessionData {
  dateOfBirth: Date;
  sex: "male" | "female";
  country: string;
}

export type Context = Scenes.WizardContext<SessionStorage>;
