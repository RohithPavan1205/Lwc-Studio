import { NextResponse } from 'next/server';

// In-memory deployment tracker for Hot-Reload
// This works perfectly in local dev sessions
const deploymentTracker: Record<string, string> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const comp = searchParams.get('comp');

  if (!userId || !comp) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const key = `${userId}_${comp}`;
  return NextResponse.json({ 
    lastBuildId: deploymentTracker[key] || '0' 
  });
}

// Internal function to signal an update
export async function POST(request: Request) {
  const { userId, componentName, buildId } = await request.json();
  const key = `${userId}_${componentName}`;
  deploymentTracker[key] = buildId;
  return NextResponse.json({ success: true });
}
