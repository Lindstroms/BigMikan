"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Activity, CrewMember, Signup, SignupStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/status";
import { formatDateRange } from "@/lib/date";
import SetupNotice from "@/components/SetupNotice";

const CREW_CHOICES: { status: SignupStatus; label: string }[] = [
  { status: "tilmeldt", label: "Deltager" },
  { status: "maaske", label: "Måske" },
  { status: "frameldt", label: "Deltager ikke" },
];

export default function MigClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [member, setMember] = useState<CrewMember | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [signups, setSignups] = useState<Record<string, Signup>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !id) return;
    const [memberRes, activityRes, signupRes] = await Promise.all([
      supabase.from("crew_members").select("*").eq("id", id).maybeSingle(),
      supabase.from("activities").select("*").order("start_date", { ascending: true }),
      supabase.from("signups").select("*").eq("crew_member_id", id),
    ]);

    if (memberRes.error) setError(memberRes.error.message);
    else setMember(memberRes.data as CrewMember | null);

    if (activityRes.error) setError(activityRes.error.message);
    else setActivities((activityRes.data ?? []) as Activity[]);

    if (signupRes.error) setError(signupRes.error.message);
    else {
      const map: Record<string, Signup> = {};
      for (const s of (signupRes.data ?? []) as Signup[]) {
        map[s.activity_id] = s;
      }
      setSignups(map);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(activityId: string, status: SignupStatus) {
    if (!supabase || !id) return;
    setSavingId(activityId);
    const { data, error } = await supabase
      .from("signups")
      .upsert(
        { crew_member_id: id, activity_id: activityId, status },
        { onConflict: "crew_member_id,activity_id" },
      )
      .select()
      .single();
    if (error) setError(error.message);
    else setSignups((prev) => ({ ...prev, [activityId]: data as Signup }));
    setSavingId(null);
  }

  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  if (!id) {
    return (
      <p className="text-sm text-sea-muted">
        Mangler et navn.{" "}
        <Link href="/" className="text-sea-primary underline">
          Gå tilbage og vælg dig selv
        </Link>
        .
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
        Der skete en fejl: {error}
      </p>
    );
  }

  if (member === null) {
    return <p className="text-sm text-sea-muted">Henter…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Hej, {member.name}!</h1>
        <p className="text-sm text-sea-muted">
          Marker om du deltager i hver sejlads. Det gemmes med det samme.
        </p>
      </div>

      {activities.length === 0 && (
        <p className="text-sm text-sea-muted">
          Der er endnu ikke oprettet nogen sejladser for sæsonen.
        </p>
      )}

      <ul className="space-y-3">
        {activities.map((activity) => {
          const current = signups[activity.id]?.status ?? "mangler_svar";
          return (
            <li
              key={activity.id}
              className="rounded-lg border border-sea-border bg-sea-surface p-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{activity.name}</p>
                  <p className="text-xs text-sea-muted">
                    {formatDateRange(activity.start_date, activity.end_date)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${STATUS_STYLE[current]}`}
                >
                  {STATUS_LABEL[current]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {CREW_CHOICES.map((choice) => (
                  <button
                    key={choice.status}
                    type="button"
                    disabled={savingId === activity.id}
                    onClick={() => setStatus(activity.id, choice.status)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                      current === choice.status
                        ? "border-sea-primary bg-sea-primary text-white"
                        : "border-sea-border bg-white text-sea-ink hover:border-sea-primary"
                    } disabled:opacity-50`}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="pt-2 text-xs text-sea-muted">
        Lars markerer selv, hvem der er endeligt bekræftet til hver sejlads
        under{" "}
        <Link href="/overblik" className="text-sea-primary underline">
          Overblik
        </Link>
        .
      </p>
    </div>
  );
}
