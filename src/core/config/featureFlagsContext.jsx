/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_SCHOOLS_KEY = 'veritus_admin_schools'
const STORAGE_CURRENT_SCHOOL_KEY = 'veritus_current_school_id'

const FeatureFlagsContext = createContext(null)

function loadSchools() {
  try {
    const raw = localStorage.getItem(STORAGE_SCHOOLS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function getCurrentSchoolId() {
  return localStorage.getItem(STORAGE_CURRENT_SCHOOL_KEY) || null
}

export function FeatureFlagsProvider({ children }) {
  const [schools, setSchools] = useState(() => loadSchools())
  const [currentSchoolId, setCurrentSchoolId] = useState(() => getCurrentSchoolId())

  // Sync from localStorage when it changes (admin page writes there)
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === STORAGE_SCHOOLS_KEY) {
        setSchools(loadSchools())
      }
      if (e.key === STORAGE_CURRENT_SCHOOL_KEY) {
        setCurrentSchoolId(getCurrentSchoolId())
      }
    }
    window.addEventListener('storage', handleStorage)

    // Also poll periodically since same-tab localStorage writes don't fire the event
    const interval = setInterval(() => {
      setSchools(loadSchools())
      setCurrentSchoolId(getCurrentSchoolId())
    }, 2000)

    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  const currentSchool = useMemo(() => {
    if (!currentSchoolId) {
      // Default to first active school
      return schools.find((s) => s.active) || schools[0] || null
    }
    return schools.find((s) => s.id === currentSchoolId) || null
  }, [schools, currentSchoolId])

  const features = useMemo(() => {
    if (!currentSchool || !currentSchool.features) {
      // All enabled by default if no school config
      return {}
    }
    return currentSchool.features
  }, [currentSchool])

  const value = useMemo(
    () => ({
      currentSchool,
      features,
      isModuleEnabled: (moduleKey) => {
        // If no school config exists, all modules are enabled
        if (!currentSchool || !currentSchool.features) return true
        return currentSchool.features[moduleKey] !== false
      },
      schoolName: currentSchool?.name || 'VeritusOS',
    }),
    [currentSchool, features],
  )

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext)
  if (!context) {
    throw new Error('useFeatureFlags deve ser usado dentro de FeatureFlagsProvider.')
  }
  return context
}
