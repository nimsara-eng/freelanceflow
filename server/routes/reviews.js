import {addApprovals} from './approvals.js'
import {deliveryLocked,currentConnection} from '../utils/approvals.js'
import { ownedProject, liveProjects } from '../utils/workspace.js'
import {notify} from '../services/notifications.js'
import { Router } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import { rateLimit } from 'express-rate-limit'
import Project from '../models/Project.js'
import { requireAuth, requireFreelancer } from '../middleware/requireAuth.js'
import { record, text } from '../utils/authValidation.js'
import { httpError } from '../utils/httpError.js'
import { MAX_DESIGNS, MAX_COMMENTS, MAX_REPLIES, parseReview, reviewDto, isMessageAuthor } from '../utils/prototypes.js'
import { maximumFileSize } from '../services/profileMedia.js'
import { prepareDesign } from '../services/prototypeImages.js'

const router = Router()
router.use(requireAuth)
const writes = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, keyGenerator: (req) => String(req.user._id), standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many review changes. Please wait and try again.' } })
const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: maximumFileSize, files: 1, fields: 2, fieldSize: 160, parts: 4 } }).single('file')
// ponytail: two image conversions per process; use a shared worker queue if deployed across multiple processes.
let activeUploads = 0
const metadataFields = 'status tasks.status approvals deliveries clientDisplayName owner name clientUser clientAcceptedAt collaborationStatus __v designVersions._id designVersions.title designVersions.width designVersions.height designVersions.sharedWith designVersions.createdAt designVersions.comments'
const missing = () => httpError(404, 'Design review not found or access has been removed.')
const access = (req) => ({ _id: req.params.id, ...liveProjects, $or: [{ owner: req.user._id }, { clientUser: req.user._id, collaborationStatus: 'accepted' }] })
for (const parameter of ['id', 'designId', 'commentId', 'replyId', 'approvalId', 'deliveryId']) router.param(parameter, (_req, _res, next, value) => {
  if (!mongoose.isObjectIdOrHexString(value)) throw missing()
  next()
})
async function context(req, ownerOnly = false, fields = metadataFields) {
  const filter = ownerOnly ? ownedProject(req.user._id, req.params.id) : access(req)
  const project = await Project.findOne(filter).select(fields).lean()
  if (!project) throw missing()
  const owner = String(project.owner) === String(req.user._id)
  const design = req.params.designId ? project.designVersions?.find((item) => String(item._id) === req.params.designId) : null
  if (req.params.designId && (!design || (!owner && String(design.sharedWith) !== String(req.user._id)))) throw missing()
  return { project, owner, design }
}
async function respond(req, res, status = 200) {
  const { project } = await context(req)
  res.status(status).json({ success: true, review: reviewDto(project, req.user._id) })
}
function fresh(req, project) {
  if (project.__v !== req.body.version) throw httpError(409, 'The project changed. Reload review before trying again; your draft has been kept.')
}
async function update(req, project, owner, mutation, arrayFilters) {
  const filter = { ...(owner ? ownedProject(req.user._id, project._id) : { _id: project._id, clientUser: req.user._id, collaborationStatus: 'accepted' }), __v: req.body.version }
  if (req.params.designId) filter.designVersions = { $elemMatch: { _id: req.params.designId, ...(!owner ? { sharedWith: req.user._id } : {}) } }
  const result = await Project.updateOne(filter, { ...mutation, $inc: { __v: 1 } }, { runValidators: true, ...(arrayFilters ? { arrayFilters } : {}) })
  if (!result.matchedCount) throw httpError(409, 'The project changed or access was removed. Reload review before trying again.')
}
const author = (req, owner) => ({ authorUser: req.user._id, authorName: req.user.displayName, authorRole: owner ? 'freelancer' : 'client', createdAt: new Date() })

addApprovals(router,writes,{context,update,respond,fresh})

