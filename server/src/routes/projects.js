import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validateBody, projectSchema } from '../middleware/validate.js';
import { rolesFor } from '../config/permissions.js';
import {
  listProjects, getProject, createProject, updateProject, archiveProject,
} from '../controllers/projects.controller.js';

const router = Router();
const canWrite = requireRole(rolesFor('projects', 'write'));

router.use(requireAuth());

// Any approved user; RLS limits public viewers to published projects.
router.get('/', listProjects);
router.get('/:id', getProject);

router.post('/', canWrite, validateBody(projectSchema), createProject);
router.patch('/:id', canWrite, validateBody(projectSchema, { partial: true }), updateProject);
router.patch('/:id/archive', canWrite, archiveProject);

export default router;
