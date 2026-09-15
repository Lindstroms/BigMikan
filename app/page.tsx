"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { CrewMember } from "@/lib/types";
import SetupNotice from "@/components/SetupNotice";

export default function HomePage() {
  const [crew, setCrew] = useState<CrewMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("crew_members")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCrew(data as CrewMember[]);
      });
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Hvem er du?</h1>
        <SetupNotice />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Hvem er du?</h1>
      <p className="text-sm text-sea-muted">
        Vælg dit navn for at se sæsonens sejladser og melde dig til eller fra.
      </p>

      {error && (
        <p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          Kunne ikke hente besætningslisten: {error}
        </p>
      )}

      {!error && crew === null && (
        <p className="text-sm text-sea-muted">Henter besætningsliste…</p>
      )}

      {crew !== null && crew.length === 0 && (
        <p className="text-sm text-sea-muted">
          Der er endnu ikke tilføjet nogen besætningsmedlemmer. Gå til{" "}
          <Link href="/overblik" className="text-sea-primary underline">
            Overblik
          </Link>{" "}
          for at oprette dem.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {crew?.map((member) => (
          <li key={member.id}>
            <Link
              href={`/mig?id=${member.id}`}
              className="block rounded-lg border border-sea-border bg-sea-surface px-4 py-3 text-center font-medium text-sea-ink shadow-sm hover:border-sea-primary hover:text-sea-primary"
            >
              {member.name}
            </Link>
          </li>
        ))}
      </ul>

      <p className="pt-4 text-sm text-sea-muted">
        Er du Lars?{" "}
        <Link href="/overblik" className="text-sea-primary underline">
          Se det samlede overblik
        </Link>
        .
      </p>
    </div>
  );
}
