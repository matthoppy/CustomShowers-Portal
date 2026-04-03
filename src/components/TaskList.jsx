import React, { useState } from 'react';
import { CheckCircle2, Circle, Trash2, Plus, AlertCircle } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';

const TaskList = ({ tasks = [], onCreateTask, onCompleteTask, onDeleteTask, loading = false }) => {
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
  });
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await onCreateTask(newTask);
      setNewTask({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
      });
      setShowNewTask(false);
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleCompleteTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await onCompleteTask(taskId, newStatus);
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteModal) return;
    try {
      setDeleting(true);
      await onDeleteTask(deleteModal.id);
      setDeleteModal(null);
    } catch (err) {
      console.error('Error deleting task:', err);
    } finally {
      setDeleting(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tasks</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowNewTask(true)}
          icon={<Plus className="w-4 h-4" />}
          disabled={loading}
        >
          New Task
        </Button>
      </div>

      {pendingTasks.length === 0 && completedTasks.length === 0 && !showNewTask && (
        <div className="text-center py-8 text-gray-500">
          <p>No tasks yet</p>
        </div>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Pending</h4>
          <div className="space-y-2">
            {pendingTasks.map(task => (
              <div
                key={task.id}
                className={`border rounded-lg p-3 flex items-start gap-3 ${
                  isOverdue(task.due_date) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={() => handleCompleteTask(task.id, task.status)}
                  className="mt-1 text-gray-400 hover:text-green-600 transition-colors flex-shrink-0"
                  disabled={loading}
                >
                  <Circle className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {task.due_date && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          isOverdue(task.due_date)
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {new Date(task.due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded capitalize ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteModal(task)}
                  className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">Completed</h4>
          <div className="space-y-2">
            {completedTasks.map(task => (
              <div key={task.id} className="border rounded-lg p-3 flex items-start gap-3 bg-gray-50 border-gray-200">
                <button
                  onClick={() => handleCompleteTask(task.id, task.status)}
                  className="mt-1 text-green-600 hover:text-gray-400 transition-colors flex-shrink-0"
                  disabled={loading}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-through text-gray-600">{task.title}</p>
                </div>
                <button
                  onClick={() => setDeleteModal(task)}
                  className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Task Form */}
      {showNewTask && (
        <form onSubmit={handleAddTask} className="border rounded-lg p-4 bg-blue-50 border-blue-200 space-y-3">
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              Create Task
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowNewTask(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Task?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{deleteModal?.title}</p>
              <p className="text-sm text-gray-600 mt-1">This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteModal(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteTask}
              loading={deleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TaskList;
