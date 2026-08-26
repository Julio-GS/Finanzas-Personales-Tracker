import { NextRequest, NextResponse } from 'next/server';
import { validateRequestAuth } from '@/lib/auth-server';
import { historyQuerySchema } from '@/lib/validation';
import { getHistoryReport } from '@/db/queries';
import { apiErrorResponse } from '@/lib/errors';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await validateRequestAuth(request);
  if (!auth.authenticated) {
    return auth.response!;
  }

  const limitParam = request.nextUrl.searchParams.get('limit') ?? undefined;
  const parseResult = historyQuerySchema.safeParse({ limit: limitParam });

  if (!parseResult.success) {
    return apiErrorResponse(
      'validation_error',
      'Invalid history limit parameter (must be between 1 and 12)',
      422,
      parseResult.error.format()
    );
  }

  try {
    const months = await getHistoryReport(parseResult.data.limit);
    return NextResponse.json({ months }, { status: 200 });
  } catch {
    return apiErrorResponse(
      'database_error',
      'Failed to retrieve history report',
      500
    );
  }
}
