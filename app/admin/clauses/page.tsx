import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function ClausesAdminPage() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('clause')
    .select('id, org_id, name, category, jurisdiction, body, created_at')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to load clauses', error);
  }

  const clauses = data ?? [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Clauses (Admin)</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Reusable clause library loaded from Supabase.
      </p>
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Jurisdiction</th>
              <th className="px-3 py-2 text-left">Org</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {clauses.map((c) => (
              <tr key={c.id} className="border-t align-top">
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.category}</td>
                <td className="px-3 py-2">{c.jurisdiction ?? '-'}</td>
                <td className="px-3 py-2">{c.org_id ?? 'global'}</td>
                <td className="px-3 py-2">
                  {c.created_at ? new Date(c.created_at as string).toLocaleString() : ''}
                </td>
              </tr>
            ))}
            {clauses.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-muted-foreground" colSpan={5}>
                  No clauses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

