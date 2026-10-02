// Walktify — interface Spotify pour Walky (custom app Spicetify) — v0.9
//
// Navigation (molettes/bouton de Walky, simulés au clavier sur PC) :
//   Haut/Bas      rangée précédente / suivante
//   Gauche/Droite élément précédent / suivant ; Gauche en début de rangée -> barre latérale
//   Entrée        activer
//   Retour        Échap, ou Backspace hors champ texte (sur Walky : KEY_BACK / "BrowserBack")
//
// Diagnostic : window.walktifyDebug() dans la console DevTools.

const { React } = Spicetify;
const h = React.createElement;
const { useState, useEffect, useRef } = React;

const DOWNLOADABLE = ["playlist", "album", "collection"];
const TYPE_LABELS = {
  album: "Albums",
  artist: "Artistes",
  show: "Podcasts",
  audiobook: "Livres audio",
  collection: "Titres likés",
  "your-episodes": "Tes épisodes",
};

// ------------------------------------------------------------------ icônes
// Tracés SVG simples : indépendants des polices installées (important sur l'image Yocto)
const ICONS = {
  // Engrenage : tracé "settings" de Material Design Icons (licence Apache 2.0)
  settings: { fill: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" },
  home: { fill: "M12 3 3 10v11h6v-6h6v6h6V10z" },
  search: { fill: "M10 3a7 7 0 1 0 4.2 12.6l5.1 5.1 1.4-1.4-5.1-5.1A7 7 0 0 0 10 3zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10z" },
  note: { fill: "M9 3v11.3A3.5 3.5 0 1 0 11 17V7h8V3z" },
  play: { fill: "M8 5v14l11-7z" },
  pause: { fill: "M6 5h4v14H6zm8 0h4v14h-4z" },
  prev: { fill: "M6 6h2v12H6zm3.5 6L18 18V6z" },
  next: { fill: "M16 6h2v12h-2zM6 18l8.5-6L6 6z" },
  repeat: { stroke: "M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" },
  // Aléatoire amélioré : étincelle en haut à gauche + flèches croisées
  smartShuffle: [
    { fill: "M6 1.6Q6.83 5.37 10.6 6.2Q6.83 7.03 6 10.8Q5.17 7.03 1.4 6.2Q5.17 5.37 6 1.6Z" },
    { stroke: "M3 18h3.2c1.6 0 2.6-.6 3.5-1.9l4.6-6.7c.9-1.3 1.9-1.9 3.5-1.9H21M18.3 4.8 21 7.5l-2.7 2.7M8.9 9.2 10.7 11.8M12.7 14.7l1.1 1.5c.9 1.3 1.9 1.9 3.5 1.9H21M18.3 15.4 21 18.1l-2.7 2.7" },
  ],
  // Pastille des titres ajoutés par l'aléatoire amélioré : carré plein, étincelles évidées (transparentes)
  smartBadge: { fill: "M5 2h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zM10 7.5Q11.08 12.42 16 13.5Q11.08 14.58 10 19.5Q8.92 14.58 4 13.5Q8.92 12.42 10 7.5ZM16.8 3.8Q17.34 6.26 19.8 6.8Q17.34 7.34 16.8 9.8Q16.26 7.34 13.8 6.8Q16.26 6.26 16.8 3.8Z", rule: "evenodd" },
  heartOutline: { stroke: "M12 20s-6.5-4-8.8-8.3A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 8.8 5.1C18.5 16 12 20 12 20z" },
  volHigh: [
    { fill: "M3 9v6h4l5 4V5L7 9z" },
    { stroke: "M15.5 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12" },
  ],
  volLow: [{ fill: "M3 9v6h4l5 4V5L7 9z" }, { stroke: "M15.5 9a4 4 0 0 1 0 6" }],
  volMute: [{ fill: "M3 9v6h4l5 4V5L7 9z" }, { stroke: "M16 9.5l5 5M21 9.5l-5 5" }],
  addCircle: { stroke: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8" },
  // File d'attente : liste + lecture ; ajout à la file : liste + "+"
  queue: [{ stroke: "M3 6h14M3 11h14M3 16h8" }, { fill: "M14 14v7l6.5-3.5z" }],
  queueAdd: { stroke: "M3 6h14M3 11h14M3 16h8M18 13v8M14 17h8" },
  // Historique : tracé "history" de Lucide (licence ISC)
  history: { stroke: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2" },
  close: { stroke: "M6 6l12 12M18 6 6 18" },
  shuffle: { stroke: "M3 7h4l10 10h4M3 17h4L17 7h4M18 4l3 3-3 3M18 14l3 3-3 3" },
  download: { stroke: "M12 4v11M7 10l5 5 5-5M5 20h14" },
  check: { stroke: "M5 12l5 5 9-10" },
  heart: { fill: "M12 21s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.6-9.5 9-9.5 9z" },
  // Téléchargement façon Spotify : cercle + flèche (vide = pas téléchargé, plein = téléchargé)
  dlCircle: { stroke: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5v8.5M8.5 12.5 12 16l3.5-3.5" },
  dlDone: [
    { fill: "M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19z" },
    { stroke: "M12 7.5v8.5M8.5 12.5 12 16l3.5-3.5", color: "#000" },
  ],
};

function Icon({ name, className }) {
  const ic = ICONS[name];
  if (!ic) return null;
  const parts = Array.isArray(ic) ? ic : [ic];
  return h(
    "svg",
    { viewBox: "0 0 24 24", className: "wk-icon " + (className || "") },
    parts.map((p, i) =>
      h(
        "path",
        p.fill
          ? { key: i, d: p.fill, fill: p.color || "currentColor", fillRule: p.rule || "nonzero" }
          : {
            key: i,
            d: p.stroke,
            fill: "none",
            stroke: p.color || "currentColor",
            strokeWidth: 2,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }
      )
    )
  );
}

const RAIL = [
  { id: "home", label: "Accueil", icon: "home" },
  { id: "search", label: "Recherche", icon: "search" },
  { id: "nowplaying", label: "En cours", icon: "note" },
  { id: "queue", label: "File d'attente", icon: "queue" },
  { id: "history", label: "Historique", icon: "history" },
  // Réglages : petit bouton discret tout en bas de la barre (on y arrive en descendant)
  { id: "settings", label: "Réglages", icon: "settings" },
];

// ------------------------------------------------------------------ utilitaires
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const safe = (fn, fallback) => {
  try {
    return fn();
  } catch (_) {
    return fallback;
  }
};
const fixImage = (url) =>
  typeof url === "string" && url.startsWith("spotify:image:") ? "https://i.scdn.co/image/" + url.slice(14) : url;

function imageUrl(item) {
  if (!item) return null;
  if (typeof item.imageUrl === "string") return fixImage(item.imageUrl);
  let imgs = item.images || (item.image ? [item.image] : []);
  if (!Array.isArray(imgs)) imgs = [imgs];
  imgs = imgs.filter(Boolean);
  if (!imgs.length) return null;
  const sorted = [...imgs].sort((a, b) => (b.width || 0) - (a.width || 0));
  const pick = sorted.find((i) => (i.width || 300) <= 640) || sorted[0];
  return fixImage(typeof pick === "string" ? pick : pick.url);
}

function fmtTime(ms) {
  if (!ms && ms !== 0) return "";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function typeFromUri(uri) {
  if (!uri) return "unknown";
  if (uri.includes("your-episodes")) return "your-episodes";
  if (uri.endsWith(":collection") || uri === "spotify:collection:tracks") return "collection";
  return uri.split(":")[1] || "unknown";
}

// Normalise un élément venant de GraphQL (formes très variables) vers { type, uri, name, images, subtitle }
function normalize(entry) {
  const d = entry && ((entry.item && entry.item.data) || (entry.content && entry.content.data) || entry.data || entry);
  if (!d || !d.uri) return null;
  const images =
    (d.coverArt && d.coverArt.sources) ||
    (d.albumOfTrack && d.albumOfTrack.coverArt && d.albumOfTrack.coverArt.sources) ||
    (d.visuals && d.visuals.avatarImage && d.visuals.avatarImage.sources) ||
    (d.images && d.images.items && d.images.items[0] && d.images.items[0].sources) ||
    (d.image && d.image.sources) ||
    null;
  const artists = d.artists && d.artists.items;
  return {
    type: typeFromUri(d.uri),
    uri: d.uri,
    name: d.name || (d.profile && d.profile.name) || "",
    images,
    subtitle: artists ? artists.map((a) => a.profile && a.profile.name).filter(Boolean).join(", ") : undefined,
  };
}

// ------------------------------------------------------------------ GraphQL
// Les noms et variables des requêtes changent selon les versions de Spotify :
// on lit les variables attendues directement dans la définition, et on complète.
function gqlDef(...names) {
  const D = (Spicetify.GraphQL && Spicetify.GraphQL.Definitions) || {};
  for (const n of names) if (D[n]) return { name: n, def: D[n] };
  return null;
}

function gqlVars(def, wanted) {
  const op = def && def.definitions && def.definitions.find((x) => x.kind === "OperationDefinition");
  if (!op || !op.variableDefinitions) return wanted;
  const vars = {};
  for (const v of op.variableDefinitions) {
    const name = v.variable.name.value;
    if (name in wanted) vars[name] = wanted[name];
    else if (v.type.kind === "NonNullType") {
      const t = v.type.type && v.type.type.name && v.type.type.name.value;
      vars[name] = t === "Boolean" ? false : t === "Int" ? 0 : "";
    }
  }
  return vars;
}

async function gql(names, wanted) {
  const found = gqlDef(...names);
  if (!found) throw new Error(`aucune définition GraphQL parmi : ${names.join(", ")}`);
  const vars = gqlVars(found.def, wanted);
  let r;
  try {
    r = await Spicetify.GraphQL.Request(found.def, vars);
  } catch (e) {
    // Le corps de la réponse d'erreur indique en général le paramètre refusé ou manquant
    let body = e && (e.body || e.data || e.response);
    try {
      body = typeof body === "string" ? body : JSON.stringify(body);
    } catch (_) { }
    console.warn(`[Walktify] ${found.name} refusé (HTTP ${e && e.status}) — variables envoyées :`, vars, "— réponse :", body);
    throw e;
  }
  if (!r || (!r.data && r.errors)) throw new Error(`${found.name} : ${JSON.stringify(r && r.errors).slice(0, 300)}`);
  return r.data;
}

const locale = () => safe(() => Spicetify.Locale.getLocale(), "fr");

window.walktifyDebug = function () {
  const D = (Spicetify.GraphQL && Spicetify.GraphQL.Definitions) || {};
  const out = {};
  for (const k of Object.keys(D).filter((k) => /search|home|artist|album|collection|liked|recent/i.test(k))) {
    const op = D[k] && D[k].definitions && D[k].definitions.find((x) => x.kind === "OperationDefinition");
    out[k] = op && op.variableDefinitions ? op.variableDefinitions.map((v) => v.variable.name.value) : "?";
  }
  const platform = Object.keys(Spicetify.Platform).filter((k) => /Recent|Library|Collection|Home|Search/i.test(k));
  console.log("[Walktify] GraphQL :", out);
  console.log("[Walktify] Platform :", platform);
  return { graphql: out, platform };
};

// ------------------------------------------------------------------ données Spotify
function flattenRootlist(items) {
  const out = [];
  for (const i of items || []) {
    if (i.type === "folder") out.push(...flattenRootlist(i.items));
    else out.push(i);
  }
  return out;
}

// Raccourcis de l'accueil : les 8 premiers éléments de la bibliothèque, dans l'ordre
// de la barre latérale (épinglés puis récents). Fonctionne aussi hors-ligne.
async function loadShortcuts() {
  const r = await Spicetify.Platform.LibraryAPI.getContents({ limit: 20, offset: 0 });
  const items = (r.items || [])
    .filter((i) => i.type !== "folder")
    .map((i) => ({ ...i, type: typeFromUri(i.uri) === "collection" ? "collection" : i.type }));
  if (!items.some((i) => i.type === "collection")) {
    const user = safe(() => Spicetify.Platform.username, null);
    if (user) items.unshift({ type: "collection", uri: `spotify:user:${user}:collection`, name: "Titres likés" });
  }
  return items.slice(0, 8);
}

// Rangée "Récents" : éléments récemment écoutés.
// 1. Si le client expose une API d'historique (nom contenant "Recent"), on l'utilise,
//    à condition qu'elle renvoie des éléments complets (nom + adresse).
// 2. Sinon, secours : la bibliothèque dans l'ordre "Récents" de la barre latérale
//    (fonctionne aussi hors-ligne). La console indique la source utilisée.
const withCollectionType = (i) => ({ ...i, type: typeFromUri(i.uri) === "collection" ? "collection" : i.type });

async function loadRecents(limit = 20) {
  const P = Spicetify.Platform;
  for (const key of Object.keys(P).filter((k) => /recent/i.test(k))) {
    const api = P[key];
    for (const m of ["getContexts", "getContents", "getItems", "getRecentlyPlayed"]) {
      if (!api || typeof api[m] !== "function") continue;
      try {
        const r = await api[m]({ limit, offset: 0 });
        const raw = (Array.isArray(r) ? r : r && (r.items || r.contexts || r.contents)) || [];
        const items = raw
          .map((x) => (x && x.uri ? x : x && (x.context || x.item)))
          .filter((x) => x && x.uri && x.name && x.type !== "folder");
        if (items.length) {
          console.log(`[Walktify] Récents via ${key}.${m}`);
          return items.slice(0, limit).map(withCollectionType);
        }
      } catch (e) {
        console.warn(`[Walktify] Récents : ${key}.${m} refusé`, e);
      }
    }
  }
  const r = await P.LibraryAPI.getContents({ limit, offset: 0 });
  console.log("[Walktify] Récents via la bibliothèque (ordre « Récents » de la barre latérale)");
  return (r.items || []).filter((i) => i.type !== "folder").map(withCollectionType);
}

async function loadHome() {
  const P = Spicetify.Platform;
  const rows = [];
  try {
    const sc = await loadShortcuts();
    for (let i = 0; i < sc.length; i += 4) rows.push({ kind: "tiles", key: "tiles" + i, items: sc.slice(i, i + 4) });
  } catch (e) {
    console.warn("[Walktify] raccourcis :", e);
  }
  try {
    const recents = await loadRecents();
    if (recents.length) rows.push({ kind: "cards", key: "recents", title: "Récents", items: recents });
  } catch (e) {
    console.warn("[Walktify] récents :", e);
  }
  try {
    const r = await P.RootlistAPI.getContents();
    const pl = flattenRootlist(r.items).filter((i) => i.type === "playlist");
    if (pl.length) rows.push({ kind: "cards", key: "playlists", title: "Tes playlists", items: pl });
  } catch (e) {
    console.warn("[Walktify] playlists :", e);
  }
  try {
    const r = await P.LibraryAPI.getContents({ limit: 50, offset: 0 });
    const byType = {};
    for (const i of r.items || []) {
      if (i.type === "folder" || i.type === "playlist") continue;
      (byType[i.type] = byType[i.type] || []).push(i);
    }
    for (const [type, items] of Object.entries(byType)) {
      rows.push({ kind: "cards", key: "lib-" + type, title: TYPE_LABELS[type] || type, items });
    }
  } catch (e) {
    console.warn("[Walktify] bibliothèque :", e);
  }
  return rows;
}

const mapPlatformTrack = (t) => ({
  uri: t.uri,
  name: t.name,
  artist: (t.artists || []).map((a) => a.name).join(", "),
  duration: t.duration && t.duration.milliseconds,
});
const mapGqlTrack = (t) => ({
  uri: t.uri,
  name: t.name,
  artist: ((t.artists && t.artists.items) || []).map((x) => x.profile && x.profile.name).join(", "),
  duration: t.duration && t.duration.totalMilliseconds,
});

// Charge toutes les pages d'une liste (les grandes playlists dépassent une page)
async function fetchAllPages(fetchPage, pageSize = 200, max = 3000) {
  const all = [];
  for (let offset = 0; offset < max; offset += pageSize) {
    const r = await fetchPage(offset, pageSize);
    const items = (r && r.items) || [];
    all.push(...items);
    const total = r && (r.totalLength || r.totalCount);
    if (items.length < pageSize || (total && all.length >= total)) break;
  }
  return all;
}

// Liste des titres d'une fiche. Chaque source est isolée et journalisée.
async function loadTracks(item) {
  try {
    if (item.type === "collection") {
      const items = await fetchAllPages((offset, limit) => Spicetify.Platform.LibraryAPI.getTracks({ limit, offset }));
      return items.map(mapPlatformTrack);
    }
    if (item.type === "playlist") {
      const items = await fetchAllPages((offset, limit) =>
        Spicetify.Platform.PlaylistAPI.getContents(item.uri, { limit, offset })
      );
      return items.map(mapPlatformTrack);
    }
    if (item.type === "album") {
      const data = await gql(["getAlbum", "queryAlbumTracks"], { uri: item.uri, locale: locale(), offset: 0, limit: 300 });
      const a = data.albumUnion || data.album || {};
      const items = (a.tracksV2 && a.tracksV2.items) || (a.tracks && a.tracks.items) || [];
      return items.map((x) => x.track || x).filter(Boolean).map(mapGqlTrack);
    }
    if (item.type === "artist") {
      const data = await gql(["queryArtistOverview"], { uri: item.uri, locale: locale(), includePrerelease: false });
      const top = data.artistUnion && data.artistUnion.discography && data.artistUnion.discography.topTracks;
      return ((top && top.items) || []).map((x) => x.track).filter(Boolean).map(mapGqlTrack);
    }
  } catch (e) {
    console.warn(`[Walktify] titres (${item.type}) :`, e);
  }
  return [];
}

// Recherche via le GraphQL interne (celui qu'utilise l'app elle-même).
// - Spotify 1.2.96 utilise "searchModalResults" ; "searchDesktop" existe encore mais est
//   périmé (refusé en 400) : il ne sert plus que de secours pour d'autres versions.
// - La réponse est une liste unique mélangée (topResultsV2.itemsV2) : on la trie par type.
// - L'API web publique (api.spotify.com) n'est pas utilisable : 429 pour le jeton du client.
const SEARCH_SECTIONS = [
  ["track", "Titres"],
  ["artist", "Artistes"],
  ["album", "Albums"],
  ["playlist", "Playlists"],
  ["show", "Podcasts"],
  ["episode", "Épisodes"],
  ["audiobook", "Livres audio"],
];

async function searchSpotify(query) {
  const data = await gql(["searchModalResults", "searchDesktop"], {
    searchTerm: query,
    offset: 0,
    limit: 20,
    numberOfTopResults: 20,
    includeAudiobooks: true,
    includeArtistHasConcertsField: false,
    includePreReleases: true,
    includeAlbumPreReleases: false,
    includeLocalConcertsField: false,
    includeAuthors: false,
    includeEpisodeContentRatingsV2: false,
  });
  const s = data.searchV2 || data.search || {};
  const list = (x) => ((x && (x.itemsV2 || x.items)) || []).map(normalize).filter(Boolean);

  // Résultats principaux + sections séparées si la version de Spotify en renvoie
  const all = [
    ...list(s.topResultsV2),
    ...list(s.tracksV2 || s.tracks),
    ...list(s.artists),
    ...list(s.albumsV2 || s.albums),
    ...list(s.playlists),
  ];
  const seen = new Set();
  const unique = all.filter((i) => !seen.has(i.uri) && seen.add(i.uri));

  const rows = [];
  for (const [type, title] of SEARCH_SECTIONS) {
    const items = unique.filter((i) => i.type === type);
    if (items.length) rows.push({ title, items });
  }
  return rows;
}

// ------------------------------------------------------------------ hors-ligne
// Service interne de téléchargement (celui qu'utilisent les pages natives de Spotify) :
//   getContexts / subscribeContexts({ uris })  -> état d'une playlist / d'un album / des Titres likés
//   getItems    / subscribeItems({ uris })     -> état de chaque titre
// Codes "state" observés : 0 = pas téléchargé, 3 = téléchargé. Les autres (1, 2…) sont
// supposés être "en attente" / "en cours" : traités comme un téléchargement en cours.
const offlineService = () => Spicetify.Platform.OfflineAPI._offline;
const offlineUser = () =>
  safe(() => Spicetify.Platform.OfflineAPI._username, null) ||
  safe(() => Spicetify.Platform.OfflineAPI.getEvents()._username, null) ||
  safe(() => Spicetify.Platform.username, null);

// Adresse connue du module hors-ligne. Titres likés : spotify:user:<identifiant>:collection
// (spotify:collection:tracks existe aussi, mais le module ne le suit pas).
function offlineUri(item) {
  return item.type === "collection" ? `spotify:user:${offlineUser()}:collection` : item.uri;
}

const seenStates = new Set();
function mapState(n) {
  if (n === 3) return "yes";
  if (n === 0 || n === undefined || n === null) return "no";
  if (!seenStates.has(n)) {
    seenStates.add(n);
    console.info(`[Walktify] code hors-ligne observé : ${n} (traité comme "en cours")`);
  }
  return "downloading";
}

function readContext(response, uri) {
  const c = response && response.contexts && response.contexts.find((x) => x.context && x.context.uri === uri);
  return c ? { state: mapState(c.context.state), pct: c.context.percentComplete || 0 } : null;
}

function readItems(response) {
  const out = {};
  for (const it of (response && response.items) || []) out[it.uri] = mapState(it.state);
  return out;
}

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function setDownload(item, add) {
  const uri = offlineUri(item);
  try {
    if (item.type === "collection") {
      // Le module "haut niveau" ignore les Titres likés : on passe par le service interne
      const off = offlineService();
      await (add ? off.addDownload({ uri }) : off.removeDownload({ uri }));
    } else {
      const api = Spicetify.Platform.OfflineAPI;
      await (add ? api.addDownload(uri) : api.removeDownload(uri));
    }
    console.log(`[Walktify] ${add ? "téléchargement" : "retrait"} demandé : ${uri}`);
  } catch (e) {
    console.warn(`[Walktify] ${add ? "téléchargement" : "retrait"} refusé pour ${uri} :`, e);
  }
}

// Nom affiché de l'utilisateur (le module hors-ligne ne connaît que son identifiant technique)
let userDisplayName = null;
safe(() =>
  Promise.resolve(Spicetify.Platform.UserAPI.getUser()).then((u) => {
    userDisplayName = u && (u.displayName || u.name);
  }).catch(() => { }),
  null
);

async function playTrack(context, track, index) {
  // Lit le titre DANS son contexte (playlist/album/titres likés) pour que la suite s'enchaîne
  if (context && DOWNLOADABLE.includes(context.type)) {
    try {
      await Spicetify.Player.playUri(context.uri, {}, { skipTo: { uri: track.uri, index } });
      return;
    } catch (e) {
      console.warn("[Walktify] lecture en contexte impossible, lecture du titre seul :", e);
    }
  }
  Spicetify.Player.playUri(track.uri);
}

// ------------------------------------------------------------------ lecteur
// Aléatoire amélioré (Smart Shuffle) : disponible selon le compte et la playlist
// (pas sur les albums, ni sur certaines playlists éditoriales). On lit l'état dans le
// lecteur interne et les éventuelles restrictions qui le concernent.
function smartShuffleInfo() {
  const api = Spicetify.Platform.PlayerAPI;
  const st = safe(() => api._state, null) || {};
  const settable = typeof api.setSmartShuffle === "function";
  const restr = { ...(st.restrictions || {}), ...(st.contextRestrictions || st.context_restrictions || {}) };
  const key = Object.keys(restr).find((k) => /smart/i.test(k));
  let allowed = settable;
  if (key) {
    const v = restr[key];
    allowed = settable && (/^can/i.test(key) ? !!v : !(Array.isArray(v) ? v.length : v));
  }
  return { on: !!st.smartShuffle, available: allowed };
}

// Aléatoire par playlist, comme la barre de lecture native :
//   ShuffleAPI.getShuffle(contexte)               -> mode actuel
//   ShuffleAPI.getAvailableShuffleModes(contexte) -> modes permis pour ce contexte
//   ShuffleAPI.setShuffle(contexte, mode, {…})    -> change de mode
// Modes observés : 0 = désactivé, 1 = aléatoire, 2 = aléatoire amélioré.
// Secours pour les versions sans ShuffleAPI : l'aléatoire simple du lecteur.
const SHUFFLE_OFF = 0, SHUFFLE_ON = 1, SHUFFLE_SMART = 2;
const shuffleApi = () => Spicetify.Platform.ShuffleAPI;

async function getShuffleMode(ctx) {
  const api = shuffleApi();
  if (api) return Number(await api.getShuffle(ctx)) || 0;
  const st = safe(() => Spicetify.Platform.PlayerAPI._state, {}) || {};
  return st.smartShuffle ? SHUFFLE_SMART : st.shuffle ? SHUFFLE_ON : SHUFFLE_OFF;
}

async function getShuffleModes(ctx) {
  const api = shuffleApi();
  if (!api) return [SHUFFLE_OFF, SHUFFLE_ON];
  const r = await api.getAvailableShuffleModes(ctx);
  const modes = (r || []).filter((m) => m !== null && m !== undefined).map(Number);
  return modes.length ? modes : [SHUFFLE_OFF, SHUFFLE_ON];
}

async function setShuffleMode(ctx, mode) {
  const api = shuffleApi();
  if (api) return api.setShuffle(ctx, mode, { interactionId: null, pageInstanceId: null });
  return Spicetify.Platform.PlayerAPI.setShuffle(mode !== SHUFFLE_OFF);
}

// État de l'aléatoire pour un contexte (playlist affichée ou lecture en cours)
function useShuffle(ctx, playerKey, onError) {
  const [st, setSt] = useState({ ctx: null, mode: SHUFFLE_OFF, modes: [SHUFFLE_OFF, SHUFFLE_ON] });
  const refresh = () => {
    if (!ctx) return;
    Promise.all([getShuffleMode(ctx), getShuffleModes(ctx)]).then(
      ([mode, modes]) => setSt({ ctx, mode, modes }),
      (e) => console.warn("[Walktify] état de l'aléatoire :", e)
    );
  };
  useEffect(() => {
    refresh();
  }, [ctx, playerKey]);
  const cycle = async () => {
    if (!ctx) return;
    const order = [SHUFFLE_OFF, SHUFFLE_ON, SHUFFLE_SMART].filter((m) => st.modes.includes(m));
    const next = order[(order.indexOf(st.mode) + 1) % order.length];
    try {
      await setShuffleMode(ctx, next);
    } catch (e) {
      console.warn("[Walktify] changement d'aléatoire refusé :", e);
      onError && onError(next === SHUFFLE_SMART ? "Aléatoire amélioré indisponible ici" : "Impossible de changer l'aléatoire");
    }
    setTimeout(refresh, 250);
  };
  return { ...st, ctx: st.ctx === ctx ? ctx : null, cycle };
}

function shuffleButton(shuf, extra) {
  const smartOk = shuf.modes.includes(SHUFFLE_SMART);
  const mode = shuf.ctx ? shuf.mode : SHUFFLE_OFF;
  return {
    id: "shuffle",
    icon: mode === SHUFFLE_SMART ? "smartShuffle" : "shuffle",
    on: mode !== SHUFFLE_OFF,
    hint:
      mode === SHUFFLE_SMART
        ? "Aléatoire amélioré — appuie pour désactiver"
        : mode === SHUFFLE_ON
          ? smartOk
            ? "Aléatoire — appuie pour l'aléatoire amélioré"
            : "Aléatoire — appuie pour désactiver"
          : "Aléatoire désactivé",
    activate: shuf.cycle,
    ...extra,
  };
}

// Ajout du titre en cours à une playlist : plusieurs méthodes selon les versions de Spotify
async function addToPlaylist(playlistUri, trackUri) {
  const api = Spicetify.Platform.PlaylistAPI;
  const attempts = [
    ["PlaylistAPI.add (fin)", () => api.add(playlistUri, [trackUri], { after: "end" })],
    ["PlaylistAPI.add", () => api.add(playlistUri, [trackUri], {})],
    [
      "core-playlist",
      () =>
        Spicetify.CosmosAsync.post(`sp://core-playlist/v1/playlist/${playlistUri}`, {
          operation: "add",
          uris: [trackUri],
          after: "end",
        }),
    ],
  ];
  for (const [name, fn] of attempts) {
    try {
      await fn();
      console.log(`[Walktify] ajout à ${playlistUri} réussi via ${name}`);
      return;
    } catch (e) {
      console.warn(`[Walktify] ajout via ${name} refusé :`, e);
    }
  }
  throw new Error("aucune méthode d'ajout n'a fonctionné");
}

// Playlists où l'on peut ajouter des titres : les siennes et les collaboratives
async function loadEditablePlaylists() {
  const r = await Spicetify.Platform.RootlistAPI.getContents();
  const all = flattenRootlist(r.items).filter((i) => i.type === "playlist");
  const me = offlineUser();
  const mine = all.filter(
    (p) =>
      p.isOwnedBySelf ||
      p.isCollaborative ||
      p.collaborative ||
      (p.owner && (p.owner.username === me || (p.owner.uri || "").endsWith(":" + me)))
  );
  return mine.length ? mine : all; // si les champs manquent, on laisse Spotify refuser au besoin
}

// Titre ajouté par l'aléatoire amélioré (absent de la playlist d'origine) ?
// Marqueur observé : metadata.provider = "enhanced_recommendation". Attention, le champ
// "smart-shuffle-signals" est présent sur TOUS les titres joués dans ce mode : inutilisable.
function isSmartShuffleItem(it) {
  const provider = safe(() => it.metadata.provider, "") || "";
  return provider === "enhanced_recommendation" || /recommendation/i.test(provider);
}

window.walktifyItem = function () {
  const it = safe(() => Spicetify.Player.data.item, null);
  const out = { titre: it && it.name, provider: it && it.provider, metadata: it && it.metadata, detecte: isSmartShuffleItem(it) };
  console.log("[Walktify] titre en cours :", out);
  return out;
};

const currentContextUri = (d = Spicetify.Player.data) =>
  safe(() => (d.context && d.context.uri) || d.context_uri, null) ||
  safe(() => Spicetify.Platform.PlayerAPI._state.context.uri, null);

function readPlayer() {
  const P = Spicetify.Player;
  const it = P.data && P.data.item;
  const md = (it && it.metadata) || {};
  const cover = fixImage(md.image_xlarge_url || md.image_large_url || md.image_url) || imageUrl(it);
  return {
    title: (it && (it.name || md.title)) || null,
    artist: (it && ((it.artists && it.artists.map((a) => a.name).join(", ")) || md.artist_name)) || "",
    cover: cover || null,
    playing: safe(() => P.isPlaying(), false),
    shuffle: safe(() => P.getShuffle(), false),
    smart: smartShuffleInfo(),
    liked: safe(() => P.getHeart(), false),
    volume: safe(() => P.getVolume(), 1), // 0 à 1 : volume de Spotify (pas le volume système)
    smartItem: isSmartShuffleItem(it),
    contextUri: currentContextUri(),
    repeat: safe(() => P.getRepeat(), 0), // 0 = non, 1 = contexte, 2 = titre
    progress: safe(() => P.getProgress(), 0),
    duration: safe(() => P.getDuration(), 0),
  };
}

function usePlayer(live) {
  const [state, setState] = useState(readPlayer);
  useEffect(() => {
    const update = () => setState(readPlayer());
    Spicetify.Player.addEventListener("songchange", update);
    Spicetify.Player.addEventListener("onplaypause", update);
    return () => {
      Spicetify.Player.removeEventListener("songchange", update);
      Spicetify.Player.removeEventListener("onplaypause", update);
    };
  }, []);
  // Progression rafraîchie seulement quand l'écran "En cours" est affiché
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setState(readPlayer()), 1000);
    return () => clearInterval(t);
  }, [live]);
  return [state, () => setState(readPlayer())];
}

// ------------------------------------------------------------------ file d'attente
// Même service que la file d'attente native :
//   PlayerAPI.getQueue()                    -> { current, queued, nextUp } (titres ajoutés, puis suite du contexte)
//   PlayerAPI.addToQueue([{ uri }])         -> ajoute après les titres déjà ajoutés
//   PlayerAPI.removeFromQueue([{ uri, uid }])
//   PlayerAPI.skipToNext({ uri, uid })      -> saute à ce titre (comme un clic dans la file native)
//   événement "queue_update" sur PlayerAPI.getEvents()
const playerApi = () => Spicetify.Platform.PlayerAPI;
const queueRef = (t) => ({ uri: t.uri, uid: t.uid || null });

function addToQueue(uri) {
  const api = playerApi();
  return typeof api.addToQueue === "function" ? api.addToQueue([{ uri }]) : Spicetify.addToQueue([{ uri }]);
}

const mapQueueTrack = (t) => {
  const ms = t.duration && t.duration.milliseconds;
  return {
    uri: t.uri,
    uid: t.uid,
    name: t.name,
    artist: (t.artists || []).map((a) => a.name).join(", "),
    duration: ms > 0 ? ms : undefined, // -1 quand Spotify ne la connaît pas
    cover: imageUrl(t.album),
  };
};

function useQueue(active) {
  const read = () => safe(() => playerApi().getQueue(), null);
  const [queue, setQueue] = useState(read);
  useEffect(() => {
    if (!active) return;
    const update = (e) => setQueue((e && e.data) || read());
    update();
    const events = safe(() => playerApi().getEvents(), null);
    const off = events && safe(() => events.addListener("queue_update", update), null);
    return () => (typeof off === "function" ? off() : events && safe(() => events.removeListener("queue_update", update)));
  }, [active]);
  return queue;
}

// ------------------------------------------------------------------ historique
// Spotify n'expose que les playlists/albums récents, pas les titres écoutés : Walktify tient
// son propre journal (le plus récent en premier), conservé dans le stockage local.
// Un titre passé moins de 8 s après son début n'est pas gardé.
const HISTORY_KEY = "walktify:history";
const HISTORY_MAX = 200;
const HISTORY_MIN_MS = 8000;
const playHistory = safe(() => {
  const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
  return Array.isArray(saved) ? saved : [];
}, []);

function recordPlayed() {
  const d = Spicetify.Player.data;
  const it = d && d.item;
  if (!it || !/^spotify:(track|episode|local):/.test(it.uri || "")) return; // pas les publicités
  const last = playHistory[0];
  if (last && last.uri === it.uri) return;
  if (last && Date.now() - last.at < HISTORY_MIN_MS) playHistory.shift();
  const md = it.metadata || {};
  // Contexte gardé pour relire le titre dans sa playlist / son album, sauf s'il n'en fait
  // pas partie (ajouté à la file d'attente, lecture automatique, aléatoire amélioré)
  const inContext = (!it.provider || it.provider === "context") && !isSmartShuffleItem(it);
  playHistory.unshift({
    uri: it.uri,
    name: it.name || md.title || "",
    artist: (it.artists && it.artists.map((a) => a.name).join(", ")) || md.artist_name || "",
    cover: fixImage(md.image_url || md.image_large_url) || null,
    context: inContext ? currentContextUri(d) : null,
    at: Date.now(),
  });
  playHistory.length = Math.min(playHistory.length, HISTORY_MAX);
  safe(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(playHistory)));
}
// Enregistré ici (et non dans l'interface) pour suivre la lecture même hors de l'écran Historique
safe(() => {
  Spicetify.Player.addEventListener("songchange", recordPlayed);
  recordPlayed(); // titre déjà chargé au démarrage
});

function playFromHistory(entry) {
  playTrack(entry.context ? { type: typeFromUri(entry.context), uri: entry.context } : null, entry);
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function dayLabel(ts) {
  const d = new Date(ts);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return capitalize(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
}
const fmtClock = (ts) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

// ------------------------------------------------------------------ composants d'affichage
function Cover({ item, url, className }) {
  const src = url || imageUrl(item);
  if (src) return h("img", { className, src, alt: "" });
  if (item && item.type === "collection")
    return h("div", { className: className + " wk-cover-liked" }, h(Icon, { name: "heart" }));
  return h("div", { className: className + " wk-cover-empty" }, ((item && item.name) || "♪").slice(0, 1));
}

const focusAttr = (on) => (on ? { "data-wk-focused": "1" } : {});

function TilesRow({ row, col, active }) {
  return h(
    "div",
    { className: "wk-tiles" },
    row.items.map((it, c) => {
      const on = active && c === col;
      return h(
        "div",
        { key: (it.uri || "") + c, className: "wk-tile" + (on ? " focused" : ""), ...focusAttr(on) },
        h(Cover, { item: it, className: "wk-tile-cover" }),
        h("div", { className: "wk-tile-name" }, it.name)
      );
    })
  );
}

function CardsRow({ row, col, active }) {
  return h(
    "div",
    { className: "wk-row" },
    h("div", { className: "wk-row-title" }, row.title),
    h(
      "div",
      { className: "wk-track" },
      row.items.map((it, c) => {
        const on = active && c === col;
        return h(
          "div",
          { key: (it.uri || "") + c, className: "wk-card" + (on ? " focused" : ""), ...focusAttr(on) },
          h(Cover, { item: it, className: "wk-cover" }),
          h("div", { className: "wk-card-title" }, it.name),
          it.subtitle && h("div", { className: "wk-card-sub" }, it.subtitle)
        );
      })
    )
  );
}

function Buttons({ items, col, active }) {
  return h(
    "div",
    { className: "wk-buttons" },
    items.map((b, i) => {
      const on = active && i === col;
      return h(
        "div",
        {
          key: b.id,
          className: "wk-btn" + (b.round ? " round" : "") + (b.on ? " toggled" : "") + (on ? " focused" : ""),
          ...focusAttr(on),
        },
        b.icon && h(Icon, { name: b.icon }),
        b.label && h("span", null, b.label),
        b.badge && h("span", { className: "wk-btn-badge" }, b.badge)
      );
    })
  );
}

// Couleur dominante d'une pochette (pour le dégradé de l'en-tête, comme Spotify)
const colorCache = {};
// Les playlists sans pochette ont une "mosaïque" (spotify:mosaic:id1:id2:…) que le navigateur
// ne peut pas lire en canvas (erreur CORS) : on prend la première image de la mosaïque.
function colorSource(url) {
  if (!url) return null;
  if (url.startsWith("spotify:mosaic:")) return "https://i.scdn.co/image/" + url.split(":")[2];
  return /^https?:/.test(url) ? url : null;
}
function useCoverColor(url, fallback) {
  const [color, setColor] = useState((url && colorCache[url]) || fallback);
  useEffect(() => {
    if (!url) return setColor(fallback);
    if (colorCache[url]) return setColor(colorCache[url]);
    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = cv.height = 12;
        const ctx = cv.getContext("2d");
        ctx.drawImage(img, 0, 0, 12, 12);
        const d = ctx.getImageData(0, 0, 12, 12).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
        }
        const n = d.length / 4;
        const k = 0.8; // un peu assombri pour garder le texte blanc lisible
        const col = `rgb(${Math.round((r / n) * k)},${Math.round((g / n) * k)},${Math.round((b / n) * k)})`;
        colorCache[url] = col;
        if (alive) setColor(col);
      } catch (_) {
        if (alive) setColor(fallback);
      }
    };
    img.onerror = () => alive && setColor(fallback);
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return color;
}

const DETAIL_TYPES = { playlist: "Playlist", collection: "Playlist", album: "Album", artist: "Artiste", show: "Podcast" };

function fmtTotal(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

function detailMeta(it, tracks, offline) {
  const parts = [];
  const owner =
    it.type === "collection"
      ? userDisplayName || safe(() => Spicetify.Platform.username, null)
      : it.owner && (it.owner.displayName || it.owner.name || it.owner.username);
  const artists = it.artists && it.artists.map((a) => a.name || (a.profile && a.profile.name)).filter(Boolean).join(", ");
  if (owner) parts.push(owner);
  else if (artists) parts.push(artists);
  else if (it.subtitle) parts.push(it.subtitle);
  if (tracks && tracks.length) {
    const total = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    parts.push(`${tracks.length} titre${tracks.length > 1 ? "s" : ""}${total ? ", " + fmtTotal(total) : ""}`);
  }
  if (offline && offline.state === "downloading") parts.push(`Téléchargement ${Math.round(offline.pct)} %`);
  return parts.join(" • ");
}

function ActionBar({ items, col, active }) {
  return h(
    "div",
    { className: "wk-actions" },
    items.map((b, i) => {
      const on = active && i === col;
      return h(
        "div",
        {
          key: b.id,
          className: `wk-act wk-act-${b.id}` + (b.on ? " toggled" : "") + (b.extra ? " " + b.extra : "") + (on ? " focused" : ""),
          ...focusAttr(on),
        },
        h(Icon, { name: b.icon })
      );
    }),
    // Pas de survol ni d'infobulle sur Walky : on écrit ce que fait le bouton sélectionné
    active && items[col] && h("div", { className: "wk-act-hint" }, items[col].hint)
  );
}

function DetailHeader({ row, col, active }) {
  const it = row.item;
  const cover = imageUrl(it);
  const color = useCoverColor(colorSource(cover), it.type === "collection" ? "rgb(80,56,160)" : "rgb(83,83,83)");
  const len = (it.name || "").length;
  return h(
    "div",
    { className: "wk-hero-wrap", style: { "--wk-hero": color } },
    h(
      "div",
      { className: "wk-hero" },
      h(Cover, { item: it, className: "wk-hero-cover" }),
      h(
        "div",
        { className: "wk-hero-info" },
        h("div", { className: "wk-hero-type" }, DETAIL_TYPES[it.type] || it.type),
        h("div", { className: "wk-hero-title" + (len > 40 ? " xl" : len > 18 ? " l" : "") }, it.name),
        h("div", { className: "wk-hero-meta" }, detailMeta(it, row.tracks, row.offline))
      )
    ),
    h(ActionBar, { items: row.items, col, active })
  );
}

// Rangée de titre. Élément 0 = le titre (Entrée : lire) ; élément 1 facultatif = petit bouton
// en bout de rangée (file d'attente), atteint avec Droite et visible sur la rangée sélectionnée.
function TrackRow({ row, col, active }) {
  const t = row.track;
  const btn = row.items[1];
  const onBtn = active && !!btn && col === 1;
  return h(
    "div",
    {
      className: "wk-tr" + (row.playing ? " playing" : "") + (active ? " focused" : "") + (onBtn ? " on-btn" : ""),
      ...focusAttr(active),
    },
    row.cover !== undefined
      ? h(Cover, { url: row.cover, item: { name: t.name }, className: "wk-tr-cover" })
      : h("div", { className: "wk-tr-num" }, row.index + 1),
    h(
      "div",
      { className: "wk-tr-main" },
      h("div", { className: "wk-tr-name" }, t.name),
      h(
        "div",
        { className: "wk-tr-artist" },
        // Pastille verte comme dans Spotify : pleine = téléchargé, contour = en cours
        row.offline === "yes" && h(Icon, { name: "dlDone", className: "wk-tr-dl" }),
        row.offline && row.offline !== "yes" && row.offline !== "no" && h(Icon, { name: "dlCircle", className: "wk-tr-dl pending" }),
        h("span", { className: "wk-tr-artist-text" }, t.artist)
      )
    ),
    onBtn && h("div", { className: "wk-tr-hint" }, btn.hint),
    h("div", { className: "wk-tr-dur" }, row.right !== undefined ? row.right : fmtTime(t.duration)),
    btn && h("div", { className: "wk-tr-btn" + (onBtn ? " focused" : "") }, h(Icon, { name: btn.icon }))
  );
}

function InputRow({ row, active, inputRef }) {
  return h(
    "div",
    { className: "wk-search" + (active ? " focused" : ""), ...focusAttr(active) },
    h(Icon, { name: "search" }),
    h("input", {
      ref: inputRef,
      className: "wk-input",
      value: row.value,
      placeholder: "Que veux-tu écouter ?",
      onChange: (e) => row.onChange(e.target.value),
    })
  );
}

// "En cours" : grille pochette | infos. Trois rangées focusables :
//   0 = like / ajouter à une playlist, 1 = barre de progression, 2 = boutons de lecture
function NpTop({ row, col, active }) {
  const p = row.player;
  return h(
    "div",
    { className: "wk-np-top" }, // display: contents -> ses enfants se placent dans la grille
    h(Cover, { url: p.cover, item: { name: p.title }, className: "wk-np-cover" }),
    h(
      "div",
      { className: "wk-np-head" },
      h(
        "div",
        { className: "wk-np-text" },
        h("div", { className: "wk-np-title" }, p.title || "Rien en lecture"),
        h(
          "div",
          { className: "wk-np-artist" },
          p.smartItem && h(Icon, { name: "smartBadge", className: "wk-smart-badge" }),
          p.artist
        )
      ),
      h(ActionBar, { items: row.items, col, active })
    )
  );
}

function NpSeek({ row, active }) {
  const p = row.player;
  const pct = p.duration ? Math.min(100, (100 * p.progress) / p.duration) : 0;
  return h(
    "div",
    { className: "wk-seek" + (active ? " focused" : ""), ...focusAttr(active) },
    h(
      "div",
      { className: "wk-progress" },
      h("div", { className: "wk-progress-fill", style: { width: pct + "%" } }),
      h("div", { className: "wk-progress-knob", style: { left: pct + "%" } })
    ),
    h(
      "div",
      { className: "wk-np-times" },
      h("span", null, fmtTime(p.progress)),
      active && h("span", { className: "wk-seek-hint" }, "◀ ▶ pour avancer / reculer"),
      h("span", null, fmtTime(p.duration))
    )
  );
}

function NpButtons({ row, col, active }) {
  return h("div", { className: "wk-np-buttons" }, h(Buttons, { items: row.items, col, active }));
}

// Liste de playlists pour "ajouter à une playlist"
function PickRow({ row, active }) {
  const pl = row.playlist;
  return h(
    "div",
    { className: "wk-tr wk-pick" + (active ? " focused" : ""), ...focusAttr(active) },
    h(Cover, { item: pl, className: "wk-pick-cover" }),
    h(
      "div",
      { className: "wk-tr-main" },
      h("div", { className: "wk-tr-name" }, pl.name),
      h("div", { className: "wk-tr-artist" }, h("span", { className: "wk-tr-artist-text" }, `${pl.totalLength || ""}`.trim() ? `${pl.totalLength} titres` : "Playlist"))
    )
  );
}

// Rangée 4 de "En cours" : volume (gauche/droite = −/+, Entrée = couper / rétablir le son)
function NpVolume({ row, active }) {
  const v = clamp(row.player.volume || 0, 0, 1);
  const pct = Math.round(v * 100);
  return h(
    "div",
    { className: "wk-vol" + (active ? " focused" : ""), ...focusAttr(active) },
    h(Icon, { name: v === 0 ? "volMute" : v < 0.5 ? "volLow" : "volHigh" }),
    h(
      "div",
      { className: "wk-vol-bar" },
      h("div", { className: "wk-vol-fill", style: { width: pct + "%" } }),
      h("div", { className: "wk-vol-knob", style: { left: pct + "%" } })
    ),
    h("div", { className: "wk-vol-pct" }, active ? `${pct} % · Entrée : ${v === 0 ? "rétablir" : "couper"}` : `${pct} %`)
  );
}

// Volume par pas de 5 %, 10 % si on tourne vite ; mémorise le niveau avant coupure
const volState = { last: 0, streak: 0, beforeMute: 0.5 };
function volumeBy(dir) {
  const now = Date.now();
  volState.streak = now - volState.last < 300 ? volState.streak + 1 : 0;
  volState.last = now;
  const step = volState.streak > 4 ? 0.1 : 0.05;
  const P = Spicetify.Player;
  const v = safe(() => P.getVolume(), 0.5);
  P.setVolume(clamp(Math.round((v + dir * step) * 100) / 100, 0, 1));
}
function toggleMute() {
  const P = Spicetify.Player;
  const v = safe(() => P.getVolume(), 0.5);
  if (v > 0) {
    volState.beforeMute = v;
    P.setVolume(0);
  } else P.setVolume(volState.beforeMute || 0.5);
}

// Avance/recul dans le titre, accéléré quand on tourne la molette vite
const seekState = { last: 0, streak: 0 };
function seekBy(dir) {
  const now = Date.now();
  seekState.streak = now - seekState.last < 350 ? Math.min(seekState.streak + 1, 30) : 0;
  seekState.last = now;
  const step = seekState.streak > 12 ? 20000 : seekState.streak > 5 ? 10000 : 5000;
  const P = Spicetify.Player;
  const dur = safe(() => P.getDuration(), 0);
  const pos = safe(() => P.getProgress(), 0);
  P.seek(clamp(pos + dir * step, 0, Math.max(0, dur - 1000)));
}

function Row(props) {
  switch (props.row.kind) {
    case "tiles":
      return h(TilesRow, props);
    case "cards":
      return h(CardsRow, props);
    case "detailHeader":
      return h(DetailHeader, props);
    case "track":
      return h(TrackRow, props);
    case "input":
      return h(InputRow, props);
    case "npTop":
      return h(NpTop, props);
    case "npSeek":
      return h(NpSeek, props);
    case "npVolume":
      return h(NpVolume, props);
    case "pick":
      return h(PickRow, props);
    case "npButtons":
      return h(NpButtons, props);
    case "message":
      return h("div", { className: "wk-message" }, props.row.text);
    case "title":
      return h("div", { className: "wk-list-title" }, props.row.text);
    default:
      return h("div");
  }
}

// ------------------------------------------------------------------ application
let nextId = 1;
const newScreen = (screen) => ({ id: nextId++, focus: { row: 0, cols: [] }, ...screen });

function Walktify() {
  const [homeRows, setHomeRows] = useState(null);
  const [stack, setStack] = useState(() => [newScreen({ type: "home" })]);
  const [zone, setZone] = useState("content"); // "content" | "rail"
  const [railIndex, setRailIndex] = useState(0);
  const top = stack[stack.length - 1];
  const section =
    top.type === "nowplaying" || top.type === "pick"
      ? "nowplaying"
      : top.type === "queue" || top.type === "history"
        ? top.type
        : stack.some((sc) => sc.type === "search")
          ? "search"
          : "home";
  const [player, refreshPlayer] = usePlayer(top.type === "nowplaying");
  const queue = useQueue(top.type === "queue");
  const shuffleCtx =
    top.type === "detail" && ["playlist", "album", "collection"].includes(top.item.type)
      ? offlineUri(top.item) // Titres likés : spotify:user:<identifiant>:collection, comme le lecteur
      : top.type === "nowplaying"
        ? player.contextUri
        : null;
  const shuf = useShuffle(shuffleCtx, `${player.shuffle}|${player.smart && player.smart.on}|${player.contextUri}`, (m) =>
    showToast(m)
  );
  const inputRef = useRef(null);
  const contentRef = useRef(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = (text) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };
  const searchTimer = useRef(null);

  // Action Spotify avec message en cas d'échec (détails dans la console)
  const attempt = (fn, failText, okText) =>
    Promise.resolve()
      .then(fn)
      .then(
        () => okText && showToast(okText),
        (e) => {
          console.warn(`[Walktify] ${failText} :`, e);
          showToast(failText);
        }
      );

  // Petit bouton "ajouter à la file d'attente" en bout de rangée de titre
  const queueButton = (t) => ({
    id: "queue",
    icon: "queueAdd",
    hint: "Ajouter à la file d'attente",
    activate: () => attempt(() => addToQueue(t.uri), "Impossible d'ajouter à la file d'attente", `« ${t.name} » ajouté à la file d'attente`),
  });

  // ---------- pile d'écrans
  const updateScreen = (id, patch) =>
    setStack((s) => s.map((sc) => (sc.id === id ? { ...sc, ...(typeof patch === "function" ? patch(sc) : patch) } : sc)));

  const push = (screen) => {
    const sc = newScreen(screen);
    setStack((s) => [...s, sc]);
    setZone("content");
    return sc.id;
  };

  function openItem(item) {
    if (item.type === "track" || item.type === "episode") {
      Spicetify.Player.playUri(item.uri);
      return;
    }
    const id = push({ type: "detail", item, tracks: null, offline: null, trackStates: null });
    loadTracks(item).then((tracks) => updateScreen(id, { tracks }));
  }

  function goRail(target) {
    setZone("content");
    if (target === "settings") Spicetify.Platform.History.push("/preferences"); // réglages natifs
    else if (target === "home") setStack((s) => [s[0]]);
    else if (target === "search") {
      const existing = stack.find((sc) => sc.type === "search");
      setStack((s) => [s[0], existing || newScreen({ type: "search", query: "", results: null })]);
    } else if (target === "nowplaying" && top.type !== "nowplaying") {
      push({ type: "nowplaying", focus: { row: 2, cols: [0, 0, 2, 0] } }); // focus sur lecture/pause
    } else if (target === "queue" || target === "history") {
      // Comme "En cours" : s'ouvre par-dessus l'écran actuel (Retour y ramène) ; déjà ouvert -> on y revient
      const i = stack.findIndex((sc) => sc.type === target);
      if (i >= 0) setStack((s) => s.slice(0, i + 1));
      else push({ type: target });
    }
  }

  function back() {
    if (zone === "rail") return setZone("content");
    if (stack.length > 1) setStack((s) => s.slice(0, -1));
    else Spicetify.Platform.History.goBack();
  }

  function onQueryChange(value) {
    const id = top.id;
    updateScreen(id, { query: value });
    clearTimeout(searchTimer.current);
    if (!value.trim()) return updateScreen(id, { results: null });
    searchTimer.current = setTimeout(() => runSearch(id, value), 500);
  }

  function runSearch(id, value) {
    updateScreen(id, { results: "loading" });
    searchSpotify(value)
      .then((results) => updateScreen(id, { results }))
      .catch((e) => {
        console.warn("[Walktify] recherche :", e);
        updateScreen(id, { results: "error" });
      });
  }

  // ---------- rangées de l'écran courant
  const withActivate = (items) => items.map((it) => ({ ...it, activate: () => openItem(it) }));

  function buildRows() {
    if (top.type === "home") {
      if (!homeRows) return [{ kind: "message", key: "m", text: "Chargement…", items: [] }];
      if (!homeRows.length) return [{ kind: "message", key: "m", text: "Bibliothèque vide ou illisible", items: [] }];
      return homeRows.map((r) => ({ ...r, items: withActivate(r.items) }));
    }

    if (top.type === "detail") {
      const it = top.item;
      const P = Spicetify.Player;
      // Cette fiche est-elle le contexte en cours de lecture ?
      // Titres likés : le lecteur les désigne sous plusieurs formes (…:collection, spotify:collection:tracks…)
      const ctx = player.contextUri || "";
      const isCurrent =
        it.type === "collection"
          ? /(^spotify:collection|:collection)(:tracks)?$/.test(ctx)
          : !!ctx && (ctx === it.uri || ctx === offlineUri(it));
      const btns = [{ id: "play", icon: "play", hint: "Lire depuis le début", activate: () => P.playUri(it.uri) }];
      if (isCurrent) {
        btns.push({
          id: "pause",
          icon: player.playing ? "pause" : "play",
          hint: player.playing ? "Pause" : "Reprendre",
          activate: () => P.togglePlay(),
        });
      }
      btns.push(shuffleButton(shuf));
      if (DOWNLOADABLE.includes(it.type)) {
        const off = top.offline; // { state, pct } ou null pendant le chargement
        const st = off && off.state;
        // Retirer un téléchargement se confirme par un second appui (comme la confirmation de Spotify)
        const confirming = top.confirmRemove && Date.now() - top.confirmRemove < 4000;
        btns.push({
          id: "dl",
          icon: st === "yes" ? "dlDone" : "dlCircle",
          on: st === "yes",
          extra: confirming ? "confirm" : st === "downloading" ? "pending" : "",
          hint: !off
            ? "…"
            : confirming
              ? "Appuie encore pour retirer du hors-ligne"
              : st === "yes"
                ? "Téléchargé — retirer du hors-ligne"
                : st === "downloading"
                  ? `Téléchargement ${Math.round(off.pct)} % — appuie pour annuler`
                  : "Télécharger",
          activate: () => {
            if (!off) return;
            if (st === "no") return setDownload(it, true);
            if (!confirming) {
              updateScreen(top.id, { confirmRemove: Date.now() });
              setTimeout(() => updateScreen(top.id, { confirmRemove: null }), 4000);
              return;
            }
            updateScreen(top.id, { confirmRemove: null });
            setDownload(it, false);
          },
        });
      }
      const rows = [{ kind: "detailHeader", key: "header", item: it, tracks: top.tracks, offline: top.offline, items: btns }];
      if (top.tracks === null) rows.push({ kind: "message", key: "loading", text: "Chargement des titres…", items: [] });
      (top.tracks || []).forEach((t, i) =>
        rows.push({
          kind: "track",
          key: t.uri + i,
          track: t,
          index: i,
          offline: top.trackStates ? top.trackStates[t.uri] : null,
          items: [{ activate: () => playTrack(it, t, i) }, queueButton(t)],
        })
      );
      return rows;
    }

    if (top.type === "search") {
      const rows = [
        {
          kind: "input",
          key: "input",
          value: top.query,
          onChange: onQueryChange,
          items: [{ activate: () => top.query.trim() && runSearch(top.id, top.query) }],
        },
      ];
      if (top.results === "loading") rows.push({ kind: "message", key: "m", text: "Recherche…", items: [] });
      else if (top.results === "error")
        rows.push({ kind: "message", key: "m", text: "Recherche impossible (détails dans la console)", items: [] });
      else if (Array.isArray(top.results)) {
        if (!top.results.length) rows.push({ kind: "message", key: "m", text: "Aucun résultat", items: [] });
        top.results.forEach((r) => rows.push({ kind: "cards", key: r.title, title: r.title, items: withActivate(r.items) }));
      }
      return rows;
    }

    if (top.type === "pick") {
      const rows = [{ kind: "message", key: "title", text: `Ajouter « ${top.track.name} » à…`, items: [] }];
      if (top.playlists === null) rows.push({ kind: "message", key: "m", text: "Chargement des playlists…", items: [] });
      (top.playlists || []).forEach((pl) =>
        rows.push({
          kind: "pick",
          key: pl.uri,
          playlist: pl,
          items: [
            {
              activate: () =>
                addToPlaylist(pl.uri, top.track.uri).then(
                  () => {
                    showToast(`Ajouté à ${pl.name}`);
                    back();
                  },
                  () => showToast("Impossible d'ajouter à cette playlist")
                ),
            },
          ],
        })
      );
      return rows;
    }

    if (top.type === "queue") {
      if (!queue) return [{ kind: "message", key: "m", text: "File d'attente indisponible", items: [] }];
      const rows = [];
      if (queue.current) {
        const cur = mapQueueTrack(queue.current);
        rows.push({ kind: "title", key: "t-cur", text: "En cours de lecture", items: [] });
        rows.push({ kind: "track", key: "cur", track: cur, cover: cur.cover, playing: true, items: [] });
      }
      // Entrée : passer directement à ce titre ; petit bouton : le retirer de la file
      const addList = (key, title, list) => {
        if (!list || !list.length) return;
        rows.push({ kind: "title", key: "t-" + key, text: title, items: [] });
        list.map(mapQueueTrack).forEach((t, i) =>
          rows.push({
            kind: "track",
            key: key + (t.uid || t.uri) + i,
            track: t,
            cover: t.cover,
            items: [
              { activate: () => attempt(() => playerApi().skipToNext(queueRef(t)), "Impossible de lire ce titre") },
              {
                id: "remove",
                icon: "close",
                hint: "Retirer de la file d'attente",
                activate: () => attempt(() => playerApi().removeFromQueue([queueRef(t)]), "Impossible de retirer ce titre"),
              },
            ],
          })
        );
      };
      const ctxName = safe(() => Spicetify.Player.data.context.metadata.context_description, "");
      addList("q", "Suivant dans la file d'attente", queue.queued);
      addList("n", ctxName ? `Suivant de : ${ctxName}` : "Ensuite", queue.nextUp);
      if (!(queue.queued || []).length && !(queue.nextUp || []).length)
        rows.push({
          kind: "message",
          key: "m",
          text: "Rien à suivre. Pour ajouter un titre : sélectionne-le dans une playlist, ▶ puis Entrée.",
          items: [],
        });
      return rows;
    }

    if (top.type === "history") {
      if (!playHistory.length)
        return [{ kind: "message", key: "m", text: "Aucun titre écouté pour l'instant", items: [] }];
      const rows = [];
      let day = null;
      playHistory.forEach((e) => {
        const d = dayLabel(e.at);
        if (d !== day) rows.push({ kind: "title", key: "d-" + e.at, text: (day = d), items: [] });
        rows.push({
          kind: "track",
          key: e.uri + e.at,
          track: e,
          cover: e.cover,
          right: fmtClock(e.at),
          items: [{ activate: () => playFromHistory(e) }, queueButton(e)],
        });
      });
      return rows;
    }

    if (top.type === "nowplaying") {
      const P = Spicetify.Player;
      const trackUri = safe(() => P.data.item.uri, null);
      return [
        {
          kind: "npTop",
          key: "np-top",
          player,
          items: [
            {
              id: "like",
              icon: player.liked ? "heart" : "heartOutline",
              on: player.liked,
              hint: player.liked ? "Dans tes Titres likés — appuie pour retirer" : "Ajouter aux Titres likés",
              activate: () => P.toggleHeart(),
            },
            {
              id: "add",
              icon: "addCircle",
              hint: "Ajouter à une playlist",
              activate: () =>
                trackUri && push({ type: "pick", track: { uri: trackUri, name: player.title }, playlists: null }),
            },
          ],
        },
        {
          kind: "npSeek",
          key: "np-seek",
          player,
          items: [{ id: "seek", adjust: (dir) => seekBy(dir), activate: () => P.togglePlay() }],
        },
        {
          kind: "npButtons",
          key: "np-buttons",
          items: [
            shuffleButton(shuf, { round: true }),
            { id: "prev", round: true, icon: "prev", activate: () => P.back() },
            { id: "play", round: true, icon: player.playing ? "pause" : "play", activate: () => P.togglePlay() },
            { id: "next", round: true, icon: "next", activate: () => P.next() },
            {
              id: "repeat",
              round: true,
              icon: "repeat",
              on: player.repeat > 0,
              badge: player.repeat === 2 ? "1" : null, // répétition du titre seul
              activate: () => P.toggleRepeat(),
            },
          ],
        },
        {
          kind: "npVolume",
          key: "np-volume",
          player,
          items: [{ id: "volume", adjust: (dir) => volumeBy(dir), activate: toggleMute }],
        },
      ];
    }
    return [];
  }

  const rows = buildRows();
  const focusable = rows.map((r, i) => (r.items.length ? i : -1)).filter((i) => i >= 0);
  const curRow = focusable.includes(top.focus.row) ? top.focus.row : focusable[0] ?? 0;
  const curCol = rows[curRow] ? clamp(top.focus.cols[curRow] || 0, 0, Math.max(0, rows[curRow].items.length - 1)) : 0;

  const setFocus = (row, col) =>
    updateScreen(top.id, (sc) => {
      const cols = [...sc.focus.cols];
      if (col !== undefined) cols[row] = col;
      return { focus: { row, cols } };
    });

  // ---------- effets
  useEffect(() => {
    loadHome().then(setHomeRows);
    // Masque tout Spotify sous Walktify (y compris le menu "…" en haut à gauche)
    document.body.classList.add("wk-on");
    return () => document.body.classList.remove("wk-on");
  }, []);

  // Playlists modifiables pour l'écran "ajouter à une playlist"
  useEffect(() => {
    if (top.type !== "pick" || top.playlists !== null) return;
    const id = top.id;
    loadEditablePlaylists().then(
      (playlists) => updateScreen(id, { playlists }),
      (e) => {
        console.warn("[Walktify] playlists modifiables :", e);
        updateScreen(id, { playlists: [] });
      }
    );
  }, [top.id]);

  // État hors-ligne de la fiche : abonnement aux changements, comme les pages natives
  useEffect(() => {
    if (top.type !== "detail" || !DOWNLOADABLE.includes(top.item.type)) return;
    const id = top.id;
    const uri = offlineUri(top.item);
    const off = offlineService();
    const apply = (r) => {
      const st = readContext(r, uri);
      if (st) updateScreen(id, { offline: st });
    };
    off.getContexts({ uris: [uri] }).then(apply, (e) => console.warn("[Walktify] getContexts :", e));
    let sub = null;
    try {
      sub = off.subscribeContexts({ uris: [uri] }, apply);
    } catch (e) {
      console.warn("[Walktify] subscribeContexts :", e);
    }
    return () => sub && sub.cancel && sub.cancel();
  }, [top.id]);

  // Pendant un téléchargement, le pourcentage est relu toutes les 2 s (au cas où
  // l'abonnement ne signalerait que les changements d'état, pas la progression)
  const downloading = top.type === "detail" && top.offline && top.offline.state === "downloading";
  useEffect(() => {
    if (!downloading) return;
    const id = top.id;
    const uri = offlineUri(top.item);
    const t = setInterval(
      () =>
        offlineService()
          .getContexts({ uris: [uri] })
          .then((r) => {
            const st = readContext(r, uri);
            if (st) updateScreen(id, { offline: st });
          })
          .catch(() => { }),
      2000
    );
    return () => clearInterval(t);
  }, [top.id, downloading]);

  // État de chaque titre (pastilles vertes), par paquets de 100 titres
  useEffect(() => {
    if (top.type !== "detail" || !top.tracks || !top.tracks.length) return;
    const id = top.id;
    const off = offlineService();
    const merge = (r) => updateScreen(id, (sc) => ({ trackStates: { ...(sc.trackStates || {}), ...readItems(r) } }));
    const subs = [];
    for (const uris of chunk(top.tracks.map((t) => t.uri), 100)) {
      off.getItems({ uris }).then(merge, (e) => console.warn("[Walktify] getItems :", e));
      try {
        subs.push(off.subscribeItems({ uris }, merge));
      } catch (e) {
        console.warn("[Walktify] subscribeItems :", e);
      }
    }
    return () => subs.forEach((sub) => sub && sub.cancel && sub.cancel());
  }, [top.id, top.tracks]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (zone === "content" && top.type === "search" && curRow === 0) input.focus();
    else if (document.activeElement === input) input.blur();
  });

  // Défilement façon TV : une rangée de cartes remonte en haut, la carte sélectionnée reste en 2e position
  useEffect(() => {
    const content = contentRef.current;
    const rowEl = content && content.children[curRow];
    if (!rowEl || top.type === "nowplaying") return;
    let y;
    if (curRow === 0) y = 0;
    else if (rows[curRow].kind === "cards") y = rowEl.offsetTop - content.clientHeight * 0.02;
    else {
      const margin = content.clientHeight * 0.25;
      const bottom = rowEl.offsetTop + rowEl.offsetHeight;
      if (rowEl.offsetTop < content.scrollTop + margin) y = rowEl.offsetTop - margin;
      else if (bottom > content.scrollTop + content.clientHeight - margin) y = bottom - content.clientHeight + margin;
    }
    if (y !== undefined) content.scrollTo({ top: Math.max(0, y), behavior: "smooth" });

    const el = rowEl.querySelector('[data-wk-focused="1"]');
    const track = el && el.closest(".wk-track");
    if (track) {
      const prev = el.previousElementSibling;
      track.scrollTo({ left: prev ? prev.offsetLeft : 0, behavior: "smooth" });
    }
  }, [top.id, curRow, curCol, rows.length]);

  // ---------- clavier (molettes)
  const keyRef = useRef();
  keyRef.current = function onKey(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key;
    const typing = !!inputRef.current && document.activeElement === inputRef.current;
    const done = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (k === "Escape" || k === "BrowserBack" || (k === "Backspace" && !typing)) {
      done();
      back();
      return;
    }

    if (zone === "rail") {
      if (k === "ArrowUp" || k === "ArrowDown") setRailIndex((i) => clamp(i + (k === "ArrowDown" ? 1 : -1), 0, RAIL.length - 1));
      else if (k === "ArrowRight") setZone("content");
      else if (k === "Enter") goRail(RAIL[railIndex].id);
      else if (k !== "ArrowLeft") return;
      done();
      return;
    }

    const len = rows[curRow] ? rows[curRow].items.length : 0;
    const curItem = rows[curRow] && rows[curRow].items[curCol];
    if ((k === "ArrowLeft" || k === "ArrowRight") && curItem && curItem.adjust) {
      curItem.adjust(k === "ArrowRight" ? 1 : -1);
      setTimeout(refreshPlayer, 120);
      done();
      return;
    }
    if (k === "ArrowUp" || k === "ArrowDown") {
      const pos = focusable.indexOf(curRow);
      const next = focusable[clamp(pos + (k === "ArrowDown" ? 1 : -1), 0, focusable.length - 1)];
      if (next !== undefined) {
        // Entre deux rangées de tuiles, ou de titres (petit bouton de file d'attente) :
        // on garde la même colonne (grille)
        const grid = rows[curRow].kind === rows[next].kind && ["tiles", "track"].includes(rows[next].kind);
        setFocus(next, grid ? clamp(curCol, 0, rows[next].items.length - 1) : undefined);
      }
      done();
    } else if (k === "ArrowLeft") {
      if (typing && inputRef.current.selectionStart > 0) return;
      if (curCol > 0) setFocus(curRow, curCol - 1);
      else {
        setZone("rail");
        setRailIndex(Math.max(0, RAIL.findIndex((r) => r.id === section)));
      }
      done();
    } else if (k === "ArrowRight") {
      if (typing) return;
      if (len) setFocus(curRow, clamp(curCol + 1, 0, len - 1));
      done();
    } else if (k === "Enter") {
      const item = rows[curRow] && rows[curRow].items[curCol];
      if (item && item.activate) item.activate();
      setTimeout(refreshPlayer, 150);
      done();
    }
  };
  useEffect(() => {
    const f = (e) => keyRef.current(e);
    window.addEventListener("keydown", f, true);
    return () => window.removeEventListener("keydown", f, true);
  }, []);

  // ---------- rendu
  return h(
    "div",
    { className: "wk-root" },
    toast && h("div", { className: "wk-toast" }, toast),
    h(
      "nav",
      { className: "wk-rail" + (zone === "rail" ? " active" : "") },
      RAIL.map((r, i) => {
        const on = zone === "rail" && i === railIndex;
        return h(
          "div",
          {
            key: r.id,
            className:
              "wk-rail-item" + (r.id === "settings" ? " settings" : "") + (r.id === section ? " current" : "") + (on ? " focused" : ""),
          },
          h(Icon, { name: r.icon }),
          h("div", { className: "wk-rail-label" }, r.label),
          r.id === "nowplaying" && player.playing && h("div", { className: "wk-rail-dot" })
        );
      })
    ),
    h(
      "main",
      { className: "wk-main" },
      h(
        "header",
        { className: "wk-header" },
        h("div", { className: "wk-brand" }, "Spotify"),
        h(
          "div",
          { className: "wk-playing" },
          player.smartItem && h(Icon, { name: "smartBadge", className: "wk-smart-badge" }),
          player.title ? `${player.title} — ${player.artist}` : ""
        )
      ),
      h(
        "div",
        { className: "wk-content wk-screen-" + top.type, ref: contentRef },
        rows.map((row, i) =>
          h(Row, {
            key: row.key || i,
            row,
            active: zone === "content" && i === curRow,
            col: i === curRow ? curCol : clamp(top.focus.cols[i] || 0, 0, Math.max(0, row.items.length - 1)),
            inputRef,
          })
        )
      )
    )
  );
}

// Rendu dans <body> via un portail : l'interface recouvre toute la fenêtre
function WalktifyRoot() {
  const RD = Spicetify.ReactDOM;
  return RD && RD.createPortal ? RD.createPortal(h(Walktify), document.body) : h(Walktify);
}

function render() {
  return h(WalktifyRoot);
}