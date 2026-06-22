-- Rule-based practice_areas seeding by bucket_slug.
-- Run AFTER patch-practice-areas-setup.sql.
-- Safe to re-run (only updates docs where practice_areas is still empty).

-- Tax law
UPDATE documents SET practice_areas = '{tax_law}'
WHERE practice_areas = '{}'
  AND bucket_slug IN ('bureau_of_internal_revenue', 'court_of_tax_appeals', 'bureau_of_customs');

-- Labor law
UPDATE documents SET practice_areas = '{labor_law}'
WHERE practice_areas = '{}'
  AND bucket_slug IN ('department_of_labor_and_employment', 'employees_compensation_commission');

-- Local government law
UPDATE documents SET practice_areas = '{local_government_law}'
WHERE practice_areas = '{}'
  AND bucket_slug = 'department_of_the_interior_and_local_government';

-- Criminal / administrative law (DOJ issues both)
UPDATE documents SET practice_areas = '{criminal_law,administrative_law}'
WHERE practice_areas = '{}'
  AND bucket_slug = 'department_of_justice';

-- Administrative law
UPDATE documents SET practice_areas = '{administrative_law}'
WHERE practice_areas = '{}'
  AND bucket_slug IN ('civil_service_commission', 'bureau_of_corrections', 'department_of_energy');

-- Check results
SELECT bucket_slug, COUNT(*) as total,
       COUNT(*) FILTER (WHERE practice_areas != '{}') as classified
FROM documents
GROUP BY bucket_slug
ORDER BY total DESC;
