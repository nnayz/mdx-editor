import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Plus, Trash2, FileText, Search, Clock, ArrowDownAZ,
  Camera, LogOut, ArrowLeft, X, Copy as CopyIcon,
  CircleCheck, CircleX,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Note } from '@/lib/database.types'

type IslandView = 'idle' | 'notes' | 'profile'
type SortMode = 'recent' | 'alpha'

export interface IslandNotification {
  message: string
  type: 'success' | 'error'
  key: number
  action?: { label: string; onClick: () => void }
}

interface NotesIslandProps {
  notes: Note[]
  activeNoteId: string | null
  saveStatus: 'saved' | 'saving' | 'idle'
  wordCount: number
  charCount: number
  readingTime: number
  notification: IslandNotification | null
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onDeleteNote: (id: string) => void
  onRenameNote: (id: string, title: string) => void
  onDuplicateNote: (id: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

const BOUNCE_MAP: Record<string, number> = {
  'idle-notes': 0.4,
  'notes-idle': 0.4,
  'idle-profile': 0.35,
  'profile-idle': 0.35,
  'notes-profile': 0.3,
  'profile-notes': 0.3,
}

export function NotesIsland({
  notes,
  activeNoteId,
  saveStatus,
  wordCount,
  charCount,
  readingTime,
  notification,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onRenameNote,
  onDuplicateNote,
}: NotesIslandProps) {
  const { user, updateProfile, signOut } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const [view, setView] = useState<IslandView>('idle')
  const [bounce, setBounce] = useState(0.4)
  const [hovered, setHovered] = useState(false)

  // Notes state
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // Profile state
  const [profileName, setProfileName] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Idle title editing state
  const [editingTitle, setEditingTitle] = useState(false)
  const [idleTitleValue, setIdleTitleValue] = useState('')

  // Notification state
  const [activeNotif, setActiveNotif] = useState<{
    message: string; type: string; action?: { label: string; onClick: () => void }
  } | null>(null)
  const [prevNotifKey, setPrevNotifKey] = useState(0)

  // Refs
  const islandRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const idleTitleInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeNote = notes.find(n => n.id === activeNoteId)
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const displayName = (user?.user_metadata?.full_name as string | undefined)
    || (user?.user_metadata?.user_name as string | undefined)
    || user?.email
    || ''
  const initial = displayName.charAt(0).toUpperCase()

  const filteredNotes = useMemo(() => {
    let result = notes
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(n => n.title.toLowerCase().includes(q))
    }
    if (sortMode === 'alpha') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    }
    return result
  }, [notes, search, sortMode])

  const changeView = useCallback((newView: IslandView) => {
    setView(prev => {
      const key = `${prev}-${newView}`
      setBounce(BOUNCE_MAP[key] ?? 0.4)
      if (prev === 'notes') {
        setSearch('')
        setEditingId(null)
      }
      if (prev === 'idle') {
        setEditingTitle(false)
      }
      return newView
    })
  }, [])

  // Click outside → collapse
  useEffect(() => {
    if (view === 'idle') return
    const handleClick = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        changeView('idle')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [view, changeView])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        changeView(view === 'idle' ? 'notes' : 'idle')
      }
      if (e.key === 'Escape' && view !== 'idle') {
        changeView('idle')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [view, changeView])

