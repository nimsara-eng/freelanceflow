import { useId, useState } from 'react'
import { FolderOpen, Plus } from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/ui/Skeleton'

export default function UiPreview() {
  const formId = useId()

  const [modalOpen, setModalOpen] = useState(false)
  const [closeOnBackdrop, setCloseOnBackdrop] = useState(true)
  const [projectName, setProjectName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function openModal() {
    setProjectName('')
    setError('')
    setModalOpen(true)
  }

  function handleSubmit(event) {
    event.preventDefault()

    const name = projectName.trim()

    if (!name) {
      setError('Enter a project name.')
      return
    }

    setMessage(`Preview accepted “${name}”. No data was saved.`)
    setModalOpen(false)
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          UI component preview
        </h1>

        <p className="mt-2 text-sm text-muted">
          Development preview for appearance and interaction checks.
        </p>
      </div>

      <p
        role="status"
        className="min-h-6 text-sm font-medium text-brand"
      >
        {message}
      </p>

      <Card>
        <h2 className="mb-5 text-lg font-semibold">
          Buttons
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setMessage('Primary button clicked.')}>
            Primary
          </Button>

          <Button
            variant="secondary"
            onClick={() => setMessage('Secondary button clicked.')}
          >
            Secondary
          </Button>

          <Button
            variant="ghost"
            onClick={() => setMessage('Ghost button clicked.')}
          >
            Ghost
          </Button>

          <Button
            variant="danger"
            onClick={() => setMessage('Danger appearance checked.')}
          >
            Danger
          </Button>

          <Button disabled>
            Disabled
          </Button>

          <Button loading loadingText="Loading appearance">
            Loading
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-5 text-lg font-semibold">
          Status badges
        </h2>

        <div className="flex flex-wrap gap-3">
          <Badge dot>Draft</Badge>
          <Badge tone="brand" dot>In progress</Badge>
          <Badge tone="success" dot>Completed</Badge>
          <Badge tone="warning" dot>Awaiting review</Badge>
          <Badge tone="danger" dot>Overdue</Badge>
        </div>
      </Card>

      <Card>
        <h2 className="mb-5 text-lg font-semibold">
          Inputs
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <Input
            label="Sample project name"
            placeholder="Website redesign"
            hint="A normal text input."
          />

          <Input
            label="Sample email"
            type="email"
            placeholder="client@example.com"
          />

          <Input
            label="Sample password"
            type="password"
            autoComplete="new-password"
            hint="Use a dummy value to check show/hide."
          />

          <Input
            label="Disabled field"
            value="Not editable"
            disabled
          />

          <Input
            label="Error appearance"
            placeholder="Project name"
            error="Example validation message."
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-5 text-lg font-semibold">
            Loading appearance
          </h2>

          <div role="status" className="space-y-4">
            <span className="sr-only">
              Loading sample content.
            </span>

            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-28 w-full" />
          </div>
        </Card>

        <Card padding="none">
          <EmptyState
            icon={<FolderOpen size={24} />}
            title="No sample projects yet"
            description="Open the sample form to check the modal and input validation."
            action={
              <Button onClick={openModal}>
                <Plus size={17} aria-hidden="true" />
                Open sample form
              </Button>
            }
          />
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          Modal behaviour
        </h2>

        <label className="mb-5 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={closeOnBackdrop}
            onChange={(event) => setCloseOnBackdrop(event.target.checked)}
            className="size-4 accent-brand"
          />

          Close when the backdrop is clicked
        </label>

        <Button onClick={openModal}>
          Open modal
        </Button>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sample project"
        description="This form only checks the UI components."
        closeOnBackdrop={closeOnBackdrop}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>

            <Button type="submit" form={formId}>
              Check form
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} noValidate>
          <Input
            label="Project name"
            value={projectName}
            onChange={(event) => {
              setProjectName(event.target.value)
              setError('')
            }}
            error={error}
            placeholder="Website redesign"
            required
          />
        </form>
      </Modal>
    </section>
  )
}