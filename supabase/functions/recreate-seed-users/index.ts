import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// DEPRECATED: This function was used in April 2026 for a one-time recreation of
// seed auth users. It contained multiple bugs that caused duplicate records in
// teachers, parents and sponsors tables:
//
//   1. `.eq('user_id', null)` does not filter in Supabase (should be `.is`)
//   2. When `u.teacher_id/parent_id/sponsor_id` was NULL, a zero UUID was used
//      as fallback, silently causing updates to not apply
//   3. The function only did UPDATE, never INSERT, so users without a role
//      record remained orphaned
//   4. Running multiple times multiplied the inconsistency
//
// Cleanup was performed via migrations on 16/04/2026 and UNIQUE constraints
// were added to prevent recurrence. This function is now locked. Do not
// re-enable without rewriting with:
//   - `.is('user_id', null)` instead of `.eq('user_id', null)`
//   - Proper INSERT when role record doesn't exist
//   - Integrity validation queries after each step
//   - Idempotency guards

Deno.serve(async (_req: Request) => {
  return new Response(
    JSON.stringify({
      error: 'This function is disabled',
      reason: 'Previous version contained bugs that caused duplicate role records. See function source comments for details. Use direct SQL migrations with integrity checks instead.',
      disabled_at: '2026-04-16'
    }),
    { status: 410, headers: { 'Content-Type': 'application/json' } }
  );
});
