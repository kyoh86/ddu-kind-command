import {
  type ActionArguments,
  ActionFlags,
  type Actions,
  type Previewer,
} from "@shougo/ddu-vim/types";
import { BaseKind, type GetPreviewerArguments } from "@shougo/ddu-vim/kind";
import type { Denops } from "@denops/std";
import * as fn from "@denops/std/function";
import * as option from "@denops/std/option";
import * as path from "@std/path";

type ActionData = {
  command: string;
};

type Params = Record<never, never>;

type HelpLocation = {
  path: string;
  tag: string;
};

const findHelpPath = async (
  denops: Denops,
  tags: string[],
): Promise<HelpLocation | undefined> => {
  const runtimepath = await option.runtimepath.get(denops);
  const tagsPaths = await denops.call(
    "globpath",
    runtimepath,
    "doc/tags",
    true,
    true,
  ) as string[];
  for (const tagsPath of tagsPaths) {
    try {
      const lines = await fn.readfile(denops, tagsPath) as string[];
      for (const tag of tags) {
        const line = lines.find((l) => l.startsWith(tag + "\t"));
        if (!line) {
          continue;
        }
        const [, helpFile] = line.split("\t");
        if (!helpFile) {
          continue;
        }
        const helpPath = helpFile.startsWith("/")
          ? helpFile
          : path.join(path.dirname(tagsPath), helpFile);
        return {
          path: helpPath,
          tag,
        };
      }
    } catch {
      continue;
    }
  }
  return undefined;
};

const escapeVeryNomagic = (text: string): string => {
  return text.replaceAll("\\", "\\\\");
};

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
    help: async ({ denops, items }: ActionArguments<Params>) => {
      const action = items[0]?.action as ActionData;
      await denops.cmd(`help :${action.command}`);
      return Promise.resolve(ActionFlags.None);
    },
  };

  override async getPreviewer(
    args: GetPreviewerArguments,
  ): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    const tags = [`:${action.command}`, action.command];
    const help = await findHelpPath(args.denops, tags);
    if (!help) {
      try {
        const output = await fn.execute(
          args.denops,
          `verbose command ${action.command}`,
        ) as string;
        return {
          kind: "nofile",
          contents: output.split("\n"),
          filetype: "vim",
        };
      } catch {
        return undefined;
      }
    }
    try {
      const contents = await fn.readfile(args.denops, help.path) as string[];
      return {
        kind: "nofile",
        contents,
        filetype: "help",
        pattern: `\\V*${escapeVeryNomagic(help.tag)}*`,
      };
    } catch {
      try {
        const output = await fn.execute(
          args.denops,
          `verbose command ${action.command}`,
        ) as string;
        return {
          kind: "nofile",
          contents: output.split("\n"),
          filetype: "vim",
        };
      } catch {
        return undefined;
      }
    }
  }
}
