import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { SLASH_COMMANDS, CommandItem } from "./slashCommands";
import { Editor } from "@tiptap/react";
import tippy, { Instance } from "tippy.js";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import SlashCommandPopup from "@/components/SlashCommandPopup";

/**
 * Tiptap extension that wires up the `/` slash command menu.
 *
 * Typing `/` opens a floating `SlashCommandPopup` rendered via a Tippy
 * tooltip. Items are filtered in real-time as the user continues typing.
 * Selecting an item deletes the trigger text and runs the associated command.
 */
export const SlashExtension = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,

        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: { from: number; to: number };
          props: CommandItem;
        }) => {
          // Delete the `/query` text before running the chosen command.
          editor.chain().focus().deleteRange(range).run();
          props.command(editor);
        },

        items: ({ query }: { query: string }) => {
          return SLASH_COMMANDS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },

        render: () => {
          let container: HTMLDivElement;
          let root: Root;
          let popup: Instance[];

          return {
            onStart: (props: any) => {
              container = document.createElement("div");
              root = createRoot(container);

              root.render(
                createElement(SlashCommandPopup, {
                  items: props.items,
                  command: (item: CommandItem) => props.command(item),
                })
              );

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: container,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "slash",
                arrow: false,
                offset: [0, 8],
              });
            },

            onUpdate: (props: any) => {
              root.render(
                createElement(SlashCommandPopup, {
                  items: props.items,
                  command: (item: CommandItem) => props.command(item),
                })
              );

              popup[0]?.setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown: (props: any) => {
              if (props.event.key === "Escape") {
                popup[0]?.hide();
                return true;
              }
              return false;
            },

            onExit: () => {
              popup[0]?.destroy();
              root.unmount();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});