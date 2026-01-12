import {
  type ActionArguments,
  ActionFlags,
  type Actions,
} from "@shougo/ddu-vim/types";
import { BaseKind } from "@shougo/ddu-vim/kind";
import * as fn from "@denops/std/function";

type ActionData = {
  command: string;
};

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  params(): Params {
    return {};
  }

  actions: Actions<Params> = {
    edit: async ({ denops, items }: ActionArguments<Params>) => {
      const action = items[0]?.action as ActionData;
      await fn.feedkeys(denops, `:${action.command}`, "n");
      return Promise.resolve(ActionFlags.None);
    },
  };
}
