import { Context, createContext, runInContext } from "vm";
export class AiConsole {
  log(text: string) {
    console.log(text);
  }
}
export class AiContext implements Context {
  console = new AiConsole();
}
