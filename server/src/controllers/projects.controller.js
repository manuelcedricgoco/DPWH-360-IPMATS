// Projects API. Every query uses req.db (the signed-in user's client), so the
// database RLS decides which rows each role can see or change.
// Request bodies are already whitelisted by validateBody(projectSchema).

const VIEW = 'v_project_details';
const MAX_LIMIT = 500;

// Characters that would break a PostgREST or() filter.
const cleanSearch = (value) => String(value).replace(/[,()*%\\"]/g, ' ').trim();

async function fetchProject(db, id) {
  return db.from(VIEW).select('*').eq('project_id', id).maybeSingle();
}

// GET /api/projects?municipality_id=&project_type=&status=&contractor_id=&agency_id=&search=&limit=&offset=
export async function listProjects(req, res, next) {
  try {
    const { municipality_id, project_type, status, contractor_id, agency_id, search } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), MAX_LIMIT);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    let query = req.db
      .from(VIEW)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (municipality_id) query = query.eq('municipality_id', municipality_id);
    if (project_type) query = query.eq('project_type', project_type);
    if (status) query = query.eq('status', status);
    if (contractor_id) query = query.eq('contractor_id', contractor_id);
    if (agency_id) query = query.eq('agency_id', agency_id);
    if (search) {
      const term = cleanSearch(search);
      if (term) query = query.or(`name.ilike.*${term}*,project_code.ilike.*${term}*`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data, count, limit, offset });
  } catch (error) {
    next(error);
  }
}

// GET /api/projects/:id
export async function getProject(req, res, next) {
  try {
    const { data, error } = await fetchProject(req.db, req.params.id);
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Project not found' });
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

// POST /api/projects – phases are created automatically by the database.
export async function createProject(req, res, next) {
  try {
    const { data: inserted, error } = await req.db
      .from('projects')
      .insert(req.body)
      .select('project_id')
      .single();
    if (error) throw error;

    const { data, error: readError } = await fetchProject(req.db, inserted.project_id);
    if (readError) throw readError;
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/projects/:id
export async function updateProject(req, res, next) {
  try {
    const { error, count } = await req.db
      .from('projects')
      .update(req.body, { count: 'exact' })
      .eq('project_id', req.params.id)
      .is('deleted_at', null);
    if (error) throw error;
    if (!count) return res.status(404).json({ error: 'Project not found' });

    const { data, error: readError } = await fetchProject(req.db, req.params.id);
    if (readError) throw readError;
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/projects/:id/archive – soft delete (sets deleted_at).
// No .select() here: after archiving, DPWH personnel can no longer see the row,
// so asking for it back would be rejected by RLS.
export async function archiveProject(req, res, next) {
  try {
    const { error, count } = await req.db
      .from('projects')
      .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
      .eq('project_id', req.params.id)
      .is('deleted_at', null);
    if (error) throw error;
    if (!count) return res.status(404).json({ error: 'Project not found' });
    res.json({ data: { project_id: req.params.id, archived: true } });
  } catch (error) {
    next(error);
  }
}
