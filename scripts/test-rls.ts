/**
 * RLS Cross-Workspace Isolation Test
 *
 * Verifies that Supabase Row Level Security prevents users in one workspace
 * from reading, querying, or writing data belonging to another workspace.
 *
 * Usage:
 *   npx tsx scripts/test-rls.ts
 *
 * Required env vars:
 *   SUPABASE_URL                    - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY       - Service role key (bypasses RLS)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   - Anon key (subject to RLS)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

let failures = 0

function pass(msg: string) {
  console.log(`  PASS: ${msg}`)
}

function fail(msg: string) {
  console.error(`  FAIL: ${msg}`)
  failures++
}

async function cleanup(wsA: string, wsB: string, userAId?: string, userBId?: string) {
  // Delete in dependency order
  await admin.from('feedback').delete().in('workspace_id', [wsA, wsB])
  await admin.from('signals').delete().in('workspace_id', [wsA, wsB])
  await admin.from('clusters').delete().in('workspace_id', [wsA, wsB])
  await admin.from('workspaces').delete().in('id', [wsA, wsB])
  if (userAId) await admin.auth.admin.deleteUser(userAId)
  if (userBId) await admin.auth.admin.deleteUser(userBId)
}

async function testRLS() {
  console.log('=== RLS Cross-Workspace Isolation Test ===\n')

  const wsA = crypto.randomUUID()
  const wsB = crypto.randomUUID()
  let userAId: string | undefined
  let userBId: string | undefined

  try {
    // 1. Create two test workspaces
    console.log('Setting up test workspaces...')
    const { error: wsError } = await admin.from('workspaces').insert([
      { id: wsA, name: 'RLS Test Workspace A', plan: 'pilot' },
      { id: wsB, name: 'RLS Test Workspace B', plan: 'pilot' },
    ])
    if (wsError) throw new Error(`Failed to create workspaces: ${wsError.message}`)

    // 2. Create test users with workspace_id in app_metadata
    const emailA = `rls-test-a-${Date.now()}@test.com`
    const emailB = `rls-test-b-${Date.now()}@test.com`
    const password = 'rlstestpass123!'

    const { data: userA, error: userAError } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      app_metadata: { workspace_id: wsA },
    })
    if (userAError) throw new Error(`Failed to create user A: ${userAError.message}`)
    userAId = userA.user.id

    const { data: userB, error: userBError } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      app_metadata: { workspace_id: wsB },
    })
    if (userBError) throw new Error(`Failed to create user B: ${userBError.message}`)
    userBId = userB.user.id

    // 3. Insert test data using service role (bypasses RLS)
    console.log('Inserting test data...\n')
    await admin.from('signals').insert([
      { workspace_id: wsA, text: 'Signal belonging to workspace A', source: 'rls-test' },
      { workspace_id: wsB, text: 'Signal belonging to workspace B', source: 'rls-test' },
    ])

    // 4. Sign in as User A (RLS-enforced client)
    const clientA = createClient(SUPABASE_URL, ANON_KEY)
    const { error: signInError } = await clientA.auth.signInWithPassword({
      email: emailA,
      password,
    })
    if (signInError) throw new Error(`Failed to sign in as User A: ${signInError.message}`)

    // === TEST 1: Read isolation ===
    console.log('Test 1: Read isolation')
    const { data: allSignals } = await clientA.from('signals').select('workspace_id')
    const leakedReads = allSignals?.filter(s => s.workspace_id === wsB)
    if (leakedReads && leakedReads.length > 0) {
      fail('User A can read Workspace B signals via SELECT *')
    } else {
      pass('User A cannot read Workspace B signals')
    }

    // === TEST 2: Filtered query isolation ===
    console.log('Test 2: Filtered query isolation')
    const { data: filteredSignals } = await clientA
      .from('signals')
      .select('*')
      .eq('workspace_id', wsB)
    if (filteredSignals && filteredSignals.length > 0) {
      fail('User A can query Workspace B signals with explicit filter')
    } else {
      pass('User A cannot query Workspace B signals even with explicit eq() filter')
    }

    // === TEST 3: Write isolation ===
    console.log('Test 3: Write isolation')
    const { error: insertError } = await clientA
      .from('signals')
      .insert({ workspace_id: wsB, text: 'Injected by User A', source: 'rls-test' })
    if (!insertError) {
      fail('User A can INSERT into Workspace B')
      // Clean up injected row
      await admin.from('signals').delete().eq('text', 'Injected by User A')
    } else {
      pass('User A cannot insert into Workspace B')
    }

    // === TEST 4: Update isolation ===
    console.log('Test 4: Update isolation')
    const { data: updatedRows } = await clientA
      .from('signals')
      .update({ text: 'MODIFIED BY USER A' })
      .eq('workspace_id', wsB)
      .select()
    if (updatedRows && updatedRows.length > 0) {
      fail('User A can UPDATE Workspace B signals')
    } else {
      pass('User A cannot update Workspace B signals')
    }

    // === TEST 5: Delete isolation ===
    console.log('Test 5: Delete isolation')
    const { data: deletedRows } = await clientA
      .from('signals')
      .delete()
      .eq('workspace_id', wsB)
      .select()
    if (deletedRows && deletedRows.length > 0) {
      fail('User A can DELETE Workspace B signals')
    } else {
      pass('User A cannot delete Workspace B signals')
    }

    // === TEST 6: Verify workspace B data still intact ===
    console.log('Test 6: Data integrity')
    const { data: bSignals } = await admin
      .from('signals')
      .select('*')
      .eq('workspace_id', wsB)
      .eq('source', 'rls-test')
    if (bSignals && bSignals.length === 1 && bSignals[0].text === 'Signal belonging to workspace B') {
      pass('Workspace B data is untouched after all User A attempts')
    } else {
      fail('Workspace B data was modified or deleted')
    }

    console.log('')
  } catch (err) {
    console.error('\nSetup/teardown error:', err)
    failures++
  } finally {
    // Cleanup
    console.log('Cleaning up test data...')
    await cleanup(wsA, wsB, userAId, userBId)
  }

  if (failures > 0) {
    console.error(`\n${failures} test(s) FAILED!`)
    process.exit(1)
  } else {
    console.log('All RLS isolation tests passed!')
  }
}

testRLS()
