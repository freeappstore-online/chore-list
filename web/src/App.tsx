import { useState, useEffect, useCallback } from "react";
import { Shell } from "./components/Shell";

type Priority = "low" | "medium" | "high";
type Filter = "all" | "pending" | "done";

interface Chore {
  id: string;
  title: string;
  priority: Priority;
  done: boolean;
  createdAt: number;
  doneAt?: number;
  category: string;
}

const STORAGE_KEY = "chores_data";

const CATEGORIES = ["All", "Kitchen", "Bedroom", "Bathroom", "Living Room", "Outdoor", "Laundry", "Other"];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  low:    { label: "Low",    color: "var(--muted)",   dot: "#6b7280" },
  medium: { label: "Medium", color: "var(--warning)",  dot: "#d97706" },
  high:   { label: "High",   color: "var(--error)",    dot: "#dc2626" },
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function App() {
  const [chores, setChores] = useState<Chore[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState("Other");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chores));
  }, [chores]);

  const resetForm = useCallback(() => {
    setTitle("");
    setPriority("medium");
    setCategory("Other");
    setEditId(null);
    setShowForm(false);
  }, []);

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (chore: Chore) => {
    setTitle(chore.title);
    setPriority(chore.priority);
    setCategory(chore.category);
    setEditId(chore.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editId) {
      setChores(prev =>
        prev.map(c =>
          c.id === editId
            ? { ...c, title: title.trim(), priority, category }
            : c
        )
      );
    } else {
      const newChore: Chore = {
        id: uid(),
        title: title.trim(),
        priority,
        done: false,
        createdAt: Date.now(),
        category,
      };
      setChores(prev => [newChore, ...prev]);
    }
    resetForm();
  };

  const toggleDone = (id: string) => {
    setChores(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, done: !c.done, doneAt: !c.done ? Date.now() : undefined }
          : c
      )
    );
  };

  const deleteChore = (id: string) => {
    setChores(prev => prev.filter(c => c.id !== id));
  };

  const clearDone = () => {
    setChores(prev => prev.filter(c => !c.done));
  };

  const filtered = chores.filter(c => {
    const matchFilter =
      filter === "all" ? true : filter === "done" ? c.done : !c.done;
    const matchCat =
      categoryFilter === "All" ? true : c.category === categoryFilter;
    return matchFilter && matchCat;
  });

  // Sort: pending first by priority (high→medium→low), then done
  const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const totalCount = chores.length;
  const doneCount = chores.filter(c => c.done).length;
  const pendingCount = totalCount - doneCount;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const navItems: Filter[] = ["all", "pending", "done"];
  const navLabels: Record<Filter, string> = { all: "All", pending: "Pending", done: "Done" };
  const navIcons: Record<Filter, string> = {
    all: "☰",
    pending: "⏳",
    done: "✅",
  };

  return (
    <Shell
      navItems={navItems.map(f => ({
        id: f,
        label: navLabels[f],
        icon: navIcons[f],
        active: filter === f,
        onClick: () => setFilter(f),
      }))}
      appName="Chore List"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold mb-1"
              style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }}
            >
              Chore List
            </h1>
            <p style={{ color: "var(--muted)" }} className="text-sm">
              {pendingCount} pending · {doneCount} done
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-opacity hover:opacity-80 shrink-0"
            style={{
              background: "var(--accent)",
              color: "#fff",
              borderRadius: "0.75rem",
            }}
          >
            <span className="text-lg leading-none">+</span> Add Chore
          </button>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mb-6 p-4 rounded-[1.25rem] border" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
            <div className="flex justify-between text-sm mb-2" style={{ color: "var(--muted)" }}>
              <span>Progress</span>
              <span className="font-semibold" style={{ color: "var(--ink)" }}>{progress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: "var(--accent)" }}
              />
            </div>
            {doneCount > 0 && (
              <button
                onClick={clearDone}
                className="mt-3 text-xs hover:underline"
                style={{ color: "var(--muted)" }}
              >
                Clear {doneCount} completed
              </button>
            )}
          </div>
        )}

        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className="px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all shrink-0"
              style={{
                borderRadius: "999px",
                background: categoryFilter === cat ? "var(--accent)" : "var(--panel)",
                color: categoryFilter === cat ? "#fff" : "var(--muted)",
                border: `1px solid ${categoryFilter === cat ? "var(--accent)" : "var(--line)"}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-[1rem]" style={{ background: "var(--panel)", border: `1px solid var(--line)` }}>
          {navItems.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-1 py-1.5 text-sm font-semibold transition-all"
              style={{
                borderRadius: "0.75rem",
                background: filter === f ? "var(--accent)" : "transparent",
                color: filter === f ? "#fff" : "var(--muted)",
              }}
            >
              {navLabels[f]}
            </button>
          ))}
        </div>

        {/* Chore list */}
        {sorted.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--muted)" }}>
            <div className="text-5xl mb-4">🧹</div>
            <p className="font-semibold text-lg" style={{ color: "var(--ink)" }}>
              {filter === "done" ? "No completed chores yet" : "No chores here!"}
            </p>
            <p className="text-sm mt-1">
              {filter === "all" || filter === "pending"
                ? "Tap \"Add Chore\" to get started."
                : "Complete some chores to see them here."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {sorted.map(chore => (
              <ChoreCard
                key={chore.id}
                chore={chore}
                onToggle={() => toggleDone(chore.id)}
                onEdit={() => openEdit(chore)}
                onDelete={() => deleteChore(chore.id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 flex items-end md:items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={e => { if (e.target === e.currentTarget) resetForm(); }}
        >
          <div
            className="w-full max-w-md p-6"
            style={{
              background: "var(--paper)",
              borderRadius: "1.25rem",
              border: "1px solid var(--line)",
            }}
          >
            <h2
              className="text-xl font-bold mb-5"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              {editId ? "Edit Chore" : "New Chore"}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--muted)" }}>
                  Chore name
                </label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Wash the dishes"
                  className="w-full px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: "0.75rem",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--muted)" }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: "0.75rem",
                    color: "var(--ink)",
                  }}
                >
                  {CATEGORIES.filter(c => c !== "All").map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "var(--muted)" }}>
                  Priority
                </label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as Priority[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className="flex-1 py-2 text-sm font-semibold transition-all"
                      style={{
                        borderRadius: "0.75rem",
                        border: `2px solid ${priority === p ? PRIORITY_CONFIG[p].dot : "var(--line)"}`,
                        background: priority === p ? PRIORITY_CONFIG[p].dot + "22" : "var(--panel)",
                        color: priority === p ? PRIORITY_CONFIG[p].dot : "var(--muted)",
                      }}
                    >
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 text-sm font-semibold"
                  style={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--line)",
                    background: "var(--panel)",
                    color: "var(--muted)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="flex-1 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-40"
                  style={{
                    borderRadius: "0.75rem",
                    background: "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {editId ? "Save Changes" : "Add Chore"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}

interface ChoreCardProps {
  chore: Chore;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ChoreCard({ chore, onToggle, onEdit, onDelete }: ChoreCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pCfg = PRIORITY_CONFIG[chore.priority];

  return (
    <li
      className="flex items-center gap-3 p-4 transition-opacity"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "1.25rem",
        opacity: chore.done ? 0.6 : 1,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="shrink-0 w-6 h-6 flex items-center justify-center transition-all"
        style={{
          borderRadius: "50%",
          border: `2px solid ${chore.done ? "var(--success)" : "var(--line-strong)"}`,
          background: chore.done ? "var(--success)" : "transparent",
        }}
        aria-label={chore.done ? "Mark as pending" : "Mark as done"}
      >
        {chore.done && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{
            color: "var(--ink)",
            textDecoration: chore.done ? "line-through" : "none",
          }}
        >
          {chore.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {chore.category}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>·</span>
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: pCfg.dot }}>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: pCfg.dot }}
            />
            {pCfg.label}
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
          style={{ color: "var(--muted)" }}
          aria-label="Options"
        >
          ⋯
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div
              className="absolute right-0 top-9 z-20 py-1 min-w-[120px] shadow-lg"
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: "0.75rem",
              }}
            >
              <button
                onClick={() => { setMenuOpen(false); onEdit(); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 transition-colors"
                style={{ color: "var(--ink)" }}
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDelete(); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-black/5 transition-colors"
                style={{ color: "var(--error)" }}
              >
                🗑️ Delete
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
