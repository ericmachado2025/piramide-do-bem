import { useState, useEffect, useCallback } from 'react'

export interface LocalUser {
  name: string
  email: string
  birthDate: string
  schoolId: string
  classroomGrade: string
  classroomSection: string
  tribeId: string
  tribeEmoji: string
  tribeName: string
  characterTier: number
  characterName: string
  totalPoints: number
  availablePoints: number
  redeemedPoints: number
}

const DEFAULT_USER: LocalUser = {
  name: 'Estudante',
  email: 'estudante@escola.com',
  birthDate: '2012-05-15',
  schoolId: 'school-1',
  classroomGrade: '7º Ano',
  classroomSection: 'B',
  tribeId: 'tribe-1',
  tribeEmoji: '🦁',
  tribeName: 'Leões da Coragem',
  characterTier: 2,
  characterName: 'Guardião',
  totalPoints: 145,
  availablePoints: 95,
  redeemedPoints: 50,
}

const STORAGE_KEY = 'piramide-user'

export function useLocalUser() {
  const [user, setUserState] = useState<LocalUser | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setUserState(JSON.parse(stored))
      } catch {
        setUserState(DEFAULT_USER)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USER))
      }
    } else {
      setUserState(DEFAULT_USER)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USER))
    }
  }, [])

  const setUser = useCallback((updater: LocalUser | ((prev: LocalUser) => LocalUser)) => {
    setUserState((prev) => {
      const current = prev ?? DEFAULT_USER
      const next = typeof updater === 'function' ? updater(current) : updater
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return {
    user,
    setUser,
    isLoggedIn: user !== null,
  }
}
