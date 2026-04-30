import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWorkspaceId } from '@/lib/get-workspace-id'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const VALID_FRONTENDS = ['React', 'Next.js', 'Vue', 'SvelteKit', 'Angular', 'Other']
const VALID_BACKENDS = [
  'Node.js/Express', 'Node.js/Fastify', 'Python/FastAPI', 'Python/Django',
  'Python/Flask', 'Ruby on Rails', 'Go', 'Java/Spring', 'PHP/Laravel', 'Other',
]
const VALID_DATABASES = ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'DynamoDB', 'Other']
const VALID_HOSTING = ['AWS', 'GCP', 'Azure', 'Vercel', 'Railway', 'Heroku', 'Other']

export async function POST(req: NextRequest) {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { frontend, backend, database, hosting } = body

  if (!VALID_FRONTENDS.includes(frontend)) {
    return NextResponse.json({ error: 'Invalid frontend value' }, { status: 400 })
  }
  if (!VALID_BACKENDS.includes(backend)) {
    return NextResponse.json({ error: 'Invalid backend value' }, { status: 400 })
  }
  if (!VALID_DATABASES.includes(database)) {
    return NextResponse.json({ error: 'Invalid database value' }, { status: 400 })
  }
  if (hosting !== undefined && hosting !== '' && !VALID_HOSTING.includes(hosting)) {
    return NextResponse.json({ error: 'Invalid hosting value' }, { status: 400 })
  }

  const tech_stack: Record<string, string> = { frontend, backend, database }
  if (hosting && VALID_HOSTING.includes(hosting)) tech_stack.hosting = hosting

  const { error } = await supabaseAdmin
    .from('workspaces')
    .update({ tech_stack })
    .eq('id', workspaceId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
