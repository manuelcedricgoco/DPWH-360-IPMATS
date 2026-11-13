import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validateBody, agencySchema } from '../middleware/validate.js';
import { rolesFor } from '../config/permissions.js';
import {
  listAgencies, getAgency, createAgency, updateAgency, deleteAgency,
} from '../controllers/agencies.controller.js';

const router = Router();

router.use(requireAuth());

// Any approved user can read agencies (needed for the project form).
router.get('/', listAgencies);
router.get('/:id', getAgency);

router.post('/', requireRole(rolesFor('implementing_agencies', 'write')), validateBody(agencySchema), createAgency);
router.patch('/:id', requireRole(rolesFor('implementing_agencies', 'write')),
  validateBody(agencySchema, { partial: true }), updateAgency);
router.delete('/:id', requireRole(rolesFor('implementing_agencies', 'delete')), deleteAgency);

export default router;
