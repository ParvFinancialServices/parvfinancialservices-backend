import express from 'express';
import {
  createLead,
  getLeads,
  getAllLeads,
  updateLead,
  deleteLead,
  updateLeadStatus,
  addLeadRemark
} from '../controllers/leadController.js';

import { checkAuthentication } from '../middleware/auth.js';
const router = express.Router();

// All lead routes require authentication
router.use(checkAuthentication);

router.route('/')
  .post(createLead)
  .get(getLeads);

router.get('/all', getAllLeads);

router.route('/:id')
  .put(updateLead)
  .delete(deleteLead);

router.patch('/:id/status', updateLeadStatus);
router.post('/:id/remarks', addLeadRemark);

export default router;
