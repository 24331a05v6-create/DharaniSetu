-- 007: Additive read-only RPC for viewport parcel loading.
-- PostgREST does not support the st_intersects filter operator, so the GIS
-- Explorer fetches visible parcels through this function instead.
-- SECURITY INVOKER (default): caller RLS policies still apply. No tables changed.
CREATE OR REPLACE FUNCTION parcels_in_bbox(
  w double precision,
  s double precision,
  e double precision,
  n double precision,
  max_rows integer DEFAULT 2000
)
RETURNS SETOF parcels
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM parcels AS p
  WHERE p.geometry && ST_MakeEnvelope(w, s, e, n, 4326)
    AND ST_Intersects(p.geometry, ST_MakeEnvelope(w, s, e, n, 4326))
  LIMIT max_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION parcels_in_bbox(double precision, double precision, double precision, double precision, integer) TO anon, authenticated;
