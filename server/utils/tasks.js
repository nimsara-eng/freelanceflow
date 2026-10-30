export const MAX_TASKS = 200
export const taskStatuses = ['todo', 'in_progress', 'done']

export function taskProgress(tasks = []) {
  const total = tasks.length
  const completed = tasks.filter((task) => task.status === 'done').length
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length
  return { total, completed, inProgress, todo: total - completed - inProgress, percent: total ? Math.round(completed / total * 100) : 0 }
}

export function taskDto(task) {
  return { id: String(task._id), title: task.title, description: task.description ?? '', dueDate: task.dueDate ?? '', status: task.status, createdAt: task.createdAt, updatedAt: task.updatedAt }
}

export function projectTasks(project, includeTasks = false) {
  const tasks = project.tasks ?? []
  return { progress: taskProgress(tasks), ...(includeTasks ? { tasks: tasks.map(taskDto) } : {}) }
}
