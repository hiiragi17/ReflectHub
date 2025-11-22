-- Fix YWT framework schema
-- This updates the field order properties to match the correct Y-W-T sequence

-- First, let's check the current YWT framework configuration
SELECT
  id,
  name,
  display_name,
  schema
FROM frameworks
WHERE name = 'YWT' OR name = 'ywt' OR display_name = 'YWT';

-- After reviewing the output, run this update
-- This assumes the YWT framework has fields with ids 'y', 'w', 't'
-- and updates their order properties to be: y=1, w=2, t=3

UPDATE frameworks
SET
  schema = jsonb_set(
    jsonb_set(
      jsonb_set(
        schema,
        '{fields}',
        (
          SELECT jsonb_agg(
            CASE
              WHEN field->>'id' = 'y' THEN jsonb_set(field, '{order}', '1')
              WHEN field->>'id' = 'w' THEN jsonb_set(field, '{order}', '2')
              WHEN field->>'id' = 't' THEN jsonb_set(field, '{order}', '3')
              ELSE field
            END
          )
          FROM jsonb_array_elements(schema->'fields') AS field
        )
      ),
      '{fields}',
      (
        SELECT jsonb_agg(field ORDER BY (field->>'order')::int)
        FROM jsonb_array_elements(schema->'fields') AS field
      )
    ),
    '{fields}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN field->>'id' = 'y' THEN jsonb_set(field, '{order}', '1')
          WHEN field->>'id' = 'w' THEN jsonb_set(field, '{order}', '2')
          WHEN field->>'id' = 't' THEN jsonb_set(field, '{order}', '3')
          ELSE field
        END
      )
      FROM jsonb_array_elements(schema->'fields') AS field
    )
  ),
  updated_at = NOW()
WHERE name = 'YWT' OR name = 'ywt' OR display_name = 'YWT';

-- Verify the update
SELECT
  id,
  name,
  display_name,
  schema
FROM frameworks
WHERE name = 'YWT' OR name = 'ywt' OR display_name = 'YWT';
