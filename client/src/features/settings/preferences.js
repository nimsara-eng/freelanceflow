const storageKey = 'freelanceflow:preferences:v1'

export const defaultPreferences = Object.freeze({
  projectSort: 'due-date',
  timeZone: 'Asia/Colombo',
  timeFormat: '12h',
})

function normalizePreferences(value) {
  return {
    projectSort: ['due-date', 'name'].includes(value?.projectSort)
      ? value.projectSort
      : defaultPreferences.projectSort,

    timeZone: ['Asia/Colombo', 'UTC'].includes(value?.timeZone)
      ? value.timeZone
      : defaultPreferences.timeZone,

    timeFormat: ['12h', '24h'].includes(value?.timeFormat)
      ? value.timeFormat
      : defaultPreferences.timeFormat,
  }
}

export function readPreferences() {
  try {
    const stored = localStorage.getItem(storageKey)

    return stored
      ? normalizePreferences(JSON.parse(stored))
      : { ...defaultPreferences }
  } catch {
    return { ...defaultPreferences }
  }
}

export function savePreferences(value) {
  const preferences = normalizePreferences(value)

  localStorage.setItem(storageKey, JSON.stringify(preferences))

  return preferences
}