router.get('/:id', async (req, res) => respond(req, res))
router.get('/:id/summary', async (req, res) => {
  const { project, owner } = await context(req, false, 'owner clientUser collaborationStatus designVersions._id designVersions.sharedWith')
  const sharedCount = (project.designVersions ?? []).filter((design) => project.collaborationStatus === 'accepted' && project.clientUser && String(design.sharedWith) === String(project.clientUser)).length
  res.json({ success: true, summary: { count: owner ? (project.designVersions?.length ?? 0) : sharedCount, sharedCount } })
})
router.get('/:id/designs/:designId/image', async (req, res) => {
  const { owner } = await context(req)
  const filter = { ...access(req), designVersions: { $elemMatch: { _id: req.params.designId, ...(!owner ? { sharedWith: req.user._id } : {}) } } }
  const project = await Project.findOne(filter).select({ designVersions: { $elemMatch: { _id: req.params.designId } } }).lean()
  const data = project?.designVersions?.[0]?.data
  if (!data) throw missing()
  res.type('webp').set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).send(Buffer.isBuffer(data) ? data : Buffer.from(data.buffer ?? data))
})
router.post('/:id/designs', writes, requireFreelancer, async (req, res) => {
  await context(req, true)
  if (activeUploads >= 2) throw httpError(429, 'Image processing is busy. Please try again shortly.')
  activeUploads++
  try {
    await new Promise((resolve, reject) => receive(req, res, (error) => error ? reject(error) : resolve()))
    record(req.body, ['title', 'version'])
    if (!/^(0|[1-9]\d{0,14})$/.test(req.body.version ?? '')) throw httpError(400, 'Reload review before uploading.')
    req.body.version = Number(req.body.version)
    const title = text(req.body.title, 'Design title', 80, 1)
    if (/[\r\n\u0000-\u001f]/.test(title)) throw httpError(400, 'Keep the design title on one line.')
    const { project } = await context(req, true); fresh(req, project)
    if ((project.designVersions?.length ?? 0) >= MAX_DESIGNS) throw httpError(409, 'This project has five design versions. Remove an old version before uploading another.')
    if (req.aborted || !req.file?.buffer?.length) throw httpError(400, 'Choose one image to upload.')
    const image = await prepareDesign(req.file.buffer)
    const result = await Project.updateOne({ ...ownedProject(req.user._id, project._id), __v: req.body.version, [`designVersions.${MAX_DESIGNS - 1}`]: { $exists: false } }, { $push: { designVersions: { _id: new mongoose.Types.ObjectId(), title, ...image, sharedWith: null, comments: [], createdAt: new Date() } }, $inc: { __v: 1 } }, { runValidators: true })
    if (!result.matchedCount) throw httpError(409, 'The project changed during the upload. Reload review before retrying.')
    await respond(req, res, 201)
  } finally { activeUploads-- }
})
router.patch('/:id/designs/:designId/sharing', writes, requireFreelancer, async (req, res) => {
  const { shared } = parseReview(req.body, 'share')
  const { project,design } = await context(req, true); fresh(req, project)
  if(!shared&&deliveryLocked(project,req.params.designId))throw httpError(409,'This version is included in a final delivery and cannot be unshared.')
  if (shared && (project.collaborationStatus !== 'accepted' || !project.clientUser)) throw httpError(409, 'Invite a client and wait for acceptance before sharing a design.')
  await update(req, project, true, { $set: { 'designVersions.$[design].sharedWith': shared ? project.clientUser : null, ...(!shared?{approvals:(project.approvals??[]).map(item=>String(item.designId)===String(design._id)&&item.status==='pending'?{...item,status:'withdrawn',respondedAt:new Date(),respondedByName:req.user.displayName}:item)}:{}) } }, [{ 'design._id': req.params.designId }])
  if(shared)await notify(project.clientUser,`design:${req.params.designId}:${req.body.version}`,`Design shared: ${project.name}`,`/reviews/${project._id}`)
  await respond(req, res)
})
router.delete('/:id/designs/:designId', writes, requireFreelancer, async (req, res) => {
  parseReview(req.body, 'remove')
  const { project } = await context(req, true); fresh(req, project)
  if(deliveryLocked(project,req.params.designId)||(project.approvals??[]).some(item=>String(item.designId)===req.params.designId&&item.status==='pending'&&currentConnection(item,project)))throw httpError(409,'Withdraw the pending request or delivery before removing this version.')
  await update(req, project, true, { $pull: { designVersions: { _id: req.params.designId } } })
  // The selected version no longer exists; return the remaining review explicitly.
  delete req.params.designId
  await respond(req, res)
})
router.post('/:id/designs/:designId/comments', writes, async (req, res) => {
  const fields = parseReview(req.body, 'comment')
  const { project, owner, design } = await context(req); fresh(req, project)
  if (design.comments.length >= MAX_COMMENTS) throw httpError(409, 'This version has 20 feedback threads. Upload a new revision to continue.')
  await update(req, project, owner, { $push: { 'designVersions.$[design].comments': { _id: new mongoose.Types.ObjectId(), ...fields, ...author(req, owner), resolved: false, replies: [] } } }, [{ 'design._id': req.params.designId }])
  if(!owner||String(design.sharedWith)===String(project.clientUser))await notify(owner?project.clientUser:project.owner,`feedback:${project._id}:${req.body.version}`,`New design feedback: ${project.name}`,`/reviews/${project._id}`)
  await respond(req, res, 201)
})
router.post('/:id/designs/:designId/comments/:commentId/replies', writes, async (req, res) => {
  const fields = parseReview(req.body, 'reply')
  const { project, owner, design } = await context(req); fresh(req, project)
  const comment = design.comments.find((item) => String(item._id) === req.params.commentId)
  if (!comment) throw missing()
  if (comment.deletedAt) throw httpError(409, 'This comment has been deleted. Start a new feedback thread instead.')
  if (comment.resolved) throw httpError(409, 'This thread is resolved. Ask the freelancer to reopen it before replying.')
  if (comment.replies.length >= MAX_REPLIES) throw httpError(409, 'This thread has reached its limit of 10 replies.')
  await update(req, project, owner, { $push: { 'designVersions.$[design].comments.$[comment].replies': { _id: new mongoose.Types.ObjectId(), ...fields, ...author(req, owner) } } }, [{ 'design._id': req.params.designId }, { 'comment._id': req.params.commentId }])
  if(!owner||String(design.sharedWith)===String(project.clientUser))await notify(owner?project.clientUser:project.owner,`reply:${project._id}:${req.body.version}`,`New feedback reply: ${project.name}`,`/reviews/${project._id}`)
  await respond(req, res, 201)
})
router.patch('/:id/designs/:designId/comments/:commentId', writes, requireFreelancer, async (req, res) => {
  const fields = parseReview(req.body, 'resolve')
  const { project, design } = await context(req, true); fresh(req, project)
  if (!design.comments.some((item) => String(item._id) === req.params.commentId)) throw missing()
  if (design.comments.find((item) => String(item._id) === req.params.commentId).deletedAt) throw httpError(409, 'A deleted comment cannot be resolved or reopened.')
  await update(req, project, true, { $set: { 'designVersions.$[design].comments.$[comment].resolved': fields.resolved } }, [{ 'design._id': req.params.designId }, { 'comment._id': req.params.commentId }])
  await respond(req, res)
})

