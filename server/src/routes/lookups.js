import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { listMunicipalities, listBarangays } from '../controllers/lookups.controller.js';

const router = Router();

// Public: works with or without a token.
router.use(optionalAuth);

router.get('/municipalities', listMunicipalities);
router.get('/barangays', listBarangays);

export default router;
