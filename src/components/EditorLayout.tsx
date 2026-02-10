import { MDXEditor } from './MDXEditor'
import { NotesIsland } from './NotesIsland'
import { useNotes } from '@/hooks/useNotes'

export function EditorLayout() {
  const {
    notes,
    activeNote,
    activeNoteId,
    switchNote,
    loading,
    saveStatus,
    createNote,
    updateNoteContent,
    renameNote,
    deleteNote,
  } = useNotes()

  const wordCount = activeNote
    ? activeNote.content.trim().split(/\s+/).filter(Boolean).length
    : 0

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Loading notes...</div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center p-3">
      <div className="relative h-full w-full max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-1.5rem)] bg-background rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Dynamic Island */}
        <NotesIsland
          notes={notes}
          activeNoteId={activeNoteId}
          saveStatus={saveStatus}
          wordCount={wordCount}
          onSelectNote={switchNote}
          onCreateNote={createNote}
          onDeleteNote={deleteNote}
          onRenameNote={renameNote}
        />

        {/* Spacer for island */}
        <div className="h-11 shrink-0" />

        {/* Editor */}
        <div className="flex-1 min-h-0">
          {activeNote ? (
            <MDXEditor
              content={activeNote.content}
              onContentChange={updateNoteContent}
              saveStatus={saveStatus}
              noteTitle={activeNote.title}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No notes yet</p>
                <button
                  onClick={createNote}
                  className="mt-2 text-xs text-primary hover:underline underline-offset-4"
                >
                  Create your first note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
