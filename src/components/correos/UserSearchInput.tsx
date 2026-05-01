"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface UserResult {
  id:       string;
  name:     string | null;
  username: string;
  image:    string | null;
}

interface Props {
  value:    { username: string; name: string } | null;
  onChange: (user: { username: string; name: string } | null) => void;
}

export function UserSearchInput({ value, onChange }: Props) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState<UserResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear selected
  function clear() {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  // Debounced search
  useEffect(() => {
    if (value) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json().catch(() => []);
        // API returns array directly; filter out users without username
        const arr  = Array.isArray(data) ? data : (data.users ?? []);
        setResults((arr as UserResult[]).filter((u) => u.username).slice(0, 6));
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, value]);

  if (value) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm text-text font-medium">{value.name}</span>
        <span className="text-xs text-text-subtle">@{value.username}</span>
        <button onClick={clear} className="text-text-subtle hover:text-text-muted transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre de usuario..."
        className="w-full text-sm text-text placeholder:text-text-subtle focus:outline-none"
      />
      {loading && (
        <span className="absolute right-0 top-0 text-xs text-text-subtle">Buscando...</span>
      )}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange({ username: user.username, name: user.name ?? user.username });
                setOpen(false);
                setQuery("");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-green-50 transition-colors text-left"
            >
              {user.image ? (
                <Image src={user.image} alt="" width={28} height={28} className="rounded-full shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold shrink-0">
                  {(user.name ?? user.username)[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-text">{user.name}</p>
                <p className="text-xs text-text-subtle">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-50 px-3 py-2.5">
          <p className="text-sm text-text-subtle">Sin resultados para &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
