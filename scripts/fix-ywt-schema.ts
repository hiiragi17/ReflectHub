/**
 * Script to fix YWT framework schema in the database
 *
 * This script:
 * 1. Fetches the YWT framework from the database
 * 2. Displays the current schema configuration
 * 3. Fixes the field order if needed
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Fetching frameworks...\n');

  // Fetch all frameworks
  const { data: frameworks, error } = await supabase
    .from('frameworks')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching frameworks:', error);
    process.exit(1);
  }

  if (!frameworks || frameworks.length === 0) {
    console.log('No frameworks found');
    return;
  }

  console.log('Current frameworks:');
  frameworks.forEach((framework) => {
    console.log(`\n${framework.display_name} (${framework.name})`);
    console.log(`ID: ${framework.id}`);

    if (framework.schema && framework.schema.fields) {
      console.log('Fields:');
      framework.schema.fields.forEach((field: any) => {
        console.log(`  - ${field.label} (id: ${field.id}, order: ${field.order})`);
      });
    }
  });

  // Find YWT framework
  const ywtFramework = frameworks.find((f) =>
    f.name === 'YWT' || f.name === 'ywt' || f.display_name === 'YWT'
  );

  if (!ywtFramework) {
    console.log('\nYWT framework not found');
    return;
  }

  console.log('\n--- YWT Framework Analysis ---');
  const fields = ywtFramework.schema?.fields || [];

  // Check if order matches field id expectation
  // Expected: y (order: 1), w (order: 2), t (order: 3)
  const needsFix = fields.some((field: any) => {
    if (field.id === 'y' && field.order !== 1) return true;
    if (field.id === 'w' && field.order !== 2) return true;
    if (field.id === 't' && field.order !== 3) return true;
    return false;
  });

  if (!needsFix) {
    console.log('✓ YWT framework schema is correct!');
    return;
  }

  console.log('✗ YWT framework schema needs fixing');
  console.log('\nCurrent order:');
  fields.forEach((field: any) => {
    console.log(`  ${field.id}: order ${field.order}`);
  });

  // Fix the schema
  const fixedFields = fields.map((field: any) => {
    let newOrder = field.order;

    // Correct the order based on field id
    if (field.id === 'y') newOrder = 1;
    else if (field.id === 'w') newOrder = 2;
    else if (field.id === 't') newOrder = 3;

    return {
      ...field,
      order: newOrder,
    };
  });

  console.log('\nProposed fix:');
  fixedFields.forEach((field: any) => {
    console.log(`  ${field.id}: order ${field.order}`);
  });

  // Update the framework
  const { error: updateError } = await supabase
    .from('frameworks')
    .update({
      schema: {
        ...ywtFramework.schema,
        fields: fixedFields,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', ywtFramework.id);

  if (updateError) {
    console.error('\n✗ Error updating framework:', updateError);
    process.exit(1);
  }

  console.log('\n✓ YWT framework schema has been fixed!');
}

main()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
