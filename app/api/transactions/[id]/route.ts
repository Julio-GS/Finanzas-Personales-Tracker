import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequestAuth } from '@/lib/auth-server';
import { deleteTransactionById } from '@/db/queries';
import { apiErrorResponse } from '@/lib/errors';

const idParamSchema = z.string().uuid('Invalid transaction ID format');

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
): Promise<NextResponse> {
  const auth = await validateRequestAuth(request);
  if (!auth.authenticated) {
    return auth.response!;
  }

  const params = await context.params;
  const parseResult = idParamSchema.safeParse(params.id);
  if (!parseResult.success) {
    return apiErrorResponse(
      'validation_error',
      'Invalid transaction ID format',
      422,
      parseResult.error.format()
    );
  }

  try {
    const deleted = await deleteTransactionById(parseResult.data);
    if (!deleted) {
      return apiErrorResponse('not_found', 'Transaction not found', 404);
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return apiErrorResponse(
      'database_error',
      'Failed to delete transaction',
      500
    );
  }
}
