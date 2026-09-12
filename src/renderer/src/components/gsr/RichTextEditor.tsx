import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Placeholder } from '@tiptap/extension-placeholder'

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="app-no-drag rounded-md px-2 py-1 text-xs font-medium transition-colors disabled:opacity-30"
      style={{
        backgroundColor: active ? 'var(--md-primary-container)' : 'transparent',
        color: active ? 'var(--md-on-primary-container)' : 'var(--md-on-surface-variant)'
      }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }): React.JSX.Element {
  const inTable = editor.isActive('table')

  function setLink(): void {
    const previous = editor.getAttributes('link').href as string | undefined

    const url = window.prompt('Link URL', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--md-outline-variant)] px-2 py-1.5">
      <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
        ↶
      </ToolbarButton>
      <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
        ↷
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-[var(--md-outline-variant)]" />
      <select
        className="app-no-drag rounded-md border border-[var(--md-outline-variant)] bg-[var(--md-surface)] px-1.5 py-1 text-xs"
        value={
          editor.isActive('heading', { level: 1 })
            ? 'h1'
            : editor.isActive('heading', { level: 2 })
              ? 'h2'
              : editor.isActive('heading', { level: 3 })
                ? 'h3'
                : 'p'
        }
        onChange={(e) => {
          const v = e.target.value
          if (v === 'p') editor.chain().focus().setParagraph().run()
          else
            editor
              .chain()
              .focus()
              .setHeading({ level: Number(v[1]) as 1 | 2 | 3 })
              .run()
        }}
      >
        <option value="p">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <span className="mx-1 h-4 w-px bg-[var(--md-outline-variant)]" />
      <ToolbarButton
        label="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
        🔗
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-[var(--md-outline-variant)]" />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-[var(--md-outline-variant)]" />
      {!inTable ? (
        <ToolbarButton
          label="Insert table"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          ⊞ Table
        </ToolbarButton>
      ) : (
        <>
          <ToolbarButton label="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>
            +Row
          </ToolbarButton>
          <ToolbarButton
            label="Add column"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            +Col
          </ToolbarButton>
          <ToolbarButton
            label="Delete row"
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            −Row
          </ToolbarButton>
          <ToolbarButton
            label="Delete column"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            −Col
          </ToolbarButton>
          <ToolbarButton
            label="Delete table"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            ✕ Table
          </ToolbarButton>
        </>
      )}
    </div>
  )
}

/**
 * Word-processor-style editor for GSR section content: headings, bold/
 * italic/underline, bullet/numbered lists, tables, and hyperlinks —
 * modeled on how the user actually drafts a GSR in Word (numbered
 * question sections, comparison tables, hyperlinked source lists).
 * Content is stored as HTML (GsrSection.contentHtml), matching what
 * finalization.ts's Word/PDF export renders.
 *
 * `value` is used only as the editor's *initial* content — this
 * component owns the ProseMirror document after that and reports
 * changes via `onChange`. The caller must remount it (e.g. `key={sectionId}`)
 * to load different content, rather than relying on `value` updates.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}): React.JSX.Element | null {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TableKit.configure({ table: { resizable: false } }),
      CharacterCount,
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' })
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class: 'gsr-editor-prose'
      }
    }
  })

  if (!editor) return null

  const words = editor.storage.characterCount?.words() ?? 0
  const characters = editor.storage.characterCount?.characters() ?? 0

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--md-outline-variant)] bg-[var(--md-surface-container)]">
      <style>{`
        .gsr-editor-prose { outline: none; padding: 1rem; min-height: 220px; font-size: 0.875rem; line-height: 1.7; }
        .gsr-editor-prose p { margin: 0 0 0.75em; }
        .gsr-editor-prose p:last-child { margin-bottom: 0; }
        .gsr-editor-prose h1 { font-size: 1.25rem; font-weight: 700; margin: 0.4em 0 0.5em; }
        .gsr-editor-prose h2 { font-size: 1.1rem; font-weight: 700; margin: 0.4em 0 0.5em; }
        .gsr-editor-prose h3 { font-size: 1rem; font-weight: 700; margin: 0.4em 0 0.5em; }
        .gsr-editor-prose ul, .gsr-editor-prose ol { margin: 0 0 0.75em; padding-left: 1.4em; }
        .gsr-editor-prose a { color: var(--md-primary); text-decoration: underline; }
        .gsr-editor-prose table { border-collapse: collapse; margin: 0.75em 0; width: 100%; }
        .gsr-editor-prose th, .gsr-editor-prose td {
          border: 1px solid var(--md-outline-variant); padding: 0.4em 0.6em; text-align: left; vertical-align: top;
        }
        .gsr-editor-prose th { background-color: var(--md-surface-container-high); font-weight: 600; }
        .gsr-editor-prose p.is-editor-empty:first-child::before {
          content: attr(data-placeholder); float: left; color: var(--md-on-surface-variant); opacity: 0.6; pointer-events: none; height: 0;
        }
      `}</style>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="max-h-[520px] overflow-y-auto" />
      <div className="flex justify-end gap-3 border-t border-[var(--md-outline-variant)] px-3 py-1 text-[10px] text-[var(--md-on-surface-variant)]">
        <span>{words} words</span>
        <span>{characters} characters</span>
      </div>
    </div>
  )
}
