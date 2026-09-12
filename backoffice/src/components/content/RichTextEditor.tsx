"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Tiptap editor producing the same HTML subset the API accepts (p, headings,
// lists, bold/italic, links, quotes, rules). Anything else is stripped server-side.
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write here…",
  disabled = false,
  minHeight = 260,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, code: false }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https", HTMLAttributes: { rel: "noopener noreferrer" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-editor__content outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  // Reload content when the parent switches language/record.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value && !(editor.isEmpty && value === "")) editor.commands.setContent(value || "", { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const button = (label: string, icon: React.ReactNode, active: boolean, onClick: () => void, isDisabled = false) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled || isDisabled}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-[6px] text-muted-foreground transition-colors hover:bg-brand-purple-50 hover:text-brand-purple-800 disabled:opacity-40",
        active && "bg-brand-purple-100 text-brand-purple-800",
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className={cn("rich-editor rounded-[10px] border border-input bg-white", disabled && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
        {button("Bold", <Bold className="size-4" />, Boolean(editor?.isActive("bold")), () => editor?.chain().focus().toggleBold().run())}
        {button("Italic", <Italic className="size-4" />, Boolean(editor?.isActive("italic")), () => editor?.chain().focus().toggleItalic().run())}
        <span className="mx-1 h-5 w-px bg-border" />
        {button("Heading", <Heading2 className="size-4" />, Boolean(editor?.isActive("heading", { level: 2 })), () => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
        {button("Sub-heading", <Heading3 className="size-4" />, Boolean(editor?.isActive("heading", { level: 3 })), () => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
        <span className="mx-1 h-5 w-px bg-border" />
        {button("Bullet list", <List className="size-4" />, Boolean(editor?.isActive("bulletList")), () => editor?.chain().focus().toggleBulletList().run())}
        {button("Numbered list", <ListOrdered className="size-4" />, Boolean(editor?.isActive("orderedList")), () => editor?.chain().focus().toggleOrderedList().run())}
        {button("Quote", <Quote className="size-4" />, Boolean(editor?.isActive("blockquote")), () => editor?.chain().focus().toggleBlockquote().run())}
        {button("Divider", <Minus className="size-4" />, false, () => editor?.chain().focus().setHorizontalRule().run())}
        <span className="mx-1 h-5 w-px bg-border" />
        {button("Link", <Link2 className="size-4" />, Boolean(editor?.isActive("link")), setLink)}
        {button("Remove link", <Link2Off className="size-4" />, false, () => editor?.chain().focus().unsetLink().run(), !editor?.isActive("link"))}
        <span className="ml-auto" />
        {button("Undo", <Undo2 className="size-4" />, false, () => editor?.chain().focus().undo().run(), !editor?.can().undo())}
        {button("Redo", <Redo2 className="size-4" />, false, () => editor?.chain().focus().redo().run(), !editor?.can().redo())}
      </div>
      <EditorContent editor={editor} className="px-4 py-3" />
    </div>
  );
}
