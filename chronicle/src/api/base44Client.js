// Local, zero-backend "client" that mimics the subset of Base44 SDK methods
// used by this app. Data is stored in the browser via localStorage.
//
// NOTE: This is for prototyping/hackathons. It is not secure authentication.

const LS_USER_KEY = 'chronicle_user';
const LS_ENTRIES_KEY = 'chronicle_entries';

function nowIso() {
  return new Date().toISOString();
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function generateId() {
  // Good enough for local prototypes
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function ensureSeedData() {
  const existing = readJson(LS_ENTRIES_KEY, null);
  if (Array.isArray(existing) && existing.length > 0) return;

  const today = new Date();
  const yyyyMmDd = (d) => d.toISOString().split('T')[0];

  const seed = [
    {
      id: generateId(),
      title: 'First entry',
      content: 'This is a sample entry. Edit or delete it, then start writing your own.',
      date: yyyyMmDd(today),
      mood: 'reflective',
      themes: ['growth'],
      milestone: false,
      lessons_learned: '',
      ai_insights: '',
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  writeJson(LS_ENTRIES_KEY, seed);
}

function sortEntries(entries, sortSpec) {
  // Supports the app's usage: '-date' (desc) or 'date' (asc)
  const spec = (sortSpec || '').trim();
  if (!spec) return entries;

  const desc = spec.startsWith('-');
  const field = desc ? spec.slice(1) : spec;

  const copy = [...entries];
  copy.sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (av === bv) return 0;
    // Dates are YYYY-MM-DD strings, which compare lexicographically.
    if (av == null) return 1;
    if (bv == null) return -1;
    return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
  return copy;
}

function getUser() {
  const fallback = {
    id: 'local-user',
    name: 'You',
    email: 'local@chronicle.dev',
    theme_color: 'purple',
    custom_color: null,
  };

  const user = readJson(LS_USER_KEY, fallback);
  // If LS is empty, persist fallback so Settings can update it.
  if (!window.localStorage.getItem(LS_USER_KEY)) {
    writeJson(LS_USER_KEY, user);
  }
  return user;
}

function setUser(patch) {
  const current = getUser();
  const next = { ...current, ...patch };
  writeJson(LS_USER_KEY, next);
  return next;
}

function getEntries() {
  ensureSeedData();
  return readJson(LS_ENTRIES_KEY, []);
}

function setEntries(entries) {
  writeJson(LS_ENTRIES_KEY, entries);
}

async function invokeLLM({ prompt }) {
  // A very small stub so the UI works without a backend.
  // If you wire a real backend later, replace this.
  const text = String(prompt || '');
  const clipped = text.length > 800 ? `${text.slice(0, 800)}…` : text;

  const response =
    "(Local AI stub)\n\n" +
    "Here are a couple quick reflections based on what you wrote:\n" +
    "• What feels most consistent across this entry is the theme of momentum + identity—you're noticing patterns, not just events.\n" +
    "• If you want a next step, try writing one concrete experiment for tomorrow that matches the person you're trying to become.\n\n" +
    `Prompt excerpt: ${clipped}`;

  return { data: response };
}

export const base44 = {
  auth: {
    async me() {
      return getUser();
    },
    async updateMe(patch) {
      return setUser(patch || {});
    },
    logout() {
      // Clear "token" concept + user session. Keep entries.
      window.localStorage.removeItem(LS_USER_KEY);
    },
    redirectToLogin(returnUrl) {
      // No real login in local mode; just go back.
      if (returnUrl) window.location.href = returnUrl;
    },
  },

  entities: {
    Entry: {
      async list(sortSpec, limit) {
        const all = sortEntries(getEntries(), sortSpec);
        const limited = typeof limit === 'number' ? all.slice(0, limit) : all;
        return { data: limited };
      },
      async create(data) {
        const entry = {
          id: generateId(),
          ...data,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        const next = [entry, ...getEntries()];
        setEntries(next);
        return { data: entry };
      },
      async update(id, data) {
        const entries = getEntries();
        const idx = entries.findIndex((e) => e.id === id);
        if (idx === -1) throw new Error('Entry not found');
        const updated = {
          ...entries[idx],
          ...data,
          id,
          updated_at: nowIso(),
        };
        const next = [...entries];
        next[idx] = updated;
        setEntries(next);
        return { data: updated };
      },
      async delete(id) {
        const next = getEntries().filter((e) => e.id !== id);
        setEntries(next);
        return { data: { id } };
      },
    },
  },

  integrations: {
    Core: {
      InvokeLLM: invokeLLM,
    },
  },

  appLogs: {
    async logUserInApp() {
      // no-op in local mode
      return { data: true };
    },
  },
};
