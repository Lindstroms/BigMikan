export default function SetupNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
      <p className="font-medium">Appen er ikke sat op endnu.</p>
      <p className="mt-1">
        Der mangler forbindelse til databasen. Følg trinene i{" "}
        <code className="rounded bg-amber-100 px-1">README.md</code> for at
        oprette et gratis Supabase-projekt og udfylde{" "}
        <code className="rounded bg-amber-100 px-1">.env.local</code>
        (lokalt) eller repository-secrets (på GitHub).
      </p>
    </div>
  );
}
