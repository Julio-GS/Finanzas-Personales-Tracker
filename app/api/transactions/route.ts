import { NextRequest, NextResponse } from 'next/server';
import { validateRequestAuth } from '@/lib/auth-server';
import { manualTransactionInputSchema, monthQuerySchema } from '@/lib/validation';
import { insertTransaction, getMonthDashboard } from '@/db/queries';
import { apiErrorResponse } from '@/lib/errors';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await validateRequestAuth(request);
  if (!auth.authenticated) {
    return auth.response!;
  }

  const searchParams = request.nextUrl.searchParams;
  const yearParam = searchParams.get('year') ?? undefined;
  const monthParam = searchParams.get('month') ?? undefined;

  const queryParse = monthQuerySchema.safeParse({
    year: yearParam,
    month: monthParam,
  });

  if (!queryParse.success) {
    return apiErrorResponse(
      'validation_error',
      'Invalid month or year parameter',
      422,
      queryParse.error.format()
    );
  }

  try {
    const data = await getMonthDashboard(queryParse.data.year, queryParse.data.month);
    return NextResponse.json(data, { status: 200 });
  } catch {
    return apiErrorResponse(
      'database_error',
      'Failed to retrieve transactions',
      500
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await validateRequestAuth(request);
  if (!auth.authenticated) {
    return auth.response!;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse('invalid_json', 'Invalid JSON body', 400);
  }

  const parseResult = manualTransactionInputSchema.safeParse(body);
  if (!parseResult.success) {
    return apiErrorResponse(
      'validation_error',
      'Validation failed',
      422,
      parseResult.error.format()
    );
  }

  try {
    const transaction = await insertTransaction(parseResult.data);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch {
    return apiErrorResponse(
      'database_error',
      'Failed to save transaction',
      500
    );
  }
}