async function changeOwnMessage(req, res, remove = false) {
  const fields = parseReview(req.body, remove ? 'remove' : 'edit')
  const { project, owner, design } = await context(req)
  const comment = design.comments.find((item) => String(item._id) === req.params.commentId)
  const item = req.params.replyId ? comment?.replies.find((reply) => String(reply._id) === req.params.replyId) : comment
  if (!item) throw missing()
  if (!isMessageAuthor(item, project, req.user._id)) throw httpError(403, 'You can only edit or delete your own comments and replies.')
  if (item.deletedAt) throw httpError(409, 'This comment has already been deleted.')
  fresh(req, project)
  const base = 'designVersions.$[design].comments'
  const target = `${base}.$[comment]${req.params.replyId ? '.replies.$[reply]' : ''}`
  const filters = [{ 'design._id': req.params.designId }, { 'comment._id': req.params.commentId }]
  if (req.params.replyId) filters.push({ 'reply._id': req.params.replyId })
  let mutation
  if (!remove) {
    mutation = { $set: { [`${target}.text`]: fields.text, [`${target}.authorUser`]: req.user._id, [`${target}.editedAt`]: new Date(), ...(!req.params.replyId ? { [`${target}.resolved`]: false } : {}) } }
  } else if (req.params.replyId) {
    mutation = { $pull: { [`${base}.$[comment].replies`]: { _id: req.params.replyId } } }
    filters.pop()
  } else if (comment.replies.length) {
    // Remove only the author's words and pin; preserve everyone else's replies.
    mutation = { $set: { [`${target}.text`]: '[Comment deleted]', [`${target}.deletedAt`]: new Date(), [`${target}.resolved`]: true } }
  } else {
    mutation = { $pull: { [base]: { _id: req.params.commentId } } }
    filters.pop()
  }
  await update(req, project, owner, mutation, filters)
  await respond(req, res)
}
router.patch('/:id/designs/:designId/comments/:commentId/text', writes, async (req, res) => changeOwnMessage(req, res))
router.delete('/:id/designs/:designId/comments/:commentId', writes, async (req, res) => changeOwnMessage(req, res, true))
router.patch('/:id/designs/:designId/comments/:commentId/replies/:replyId', writes, async (req, res) => changeOwnMessage(req, res))
router.delete('/:id/designs/:designId/comments/:commentId/replies/:replyId', writes, async (req, res) => changeOwnMessage(req, res, true))

export default router
