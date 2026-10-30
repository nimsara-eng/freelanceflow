import Notification from '../models/Notification.js'
export async function notify(recipient, eventKey, title, path) {
  if (!recipient) return
  try {
    await Notification.updateOne(
      { recipient, eventKey },
      { $setOnInsert: { recipient, eventKey, title: title.slice(0, 240), path } },
      { upsert: true, runValidators: true },
    )
  } catch (error) {
    // The primary action has already succeeded; never encourage replaying it when a notification fails.
    if (error.code !== 11000) console.error('Notification could not be saved:', error.name)
  }
}
