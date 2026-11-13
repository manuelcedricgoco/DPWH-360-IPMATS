import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Current user's profile (incl. is_approved and requested_role). Allowed for
// unapproved users so the client can send them to the "pending approval" page.
router.get('/', requireAuth({ allowUnapproved: true }), (req, res) => {
  res.json({ profile: req.profile });
});

export default router;
