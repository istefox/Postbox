declare module "turndown-plugin-gfm" {
  import { Plugin } from "turndown";
  export const gfm: Plugin;
  export const tables: Plugin;
  export const strikethrough: Plugin;
  export const taskListItems: Plugin;
}
