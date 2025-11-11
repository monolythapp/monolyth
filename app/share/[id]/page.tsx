// app/share/[id]/page.tsx
import ShareClient from "./ShareClient";

export const dynamic = "force-dynamic"; // always fetch fresh

type Params = Promise<{ id: string }>;

async function fetchShare(shareId: string): Promise<{ title: string; html?: string; markdown?: string }> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = `${base}/api/shares/render`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shareId }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Render failed (${res.status})`);
  }

  const data = await res.json().catch(() => ({} as any));

  const title = data?.title ?? "Shared Document";
  const html = typeof data?.html === "string" ? data.html : undefined;
  const markdown = typeof data?.markdown === "string" ? data.markdown : undefined;

  if (!html && !markdown) {
    throw new Error("No content returned from /api/shares/render");
  }

  return { title, html, markdown };
}

export default async function Page({ params }: { params: Params }) {
  // ⬇️ Next.js 16: params is a Promise; unwrap it
  const { id: shareId } = await params;

  const { title, html, markdown } = await fetchShare(shareId);

  // Pass either html OR markdown to the client component
  if (html) {
    return <ShareClient shareId={shareId} title={title} html={html} />;
  }
  return <ShareClient shareId={shareId} title={title} markdown={markdown!} />;
}
