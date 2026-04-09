import Task from '../models/Task.js';
import User from '../models/User.js';

const VALID_ROLES = ['RM', 'Telecaller', 'Field_staff'];

export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, role, priority, dueDate, googleSheetLink } = req.body;

    if (!title || !assignedTo || !role) {
      return res.status(400).json({ success: false, message: 'Title, assignedTo, and role are required' });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    const assignee = await User.findOne({ username: assignedTo });
    if (!assignee || assignee.role !== role) {
      return res.status(400).json({ success: false, message: 'Assigned user not found or role mismatch' });
    }

    const task = new Task({
      title,
      description,
      assignedTo: assignee._id,
      role,
      priority: priority || 'Medium',
      status: 'Pending',
      dueDate: dueDate ? new Date(dueDate) : null,
      googleSheetLink,
      createdBy: req.userId
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'username full_name role email')
      .populate('createdBy', 'username full_name role email');

    return res.status(201).json({ success: true, message: 'Task created successfully', data: populatedTask });
  } catch (error) {
    console.error('createTask error', error);
    return res.status(500).json({ success: false, message: 'Failed to create task', error: error.message });
  }
};

export const getTasks = async (req, res) => {
  try {
    let query = {};

    if (req.userRole !== 'Admin') {
      query.role = req.userRole;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'username full_name role email')
      .populate('createdBy', 'username full_name role email')
      .sort({ dueDate: 1, createdAt: -1 });

    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    console.error('getTasks error', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch tasks', error: error.message });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('assignedTo', 'username full_name role email')
      .populate('createdBy', 'username full_name role email');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (req.userRole !== 'Admin' && String(task.assignedTo._id) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error('getTaskById error', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch task', error: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assignedTo, role, priority, status, dueDate, googleSheetLink } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (req.userRole !== 'Admin' && String(task.assignedTo) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Admin can edit all fields.
    if (req.userRole === 'Admin') {
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (assignedTo && role) {
        const assignee = await User.findById(assignedTo);
        if (!assignee || assignee.role !== role) {
          return res.status(400).json({ success: false, message: 'Assigned user not found or role mismatch' });
        }
        task.assignedTo = assignedTo;
        task.role = role;
      }
      if (priority) task.priority = priority;
      if (status) task.status = status;
      if (dueDate) task.dueDate = new Date(dueDate);
      if (googleSheetLink !== undefined) task.googleSheetLink = googleSheetLink;

      await task.save();
    } else {
      // non-admin can only update status and add remarks via dedicated endpoint.
      if (status) task.status = status;
      if (!status) {
        return res.status(400).json({ success: false, message: 'Only status updates are allowed' });
      }
      await task.save();
    }

    const updated = await Task.findById(id)
      .populate('assignedTo', 'username full_name role email')
      .populate('createdBy', 'username full_name role email');

    return res.status(200).json({ success: true, message: 'Task updated successfully', data: updated });
  } catch (error) {
    console.error('updateTask error', error);
    return res.status(500).json({ success: false, message: 'Failed to update task', error: error.message });
  }
};

export const addTaskRemark = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Remark text is required' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (req.userRole !== 'Admin' && String(task.assignedTo) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    task.remarks.push({ text, createdBy: req.userId });
    await task.save();

    const updated = await Task.findById(id)
      .populate('assignedTo', 'username full_name role email')
      .populate('createdBy', 'username full_name role email');

    return res.status(200).json({ success: true, message: 'Remark added', data: updated });
  } catch (error) {
    console.error('addTaskRemark error', error);
    return res.status(500).json({ success: false, message: 'Failed to add remark', error: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (req.userRole !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only admins can delete tasks' });
    }

    await Task.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('deleteTask error', error);
    return res.status(500).json({ success: false, message: 'Failed to delete task', error: error.message });
  }
};
