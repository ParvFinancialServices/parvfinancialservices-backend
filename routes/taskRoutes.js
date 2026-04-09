import express from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  addTaskRemark,
  deleteTask,
} from '../controllers/taskController.js';
import { checkAuthentication, checkAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', checkAuthentication, checkAdmin, createTask);
router.get('/', checkAuthentication, getTasks);
router.get('/:id', checkAuthentication, getTaskById);
router.patch('/:id', checkAuthentication, updateTask);
router.patch('/:id/remarks', checkAuthentication, addTaskRemark);
router.delete('/:id', checkAuthentication, checkAdmin, deleteTask);

export default router;
