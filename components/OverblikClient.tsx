"use client";

import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Activity, CrewMember, Signup, SignupStatus } from "@/lib/types";
import { STATUS_SHORT, STATUS_STYLE, nextStatus } from "@/lib/status";
import { formatDateRange } from "@/lib/date";
import { downloadTextFile } from "@/lib/download";
import SetupNotice from "@/components/SetupNotice";

const UNLOCK_KEY = "bigmikan_unlocked";

export default function OverblikClient() {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [signups, setSignups] = useState<Record<string, Signup>>({});
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");

  useEffect(() => {
    try {
      setUnlocked(window.localStorage.getItem(UNLOCK_KEY) === "true");
    } catch {
      // localStorage utilgængelig (fx privat browsing) - forbliv låst.
    }
  }, []);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [crewRes, activityRes, signupRes] = await Promise.all([
      supabase.from("crew_members").select("*"),
      supabase.from("activities").select("*").order("start_date", { ascending: true }),
      supabase.from("signups").select("*"),
    ]);
    if (crewRes.error) setError(crewRes.error.message);
    else {
      const sorted = [...((crewRes.data ?? []) as CrewMember[])].sort((a, b) =>
        a.name.localeCompare(b.name, "da"),
      );
      setCrew(sorted);
    }

    if (activityRes.error) setError(activityRes.error.message);
    else setActivities((activityRes.data ?? []) as Activity[]);

    if (signupRes.error) setError(signupRes.error.message);
    else {
      const map: Record<string, Signup> = {};
      for (const s of (signupRes.data ?? []) as Signup[]) {
        map[`${s.crew_member_id}:${s.activity_id}`] = s;
      }
      setSignups(map);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function tryUnlock() {
    const expected = process.env.NEXT_PUBLIC_LARS_CODE;
    if (expected && codeInput === expected) {
      setUnlocked(true);
      try {
        window.localStorage.setItem(UNLOCK_KEY, "true");
      } catch {
        // se ovenfor
      }
    } else {
      setError("Forkert kode.");
    }
  }

  function lock() {
    setUnlocked(false);
    try {
      window.localStorage.removeItem(UNLOCK_KEY);
    } catch {
      // se ovenfor
    }
  }

  async function cycleCell(memberId: string, activityId: string) {
    if (!supabase || !unlocked) return;
    const key = `${memberId}:${activityId}`;
    const current = signups[key]?.status ?? "mangler_svar";
    const updated = nextStatus(current);
    const { data, error } = await supabase
      .from("signups")
      .upsert(
        { crew_member_id: memberId, activity_id: activityId, status: updated },
        { onConflict: "crew_member_id,activity_id" },
      )
      .select()
      .single();
    if (error) setError(error.message);
    else setSignups((prev) => ({ ...prev, [key]: data as Signup }));
  }

  function exportCsv() {
    const header = ["Navn", ...activities.map((a) => a.name)];
    const rows = crew.map((member) => [
      member.name,
      ...activities.map((a) => {
        const s = signups[`${member.id}:${a.id}`]?.status ?? "mangler_svar";
        return STATUS_SHORT[s];
      }),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(";"))
      .join("\n");
    // Leading BOM so Excel opens the UTF-8 file with æøå intact.
    downloadTextFile("big-mikan-overblik.csv", `﻿${csv}`, "text/csv");
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Overblik</h1>
        <SetupNotice />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Overblik</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md border border-sea-border bg-white px-3 py-1.5 text-sm font-medium hover:border-sea-primary"
          >
            Eksportér CSV
          </button>
          {unlocked ? (
            <button
              type="button"
              onClick={lock}
              className="rounded-md border border-sea-border bg-white px-3 py-1.5 text-sm font-medium hover:border-sea-primary"
            >
              Lås
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="password"
                placeholder="Lars-kode"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                className="w-28 rounded-md border border-sea-border px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={tryUnlock}
                className="rounded-md border border-sea-border bg-white px-3 py-1.5 text-sm font-medium hover:border-sea-primary"
              >
                Lås op
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {!loaded && <p className="text-sm text-sea-muted">Henter…</p>}

      {loaded && activities.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-sea-border bg-sea-surface">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-sea-border bg-sea-surface p-2 text-left font-medium">
                  Navn
                </th>
                <th className="min-w-[7rem] border-b border-l border-sea-border p-2 text-left font-medium">
                  Telefon
                </th>
                <th className="min-w-[9rem] border-b border-l border-sea-border p-2 text-left font-medium">
                  Mail
                </th>
                {activities.map((a) => (
                  <th
                    key={a.id}
                    className="min-w-[6.5rem] border-b border-l border-sea-border p-2 text-left align-bottom font-medium"
                  >
                    <span className="block whitespace-nowrap">{a.name}</span>
                    <span className="block whitespace-nowrap text-xs font-normal text-sea-muted">
                      {formatDateRange(a.start_date, a.end_date)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crew.map((member) => (
                <tr key={member.id} className={member.active ? "" : "opacity-50"}>
                  <td className="sticky left-0 z-10 border-b border-sea-border bg-sea-surface p-2 font-medium whitespace-nowrap">
                    {member.name}
                  </td>
                  <td className="border-b border-l border-sea-border p-2 whitespace-nowrap text-sea-muted">
                    {member.phone || "–"}
                  </td>
                  <td className="border-b border-l border-sea-border p-2 whitespace-nowrap text-sea-muted">
                    {member.email || "–"}
                  </td>
                  {activities.map((a) => {
                    const signup = signups[`${member.id}:${a.id}`];
                    const status = signup?.status ?? "mangler_svar";
                    const note = signup?.note;
                    const titleParts = [
                      unlocked ? "Klik for at ændre status" : null,
                      note ? `Notat: ${note}` : null,
                    ].filter(Boolean);
                    return (
                      <td
                        key={a.id}
                        className="border-b border-l border-sea-border p-1 text-center"
                      >
                        <button
                          type="button"
                          disabled={!unlocked}
                          onClick={() => cycleCell(member.id, a.id)}
                          title={
                            titleParts.length > 0
                              ? titleParts.join(" - ")
                              : undefined
                          }
                          className={`relative h-8 w-8 rounded-md border text-xs font-semibold ${STATUS_STYLE[status]} ${
                            unlocked ? "cursor-pointer hover:brightness-95" : "cursor-default"
                          }`}
                        >
                          {STATUS_SHORT[status]}
                          {note && (
                            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-sea-primary" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky left-0 z-10 border-t-2 border-sea-border bg-sea-bg p-2 font-medium whitespace-nowrap">
                  I alt
                </td>
                <td className="border-t-2 border-l border-sea-border bg-sea-bg p-2" />
                <td className="border-t-2 border-l border-sea-border bg-sea-bg p-2" />
                {activities.map((a) => {
                  const { confirmed, maybe } = countSignups(crew, signups, a.id);
                  return (
                    <td
                      key={a.id}
                      className="border-t-2 border-l border-sea-border bg-sea-bg p-2 text-center"
                    >
                      <span className="font-semibold">{confirmed}</span>
                      {maybe > 0 && (
                        <span className="ml-1 text-xs text-sea-muted">+{maybe} måske</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Legend />

      {unlocked && (
        <AdminPanel
          crew={crew}
          activities={activities}
          signups={signups}
          onChanged={load}
          setError={setError}
        />
      )}
    </div>
  );
}

function Legend() {
  const entries: SignupStatus[] = [
    "mangler_svar",
    "tilmeldt",
    "maaske",
    "bekraeftet",
    "frameldt",
  ];
  return (
    <div className="flex flex-wrap gap-3 text-xs text-sea-muted">
      {entries.map((s) => (
        <span key={s} className="inline-flex items-center gap-1">
          <span
            className={`inline-block h-4 w-4 rounded border text-center leading-4 ${STATUS_STYLE[s]}`}
          >
            {STATUS_SHORT[s]}
          </span>
          {labelFor(s)}
        </span>
      ))}
      {entries.length > 0 && (
        <span className="basis-full text-xs">
          Klik på en celle (når låst op) for at ændre status. &quot;I
          alt&quot;-rækken tæller Tilmeldt + Bekræftet; et evt. &quot;+N
          måske&quot; viser hvor mange der har svaret måske. En lille blå
          prik i hjørnet af en celle betyder, at personen har skrevet et
          notat - hold musen over cellen for at læse det.
        </span>
      )}
    </div>
  );
}

function labelFor(s: SignupStatus) {
  switch (s) {
    case "mangler_svar":
      return "Mangler svar";
    case "tilmeldt":
      return "Tilmeldt";
    case "maaske":
      return "Måske";
    case "bekraeftet":
      return "Bekræftet";
    case "frameldt":
      return "Deltager ikke";
  }
}

function countSignups(
  crew: CrewMember[],
  signups: Record<string, Signup>,
  activityId: string,
) {
  let confirmed = 0;
  let maybe = 0;
  for (const member of crew) {
    const status = signups[`${member.id}:${activityId}`]?.status;
    if (status === "tilmeldt" || status === "bekraeftet") confirmed++;
    else if (status === "maaske") maybe++;
  }
  return { confirmed, maybe };
}

function csvEscape(value: string) {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function AdminPanel({
  crew,
  activities,
  signups,
  onChanged,
  setError,
}: {
  crew: CrewMember[];
  activities: Activity[];
  signups: Record<string, Signup>;
  onChanged: () => void;
  setError: (msg: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [activityName, setActivityName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editActivityName, setEditActivityName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const [rosterActivityId, setRosterActivityId] = useState<string | null>(null);
  const [copiedActivityId, setCopiedActivityId] = useState<string | null>(null);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !name.trim()) return;
    const { error } = await supabase.from("crew_members").insert({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      sort_order: crew.length,
    });
    if (error) setError(error.message);
    else {
      setName("");
      setPhone("");
      setEmail("");
      onChanged();
    }
  }

  async function toggleActive(member: CrewMember) {
    if (!supabase) return;
    const { error } = await supabase
      .from("crew_members")
      .update({ active: !member.active })
      .eq("id", member.id);
    if (error) setError(error.message);
    else onChanged();
  }

  function startEdit(member: CrewMember) {
    setEditingId(member.id);
    setEditName(member.name);
    setEditPhone(member.phone ?? "");
    setEditEmail(member.email ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!supabase || !editName.trim()) return;
    const { error } = await supabase
      .from("crew_members")
      .update({
        name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
      })
      .eq("id", id);
    if (error) setError(error.message);
    else {
      setEditingId(null);
      onChanged();
    }
  }

  async function removeMember(member: CrewMember) {
    if (!supabase) return;
    if (
      !window.confirm(
        `Slet ${member.name} og alle deres tilmeldinger permanent?`,
      )
    )
      return;
    const { error } = await supabase
      .from("crew_members")
      .delete()
      .eq("id", member.id);
    if (error) setError(error.message);
    else onChanged();
  }

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !activityName.trim() || !startDate) return;
    const season = new Date(startDate).getFullYear();
    const { error } = await supabase.from("activities").insert({
      name: activityName.trim(),
      start_date: startDate,
      end_date: endDate || null,
      season,
      sort_order: activities.length,
    });
    if (error) setError(error.message);
    else {
      setActivityName("");
      setStartDate("");
      setEndDate("");
      onChanged();
    }
  }

  async function removeActivity(id: string) {
    if (!supabase) return;
    if (!window.confirm("Slet denne sejlads og alle tilmeldinger til den?")) return;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) setError(error.message);
    else onChanged();
  }

  function startEditActivity(activity: Activity) {
    setEditingActivityId(activity.id);
    setEditActivityName(activity.name);
    setEditStartDate(activity.start_date);
    setEditEndDate(activity.end_date ?? "");
  }

  function cancelEditActivity() {
    setEditingActivityId(null);
  }

  async function saveEditActivity(e: React.FormEvent, id: string) {
    e.preventDefault();
    if (!supabase || !editActivityName.trim() || !editStartDate) return;
    const season = new Date(editStartDate).getFullYear();
    const { error } = await supabase
      .from("activities")
      .update({
        name: editActivityName.trim(),
        start_date: editStartDate,
        end_date: editEndDate || null,
        season,
      })
      .eq("id", id);
    if (error) setError(error.message);
    else {
      setEditingActivityId(null);
      onChanged();
    }
  }

  function rosterFor(activityId: string) {
    const attending: CrewMember[] = [];
    const maybe: CrewMember[] = [];
    for (const member of crew) {
      const status = signups[`${member.id}:${activityId}`]?.status;
      if (status === "tilmeldt" || status === "bekraeftet") attending.push(member);
      else if (status === "maaske") maybe.push(member);
    }
    return { attending, maybe };
  }

  function rosterText(activity: Activity, attending: CrewMember[], maybe: CrewMember[]) {
    const lines = [
      `Besætningsliste - ${activity.name} (${activity.start_date})`,
      "",
      `Tilmeldt (${attending.length}):`,
      ...(attending.length
        ? attending.map((m) => `- ${m.name}${m.phone ? ` - ${m.phone}` : ""}`)
        : ["(ingen endnu)"]),
    ];
    if (maybe.length) {
      lines.push("", `Måske (${maybe.length}):`, ...maybe.map((m) => `- ${m.name}`));
    }
    return lines.join("\n");
  }

  async function copyRoster(activity: Activity) {
    const { attending, maybe } = rosterFor(activity.id);
    try {
      await navigator.clipboard.writeText(rosterText(activity, attending, maybe));
      setCopiedActivityId(activity.id);
      setTimeout(() => setCopiedActivityId(null), 2000);
    } catch {
      setError("Kunne ikke kopiere til udklipsholder.");
    }
  }

  return (
    <div className="space-y-6 rounded-lg border border-sea-border bg-sea-surface p-4">
      <h2 className="font-semibold">Administration</h2>

      <div>
        <h3 className="text-sm font-medium">Besætning</h3>
        <ul className="mt-2 divide-y divide-sea-border text-sm">
          {crew.map((member) =>
            editingId === member.id ? (
              <li key={member.id} className="py-2">
                <form
                  onSubmit={(e) => saveEdit(e, member.id)}
                  className="flex flex-wrap gap-2"
                >
                  <input
                    placeholder="Navn"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-w-[8rem] flex-1 rounded-md border border-sea-border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Telefon (valgfri)"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="min-w-[8rem] flex-1 rounded-md border border-sea-border px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Mail (valgfri)"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="min-w-[8rem] flex-1 rounded-md border border-sea-border px-2 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-sea-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-sea-primaryDark"
                  >
                    Gem
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-md border border-sea-border px-3 py-1.5 text-sm font-medium hover:border-sea-primary"
                  >
                    Annullér
                  </button>
                </form>
              </li>
            ) : (
              <li key={member.id} className="flex items-center justify-between gap-2 py-1.5">
                <div className={member.active ? "" : "text-sea-muted line-through"}>
                  <span className="font-medium">{member.name}</span>
                  <span className="ml-2 text-xs text-sea-muted">
                    {member.phone || "–"} · {member.email || "–"}
                  </span>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    onClick={() => startEdit(member)}
                    className="text-xs text-sea-primary underline"
                  >
                    Rediger
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(member)}
                    className="text-xs text-sea-primary underline"
                  >
                    {member.active ? "Deaktivér" : "Genaktivér"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMember(member)}
                    className="text-xs text-rose-600 underline"
                  >
                    Slet
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
        <form onSubmit={addMember} className="mt-3 flex flex-wrap gap-2">
          <input
            placeholder="Navn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-[8rem] flex-1 rounded-md border border-sea-border px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Telefon (valgfri)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="min-w-[8rem] flex-1 rounded-md border border-sea-border px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Mail (valgfri)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-[8rem] flex-1 rounded-md border border-sea-border px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-sea-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-sea-primaryDark"
          >
            Tilføj
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-sm font-medium">Sejladser</h3>
        <ul className="mt-2 divide-y divide-sea-border text-sm">
          {activities.map((a) =>
            editingActivityId === a.id ? (
              <li key={a.id} className="py-2">
                <form
                  onSubmit={(e) => saveEditActivity(e, a.id)}
                  className="flex flex-wrap gap-2"
                >
                  <input
                    placeholder="Navn på sejlads"
                    value={editActivityName}
                    onChange={(e) => setEditActivityName(e.target.value)}
                    className="min-w-[10rem] flex-1 rounded-md border border-sea-border px-2 py-1.5 text-sm"
                  />
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="rounded-md border border-sea-border px-2 py-1.5 text-sm"
                  />
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="rounded-md border border-sea-border px-2 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-sea-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-sea-primaryDark"
                  >
                    Gem
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditActivity}
                    className="rounded-md border border-sea-border px-3 py-1.5 text-sm font-medium hover:border-sea-primary"
                  >
                    Annullér
                  </button>
                </form>
              </li>
            ) : (
              <li key={a.id} className="py-1.5">
                <div className="flex items-center justify-between">
                  <span>
                    {a.name}{" "}
                    <span className="text-sea-muted">({a.start_date})</span>
                  </span>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setRosterActivityId((cur) => (cur === a.id ? null : a.id))
                      }
                      className="text-xs text-sea-primary underline"
                    >
                      {rosterActivityId === a.id ? "Skjul liste" : "Besætningsliste"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditActivity(a)}
                      className="text-xs text-sea-primary underline"
                    >
                      Rediger
                    </button>
                    <button
                      type="button"
                      onClick={() => removeActivity(a.id)}
                      className="text-xs text-rose-600 underline"
                    >
                      Slet
                    </button>
                  </div>
                </div>

                {rosterActivityId === a.id && (
                  <RosterPanel
                    activity={a}
                    roster={rosterFor(a.id)}
                    copied={copiedActivityId === a.id}
                    onCopy={() => copyRoster(a)}
                  />
                )}
              </li>
            ),
          )}
        </ul>
        <form onSubmit={addActivity} className="mt-3 flex flex-wrap gap-2">
          <input
            placeholder="Navn på sejlads"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            className="min-w-[10rem] flex-1 rounded-md border border-sea-border px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-sea-border px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-sea-border px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-sea-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-sea-primaryDark"
          >
            Tilføj
          </button>
        </form>
      </div>
    </div>
  );
}

function RosterPanel({
  activity,
  roster,
  copied,
  onCopy,
}: {
  activity: Activity;
  roster: { attending: CrewMember[]; maybe: CrewMember[] };
  copied: boolean;
  onCopy: () => void;
}) {
  const { attending, maybe } = roster;
  return (
    <div className="mt-2 rounded-lg border border-sea-border bg-sea-bg p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">
          {activity.name} - {attending.length} tilmeldt
        </p>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md border border-sea-border bg-white px-2.5 py-1 text-xs font-medium hover:border-sea-primary"
        >
          {copied ? "Kopieret!" : "Kopiér liste"}
        </button>
      </div>

      {attending.length === 0 ? (
        <p className="mt-2 text-sea-muted">Ingen tilmeldt endnu.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {attending.map((m) => (
            <li key={m.id} className="flex justify-between gap-2 text-sea-ink">
              <span>{m.name}</span>
              <span className="text-sea-muted">
                {m.phone || m.email || ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {maybe.length > 0 && (
        <p className="mt-2 text-xs text-sea-muted">
          Måske: {maybe.map((m) => m.name).join(", ")}
        </p>
      )}
    </div>
  );
}
