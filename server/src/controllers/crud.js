// Small CRUD helpers for simple tables (contractors, implementing_agencies).
// All queries use req.db so the database RLS applies to the signed-in user.
// Request bodies are already whitelisted by validateBody(...).

const cleanSearch = (value) => String(value).replace(/[,()*%\\"]/g, ' ').trim();

/**
 * makeCrud({ table, idColumn, label, searchColumns })
 * Returns list / get / create / update / remove handlers.
 */
export function makeCrud({ table, idColumn, label, searchColumns = ['name'] }) {
  return {
    // GET / ?search=&is_active=
    async list(req, res, next) {
      try {
        let query = req.db.from(table).select('*').order('name');
        if (req.query.is_active === 'true' || req.query.is_active === 'false') {
          query = query.eq('is_active', req.query.is_active === 'true');
        }
        if (req.query.search) {
          const term = cleanSearch(req.query.search);
          if (term) query = query.or(searchColumns.map((c) => `${c}.ilike.*${term}*`).join(','));
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json({ data });
      } catch (error) {
        next(error);
      }
    },

    // GET /:id
    async get(req, res, next) {
      try {
        const { data, error } = await req.db.from(table).select('*').eq(idColumn, req.params.id).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: `${label} not found` });
        res.json({ data });
      } catch (error) {
        next(error);
      }
    },

    // POST /
    async create(req, res, next) {
      try {
        const { data, error } = await req.db.from(table).insert(req.body).select('*').single();
        if (error) throw error;
        res.status(201).json({ data });
      } catch (error) {
        next(error);
      }
    },

    // PATCH /:id
    async update(req, res, next) {
      try {
        const { data, error } = await req.db
          .from(table)
          .update(req.body)
          .eq(idColumn, req.params.id)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: `${label} not found` });
        res.json({ data });
      } catch (error) {
        next(error);
      }
    },

    // DELETE /:id
    async remove(req, res, next) {
      try {
        const { error, count } = await req.db
          .from(table)
          .delete({ count: 'exact' })
          .eq(idColumn, req.params.id);
        if (error) throw error;
        if (!count) return res.status(404).json({ error: `${label} not found` });
        res.json({ data: { [idColumn]: req.params.id, deleted: true } });
      } catch (error) {
        next(error);
      }
    },
  };
}