  // Focus search on notes view
  useEffect(() => {
    if (view === 'notes') {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 200)
      return () => clearTimeout(timer)
    }
  }, [view])

  // Focus edit input
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // Focus idle title input
  useEffect(() => {
    if (editingTitle && idleTitleInputRef.current) {
      idleTitleInputRef.current.focus()
      idleTitleInputRef.current.select()
    }
  }, [editingTitle])

  // Handle incoming notifications (render-time sync + effect for timer)
  if (notification && notification.key !== prevNotifKey) {
    setPrevNotifKey(notification.key)
    setActiveNotif({ message: notification.message, type: notification.type, action: notification.action })
  }

  useEffect(() => {
    if (!activeNotif) return
    const timer = setTimeout(() => setActiveNotif(null), 3000)
    return () => clearTimeout(timer)
  }, [activeNotif])

  // --- Idle title handlers ---
  const handleIdleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeNote) {
      setEditingTitle(true)
      setIdleTitleValue(activeNote.title)
    }
  }

  const commitIdleTitle = () => {
    if (activeNote && idleTitleValue.trim()) {
      onRenameNote(activeNote.id, idleTitleValue.trim())
    }
    setEditingTitle(false)
  }

  // --- Note handlers ---
  const handleSelectNote = useCallback((id: string) => {
    onSelectNote(id)
    changeView('idle')
  }, [onSelectNote, changeView])

  const handleCreateNote = () => {
    onCreateNote()
    changeView('idle')
  }

  const startRename = (note: Note) => {
    setEditingId(note.id)
    setEditTitle(note.title)
  }

  const commitRename = () => {
    if (editingId && editTitle.trim()) {
      onRenameNote(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onDeleteNote(id)
  }

  // --- Profile handlers ---
  const openProfile = () => {
    setProfileName((user?.user_metadata?.full_name as string) || '')
    setProfileAvatarUrl((user?.user_metadata?.avatar_url as string) || '')
    setProfileError(null)
    changeView('profile')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    setProfileError(null)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) {
      setProfileError(uploadError.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`
    setProfileAvatarUrl(newUrl)
    setUploading(false)

    // Auto-save avatar to profile immediately
    const { error: saveError } = await updateProfile({ avatar_url: newUrl })
    if (saveError) {
      setProfileError(saveError.message)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setProfileError(null)
    const { error } = await updateProfile({
      full_name: profileName.trim() || undefined,
      avatar_url: profileAvatarUrl || undefined,
    })
    if (error) {
      setProfileError(error.message)
    } else {
      changeView('idle')
    }
    setSaving(false)
  }

  const handleSignOut = () => {
    changeView('idle')
    signOut()
  }

  const formatWordCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return String(count)
  }

  const formatCharCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return String(count)
  }

  const profileInitial = (profileName || user?.email || '?').charAt(0).toUpperCase()

  // Spring configs (smoothui DynamicIsland pattern)
  const springTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, bounce, duration: 0.35 }

  const contentTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, bounce }

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20" ref={islandRef}>
      <motion.div
        layout
        transition={springTransition}
        className="bg-black overflow-hidden min-w-[100px]"
        style={{ borderRadius: 32 }}
        animate={{
          scale: hovered && view === 'idle' ? 1.04 : 1,
          boxShadow: hovered && view === 'idle'
            ? '0 8px 40px rgba(0,0,0,0.5), 0 0 30px rgba(255,255,255,0.03)'
            : view !== 'idle'
              ? '0 16px 64px rgba(0,0,0,0.6)'
              : '0 4px 24px rgba(0,0,0,0.4)',
        }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
      >
        <motion.div
          key={view}
          initial={
            shouldReduceMotion
              ? { opacity: 1 }
              : { scale: 0.9, opacity: 0, filter: 'blur(5px)' }
          }
          animate={
            shouldReduceMotion
              ? { opacity: 1 }
              : {
                  scale: 1,
                  opacity: 1,
                  filter: 'blur(0px)',
                  transition: { delay: 0.05 },
                }
          }
          transition={contentTransition}
        >
          {/* ── IDLE VIEW ── */}
          {view === 'idle' && (
            <div
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none"
              onClick={() => !activeNotif && changeView('notes')}
            >
              {activeNotif ? (
                /* ── NOTIFICATION CONTENT ── */
                <motion.div
                  key="notif"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 flex-1"
                >
                  {activeNotif.type === 'success' ? (
                    <CircleCheck className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  ) : (
                    <CircleX className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  )}
                  <span className="text-[12px] text-white/80 font-medium truncate">
                    {activeNotif.message}
                  </span>
                  {activeNotif.action && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        activeNotif.action!.onClick()
                        setActiveNotif(null)
                      }}
                      className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 shrink-0 px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.1] transition-colors duration-150"
                    >
                      {activeNotif.action.label}
                    </button>
                  )}
                </motion.div>
              ) : (
                /* ── NORMAL IDLE CONTENT ── */
                <>
                  {/* Avatar → profile */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openProfile()
                    }}
                    className="shrink-0"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10 hover:ring-white/30 transition-all duration-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-white/10 text-white/70 flex items-center justify-center text-[10px] font-medium hover:bg-white/15 transition-all duration-200">
                        {initial}
                      </div>
                    )}
                  </button>

                  {/* Title + save status */}
                  <div className="flex items-center gap-2 min-w-0">
                    {editingTitle ? (
                      <input
                        ref={idleTitleInputRef}
                        value={idleTitleValue}
                        onChange={(e) => setIdleTitleValue(e.target.value)}
                        onBlur={commitIdleTitle}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitIdleTitle()
                          if (e.key === 'Escape') setEditingTitle(false)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[12px] text-white font-medium bg-transparent outline-none border-b border-white/20 max-w-[160px]"
                      />
                    ) : (
                      <span
                        onClick={handleIdleTitleClick}
                        className="text-[12px] text-white/80 font-medium truncate max-w-[160px] cursor-text hover:text-white transition-colors duration-150"
                      >
                        {activeNote?.title || 'No notes'}
                      </span>
                    )}
                    <AnimatePresence mode="wait">
                      {saveStatus === 'saving' && (
                        <motion.div
                          key="saving"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="relative h-1.5 w-1.5 shrink-0"
                        >
                          <span className="absolute inset-0 rounded-full bg-yellow-500/60 animate-ping" />
                          <span className="absolute inset-0 rounded-full bg-yellow-500/80" />
                        </motion.div>
                      )}
                      {saveStatus === 'saved' && (
                        <motion.div
                          key="saved"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="h-1.5 w-1.5 rounded-full bg-green-500/80 shrink-0"
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Stats: reading time + word count + char count + note count */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {wordCount > 0 && (
                      <span className="text-[9px] text-white/20 font-medium tabular-nums">
                        ~{readingTime}m
                      </span>
                    )}
                    {wordCount > 0 && (
                      <span className="text-[9px] text-white/20 font-medium tabular-nums">
                        {formatWordCount(wordCount)}w
                      </span>
                    )}
                    {charCount > 0 && (
                      <span className="text-[9px] text-white/20 font-medium tabular-nums">
                        {formatCharCount(charCount)}c
                      </span>
                    )}
                    <div className="h-2.5 w-px bg-white/[0.06]" />
                    <span className="text-[10px] text-white/30 font-medium tabular-nums">
                      {notes.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── NOTES VIEW ── */}
          {view === 'notes' && (
            <div className="w-[320px]">
              {/* Inline notification strip */}
              <AnimatePresence>
                {activeNotif && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-1.5 flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02]">
                      {activeNotif.type === 'success' ? (
                        <CircleCheck className="h-3 w-3 text-green-400 shrink-0" />
                      ) : (
                        <CircleX className="h-3 w-3 text-red-400 shrink-0" />
                      )}
                      <span className="text-[10px] text-white/60 flex-1 truncate">{activeNotif.message}</span>
                      {activeNotif.action && (
                        <button
                          onClick={() => { activeNotif.action!.onClick(); setActiveNotif(null) }}
                          className="text-[9px] font-semibold text-blue-400 hover:text-blue-300 shrink-0"
                        >
                          {activeNotif.action.label}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Header: close + search + sort + new */}
              <div className="flex items-center gap-1.5 px-2.5 pt-2.5 pb-1.5">
                <button
                  onClick={() => changeView('idle')}
                  className="p-1.5 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors duration-150"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] focus-within:border-white/[0.12] focus-within:bg-white/[0.06] transition-colors duration-200">
                  <Search className="h-3 w-3 text-white/25 shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search notes…"
                    className="flex-1 bg-transparent text-[11px] text-white/80 placeholder:text-white/20 outline-none min-w-0"
                  />
                  {search && (
                    <span className="text-[9px] text-white/25 tabular-nums shrink-0">
                      {filteredNotes.length}
                    </span>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSortMode(m => m === 'recent' ? 'alpha' : 'recent')}
                      className="p-1.5 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.06] transition-colors duration-150"
                    >
                      {sortMode === 'recent' ? <Clock className="h-3 w-3" /> : <ArrowDownAZ className="h-3 w-3" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {sortMode === 'recent' ? 'Sort A-Z' : 'Sort by recent'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleCreateNote}
                      className="p-1.5 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.06] transition-colors duration-150"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    New note
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Separator */}
              <div className="mx-2.5 h-px bg-white/[0.04]" />

              {/* Notes list */}
              <div className="max-h-[280px] overflow-y-auto px-2 py-1.5">
                {filteredNotes.length === 0 && (
                  <div className="text-center py-8 text-[11px] text-white/20">
                    {search ? 'No matching notes' : 'No notes yet'}
                  </div>
                )}
                {filteredNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => editingId !== note.id && handleSelectNote(note.id)}
                    onDoubleClick={() => startRename(note)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg mb-0.5 group flex items-center gap-2.5 transition-all duration-150 hover:translate-x-0.5 ${
                      note.id === activeNoteId
                        ? 'bg-white/[0.08] text-white'
                        : 'text-white/55 hover:bg-white/[0.04] hover:text-white/80'
                    }`}
                  >
                    <FileText className={`h-3.5 w-3.5 shrink-0 ${note.id === activeNoteId ? 'opacity-70' : 'opacity-30'}`} />
                    <div className="flex-1 min-w-0">
                      {editingId === note.id ? (
                        <input
                          ref={editInputRef}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="w-full bg-transparent text-[11px] font-medium outline-none border-b border-white/20 pb-0.5"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span className="text-[11px] font-medium truncate block">{note.title}</span>
                          <span className="text-[9px] text-white/15 block mt-0.5">
                            Created {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[9px] opacity-25 shrink-0 tabular-nums">{timeAgo(note.updated_at)}</span>
                    {editingId !== note.id && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-0.5 text-white/30 hover:text-white/60 shrink-0"
                              onClick={(e) => { e.stopPropagation(); onDuplicateNote(note.id) }}
                            >
                              <CopyIcon className="h-2.5 w-2.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Duplicate</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-0.5 text-white/30 hover:text-red-400 shrink-0"
                              onClick={(e) => handleDelete(e, note.id)}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="px-3 py-1.5 border-t border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/15">
                    <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-white/25 font-mono text-[8px]">⌘K</kbd> toggle
                  </span>
                  <span className="text-[9px] text-white/15">
                    <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-white/25 font-mono text-[8px]">Esc</kbd> close
                  </span>
                  <span className="text-[9px] text-white/15">double-click to rename</span>
                </div>
                {wordCount > 0 && (
                  <span className="text-[9px] text-white/15 tabular-nums">{wordCount.toLocaleString()} words</span>
                )}
              </div>
            </div>
          )}

          {/* ── PROFILE VIEW ── */}
          {view === 'profile' && (
            <div className="w-[280px]">
              {/* Inline notification strip */}
              <AnimatePresence>
                {activeNotif && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-1.5 flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02]">
                      {activeNotif.type === 'success' ? (
                        <CircleCheck className="h-3 w-3 text-green-400 shrink-0" />
                      ) : (
                        <CircleX className="h-3 w-3 text-red-400 shrink-0" />
                      )}
                      <span className="text-[10px] text-white/60 flex-1 truncate">{activeNotif.message}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="px-4 py-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => changeView('idle')}
                  className="p-1 rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors duration-150"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] text-white/50 font-medium">Profile</span>
                <div className="w-6" />
              </div>

              {/* Avatar */}
              <div className="flex justify-center mb-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group"
                  disabled={uploading}
                >
                  {profileAvatarUrl ? (
                    <img
                      src={profileAvatarUrl}
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-white/10 text-white/70 flex items-center justify-center text-xl font-medium ring-2 ring-white/10">
                      {profileInitial}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Fields */}
              <div className="space-y-2 mb-3">
                <div>
                  <label className="text-[9px] text-white/30 mb-0.5 block uppercase tracking-wider">Name</label>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your name"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/30 mb-0.5 block uppercase tracking-wider">Email</label>
                  <div className="w-full bg-white/[0.02] border border-white/[0.04] rounded-lg px-2.5 py-1.5 text-[11px] text-white/30">
                    {user?.email}
                  </div>
                </div>
              </div>

              {profileError && (
                <p className="text-[10px] text-red-400 mb-2">{profileError}</p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-red-400 transition-colors duration-150 px-2 py-1 rounded-lg hover:bg-white/[0.04]"
                >
                  <LogOut className="h-3 w-3" />
                  Sign out
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="text-[10px] font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] px-3 py-1.5 rounded-lg transition-colors duration-150 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
