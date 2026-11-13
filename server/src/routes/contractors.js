import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validateBody, contractorSchema } from '../middleware/validate.js';
import { STAFF, rolesFor } from '../config/permissions.js';
import {
  listContractors, getContractor, createContractor, updateContractor, deleteContractor,
} from '../controllers/contractors.controller.js';

const router = Router();

router.use(requireAuth());

router.get('/', requireRole(STAFF), listContractors);
router.get('/:id', requireRole(STAFF), getContractor);

router.post('/', requireRole(rolesFor('contractors', 'write')), validateBody(contractorSchema), createContractor);
router.patch('/:id', requireRole(rolesFor('contractors', 'write')),
  validateBody(contractorSchema, { partial: true }), updateContractor);
router.delete('/:id', requireRole(rolesFor('contractors', 'delete')), deleteContractor);

export default router;
