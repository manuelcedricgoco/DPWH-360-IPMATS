// Public lookups (readable by anon and signed-in users through RLS).

// GET /api/lookups/municipalities
export async function listMunicipalities(req, res, next) {
  try {
    const { data, error } = await req.db
      .from('municipalities')
      .select('municipality_id, name, district, center_lat, center_lng')
      .order('name');
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

// GET /api/lookups/barangays?municipality_id=
export async function listBarangays(req, res, next) {
  try {
    const { municipality_id } = req.query;
    if (municipality_id !== undefined && !/^\d+$/.test(municipality_id)) {
      return res.status(400).json({ error: 'municipality_id must be a whole number' });
    }

    let query = req.db.from('barangays').select('barangay_id, municipality_id, name').order('name');
    if (municipality_id) query = query.eq('municipality_id', municipality_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
