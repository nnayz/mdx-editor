import { useState, useCallback } from 'react'
import { MDXEditor } from './MDXEditor'
import { NotesIsland } from './NotesIsland'
import type { IslandNotification } from './NotesIsland'
import { useNotes } from '@/hooks/useNotes'
import { Skeleton } from '@/components/ui/skeleton'

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

  const [notification, setNotification] = useState<IslandNotification | null>(null)

  const notify = useCallback((
    message: string,
    type: 'success' | 'error' = 'success',
    action?: { label: string; onClick: () => void },
  ) => {
    setNotification({ message, type, key: Date.now(), action })
  }, [])

  const wordCount = activeNote
    ? activeNote.content.trim().split(/\s+/).filter(Boolean).length
    : 0

  const charCount = activeNote ? activeNote.content.length : 0

  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  const handleCreateNote = async () => {
    const note = await createNote()
    if (note) notify('Note created')
  }

  const handleDeleteNote = async (id: string) => {
    const deletedNote = notes.find(n => n.id === id)
    if (!deletedNote) return
    await deleteNote(id)
    notify(`"${deletedNote.title}" deleted`, 'success', {
      label: 'Undo',
      onClick: async () => {
        await createNote(deletedNote.title, deletedNote.content)
        notify('Note restored')
      },
    })
  }

  const handleRenameNote = async (id: string, title: string) => {
    await renameNote(id, title)
    notify('Note renamed')
  }

  const handleDuplicateNote = async (id: string) => {
    const source = notes.find(n => n.id === id)
    if (source) {
      const note = await createNote(`${source.title} (copy)`, source.content)
      if (note) notify('Note duplicated')
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-3">
        <div className="relative h-full w-full max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-1.5rem)] bg-background rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {/* Island skeleton */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-black rounded-full px-3 py-2 flex items-center gap-2.5">
              <Skeleton className="h-6 w-6 rounded-full bg-white/10" />
              <Skeleton className="h-3 w-[100px] rounded bg-white/10" />
              <Skeleton className="h-3 w-[30px] rounded bg-white/10" />
            </div>
          </div>
          <div className="h-11 shrink-0" />
          {/* Single-view editor skeleton */}
          <div className="flex-1 min-h-0 flex justify-center">
            <div className="w-full max-w-[720px] px-12 pt-10 space-y-4">
              <Skeleton className="h-10 w-[55%]" />
              <div className="space-y-2.5 pt-2">
                <Skeleton className="h-4 w-[85%]" />
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="h-4 w-[75%]" />
                <Skeleton className="h-4 w-[40%]" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[50%]" />
                <Skeleton className="h-4 w-[70%]" />
              </div>
            </div>
          </div>
        </div>
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
          charCount={charCount}
          readingTime={readingTime}
          notification={notification}
          onSelectNote={switchNote}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onRenameNote={handleRenameNote}
          onDuplicateNote={handleDuplicateNote}
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
              onRenameNote={(title) => handleRenameNote(activeNote.id, title)}
              onNotify={notify}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No notes yet</p>
                <button
                  onClick={() => createNote()}
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
