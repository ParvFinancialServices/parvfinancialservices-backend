import express from 'express';
const router = express.Router();
import {
  createJobApplication,
  getJobApplications,
  getJobApplicationById,
  updateJobApplicationStatus,
  deleteJobApplication,
  hardDeleteJobApplication,
  getJobApplicationStats
} from '../controllers/jobApplicationController.js';
import { checkAuthentication, checkAdmin } from '../middleware/auth.js';

// Public route - Submit job application
router.post('/', createJobApplication);

// Protected admin routes
router.get('/', checkAuthentication, checkAdmin, getJobApplications);
router.get('/stats', checkAuthentication, checkAdmin, getJobApplicationStats);
router.get('/:id', checkAuthentication, checkAdmin, getJobApplicationById);
router.patch('/:id/status', checkAuthentication, checkAdmin, updateJobApplicationStatus);
router.delete('/:id', checkAuthentication, checkAdmin, deleteJobApplication);
router.delete('/:id/permanent', checkAuthentication, checkAdmin, hardDeleteJobApplication);

export default router;
