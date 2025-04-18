-- Create functions to help diagnose database issues

-- Function to list all tables in public schema
CREATE OR REPLACE FUNCTION public.get_table_list()
RETURNS TABLE (
  table_name text,
  table_schema text,
  row_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text AS table_name,
    n.nspname::text AS table_schema,
    (SELECT c.reltuples::bigint AS row_count)
  FROM
    pg_class c
  JOIN
    pg_namespace n ON n.oid = c.relnamespace
  WHERE
    c.relkind = 'r' AND
    n.nspname = 'public';
END;
$$;

-- Function to get column details for a table
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable boolean,
  column_default text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.attname::text AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod)::text AS data_type,
    a.attnotnull = false AS is_nullable,
    (SELECT pg_get_expr(adbin, adrelid) FROM pg_attrdef WHERE adrelid = a.attrelid AND adnum = a.attnum)::text AS column_default
  FROM
    pg_attribute a
  JOIN
    pg_class c ON a.attrelid = c.oid
  JOIN
    pg_namespace n ON n.oid = c.relnamespace
  WHERE
    c.relname = table_name AND
    n.nspname = 'public' AND
    a.attnum > 0 AND
    NOT a.attisdropped
  ORDER BY
    a.attnum;
END;
$$;

-- Function to check RLS policies on a table
CREATE OR REPLACE FUNCTION public.get_table_policies(table_name text)
RETURNS TABLE (
  policy_name text,
  command text,
  roles text[],
  qual text,
  with_check text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.polname::text AS policy_name,
    CASE p.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END::text AS command,
    array_agg(r.rolname)::text[] AS roles,
    pg_get_expr(p.polqual, p.polrelid)::text AS qual,
    pg_get_expr(p.polwithcheck, p.polrelid)::text AS with_check
  FROM
    pg_policy p
  JOIN
    pg_class c ON p.polrelid = c.oid
  JOIN
    pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN
    pg_auth_members m ON m.member = p.polroles[1]
  LEFT JOIN
    pg_roles r ON r.oid = m.roleid
  WHERE
    c.relname = table_name AND
    n.nspname = 'public'
  GROUP BY
    p.polname,
    p.polcmd,
    p.polqual,
    p.polwithcheck,
    p.polrelid;
END;
$$;

-- Function to check if the tables in schema.sql exist
CREATE OR REPLACE FUNCTION public.check_required_tables()
RETURNS TABLE (
  table_name text,
  exists boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH required_tables AS (
    SELECT unnest(ARRAY['users', 'assessments', 'results', 'answers', 'assessment_results']) AS table_name
  )
  SELECT
    r.table_name,
    EXISTS (
      SELECT 1
      FROM pg_tables t
      WHERE t.tablename = r.table_name AND t.schemaname = 'public'
    ) AS exists
  FROM
    required_tables r;
END;
$$; 