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

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${basePath}/boat.jpg)`,
            backgroundPosition: "center 62%",
          }}
        />
        <div className="absolute inset-0 bg-sea-bg/80" />

        <div className="relative space-y-4 p-5 sm:p-6">
          <h1 className="text-xl font-semibold">Hvem er du?</h1>

          {!isSupabaseConfigured ? (
            <SetupNotice />
          ) : (
            <>
              <p className="text-sm text-sea-muted">
                Vælg dit navn for at se sæsonens sejladser og melde dig til
                eller fra.
              </p>

              {error && (
                <p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                  Kunne ikke hente besætningslisten: {error}
                </p>
              )}

              {!error && crew === null && (
                <p className="text-sm text-sea-muted">
                  Henter besætningsliste…
                </p>
              )}

              {crew !== null && crew.length === 0 && (
                <p className="text-sm text-sea-muted">
                  Der er endnu ikke tilføjet nogen besætningsmedlemmer. Gå
                  til{" "}
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

              <Link
                href="/overblik"
                className="mt-2 flex items-center gap-3.5 rounded-2xl bg-sea-primary px-4 py-4 text-left text-white shadow-[0_8px_20px_-10px_rgba(11,79,108,0.55)] hover:bg-sea-primaryDark"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                    <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
                    <line x1="8.5" y1="9.5" x2="8.5" y2="19.5" />
                  </svg>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-base font-bold tracking-tight">
                    Overblik
                  </span>
                  <span className="text-xs text-white/80">
                    Se det samlede overblik
                  </span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-auto h-4 w-4 shrink-0 text-white/70"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
