import { useProjects } from './useProjects'
import Button from '../../components/ui/Button'
export default function ProjectPicker({ value, name, onChange, disabled = false }) {
  const { data, loading, error, refresh } = useProjects('', '/projects/options')
  const items = data?.projects ?? []
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Project
        <select
          value={value}
          required
          disabled={disabled || loading || Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base sm:text-sm"
        >
          <option value="">
            {loading ? 'Loading projects…' : error ? 'Projects unavailable' : items.length ? 'Choose a project' : 'No projects available'}
          </option>
          {value && !items.some((item) => item.id === value) && (
            <option value={value}>{name ?? 'Selected project'}</option>
          )}
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {loading && (
        <p role="status" className="sr-only">
          Loading projects…
        </p>
      )}
      {error && (
        <div>
          <p role="alert" className="text-sm text-danger">{error}</p>
          <Button variant="ghost" size="sm" disabled={disabled} onClick={refresh}>Retry</Button>
        </div>
      )}
    </div>
  )
}
