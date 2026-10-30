import { ownedProject } from '../utils/workspace.js'
import Project from '../models/Project.js'
import { parseDelete, projectDto } from '../utils/projectValidation.js'
import { newInvitation } from '../utils/invitations.js'
import { httpError } from '../utils/httpError.js'

async function explainMissing(req) {
  const exists = await Project.exists({ ...ownedProject(req.user._id, req.params.id) })
  throw httpError(exists ? 409 : 404, exists ? 'Project or client access changed. Close the dialog and refresh before trying again.' : 'Project not found.')
}
export function addProjectInvitations(router, writes) {
  router.post('/:id/invitation', writes, async (req, res) => {
    const version = parseDelete(req.body)
    const invitation = newInvitation()
    const project = await Project.findOneAndUpdate({
      ...ownedProject(req.user._id, req.params.id), __v: version,
      collaborationStatus: { $ne: 'accepted' },
    }, {
      $set: { collaborationStatus: 'pending', invitationHash: invitation.hash,
        invitationExpiresAt: invitation.expiresAt, clientUser: null,
        clientDisplayName: '', clientAcceptedAt: null },
      $inc: { __v: 1 },
    }, { returnDocument: 'after', runValidators: true })
    if (!project) return explainMissing(req)
    res.status(201).json({ success: true, project: projectDto(project, true), token: invitation.token })
  })
  router.delete('/:id/invitation', writes, async (req, res) => {
    const version = parseDelete(req.body)
    const project = await Project.findOneAndUpdate({ ...ownedProject(req.user._id, req.params.id), __v: version }, {
      $set: { collaborationStatus: 'none', invitationExpiresAt: null, clientUser: null, clientDisplayName: '', clientAcceptedAt: null },
      $unset: { invitationHash: '' }, $inc: { __v: 1 },
    }, { returnDocument: 'after', runValidators: true })
    if (!project) return explainMissing(req)
    res.json({ success: true, project: projectDto(project, true) })
  })
}
