import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Note } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'

const LOCAL_DRAFT_KEY = 'mdx-editor-draft'

export function useNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
  const saveTimeoutRef = useRef<number | null>(null)
  const activeNoteIdRef = useRef<string | null>(null)

  // Keep ref in sync with state for use in timeouts
  useEffect(() => {
    activeNoteIdRef.current = activeNoteId
  }, [activeNoteId])

  const activeNote = notes.find(n => n.id === activeNoteId) ?? null

  // Fetch all notes for the user on mount / user change
  useEffect(() => {
    if (!user) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })
        .returns<Note[]>()

      if (cancelled) return

      if (!error && data) {
        setNotes(data)
        setActiveNoteId(prev => {
          if (prev && data.some(n => n.id === prev)) return prev
          return data.length > 0 ? data[0].id : null
        })
      }
      if (!cancelled) setLoading(false)
    }

    load()

    return () => { cancelled = true }
  }, [user])

  // Flush any pending save before switching notes
  const switchNote = useCallback((id: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null

      // Immediately save the current note's content
      const currentNote = notes.find(n => n.id === activeNoteIdRef.current)
      if (currentNote) {
        supabase
          .from('notes')
          .update({ content: currentNote.content } as Record<string, unknown>)
          .eq('id', currentNote.id)
          .then(() => {
            try { localStorage.removeItem(LOCAL_DRAFT_KEY) } catch { /* */ }
          })
      }
      setSaveStatus('idle')
    }
    setActiveNoteId(id)
  }, [notes])

  const createNote = async (title = 'Untitled', content = '') => {
    if (!user) return null
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title, content } as Record<string, unknown>)
      .select()
      .single<Note>()

    if (!error && data) {
      setNotes(prev => [data, ...prev])
      setActiveNoteId(data.id)
      return data
    }
    return null
  }

  const updateNoteContent = (content: string) => {
    const noteId = activeNoteIdRef.current
    if (!noteId) return

    // Optimistically update local state
    setNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, content, updated_at: new Date().toISOString() } : n
    ))

    // Save draft to localStorage for crash recovery
    try {
      localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({
        noteId,
        content,
        timestamp: Date.now(),
      }))
    } catch {
      // localStorage unavailable
    }

    // Debounce the Supabase save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = window.setTimeout(async () => {
      setSaveStatus('saving')
      const { error } = await supabase
        .from('notes')
        .update({ content } as Record<string, unknown>)
        .eq('id', noteId)

      if (!error) {
        setSaveStatus('saved')
        try { localStorage.removeItem(LOCAL_DRAFT_KEY) } catch { /* */ }
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('idle')
      }
    }, 1000)
  }

  const renameNote = async (id: string, title: string) => {
    const { error } = await supabase
      .from('notes')
      .update({ title } as Record<string, unknown>)
      .eq('id', id)

    if (!error) {
      setNotes(prev => prev.map(n => n.id === id ? { ...n, title } : n))
    }
  }

  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)

    if (!error) {
      const remaining = notes.filter(n => n.id !== id)
      setNotes(remaining)
      if (activeNoteId === id) {
        setActiveNoteId(remaining.length > 0 ? remaining[0].id : null)
      }
    }
  }

  return {
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
  }
}
