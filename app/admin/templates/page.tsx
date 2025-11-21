import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function TemplatesAdminPage() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('template')
    .select('id, org_id, name, category, description, default_prompt, is_active, created_at')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to load templates', error);
  }

  const templates = data ?? [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Templates (Admin)</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Global and org-level templates loaded from Supabase.
      </p>
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Org</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2">{t.name}</td>
                <td className="px-3 py-2">{t.category}</td>
                <td className="px-3 py-2">{t.org_id ?? 'global'}</td>
                <td className="px-3 py-2">{t.is_active ? 'yes' : 'no'}</td>
                <td className="px-3 py-2">
                  {t.created_at ? new Date(t.created_at as string).toLocaleString() : ''}
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-muted-foreground" colSpan={5}>
                  No templates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

