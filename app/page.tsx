import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, content")
    .order("id");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 p-8 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Helm Lite
      </h1>

      {error ? (
        <div className="max-w-md rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-medium">Could not reach the database</p>
          <p className="text-sm">{error.message}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages?.map((message) => (
            <div
              key={message.id}
              className="max-w-md rounded-lg border border-green-300 bg-green-50 p-4 text-green-900"
            >
              {message.content}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        This message is stored in Supabase, served by Vercel, deployed from
        GitHub.
      </p>
    </div>
  );
}
