export const addressFields = [
  ['line1', 'Address line 1', 160, 'address-line1'],
  ['line2', 'Address line 2', 160, 'address-line2'],
  ['city', 'City', 80, 'address-level2'],
  ['region', 'State / province', 80, 'address-level1'],
  ['postalCode', 'Postal code', 20, 'postal-code'],
  ['country', 'Country', 80, 'country-name'],
]

export function personalDraft(user) {
  return {
    displayName: user.displayName ?? '', bio: user.bio ?? '',
    address: Object.fromEntries(addressFields.map(([key]) => [key, user.address?.[key] ?? ''])),
  }
}

export function professionalDraft(profile) {
  return {
    headline: profile.headline ?? '', skills: (profile.skills ?? []).join(', '),
    services: (profile.services ?? []).join('\n'), githubUrl: profile.githubUrl ?? '',
    linkedinUrl: profile.linkedinUrl ?? '', portfolioUrl: profile.portfolioUrl ?? '',
    publicCity: profile.publicLocation?.city ?? '', publicCountry: profile.publicLocation?.country ?? '',
    visibility: profile.visibility ?? 'private',
  }
}

function cleanList(value, separator) {
  return [...new Set(value.split(separator).map((part) => part.trim()).filter(Boolean))]
}

export function validatePersonal(draft) {
  const errors = {}
  const displayName = draft.displayName.trim()
  if (displayName.length < 2 || displayName.length > 80) errors.displayName = 'Use 2–80 characters for your name.'
  if (draft.bio.trim().length > 2000) errors.bio = 'Keep your bio within 2,000 characters.'
  for (const [key, label, limit] of addressFields) {
    if (draft.address[key].trim().length > limit) errors[`address.${key}`] = `${label} is too long.`
  }
  return { errors, input: { displayName, bio: draft.bio.trim(), address: Object.fromEntries(Object.entries(draft.address).map(([key, value]) => [key, value.trim()])) } }
}

export function validateProfessional(draft, emailVerified) {
  const errors = {}
  const skills = cleanList(draft.skills, ',')
  const services = cleanList(draft.services, '\n')
  if (draft.headline.trim().length > 120) errors.headline = 'Keep your headline within 120 characters.'
  if (skills.length > 20 || skills.some((value) => value.length > 50)) errors.skills = 'Add up to 20 skills, with at most 50 characters each.'
  if (services.length > 10 || services.some((value) => value.length > 160)) errors.services = 'Add up to 10 services, with at most 160 characters each.'
  for (const [key, domain] of [['githubUrl', 'github.com'], ['linkedinUrl', 'linkedin.com'], ['portfolioUrl', null]]) {
    const value = draft[key].trim()
    if (!value) continue
    try {
      const url = new URL(value)
      if (value.length > 2048 || url.protocol !== 'https:' || url.username || url.password || (domain && url.hostname !== domain && !url.hostname.endsWith(`.${domain}`))) throw new Error()
    } catch { errors[key] = domain ? `Use an HTTPS link on ${domain}.` : 'Enter a complete HTTPS website link.' }
  }
  if (draft.publicCity.trim().length > 80) errors.publicCity = 'Keep the city within 80 characters.'
  if (draft.publicCountry.trim().length > 80) errors.publicCountry = 'Keep the country within 80 characters.'
  if (!['private', 'published'].includes(draft.visibility) || (draft.visibility === 'published' && !emailVerified)) errors.visibility = 'Verify your email before publishing your profile.'
  return {
    errors,
    input: {
      headline: draft.headline.trim(), skills, services,
      githubUrl: draft.githubUrl.trim(), linkedinUrl: draft.linkedinUrl.trim(), portfolioUrl: draft.portfolioUrl.trim(),
      publicLocation: { city: draft.publicCity.trim(), country: draft.publicCountry.trim() }, visibility: draft.visibility,
    },
  }
}

export function validatePassword(draft) {
  const errors = {}
  if (!draft.currentPassword || draft.currentPassword.length > 128) errors.currentPassword = 'Enter your current password.'
  if (draft.newPassword.length < 15 || draft.newPassword.length > 128) errors.newPassword = 'Use 15–128 characters for the new password.'
  if (draft.newPassword === draft.currentPassword) errors.newPassword = 'Choose a password different from the current one.'
  if (draft.confirmation !== draft.newPassword) errors.confirmation = 'Passwords do not match.'
  return { errors, input: { currentPassword: draft.currentPassword, newPassword: draft.newPassword } }
}
