import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validateBody, userAccessSchema } from '../middleware/validate.js';
import { rolesFor } from '../config/permissions.js';
import { listUsers, setUserAccess } from '../controllers/users.controller.js';

const router = Router();

// Approved, active administrators only.
router.use(requireAuth(), requireRole(rolesFor('profiles', 'read')));

router.get('/', listUsers);
router.patch('/:id/access', requireRole(rolesFor('profiles', 'write')),
  validateBody(userAccessSchema, { partial: true }), setUserAccess);

export default router;
