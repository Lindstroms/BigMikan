"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Activity, CrewMember, Signup, SignupStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/status";
import { formatDateRange } from "@/lib/date";
import { buildIcsCalendar } from "@/lib/ics";
import { downloadTextFile } from "@/lib/download";
import SetupNotice from "@/components/SetupNotice";

const ATTENDING_STATUSES: SignupStatus[] = ["tilmeldt", "bekraeftet"];
const HIDE_TIP_KEY = "bigmikan_hide_bookmark_tip";

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
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [othersAttending, setOthersAttending] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !id) return;
    const [memberRes, activityRes, signupRes] = await Promise.all([
      supabase.from("crew_members").select("*").eq("id", id).maybeSingle(),
      supabase.from("activities").select("*").order("start_date", { ascending: true }),
      // All crew's signups, not just this person's - needed for the
      // "X andre er tilmeldt" count.
      supabase.from("signups").select("*"),
    ]);

    if (memberRes.error) setError(memberRes.error.message);
    else setMember(memberRes.data as CrewMember | null);

    if (activityRes.error) setError(activityRes.error.message);
    else setActivities((activityRes.data ?? []) as Activity[]);

    if (signupRes.error) setError(signupRes.error.message);
    else {
      const map: Record<string, Signup> = {};
      const notes: Record<string, string> = {};
      const others: Record<string, number> = {};
      for (const s of (signupRes.data ?? []) as Signup[]) {
        if (s.crew_member_id === id) {
          map[s.activity_id] = s;
          notes[s.activity_id] = s.note ?? "";
        } else if (ATTENDING_STATUSES.includes(s.status)) {
          others[s.activity_id] = (others[s.activity_id] ?? 0) + 1;
        }
      }
      setSignups(map);
      setNoteDrafts(notes);
      setOthersAttending(others);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(HIDE_TIP_KEY) !== "true") {
        setShowTip(true);
      }
    } catch {
      setShowTip(true);
    }
  }, []);

  function dismissTip() {
    setShowTip(false);
    try {
      window.localStorage.setItem(HIDE_TIP_KEY, "true");
    } catch {
      // localStorage utilgængelig (fx privat browsing) - tippet vises igen.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError("Kunne ikke kopiere linket.");
    }
  }

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

  async function saveNote(activityId: string) {
    if (!supabase || !id) return;
    const note = noteDrafts[activityId]?.trim() || null;
    if ((signups[activityId]?.note ?? null) === note) return;
    const { data, error } = await supabase
      .from("signups")
      .upsert(
        { crew_member_id: id, activity_id: activityId, note },
        { onConflict: "crew_member_id,activity_id" },
      )
      .select()
      .single();
    if (error) setError(error.message);
    else setSignups((prev) => ({ ...prev, [activityId]: data as Signup }));
  }

  function addActivityToCalendar(activity: Activity) {
    downloadTextFile(
      `${activity.name}.ics`,
      buildIcsCalendar([activity]),
      "text/calendar",
    );
  }

  function addAllToCalendar() {
    const attending = activities.filter((a) =>
      ATTENDING_STATUSES.includes(signups[a.id]?.status ?? "mangler_svar"),
    );
    downloadTextFile(
      "big-mikan-sejladser.ics",
      buildIcsCalendar(attending),
      "text/calendar",
    );
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Hej, {member.name}!</h1>
          <p className="text-sm text-sea-muted">
            Marker om du deltager i hver sejlads. Det gemmes med det samme.
          </p>
        </div>
        {activities.some((a) =>
          ATTENDING_STATUSES.includes(signups[a.id]?.status ?? "mangler_svar"),
        ) && (
          <button
            type="button"
            onClick={addAllToCalendar}
            className="shrink-0 whitespace-nowrap rounded-md border border-sea-border bg-white px-2.5 py-1.5 text-xs font-medium hover:border-sea-primary"
          >
            + Kalender
          </button>
        )}
      </div>

      {showTip && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-sea-border bg-sea-surface/80 p-3 text-xs text-sea-muted">
          <p>
            Tip: Gem dette link som bogmærke eller på din hjemmeskærm, så du
            slipper for at vælge dit navn hver gang.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="whitespace-nowrap rounded-md border border-sea-border bg-white px-2 py-1 font-medium hover:border-sea-primary"
            >
              {linkCopied ? "Kopieret!" : "Kopiér link"}
            </button>
            <button
              type="button"
              onClick={dismissTip}
              aria-label="Luk tip"
              className="whitespace-nowrap rounded-md border border-sea-border bg-white px-2 py-1 font-medium hover:border-sea-primary"
            >
              Luk
            </button>
          </div>
        </div>
      )}

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
                  {(othersAttending[activity.id] ?? 0) > 0 && (
                    <p className="text-xs text-sea-accent">
                      {othersAttending[activity.id] === 1
                        ? "1 anden er tilmeldt"
                        : `${othersAttending[activity.id]} andre er tilmeldt`}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 text-xs font-medium ${STATUS_STYLE[current]}`}
                >
                  {STATUS_LABEL[current]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
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
                {ATTENDING_STATUSES.includes(current) && (
                  <button
                    type="button"
                    onClick={() => addActivityToCalendar(activity)}
                    className="ml-auto rounded-md border border-sea-border bg-white px-2.5 py-1.5 text-xs font-medium text-sea-muted hover:border-sea-primary hover:text-sea-primary"
                  >
                    + Kalender
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Notat (valgfrit) - fx “kommer kl. 10 i stedet”"
                value={noteDrafts[activity.id] ?? ""}
                onChange={(e) =>
                  setNoteDrafts((prev) => ({
                    ...prev,
                    [activity.id]: e.target.value,
                  }))
                }
                onBlur={() => saveNote(activity.id)}
                className="mt-2 w-full rounded-md border border-sea-border px-2.5 py-1.5 text-sm placeholder:text-sea-muted/70"
              />
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
