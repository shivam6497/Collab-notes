import { Editor } from "@tiptap/react";

export interface CommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: Editor) => void;
}

/**
 * The full set of slash commands available in the editor.
 * Each entry is rendered in the command picker when the user types `/`.
 */
export const SLASH_COMMANDS: CommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "H3",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Create an unordered list",
    icon: "•",
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Create an ordered list",
    icon: "1.",
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Code Block",
    description: "Add a code block",
    icon: "<>",
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Blockquote",
    description: "Add a quote block",
    icon: "❝",
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Bold",
    description: "Make text bold",
    icon: "B",
    command: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    title: "Italic",
    description: "Make text italic",
    icon: "I",
    command: (editor) => editor.chain().focus().toggleItalic().run(),
  },
];