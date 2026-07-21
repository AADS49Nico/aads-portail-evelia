import React, { useState, useEffect, useRef } from "react";

// ============================================================
// OFFLINE MANAGER - Cache IndexedDB + Sync
// ============================================================
const OFFLINE_DB = "aads_offline_v1";
const OFFLINE_STORE = "pending_saisies";

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePendingSaisie(data) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).put({ ...data, id: data.id || Date.now().toString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingSaisies() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deletePendingSaisie(id) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, "readwrite");
    tx.objectStore(OFFLINE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function saveCacheData(key, data) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("cache", "readwrite");
      tx.objectStore("cache").put({ key, data, ts: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch(_e) { return; }
}

async function getCacheData(key) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("cache", "readonly");
      const req = tx.objectStore("cache").get(key);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    });
  } catch(_e) { return null; }
}

// Hook pour détecter le statut réseau
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return isOnline;
}

// Composant indicateur réseau
function NetworkIndicator({ pendingCount, onSync }) {
  const isOnline = useOnlineStatus();
  if (isOnline && pendingCount === 0) return null;
  return (
    <div style={{
      position:"fixed", bottom:16, right:16, zIndex:9999,
      background: isOnline ? "#22c55e22" : "#ef444422",
      border:"1px solid "+(isOnline?"#22c55e":"#ef4444"),
      borderRadius:10, padding:"10px 16px",
      display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
      backdropFilter:"blur(8px)"
    }}>
      <span style={{fontSize:16}}>{isOnline ? "🟢" : "🔴"}</span>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:isOnline?"#22c55e":"#ef4444"}}>
          {isOnline ? "En ligne" : "Hors ligne"}
        </div>
        {pendingCount > 0 && (
          <div style={{fontSize:10,color:"#7a90aa"}}>
            {pendingCount} saisie(s) en attente
          </div>
        )}
      </div>
      {isOnline && pendingCount > 0 && (
        <button onClick={onSync} style={{
          background:"#22c55e",color:"#fff",border:"none",
          borderRadius:6,padding:"4px 10px",fontSize:11,
          fontWeight:700,cursor:"pointer",fontFamily:"inherit"
        }}>
          Sync
        </button>
      )}
    </div>
  );
}

// ============================================================
// IMAGES (inlined — remplacez par vos vraies données base64)
// ============================================================
// PLAN_IMG retire - les plans sont maintenant geres dynamiquement via Supabase (table 'plans'), sans plan par defaut au demarrage
let BANNER_IMG = "";   // logo AADS : a televerser dans le storage de CETTE base
let TOQUE_LOGO = "";   // logo client : c etait celui de La Toque, il n a rien a faire ici

const CLIENT_CONFIG = {
  nom: "",
  contrat: "",
  site: "",
  type_site: "",
  date_debut: "",
  date_fin: "",
  passages_an: 12,
  seuil_vigilance: 5,
  seuil_critique: 10,
};

let AADS_CONFIG = {
  adresse: "135 Le Breuil, 49125 Tierce",
  activites: "ASSAINISSEMENT (curage EU/EP, debouchages h24, vidange toutes fosses, entretien bac a graisse, inspection televisee des reseaux - COFRAC, nettoyage bassins/lagunes, nettoyage bardages/toitures), DERATISATION, DESINSECTISATION, DESINFECTION, TRAITEMENT THERMIQUE, DEEP CLEANING, MAINTENANCE CLEANING",
  presentation: "La societe A.A.D.S., creee en 2008 par ses co-gerants fondateurs, Monsieur Gentilhomme et Monsieur Touzeau, est une SARL immatriculee au RCS d'Angers sous le numero 500 636 253 (n° de gestion 2007B40310), au capital social de 68 000 euros. Dans le cadre de son developpement, l'entreprise a ete cedee au groupe Pest Control Partnership (PCP) le 3 fevrier 2025. Depuis cette date, l'agence est dirigee par Monsieur Nicolas HOUGUET, Responsable d'Agence, avec pour objectif de structurer, moderniser et accelerer la croissance des activites. Cree en 2023, le groupe a pour vision de creer une plateforme internationale de premier plan en matiere de lutte antiparasitaire. Celle-ci ciblera de multiples secteurs industriels et de nombreuses gammes de services au Royaume-Uni et en Europe continentale dans un premier temps, avec un objectif de croissance organique et par le biais d'acquisitions strategiques. Nous nous engageons a veiller au bien-etre des communautes au sein desquelles nous exercons nos activites en gerant les risques parasitaires de la maniere la plus ecologique qui soit. Nous nous demarquons par l'attention et l'engagement que nous portons aux quatre piliers suivants : Collaborateurs - Environnement - Service - Technologie.",
  siret: "500 636 253 00030",
  contact1_nom: "HOUGUET NICOLAS", contact1_titre: "Responsable d'agence", contact1_mail: "n.houguet@aads49.fr", contact1_tel: "06 61 80 86 66",
  contact2_nom: "CESBRON COLETTE", contact2_titre: "Assistante de direction", contact2_mail: "administratif@aads49.fr", contact2_tel: "02 59 10 22 64",
  contact3_nom: "KERGAL MARINA", contact3_titre: "Assistante facturation", contact3_mail: "contact@aads49.fr", contact3_tel: "02 59 10 22 63",
  contact4_nom: "BRASSEUR OCEANE", contact4_titre: "Assistante technique/commerciale", contact4_mail: "technique@aads49.fr", contact4_tel: "02 59 10 22 63",
};


// ============================================================
// >>> CONFIGURATION DU PORTAIL - A REMPLIR AVANT DE DEPLOYER <<<
// ============================================================
// Colle ici les deux valeurs de TA base Supabase (Settings -> API) :
//   - SUPABASE_URL  = la "Project URL"     (ex: https://xxxx.supabase.co)
//   - SUPABASE_KEY  = la cle "publishable" (commence par sb_publishable_)
// Tant qu elles sont vides, le portail affiche un avertissement et ne se
// connecte a aucune base. C est voulu : evite d ecrire chez un autre client.
// ============================================================
const SUPABASE_URL = "https://azsqlbwqpqedggnrmoto.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6c3FsYndxcHFlZGdnbnJtb3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0ODQ5MTMsImV4cCI6MjEwMDA2MDkxM30.N8VDlZspzGCy2sp6dNd8qXkx35eQfyU29DUNUIZvHvA";

// ============================================================
// MULTI-SITES
// Les 19 tables ci-dessous portent une colonne site : elles sont filtrees.
// config_client est la table des sites, jamais filtree par site.
// Les autres (agrements, habilitations, produits_biocides, reglementations,
// contrats_devis, config_aads/auth/logos) sont communes au client ou a AADS.
// ============================================================
const TABLES_PAR_SITE = ["postes","passages","plans","plans_dessines","plan_actions",
  "poste_positions","audits","config","assainissement","conformite_ifs","deep_cleaning",
  "desinsectisation","maintenance_cleaning","maintenance_deiv_appareils",
  "maintenance_deiv_interventions","reinterventions","traitement_thermique","seuils"];

let SITE_ACTIF = ""; // reassigne par changerSite
try { SITE_ACTIF = window.localStorage.getItem("aads_site_actif") || ""; } catch(_e) { SITE_ACTIF = ""; }
let SITES_DISPO = [];

function tableParSite(table) { return TABLES_PAR_SITE.indexOf(String(table).split("?")[0]) !== -1; }
// Si le site est inconnu, on renvoie un filtre impossible plutot que rien :
// mieux vaut un ecran vide qu un melange des 5 sites.
function filtreSite(table) {
  if (!tableParSite(table)) return "";
  return "&site=eq." + encodeURIComponent(SITE_ACTIF || "__non_defini__");
}
// Bascule de site sans rechargement complet : le reload etait intercepte par le
// service worker de la PWA (ancien bundle reservi), et les pages ne se
// mettaient a jour qu au remontage suivant, c.-a-d. au changement d onglet.
// On met a jour la globale + le localStorage, puis on notifie le shell qui
// remonte la page active via sa key. Le remontage rejoue l effet de chargement.
var __onSiteChange = null;
var __onSitesListChange = null;
function changerSite(id) {
  if (id === SITE_ACTIF) return;
  try { window.localStorage.setItem("aads_site_actif", id); } catch(_e) { return; }
  SITE_ACTIF = id;
  if (typeof __onSiteChange === "function") __onSiteChange(id);
}

async function sbFetch(path, method, body, extraHeaders) {
  const headers = { apikey: SUPABASE_KEY, "Content-Type": "application/json" };
  // Ancienne cle anon = JWT, PostgREST y lit le role, elle part en Bearer.
  // Nouvelle cle sb_publishable_ n est pas un JWT : en Bearer elle serait rejetee.
  if (SUPABASE_KEY.indexOf("eyJ") === 0) headers.Authorization = "Bearer " + SUPABASE_KEY;
  Object.assign(headers, extraHeaders || {});
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, options);
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Supabase error:", res.status, errText);
    return null;
  }
  if (res.status === 204) return true; // succes sans contenu (DELETE, ou POST sans return=representation)
  return res.json().catch(() => true); // succes, corps non-JSON ou vide -> true plutot que null
}
async function sbGet(table) {
  return sbFetch(table + "?contrat=eq." + CLIENT_CONFIG.contrat + filtreSite(table) + "&order=id.asc", "GET");
}
async function sbUpsert(table, data) {
  if (tableParSite(table) && !SITE_ACTIF) {
    console.error("Ecriture refusee sur " + table + " : aucun site actif. La ligne serait orpheline.");
    return null;
  }
  const d = !tableParSite(table) ? data
    : Array.isArray(data) ? data.map(x => ({ ...x, site: (x && x.site) || SITE_ACTIF }))
    : { ...data, site: (data && data.site) || SITE_ACTIF };
  return sbFetch(table, "POST", d, { Prefer: "resolution=merge-duplicates,return=representation" });
}
async function sbUpdate(table, id, data) {
  return sbFetch(table + "?id=eq." + id + "&contrat=eq." + CLIENT_CONFIG.contrat + filtreSite(table), "PATCH", data, { Prefer: "return=representation" });
}
// Variante stricte : leve une exception en cas d'echec HTTP reel, avec le detail de l'erreur Supabase.
// A utiliser uniquement la ou l'appelant gere explicitement l'echec (ex: ajout de postes sur un plan).
async function sbUpsertStrict(table, data) {
  // Un SITE_ACTIF vide passerait la contrainte NOT NULL avec la chaine vide, mais
  // filtreSite relit sur "__non_defini__" : la ligne serait ecrite puis invisible.
  if (tableParSite(table) && !SITE_ACTIF) {
    const errSite = new Error("Aucun site actif : ecriture refusee sur " + table + ". Rechargez le portail et choisissez un site.");
    errSite.status = 0;
    throw errSite;
  }
  // Meme injection du site que sbUpsert : sans elle, toute table de TABLES_PAR_SITE
  // part avec site null et se fait rejeter par la contrainte NOT NULL (code 23502).
  const d = !tableParSite(table) ? data
    : Array.isArray(data) ? data.map(x => ({ ...x, site: (x && x.site) || SITE_ACTIF }))
    : { ...data, site: (data && data.site) || SITE_ACTIF };
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  };
  const res = await fetch(SUPABASE_URL + "/rest/v1/" + table, { method: "POST", headers, body: JSON.stringify(d) });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("Supabase error:", res.status, errText);
    const err = new Error("Supabase " + res.status + ": " + errText);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return true;
  return res.json().catch(() => true);
}
async function sbDelete(table, id) {
  return sbFetch(table + "?id=eq." + id + "&contrat=eq." + CLIENT_CONFIG.contrat + filtreSite(table), "DELETE");
}

// Place ou deplace un poste sur un plan. Un poste ne peut etre que sur un seul plan a la fois
// (contrainte unique en base sur contrat+poste_id). Si le poste existe deja ailleurs, on le
// deplace (UPDATE plan_id+x+y) au lieu de tenter un INSERT qui echouerait en doublon.
async function savePostePosition(planId, posteId, x, y) {
  const posData = { id: planId+"_"+posteId, poste_id:posteId, plan_id:planId, x, y, contrat:CLIENT_CONFIG.contrat, site:SITE_ACTIF };

  // Hors ligne — sauvegarder en attente
  if (!navigator.onLine) {
    return savePendingSaisie({ id:"pending_pos_"+planId+"_"+posteId, data:posData, table:"poste_positions" }).then(()=>{
      if (window.__setPendingCount) getPendingSaisies().then(p=>window.__setPendingCount(p.length)).catch(()=>{});
    }).catch(()=>{});
  }

  try {
    return await sbUpsertStrict("poste_positions", posData);
  } catch (err) {
    const isDuplicate = err.status === 409 || /duplicate key/i.test(err.message || "");
    if (!isDuplicate) throw err;
    // Le poste existe deja sur un autre plan (ou meme plan avec un autre id de ligne) : on le deplace.
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    const url = SUPABASE_URL + "/rest/v1/poste_positions?poste_id=eq." + encodeURIComponent(posteId) + "&contrat=eq." + CLIENT_CONFIG.contrat + filtreSite("poste_positions");
    const res = await fetch(url, { method: "PATCH", headers, body: JSON.stringify({ id: planId + "_" + posteId, plan_id: planId, x, y }) });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Supabase error (deplacement poste):", res.status, errText);
      const err2 = new Error("Supabase " + res.status + ": " + errText);
      err2.status = res.status;
      throw err2;
    }
    return res.status === 204 ? true : res.json().catch(() => true);
  }
}

// ============================================================
// SEUILS
// ============================================================
const SEUILS = { alerte: 5, critique: 10 };
const DATES = []; // Chargé dynamiquement depuis Supabase (passages)
const MACROS = ["Extérieur","Locaux techniques","Combles / Faux-plafonds","Emballages","Conditionnement","Bureaux / R&D","Maintenance","Stockage","Autres"];
const NUISIBLES_LIST = ["Rongeurs", "Blattes", "Insectes volants", "Teignes", "IPS"];

// Forme de pastille par categorie de poste. La couleur reste pilotee par le mode
// (Etat/Type/Zone) : forme et couleur sont deux axes independants.
// Categories : RE, RI (rongeurs ext/int), puis un nuisible non-rongeur par nom.
const FORMES_DISPO = ["rond", "carre", "rect", "ovale", "triangle"];
const POSTE_FORMES_DEFAUT = {
  RE: "rond", RI: "rond",
  "Blattes": "carre", "Insectes volants": "triangle", "Teignes": "ovale", "IPS": "carre",
};
// Categorie de forme d un poste : RE / RI pour les rongeurs, sinon le nom du nuisible.
function categorieForme(poste) {
  var nuisible = (poste && poste.nuisible) || "Rongeurs";
  if (nuisible === "Rongeurs") return poste && poste.type === "RE" ? "RE" : "RI";
  return nuisible;
}

// Cree l element SVG d une pastille dans la forme voulue, pour les exports.
// Centre en (x,y), rayon r, remplissage col. Retourne un <g> a appendre au SVG.
// Petite puce SVG (10px) dans la forme voulue, pour legendes et filtres.
function PuceForme({ forme, col, taille }) {
  var t = taille || 10;
  if (forme === "triangle") return <svg width={t} height={t} viewBox="0 0 10 10" style={{display:"inline-block",verticalAlign:"middle"}}><polygon points="5,1 9,9 1,9" fill={col}/></svg>;
  if (forme === "carre") return <span style={{display:"inline-block",width:t,height:t,background:col,borderRadius:2}}/>;
  if (forme === "rect") return <span style={{display:"inline-block",width:t*1.5,height:t*0.7,background:col,borderRadius:2}}/>;
  if (forme === "ovale") return <span style={{display:"inline-block",width:t*1.35,height:t*0.75,background:col,borderRadius:"50%"}}/>;
  return <span style={{display:"inline-block",width:t,height:t,background:col,borderRadius:"50%"}}/>;
}

// Transform SVG (rotation + miroir) d un element de plan, pour les vues hors editeur.
function transformElGlobal(el) {
  var cx, cy;
  if (el.points && el.points.length) {
    var sx=0, sy=0; el.points.forEach(function(pt){ sx+=pt.x; sy+=pt.y; });
    cx=sx/el.points.length; cy=sy/el.points.length;
  } else {
    var ax=el.x1||0, bx=(el.x2!==undefined?el.x2:el.x1)||0, ay=el.y1||0, by=(el.y2!==undefined?el.y2:el.y1)||0;
    cx=(ax+bx)/2; cy=(ay+by)/2;
  }
  var parts=[];
  if (el.rotation) parts.push("rotate("+el.rotation+" "+cx+" "+cy+")");
  if (el.flip) parts.push("translate("+(2*cx)+" 0) scale(-1 1)");
  return parts.length ? parts.join(" ") : undefined;
}

function svgPastilleForme(forme, x, y, r, col, ns) {
  var g = document.createElementNS(ns, "g");
  var shape;
  if (forme === "triangle") {
    var h = r * 1.7;
    shape = document.createElementNS(ns, "polygon");
    shape.setAttribute("points", x+","+(y-h*0.55)+" "+(x+r*1.15)+","+(y+h*0.45)+" "+(x-r*1.15)+","+(y+h*0.45));
  } else if (forme === "carre") {
    shape = document.createElementNS(ns, "rect");
    shape.setAttribute("x", x-r); shape.setAttribute("y", y-r);
    shape.setAttribute("width", r*2); shape.setAttribute("height", r*2); shape.setAttribute("rx", 2);
  } else if (forme === "rect") {
    shape = document.createElementNS(ns, "rect");
    shape.setAttribute("x", x-r*1.45); shape.setAttribute("y", y-r*0.72);
    shape.setAttribute("width", r*2.9); shape.setAttribute("height", r*1.44); shape.setAttribute("rx", 2);
  } else if (forme === "ovale") {
    shape = document.createElementNS(ns, "ellipse");
    shape.setAttribute("cx", x); shape.setAttribute("cy", y);
    shape.setAttribute("rx", r*1.3); shape.setAttribute("ry", r*0.78);
  } else {
    shape = document.createElementNS(ns, "circle");
    shape.setAttribute("cx", x); shape.setAttribute("cy", y); shape.setAttribute("r", r);
  }
  shape.setAttribute("fill", col); shape.setAttribute("stroke", "#fff");
  shape.setAttribute("stroke-width", 2); shape.setAttribute("stroke-linejoin", "round");
  g.appendChild(shape);
  return g;
}

// Trace une pastille de forme donnee sur un canvas 2D (exports rasterises).
function canvasPastilleForme(ctx, forme, x, y, r, col) {
  ctx.beginPath();
  if (forme === "triangle") {
    var h = r * 1.7;
    ctx.moveTo(x, y - h*0.55); ctx.lineTo(x + r*1.15, y + h*0.45); ctx.lineTo(x - r*1.15, y + h*0.45); ctx.closePath();
  } else if (forme === "carre") {
    ctx.rect(x - r, y - r, r*2, r*2);
  } else if (forme === "rect") {
    ctx.rect(x - r*1.45, y - r*0.72, r*2.9, r*1.44);
  } else if (forme === "ovale") {
    ctx.ellipse(x, y, r*1.3, r*0.78, 0, 0, Math.PI*2);
  } else {
    ctx.arc(x, y, r, 0, Math.PI*2);
  }
  ctx.fillStyle = col; ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
}
const NUISIBLE_COLORS = {
  Rongeurs: "#3b82f6",
  Blattes: "#ef4444",
  "Insectes volants": "#eab308",
  Teignes: "#8b5cf6",
  IPS: "#22c55e",
};

const SEUILS_INSECTES = {
  Teignes: {
    niveaux: [
      { label: "Léger", color: "#22c55e", min: 0, max: 100 },
      { label: "Moyen", color: "#f59e0b", min: 100, max: 150 },
      { label: "Élevé", color: "#ef4444", min: 150, max: Infinity },
    ],
  },
  Blattes: {
    niveaux: [
      { label: "Léger", color: "#22c55e", min: 0, max: 5 },
      { label: "Moyen", color: "#f59e0b", min: 5, max: 10 },
      { label: "Élevé", color: "#ef4444", min: 10, max: Infinity },
    ],
  },
  IPS: {
    niveaux: [
      { label: "Léger", color: "#22c55e", min: 0, max: 3 },
      { label: "Moyen", color: "#f59e0b", min: 3, max: 8 },
      { label: "Élevé", color: "#ef4444", min: 8, max: Infinity },
    ],
  },
  "Insectes volants": {
    categories: {
      Moucherons: [{ label: "Léger", color: "#22c55e", min: 0, max: 350 }, { label: "Moyen", color: "#f59e0b", min: 350, max: 500 }, { label: "Élevé", color: "#ef4444", min: 500, max: Infinity }],
      Mouches: [{ label: "Léger", color: "#22c55e", min: 0, max: 150 }, { label: "Moyen", color: "#f59e0b", min: 150, max: 250 }, { label: "Élevé", color: "#ef4444", min: 250, max: Infinity }],
      Moustiques: [{ label: "Léger", color: "#22c55e", min: 0, max: 60 }, { label: "Moyen", color: "#f59e0b", min: 60, max: 100 }, { label: "Élevé", color: "#ef4444", min: 100, max: Infinity }],
      Hyménoptères: [{ label: "Léger", color: "#22c55e", min: 0, max: 50 }, { label: "Moyen", color: "#f59e0b", min: 50, max: 100 }, { label: "Élevé", color: "#ef4444", min: 100, max: Infinity }],
      Lépidoptères: [{ label: "Léger", color: "#22c55e", min: 0, max: 45 }, { label: "Moyen", color: "#f59e0b", min: 45, max: 100 }, { label: "Élevé", color: "#ef4444", min: 100, max: Infinity }],
      Coléoptères: [{ label: "Léger", color: "#22c55e", min: 0, max: 15 }, { label: "Moyen", color: "#f59e0b", min: 15, max: 30 }, { label: "Élevé", color: "#ef4444", min: 30, max: Infinity }],
      Punaises: [{ label: "Léger", color: "#22c55e", min: 0, max: 5 }, { label: "Moyen", color: "#f59e0b", min: 5, max: 10 }, { label: "Élevé", color: "#ef4444", min: 10, max: Infinity }],
      Tipules: [{ label: "Léger", color: "#22c55e", min: 0, max: 10 }, { label: "Moyen", color: "#f59e0b", min: 10, max: 20 }, { label: "Élevé", color: "#ef4444", min: 20, max: Infinity }],
    },
  },
};

function getNiveauInsecte(nuisible, categorie, valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const v = parseFloat(valeur) || 0;
  const config = SEUILS_INSECTES[nuisible];
  if (!config) return null;
  const niveaux = config.categories ? (config.categories[categorie] || config.categories["Moucherons"]) : config.niveaux;
  for (let i = niveaux.length - 1; i >= 0; i--) {
    if (v >= niveaux[i].min) return niveaux[i];
  }
  return niveaux[0];
}

// ============================================================
// DONNÉES PASSAGES
// ============================================================
const PASSAGES = []; // Données chargées depuis Supabase

const ZONES_MACRO = [
  { zone: "Extérieur", postes: 33, incidents: 16, couleur: "#ef4444" },
  { zone: "Locaux techniques", postes: 18, incidents: 1, couleur: "#f59e0b" },
  { zone: "Combles / Faux-plafonds", postes: 19, incidents: 0, couleur: "#22c55e" },
  { zone: "Emballages", postes: 18, incidents: 0, couleur: "#22c55e" },
  { zone: "Conditionnement", postes: 10, incidents: 0, couleur: "#22c55e" },
  { zone: "Bureaux / R&D", postes: 9, incidents: 0, couleur: "#22c55e" },
  { zone: "Maintenance", postes: 7, incidents: 0, couleur: "#22c55e" },
  { zone: "Stockage", postes: 4, incidents: 0, couleur: "#22c55e" },
  { zone: "Autres", postes: 20, incidents: 0, couleur: "#22c55e" },
];

// POSTES — nuisible "Rongeurs" par défaut, GLUE corrigé
const POSTES_INIT = []; // Données chargées depuis Supabase

const CRITERES_IFS = [
  { ref: "4.14.1", libelle: "Plan de lutte antiparasitaire documenté", statut: "Conforme", date: "28/01/2026" },
  { ref: "4.14.2", libelle: "Inspection régulière des dispositifs", statut: "Conforme", date: "24/03/2026" },
  { ref: "4.14.3", libelle: "Enregistrement des résultats d'inspection", statut: "Conforme", date: "24/03/2026" },
  { ref: "4.14.4", libelle: "Mesures correctives documentées", statut: "En cours", date: "28/01/2026" },
  { ref: "4.14.5", libelle: "Personnel formé - lutte antiparasitaire", statut: "Conforme", date: "28/01/2026" },
  { ref: "4.14.6", libelle: "Produits biocides homologués et FDS à jour", statut: "Conforme", date: "28/01/2026" },
  { ref: "4.14.7", libelle: "Cartographie des points de contrôle", statut: "Conforme", date: "28/01/2026" },
];

const ACTIONS_INIT = []; // Données chargées depuis Supabase

const HABILITATIONS = [
  { id: "1781454763832", nom: "PATRICK DAVID", role: "Chef d'equipe", actif: true, certiphyto: false, certibiocide: true, habElec: true, caces: true, packSec: false, telephone: "0660968064", email: "p.david@aads49.fr", equipe: "3d" },
  { id: "1781454792425", nom: "NICOLAS HOUGUET", role: "Responsable", actif: true, certiphyto: false, certibiocide: true, habElec: false, caces: true, packSec: true, telephone: "0661808666", email: "n.houguet@aads49.fr", equipe: "3d" },
  { id: "1781454814368", nom: "BERTRAND AUBRY", role: "Technicien titulaire", actif: true, certiphyto: false, certibiocide: true, habElec: true, caces: true, packSec: true, telephone: "0761167611", email: "b.aubry@aads49.fr", equipe: "3d" },
  { id: "1781454837007", nom: "EMERIK GILBERT", role: "Technicien", actif: true, certiphyto: false, certibiocide: true, habElec: true, caces: false, packSec: false, telephone: "0659101125", email: "e.gillbert@aads49.fr", equipe: "3d" },
  { id: "1781454846537", nom: "SYLVAIN CAILLEAU", role: "Technicien", actif: true, certiphyto: false, certibiocide: true, habElec: true, caces: false, packSec: false, telephone: "0763362991", email: "s.cailleau@aads49.fr", equipe: "3d" },
  { id: "1781454857547", nom: "DAVID CHAUVIN", role: "Technicien", actif: true, certiphyto: false, certibiocide: true, habElec: true, caces: true, packSec: false, telephone: "0757195196", email: "d.chauvin@aads49.fr", equipe: "3d" },
  { id: "1781454873001", nom: "JONATHAN BUGHIN", role: "Technicien", actif: true, certiphyto: false, certibiocide: true, habElec: true, caces: false, packSec: false, telephone: "0760375269", email: "j.bughin@aads49.fr", equipe: "3d" },
  { id: "1782027714742", nom: "GENTILHOMME SEBASTIEN", role: "Technicien", actif: false, certiphyto: false, certibiocide: true, habElec: true, caces: false, packSec: false, telephone: "0666334166", email: "s.gentilhomme@aads49.fr", equipe: "3d" },
  { id: "1782241900001", nom: "SEBASTIEN BRIQUET", role: "Chef d'equipe", actif: true, certiphyto: false, certibiocide: false, habElec: false, caces: false, packSec: false, telephone: "", email: "s.briquet@aads49.fr", equipe: "assainissement" },
  { id: "1782241900002", nom: "MANUEL ANDRE", role: "Chauffeur technicien", actif: true, certiphyto: false, certibiocide: false, habElec: false, caces: false, packSec: false, telephone: "", email: "m.andre@aads49.fr", equipe: "assainissement" },
  { id: "1782241900003", nom: "XAVIER FRESNAY", role: "Chauffeur technicien", actif: true, certiphyto: false, certibiocide: false, habElec: false, caces: false, packSec: false, telephone: "", email: "x.fresnay@aads49.fr", equipe: "assainissement" },
  { id: "1782241900004", nom: "DAVID CRISINEL", role: "Chauffeur technicien", actif: true, certiphyto: false, certibiocide: false, habElec: false, caces: false, packSec: false, telephone: "", email: "d.crisinel@aads49.fr", equipe: "assainissement" },
  { id: "1782241900005", nom: "ALEXANDRE CHEVREUIL", role: "Technicien ITV", actif: true, certiphyto: false, certibiocide: false, habElec: false, caces: false, packSec: false, telephone: "", email: "a.chevreuil@aads49.fr", equipe: "assainissement" },
]; // Donnees par defaut, modifiables ensuite dans l'interface

// Techniciens chargés depuis Supabase (habilitations)
let TECHNICIENS_GLOBAUX = ["BERTRAND AUBRY", "PATRICK DAVID", "DAVID CHAUVIN", "EMERIK GILBERT", "JONATHAN BUGHIN"];
function useTechniciens() {
  const [techs, setTechs] = React.useState(TECHNICIENS_GLOBAUX);
  React.useEffect(() => {
    sbGet("habilitations").then(data => {
      if (data && data.length > 0) {
        const noms = data.filter(h=>h.actif!==false).map(h=>h.nom).filter(Boolean);
        if (noms.length > 0) { TECHNICIENS_GLOBAUX = noms; setTechs(noms); }
      }
    }).catch(()=>{});
  }, []);
  return techs;
}

const PRODUITS = [
  { id: 1, nom: "NOTRAC APPAT RODENTICIDE 8 KG", fournisseur: "LODI", ref: "R8036", sa: "Brodifacoum", amm: "FR-2016-0010", statut: "Actif", zone: "Extérieur" },
  { id: 2, nom: "JADE BLOC RATICIDE 30g", fournisseur: "LODI", ref: "R5029", sa: "Brodifacoum", amm: "FR-2014-0137", statut: "Actif", zone: "Extérieur" },
  { id: 3, nom: "RUBIS BLOC RATICIDE 20g", fournisseur: "LODI", ref: "R9812", sa: "Coumatetralyl", amm: "FR-2012-0031", statut: "Actif", zone: "Intérieur" },
  { id: 4, nom: "KRIPTO PATE PLACEBO", fournisseur: "LODI", ref: "R9120", sa: "Aucune", amm: "FR-2012-0505", statut: "Actif", zone: "Intérieur" },
];

const AGREMENTS = [
  { id: "1781454900005", type: "Certification", nom: "CEPA", statut: "Valide" },
  { id: "1781454907761", type: "Certification", nom: "COFRAC ITV", statut: "Valide" },
  { id: "1781863798357", type: "Assurance", nom: "Responsabilité civile", statut: "Valide" },
  { id: "1781863839355", type: "Autorisation", nom: "PLAN DE SECURITE CLIENT", statut: "Valide" },
  { id: "3", type: "Agrément", nom: "PROSANE CS3D", statut: "Valide" },
];

const REINIT_INIT = []; // Données chargées depuis Supabase

// ============================================================
// NAV CONFIG — onglets activables/désactivables
// ============================================================
const NAV_ICONS = {
  dashboard:           "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  implantation:        "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  interventions:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  saisiepassage:       "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  cartographie:        "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
  maintenancedeiv:     "M13 10V3L4 14h7v7l9-11h-7z",
  statistiques:        "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
  planactions:         "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  conformite:          "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  produits:            "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  habilitations:       "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  agrements:           "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  contratsdevis:       "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  reglementations:     "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  audit:               "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  traitementthermique: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  deepcleaning:        "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
  maintenancecleaning: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  assainissement:      "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  desinsectisation:    "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
};

const NAV_GROUPS_CONFIG = [
  {
    group: "Suivi client",
    items: [
      { id: "dashboard", label: "Tableau de bord", default: true, required: true },
      { id: "implantation", label: "Plan d'implantation", default: true },
      { id: "interventions", label: "Passages", default: true },
      { id: "saisiepassage", label: "Saisie passage", default: true },
      { id: "cartographie", label: "Postes et Zones", default: true },
      { id: "maintenancedeiv", label: "Maintenance DEIV", default: true },
      { id: "statistiques", label: "Tendances", default: true },
      { id: "planactions", label: "Plan d'actions", default: true },
      { id: "conformite", label: "Conformité IFS", default: true },
    ],
  },
  {
    group: "Référentiel",
    items: [
      { id: "produits", label: "Produits biocides", default: true },
      { id: "habilitations", label: "Habilitations", default: true },
      { id: "agrements", label: "Agréments", default: true },
      { id: "contratsdevis", label: "Contrats / Devis", default: true },
      { id: "reglementations", label: "Réglementations 3D", default: true },
    ],
  },
  {
    group: "Qualité",
    items: [
      { id: "audit", label: "Audit interne 3D", default: true },
    ],
  },
  {
    group: "Prestations spéciales",
    items: [
      { id: "traitementthermique", label: "Traitement thermique", default: true },
      { id: "deepcleaning", label: "Deep Cleaning", default: true },
      { id: "maintenancecleaning", label: "Maintenance Cleaning", default: true },
      { id: "assainissement", label: "Assainissement", default: true },
      { id: "desinsectisation", label: "Désinsectisation", default: true },
    ],
  },
];

// ============================================================
// COMPOSANTS UI DE BASE
// ============================================================
function sc(s) {
  return { "Conforme": "#22c55e", "Action requise": "#ef4444", "Vigilance": "#f59e0b", "Résolu": "#3b82f6", "En cours": "#f59e0b", "Planifiée": "#3b82f6", "Traité": "#22c55e", "Actif": "#22c55e", "Valide": "#22c55e" }[s] || "#94a3b8";
}

function Spinner({ label }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:60, gap:16 }}>
      <div style={{ width:40, height:40, border:"4px solid #3d5270", borderTop:"4px solid #3b82f6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      {label && <div style={{ fontSize:13, color:"#7a90aa", fontWeight:500 }}>{label}</div>}
      <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function Badge({ label, color }) {
  const c = color || sc(label);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: c + "22", color: c, border: "1px solid " + c + "44", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 10px" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, display: "inline-block" }} />
      {label}
    </span>
  );
}

function Card({ children, selected, onClick, style }) {
  return (
    <div onClick={onClick}
      style={{ background: selected ? "#2d4a7a" : "#243352", border: "1px solid " + (selected ? "#3b82f6" : "#3d5270"), borderRadius: 12, padding: "16px 18px", cursor: onClick ? "pointer" : "default", transition: "all .15s", ...style }}>
      {children}
    </div>
  );
}

function Kpi({ label, value, color, fontSize, plain, noborder }) {
  const c = color || "#3b82f6";
  const noBorder = plain || noborder;
  return (
    <div style={{ background: "#243352", border: "1px solid #3d5270", borderTop: noBorder ? "1px solid #3d5270" : "3px solid "+c, borderRadius: 10, padding: "14px 16px", textAlign: "center", position:"relative", overflow:"hidden" }}>
      {!noBorder && <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,"+c+"08 0%,transparent 60%)",pointerEvents:"none"}}/>}
      <div style={{ fontSize: fontSize || 24, fontWeight: 900, color: c, letterSpacing:"-0.5px" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#7a90aa", marginTop: 3, fontWeight:500 }}>{label}</div>
    </div>
  );
}

function inp(extra) {
  return { background: "#1a2540", border: "1px solid #3d5270", borderRadius: 7, padding: "7px 10px", color: "#f1f5f9", fontSize: 12, fontFamily: "inherit", width: "100%", boxSizing: "border-box", ...extra };
}
function inpBlue(extra) {
  return { ...inp(), border: "1px solid #3b82f6", ...extra };
}

// Rend un element texte de plan en SVG, avec gras / italique / surlignage.
// interactif = handlers de l editeur (gomme, selection) ; en vue plan il est nul.
function renderTexteSVG(el, interactif) {
  var fs = el.fontSize || 14;
  var tA = el.anchorH === "gauche" ? "start" : el.anchorH === "droite" ? "end" : el.anchorH ? "middle" : "start";
  var bL = el.anchorV === "haut" ? "hanging" : el.anchorV === "bas" ? "auto" : el.anchorV ? "central" : "auto";
  var poids = el.bold ? 800 : 600;
  var style = el.italic ? "italic" : "normal";
  var texte = el.text || "";
  var surlignage = null;
  if (el.highlight) {
    var w = texte.length * fs * 0.58 + fs * 0.4;
    var h = fs * 1.25;
    var rx = tA === "start" ? el.x1 - fs * 0.2 : tA === "end" ? el.x1 - w + fs * 0.2 : el.x1 - w / 2;
    var ry = bL === "hanging" ? el.y1 - fs * 0.12 : bL === "auto" ? el.y1 - h + fs * 0.12 : el.y1 - h / 2;
    surlignage = <rect x={rx} y={ry} width={w} height={h} fill="#fde047" rx="2"/>;
  }
  var handlers = interactif || {};
  return (
    <g key={el.id} opacity={handlers.opacity !== undefined ? handlers.opacity : 1} onClick={handlers.onClick} onMouseDown={handlers.onMouseDown} onDoubleClick={handlers.onDoubleClick} style={handlers.style}>
      {surlignage}
      <text x={el.x1} y={el.y1} fontSize={fs} fill={el.color} fontFamily="sans-serif" fontWeight={poids} fontStyle={style} textAnchor={tA} dominantBaseline={bL}>{texte}</text>
    </g>
  );
}

// ============================================================
// CONSOMMATION APPAT - vocabulaire unique
// Trois ecritures coexistent dans les donnees et designent le meme fait
// (appat entierement consomme) : "Totale" produit par la saisie passage,
// "CONSOMMATION TOTALE" produit par la saisie plan et les imports SQL,
// "100%" present dans les exports et les anciennes lignes Supabase.
// Toute classification de consommation passe par ces trois fonctions.
// ============================================================
export function estConsoTotale(v) {
  return v === "Totale" || v === "CONSOMMATION TOTALE" || v === "100%";
}
export function estConsoPartielle(v) {
  return v === "25%" || v === "50%" || v === "75%" || v === "CONSOMMATION PARTIELLE";
}
export function estConsoQuelconque(v) {
  return estConsoTotale(v) || estConsoPartielle(v);
}

// ============================================================
// EXPORT PDF
// ============================================================
const PDF_CSS = `*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;font-size:11px;color:#243352;background:#fff;padding:15mm;}@page{size:A4;margin:15mm 12mm;}.page-break{page-break-before:always;}h1{font-size:18px;color:#0f2864;font-weight:800;border-bottom:3px solid #0f2864;padding-bottom:8px;margin-bottom:16px;}h2{font-size:13px;font-weight:800;color:#0f2864;border-left:4px solid #0f2864;padding-left:8px;margin:16px 0 10px;text-transform:uppercase;}table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10px;}th{background:#0f2864;color:#fff;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;font-weight:700;}td{padding:5px 8px;border-bottom:1px solid #e2e8f0;}tr:nth-child(even) td{background:#f8fafc;}.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;}.green{background:#dcfce7;color:#16a34a;}.orange{background:#fef3c7;color:#d97706;}.red{background:#fee2e2;color:#dc2626;}.tot{color:#dc2626;font-weight:700;}.par{color:#d97706;font-weight:700;}.ok{color:#16a34a;}.footer{border-top:1px solid #e2e8f0;padding-top:8px;margin-top:20px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between;}.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;}.kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;}.kpi-v{font-size:18px;font-weight:900;color:#0f2864;}.kpi-l{font-size:9px;color:#7a90aa;margin-top:2px;}`;

function exportCSV(filename, headers, rows) {
  const escapeCsv = (val) => {
    const s = (val===null||val===undefined) ? "" : String(val);
    if (s.includes(";") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.map(escapeCsv).join(";")];
  rows.forEach(row => { lines.push(row.map(escapeCsv).join(";")); });
  const csvContent = "\uFEFF" + lines.join("\r\n"); // BOM pour Excel + accents
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportHTML(title, htmlBody) {
  const win = window.open("", "_blank");
  const logoHeader = TOQUE_LOGO
    ? `<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #0f2864">
        <img src="${TOQUE_LOGO}" alt="Logo client" style="height:50px;width:auto;object-fit:contain"/>
        <div style="font-size:11px;color:#6b7280">${CLIENT_CONFIG.nom}<br/>Contrat ${CLIENT_CONFIG.contrat}</div>
      </div>`
    : "";
  const footerHtml = `<div class="footer" style="display:flex;align-items:center;justify-content:space-between;gap:14px">
    <div style="display:flex;align-items:center;gap:10px">
      ${BANNER_IMG ? `<img src="${BANNER_IMG}" alt="AADS" style="height:28px;width:auto;object-fit:contain"/>` : ""}
      <div>
        <div style="font-weight:700;color:#374151">ANJOU ASSAINISSEMENT DERATISATION SERVICES</div>
        <div>${AADS_CONFIG.adresse || ""}${AADS_CONFIG.siret ? " - SIRET "+AADS_CONFIG.siret : ""}</div>
      </div>
    </div>
    <div style="text-align:right">${CLIENT_CONFIG.nom} - Contrat ${CLIENT_CONFIG.contrat} - ${new Date().toLocaleDateString("fr-FR")}</div>
  </div>`;
  const doc = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><meta http-equiv="Content-Type" content="text/html; charset=utf-8"/><title>${title}</title><style>${PDF_CSS}</style></head><body>${logoHeader}${htmlBody}</body></html>`;
  win.document.open("text/html", "replace");
  win.document.write(doc);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

function exportRapport(prestation, item) {
  const photos = (item.photos||[]).filter(p=>p.url);
  const photosHtml = photos.length > 0
    ? `<div style="margin-top:16px"><div style="font-weight:700;margin-bottom:8px;color:#1d4ed8">Photos</div><div style="display:flex;flex-wrap:wrap;gap:10px">${photos.map(p=>`<img src="${p.url}" style="max-width:200px;max-height:150px;border-radius:6px;border:1px solid #e2e8f0;object-fit:cover"/>`).join("")}</div></div>`
    : "";

  const fields = {
    "Traitement thermique": [
      ["Date", item.date], ["Technicien(s)", item.technicien], ["Zone", item.zone],
      ["Superficie", item.superficie ? item.superficie+" m²" : "—"],
      ["Nuisible(s) ciblé(s)", item.nuisible||"—"],
      ["Température cible", item.tempCible ? item.tempCible+"°C" : "—"],
      ["Température atteinte", item.tempAtteinte ? item.tempAtteinte+"°C" : "—"],
      ["Durée", item.duree ? item.duree+"h" : "—"],
      ["Statut", item.statut||"—"], ["Observations", item.observations||"—"]
    ],
    "Deep Cleaning": [
      ["Date", item.date], ["Technicien(s)", item.technicien], ["Zone", item.zone],
      ["Superficie", item.superficie ? item.superficie+" m²" : "—"],
      ["Types de nettoyage", item.types_nettoyage||"—"],
      ["Matériels", item.materiels||"—"], ["Produits", item.produits||"—"],
      ["Statut", item.statut||"—"], ["Observations", item.observations||"—"]
    ],
    "Maintenance Cleaning": [
      ["Date", item.date], ["Technicien(s)", item.technicien], ["Zone", item.zone],
      ["Travail réalisé", item.travail||"—"],
      ["Matériels", item.materiels||"—"], ["Produits", item.produits||"—"],
      ["Statut", item.statut||"—"], ["Observations", item.observations||"—"]
    ],
    "Assainissement": [
      ["Date", item.date], ["Technicien(s)", item.technicien], ["Zone / Équipement", item.zone],
      ["Type de prestation", item.type_prestation||"—"],
      ["Urgence", item.urgence||"—"],
      ["Volume extrait", item.volume ? item.volume+" L" : "—"],
      ["Conforme", item.conforme ? "Oui" : "Non"],
      ["Odeurs détectées", item.odeurs ? "Oui" : "Non"],
      ["Produits", item.produits||"—"],
      ["Statut", item.statut||"—"], ["Observations", item.observations||"—"]
    ],
    "Désinsectisation": [
      ["Date", item.date], ["Technicien(s)", item.technicien], ["Zone", item.zone],
      ["Type d'intervention", item.type_intervention||"—"],
      ["Urgence", item.urgence||"—"],
      ["Produits", item.produits||"—"],
      ["Statut", item.statut||"—"], ["Observations", item.observations||"—"]
    ]
  };

  const rows = (fields[prestation]||[]).map(([k,v])=>`
    <tr>
      <td style="font-weight:700;color:#374151;width:35%;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb">${k}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;color:#111827">${v||"—"}</td>
    </tr>`).join("");

  exportHTML(`Rapport ${prestation} - ${CLIENT_CONFIG.nom}`,
    `<h1 style="color:#0f2864;border-bottom:3px solid #0f2864;padding-bottom:8px">${prestation}</h1>
    <p style="color:#6b7280;margin-bottom:20px">${CLIENT_CONFIG.nom} — ${new Date().toLocaleDateString("fr-FR")}</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${rows}</table>
    ${photosHtml}`
  );
}

// Pages ou le site est pertinent : le groupe Suivi client, Audit, et les
// Prestations speciales (leurs tables sont toutes dans TABLES_PAR_SITE).
// Les pages du Referentiel (produits, habilitations, agrements, contrats,
// reglementations) et la config AADS lisent des tables globales, non filtrees
// par site : un selecteur y serait trompeur.
const PAGES_AVEC_SITE = ["dashboard","implantation","interventions","saisiepassage",
  "cartographie","maintenancedeiv","statistiques","planactions","conformite","audit",
  "traitementthermique","deepcleaning","maintenancecleaning","assainissement","desinsectisation"];

// Selecteur de site : un bouton par site, bascule en un clic. Lit les globales
// SITES_DISPO / SITE_ACTIF, donc le parent doit se re-rendre apres le chargement
// de config_client (forceConfigUpdate s en charge).
function SiteSwitcher({ compact }) {
  if (SITES_DISPO.length <= 1) return null;
  const taille = compact ? 10 : 11;
  const marge = compact ? "3px 8px" : "4px 11px";
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:2, background:"#243352",
      border:"1px solid #3d5270", borderRadius:8, padding:2 }}>
      {SITES_DISPO.map(s => {
        var actif = s.id === SITE_ACTIF;
        return (
          <button key={s.id} onClick={()=>{ if (!actif) changerSite(s.id); }}
            title={actif ? "Site affiche" : "Basculer sur " + s.site}
            style={{ background: actif ? "#1d4ed8" : "transparent",
                     color: actif ? "#fff" : "#94a3b8",
                     border:"none", borderRadius:6, padding:marge, fontSize:taille,
                     fontWeight: actif ? 700 : 600, cursor: actif ? "default" : "pointer",
                     fontFamily:"inherit", whiteSpace:"nowrap" }}>
            {s.site}
          </button>
        );
      })}
    </div>
  );
}

function ExportBtn({ onClick, label }) {
  return (
    <button onClick={onClick}
      style={{ background: "#1d4ed822", color: "#3b82f6", border: "1px solid #3b82f644", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
      ↓ PDF {label || ""}
    </button>
  );
}

// ============================================================
// TABLEAU DE BORD
// ============================================================
function Dashboard({ onNav, reinterventions, onLogoClick, onParamsClick, passagesGlobaux, seuilsGlobaux }) {
  const [localPassages, setLocalPassages] = useState([]);
  const [filterYear, setFilterYear] = useState(null);
  const [postesTotal, setPostesTotal] = useState(0);
  const [nbMaintenancesDeiv, setNbMaintenancesDeiv] = useState(0);
  useEffect(() => {
    if (!passagesGlobaux || passagesGlobaux.length === 0) {
      sbGet("passages").then(data => {
        if (data && data.length > 0) setLocalPassages(data);
      }).catch(()=>{});
    }
    sbGet("postes").then(data => {
      if (data && data.length > 0) setPostesTotal(data.length);
    }).catch(()=>{});
    sbGet("maintenance_deiv_interventions").then(data => {
      if (data && data.length > 0) setNbMaintenancesDeiv(data.length);
    }).catch(()=>{});
  }, []);

  // Utiliser passagesGlobaux en priorité, sinon le chargement local
  const passagesSuivi = (passagesGlobaux && passagesGlobaux.length > 0) ? passagesGlobaux : localPassages;

  const passagesSource = passagesSuivi.length > 0 ? passagesSuivi.map(p => {
    const saisies = typeof p.saisies==="string" ? JSON.parse(p.saisies||"{}") : (p.saisies||{});
    const anomalies = Object.values(saisies).filter(s => s && (
      estConsoQuelconque(s.etat)||
      (parseInt(s.cap_souris||0)+parseInt(s.cap_ratBrun||0)+parseInt(s.cap_ratNoir||0))>0
    )).length;
    const conso_totale = Object.values(saisies).filter(s => s && estConsoTotale(s.etat)).length;
    const conso_partielle = Object.values(saisies).filter(s => s && estConsoPartielle(s.etat)).length;
    return { ...p, anomalies, conso_totale, conso_partielle, total: Object.keys(saisies).length, statut: p.statut||"Terminé" };
  }) : PASSAGES;

  const pd = d => { if(!d)return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const yearOf = d => (d||"").split("/")[2] || "";

  // Annees presentes dans les passages, de la plus recente a la plus ancienne
  const anneesList = [...new Set(passagesSource.map(p => yearOf(p.date)).filter(Boolean))].sort((a,b) => b-a);
  const anneesKey = anneesList.join(",");

  // Annee affichee par defaut : l annee en cours si elle a des passages, sinon la plus recente
  useEffect(() => {
    if (filterYear === null && anneesList.length > 0) {
      const courante = String(new Date().getFullYear());
      setFilterYear(anneesList.indexOf(courante) !== -1 ? courante : anneesList[0]);
    }
  }, [anneesKey]);

  const matchYear = p => (filterYear === null || filterYear === "Tout") ? true : yearOf(p.date) === filterYear;

  const passagesSorted = passagesSource.filter(p=>p.type!=="Insectes volants" && matchYear(p)).slice().sort((a,b)=>pd(b.date)-pd(a.date));
  const passagesDeivSorted = passagesSource.filter(p=>p.type==="Insectes volants" && matchYear(p)).slice().sort((a,b)=>pd(b.date)-pd(a.date));
  const reinterventionsAnnee = (reinterventions||[]).filter(matchYear);
  const last = passagesSorted[0] || { anomalies:0, conso_totale:0, conso_partielle:0, date:"—", statut:"—" };
  const lastDeiv = passagesDeivSorted[0] || null;

  // Seuils depuis seuilsGlobaux (taux en %)
  const seuilVigilance = seuilsGlobaux?.rongeurs?.taux_vigilance ?? 5;
  const seuilCritique  = seuilsGlobaux?.rongeurs?.taux_critique  ?? 10;
  const nbPostesRongeurs = postesTotal > 0 ? postesTotal : (last.total > 0 ? last.total : 1);
  const tauxActivite   = Math.round(last.anomalies / nbPostesRongeurs * 100);
  const lvl = tauxActivite >= seuilCritique ? "critique" : tauxActivite >= seuilVigilance ? "alerte" : "ok";
  const lvlColor = lvl === "critique" ? "#ef4444" : lvl === "alerte" ? "#f59e0b" : "#22c55e";
  const lvlLabel = lvl === "critique" ? "SEUIL CRITIQUE DEPASSE" : lvl === "alerte" ? "SEUIL DE VIGILANCE ATTEINT" : "ACTIVITE NORMALE";

  const lastReinv = reinterventionsAnnee.length > 0
    ? reinterventionsAnnee.slice().sort((a,b) => pd(b.date)-pd(a.date))[0]
    : null;

  function getPct(idx) {
    if (idx < 0 || idx >= passagesSorted.length - 1) return null;
    const curr = passagesSorted[idx].anomalies;
    const prev = passagesSorted[idx + 1].anomalies;
    if (prev === 0) return null;
    return Math.round((curr - prev) / prev * 100);
  }

  const pctGlobal = (() => {
    if (passagesSorted.length < 2) return null;
    const first = passagesSorted[passagesSorted.length-1].anomalies;
    const lastA = passagesSorted[0].anomalies;
    if (first === 0) return null;
    return Math.round((lastA - first) / first * 100);
  })();

  function handleExport() {
    const sorted = passagesSorted;
    const filtered = passagesSorted;
    const pctGlobalStr = pctGlobal !== null ? (pctGlobal > 0 ? "+" : "") + pctGlobal + "%" : "-";
    const rows = filtered.map(p => {
      const idx = sorted.indexOf(p);
      const prev = sorted[idx+1];
      const pct = prev && prev.anomalies > 0 ? Math.round((p.anomalies - prev.anomalies) / prev.anomalies * 100) : null;
      const pctStr = pct !== null ? (pct > 0 ? "+" : "") + pct + "%" : "";
      const pctColor = pct !== null && pct < 0 ? "green" : pct !== null && pct > 0 ? "red" : "gray";
      return "<tr><td>" + p.date + "</td><td style='font-weight:700;color:" + pctColor + "'>" + pctStr + "</td><td class='tot'>" + p.conso_totale + "</td><td class='par'>" + p.conso_partielle + "</td><td>" + p.total + "</td><td>" + p.statut + "</td></tr>";
    }).join("");
    const reinvHtml = lastReinv ? "<div class='kpi'><div class='kpi-v' style='color:#dc2626'>" + lastReinv.date + "</div><div class='kpi-l'>Derniere reintervention</div></div>" : "";
    const anneeHtml = (filterYear && filterYear !== "Tout") ? " - " + filterYear : "";
    exportHTML(
      "Tableau de bord - " + CLIENT_CONFIG.nom + anneeHtml,
      "<style>@page{size:A4;margin:8mm 10mm;}body{padding:8mm;font-size:10px;}.kpi-grid{grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px;}.kpi{padding:6px;}.kpi-v{font-size:15px;}h1{font-size:15px;margin-bottom:10px;}h2{margin:10px 0 6px;}table{font-size:9px;}th,td{padding:4px 6px;}</style>" +
      "<h1>Tableau de bord - " + CLIENT_CONFIG.nom + anneeHtml + "</h1>" +
      "<p style='color:#7a90aa;margin-bottom:16px'>" + CLIENT_CONFIG.type_site + " - " + new Date().toLocaleDateString("fr-FR") + "</p>" +
      "<div class='kpi-grid'>" +
        "<div class='kpi'><div class='kpi-v' style='color:#1d4ed8'>" + postesTotal + "</div><div class='kpi-l'>Postes controles</div></div>" +
        "<div class='kpi'><div class='kpi-v' style='color:#7c3aed'>" + passagesSorted.length + "</div><div class='kpi-l'>Passages periodiques</div></div>" +
        "<div class='kpi'><div class='kpi-v' style='color:#d97706'>" + passagesDeivSorted.length + "</div><div class='kpi-l'>Passages DEIV</div></div>" +
        "<div class='kpi'><div class='kpi-v' style='color:#dc2626'>" + reinterventionsAnnee.length + "</div><div class='kpi-l'>Réinterventions</div></div>" +
        "<div class='kpi'><div class='kpi-v' style='color:" + (pctGlobal !== null && pctGlobal <= 0 ? "green" : "red") + "'>" + pctGlobalStr + "</div><div class='kpi-l'>Evolution globale</div></div>" +
        "<div class='kpi'><div class='kpi-v' style='color:#7c3aed'>" + last.date + "</div><div class='kpi-l'>Dernier passage periodique</div></div>" +
        (lastDeiv ? "<div class='kpi'><div class='kpi-v' style='color:#d97706'>" + lastDeiv.date + "</div><div class='kpi-l'>Dernier passage DEIV</div></div>" : "") +
        reinvHtml +
      "</div>" +
      "<h2>Historique des passages mensuels" + anneeHtml + "</h2>" +
      "<table><thead><tr><th>Date</th><th>Evolution</th><th>Conso. totale</th><th>Conso. partielle</th><th>Total postes</th><th>Statut</th></tr></thead><tbody>" + rows + "</tbody></table>"
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={handleExport}
          style={{ background: "#1d4ed822", color: "#3b82f6", border: "1px solid #3b82f644", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Export PDF
        </button>
      </div>

      <div style={{ background: "linear-gradient(135deg,#0f2356 0%,#1d3f7a 45%,#1a5a99 80%,#0e7490 100%)", borderRadius: 16, padding: "28px 32px", marginBottom: 24, position:"relative", overflow:"hidden" }}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(14,116,144,0.2) 0%, transparent 50%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",right:-20,top:-20,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.04)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",right:60,bottom:-40,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.03)",pointerEvents:"none"}}/>
        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Portail Client Sanitation</div>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom: 4 }}>
          {TOQUE_LOGO
            ? <img src={TOQUE_LOGO} alt="Logo client" onClick={onLogoClick} style={{ height:56, width:"auto", objectFit:"contain", borderRadius:8, background:"rgba(255,255,255,0.08)", padding:4, cursor:"pointer" }} title="Cliquer pour modifier le logo"/>
            : <div onClick={onLogoClick} title="Cliquer pour ajouter le logo du client"
                style={{ height:56, width:56, borderRadius:8, background:"rgba(255,255,255,0.08)", border:"2px dashed #5a7090", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:22, color:"#7a90aa" }}>+</div>}
          <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9" }}>{CLIENT_CONFIG.nom}</div>
          <SiteSwitcher/>
        </div>
        <div style={{ fontSize: 13, color: "#7a90aa", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span>{CLIENT_CONFIG.type_site} - Contrat N {CLIENT_CONFIG.contrat}</span>
          {(CLIENT_CONFIG.certifications||[]).map(c=>(
            <span key={c} style={{ fontSize:10, fontWeight:700, background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:10, padding:"2px 9px" }}>{c}</span>
          ))}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#3b82f6" }}>{postesTotal}</div>
            <div style={{ fontSize: 10, color: "#7a90aa", marginTop: 2 }}>Postes controles</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa" }}>{passagesSorted.length}</div>
            <div style={{ fontSize: 10, color: "#7a90aa", marginTop: 2 }}>Passages periodiques</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>{passagesDeivSorted.length}</div>
            <div style={{ fontSize: 10, color: "#7a90aa", marginTop: 2 }}>Passages DEIV</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#22c55e" }}>{nbMaintenancesDeiv}</div>
            <div style={{ fontSize: 10, color: "#7a90aa", marginTop: 2 }}>Maintenances DEIV</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>{reinterventionsAnnee.length}</div>
            <div style={{ fontSize: 10, color: "#7a90aa", marginTop: 2 }}>Réinterventions</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#a78bfa" }}>{last.date}</div>
            <div style={{ fontSize: 10, color: "#7a90aa", marginTop: 2 }}>Dernier passage périodique</div>
            {lastDeiv && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>{lastDeiv.date}</div>
                <div style={{ fontSize: 10, color: "#7a90aa", marginTop: 2 }}>Dernier passage DEIV</div>
              </div>
            )}
            {lastReinv && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444" }}>{lastReinv.date}</div>
                <div style={{ fontSize: 10, color: "#7a90aa", marginTop: 2 }}>Derniere reintervention</div>
              </div>
            )}
          </div>
          {pctGlobal !== null && (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 18px" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: pctGlobal <= 0 ? "#22c55e" : "#ef4444" }}>{pctGlobal > 0 ? "+" : ""}{pctGlobal}%</div>
              <div style={{ fontSize: 10, color: "#7a90aa", marginTop: 2 }}>Evolution globale</div>
            </div>
          )}
        </div>
      </div>

      {/* Alertes automatiques */}
      {(() => {
        const alertes = [];

        // 1. Seuil dépassé sur le dernier passage rongeurs
        if (lvl === "critique") alertes.push({ type:"critique", icon:"🔴", titre:"Seuil critique dépassé", msg:`${last.anomalies} consommation(s) sur ${nbPostesRongeurs} postes (${tauxActivite}%) lors du dernier passage (${last.date}) — seuil critique : ${seuilCritique}%` });
        else if (lvl === "alerte") alertes.push({ type:"alerte", icon:"🟠", titre:"Seuil de vigilance atteint", msg:`${last.anomalies} consommation(s) sur ${nbPostesRongeurs} postes (${tauxActivite}%) lors du dernier passage (${last.date}) — seuil vigilance : ${seuilVigilance}%` });

        // 2. Passages manqués (fréquence contractuelle) - uniquement sur l annee en cours
        const anneeEnCours = String(new Date().getFullYear());
        if (passagesSorted.length > 0 && (filterYear === "Tout" || filterYear === anneeEnCours)) {
          const lastDate = pd(passagesSorted[0].date);
          const now = new Date();
          const daysSince = Math.floor((now-lastDate)/(1000*60*60*24));
          const expectedDays = Math.floor(365/CLIENT_CONFIG.passages_an);
          if (daysSince > expectedDays * 1.2) {
            alertes.push({ type:"alerte", icon:"📅", titre:"Retard de passage", msg:`Dernier passage il y a ${daysSince} jours — fréquence contractuelle : tous les ${expectedDays} jours` });
          }
        }

        // 3. Réinterventions récentes
        const reinterRecentes = reinterventionsAnnee.filter(r => {
          const d = pd(r.date); const now = new Date();
          return (now-d)/(1000*60*60*24) <= 30;
        });
        if (reinterRecentes && reinterRecentes.length > 0) {
          alertes.push({ type:"info", icon:"⚠️", titre:`${reinterRecentes.length} réintervention(s) ce mois`, msg:`Dernière : ${reinterRecentes.sort((a,b)=>pd(b.date)-pd(a.date))[0].date} — Poste ${reinterRecentes[0].poste||""}` });
        }

        // 4. Actions critiques non résolues
        if (passagesSource.length === 0) return null;

        if (alertes.length === 0) {
          return (
            <div style={{ background:"#22c55e11", border:"1px solid #22c55e33", borderRadius:12, padding:"12px 18px", marginBottom:20, display:"flex", gap:12, alignItems:"center" }}>
              <span style={{fontSize:20}}>✅</span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#22c55e" }}>Aucune alerte — Activité normale</div>
                <div style={{ fontSize:11, color:"#7a90aa" }}>Dernier passage : {last.date} — {last.anomalies} consommation(s)</div>
              </div>
            </div>
          );
        }

        return (
          <div style={{marginBottom:20}}>
            {alertes.map((a,i)=>{
              const col = a.type==="critique"?"#ef4444":a.type==="alerte"?"#f59e0b":"#3b82f6";
              return (
                <div key={i} style={{ background:col+"11", border:"1px solid "+col+"33", borderRadius:10, padding:"10px 16px", marginBottom:8, display:"flex", gap:12, alignItems:"flex-start" }}>
                  <span style={{fontSize:18,flexShrink:0}}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:col }}>{a.titre}</div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{a.msg}</div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#7a90aa", letterSpacing: 1, textTransform: "uppercase" }}>Historique des passages mensuels</div>
          <div style={{ display: "flex", gap: 4 }}>
            {["Tout", ...anneesList].map(y => (
              <button key={y} onClick={() => setFilterYear(y)}
                style={{ background: filterYear === y ? "#1d4ed8" : "#1a2540", color: filterYear === y ? "#fff" : "#7a90aa", border: "1px solid " + (filterYear === y ? "#1d4ed8" : "#3d5270"), borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {y}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const filtered = passagesSorted;
          const byYear = {};
          filtered.forEach(p => {
            const year = p.date.split("/")[2] || "?";
            if (!byYear[year]) byYear[year] = [];
            byYear[year].push(p);
          });
          return Object.keys(byYear).sort((a,b) => b-a).map(year => (
            <div key={year} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, borderLeft: "3px solid #3b82f6", paddingLeft: 8 }}>
                {year}
              </div>
              {byYear[year].map(p => {
                const idx = passagesSorted.indexOf(p);
                const pct = getPct(idx);
                const pctColor = pct === null ? "#7a90aa" : pct < 0 ? "#22c55e" : "#ef4444";
                const pctLabel = pct === null ? null : (pct > 0 ? "+" : "") + pct + "%";
                return (
                  <div key={p.id} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "10px 12px", background: "#1a2540", borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 12, color: "#7a90aa", minWidth: 90 }}>{p.date}</div>
                    {pctLabel && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: pctColor, background: pctColor + "22", borderRadius: 6, padding: "1px 7px" }}>{pctLabel}</span>
                    )}
                    <div style={{ flex: 1, fontSize: 12 }}>
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>{p.conso_totale}</span> tot.&nbsp;
                      <span style={{ color: "#f59e0b", fontWeight: 700 }}>{p.conso_partielle}</span> part.
                    </div>
                    <Badge label={p.statut} />
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </Card>
    </div>
  );
}

// ============================================================
// PASSAGES
// ============================================================
function Interventions({ reinterventions, setReinterventions, passagesGlobaux, setPassagesGlobaux }) {
  const [sel, setSel]         = useState(null);
  const [tab, setTab]         = useState("tous");
  const [filterAnnee, setFilterAnnee] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [passagesSaisies, setPassagesSaisies] = useState([]);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [postesRongeurs, setPostesRongeurs] = useState([]);

  useEffect(() => {
    sbGet("postes").then(data => {
      if (data && data.length > 0) {
        setPostesRongeurs(data.filter(p => {
          const n = (p.nuisible||"Rongeurs");
          return n !== "Insectes volants";
        }));
      }
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    sbGet("passages").then(data => {
      if (data && data.length > 0) {
        const parsed = data.map(r => ({ ...r, actions: typeof r.actions==="string"?JSON.parse(r.actions||"[]"):(r.actions||[]), photos: typeof r.photos==="string"?JSON.parse(r.photos||"[]"):(r.photos||[]) }));
        // Merge with passagesGlobaux (new unsaved ones)
        const ids = new Set(parsed.map(p=>String(p.id)));
        const extra = (passagesGlobaux||[]).filter(p=>!ids.has(String(p.id)));
        setPassagesSaisies([...extra, ...parsed]);
      } else if (passagesGlobaux && passagesGlobaux.length > 0) {
        setPassagesSaisies(passagesGlobaux);
      }
    }).catch(()=>{});
  }, []);

  const TECHNICIENS = useTechniciens();
  const ACTIONS_LIST = ["Remplacement appats","Renouvellement pieges","Pose piege supplementaire","Colmatage passage","Nettoyage poste","Inspection renforcee","Traitement curatif","Photo prise","Observation transmise"];
  const [form, setForm] = useState({ date:"", technicien:"", poste:"", anomalie:"", actions:[], observations:"", statut:"En cours" });

  function toggleAction(a) { setForm(p => ({ ...p, actions: p.actions.includes(a) ? p.actions.filter(x=>x!==a) : [...p.actions, a] })); }

  function submitReinv() {
    if (!form.date || !form.technicien || !form.poste) return;
    const item = { ...form, id: Date.now(), contrat: CLIENT_CONFIG.contrat };
    setReinterventions(prev => [item, ...prev]);
    sbUpsert("reinterventions", item);
    setShowForm(false);
    setForm({ date:"", technicien:"", poste:"", anomalie:"", actions:[], observations:"", statut:"En cours" });
  }

  function deleteReinv(id) {
    setReinterventions(prev => prev.filter(i => i.id !== id));
    sbDelete("reinterventions", id);
  }

  function parseDate(d) {
    if (!d) return new Date(0);
    const p = d.split("/");
    if (p.length === 3) return new Date(`${p[2]}-${p[1]}-${p[0]}`);
    return new Date(d);
  }

  // Fusionner passages Supabase + PASSAGES codés en dur (fallback)
  const passagesToShow = passagesSaisies.length > 0 ? passagesSaisies : PASSAGES;

  const allEventsRaw = [
    ...passagesToShow.map(p => ({ ...p, _kind: "passage" })),
    ...(reinterventions || []).map(r => ({ ...r, _kind: "reinv" })),
  ].sort((a, b) => parseDate(b.date) - parseDate(a.date));

  const anneesDispo = [...new Set(allEventsRaw.map(e=>{ const d=parseDate(e.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>b-a);

  const anneesKey = anneesDispo.join(",");

  // Annee affichee par defaut : l annee en cours si elle a des evenements, sinon la plus recente
  useEffect(() => {
    if (filterAnnee === null && anneesDispo.length > 0) {
      const courante = new Date().getFullYear();
      setFilterAnnee(String(anneesDispo.indexOf(courante) !== -1 ? courante : anneesDispo[0]));
    }
  }, [anneesKey]);

  const allEvents = (filterAnnee===null||filterAnnee==="Toutes") ? allEventsRaw : allEventsRaw.filter(e=>{ const d=parseDate(e.date); return d && d.getFullYear()===parseInt(filterAnnee); });

  // Passages de l annee affichee - alimente les compteurs du haut
  const passagesAnnee = allEvents.filter(e=>e._kind==="passage");
  const nbDeiv = passagesAnnee.filter(p=>p.type==="Insectes volants").length;
  const nbPassages = passagesAnnee.length - nbDeiv;
  const anneeLabel = (filterAnnee && filterAnnee !== "Toutes") ? filterAnnee : "Toutes les annees";

  const filtered = tab === "passages"       ? allEvents.filter(e => e._kind === "passage" && e.type !== "Insectes volants")
                 : tab === "reinterventions" ? allEvents.filter(e => e._kind === "reinv")
                 : tab === "deiv"           ? allEvents.filter(e => e._kind === "passage" && e.type === "Insectes volants")
                 : allEvents;

  const nbReinv = allEvents.filter(e=>e._kind==="reinv").length;

  // Dernier passage periodique depuis Supabase (ou fallback PASSAGES)
  const lastPassageDate = passagesAnnee.length > 0
    ? passagesAnnee.slice().sort((a,b) => {
        const pd = d => { const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d||0); };
        return pd(b.date)-pd(a.date);
      })[0].date
    : "—";

  // Derniere reintervention
  const lastReinvDate = nbReinv > 0
    ? allEvents.filter(e=>e._kind==="reinv").slice().sort((a, b) => {
        const pd = d => { if (!d) return 0; const p = (d||"").split("/"); return p.length===3 ? new Date(p[2]+"-"+p[1]+"-"+p[0]) : new Date(d||0); };
        return pd(b.date) - pd(a.date);
      })[0].date
    : null;
  const SREINV  = { Traité:"#22c55e", "En cours":"#f59e0b", Planifié:"#3b82f6" };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9", marginBottom:2 }}>Suivi des passages</div>
          <div style={{ fontSize:13, color:"#7a90aa" }}>{passagesAnnee.length} passages — {nbReinv} réintervention(s)</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => {
            const passagesRows = passagesAnnee.map(p => {
              const saisiesP = typeof p.saisies==="string"?JSON.parse(p.saisies||"{}"):p.saisies||{};
              const ct = p.conso_totale ?? Object.values(saisiesP).filter(s=>s&&estConsoTotale(s.etat)).length;
              const cp = p.conso_partielle ?? Object.values(saisiesP).filter(s=>s&&(s.etat==="25%"||s.etat==="50%"||s.etat==="75%"||s.etat==="CONSOMMATION PARTIELLE")).length;
              const tot = p.total ?? Object.keys(saisiesP).length;
              return "<tr><td>"+p.date+"</td><td>"+tot+"</td><td style='color:#dc2626;font-weight:700'>"+ct+"</td><td style='color:#d97706;font-weight:700'>"+cp+"</td><td>"+(p.statut||"")+"</td></tr>";
            }).join("");
            const reinvRows = allEvents.filter(e=>e._kind==="reinv").slice().sort((a,b) => {
              const pd = d => { const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d||0); };
              return pd(b.date) - pd(a.date);
            }).map(r =>
              "<tr><td>" + r.date + "</td><td>" + (r.technicien||"") + "</td><td>" + (r.poste||"") + "</td><td>" + (r.anomalie||"") + "</td><td>" + (r.statut||"") + "</td></tr>"
            ).join("");
            exportHTML("Suivi des passages - " + CLIENT_CONFIG.nom + " - " + anneeLabel,
              "<h1>Suivi des passages — " + CLIENT_CONFIG.nom + " — " + anneeLabel + "</h1>" +
              "<p style='color:#7a90aa;margin-bottom:16px'>Edite le " + new Date().toLocaleDateString("fr-FR") + "</p>" +
              "<div class='kpi-grid'>" +
                "<div class='kpi'><div class='kpi-v' style='color:#1d4ed8'>" + passagesAnnee.length + "</div><div class='kpi-l'>Passages</div></div>" +
                "<div class='kpi'><div class='kpi-v' style='color:#dc2626'>" + nbReinv + "</div><div class='kpi-l'>Réinterventions</div></div>" +
                "<div class='kpi'><div class='kpi-v' style='color:#7c3aed'>" + (passagesAnnee.length + nbReinv) + "</div><div class='kpi-l'>Total interventions</div></div>" +
                "<div class='kpi'><div class='kpi-v' style='color:#16a34a;font-size:14px'>" + (passagesAnnee.length>0 ? passagesAnnee.slice().filter(p=>p.type!=="Insectes volants").sort((a,b)=>{const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0);};return pd(b.date)-pd(a.date);})[0]?.date||"—" : "—") + "</div><div class='kpi-l'>Dernier passage</div></div>" +
                (lastReinvDate ? "<div class='kpi'><div class='kpi-v' style='color:#dc2626;font-size:14px'>" + lastReinvDate + "</div><div class='kpi-l'>Dernière réintervention</div></div>" : "") +
              "</div>" +
              "<h2>Historique des passages</h2>" +
              "<table><thead><tr><th>Date</th><th>Total postes</th><th>Conso. totale</th><th>Conso. partielle</th><th>Statut</th></tr></thead><tbody>" + passagesRows + "</tbody></table>" +
              (reinvRows ? "<h2>Réinterventions</h2><table><thead><tr><th>Date</th><th>Technicien</th><th>Poste</th><th>Anomalie</th><th>Statut</th></tr></thead><tbody>" + reinvRows + "</tbody></table>" : "")
            );
          }}
            style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:8, padding:"9px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Export PDF
          </button>
          <button onClick={() => {
            const allPassages = passagesAnnee;
            const headers = ["Date","Type","Technicien","Total postes","Conso totale","Conso partielle","Statut"];
            const rows = allPassages.map(p => [p.date, p.type||"", p.technicien||"", p.total||"", p.conso_totale||"", p.conso_partielle||"", p.statut||""]);
            exportCSV("passages_"+CLIENT_CONFIG.nom.replace(/\s+/g,"_")+"_"+anneeLabel.replace(/\s+/g,"_"), headers, rows);
          }}
            style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:8, padding:"9px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Export Excel
          </button>
        </div>
      </div>

      {/* KPIs globaux */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:16 }}>
        <Kpi label="Passages"         value={nbPassages}  color="#3b82f6"/>
        <Kpi label="Passages DEIV"    value={nbDeiv}           color="#f59e0b"/>
        <Kpi label="Réinterventions"  value={nbReinv}           color="#ef4444"/>
        <Kpi label="Total interventions" value={passagesAnnee.length + nbReinv} color="#a78bfa"/>
        <Kpi label="Dernier passage"  value={lastPassageDate} color="#22c55e" fontSize={14}/>
        {lastReinvDate && <Kpi label="Derniere reintervention" value={lastReinvDate} color="#ef4444" fontSize={14}/>}
      </div>

      {/* Filtres onglets */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", gap:4, background:"#1a2540", borderRadius:10, padding:3, width:"fit-content" }}>
          {[["tous","Tout voir"],["passages","Passages ("+nbPassages+")"],["deiv","DEIV ("+nbDeiv+")"],["reinterventions","Reinterventions ("+nbReinv+")"]].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)}
              style={{ background:tab===id?(id==="deiv"?"#f59e0b":"#1d4ed8"):"transparent", color:tab===id?"#fff":"#7a90aa", border:"none", borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {label}
            </button>
          ))}
        </div>
        {anneesDispo.length > 0 && (
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <span style={{fontSize:11,color:"#7a90aa"}}>Annee :</span>
            <select value={filterAnnee||"Toutes"} onChange={e=>setFilterAnnee(e.target.value)}
              style={{background:"#243352",border:"1px solid #3d5270",borderRadius:7,padding:"6px 10px",color:"#f1f5f9",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>
              <option value="Toutes">Toutes</option>
              {anneesDispo.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Timeline unifiée */}
      <div style={{ position:"relative" }}>
        {/* Ligne verticale */}
        <div style={{ position:"absolute", left:18, top:0, bottom:0, width:2, background:"#243352", zIndex:0 }}/>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {filtered.map((event, i) => {
            const isOpen = sel === (event._kind + event.id);
            const key    = event._kind + event.id;

            if (event._kind === "passage") {
              const p = event;
              // Calculer les stats à la volée depuis les saisies
              const saisiesP = typeof p.saisies==="string"?JSON.parse(p.saisies||"{}"):p.saisies||{};
              const conso_totale = p.conso_totale ?? Object.values(saisiesP).filter(s=>s&&estConsoTotale(s.etat)).length;
              const conso_partielle = p.conso_partielle ?? Object.values(saisiesP).filter(s=>s&&(s.etat==="25%"||s.etat==="50%"||s.etat==="75%"||s.etat==="CONSOMMATION PARTIELLE")).length;
              const anomalies = p.anomalies ?? (conso_totale + conso_partielle + Object.values(saisiesP).filter(s=>s&&(parseInt(s.cap_souris||0)+parseInt(s.cap_ratBrun||0)+parseInt(s.cap_ratNoir||0))>0).length);
              // Postes controles = postes reellement presents dans les saisies
              const total = p.total ?? Object.keys(saisiesP).length;
              const pEnriched = {...p, conso_totale, conso_partielle, anomalies, total};
              const nbPostesTotal = passagesToShow.length > 0 ? Math.max(...passagesToShow.map(p=>{ const s=typeof p.saisies==="string"?JSON.parse(p.saisies||"{}"):p.saisies||{}; return Object.keys(s).length; }), 1) : 1;
              const tauxAct = nbPostesTotal > 0 ? Math.round(anomalies / nbPostesTotal * 100) : 0;
              const lvlColor = tauxAct >= SEUILS.critique ? "#ef4444" : tauxAct >= SEUILS.alerte ? "#f59e0b" : "#22c55e";
              const actifs   = POSTES_INIT.filter(po => po.passages[p.date]);
              // Réinterventions liées à ce passage (même mois ou postérieures proches)
              const pDate = parseDate(p.date);
              const reinvLiees = (reinterventions||[]).filter(r => {
                const rd = parseDate(r.date);
                const diff = (rd - pDate) / (1000*60*60*24);
                return diff >= 0 && diff <= 45;
              });

              return (
                <div key={key} style={{ position:"relative", paddingLeft:44 }}>
                  {/* Dot passage */}
                  <div style={{ position:"absolute", left:10, top:16, width:18, height:18, borderRadius:"50%", background:lvlColor, border:"3px solid #1a2540", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:8, fontWeight:900, color:"#fff" }}>P</span>
                  </div>
                  <Card selected={isOpen} onClick={() => setSel(isOpen ? null : key)}>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
                      <div style={{ minWidth:90, fontSize:13, fontWeight:700, color:"#f1f5f9", fontFamily:"monospace" }}>{p.date}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9" }}>
                            {p.type==="Insectes volants" ? "Passage DEIV" : "Contrôle périodique"}
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, background:p.type==="Insectes volants"?"#f59e0b22":"#3b82f622", color:p.type==="Insectes volants"?"#f59e0b":"#3b82f6", border:"1px solid "+(p.type==="Insectes volants"?"#f59e0b44":"#3b82f644"), borderRadius:10, padding:"1px 8px" }}>
                            {p.type==="Insectes volants" ? "DEIV" : "PASSAGE"}
                          </span>
                          {p.technicien&&<span style={{fontSize:11,color:"#7a90aa"}}>{p.technicien}</span>}
                        </div>
                        <div style={{ fontSize:12, color:"#7a90aa" }}>
                          {p.type==="Insectes volants" ? (() => {
                            const saisies = typeof p.saisies==="string"?JSON.parse(p.saisies||"{}"):p.saisies||{};
                            const totalIns = Object.values(saisies).reduce((acc,s)=>{ if(!s)return acc; return acc+["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"].reduce((a,cat)=>a+(parseInt(s["iv_"+cat]||0)),0); },0);
                            const nbDeivSaisis = Object.keys(saisies).length;
                            return nbDeivSaisis+" DEIV — "+totalIns+" insectes captures";
                          })() : (() => {
                            const saisies = typeof p.saisies==="string"?JSON.parse(p.saisies||"{}"):p.saisies||{};
                            // Un poste est vérifié si son entrée existe dans saisies (même etat vide = RAS)
                            const nbVerifies = Object.keys(saisies).filter(id => {
                              const s = saisies[id];
                              return s !== null && s !== undefined;
                            }).length;
                            const totalPostesRongeurs = postesRongeurs.length || "?";
                            return nbVerifies+" / "+totalPostesRongeurs+" postes verifies";
                          })()}
                        </div>
                      </div>
                      {reinvLiees.length > 0 && (
                        <span style={{ fontSize:10, fontWeight:700, background:"#ef444422", color:"#ef4444", border:"1px solid #ef444444", borderRadius:10, padding:"1px 8px" }}>
                          {reinvLiees.length} réintervention(s)
                        </span>
                      )}
                    </div>
                    {isOpen && (
                      <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #3d5270" }}>
                        {p.type==="Insectes volants" ? (()=>{
                          const CATS = ["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"];
                          const CAT_COLORS = {"Moucherons":"#f59e0b","Mouches":"#ef4444","Moustiques":"#3b82f6","Hyménoptères":"#22c55e","Lépidoptères":"#8b5cf6","Coléoptères":"#06b6d4","Punaises":"#f97316","Tipules":"#7a90aa"};
                          const totParCat = {};
                          CATS.forEach(cat=>{ totParCat[cat]=0; });
                          Object.values(saisiesP).forEach(s=>{ if(!s)return; CATS.forEach(cat=>{ totParCat[cat]+=(parseInt(s["iv_"+cat]||0)); }); });
                          const catsAvecData = CATS.filter(cat=>totParCat[cat]>0);
                          return (
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8,marginBottom:12}}>
                              {catsAvecData.length===0
                                ? <div style={{fontSize:12,color:"#5a7090",gridColumn:"1/-1"}}>Aucune capture enregistrée</div>
                                : catsAvecData.map(cat=>(
                                  <div key={cat} style={{background:"#1a2540",borderRadius:8,padding:"8px 12px"}}>
                                    <div style={{fontSize:10,color:"#7a90aa"}}>{cat}</div>
                                    <div style={{fontSize:18,fontWeight:700,color:CAT_COLORS[cat]}}>{totParCat[cat]}</div>
                                  </div>
                                ))
                              }
                            </div>
                          );
                        })() : (
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:8, marginBottom:12 }}>
                          {[["Postes",pEnriched.total],["Conso. totale",pEnriched.conso_totale],["Conso. partielle",pEnriched.conso_partielle],["Total actifs",pEnriched.anomalies]].map(item => (
                            <div key={item[0]} style={{ background:"#1a2540", borderRadius:8, padding:"8px 12px" }}>
                              <div style={{ fontSize:10, color:"#7a90aa" }}>{item[0]}</div>
                              <div style={{ fontSize:18, fontWeight:700, color:lvlColor }}>{item[1]}</div>
                            </div>
                          ))}
                        </div>
                        )}
                        {actifs.length > 0 && (
                          <div style={{ marginBottom:12 }}>
                            <div style={{ fontSize:11, color:"#7a90aa", marginBottom:6 }}>Postes actifs ({actifs.length})</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                              {actifs.map(a => {
                                const e = a.passages[p.date];
                                const c = estConsoTotale(e) ? "#ef4444" : "#f59e0b";
                                return (
                                  <div key={a.id} style={{ background:"#1a2540", border:"1px solid "+c+"44", borderRadius:6, padding:"3px 8px", fontSize:11 }}>
                                    <span style={{ color:"#f1f5f9", fontWeight:700 }}>{a.id}</span>
                                    <span style={{ color:c, marginLeft:5, fontSize:10 }}>{estConsoTotale(e)?"TOT":"PAR"}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {reinvLiees.length > 0 && (
                          <div style={{ background:"#ef444408", border:"1px solid #ef444422", borderRadius:10, padding:"10px 14px" }}>
                            <div style={{ fontSize:11, fontWeight:700, color:"#ef4444", marginBottom:8 }}>Réinterventions associées ({reinvLiees.length})</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                              {reinvLiees.map(r => (
                                <div key={r.id} style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center", background:"#1a2540", borderRadius:8, padding:"8px 12px" }}>
                                  <span style={{ fontSize:12, fontFamily:"monospace", color:"#fca5a5", fontWeight:700 }}>{r.date}</span>
                                  <span style={{ fontSize:12, color:"#f1f5f9", flex:1 }}>{r.technicien}</span>
                                  <span style={{ fontSize:11, color:"#7a90aa" }}>Postes : {r.poste}</span>
                                  {r.statut && <Badge label={r.statut} color={SREINV[r.statut]||"#7a90aa"}/>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              );
            }

            // ── Réintervention ──
            const r = event;
            return (
              <div key={key} style={{ position:"relative", paddingLeft:44 }}>
                {/* Dot réintervention */}
                <div style={{ position:"absolute", left:10, top:16, width:18, height:18, borderRadius:"50%", background:"#ef4444", border:"3px solid #1a2540", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:8, fontWeight:900, color:"#fff" }}>R</span>
                </div>
                <Card selected={isOpen} onClick={() => setSel(isOpen ? null : key)}
                  style={{ borderLeft:"3px solid #ef444444" }}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
                    <div style={{ minWidth:90, fontSize:13, fontWeight:700, color:"#fca5a5", fontFamily:"monospace" }}>{r.date}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9" }}>{r.technicien}</div>
                        <span style={{ fontSize:10, fontWeight:700, background:"#ef444422", color:"#ef4444", border:"1px solid #ef444444", borderRadius:10, padding:"1px 8px" }}>RÉINTERVENTION</span>
                      </div>
                      <div style={{ fontSize:12, color:"#7a90aa" }}>Postes : {r.poste}</div>
                    </div>
                    {(r.actions||[]).slice(0,2).map(a => (
                      <span key={a} style={{ fontSize:10, fontWeight:600, background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:4, padding:"2px 7px" }}>{a}</span>
                    ))}
                    {(r.actions||[]).length > 2 && <span style={{ fontSize:10, color:"#7a90aa" }}>+{r.actions.length-2}</span>}
                    <Badge label={r.statut||"En cours"} color={SREINV[r.statut]||"#7a90aa"}/>
                    <button onClick={e => { e.stopPropagation(); deleteReinv(r.id); setSel(null); }}
                      style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444444", borderRadius:7, padding:"3px 9px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
                  </div>
                  {isOpen && r.observations && (
                    <div style={{ marginTop:12, background:"#1a3360", border:"1px solid #1d4ed844", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#93c5fd" }}>
                      {r.observations}
                    </div>
                  )}
                  {isOpen && r.anomalie && (
                    <div style={{ marginTop:8, background:"#ef444411", border:"1px solid #ef444433", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#fca5a5" }}>
                      <strong>Anomalie :</strong> {r.anomalie}
                    </div>
                  )}
                  {isOpen && (() => {
                    const photos = typeof r.photos==="string" ? JSON.parse(r.photos||"[]") : (r.photos||[]);
                    if (!photos.length) return null;
                    return (
                      <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
                        {photos.map((ph,j)=>(
                          <img key={j} src={ph.url} alt={ph.name}
                            style={{width:80,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270",cursor:"zoom-in"}}
                            onClick={e=>{e.stopPropagation();setLightboxImg(ph.url);}}/>
                        ))}
                      </div>
                    );
                  })()}
                </Card>
              </div>
            );
          })}
        </div>
      </div>
      {lightboxImg && (
        <div onClick={()=>setLightboxImg(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,cursor:"zoom-out"}}>
          <img src={lightboxImg} style={{maxWidth:"90vw",maxHeight:"90vh",borderRadius:10,objectFit:"contain"}}/>
        </div>
      )}
    </div>
  );
}


// ============================================================
// POSTES ET ZONES (avec seuils dynamiques + IPS + GLUE corrigé)
// ============================================================
function Cartographie({ seuilsGlobaux }) {
  const [postes, setPostes] = useState(POSTES_INIT.map(p => ({ ...p })));
  const [passagesSaisies, setPassagesSaisies] = useState([]);
  const [subtab, setSubtab] = useState("rongeurs");
  const [filterInsecte, setFilterInsecte] = useState("Tous");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);
  const [filterMacro, setFilterMacro] = useState("Toutes");
  const [filterAnnee, setFilterAnnee] = useState(null);
  const [editingConso, setEditingConso] = useState(false);
  const [consoEdit, setConsoEdit] = useState({});

  const RONGEURS_TYPES = ["Rongeurs"];
  const INSECTES_TYPES = ["Blattes", "Insectes volants", "Teignes", "IPS"];
  const NUISIBLE_COLORS = { Blattes: "#ef4444", "Insectes volants": "#eab308", Teignes: "#8b5cf6", IPS: "#22c55e", Rongeurs: "#3b82f6" };

  useEffect(() => {
    // Charger postes
    sbGet("postes").then(data => {
      if (data && data.length > 0) {
        setPostes(data.map(p => ({ ...p, passages: {} })));
      }
    }).catch(()=>{});
    // Charger passages saisis
    sbGet("passages").then(data => {
      if (data && data.length > 0) setPassagesSaisies(data);
    }).catch(()=>{});
  }, []);

  // Construire les dates dynamiquement depuis les passages saisis
  const DATES_ALL = passagesSaisies.length > 0
    ? [...new Set(passagesSaisies.map(p => p.date))].sort((a,b) => {
        const pd = d => { const p=d.split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
        return pd(a)-pd(b);
      })
    : [];

  const anneesDispo = [...new Set(DATES_ALL.map(d => (d||"").split("/")[2]).filter(Boolean))].sort((a,b) => b-a);
  const anneesKey = anneesDispo.join(",");

  // Annee affichee par defaut : l annee en cours si elle a des passages, sinon la plus recente
  useEffect(() => {
    if (filterAnnee === null && anneesDispo.length > 0) {
      const courante = String(new Date().getFullYear());
      setFilterAnnee(anneesDispo.indexOf(courante) !== -1 ? courante : anneesDispo[0]);
    }
  }, [anneesKey]);

  const DATES = (filterAnnee === null || filterAnnee === "Toutes")
    ? DATES_ALL
    : DATES_ALL.filter(d => (d||"").split("/")[2] === filterAnnee);

  const anneeLabel = (filterAnnee && filterAnnee !== "Toutes") ? filterAnnee : "Toutes les annees";

  const IV_CATS = ["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"];

  // Calculer les passages par poste depuis les saisies Supabase — fusionne tous les passages d'une même date
  // getPassageInfos conserve la valeur brute (pourcentage reel, comptage sans suffixe) pour les exports.
  // getPassagePoste garde exactement la meme sortie qu avant : ecran et panneau de saisie inchanges.
  function getPassageInfos(posteId, date) {
    const passagesDate = passagesSaisies.filter(p => p.date === date);
    if (!passagesDate.length) return { type:"vide", valeur:"" };
    // Fusionner les saisies de tous les passages de cette date
    const merged = {};
    passagesDate.forEach(passage => {
      const saisies = typeof passage.saisies === "string" ? JSON.parse(passage.saisies||"{}") : (passage.saisies||{});
      Object.entries(saisies).forEach(([id, s]) => {
        if (!merged[id]) merged[id] = {...s};
        else {
          Object.keys(s).forEach(k => {
            if (k.startsWith("iv_")) merged[id][k] = (parseInt(merged[id][k]||0)+parseInt(s[k]||0));
            else if (!merged[id][k]) merged[id][k] = s[k];
          });
        }
      });
    });
    const s = merged[posteId];
    if (!s) return { type:"vide", valeur:"" };
    // Rongeurs - consommation : on garde le pourcentage reel
    if (estConsoTotale(s.etat)) return { type:"totale", valeur:"100%" };
    if (s.etat === "75%" || s.etat === "50%" || s.etat === "25%") return { type:"partielle", valeur:s.etat };
    if (s.etat === "CONSOMMATION PARTIELLE") return { type:"partielle", valeur:"" };
    // Rongeurs - captures
    const capR = (parseInt(s.cap_souris||0))+(parseInt(s.cap_ratBrun||0))+(parseInt(s.cap_ratNoir||0));
    if (capR > 0) return { type:"cap", valeur:String(capR) };
    // Insectes volants (DEIV)
    const CATS = ["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"];
    const totalIV = CATS.reduce((acc,cat)=>acc+(parseInt(s["iv_"+cat]||0)),0);
    if (totalIV > 0) return { type:"ins", valeur:String(totalIV) };
    // Blattes, Teignes, IPS
    if (s.etat && !isNaN(parseFloat(s.etat)) && parseFloat(s.etat) > 0) return { type:"num", valeur:String(s.etat) };
    return { type:"vide", valeur:"" };
  }

  // Sortie historique, strictement identique a avant le refactor
  function getPassagePoste(posteId, date) {
    const i = getPassageInfos(posteId, date);
    if (i.type === "totale") return "CONSOMMATION TOTALE";
    if (i.type === "partielle") return "CONSOMMATION PARTIELLE";
    if (i.type === "cap") return i.valeur + " cap.";
    if (i.type === "ins") return i.valeur + " ins.";
    if (i.type === "num") return i.valeur;
    return "";
  }

  // Valeur pour les exports PDF et Excel : que le chiffre, sans suffixe, avec le pourcentage reel
  function valeurExport(p, d) {
    const i = (p.infos||{})[d] || { type:"vide", valeur:"" };
    if (i.type === "vide") return "—";
    if (i.type === "partielle" && !i.valeur) return "PAR";
    return i.valeur;
  }

  // Postes enrichis avec données passages Supabase
  function sortPostesNat(list) {
    const TYPE_ORDER = { "RE": 0, "RI": 1 };
    return list.slice().sort((a,b)=>{
      const ta = TYPE_ORDER[a.type] !== undefined ? TYPE_ORDER[a.type] : 99;
      const tb = TYPE_ORDER[b.type] !== undefined ? TYPE_ORDER[b.type] : 99;
      if (ta !== tb) return ta - tb;
      const parse = id => {
        // Handle formats like s.1, s.2, RE6A, RI12, R1
        const m = id.match(/^([A-Za-z]+)[.\-]?(\d+)([A-Za-z]*)$/);
        return m ? [m[1].toUpperCase(), parseInt(m[2]), m[3].toUpperCase()] : [id.toUpperCase(), 0, ""];
      };
      const [ap,an,as_]=parse(a.id); const [bp,bn,bs]=parse(b.id);
      if(ap!==bp)return ap.localeCompare(bp);
      if(an!==bn)return an-bn;
      return as_.localeCompare(bs);
    });
  }

  const postesAvecPassages = sortPostesNat(postes).map(p => {
    const passages = {}; const infos = {};
    DATES.forEach(d => { passages[d] = getPassagePoste(p.id, d); infos[d] = getPassageInfos(p.id, d); });
    return { ...p, passages, infos };
  });

  const macros = ["Toutes", ...new Set(postesAvecPassages.map(p => p.macro))];

  // Seuils partages depuis App - sert a la coloration du tableau
  const seuilsDyn = {
    Teignes: { vigilance: (seuilsGlobaux.teignes||{}).leger, critique: (seuilsGlobaux.teignes||{}).moyen },
    Blattes: { vigilance: (seuilsGlobaux.blattes||{}).leger, critique: (seuilsGlobaux.blattes||{}).moyen },
    IPS:     { vigilance: (seuilsGlobaux.ips||{}).leger,     critique: (seuilsGlobaux.ips||{}).moyen },
    "Insectes volants": { vigilance: ((seuilsGlobaux.iv||{}).Moucherons||{}).leger||350, critique: ((seuilsGlobaux.iv||{}).Moucherons||{}).moyen||500 },
  };

  // Lignes du tableau des seuils d infestation - sert aussi aux exports
  const sRg  = seuilsGlobaux.rongeurs || {};
  const sExt = seuilsGlobaux.rongeursExt || {};
  const sInt = seuilsGlobaux.rongeursInt || {};
  const seuilsInfestRows = [
    ["Rongeurs exterieurs (captures)", "< " + sExt.leger, sExt.leger + " - " + sExt.moyen, "> " + sExt.moyen],
    ["Rongeurs interieurs (captures)", "< " + sInt.leger, sInt.leger + " - " + sInt.moyen, "> " + sInt.moyen],
    ["Rongeurs - taux activite (%)", "< " + sRg.taux_vigilance, sRg.taux_vigilance + " - " + sRg.taux_critique, "> " + sRg.taux_critique],
    ["Rongeurs - consommation appats", "Aucune", sRg.conso_orange, sRg.conso_rouge],
    ["IPS (total captures)", "< " + seuilsDyn.IPS.vigilance, seuilsDyn.IPS.vigilance + " - " + seuilsDyn.IPS.critique, "> " + seuilsDyn.IPS.critique],
    ["Teignes", "< " + seuilsDyn.Teignes.vigilance, seuilsDyn.Teignes.vigilance + " - " + seuilsDyn.Teignes.critique, "> " + seuilsDyn.Teignes.critique],
    ["Blattes", "< " + seuilsDyn.Blattes.vigilance, seuilsDyn.Blattes.vigilance + " - " + seuilsDyn.Blattes.critique, "> " + seuilsDyn.Blattes.critique],
  ].concat(IV_CATS.map(cat => {
    const v = (seuilsGlobaux.iv || {})[cat] || {};
    const l = v.leger ?? 0;
    const m = v.moyen ?? 0;
    return ["Insectes volants - " + cat, "< " + l, l + " - " + m, "> " + m];
  }));

  const filtered = postesAvecPassages.filter(p => {
    const nuisible = p.nuisible || "Rongeurs";
    if (subtab === "rongeurs" && !RONGEURS_TYPES.includes(nuisible)) return false;
    if (subtab === "insectes" && !INSECTES_TYPES.includes(nuisible)) return false;
    if (subtab === "insectes" && filterInsecte !== "Tous" && nuisible !== filterInsecte) return false;
    if (filterMacro !== "Toutes" && p.macro !== filterMacro) return false;
    if (search) {
      const s = search.toLowerCase();
      return p.id.toLowerCase().includes(s) || p.zone.toLowerCase().includes(s);
    }
    return true;
  });

  const displaySel = filtered.length === 1 && search.trim() ? filtered[0] : sel;

  function startEditConso(p) {
    setConsoEdit({ ...p.passages });
    setEditingConso(true);
  }

  function saveConso(posteId) {
    setPostes(prev => prev.map(p => p.id === posteId ? { ...p, passages: consoEdit } : p));
    if (sel && sel.id === posteId) setSel(prev => ({ ...prev, passages: consoEdit }));
    setEditingConso(false);
  }

  // Couleur unique pour ecran ET exports : evite que les deux divergent
  function couleurSeuil(p, d) {
    const nuisible = p.nuisible || "Rongeurs";
    const v = p.passages[d];
    if (INSECTES_TYPES.includes(nuisible)) {
      if (!v) return "#22c55e";
      const num = parseFloat(v) || 0;
      const s = seuilsDyn[nuisible];
      return s ? (num >= s.critique ? "#ef4444" : num >= s.vigilance ? "#f59e0b" : "#22c55e") : "#22c55e";
    }
    if (estConsoTotale(v)) return "#ef4444";
    if (v === "CONSOMMATION PARTIELLE") return "#f59e0b";
    if (v === "75%" || v === "50%" || v === "25%") return "#f59e0b";
    if (v && !isNaN(parseFloat(v)) && parseFloat(v) > 0) return "#f59e0b";
    return "#22c55e";
  }

  function getTendance(poste) {
    const nuisible = poste.nuisible || "Rongeurs";
    if (nuisible === "Rongeurs") {
      const actifs = DATES.map(d => poste.passages[d] ? 1 : 0);
      const first = actifs[0]; const last = actifs[actifs.length - 1];
      return last < first ? "Baisse" : last > first ? "Hausse" : "Stable";
    } else {
      const vals = DATES.map(d => parseFloat(poste.passages[d]) || 0);
      const first = vals[0]; const last = vals[vals.length - 1];
      return last < first ? "Baisse" : last > first ? "Hausse" : "Stable";
    }
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 2 }}>Postes et Zones</div>
          <div style={{ fontSize: 13, color: "#7a90aa" }}>{postesAvecPassages.length} postes</div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={() => {
            const rows = filtered.map((p,i) => {
              const nuisible = p.nuisible||"Rongeurs";
              const tendance = getTendance(p);
              const tcol = tendance==="Baisse"?"green":tendance==="Hausse"?"red":"gray";
              const dateCols = DATES.map(d => {
                const col = couleurSeuil(p, d);
                const label = valeurExport(p, d);
                return "<td style='font-weight:700;color:"+col+"'>"+label+"</td>";
              }).join("");
              return "<tr><td style='font-family:monospace;font-weight:700'>"+p.id+"</td><td>"+(p.zone||"")+"</td><td>"+nuisible+"</td>"+dateCols+"<td style='color:"+tcol+";font-weight:700'>"+tendance+"</td></tr>";
            }).join("");
            exportHTML("Postes et Zones - "+CLIENT_CONFIG.nom+" - "+anneeLabel,
              "<h1>Postes et Zones - "+CLIENT_CONFIG.nom+" - "+anneeLabel+"</h1>" +
              "<p style='color:#7a90aa;margin-bottom:16px'>" + DATES.length + " passage(s) - Edite le " + new Date().toLocaleDateString("fr-FR") + "</p>" +
              "<table><thead><tr><th>N°</th><th>Zone</th><th>Nuisible</th>"+DATES.map(d=>"<th>"+d.slice(0,5)+"</th>").join("")+"<th>Tendance</th></tr></thead><tbody>"+rows+"</tbody></table>"
            );
          }}
            style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:9, padding:"9px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Export PDF
          </button>
          <button onClick={() => {
            const headers = ["N°","Zone","Nuisible","Tendance",...DATES];
            const rows = filtered.map(p => {
              const dateVals = DATES.map(d => valeurExport(p, d));
              return [p.id, p.zone||"", p.nuisible||"Rongeurs", getTendance(p), ...dateVals];
            });
            exportCSV("postes_zones_"+CLIENT_CONFIG.nom.replace(/\s+/g,"_")+"_"+anneeLabel.replace(/\s+/g,"_"), headers, rows);
          }}
            style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:9, padding:"9px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Export Excel
          </button>
          <div style={{ display: "flex", gap: 4, background: "#1a2540", borderRadius: 10, padding: 3 }}>
            {[["rongeurs", "Rongeurs", "#3b82f6"], ["insectes", "Insectes", "#f59e0b"]].map(t => (
              <button key={t[0]} onClick={() => { setSubtab(t[0]); setSel(null); setSearch(""); setFilterInsecte("Tous"); }}
                style={{ background: subtab === t[0] ? t[2] : "transparent", color: subtab === t[0] ? "#fff" : "#7a90aa", border: "none", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {t[1]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {subtab === "insectes" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {["Tous", "Blattes", "Insectes volants", "Teignes", "IPS"].map(type => {
            const col = NUISIBLE_COLORS[type] || "#7a90aa";
            const active = filterInsecte === type;
            const count = postesAvecPassages.filter(p => (p.nuisible || "Rongeurs") === type).length;
            return (
              <button key={type} onClick={() => setFilterInsecte(type)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: active ? col + "33" : "#243352", color: active ? col : "#7a90aa", border: "2px solid " + (active ? col : col + "33"), borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {type !== "Tous" && <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? col : col + "66", display: "inline-block" }} />}
                {type} ({type === "Tous" ? postesAvecPassages.filter(p => INSECTES_TYPES.includes(p.nuisible)).length : count})
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher N° ou zone..."
          style={{ background: "#243352", border: "1px solid #3d5270", borderRadius: 8, padding: "8px 14px", color: "#f1f5f9", fontSize: 13, fontFamily: "inherit", width: 220 }} />
        <select value={filterMacro} onChange={e => setFilterMacro(e.target.value)}
          style={{ background: "#243352", border: "1px solid #3d5270", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 12, fontFamily: "inherit" }}>
          {macros.map(m => <option key={m}>{m}</option>)}
        </select>
        {anneesDispo.length > 0 && (
          <select value={filterAnnee || "Toutes"} onChange={e => setFilterAnnee(e.target.value)}
            style={{ background: "#243352", border: "1px solid #3d5270", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 12, fontFamily: "inherit" }}>
            <option value="Toutes">Toutes les annees</option>
            {anneesDispo.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <span style={{ fontSize: 12, color: "#5a7090" }}>{filtered.length} poste(s) — {DATES.length} passage(s)</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: displaySel ? "1fr 1fr" : "1fr", gap: 14, alignItems: "start" }}>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ background: "#1a2540", padding: "10px 16px", display: "grid", gridTemplateColumns: "80px 1fr " + DATES.map(()=>"70px").join(" ") + " 90px 70px", gap: 8, fontSize: 10, fontWeight: 700, color: "#7a90aa", letterSpacing: 1, textTransform: "uppercase" }}>
            <div>N° Poste</div>
            <div>Zone</div>
            {DATES.map(d => <div key={d}>{d.slice(0,5)}</div>)}
            <div>Type</div>
            <div>Tendance</div>
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {filtered.map((p, i) => {
              const nuisible = p.nuisible || "Rongeurs";
              const isInsecte = INSECTES_TYPES.includes(nuisible);
              const isD = displaySel && displaySel.id === p.id;
              const tendance = getTendance(p);
              const tCol = tendance === "Baisse" ? "#22c55e" : tendance === "Hausse" ? "#ef4444" : "#7a90aa";

              function eLabel(d) {
                const v = p.passages[d];
                const c = couleurSeuil(p, d);
                if (isInsecte) {
                  if (!v) return { l: <span style={{ color: c }}>—</span>, c };
                  return { l: <span style={{ color: c, fontWeight: 700 }}>{v}</span>, c };
                }
                if (estConsoTotale(v)) return { l: <span style={{ color: c, fontWeight: 700 }}>TOT</span>, c };
                if (v === "CONSOMMATION PARTIELLE") return { l: <span style={{ color: c, fontWeight: 700 }}>PAR</span>, c };
                if (v === "75%" || v === "50%" || v === "25%") return { l: <span style={{ color: c, fontWeight: 700 }}>{v}</span>, c };
                if (v && !isNaN(parseFloat(v)) && parseFloat(v) > 0) return { l: <span style={{ color: c, fontWeight: 700 }}>{v}</span>, c };
                return { l: <span style={{ color: c }}>—</span>, c };
              }
              return (
                <div key={p.id} onClick={() => setSel(isD ? null : p)}
                  style={{ padding: "8px 16px", display: "grid", gridTemplateColumns: "80px 1fr " + DATES.map(()=>"70px").join(" ") + " 90px 70px", gap: 8, alignItems: "center", borderTop: "1px solid #243352", background: isD ? "#2d4a7a" : i % 2 === 0 ? "transparent" : "#ffffff04", cursor: "pointer" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", fontFamily: "monospace" }}>{p.id}</div>
                  <div style={{ fontSize: 11, color: "#cbd5e1" }}>{(p.zone||"").length > 28 ? (p.zone||"").slice(0, 28) + "..." : (p.zone||"")}</div>
                  {DATES.map(d => <div key={d}>{eLabel(d).l}</div>)}
                  <div style={{ fontSize: 10, color: "#7a90aa" }}>{p.type}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: tCol }}>{tendance}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {displaySel && (
          <Card selected={true}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", fontFamily: "monospace" }}>Poste {displaySel.id}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {!editingConso
                  ? <button onClick={e => { e.stopPropagation(); startEditConso(displaySel); }}
                      style={{ background: "#1d4ed822", color: "#3b82f6", border: "1px solid #3b82f644", borderRadius: 7, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Saisir</button>
                  : <><button className="aads-action-btn" onClick={e => { e.stopPropagation(); saveConso(displaySel.id); }}
                        style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Enregistrer</button>
                    <button onClick={() => setEditingConso(false)}
                        style={{ background: "transparent", color: "#7a90aa", border: "1px solid #3d5270", borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button></>
                }
                <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: "#7a90aa", cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[["Zone", displaySel.zone], ["Macro-zone", displaySel.macro], ["Type", displaySel.type], ["Produit", displaySel.produit], ["Nuisible", displaySel.nuisible || "Rongeurs"]].map(item => (
                <div key={item[0]} style={{ background: "#1a2540", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 9, color: "#7a90aa", textTransform: "uppercase", marginBottom: 2 }}>{item[0]}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}>{item[1] || "—"}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#7a90aa", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Historique</div>
            {Object.entries(displaySel.passages).sort((a,b)=>{
              const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0);};
              return pd(b[0])-pd(a[0]);
            }).map(([d, etat]) => {
              const val = editingConso ? consoEdit[d] : etat;
              const isInsecte = INSECTES_TYPES.includes(displaySel.nuisible || "");
              const appat = (displaySel.appat || "").toLowerCase();
              const nuisible = (displaySel.nuisible || "Rongeurs");
              const isPlaceboToxique = appat === "placebo" || appat === "toxique";
              const isGlueRongeur = (appat === "glue") && nuisible === "Rongeurs";
              const c = estConsoTotale(val) ? "#ef4444" : estConsoPartielle(val) ? "#f59e0b" : "#22c55e";
              return (
                <div key={d} style={{ background: "#1a2540", borderRadius: 8, padding: "8px 12px", borderLeft: "3px solid " + c, marginBottom: 6 }} onClick={e => e.stopPropagation()}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "#7a90aa" }}>{d}</span>
                    {(()=>{
                      const pa = passagesSaisies.find(p=>p.date===d);
                      if (!pa) return null;
                      const saisiesP = typeof pa.saisies==="string"?JSON.parse(pa.saisies||"{}"):pa.saisies||{};
                      const mol = saisiesP[displaySel.id]?.molecule;
                      if (!mol) return null;
                      const molColor = mol==="Placebo"?"#3b82f6":"#8b5cf6";
                      return <span style={{background:molColor+"22",color:molColor,border:"1px solid "+molColor+"44",borderRadius:4,padding:"1px 7px",fontSize:9,fontWeight:700}}>{mol}</span>;
                    })()}
                  </div>
                  {editingConso ? (
                    isInsecte ? (
                      <input type="number" min="0" placeholder="captures" value={val || ""}
                        onChange={e => setConsoEdit(prev => ({ ...prev, [d]: e.target.value }))}
                        style={{ background: "#243352", border: "1px solid #3b82f6", borderRadius: 6, padding: "4px 8px", color: "#f1f5f9", fontSize: 13, fontFamily: "inherit", width: 80 }} />
                    ) : isPlaceboToxique ? (
                      /* Placebo/Toxique : RAS, 25%, 50%, 75%, 100% */
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {[["RAS", "#22c55e"], ["25%", "#f59e0b"], ["50%", "#f59e0b"], ["75%", "#ef4444"], ["100%", "#ef4444"]].map(([opt, co]) => (
                          <button key={opt} onClick={() => {
                            const mapped = opt === "RAS" ? "" : opt === "100%" ? "CONSOMMATION TOTALE" : "CONSOMMATION PARTIELLE";
                            setConsoEdit(prev => ({ ...prev, [d]: mapped || opt }));
                          }}
                            style={{ background: (consoEdit[d] === opt || (opt === "RAS" && !consoEdit[d]) || (opt === "100%" && consoEdit[d] === "CONSOMMATION TOTALE") || (opt !== "RAS" && opt !== "100%" && consoEdit[d] === "CONSOMMATION PARTIELLE" && consoEdit[d+"_pct"] === opt)) ? co + "33" : "#243352",
                              color: co, border: "1px solid " + co + "55", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : isGlueRongeur ? (
                      /* Glue + Rongeurs : captures par type */
                      <div>
                        {[["souris", "Souris"], ["ratBrun", "Rat brun"], ["ratNoir", "Rat noir"]].map(([key, label]) => {
                          const capKey = d + "_cap_" + key;
                          return (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: "#7a90aa", minWidth: 60 }}>{label}</span>
                              <input type="number" min="0" value={consoEdit[capKey] || ""}
                                onChange={e => setConsoEdit(prev => {
                                  const next = { ...prev, [capKey]: e.target.value };
                                  const total = (parseInt(next[d+"_cap_souris"]||0)) + (parseInt(next[d+"_cap_ratBrun"]||0)) + (parseInt(next[d+"_cap_ratNoir"]||0));
                                  next[d] = total > 0 ? String(total) : "";
                                  return next;
                                })}
                                style={{ background: "#243352", border: "1px solid #3d5270", borderRadius: 6, padding: "3px 8px", color: "#f1f5f9", fontSize: 12, fontFamily: "inherit", width: 60 }} />
                            </div>
                          );
                        })}
                        <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginTop: 4 }}>
                          Total : {(parseInt(consoEdit[d+"_cap_souris"]||0) + parseInt(consoEdit[d+"_cap_ratBrun"]||0) + parseInt(consoEdit[d+"_cap_ratNoir"]||0))} capture(s)
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["", "CONSOMMATION PARTIELLE", "CONSOMMATION TOTALE"].map(opt => {
                          const lbl = opt === "" ? "Aucune" : opt === "CONSOMMATION PARTIELLE" ? "Partielle" : "Totale";
                          const co = opt === "" ? "#7a90aa" : opt === "CONSOMMATION PARTIELLE" ? "#f59e0b" : "#ef4444";
                          return (
                            <button key={opt} onClick={() => setConsoEdit(prev => ({ ...prev, [d]: opt }))}
                              style={{ background: consoEdit[d] === opt ? co + "33" : "#243352", color: consoEdit[d] === opt ? co : "#7a90aa", border: "1px solid " + (consoEdit[d] === opt ? co : "#3d5270"), borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                              {lbl}
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 700, color: c }}>{val || <span style={{ color: "#22c55e" }}>—</span>}</div>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </div>

      {/* Tableau des seuils d infestation */}
      {(
        <Card style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Seuils d'infestation</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => {
                const rows = seuilsInfestRows.map(r =>
                  "<tr><td style='font-weight:600'>" + r[0] + "</td><td style='text-align:center;color:green;font-weight:700'>" + r[1] + "</td><td style='text-align:center;color:#d97706;font-weight:700'>" + r[2] + "</td><td style='text-align:center;color:red;font-weight:700'>" + r[3] + "</td></tr>"
                ).join("");
                exportHTML("Seuils d infestation - " + CLIENT_CONFIG.nom,
                  "<h1>Seuils d infestation - " + CLIENT_CONFIG.nom + "</h1>" +
                  "<p style='color:#7a90aa;margin-bottom:16px'>Edite le " + new Date().toLocaleDateString("fr-FR") + "</p>" +
                  "<table><thead><tr><th>Nuisible</th><th>Leger</th><th>Moyen</th><th>Eleve</th></tr></thead><tbody>" + rows + "</tbody></table>"
                );
              }}
                style={{ background: "#1d4ed822", color: "#3b82f6", border: "1px solid #3b82f644", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Export PDF
              </button>
              <button onClick={() => {
                exportCSV("seuils_infestation_" + CLIENT_CONFIG.nom.replace(/\s+/g, "_"), ["Nuisible", "Leger", "Moyen", "Eleve"], seuilsInfestRows);
              }}
                style={{ background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Export Excel
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#1a2540" }}>
                  <th style={{ padding: "7px 10px", textAlign: "left", color: "#7a90aa", fontWeight: 600 }}>Nuisible</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", color: "#22c55e", fontWeight: 700 }}>Léger</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", color: "#f59e0b", fontWeight: 700 }}>Moyen</th>
                  <th style={{ padding: "7px 10px", textAlign: "center", color: "#ef4444", fontWeight: 700 }}>Élevé</th>
                </tr>
              </thead>
              <tbody>
                {seuilsInfestRows.map((row, i) => (
                  <tr key={row[0]} style={{ borderTop: "1px solid #243352", background: i % 2 === 0 ? "transparent" : "#ffffff04" }}>
                    <td style={{ padding: "7px 10px", color: "#e2e8f0", fontWeight: 600 }}>{row[0]}</td>
                    <td style={{ padding: "7px 10px", textAlign: "center", color: "#22c55e" }}>{row[1]}</td>
                    <td style={{ padding: "7px 10px", textAlign: "center", color: "#f59e0b" }}>{row[2]}</td>
                    <td style={{ padding: "7px 10px", textAlign: "center", color: "#ef4444" }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// MAINTENANCE DEIV
// ============================================================
function MaintenanceDEIV() {
  const [typesAppareil, setTypesAppareil] = useState(["Fly-killer colle", "Fly-killer UV", "Panneau lumineux", "Lampe autonome", "Mixte UV+Colle", "Autre"]);
  const [typesTubes, setTypesTubes] = useState(["Actinique", "UV-A", "LED", "Germicide", "Autre"]);
  const [typesMaint, setTypesMaint] = useState(["Nettoyage lampes", "Remplacement colle", "Remplacement tube UV", "Verification fixation", "Controle electrique", "Autre"]);
  const [newTypeAppareil, setNewTypeAppareil] = useState("");
  const [newTypeTubes, setNewTypeTubes] = useState("");
  const [newTypeMaint, setNewTypeMaint] = useState("");
  const TECHNICIENS = useTechniciens();

  const [postes, setPostes] = useState(POSTES_INIT.filter(p => p.type === "DEIV"));
  const [search, setSearch] = useState("");
  const [filterMacro, setFilterMacro] = useState("Toutes");
  const [filterZone, setFilterZone] = useState("Toutes");
  const [sel, setSel] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showGestion, setShowGestion] = useState(false);
  const [form, setForm] = useState({ poste:"", date:"", technicien:"", type:"Nettoyage lampes", notes:"" });

  // Etat appareils enrichis (type DEIV, puissance, nb tubes)
  const [appareils, setAppareils] = useState({});
  const [editApp, setEditApp] = useState(null);
  const [draftApp, setDraftApp] = useState({});


  function sortDeiv(list) {
    return list.slice().sort((a,b)=>{
      const parse = id => { const m=id.match(/^([A-Za-z]+)[.\-]?(\d+)([A-Za-z]*)$/); return m?[m[1].toUpperCase(),parseInt(m[2]),m[3].toUpperCase()]:[id.toUpperCase(),0,""]; };
      const [ap,an,as_]=parse(a.id); const [bp,bn,bs]=parse(b.id);
      if(ap!==bp)return ap.localeCompare(bp);
      if(an!==bn)return an-bn;
      return as_.localeCompare(bs);
    });
  }
  useEffect(() => {
    sbGet("postes").then(data => {
      if (data && data.length > 0) setPostes(sortDeiv(data.filter(p => p.type === "DEIV")));
    }).catch(()=>{});
    sbGet("maintenance_deiv_interventions").then(data => {
      if (data && data.length > 0) {
        setInterventions(data.map(i => ({
          ...i,
          postes: i.postes_json
            ? (typeof i.postes_json === "string" ? JSON.parse(i.postes_json) : i.postes_json)
            : (i.poste ? i.poste.split(",").map(x=>x.trim()).filter(Boolean) : []),
          nb_appareils: i.nb_appareils || 1
        })));
      }
    }).catch(()=>{});
    sbGet("maintenance_deiv_appareils").then(data => {
      if (data && data.length > 0) {
        const byId = {};
        data.forEach(d => { byId[d.id] = { marque:d.marque||"", typeAppareil:d.type_appareil, typeTubes:d.type_tubes, puissance:d.puissance, nbTubes:d.nb_tubes, statutFonctionnel:d.statut_fonctionnel||"" }; });
        setAppareils(byId);
      }
    }).catch(()=>{});
  }, []);

  function reloadPostes() {
    sbGet("postes").then(data => {
      if (data && data.length > 0) setPostes(sortDeiv(data.filter(p => p.type === "DEIV")));
    }).catch(()=>{});
  }

  function saveApp(id) {
    const prevStatut = (appareils[id]||{}).statutFonctionnel || "";
    const newApp = { ...draftApp };
    setAppareils(prev => ({ ...prev, [id]: newApp }));
    // Mettre à jour appat dans la table postes
    if (draftApp.appat !== undefined) {
      setPostes(prev => prev.map(p => p.id === id ? { ...p, appat: draftApp.appat } : p));
      sbUpdate("postes", id, { appat: draftApp.appat||"" }).catch(e=>console.error("saveApp postes error:", e));
    }
    sbUpsert("maintenance_deiv_appareils", {
      id,
      contrat: CLIENT_CONFIG.contrat,
      marque: draftApp.marque||"",
      type_appareil: draftApp.typeAppareil||"",
      type_tubes: draftApp.typeTubes||"",
      puissance: draftApp.puissance||"",
      nb_tubes: draftApp.nbTubes||"",
      statut_fonctionnel: draftApp.statutFonctionnel||null
    }).then(res => {
      if (!res) {
        alert("Erreur : la sauvegarde a echoue (voir console F12).");
      }
    }).catch(err => {
      console.error("saveApp error:", err);
      alert("Erreur Supabase : " + (err.message||err));
    });
    setEditApp(null);
    // Alerte mail si le statut vient de passer en panne
    if (draftApp.statutFonctionnel === "panne" && prevStatut !== "panne") {
      const poste = postes.find(p => p.id === id) || {};
      const sujet = encodeURIComponent("ALERTE - DEIV " + id + " en panne - " + (CLIENT_CONFIG.nom||""));
      const corps = encodeURIComponent(
        "Bonjour,\n\n" +
        "Le destructeur d'insectes volants (DEIV) suivant vient d'etre signale EN PANNE :\n\n" +
        "  - N DEIV : " + id + "\n" +
        "  - Zone : " + (poste.zone||"Non renseignee") + "\n" +
        "  - Macro-zone : " + (poste.macro||"Non renseignee") + "\n" +
        "  - Marque : " + (draftApp.marque||"Non renseignee") + "\n" +
        "  - Type : " + (draftApp.typeAppareil||"Non renseigne") + "\n" +
        "  - Date : " + new Date().toLocaleDateString("fr-FR") + "\n\n" +
        "Merci de prendre les mesures necessaires.\n\n" +
        "AADS - Portail 3D\n" + (CLIENT_CONFIG.nom||"")
      );
      const contact1 = CLIENT_CONFIG.contact1_mail || "";
      const contact2 = CLIENT_CONFIG.contact2_mail || "";
      const destinataires = [contact1, contact2].filter(Boolean).join(",");
      if (destinataires) {
        window.open("mailto:" + destinataires + "?subject=" + sujet + "&body=" + corps);
      }
    }
  }

  const macros = ["Toutes", ...new Set(postes.map(p => p.macro).filter(Boolean))];
  const zonesDispos = ["Toutes", ...new Set(
    postes
      .filter(p => filterMacro === "Toutes" || p.macro === filterMacro)
      .map(p => p.zone)
      .filter(Boolean)
  ).values()].sort((a,b) => a === "Toutes" ? -1 : a.localeCompare(b));

  const filtered = postes.filter(p => {
    if (filterMacro !== "Toutes" && p.macro !== filterMacro) return false;
    if (filterZone !== "Toutes" && p.zone !== filterZone) return false;
    if (search) return p.id.toLowerCase().includes(search.toLowerCase()) || (p.zone||"").toLowerCase().includes(search.toLowerCase());
    return true;
  });

  function addIntervention() {
    if (!form.date) return;
    const dateFmt = form.date.includes("-") ? form.date.split("-").reverse().join("/") : form.date;
    const postes_selectionnes = (form.poste||"").split(",").map(x=>x.trim()).filter(Boolean);
    if (postes_selectionnes.length === 0) return;
    const id = String(Date.now()) + "_session";
    const item = { id, postes: postes_selectionnes, date: dateFmt, technicien: form.technicien||"", type: form.type, notes: form.notes||"", nb_appareils: postes_selectionnes.length };
    sbUpsert("maintenance_deiv_interventions", {
      id, contrat: CLIENT_CONFIG.contrat,
      poste: postes_selectionnes.join(","), // compatibilite colonne existante
      postes_json: JSON.stringify(postes_selectionnes),
      date: dateFmt,
      technicien: form.technicien||"",
      type: form.type,
      notes: form.notes||"",
      nb_appareils: postes_selectionnes.length
    }).catch(e=>console.error("DEIV save error:", e));
    setInterventions(prev => [item, ...prev]);
    setForm({ poste:"", date:"", technicien:"", type:typesMaint[0]||"Nettoyage lampes", notes:"" });
    setShowForm(false);
    setShowGestion(false);
  }

  function startEditApp(p) {
    setEditApp(p.id);
    setDraftApp({ ...(appareils[p.id] || { marque:"", typeAppareil:"Fly-killer colle", typeTubes:"Actinique", puissance:"", nbTubes:"", statutFonctionnel:"" }), appat: p.appat||"" });
  }

  // Retourne les sessions de maintenance qui incluent ce poste
  const postesInterventions = posteId => {
    const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
    return interventions
      .filter(i => {
        const list = i.postes || (i.poste ? i.poste.split(",").map(x=>x.trim()) : []);
        return list.includes(posteId);
      })
      .sort((a,b) => pd(b.date) - pd(a.date));
  };

  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9", marginBottom:2 }}>Maintenance DEIV</div>
          <div style={{ fontSize:13, color:"#7a90aa" }}>{postes.length} destructeurs electriques d'insectes volants
            <button onClick={reloadPostes} title="Recharger les postes"
              style={{background:"transparent",border:"1px solid #3d5270",borderRadius:5,color:"#7a90aa",fontSize:11,cursor:"pointer",padding:"1px 6px",marginLeft:8}}>↻</button>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowGestion("liste")}
            style={{ background:showGestion==="liste"?"#243352":"transparent", color:showGestion==="liste"?"#22c55e":"#7a90aa", border:"1px solid "+(showGestion==="liste"?"#22c55e":"#3d5270"), borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Liste
          </button>
          <button onClick={()=>setShowGestion(showGestion==="appareils"?false:"appareils")}
            style={{ background:showGestion==="appareils"?"#5a7090":"transparent", color:showGestion==="appareils"?"#fff":"#7a90aa", border:"1px solid "+(showGestion==="appareils"?"#5a7090":"#3d5270"), borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Gestion des appareils
          </button>
          <button onClick={() => {
            const rows = filtered.map(p => {
              const app = appareils[p.id]||{};
              const hist = postesInterventions(p.id);
              const last = hist[0];
              const statutHtml = app.statutFonctionnel==="ok"
                ? "<span style='color:#16a34a;font-weight:700'>OK</span>"
                : app.statutFonctionnel==="panne"
                ? "<span style='color:#dc2626;font-weight:700'>Panne</span>"
                : "—";
              return "<tr><td style='font-family:monospace;font-weight:700'>" + p.id + "</td><td>" + (p.zone||"") + "</td><td>" + (app.typeAppareil||"—") + "</td><td>" + (app.typeTubes||"—") + "</td><td>" + (app.puissance?app.puissance+" W":"—") + "</td><td>" + (p.appat||"—") + "</td><td>" + (app.nbTubes||"—") + "</td><td>" + statutHtml + "</td><td>" + (last?last.date:"—") + "</td><td>" + hist.length + "</td></tr>";
            }).join("");
            const total = postes.length;
            const maintenus = postes.filter(p => postesInterventions(p.id).length > 0).length;
            const pctMaint = Math.round(maintenus/total*100);
            const captureCounts = {};
            postes.forEach(p => { const k = p.appat||"Non renseigne"; captureCounts[k]=(captureCounts[k]||0)+1; });
            const captureColors = { "Glue":"#d97706","Grille":"#2563eb","Toxique":"#dc2626","Lumiere":"#7c3aed","Autre":"#64748b","Non renseigne":"#94a3b8" };
            const typeCounts = {};
            postes.forEach(p => { const app=appareils[p.id]||{}; const k=app.typeAppareil||"Non renseigne"; typeCounts[k]=(typeCounts[k]||0)+1; });
            const typeColorList = ["#2563eb","#16a34a","#d97706","#dc2626","#7c3aed","#0891b2","#ea580c","#64748b"];
            const captureHtml = Object.entries(captureCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
              const pct=Math.round(v/total*100); const col=captureColors[k]||"#64748b";
              return "<div style='display:inline-block;text-align:center;margin:0 6px;width:60px'><div style='font-size:11px;font-weight:700;color:"+col+"'>"+pct+"%</div><div style='width:100%;height:"+(Math.max(4,pct*0.8))+"px;background:"+col+";border-radius:3px 3px 0 0;margin-bottom:4px'></div><div style='font-size:9px;color:#6b7280'>"+k+"<br/>("+v+")</div></div>";
            }).join("");
            const typeHtml = Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).map(([k,v],idx)=>{
              const pct=Math.round(v/total*100); const col=typeColorList[idx%typeColorList.length];
              return "<div style='margin-bottom:8px'><div style='display:flex;justify-content:space-between;margin-bottom:3px'><span style='font-size:11px;color:#374151'>"+k+"</span><span style='font-size:11px;font-weight:700;color:"+col+"'>"+v+" ("+pct+"%)</span></div><div style='height:8px;background:#e5e7eb;border-radius:4px'><div style='height:100%;width:"+pct+"%;background:"+col+";border-radius:4px'></div></div></div>";
            }).join("");
            const kpiHtml = "<div style='margin-top:28px'><h2 style='color:#0f2864;border-bottom:2px solid #0f2864;padding-bottom:6px'>Indicateurs</h2>" +
              "<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:16px'>" +
              "<div style='border:1px solid #e5e7eb;border-radius:8px;padding:16px'><div style='font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:8px'>Couverture maintenance</div><div style='font-size:24px;font-weight:800;color:#2563eb;margin-bottom:6px'>"+maintenus+" <span style='font-size:14px;color:#9ca3af'>/ "+total+" DEIV</span></div><div style='height:10px;background:#e5e7eb;border-radius:6px;margin-bottom:6px'><div style='height:100%;width:"+pctMaint+"%;background:"+(pctMaint===100?"#16a34a":pctMaint>50?"#2563eb":"#d97706")+";border-radius:6px'></div></div><div style='font-size:11px;font-weight:700;color:"+(pctMaint===100?"#16a34a":pctMaint>50?"#2563eb":"#d97706")+"'>"+pctMaint+"% du parc maintenu</div></div>" +
              "<div style='border:1px solid #e5e7eb;border-radius:8px;padding:16px'><div style='font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:12px'>Type de capture</div><div style='display:flex;align-items:flex-end;height:80px;margin-bottom:8px'>"+captureHtml+"</div></div>" +
              "<div style='border:1px solid #e5e7eb;border-radius:8px;padding:16px'><div style='font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:12px'>Type d'appareil</div>"+typeHtml+"</div>" +
              "</div></div>";
            exportHTML("Tableau DEIV - " + CLIENT_CONFIG.nom,
              "<h1>Tableau des appareils DEIV - " + CLIENT_CONFIG.nom + "</h1>" +
              "<p style='color:#6b7280;margin-bottom:16px'>" + new Date().toLocaleDateString("fr-FR") + "</p>" +
              "<table><thead><tr><th>N°</th><th>Zone</th><th>Type appareil</th><th>Type tubes</th><th>Puissance</th><th>Capture</th><th>Nb tubes</th><th>Statut</th><th>Dern. maint.</th><th>Nb maint.</th></tr></thead><tbody>" + rows + "</tbody></table>" +
              kpiHtml
            );
          }}
            style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            PDF Tableau
          </button>
          <button onClick={() => {
            const headers = ["N°","Zone","Macro-zone","Type appareil","Type tubes","Puissance","Capture","Nb tubes","Statut","Dern. maintenance","Nb maintenances"];
            const rows = filtered.map(p => {
              const app = appareils[p.id]||{};
              const hist = postesInterventions(p.id);
              const last = hist[0];
              return [p.id, p.zone||"", p.macro||"", app.typeAppareil||"", app.typeTubes||"", app.puissance?app.puissance+" W":"", p.appat||"", app.nbTubes||"", app.statutFonctionnel==="ok"?"OK":app.statutFonctionnel==="panne"?"Panne":"", last?last.date:"", hist.length];
            });
            exportCSV("tableau_deiv_"+CLIENT_CONFIG.nom.replace(/\s+/g,"_"), headers, rows);
          }}
            style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Excel Tableau
          </button>
          <button onClick={() => {
            if (interventions.length === 0) { alert("Aucune maintenance enregistree."); return; }
            const maintRows = interventions.slice().sort((a,b)=>{
              const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0);};
              return pd(b.date)-pd(a.date);
            }).map(h => {
              const list = h.postes || (h.poste ? h.poste.split(",").map(x=>x.trim()).filter(Boolean) : []);
              return "<tr><td>" + h.date + "</td><td>" + (h.technicien||"") + "</td><td>" + h.type + "</td><td>" + list.length + " appareils</td><td>" + list.join(", ") + "</td><td>" + (h.notes||"") + "</td></tr>";
            }).join("");
            exportHTML("Historique maintenances DEIV - " + CLIENT_CONFIG.nom,
              "<h1>Historique des maintenances DEIV - " + CLIENT_CONFIG.nom + "</h1>" +
              "<p style='color:#6b7280;margin-bottom:16px'>" + new Date().toLocaleDateString("fr-FR") + " — " + interventions.length + " session(s)</p>" +
              "<table><thead><tr><th>Date</th><th>Technicien(s)</th><th>Type</th><th>Nb appareils</th><th>DEIV verifies</th><th>Notes</th></tr></thead><tbody>" + maintRows + "</tbody></table>"
            );
          }}
            style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            PDF Maintenances
          </button>
          <button onClick={() => {
            if (interventions.length === 0) { alert("Aucune maintenance enregistree."); return; }
            const sorted = interventions.slice().sort((a,b)=>{
              const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0);};
              return pd(b.date)-pd(a.date);
            });
            const headers = ["Date","Technicien(s)","Type","Nb appareils","DEIV verifies","Notes"];
            const rows = sorted.map(h => {
              const list = h.postes || (h.poste ? h.poste.split(",").map(x=>x.trim()).filter(Boolean) : []);
              return [h.date, h.technicien||"", h.type||"", list.length, list.join(", "), h.notes||""];
            });
            exportCSV("maintenances_deiv_"+CLIENT_CONFIG.nom.replace(/\s+/g,"_"), headers, rows);
          }}
            style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Excel Maintenances
          </button>
          <button onClick={()=>setShowForm(v=>!v)}
            style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + Nouvelle maintenance
          </button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:20 }}>
        <Kpi label="DEIV total" value={postes.length} color="#f59e0b"/>
        <Kpi label="Maintenances" value={interventions.length} color="#3b82f6"/>
        
        <Kpi label="Avec historique" value={new Set(interventions.map(i=>i.poste)).size} color="#a78bfa"/>
      </div>

      {/* Liste des interventions */}
      {showGestion==="liste" && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:12}}>Historique des maintenances ({interventions.length} session{interventions.length>1?"s":""})</div>
          {interventions.length===0 && <div style={{textAlign:"center",color:"#5a7090",padding:20,fontSize:12}}>Aucune maintenance enregistree.</div>}
          {interventions.map(item=>{
            const list = item.postes || (item.poste ? item.poste.split(",").map(x=>x.trim()).filter(Boolean) : []);
            return (
              <div key={item.id} style={{padding:"10px 0",borderBottom:"1px solid #243352"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:6}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9",marginBottom:2}}>{item.date} — {list.length} appareil{list.length>1?"s":""} verifi{list.length>1?"es":"e"}</div>
                    <div style={{fontSize:11,color:"#7a90aa",marginBottom:4}}>{item.technicien} · {item.type}</div>
                    {item.notes&&<div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>{item.notes}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {list.map(p=>(
                        <span key={p} style={{fontSize:9,fontWeight:700,color:"#f59e0b",background:"#f59e0b11",border:"1px solid #f59e0b33",borderRadius:4,padding:"1px 5px",fontFamily:"monospace"}}>{p}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={()=>{setInterventions(prev=>prev.filter(x=>x.id!==item.id));sbDelete("maintenance_deiv_interventions",item.id);}}
                    style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Gestion des appareils */}
      {showGestion==="appareils" && (
        <Card style={{ marginBottom:16, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:"1px solid #3d5270", fontSize:14, fontWeight:700, color:"#f1f5f9" }}>
            Gestion des appareils DEIV
          </div>

          {/* Gestionnaire des listes */}
          <div style={{padding:"10px 16px", borderBottom:"1px solid #3d5270", background:"#152035"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#7a90aa",textTransform:"uppercase",marginBottom:8}}>Gérer les listes déroulantes</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
              {[
                ["Type DEIV", typesAppareil, setTypesAppareil, newTypeAppareil, setNewTypeAppareil],
                ["Type tubes", typesTubes, setTypesTubes, newTypeTubes, setNewTypeTubes],
                ["Type intervention", typesMaint, setTypesMaint, newTypeMaint, setNewTypeMaint],
              ].map(([label, list, setList, newVal, setNewVal]) => (
                <div key={label}>
                  <div style={{fontSize:10,color:"#3b82f6",fontWeight:700,marginBottom:6}}>{label}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {list.map(t=>(
                      <span key={t} style={{display:"flex",alignItems:"center",gap:3,background:"#243352",border:"1px solid #3d5270",borderRadius:5,padding:"2px 6px",fontSize:10,color:"#f1f5f9"}}>
                        {t}
                        <button onClick={()=>setList(prev=>prev.filter(x=>x!==t))}
                          style={{background:"transparent",border:"none",color:"#ef4444",cursor:"pointer",fontSize:9,padding:"0 1px",lineHeight:1}}>✕</button>
                      </span>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <input value={newVal} onChange={e=>setNewVal(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&newVal.trim()){setList(prev=>[...prev,newVal.trim()]);setNewVal("");}}}
                      placeholder="Nouveau..."
                      style={{background:"#1a2540",border:"1px solid #3d5270",borderRadius:5,padding:"3px 7px",color:"#f1f5f9",fontSize:10,fontFamily:"inherit",flex:1}}/>
                    <button onClick={()=>{if(newVal.trim()){setList(prev=>[...prev,newVal.trim()]);setNewVal("");}}}
                      style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:"#1a2540", padding:"10px 16px", display:"grid", gridTemplateColumns:"80px 1fr 110px 130px 120px 90px 70px 80px 70px 80px", gap:8, fontSize:10, fontWeight:700, color:"#7a90aa", textTransform:"uppercase" }}>
            <div>N°</div><div>Zone</div><div>Marque</div><div>Type DEIV</div><div>Type tubes</div><div>Puissance (W)</div><div>Nb tubes</div><div>Capture</div><div>Statut</div><div>Action</div>
          </div>
          <div style={{ maxHeight:350, overflowY:"auto" }}>
            {filtered.map((p,i) => {
              const app = appareils[p.id]||{};
              const isEdit = editApp === p.id;
              return (
                <div key={p.id} style={{ padding:"8px 16px", display:"grid", gridTemplateColumns:"80px 1fr 110px 130px 120px 90px 70px 80px 70px 80px", gap:8, alignItems:"center", borderTop:"1px solid #243352", background:i%2===0?"transparent":"#ffffff04" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b", fontFamily:"monospace" }}>{p.id}</div>
                  <div style={{ fontSize:11, color:"#cbd5e1" }}>{(p.zone||"").slice(0,25)}</div>
                  {isEdit ? (
                    <>
                      <input value={draftApp.marque||""} onChange={e=>setDraftApp(prev=>({...prev,marque:e.target.value}))}
                        placeholder="ex: Insect-O-Cutor"
                        style={{ background:"#243352", border:"1px solid #3b82f6", borderRadius:5, padding:"3px 6px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit", width:"100%" }}/>
                      <div>
                        <select value={draftApp.typeAppareil||"Fly-killer colle"} onChange={e=>setDraftApp(prev=>({...prev,typeAppareil:e.target.value}))}
                          style={{ background:"#243352", border:"1px solid #3b82f6", borderRadius:5, padding:"3px 6px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit", width:"100%", marginBottom:3 }}>
                          {typesAppareil.map(t=><option key={t}>{t}</option>)}
                        </select>
                        <div style={{display:"flex",gap:3,marginBottom:3}}>
                          <input value={newTypeAppareil} onChange={e=>setNewTypeAppareil(e.target.value)} placeholder="+ Nouveau type"
                            style={{ background:"#1a2540", border:"1px solid #3d5270", borderRadius:4, padding:"2px 5px", color:"#f1f5f9", fontSize:9, fontFamily:"inherit", flex:1 }}/>
                          <button onClick={()=>{if(newTypeAppareil.trim()){setTypesAppareil(prev=>[...prev.filter(t=>t!=="Autre"),newTypeAppareil.trim(),"Autre"]);setDraftApp(prev=>({...prev,typeAppareil:newTypeAppareil.trim()}));setNewTypeAppareil("");}}}
                            style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:4,padding:"2px 5px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
                        </div>
                        {draftApp.typeAppareil && !["Fly-killer colle","Fly-killer UV","Panneau lumineux","Lampe autonome","Mixte UV+Colle","Autre"].includes(draftApp.typeAppareil) && (
                          <button onClick={()=>{setTypesAppareil(prev=>prev.filter(t=>t!==draftApp.typeAppareil));setDraftApp(prev=>({...prev,typeAppareil:"Fly-killer colle"}));}}
                            style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:4,padding:"2px 8px",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                            Supprimer ce type
                          </button>
                        )}
                      </div>
                      <select value={draftApp.typeTubes||"Actinique"} onChange={e=>setDraftApp(prev=>({...prev,typeTubes:e.target.value}))}
                        style={{ background:"#243352", border:"1px solid #3b82f6", borderRadius:5, padding:"3px 6px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" }}>
                        {typesTubes.map(t=><option key={t}>{t}</option>)}
                      </select>
                      <input type="number" value={draftApp.puissance||""} onChange={e=>setDraftApp(prev=>({...prev,puissance:e.target.value}))}
                        placeholder="ex: 15"
                        style={{ background:"#243352", border:"1px solid #3b82f6", borderRadius:5, padding:"3px 6px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit", width:"100%" }}/>
                      <input type="number" value={draftApp.nbTubes||""} onChange={e=>setDraftApp(prev=>({...prev,nbTubes:e.target.value}))}
                        placeholder="ex: 2"
                        style={{ background:"#243352", border:"1px solid #3b82f6", borderRadius:5, padding:"3px 6px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit", width:"100%" }}/>
                      <select value={draftApp.appat||""} onChange={e=>setDraftApp(prev=>({...prev,appat:e.target.value}))}
                        style={{ background:"#243352", border:"1px solid #3b82f6", borderRadius:5, padding:"3px 6px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" }}>
                        <option value="">—</option>
                        <option value="Glue">Glue</option>
                        <option value="Grille">Grille</option>
                        <option value="Toxique">Toxique</option>
                        <option value="Lumiere">Lumiere</option>
                        <option value="Autre">Autre</option>
                      </select>
                      <select value={draftApp.statutFonctionnel||""} onChange={e=>setDraftApp(prev=>({...prev,statutFonctionnel:e.target.value}))}
                        style={{ background:"#243352", border:"1px solid #3b82f6", borderRadius:5, padding:"3px 6px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" }}>
                        <option value="">—</option>
                        <option value="ok">✓ Fonctionne</option>
                        <option value="panne">✗ En panne</option>
                      </select>
                      <div style={{ display:"flex", gap:4 }}>
                        <button onClick={()=>saveApp(p.id)} style={{ background:"#22c55e", color:"#fff", border:"none", borderRadius:5, padding:"3px 8px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>OK</button>
                        <button onClick={()=>setEditApp(null)} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:5, padding:"3px 6px", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>X</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:11, color:app.marque?"#f1f5f9":"#3d5270" }}>{app.marque||"—"}</div>
                      <div style={{ fontSize:11, color:app.typeAppareil?"#f1f5f9":"#3d5270" }}>{app.typeAppareil||"—"}</div>
                      <div style={{ fontSize:11, color:app.typeTubes?"#f1f5f9":"#3d5270" }}>{app.typeTubes||"—"}</div>
                      <div style={{ fontSize:11, color:app.puissance?"#f1f5f9":"#3d5270" }}>{app.puissance?app.puissance+" W":"—"}</div>
                      <div style={{ fontSize:11, color:app.nbTubes?"#f1f5f9":"#3d5270" }}>{app.nbTubes||"—"}</div>
                      <div style={{ fontSize:11, color:p.appat?"#f1f5f9":"#3d5270" }}>{p.appat||"—"}</div>
                      <div>
                        {app.statutFonctionnel==="ok" && <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#22c55e"}}><span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/> OK</span>}
                        {app.statutFonctionnel==="panne" && <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#ef4444"}}><span style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",display:"inline-block"}}/> Panne</span>}
                        {!app.statutFonctionnel && <span style={{fontSize:10,color:"#5a7090"}}>—</span>}
                      </div>
                      <button onClick={()=>startEditApp(p)} style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:5, padding:"3px 8px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        Modifier
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Formulaire maintenance */}
      {showForm && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", marginBottom:14 }}>Nouvelle intervention de maintenance</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:10 }}>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:6 }}>DEIV * (sélectionner un ou plusieurs)</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,maxHeight:150,overflowY:"auto",background:"#1a2540",borderRadius:8,padding:"8px",border:"1px solid #3d5270"}}>
                {postes.map(p=>{
                  const selected = (form.poste||"").split(",").map(x=>x.trim()).includes(p.id);
                  return (
                    <label key={p.id} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",background:selected?"#1d4ed822":"transparent",border:"1px solid "+(selected?"#3b82f6":"#3d5270"),borderRadius:6,padding:"3px 8px"}}>
                      <input type="checkbox" checked={selected} onChange={e=>{
                        const current=(form.poste||"").split(",").map(x=>x.trim()).filter(Boolean);
                        const next = e.target.checked ? [...current,p.id] : current.filter(x=>x!==p.id);
                        setForm(f=>({...f,poste:next.join(", ")}));
                      }} style={{accentColor:"#3b82f6"}}/>
                      <span style={{fontSize:10,color:selected?"#3b82f6":"#94a3b8",fontWeight:selected?700:400}}>{p.id} <span style={{color:"#5a7090"}}>- {(p.zone||"").slice(0,20)}</span></span>
                    </label>
                  );
                })}
              </div>
              {form.poste && <div style={{fontSize:10,color:"#3b82f6",marginTop:4}}>Sélectionnés : {form.poste}</div>}
            </div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Date *</label>
              <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={inp()}/></div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:6 }}>Technicien(s)</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {TECHNICIENS.map(t=>{
                  const selected=(form.technicien||"").split(",").map(x=>x.trim()).includes(t);
                  return (
                    <button key={t} type="button" onClick={()=>{
                      const current=(form.technicien||"").split(",").map(x=>x.trim()).filter(Boolean);
                      const next=selected?current.filter(x=>x!==t):[...current,t];
                      setForm(p=>({...p,technicien:next.join(", ")}));
                    }}
                      style={{background:selected?"#1d4ed822":"#243352",color:selected?"#3b82f6":"#7a90aa",border:"1px solid "+(selected?"#3b82f6":"#3d5270"),borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:selected?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                      {t.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
              {form.technicien && <div style={{fontSize:10,color:"#3b82f6",marginTop:4}}>{form.technicien}</div>}
            </div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Type d'intervention</label>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inp()}>
                {typesMaint.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
              <div style={{display:"flex",gap:4,marginTop:4}}>
                <input value={newTypeMaint} onChange={e=>setNewTypeMaint(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(newTypeMaint.trim()&&!typesMaint.includes(newTypeMaint.trim())){const v=newTypeMaint.trim();setTypesMaint(prev=>[...prev.filter(t=>t!=="Autre"),v,"Autre"]);setForm(p=>({...p,type:v}));setNewTypeMaint("");}}}}
                  placeholder="+ Nouveau type..."
                  style={{...inp(),fontSize:10,padding:"3px 8px",flex:1}}/>
                <button onClick={()=>{if(newTypeMaint.trim()&&!typesMaint.includes(newTypeMaint.trim())){const v=newTypeMaint.trim();setTypesMaint(prev=>[...prev.filter(t=>t!=="Autre"),v,"Autre"]);setForm(p=>({...p,type:v}));setNewTypeMaint("");}}}
                  style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
            </div>
          </div>
          <div style={{ marginBottom:10 }}><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Notes</label>
            <textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{ ...inp(), resize:"vertical" }}/></div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={addIntervention} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Enregistrer</button>
            <button onClick={()=>setShowForm(false)} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:8, padding:"8px 16px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
          </div>
        </Card>
      )}

      {/* Filtres */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher DEIV..."
          style={{ background:"#243352", border:"1px solid #3d5270", borderRadius:8, padding:"7px 14px", color:"#f1f5f9", fontSize:12, fontFamily:"inherit", width:200 }}/>
        <select value={filterZone} onChange={e=>setFilterZone(e.target.value)}
          style={{ background:"#243352", border:"1px solid #3d5270", borderRadius:8, padding:"7px 12px", color:"#f1f5f9", fontSize:12, fontFamily:"inherit", minWidth:160 }}>
          {zonesDispos.map(z=><option key={z}>{z}</option>)}
        </select>
        {filterZone !== "Toutes" && (
          <button onClick={()=>setFilterZone("Toutes")}
            style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444433",borderRadius:7,padding:"7px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
            Reset
          </button>
        )}
        <span style={{ fontSize:12, color:"#5a7090", alignSelf:"center" }}>{filtered.length} DEIV</span>
      </div>

      {/* Tableau principal */}
      {showGestion !== "appareils" && (
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{ background:"#1a2540", padding:"10px 16px", display:"grid", gridTemplateColumns:"70px 1fr 90px 110px 100px 70px 70px 60px 70px 75px 65px", gap:8, fontSize:10, fontWeight:700, color:"#7a90aa", textTransform:"uppercase" }}>
          <div>N° DEIV</div><div>Zone</div><div>Marque</div><div>Type DEIV</div><div>Type tubes</div><div>Puissance</div><div>Capture</div><div>Tubes</div><div>Statut</div><div>Dern. maint.</div><div>Nb maint.</div>
        </div>
        <div style={{ maxHeight:450, overflowY:"auto" }}>
          {filtered.map((p,i) => {
            const hist = postesInterventions(p.id);
            const last = hist[0];
            const isS = sel && sel.id === p.id;
            const app = appareils[p.id]||{};
            return (
              <React.Fragment key={p.id}>
                <div onClick={()=>setSel(isS?null:p)}
                  style={{ padding:"9px 16px", display:"grid", gridTemplateColumns:"70px 1fr 90px 110px 100px 70px 70px 60px 70px 75px 65px", gap:8, alignItems:"center", borderTop:"1px solid #243352", background:isS?"#2d4a7a":i%2===0?"transparent":"#ffffff04", cursor:"pointer" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#f59e0b", fontFamily:"monospace" }}>{p.id}</div>
                  <div style={{ fontSize:11, color:"#cbd5e1" }}>{(p.zone||"").length>28?(p.zone||"").slice(0,28)+"...":p.zone}</div>
                  <div style={{ fontSize:11, color:app.marque?"#f1f5f9":"#5a7090" }}>{app.marque||"—"}</div>
                  <div style={{ fontSize:11, color:app.typeAppareil?"#f1f5f9":"#5a7090" }}>{app.typeAppareil||"—"}</div>
                  <div style={{ fontSize:11, color:app.typeTubes?"#f1f5f9":"#5a7090" }}>{app.typeTubes||"—"}</div>
                  <div style={{ fontSize:11, color:app.puissance?"#f1f5f9":"#5a7090" }}>{app.puissance?app.puissance+" W":"—"}</div>
                  <div style={{ fontSize:11, color:p.appat?"#f1f5f9":"#5a7090" }}>{p.appat||"—"}</div>
                  <div style={{ fontSize:11, color:app.nbTubes?"#f1f5f9":"#5a7090" }}>{app.nbTubes||"—"}</div>
                  <div>
                    {app.statutFonctionnel === "ok" && <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#22c55e"}}><span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/> OK</span>}
                    {app.statutFonctionnel === "panne" && <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#ef4444"}}><span style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",display:"inline-block"}}/> Panne</span>}
                    {!app.statutFonctionnel && <span style={{fontSize:10,color:"#5a7090"}}>—</span>}
                  </div>
                  <div style={{ fontSize:11, color:last?"#22c55e":"#5a7090" }}>{last?last.date:"—"}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:hist.length>0?"#3b82f6":"#5a7090" }}>{hist.length}</div>
                </div>
                {isS && hist.length>0 && (
                  <div style={{ padding:"10px 20px", background:"#162338", borderTop:"1px solid #3d5270" }}>
                    <div style={{ fontSize:10, color:"#7a90aa", fontWeight:700, textTransform:"uppercase", marginBottom:8 }}>Historique interventions</div>
                    {hist.map(h=>(
                      <div key={h.id} style={{ display:"flex", gap:10, alignItems:"center", marginBottom:5, background:"#243352", borderRadius:7, padding:"6px 10px" }}>
                        <span style={{ fontSize:11, color:"#7a90aa", minWidth:80 }}>{h.date}</span>
                        <span style={{ fontSize:11, fontWeight:600, color:"#f1f5f9", flex:1 }}>{h.type}</span>
                        <span style={{ fontSize:10, color:"#7a90aa" }}>{h.technicien}</span>
                        {h.notes&&<span style={{ fontSize:10, color:"#5a7090", fontStyle:"italic" }}>{h.notes.slice(0,40)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>
      )}

      {/* KPI visuels sous le tableau */}
      {showGestion !== "appareils" && postes.length > 0 && (()=>{
        const total = postes.length;
        const maintenus = postes.filter(p => postesInterventions(p.id).length > 0).length;
        const pctMaint = Math.round(maintenus / total * 100);
        const captureCounts = {};
        postes.forEach(p => { const k = p.appat||"Non renseigne"; captureCounts[k] = (captureCounts[k]||0)+1; });
        const captureColors = { "Glue":"#f59e0b", "Grille":"#3b82f6", "Toxique":"#ef4444", "Lumiere":"#a78bfa", "Autre":"#64748b", "Non renseigne":"#3d5270" };
        const typeCounts = {};
        postes.forEach(p => { const app = appareils[p.id]||{}; const k = app.typeAppareil||"Non renseigne"; typeCounts[k] = (typeCounts[k]||0)+1; });
        const typeColors = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#a78bfa","#06b6d4","#f97316","#64748b"];
        return (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginTop:16}}>
            <Card style={{padding:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7a90aa",textTransform:"uppercase",marginBottom:10}}>Couverture maintenance</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                <span style={{fontSize:22,fontWeight:800,color:"#3b82f6"}}>{maintenus}</span>
                <span style={{fontSize:13,color:"#5a7090"}}>/ {total} DEIV</span>
              </div>
              <div style={{height:10,background:"#1a2540",borderRadius:6,overflow:"hidden",marginBottom:6}}>
                <div style={{height:"100%",width:pctMaint+"%",background:pctMaint===100?"#22c55e":pctMaint>50?"#3b82f6":"#f59e0b",borderRadius:6}}/>
              </div>
              <div style={{fontSize:11,color:pctMaint===100?"#22c55e":pctMaint>50?"#3b82f6":"#f59e0b",fontWeight:700}}>{pctMaint}% du parc maintenu</div>
              {maintenus < total && <div style={{fontSize:10,color:"#5a7090",marginTop:4}}>{total-maintenus} appareil{total-maintenus>1?"s":""} sans maintenance</div>}
            </Card>
            <Card style={{padding:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7a90aa",textTransform:"uppercase",marginBottom:10}}>Type de capture</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:6,height:70,marginBottom:8}}>
                {Object.entries(captureCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
                  const pct=Math.round(v/total*100); const col=captureColors[k]||"#64748b";
                  return <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:9,fontWeight:700,color:col}}>{pct}%</span><div style={{width:"100%",background:col,borderRadius:"3px 3px 0 0",height:Math.max(4,pct*0.6)+"px",opacity:0.85}}/></div>;
                })}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {Object.entries(captureCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{
                  const col=captureColors[k]||"#64748b";
                  return <span key={k} style={{fontSize:9,color:col,display:"flex",alignItems:"center",gap:3}}><span style={{width:6,height:6,borderRadius:"50%",background:col,display:"inline-block"}}/>{k} ({v})</span>;
                })}
              </div>
            </Card>
            <Card style={{padding:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7a90aa",textTransform:"uppercase",marginBottom:10}}>Type d'appareil</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).map(([k,v],idx)=>{
                  const pct=Math.round(v/total*100); const col=typeColors[idx%typeColors.length];
                  return <div key={k}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:10,color:"#94a3b8"}}>{k}</span><span style={{fontSize:10,fontWeight:700,color:col}}>{v} ({pct}%)</span></div><div style={{height:5,background:"#1a2540",borderRadius:4}}><div style={{height:"100%",width:pct+"%",background:col,borderRadius:4}}/></div></div>;
                })}
              </div>
            </Card>
          </div>
        );
      })()}

    </div>
  );
}

// ============================================================
// CONFORMITÉ IFS
// ============================================================
function Conformite() {
  const STATUTS = ["Conforme", "En cours", "Non conforme", "Non applicable"];
  const [criteres, setCriteres] = useState(CRITERES_IFS.map(c => ({...c})));
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newC, setNewC] = useState({ ref:"", libelle:"", statut:"En cours", date:"" });

  useEffect(() => {
    sbGet("conformite_ifs").then(data => {
      if (data && data.length > 0) setCriteres(data);
      else CRITERES_IFS.forEach(c => sbUpsert("conformite_ifs", { id: c.ref, contrat: CLIENT_CONFIG.contrat, ref: c.ref, libelle: c.libelle, statut: c.statut, date: c.date||"" }));
    }).catch(()=>{});
  }, []);

  const conformes  = criteres.filter(c => c.statut === "Conforme").length;
  const enCours    = criteres.filter(c => c.statut === "En cours").length;
  const nonConf    = criteres.filter(c => c.statut === "Non conforme").length;
  const pct        = criteres.length > 0 ? Math.round(conformes / criteres.filter(c=>c.statut!=="Non applicable").length * 100) : 0;
  const pctColor   = pct >= 90 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";

  function startEdit(c) { setEditing(c.ref); setDraft({...c}); }
  function saveEdit() {
    const dateFmt = draft.date && draft.date.includes("-") ? draft.date.split("-").reverse().join("/") : draft.date;
    const updated = {...draft, date: dateFmt};
    setCriteres(prev => prev.map(c => c.ref === editing ? updated : c));
    sbUpdate("conformite_ifs", editing, { libelle:updated.libelle, statut:updated.statut, date:updated.date||"" });
    setEditing(null);
  }
  function deleteCritere(ref) {
    setCriteres(prev => prev.filter(c => c.ref !== ref));
    sbDelete("conformite_ifs", ref);
  }
  function addCritere() {
    if (!newC.ref || !newC.libelle) return;
    const dateFmt = newC.date && newC.date.includes("-") ? newC.date.split("-").reverse().join("/") : newC.date;
    const c = {...newC, date: dateFmt};
    setCriteres(prev => [...prev, c]);
    sbUpsert("conformite_ifs", { id: c.ref, contrat: CLIENT_CONFIG.contrat, ref: c.ref, libelle: c.libelle, statut: c.statut, date: c.date||"" });
    setNewC({ ref:"", libelle:"", statut:"En cours", date:"" });
    setShowAdd(false);
  }

  function handleExport() {
    const rows = criteres.map(c => {
      const col = c.statut==="Conforme"?"green":c.statut==="Non conforme"?"red":"orange";
      return "<tr><td style='font-weight:700;color:#1d4ed8'>" + c.ref + "</td><td>" + c.libelle + "</td><td style='font-weight:700;color:" + col + "'>" + c.statut + "</td><td>" + (c.date||"") + "</td></tr>";
    }).join("");
    exportHTML("Conformite IFS - " + CLIENT_CONFIG.nom,
      "<h1>Conformite IFS Food v8 - " + CLIENT_CONFIG.nom + "</h1>" +
      "<p style='color:#7a90aa;margin-bottom:16px'>Section 4.14 - " + new Date().toLocaleDateString("fr-FR") + "</p>" +
      "<div class='kpi-grid'>" +
        "<div class='kpi'><div class='kpi-v' style='color:green'>" + conformes + "</div><div class='kpi-l'>Conformes</div></div>" +
        "<div class='kpi'><div class='kpi-v' style='color:orange'>" + enCours + "</div><div class='kpi-l'>En cours</div></div>" +
        "<div class='kpi'><div class='kpi-v' style='color:red'>" + nonConf + "</div><div class='kpi-l'>Non conformes</div></div>" +
        "<div class='kpi'><div class='kpi-v' style='color:" + (pctColor==="green"?pctColor:"#d97706") + "'>" + pct + "%</div><div class='kpi-l'>Score global</div></div>" +
      "</div>" +
      "<h2>Detail des criteres</h2>" +
      "<table><thead><tr><th>Ref.</th><th>Exigence</th><th>Statut</th><th>Verifie le</th></tr></thead><tbody>" + rows + "</tbody></table>"
    );
  }

  const inpStyle = inp();

  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4, flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9" }}>Conformite IFS Food</div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowAdd(v=>!v)}
            style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + Ajouter critere
          </button>
          <button onClick={handleExport}
            style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Export PDF
          </button>
        </div>
      </div>
      <div style={{ fontSize:13, color:"#7a90aa", marginBottom:16 }}>Referentiel IFS Food v8 — Section 4.14</div>

      {/* Score */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#94a3b8" }}>Score global</div>
          <div style={{ fontSize:28, fontWeight:900, color:pctColor }}>{pct}%</div>
        </div>
        <div style={{ background:"#1a2540", borderRadius:8, height:12, overflow:"hidden" }}>
          <div style={{ width:pct+"%", height:"100%", background:"linear-gradient(90deg,#1d4ed8,"+pctColor+")", borderRadius:8 }}/>
        </div>
        <div style={{ marginTop:8, display:"flex", gap:16, fontSize:12 }}>
          <span style={{ color:"#22c55e" }}>{conformes} conformes</span>
          <span style={{ color:"#f59e0b" }}>{enCours} en cours</span>
          <span style={{ color:"#ef4444" }}>{nonConf} non conformes</span>
        </div>
      </Card>

      {/* Formulaire ajout */}
      {showAdd && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:12 }}>Nouveau critere</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:10 }}>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Ref. *</label>
              <input value={newC.ref} onChange={e=>setNewC(p=>({...p,ref:e.target.value}))} placeholder="ex: 4.14.8" style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Exigence *</label>
              <input value={newC.libelle} onChange={e=>setNewC(p=>({...p,libelle:e.target.value}))} style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Statut</label>
              <select value={newC.statut} onChange={e=>setNewC(p=>({...p,statut:e.target.value}))} style={inpStyle}>
                {STATUTS.map(s=><option key={s}>{s}</option>)}
              </select></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Date</label>
              <input type="date" value={newC.date} onChange={e=>setNewC(p=>({...p,date:e.target.value}))} style={inpStyle}/></div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={addCritere} style={{ background:"#22c55e", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Ajouter</button>
            <button onClick={()=>setShowAdd(false)} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
          </div>
        </Card>
      )}

      {/* Tableau */}
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{ background:"#1a2540", padding:"10px 18px", display:"grid", gridTemplateColumns:"80px 1fr 130px 110px 80px", gap:10, fontSize:10, fontWeight:700, color:"#7a90aa", textTransform:"uppercase" }}>
          <div>Ref.</div><div>Exigence</div><div>Statut</div><div>Verifie le</div><div>Action</div>
        </div>
        {criteres.map((c, i) => (
          <div key={c.ref}>
            {editing === c.ref ? (
              <div style={{ padding:"12px 18px", borderTop:"1px solid #3d5270", background:"#243352" }}>
                <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 130px 110px 80px", gap:10, alignItems:"center" }}>
                  <input value={draft.ref} onChange={e=>setDraft(p=>({...p,ref:e.target.value}))} style={{...inpStyle,fontSize:11}}/>
                  <input value={draft.libelle} onChange={e=>setDraft(p=>({...p,libelle:e.target.value}))} style={{...inpStyle,fontSize:11}}/>
                  <select value={draft.statut} onChange={e=>setDraft(p=>({...p,statut:e.target.value}))} style={{...inpStyle,fontSize:11}}>
                    {STATUTS.map(s=><option key={s}>{s}</option>)}
                  </select>
                  <input type="date" value={draft.date&&draft.date.includes("/")?draft.date.split("/").reverse().join("-"):draft.date||""} onChange={e=>setDraft(p=>({...p,date:e.target.value}))} style={{...inpStyle,fontSize:11}}/>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={saveEdit} style={{ background:"#22c55e", color:"#fff", border:"none", borderRadius:5, padding:"3px 8px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>OK</button>
                    <button onClick={()=>setEditing(null)} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:5, padding:"3px 6px", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>X</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding:"12px 18px", display:"grid", gridTemplateColumns:"80px 1fr 130px 110px 80px", gap:10, alignItems:"center", borderTop:"1px solid #3d5270", background:i%2===0?"transparent":"#ffffff04" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#3b82f6", fontFamily:"monospace" }}>{c.ref}</div>
                <div style={{ fontSize:12, color:"#e2e8f0" }}>{c.libelle}</div>
                <Badge label={c.statut}/>
                <div style={{ fontSize:12, color:"#7a90aa" }}>{c.date}</div>
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={()=>startEdit(c)} style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Edit</button>
                  <button onClick={()=>deleteCritere(c.ref)} style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444433", borderRadius:5, padding:"2px 6px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>X</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ============================================================
// STATISTIQUES
// ============================================================

// ============================================================
// Statistiques - Sous-composants graphes
// ============================================================

function usePersistedBool(key, defaultValue) {
  const storageKey = "aads_chart_" + key;
  const [value, setValue] = React.useState(() => {
    try {
      const saved = window.localStorage && window.localStorage.getItem(storageKey);
      return saved !== null ? saved === "true" : defaultValue;
    } catch(e) { return defaultValue; }
  });
  function update(newVal) {
    const resolved = typeof newVal === "function" ? newVal(value) : newVal;
    setValue(resolved);
    try { window.localStorage && window.localStorage.setItem(storageKey, String(resolved)); } catch(_e) { return; }
  }
  return [value, update];
}
function usePersistedCollapsed(key, defaultValue) { return usePersistedBool("collapsed_"+key, defaultValue); }

// Persistance generique des filtres de graphiques (chaines, nombres, tableaux, booleens)
function usePersistedValue(key, defaultValue) {
  const storageKey = "aads_chart_" + key;
  const [value, setValue] = React.useState(() => {
    try {
      const saved = window.localStorage && window.localStorage.getItem(storageKey);
      if (saved === null || saved === undefined) return defaultValue;
      return JSON.parse(saved);
    } catch(_e) { return defaultValue; }
  });
  function update(newVal) {
    const resolved = typeof newVal === "function" ? newVal(value) : newVal;
    setValue(resolved);
    try { window.localStorage && window.localStorage.setItem(storageKey, JSON.stringify(resolved)); } catch(_e) { return; }
  }
  return [value, update];
}
// Annee en cours, defaut des filtres annee
const ANNEE_COURANTE = String(new Date().getFullYear());
// Defaut des filtres annee : annee en cours si elle contient des donnees, sinon Toutes
function anneeDefaut(liste, champ) {
  const champs = Array.isArray(champ) ? champ : [champ || "date"];
  const present = (liste||[]).some(x => champs.some(f => {
    const v = (x||{})[f];
    if (!v) return false;
    const p = String(v).split("/");
    const d = p.length === 3 ? new Date(p[2]+"-"+p[1]+"-"+p[0]) : new Date(v);
    return d && !isNaN(d) && String(d.getFullYear()) === ANNEE_COURANTE;
  }));
  return present ? ANNEE_COURANTE : "Toutes";
}

function exportChartCard(titleText, innerHtml) {
  exportHTML(titleText + " - " + CLIENT_CONFIG.nom,
    "<h1>" + titleText + "</h1>" +
    "<p style='color:#6b7280;margin-bottom:16px'>" + CLIENT_CONFIG.nom + " - " + new Date().toLocaleDateString("fr-FR") + "</p>" +
    innerHtml
  );
}

function ChartExportBtn({ onClick }) {
  function handleClick(e) {
    // Remonte jusqu'a la Card parente (recherche generique) pour trouver le SVG du graphique
    let node = e.currentTarget;
    let svgEl = null;
    for (let i = 0; i < 6 && node; i++) {
      node = node.parentElement;
      if (!node) break;
      svgEl = node.querySelector("svg");
      if (svgEl) break;
    }
    if (svgEl && onClick) {
      const svgClone = svgEl.cloneNode(true);
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const svgString = new XMLSerializer().serializeToString(svgClone);
      onClick(svgString);
    } else if (onClick) {
      onClick(null);
    }
  }
  return (
    <button onClick={handleClick} title="Exporter ce graphique en PDF"
      style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
      ↓ PDF
    </button>
  );
}

function PieChart({ data, title, subtitle, chartKey, filtersJsx }) {
  const key = chartKey || title.replace(/[^a-zA-Z0-9]/g,"_");
  const [collapsed, setCollapsed] = usePersistedCollapsed(key, false);
  const [fullscreen, setFullscreen] = useState(false);

  const filteredData = (data||[]).filter(d=>d.value>0);
  const total = filteredData.reduce((s,d)=>s+d.value,0);
  const isEmpty = total === 0;

  const CX=120, CY=120, R=100;
  let cur = -Math.PI/2;
  const slices = isEmpty ? [] : filteredData.map(d=>{
    const angle=(d.value/total)*2*Math.PI;
    const x1=CX+R*Math.cos(cur), y1=CY+R*Math.sin(cur);
    const x2=CX+R*Math.cos(cur+angle), y2=CY+R*Math.sin(cur+angle);
    const mid=cur+angle/2;
    const lx=CX+(R*0.65)*Math.cos(mid), ly=CY+(R*0.65)*Math.sin(mid);
    const large=angle>Math.PI?1:0;
    const path="M"+CX+","+CY+" L"+x1+","+y1+" A"+R+","+R+" 0 "+large+",1 "+x2+","+y2+" Z";
    const pct=Math.round(d.value/total*100);
    cur+=angle;
    return {...d, pct, path, lx, ly};
  });

  function exportThisChart() {
    if (isEmpty) { exportChartCard(title, "<p style='color:#9ca3af'>Aucune donnee disponible.</p>"); return; }
    // Générer le SVG camembert
    const CX2=120, CY2=120, R2=90;
    const pathsSvg = slices.map(s=>"<path d='"+s.path+"' fill='"+s.color+"' stroke='#fff' stroke-width='2'/>"
      +(s.pct>=5?"<text x='"+s.lx+"' y='"+s.ly+"' font-size='11' fill='#fff' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>"+s.pct+"%</text>":"")
    ).join("");
    const legendSvg = slices.map((s,i)=>"<g transform='translate(250,"+(20+i*22)+")'><rect x='0' y='0' width='14' height='14' rx='3' fill='"+s.color+"'/><text x='20' y='11' font-size='12' fill='#374151'>"+s.label+" ("+s.value+")</text></g>").join("");
    const svgPie = "<svg width='500' height='240' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'><g transform='translate(0,0)'>"+pathsSvg+"</g>"+legendSvg+"</svg>";
    const rows = slices.map(s=>"<tr><td style='padding:6px 10px;border:1px solid #e5e7eb'><span style='display:inline-block;width:10px;height:10px;border-radius:50%;background:"+s.color+";margin-right:8px'></span>"+s.label+"</td><td style='padding:6px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700'>"+s.value+"</td><td style='padding:6px 10px;border:1px solid #e5e7eb;text-align:right'>"+s.pct+"%</td></tr>").join("");
    exportChartCard(title, svgPie+"<table style='width:100%;border-collapse:collapse;margin-top:16px'><thead><tr><th style='padding:6px 10px;border:1px solid #e5e7eb;text-align:left'>Categorie</th><th style='padding:6px 10px;border:1px solid #e5e7eb'>Valeur</th><th style='padding:6px 10px;border:1px solid #e5e7eb'>%</th></tr></thead><tbody>"+rows+"</tbody></table><p style='margin-top:12px;font-weight:700'>Total : "+total+"</p>");
  }

  const pieSize = fullscreen ? 320 : 200;

  const bodyJsx = isEmpty ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucune donnee disponible.</div>
  ) : (
    <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
      <svg viewBox="0 0 240 240" style={{width:pieSize,height:pieSize,flexShrink:0}}>
        {slices.map((s,i)=>(
          <g key={i}>
            <path d={s.path} fill={s.color} stroke="#1a2540" strokeWidth="2"/>
            {s.pct>=5&&<text x={s.lx} y={s.ly} fontSize="9" fill="#fff" textAnchor="middle" dominantBaseline="middle" fontWeight="700">{s.pct}%</text>}
          </g>
        ))}
      </svg>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
        {slices.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:12,height:12,borderRadius:"50%",background:s.color,display:"inline-block",flexShrink:0}}/>
            <span style={{fontSize:12,color:"#f1f5f9",fontWeight:600}}>{s.label}</span>
            <span style={{fontSize:12,color:"#7a90aa"}}>{s.value}</span>
            <span style={{fontSize:11,color:s.color,fontWeight:700,marginLeft:"auto"}}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:800,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>{title} ({total})</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {subtitle&&<span style={{fontSize:11,color:"#7a90aa",background:"#243352",borderRadius:6,padding:"3px 8px"}}>{subtitle}</span>}
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {filtersJsx}
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}
    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{title} ({total})</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {subtitle&&<span style={{fontSize:11,color:"#7a90aa",background:"#243352",borderRadius:6,padding:"3px 8px"}}>{subtitle}</span>}
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {filtersJsx}
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>{title} - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}

function DeivEvolutionChart({ passages, anneeRef }) {
  const CATS = ["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"];
  const CAT_COLORS = {"Moucherons":"#f59e0b","Mouches":"#ef4444","Moustiques":"#3b82f6","Hyménoptères":"#22c55e","Lépidoptères":"#8b5cf6","Coléoptères":"#06b6d4","Punaises":"#f97316","Tipules":"#7a90aa"};
  const pd = d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0);};
  const byMois={};
  passages.forEach(passage=>{
    const d=pd(passage.date);
    if(!d||d.getFullYear()!==anneeRef)return;
    const m=d.getMonth();
    if(!byMois[m]){byMois[m]={};CATS.forEach(c=>byMois[m][c]=0);}
    const saisies=typeof passage.saisies==="string"?JSON.parse(passage.saisies||"{}"):passage.saisies||{};
    Object.values(saisies).forEach(s=>{CATS.forEach(cat=>{byMois[m][cat]+=parseInt(s["iv_"+cat]||0);});});
  });
  const moisDispo=Object.keys(byMois).map(Number).sort((a,b)=>a-b);
  const catsActives=CATS.filter(cat=>moisDispo.some(m=>byMois[m][cat]>0));
  if(moisDispo.length===0||catsActives.length===0)return null;
  const MOIS=["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];
  const maxVal=Math.max(...moisDispo.flatMap(m=>catsActives.map(c=>byMois[m][c])),1);
  const W=650,H=220,PAD=50;
  const xPos=(i)=>PAD+i/(moisDispo.length-1||1)*(W-PAD*2);
  const yPos=(v)=>H-PAD-(v/maxVal)*(H-PAD*2);
  return (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Évolution mensuelle DEIV - {anneeRef}</div>
        <ChartExportBtn onClick={(svgString)=>{
          const rows = catsActives.map(cat=>{
            const vals = moisDispo.map(m=>byMois[m][cat]);
            return "<tr><td style='padding:5px 8px;border:1px solid #e5e7eb'><span style='display:inline-block;width:10px;height:10px;border-radius:50%;background:"+CAT_COLORS[cat]+";margin-right:6px'></span>"+cat+"</td>"+vals.map(v=>"<td style='padding:5px 8px;border:1px solid #e5e7eb;text-align:center'>"+v+"</td>").join("")+"</tr>";
          }).join("");
          const header = "<th style='padding:5px 8px;border:1px solid #e5e7eb'>Espece</th>"+moisDispo.map(m=>"<th style='padding:5px 8px;border:1px solid #e5e7eb'>"+MOIS[m]+"</th>").join("");
          const svgHtml = svgString ? "<div style='margin-bottom:20px'>"+svgString+"</div>" : "";
          exportChartCard("Évolution mensuelle DEIV "+anneeRef, svgHtml+"<table style='width:100%;border-collapse:collapse;font-size:12px'><thead><tr>"+header+"</tr></thead><tbody>"+rows+"</tbody></table>");
        }}/>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:12}}>
        {catsActives.map(cat=>(<div key={cat} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:20,height:3,background:CAT_COLORS[cat],display:"inline-block",borderRadius:2}}/><span style={{fontSize:10,color:"#94a3b8"}}>{cat}</span></div>))}
      </div>
      <div style={{overflowX:"auto"}}>
        <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
          {[0,25,50,75,100].map(pct=>{const v=Math.round(maxVal*pct/100);const y=yPos(v);return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-6} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>);})}
          {moisDispo.map((m,i)=>(<text key={m} x={xPos(i)} y={H-6} fontSize="9" fill="#94a3b8" textAnchor="middle">{MOIS[m]}</text>))}
          {catsActives.map(cat=>{
            const col=CAT_COLORS[cat];
            const pts=moisDispo.map((m,i)=>xPos(i)+","+yPos(byMois[m][cat])).join(" ");
            return(<g key={cat}>{moisDispo.length>1&&<polyline points={pts} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round"/>}{moisDispo.map((m,i)=>{const v=byMois[m][cat];return(<g key={m}><circle cx={xPos(i)} cy={yPos(v)} r="3" fill={col} stroke="#1a2540" strokeWidth="1.5"/>{v>0&&<text x={xPos(i)} y={yPos(v)-7} fontSize="8" fill={col} textAnchor="middle">{v}</text>}</g>);})}</g>);
          })}
        </svg>
      </div>
    </Card>
  );
}

function ReinterPassagesChart({ passages, reinterventions }) {
  const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0);};
  function anneeDe(x){ const p=((x||{}).date||"").split("/"); if(p.length!==3) return null; const y=parseInt(p[2]); return isNaN(y)?null:y; }
  const tousEvts=(passages||[]).concat(reinterventions||[]);
  const annees=[...new Set(tousEvts.map(anneeDe).filter(Boolean))].sort((a,b)=>a-b);
  const [filterAnnee, setFilterAnnee] = usePersistedValue("ReinterPassages_filterAnnee", anneeDefaut(tousEvts));
  const anneeActive = (filterAnnee && filterAnnee!=="Toutes") ? parseInt(filterAnnee) : null;
  function garde(x){ const a=anneeDe(x); if(a===null) return false; return anneeActive===null || a===anneeActive; }
  const passagesF=(passages||[]).filter(garde);
  const reinterF=(reinterventions||[]).filter(garde);
  const byMois={};
  passagesF.forEach(p=>{const m=pd(p.date).getMonth();if(!byMois[m])byMois[m]={passages:0,reinter:0};byMois[m].passages++;});
  reinterF.forEach(r=>{const m=pd(r.date).getMonth();if(!byMois[m])byMois[m]={passages:0,reinter:0};byMois[m].reinter++;});
  const moisDispo=Object.keys(byMois).map(Number).sort((a,b)=>a-b);
  if(annees.length===0)return null;
  const anneeLabel = anneeActive===null ? "Toutes années" : String(anneeActive);
  const inpStyleRp={ background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"4px 8px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };
  const MOIS=["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];
  const totalP=passagesF.length, totalR=reinterF.length, total=totalP+totalR;
  const tauxR=total>0?Math.round(totalR/total*100):0;
  const maxVal=Math.max(...moisDispo.map(m=>byMois[m].passages+byMois[m].reinter),1);
  const vide = moisDispo.length===0;
  const W=600,H=200,PAD=40;
  const bw=moisDispo.length>0?Math.min(40,(W-PAD*2)/moisDispo.length*0.35):20;
  return (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Passages vs Réinterventions - {anneeLabel}</div>
          <select value={filterAnnee} onChange={e=>setFilterAnnee(e.target.value)} style={inpStyleRp}>
            <option value="Toutes">Toutes années</option>
            {annees.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {[["#3b82f6",totalP,"Passages"],["#ef4444",totalR,"Reinter."],[(tauxR>20?"#ef4444":tauxR>10?"#f59e0b":"#22c55e"),tauxR+"%","Taux reinter."]].map(([c,v,l])=>(<div key={l} style={{textAlign:"center",background:"#243352",borderRadius:8,padding:"5px 12px"}}><div style={{fontSize:16,fontWeight:900,color:c}}>{v}</div><div style={{fontSize:9,color:"#7a90aa"}}>{l}</div></div>))}
          <ChartExportBtn onClick={(svgString)=>{
            const rows = moisDispo.map(m=>"<tr><td style='padding:5px 8px;border:1px solid #e5e7eb'>"+MOIS[m]+"</td><td style='padding:5px 8px;border:1px solid #e5e7eb;text-align:center;color:#3b82f6;font-weight:700'>"+byMois[m].passages+"</td><td style='padding:5px 8px;border:1px solid #e5e7eb;text-align:center;color:#ef4444;font-weight:700'>"+byMois[m].reinter+"</td></tr>").join("");
            const svgHtml = svgString ? "<div style='margin-bottom:20px'>"+svgString+"</div>" : "";
            exportChartCard("Passages vs Réinterventions "+anneeLabel, svgHtml+"<table style='width:100%;border-collapse:collapse'><thead><tr><th style='padding:5px 8px;border:1px solid #e5e7eb'>Mois</th><th style='padding:5px 8px;border:1px solid #e5e7eb'>Passages</th><th style='padding:5px 8px;border:1px solid #e5e7eb'>Réinterventions</th></tr></thead><tbody>"+rows+"</tbody></table><p style='margin-top:12px'>Total passages: <strong>"+totalP+"</strong> - Total reinterventions: <strong>"+totalR+"</strong> - Taux: <strong>"+tauxR+"%</strong></p>");
          }}/>
        </div>
      </div>
      {vide ? (
        <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucun passage ni réintervention pour cette année.</div>
      ) : (<>
      <div style={{display:"flex",gap:14,marginBottom:8}}>
        {[["#3b82f6","Passages"],["#ef4444","Réinterventions"]].map(([c,l])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:12,background:c,borderRadius:2,display:"inline-block"}}/><span style={{fontSize:10,color:"#7a90aa"}}>{l}</span></div>))}
      </div>
      <div style={{overflowX:"auto"}}>
        <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
          {[0,25,50,75,100].map(pct=>{const v=Math.round(maxVal*pct/100);const y=H-PAD-(pct/100)*(H-PAD*2);return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>);})}
          {moisDispo.map((m,i)=>{
            const x=PAD+(i+0.5)*((W-PAD*2)/moisDispo.length);
            const p=byMois[m].passages,r=byMois[m].reinter;
            const bhP=(p/maxVal)*(H-PAD*2),bhR=(r/maxVal)*(H-PAD*2);
            return(<g key={m}><rect x={x-bw-1} y={H-PAD-bhP} width={bw} height={Math.max(bhP,0)} fill="#3b82f6" rx="2"/>{p>0&&<text x={x-bw/2-1} y={H-PAD-bhP-4} fontSize="8" fill="#3b82f6" textAnchor="middle">{p}</text>}<rect x={x+1} y={H-PAD-bhR} width={bw} height={Math.max(bhR,0)} fill="#ef4444" rx="2"/>{r>0&&<text x={x+bw/2+1} y={H-PAD-bhR-4} fontSize="8" fill="#ef4444" textAnchor="middle">{r}</text>}<text x={x} y={H-8} fontSize="9" fill="#94a3b8" textAnchor="middle">{MOIS[m]}</text></g>);
          })}
        </svg>
      </div>
      </>)}
    </Card>
  );
}

function Top10PostesChart({ passages, postes }) {
  const SCOL={"Rongeurs":"#3b82f6","Insectes volants":"#eab308","Blattes":"#ef4444","Teignes":"#8b5cf6","IPS":"#22c55e"};
  const [hiddenList, setHiddenList] = useState(() => {
    try { const saved = window.localStorage && window.localStorage.getItem("aads_chart_Top10_hiddenList"); return saved ? JSON.parse(saved) : []; } catch(e) { return []; }
  });
  const [collapsed, setCollapsed] = usePersistedCollapsed("Top10", false);
  const [filterAnnee, setFilterAnnee] = usePersistedValue("Top10Postes_filterAnnee", anneeDefaut(passages));

  function toggleNuisible(n) {
    setHiddenList(prev => {
      const next = prev.includes(n) ? prev.filter(x=>x!==n) : [...prev, n];
      try { window.localStorage && window.localStorage.setItem("aads_chart_Top10_hiddenList", JSON.stringify(next)); } catch(_e) { return; }
      return next;
    });
  }

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const annees = [...new Set(passages.map(p=>{ const d=pd(p.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);
  const passagesFiltres = filterAnnee==="Toutes" ? passages : passages.filter(p=>{ const d=pd(p.date); return d && d.getFullYear()===parseInt(filterAnnee); });

  const MOYENNE_NUISIBLES = ["Insectes volants","IPS","Teignes"]; // nuisibles scores en moyenne par passage

  const scoreParPoste={};
  postes.forEach(p=>{scoreParPoste[p.id]={id:p.id,zone:p.zone||"",nuisible:p.nuisible||"Rongeurs",score:0,captures:0,touche:false,nbTouche:0,nbPassagesSaisis:0};});
  passagesFiltres.forEach(passage=>{
    const saisies=typeof passage.saisies==="string"?JSON.parse(passage.saisies||"{}"):passage.saisies||{};
    Object.entries(saisies).forEach(([id,s])=>{
      if(!scoreParPoste[id])return;
      const nuisible=scoreParPoste[id].nuisible;
      if(nuisible==="Rongeurs"){
        const etat=s.etat||"";
        const cap=(parseInt(s.cap_souris||0))+(parseInt(s.cap_ratBrun||0))+(parseInt(s.cap_ratNoir||0));
        const isTouche = estConsoQuelconque(etat)||cap>0;
        if(estConsoTotale(etat)||etat==="75%")scoreParPoste[id].score+=3;
        else if(etat==="50%"||etat==="25%")scoreParPoste[id].score+=2;
        else if(cap>0)scoreParPoste[id].score+=3;
        scoreParPoste[id].captures+=cap;
        scoreParPoste[id].nbPassagesSaisis++;
        if(isTouche){ scoreParPoste[id].touche=true; scoreParPoste[id].nbTouche++; }
      }
      else if(nuisible==="Insectes volants"){
        const CATS=["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"];
        const t=CATS.reduce((acc,cat)=>acc+(parseInt(s["iv_"+cat]||0)),0);
        scoreParPoste[id].captures+=t;
        scoreParPoste[id].nbPassagesSaisis++;
        if(t>0){scoreParPoste[id].touche=true;scoreParPoste[id].nbTouche++;}
      }
      else{
        const val=parseFloat(s.etat||0)||0;
        scoreParPoste[id].captures+=val;
        scoreParPoste[id].score+=val;
        scoreParPoste[id].nbPassagesSaisis++;
        if(val>0){scoreParPoste[id].touche=true;scoreParPoste[id].nbTouche++;}
      }
    });
  });
  // Score Insectes volants et IPS = moyenne par passage (captures totales / nb passages saisis)
  Object.values(scoreParPoste).forEach(p=>{
    if(MOYENNE_NUISIBLES.includes(p.nuisible) && p.nbPassagesSaisis>0){
      p.score = p.captures / p.nbPassagesSaisis;
    }
  });

  const NUISIBLES_ORDER = ["Rongeurs","Insectes volants","Blattes","Teignes","IPS"];
  const nuisibles = NUISIBLES_ORDER.filter(n=>!hiddenList.includes(n));

  // Echelle commune a tous les nuisibles affiches
  const maxScoreGlobal = Math.max(
    ...nuisibles.flatMap(n => Object.values(scoreParPoste).filter(p=>p.nuisible===n&&p.score>0).map(p=>p.score)),
    1
  );

  function labelFor(nuisible, p) {
    if (nuisible === "Rongeurs") return (p.touche ? "touche" : (p.captures+" cap.")) + " - x"+p.nbTouche;
    if (MOYENNE_NUISIBLES.includes(nuisible)) return Math.round(p.score*10)/10+" /passage";
    return "score "+p.score;
  }

  function exportThisChart() {
    let html = "<p style='color:#6b7280'>Periode : "+(filterAnnee==="Toutes"?"Toutes années":filterAnnee)+"</p>";
    nuisibles.forEach(nuisible=>{
      const col=SCOL[nuisible]||"#7a90aa";
      const top10=Object.values(scoreParPoste).filter(p=>p.nuisible===nuisible&&p.score>0).sort((a,b)=>b.score-a.score).slice(0,10);
      html += "<h2 style='color:"+col+";margin-top:16px'>"+nuisible+"</h2>";
      if(top10.length===0){ html += "<p style='color:#9ca3af;font-size:12px'>Aucune donnee</p>"; return; }
      const rows = top10.map((p,i)=>"<tr><td style='padding:5px 8px;border:1px solid #e5e7eb'>#"+(i+1)+"</td><td style='padding:5px 8px;border:1px solid #e5e7eb;font-weight:700'>"+p.id+"</td><td style='padding:5px 8px;border:1px solid #e5e7eb'>"+p.zone+"</td><td style='padding:5px 8px;border:1px solid #e5e7eb;text-align:right;font-weight:700;color:"+col+"'>"+labelFor(nuisible,p)+"</td></tr>").join("");
      html += "<table style='width:100%;border-collapse:collapse'><thead><tr><th style='padding:5px 8px;border:1px solid #e5e7eb'>#</th><th style='padding:5px 8px;border:1px solid #e5e7eb'>Poste</th><th style='padding:5px 8px;border:1px solid #e5e7eb'>Zone</th><th style='padding:5px 8px;border:1px solid #e5e7eb'>Resultat</th></tr></thead><tbody>"+rows+"</tbody></table>";
    });
    exportChartCard("Top 10 postes les plus actifs", html);
  }

  const bodyJsx = nuisibles.map(nuisible=>{
    const col=SCOL[nuisible]||"#7a90aa";
    const top10=Object.values(scoreParPoste).filter(p=>p.nuisible===nuisible&&p.score>0).sort((a,b)=>b.score-a.score).slice(0,10);
    return(
      <div key={nuisible} style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:col,textTransform:"uppercase",letterSpacing:1,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:"50%",background:col,display:"inline-block"}}/>{nuisible}</div>
        {top10.length===0 ? (
          <div style={{fontSize:11,color:"#5a7090",paddingLeft:14}}>Aucune donnee pour cette periode.</div>
        ) : top10.map((p,i)=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
            <div style={{fontSize:11,fontWeight:700,color:"#f1f5f9",width:60,flexShrink:0}}><span style={{fontSize:9,color:"#7a90aa",marginRight:4}}>#{i+1}</span>{p.id}</div>
            <div style={{fontSize:10,color:"#7a90aa",width:140,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.zone}</div>
            <div style={{flex:1,background:"#1a2540",borderRadius:4,height:14,overflow:"hidden"}}><div style={{background:col,width:(p.score/maxScoreGlobal*100)+"%",height:"100%",borderRadius:4}}/></div>
            <div style={{fontSize:10,fontWeight:700,color:col,width:110,textAlign:"right",flexShrink:0}}>{labelFor(nuisible,p)}</div>
          </div>
        ))}
      </div>
    );
  });

  const filtersJsx = (
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end",marginBottom:16,paddingBottom:14,borderBottom:"1px solid #243352"}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {NUISIBLES_ORDER.map(n=>{
          const col=SCOL[n]||"#7a90aa";
          const isHidden = hiddenList.includes(n);
          return (
            <button key={n} onClick={()=>toggleNuisible(n)}
              style={{display:"flex",alignItems:"center",gap:6,background:isHidden?"transparent":col+"18",color:isHidden?"#7a90aa":col,border:"1px solid "+(isHidden?"#3d5270":col+"44"),borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:isHidden?500:700,cursor:"pointer",fontFamily:"inherit",textDecoration:isHidden?"line-through":"none"}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:col,display:"inline-block",opacity:isHidden?0.4:1}}/>
              {n}
            </button>
          );
        })}
      </div>
      <div style={{marginLeft:"auto"}}>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Annee</label>
        <select value={filterAnnee} onChange={e=>setFilterAnnee(e.target.value)}
          style={{background:"#243352",border:"1px solid #3d5270",borderRadius:7,padding:"6px 10px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit"}}>
          <option value="Toutes">Toutes années</option>
          {annees.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Top 10 postes les plus actifs par nuisible</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(v=>!v)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            {collapsed?"+ Afficher":"− Masquer"}
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {!collapsed && (<>{filtersJsx}{bodyJsx}</>)}
    </Card>
  );
}

function PassagesParAnneeChart({ passages, reinterventions }) {
  const [collapsed, setCollapsed] = usePersistedCollapsed("PassagesParAnnee", false);
  const [fullscreen, setFullscreen] = useState(false);

  const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0);};
  const byAnnee={};
  passages.forEach(p=>{const d=pd(p.date);if(!d)return;const y=d.getFullYear();if(!byAnnee[y])byAnnee[y]={passages:0,reinter:0};byAnnee[y].passages++;});
  reinterventions.forEach(r=>{const d=pd(r.date);if(!d)return;const y=d.getFullYear();if(!byAnnee[y])byAnnee[y]={passages:0,reinter:0};byAnnee[y].reinter++;});
  const years=Object.keys(byAnnee).sort();
  const isEmpty = years.length===0;
  const maxVal=Math.max(...years.map(y=>byAnnee[y].passages+byAnnee[y].reinter),1);
  const W=fullscreen?1000:600, H=fullscreen?320:200, PAD=fullscreen?60:40;
  const bw=Math.min(50,(W-PAD*2)/(years.length||1)*0.35);

  function exportThisChart() {
    if (isEmpty) { exportChartCard("Passages par année", "<p style='color:#9ca3af'>Aucune donnee disponible.</p>"); return; }
    const W2=600, H2=220, PAD2=50;
    const maxVal2 = Math.max(...years.map(y=>byAnnee[y].passages+byAnnee[y].reinter),1);
    const bw2 = Math.min(50,(W2-PAD2*2)/(years.length||1)*0.35);
    function yVal2(v){ return H2-PAD2-(v/maxVal2)*(H2-PAD2*1.5); }
    const barsSvg = years.map((y,i)=>{
      const x = PAD2+i*(W2-PAD2*2)/(years.length>1?years.length-1:1);
      const hp = (byAnnee[y].passages/maxVal2)*(H2-PAD2*1.5);
      const hr = (byAnnee[y].reinter/maxVal2)*(H2-PAD2*1.5);
      const yp = H2-PAD2-hp;
      const yr = yp-hr;
      return "<rect x='"+(x-bw2)+"' y='"+yp+"' width='"+bw2+"' height='"+hp+"' fill='#3b82f6' rx='2'/>"
        +(byAnnee[y].reinter>0?"<rect x='"+(x-bw2)+"' y='"+yr+"' width='"+bw2+"' height='"+hr+"' fill='#ef4444' rx='2'/>":"")
        +"<text x='"+x+"' y='"+(H2-PAD2/3)+"' font-size='10' fill='#374151' text-anchor='middle' font-weight='bold'>"+y+"</text>"
        +"<text x='"+(x-bw2/2)+"' y='"+(yp-3)+"' font-size='9' fill='#3b82f6' text-anchor='middle'>"+byAnnee[y].passages+"</text>";
    }).join("");
    const gridSvg = [0,25,50,75,100].map(pct=>{ const v=Math.round(maxVal2*pct/100); const y=yVal2(v); return "<line x1='"+PAD2+"' x2='"+(W2-PAD2)+"' y1='"+y+"' y2='"+y+"' stroke='#e5e7eb' stroke-width='1'/><text x='"+(PAD2-4)+"' y='"+(y+4)+"' font-size='9' fill='#94a3b8' text-anchor='end'>"+v+"</text>"; }).join("");
    const legendSvg = "<rect x='"+PAD2+"' y='8' width='12' height='12' fill='#3b82f6' rx='2'/><text x='"+(PAD2+16)+"' y='19' font-size='10' fill='#374151'>Passages</text><rect x='"+(PAD2+80)+"' y='8' width='12' height='12' fill='#ef4444' rx='2'/><text x='"+(PAD2+96)+"' y='19' font-size='10' fill='#374151'>Réinterventions</text>";
    const svgChart = "<svg width='"+W2+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+gridSvg+barsSvg+legendSvg+"</svg>";
    const rows = years.map(y=>"<tr><td style='padding:5px 8px;border:1px solid #e5e7eb;font-weight:700'>"+y+"</td><td style='padding:5px 8px;border:1px solid #e5e7eb;text-align:center;color:#3b82f6;font-weight:700'>"+byAnnee[y].passages+"</td><td style='padding:5px 8px;border:1px solid #e5e7eb;text-align:center;color:#ef4444;font-weight:700'>"+byAnnee[y].reinter+"</td><td style='padding:5px 8px;border:1px solid #e5e7eb;text-align:center'>"+(byAnnee[y].passages+byAnnee[y].reinter)+"</td></tr>").join("");
    exportChartCard("Passages par année", svgChart+"<table style='width:100%;border-collapse:collapse;margin-top:14px'><thead><tr><th style='padding:5px 8px;border:1px solid #e5e7eb'>Annee</th><th style='padding:5px 8px;border:1px solid #e5e7eb'>Passages</th><th style='padding:5px 8px;border:1px solid #e5e7eb'>Réinterventions</th><th style='padding:5px 8px;border:1px solid #e5e7eb'>Total</th></tr></thead><tbody>"+rows+"</tbody></table>");
  }

  const bodyJsx = isEmpty ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucune donnee disponible.</div>
  ) : (
    <>
    <div style={{display:"flex",gap:14,marginBottom:8}}>{[["#3b82f6","Passages"],["#ef4444","Réinterventions"]].map(([c,l])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:12,background:c,borderRadius:2,display:"inline-block"}}/><span style={{fontSize:10,color:"#7a90aa"}}>{l}</span></div>))}</div>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {[0,25,50,75,100].map(pct=>{const v=Math.round(maxVal*pct/100);const y=H-PAD-(pct/100)*(H-PAD*2);return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>);})}
        {years.map((y,i)=>{
          const x=PAD+(i+0.5)*((W-PAD*2)/years.length);
          const p=byAnnee[y].passages,r=byAnnee[y].reinter,tot=p+r;
          const bhP=(p/maxVal)*(H-PAD*2),bhR=(r/maxVal)*(H-PAD*2);
          return(<g key={y}><rect x={x-bw-2} y={H-PAD-bhP} width={bw} height={Math.max(bhP,0)} fill="#3b82f6" rx="2"/>{p>0&&<text x={x-bw/2-2} y={H-PAD-bhP-5} fontSize="9" fill="#3b82f6" textAnchor="middle">{p}</text>}<rect x={x+2} y={H-PAD-bhR} width={bw} height={Math.max(bhR,0)} fill="#ef4444" rx="2"/>{r>0&&<text x={x+bw/2+2} y={H-PAD-bhR-5} fontSize="9" fill="#ef4444" textAnchor="middle">{r}</text>}<text x={x} y={H-8} fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="700">{y}</text><text x={x} y={H-PAD-Math.max(bhP,bhR)-14} fontSize="9" fill="#7a90aa" textAnchor="middle">{tot}</text></g>);
        })}
      </svg>
    </div>
    </>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Passages par année</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}
    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Passages par année</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Passages par année - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}

function PlanActionsPieChart({ actions }) {
  const STATUTS=["En cours","Planifiee","Résolue","Vigilance"];
  const SCOL={"En cours":"#f59e0b","Planifiee":"#3b82f6","Résolue":"#22c55e","Vigilance":"#ef4444"};
  const [filterAnnee, setFilterAnnee] = usePersistedValue("PlanActionsPie_filterAnnee", anneeDefaut(actions, ["date_detection","dateDetection"]));
  function anneeDe(a){ const det=a.date_detection||a.dateDetection||""; if(!det) return null; const parts=String(det).split("/"); const y = parts.length===3?parseInt(parts[2]):new Date(det).getFullYear(); return isNaN(y)?null:y; }
  const annees=[...new Set((actions||[]).map(anneeDe).filter(Boolean))].sort((a,b)=>a-b);
  const actionsFiltered=(actions||[]).filter(a=>{
    const y=anneeDe(a);
    if(y===null)return true;
    if(filterAnnee&&filterAnnee!=="Toutes")return y===parseInt(filterAnnee);
    return true;
  });
  const counts={};
  actionsFiltered.forEach(a=>{
    const s=a.statut||"";
    const key=STATUTS.find(k=>s.toLowerCase().includes(k.toLowerCase().replace("e","").substring(0,4)))||s;
    counts[key]=(counts[key]||0)+1;
  });
  const data=Object.entries(counts).filter(([,c])=>c>0).map(([s,c])=>({label:s,value:c,color:SCOL[s]||"#7a90aa"}));
  const anneeLabel=filterAnnee&&filterAnnee!=="Toutes"?filterAnnee:"Toutes années";
  const inpStylePac={ background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"6px 10px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };
  const filtersJsx=(
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:12,paddingBottom:12,borderBottom:"1px solid #243352"}}>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Année</label>
        <select value={filterAnnee} onChange={e=>setFilterAnnee(e.target.value)} style={inpStylePac}>
          <option value="Toutes">Toutes années</option>
          {annees.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  );
  return <PieChart data={data} title={"Plan d'actions — Répartition par statut"} subtitle={anneeLabel} chartKey="PlanActions" filtersJsx={filtersJsx}/>;
}

function PostesNuisiblePieChart({ postes }) {
  const nuisiblesCount={};
  postes.forEach(p=>{const n=p.nuisible||"Rongeurs";nuisiblesCount[n]=(nuisiblesCount[n]||0)+1;});
  const data=Object.entries(nuisiblesCount).sort((a,b)=>b[1]-a[1]).map(([n,c])=>({label:n,value:c,color:NUISIBLE_COLORS[n]||"#7a90aa"}));
  return <PieChart data={data} title={"Répartition des postes par nuisible"} chartKey="PostesNuisible"/>;
}


function StatutGraph({ passagesFiltres }) {
  const pd2 = d => { const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0); };
  const sorted = passagesFiltres.slice().sort((a,b)=>pd2(a.date)-pd2(b.date));
  const dataPoints = sorted.map(passage => {
    const saisies = typeof passage.saisies==="string"?JSON.parse(passage.saisies||"{}"):passage.saisies||{};
    return {
      date: passage.date,
      disparu: Object.values(saisies).filter(s=>s&&s.statut_poste==="Disparu").length,
      inaccessible: Object.values(saisies).filter(s=>s&&s.statut_poste==="Inaccessible").length,
      abime: Object.values(saisies).filter(s=>s&&s.statut_poste==="Abime").length,
    };
  });
  const maxVal = Math.max(...dataPoints.map(d=>d.disparu+d.inaccessible+d.abime), 1);
  const W=560, H=160, PAD=36;
  if (dataPoints.length===0) return null;
  const bw = Math.max(12,(W-PAD*2)/dataPoints.length*0.5);
  const xP = (i) => PAD + (i+0.5)*((W-PAD*2)/dataPoints.length);
  return (
    <div style={{marginTop:12}}>
      <div style={{display:"flex",gap:12,marginBottom:8}}>{[["#ef4444","Disparu"],["#f59e0b","Inaccessible"],["#8b5cf6","Abime"]].map(([c,l])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:2,background:c,display:"inline-block"}}/><span style={{fontSize:10,color:"#7a90aa"}}>{l}</span></div>))}</div>
      <div style={{overflowX:"auto"}}>
        <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
          {[0,1,2,3].map(v=>(<g key={v}><line x1={PAD} x2={W-PAD} y1={H-PAD-(v/3)*(H-PAD*2)} y2={H-PAD-(v/3)*(H-PAD*2)} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={H-PAD-(v/3)*(H-PAD*2)+4} fontSize="9" fill="#5a7090" textAnchor="end">{Math.round(maxVal*v/3)}</text></g>))}
          {dataPoints.map((d,i)=>{
            const x=xP(i);
            const hD=(d.disparu/maxVal)*(H-PAD*2), hI=(d.inaccessible/maxVal)*(H-PAD*2), hA=(d.abime/maxVal)*(H-PAD*2);
            const hT=hD+hI+hA;
            return(<g key={i}>{hD>0&&<rect x={x-bw/2} y={H-PAD-hD} width={bw} height={hD} fill="#ef4444" rx="2"/>}{hI>0&&<rect x={x-bw/2} y={H-PAD-hD-hI} width={bw} height={hI} fill="#f59e0b" rx="2"/>}{hA>0&&<rect x={x-bw/2} y={H-PAD-hD-hI-hA} width={bw} height={hA} fill="#8b5cf6" rx="2"/>}{hT>0&&<text x={x} y={H-PAD-hT-5} fontSize="9" fill="#94a3b8" textAnchor="middle">{d.disparu+d.inaccessible+d.abime}</text>}<text x={x} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle" transform={"rotate(-30 "+x+" "+(H-8)+")"}>{(d.date||"").slice(0,5)}</text></g>);
          })}
        </svg>
      </div>
    </div>
  );
}

function TauxActiviteChart({ passages, postes }) {
  const [typeFilter, setTypeFilter] = usePersistedValue("TauxActivite_typeFilter", "tous"); // tous | RE | RI
  const [filterAnnee, setFilterAnnee] = usePersistedValue("TauxActivite_filterAnnee", anneeDefaut(passages));
  const [selectedAnnees, setSelectedAnnees] = usePersistedValue("TauxActivite_selectedAnnees", []);
  const [filterTrimestre, setFilterTrimestre] = usePersistedValue("TauxActivite_filterTrimestre", "Tous");
  const [filterMois, setFilterMois] = usePersistedValue("TauxActivite_filterMois", "Tous");
  const [showSeuils, setShowSeuils] = usePersistedBool("TauxActivite_showSeuils", true);
  const [showStatutGraph, setShowStatutGraph] = usePersistedValue("TauxActivite_showStatutGraph", false);
  const [fullscreen, setFullscreen] = useState(false);
  const [collapsed, setCollapsed] = usePersistedCollapsed("TauxActivite", false);
  const [seuilsRongeurs, setSeuilsRongeurs] = useState({ taux_vigilance: CLIENT_CONFIG.seuil_vigilance||5, taux_critique: CLIENT_CONFIG.seuil_critique||10 });
  const [echelle, setEchelle] = usePersistedValue("TauxActivite_echelle", "auto"); // auto | manuel | plein
  const [maxManuel, setMaxManuel] = usePersistedValue("TauxActivite_maxManuel", 20);

  useEffect(() => {
    sbGet("seuils").then(data => {
      if (data && data.length > 0 && data[0].data) {
        try {
          const parsed = typeof data[0].data === "string" ? JSON.parse(data[0].data) : data[0].data;
          if (parsed.rongeurs) setSeuilsRongeurs({ taux_vigilance: parsed.rongeurs.taux_vigilance||5, taux_critique: parsed.rongeurs.taux_critique||10 });
        } catch(_e) { return; }
      }
    }).catch(()=>{});
  }, []);

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const MOIS_LABELS = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];

  const postesRongeurs = postes.filter(p => (p.nuisible||"Rongeurs") === "Rongeurs" && (typeFilter==="tous" || p.type===typeFilter));

  const annees = [...new Set(passages.filter(p=>p.type!=="Insectes volants").map(p=>{ const d=pd(p.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);

  function filterPassagesByPeriode(list, anneeOverride) {
    return list.filter(p => {
      if (p.type === "Insectes volants") return false; // exclure les passages DEIV
      const d = pd(p.date);
      if (!d) return false;
      if (anneeOverride) {
        if (d.getFullYear() !== parseInt(anneeOverride)) return false;
      } else if (selectedAnnees.length > 0) {
        if (!selectedAnnees.includes(d.getFullYear())) return false;
      } else if (filterAnnee !== "Toutes") {
        if (d.getFullYear() !== parseInt(filterAnnee)) return false;
      }
      if (filterTrimestre !== "Tous") {
        const t = Math.ceil((d.getMonth()+1)/3);
        if (t !== parseInt(filterTrimestre)) return false;
      }
      if (filterMois !== "Tous" && d.getMonth() !== parseInt(filterMois)) return false;
      return true;
    }).sort((a,b) => pd(a.date)-pd(b.date));
  }

  function getStats(passage) {
    const saisies = typeof passage.saisies === "string" ? JSON.parse(passage.saisies||"{}") : (passage.saisies||{});
    let actifs = 0, total = postesRongeurs.length;
    postesRongeurs.forEach(poste => {
      const s = saisies[poste.id];
      if (!s) return;
      const etat = s.etat||"";
      const capR = (parseInt(s.cap_souris||0))+(parseInt(s.cap_ratBrun||0))+(parseInt(s.cap_ratNoir||0));
      const isActif = estConsoQuelconque(etat)||capR>0;
      if (isActif) actifs++;
    });
    const tauxActivite = total > 0 ? Math.round(actifs/total*100) : 0;
    return { date: passage.date, tauxActivite, actifs, total };
  }

  const passagesFiltres = filterPassagesByPeriode(passages);
  const stats = passagesFiltres.map(getStats);

  const ANNEE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

  // Regroupement par mois : plusieurs passages dans le meme mois sont moyennes
  function statsParMois(list) {
    const parMois = {};
    list.forEach(s => {
      const d = pd(s.date);
      if (!d || isNaN(d)) return;
      const m = d.getMonth();
      if (!parMois[m]) parMois[m] = [];
      parMois[m].push(s);
    });
    return Object.keys(parMois).map(m => {
      const arr = parMois[m];
      return {
        mois: parseInt(m),
        date: arr[0].date,
        tauxActivite: Math.round(arr.reduce((a,x)=>a+x.tauxActivite,0)/arr.length),
        actifs: arr.reduce((a,x)=>a+x.actifs,0),
        total: arr.reduce((a,x)=>a+x.total,0),
        nb: arr.length,
      };
    }).sort((a,b)=>a.mois-b.mois);
  }

  const anneesAffichees = selectedAnnees.length > 0 ? [...selectedAnnees].sort() : (filterAnnee !== "Toutes" ? [parseInt(filterAnnee)] : annees);
  const statsParAnnee = anneesAffichees.map((annee, idx) => ({
    annee, color: ANNEE_COLORS[idx % ANNEE_COLORS.length],
    stats: statsParMois(filterPassagesByPeriode(passages, String(annee)).map(getStats)),
  }));

  const seuils = { vigilance: seuilsRongeurs.taux_vigilance, critique: seuilsRongeurs.taux_critique };

  // Echelle verticale : auto (ajustee aux donnees) | manuel | plein (0-100%)
  const valeursY = statsParAnnee.reduce((acc,sa)=>acc.concat(sa.stats.map(x=>x.tauxActivite)), []).concat(stats.map(x=>x.tauxActivite));
  const maxDonnees = Math.max(...valeursY, showSeuils ? seuils.critique : 0, 1);
  const maxAuto = Math.min(100, Math.max(5, Math.ceil(maxDonnees*1.25/5)*5));
  const maxY = echelle === "plein" ? 100 : echelle === "manuel" ? Math.max(1, parseInt(maxManuel)||100) : maxAuto;
  const graduations = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxY*f));

  const W = fullscreen ? 1100 : 700, H = fullscreen ? 420 : 260, PAD = 50;
  function xPos(i) { return PAD + (stats.length > 1 ? i/(stats.length-1)*(W-PAD*2) : (W-PAD*2)/2); }
  function yTaux(v) { return H - PAD - (Math.min(v, maxY)/maxY)*(H-PAD*2); }
  function xMois(m) { return PAD + (m/11)*(W-PAD*2); }
  const yVigilance = yTaux(seuils.vigilance);
  const yCritique = yTaux(seuils.critique);
  const inpStyle = { background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"6px 10px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };

  function exportThisChart() {
    const W2=W, H2=H, PAD2=PAD;
    const xM = m => PAD2 + (m/11)*(W2-PAD2*2);
    const yT = v => H2-PAD2-(Math.min(v,maxY)/maxY)*(H2-PAD2*2);
    const moisSvg = MOIS_LABELS.map(function(lbl,m){ return "<text x='"+xM(m)+"' y='"+(H2-8)+"' font-size='8' fill='#6b7280' text-anchor='middle'>"+lbl+"</text>"; }).join("");
    const yVig2 = yT(seuils.vigilance);
    const yCrit2 = yT(seuils.critique);
    const seuilsSvg = showSeuils ? "<line x1='"+PAD2+"' x2='"+(W2-PAD2)+"' y1='"+yVig2+"' y2='"+yVig2+"' stroke='orange' stroke-dasharray='5,3' stroke-width='1.5'/><text x='"+(W2-PAD2+4)+"' y='"+(yVig2+4)+"' font-size='9' fill='orange'>Vig.</text><line x1='"+PAD2+"' x2='"+(W2-PAD2)+"' y1='"+yCrit2+"' y2='"+yCrit2+"' stroke='red' stroke-dasharray='5,3' stroke-width='1.5'/><text x='"+(W2-PAD2+4)+"' y='"+(yCrit2+4)+"' font-size='9' fill='red'>Crit.</text>" : "";
    const seriesSvg = statsParAnnee.map(function(sa){
      if (sa.stats.length < 1) return "";
      const poly = sa.stats.map(function(x){ return xM(x.mois)+","+yT(x.tauxActivite); }).join(" ");
      const ligne = sa.stats.length>1 ? "<polyline points='"+poly+"' fill='none' stroke='"+sa.color+"' stroke-width='2'/>" : "";
      const pts = sa.stats.map(function(x){ return "<circle cx='"+xM(x.mois)+"' cy='"+yT(x.tauxActivite)+"' r='3.5' fill='"+sa.color+"'/><text x='"+xM(x.mois)+"' y='"+(yT(x.tauxActivite)-8)+"' font-size='8' fill='"+sa.color+"' text-anchor='middle'>"+x.tauxActivite+"%</text>"; }).join("");
      return ligne + pts;
    }).join("");
    const legendeSvg = statsParAnnee.map(function(sa,i){ return "<line x1='"+(PAD2+i*70)+"' x2='"+(PAD2+i*70+20)+"' y1='14' y2='14' stroke='"+sa.color+"' stroke-width='3'/><text x='"+(PAD2+i*70+25)+"' y='18' font-size='10' fill='"+sa.color+"'>"+sa.annee+"</text>"; }).join("");
    const svgTaux = "<svg width='"+W2+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+seuilsSvg+moisSvg+seriesSvg+legendeSvg+"</svg>";

    const typeLabel = typeFilter==="RE"?"Rongeurs exterieurs":typeFilter==="RI"?"Rongeurs interieurs":"Tous rongeurs";
    const rows = statsParAnnee.map(function(sa){
      return sa.stats.map(function(x){ return "<tr><td>"+MOIS_LABELS[x.mois]+" "+sa.annee+"</td><td style='font-weight:700'>"+x.tauxActivite+"%</td><td>"+x.actifs+"/"+x.total+"</td></tr>"; }).join("");
    }).join("");

    exportHTML("Taux activite rongeurs - "+CLIENT_CONFIG.nom,
      "<h1>Taux d'activité - "+typeLabel+"</h1>"+
      "<p style='color:#6b7280;margin-bottom:16px'>"+CLIENT_CONFIG.nom+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+
      svgTaux+
      "<table style='width:100%;border-collapse:collapse;margin-top:16px'><thead><tr><th>Mois</th><th>Taux</th><th>Postes actifs</th></tr></thead><tbody>"+rows+"</tbody></table>"
    );
  }

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Taux d'activité rongeurs (%)</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>

            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14,paddingBottom:14,borderBottom:"1px solid #243352"}}>
              <div>
                <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Type</label>
                <div style={{display:"flex",gap:4}}>
                  {[["tous","Tous"],["RE","Exterieurs"],["RI","Interieurs"]].map(([id,label])=>(
                    <button key={id} onClick={()=>setTypeFilter(id)}
                      style={{background:typeFilter===id?"#1d4ed8":"#243352",color:typeFilter===id?"#fff":"#94a3b8",border:"1px solid "+(typeFilter===id?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:typeFilter===id?700:500,cursor:"pointer",fontFamily:"inherit"}}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Annee(s)</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {annees.map(a=>{
                    const isSel = selectedAnnees.includes(a);
                    return (<button key={a} onClick={()=>setSelectedAnnees(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])}
                      style={{background:isSel?"#1d4ed8":"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>);
                  })}
                  {selectedAnnees.length>0&&<button onClick={()=>setSelectedAnnees([])} style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"6px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>}
                </div>
              </div>
              <div>
                <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Trimestre</label>
                <select value={filterTrimestre} onChange={e=>setFilterTrimestre(e.target.value)} style={inpStyle}>
                  <option value="Tous">Tous</option>
                  {[1,2,3,4].map(t=><option key={t} value={t}>T{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Mois</label>
                <select value={filterMois} onChange={e=>setFilterMois(e.target.value)} style={inpStyle}>
                  <option value="Tous">Tous</option>
                  {MOIS_LABELS.map((m,i)=><option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Echelle Y</label>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <select value={echelle} onChange={e=>setEchelle(e.target.value)} style={inpStyle}>
                    <option value="auto">Auto</option>
                    <option value="manuel">Manuel</option>
                    <option value="plein">0-100%</option>
                  </select>
                  {echelle==="manuel" && <input type="number" min="1" max="100" value={maxManuel} onChange={e=>setMaxManuel(e.target.value)} style={{...inpStyle,width:60}}/>}
                </div>
              </div>
              <button onClick={()=>setShowSeuils(v=>!v)}
                style={{background:showSeuils?"#243352":"transparent",color:showSeuils?"#f1f5f9":"#7a90aa",border:"1px solid "+(showSeuils?"#5a7090":"#3d5270"),borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                {showSeuils?"Masquer":"Afficher"} seuils
              </button>
              <button onClick={()=>{setTypeFilter("tous");setFilterAnnee("Toutes");setSelectedAnnees([]);setFilterTrimestre("Tous");setFilterMois("Tous");setShowSeuils(true);setEchelle("auto");}}
                style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                Reset
              </button>
            </div>

            <div style={{fontSize:11,color:"#7a90aa",marginBottom:12}}>{postesRongeurs.length} postes - Seuil vigilance {seuils.vigilance}% - Seuil critique {seuils.critique}%</div>

            {stats.length===0 && statsParAnnee.length===0 ? (
              <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucun passage pour cette periode.</div>
            ) : (
              <>
              <div style={{overflowX:"auto"}}>
                <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
                  {graduations.map(v=>(<g key={v}><line x1={PAD} x2={W-PAD} y1={yTaux(v)} y2={yTaux(v)} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={yTaux(v)+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}%</text></g>))}
                  {showSeuils && (<>
                    <line x1={PAD} x2={W-PAD} y1={yVigilance} y2={yVigilance} stroke="#f59e0b" strokeDasharray="5,3" strokeWidth="1.5"/>
                    <text x={W-PAD+4} y={yVigilance+4} fontSize="9" fill="#f59e0b">Vig.</text>
                    <line x1={PAD} x2={W-PAD} y1={yCritique} y2={yCritique} stroke="#ef4444" strokeDasharray="5,3" strokeWidth="1.5"/>
                    <text x={W-PAD+4} y={yCritique+4} fontSize="9" fill="#ef4444">Crit.</text>
                  </>)}
                  {MOIS_LABELS.map((lbl,m)=>(<text key={m} x={xMois(m)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle">{lbl}</text>))}
                  {statsParAnnee.length > 0 ? statsParAnnee.map((sa)=>{
                    if(sa.stats.length < 1) return null;
                    const poly = sa.stats.map(s=>xMois(s.mois)+","+yTaux(s.tauxActivite)).join(" ");
                    return (<g key={sa.annee}>
                      {sa.stats.length>1&&<polyline points={poly} fill="none" stroke={sa.color} strokeWidth="2.5" strokeLinejoin="round"/>}
                      {sa.stats.map((s,i)=>(<g key={i}><circle cx={xMois(s.mois)} cy={yTaux(s.tauxActivite)} r="4" fill={sa.color} stroke="#1a2540" strokeWidth="2"/><text x={xMois(s.mois)} y={yTaux(s.tauxActivite)-9} fontSize="8" fill={sa.color} textAnchor="middle">{s.tauxActivite}%</text></g>))}
                    </g>);
                  }) : (<g>
                    {stats.length>1&&<polyline points={stats.map((s,i)=>xPos(i)+","+yTaux(s.tauxActivite)).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round"/>}
                    {stats.map((s,i)=>(<g key={i}><circle cx={xPos(i)} cy={yTaux(s.tauxActivite)} r="5" fill={s.tauxActivite>=seuils.critique?"#ef4444":s.tauxActivite>=seuils.vigilance?"#f59e0b":"#22c55e"} stroke="#1a2540" strokeWidth="2"/><text x={xPos(i)} y={yTaux(s.tauxActivite)-10} fontSize="9" fill="#94a3b8" textAnchor="middle">{s.tauxActivite}%</text><text x={xPos(i)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle" transform={"rotate(-30 "+xPos(i)+" "+(H-8)+")"}>{(s.date||"").slice(0,5)}</text></g>))}
                  </g>)}
                </svg>
              </div>
              {statsParAnnee.length > 0 && (<div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>{statsParAnnee.map((sa,i)=>(<div key={sa.annee} style={{display:"flex",alignItems:"center",gap:5}}><svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={sa.color} strokeWidth="2.5"/></svg><span style={{fontSize:11,color:sa.color,fontWeight:700}}>{sa.annee}</span></div>))}</div>)}
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
                <button onClick={()=>setShowStatutGraph(v=>!v)} style={{background:showStatutGraph?"#243352":"transparent",color:showStatutGraph?"#f1f5f9":"#7a90aa",border:"1px solid "+(showStatutGraph?"#5a7090":"#3d5270"),borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{showStatutGraph?"Masquer":"Afficher"} Disparu/Inaccessible/Abime</button>
              </div>
              {showStatutGraph && <StatutGraph passagesFiltres={passagesFiltres} />}
              </>
            )}
          </Card>
        </div>
      </div>
    )}

    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Taux d'activité rongeurs (%)</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14,paddingBottom:14,borderBottom:"1px solid #243352"}}>
        <div>
          <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Type</label>
          <div style={{display:"flex",gap:4}}>
            {[["tous","Tous"],["RE","Exterieurs"],["RI","Interieurs"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTypeFilter(id)}
                style={{background:typeFilter===id?"#1d4ed8":"#243352",color:typeFilter===id?"#fff":"#94a3b8",border:"1px solid "+(typeFilter===id?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:typeFilter===id?700:500,cursor:"pointer",fontFamily:"inherit"}}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Annee(s)</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {annees.map(a=>{
              const isSel = selectedAnnees.includes(a);
              return (<button key={a} onClick={()=>setSelectedAnnees(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])}
                style={{background:isSel?"#1d4ed8":"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>);
            })}
            {selectedAnnees.length>0&&<button onClick={()=>setSelectedAnnees([])} style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"6px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>}
          </div>
        </div>
        <div>
          <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Trimestre</label>
          <select value={filterTrimestre} onChange={e=>setFilterTrimestre(e.target.value)} style={inpStyle}>
            <option value="Tous">Tous</option>
            {[1,2,3,4].map(t=><option key={t} value={t}>T{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Mois</label>
          <select value={filterMois} onChange={e=>setFilterMois(e.target.value)} style={inpStyle}>
            <option value="Tous">Tous</option>
            {MOIS_LABELS.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Echelle Y</label>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <select value={echelle} onChange={e=>setEchelle(e.target.value)} style={inpStyle}>
              <option value="auto">Auto</option>
              <option value="manuel">Manuel</option>
              <option value="plein">0-100%</option>
            </select>
            {echelle==="manuel" && <input type="number" min="1" max="100" value={maxManuel} onChange={e=>setMaxManuel(e.target.value)} style={{...inpStyle,width:60}}/>}
          </div>
        </div>
        <button onClick={()=>setShowSeuils(v=>!v)}
          style={{background:showSeuils?"#243352":"transparent",color:showSeuils?"#f1f5f9":"#7a90aa",border:"1px solid "+(showSeuils?"#5a7090":"#3d5270"),borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
          {showSeuils?"Masquer":"Afficher"} seuils
        </button>
        <button onClick={()=>{setTypeFilter("tous");setFilterAnnee("Toutes");setSelectedAnnees([]);setFilterTrimestre("Tous");setFilterMois("Tous");setShowSeuils(true);setEchelle("auto");}}
          style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
          Reset
        </button>
      </div>

      <div style={{fontSize:11,color:"#7a90aa",marginBottom:12}}>{postesRongeurs.length} postes - Seuil vigilance {seuils.vigilance}% - Seuil critique {seuils.critique}%</div>

      {stats.length===0 && statsParAnnee.length===0 ? (
        <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucun passage pour cette periode.</div>
      ) : (
        <>
        <div style={{overflowX:"auto"}}>
          <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
            {graduations.map(v=>(<g key={v}><line x1={PAD} x2={W-PAD} y1={yTaux(v)} y2={yTaux(v)} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={yTaux(v)+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}%</text></g>))}
            {showSeuils && (<>
              <line x1={PAD} x2={W-PAD} y1={yVigilance} y2={yVigilance} stroke="#f59e0b" strokeDasharray="5,3" strokeWidth="1.5"/>
              <text x={W-PAD+4} y={yVigilance+4} fontSize="9" fill="#f59e0b">Vig.</text>
              <line x1={PAD} x2={W-PAD} y1={yCritique} y2={yCritique} stroke="#ef4444" strokeDasharray="5,3" strokeWidth="1.5"/>
              <text x={W-PAD+4} y={yCritique+4} fontSize="9" fill="#ef4444">Crit.</text>
            </>)}
            {MOIS_LABELS.map((lbl,m)=>(<text key={m} x={xMois(m)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle">{lbl}</text>))}
            {statsParAnnee.length > 0 ? statsParAnnee.map((sa)=>{
              if(sa.stats.length < 1) return null;
              const poly = sa.stats.map(s=>xMois(s.mois)+","+yTaux(s.tauxActivite)).join(" ");
              return (<g key={sa.annee}>
                {sa.stats.length>1&&<polyline points={poly} fill="none" stroke={sa.color} strokeWidth="2.5" strokeLinejoin="round"/>}
                {sa.stats.map((s,i)=>(<g key={i}><circle cx={xMois(s.mois)} cy={yTaux(s.tauxActivite)} r="4" fill={sa.color} stroke="#1a2540" strokeWidth="2"/><text x={xMois(s.mois)} y={yTaux(s.tauxActivite)-9} fontSize="8" fill={sa.color} textAnchor="middle">{s.tauxActivite}%</text></g>))}
              </g>);
            }) : (<g>
              {stats.length>1&&<polyline points={stats.map((s,i)=>xPos(i)+","+yTaux(s.tauxActivite)).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round"/>}
              {stats.map((s,i)=>(<g key={i}><circle cx={xPos(i)} cy={yTaux(s.tauxActivite)} r="5" fill={s.tauxActivite>=seuils.critique?"#ef4444":s.tauxActivite>=seuils.vigilance?"#f59e0b":"#22c55e"} stroke="#1a2540" strokeWidth="2"/><text x={xPos(i)} y={yTaux(s.tauxActivite)-10} fontSize="9" fill="#94a3b8" textAnchor="middle">{s.tauxActivite}%</text><text x={xPos(i)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle" transform={"rotate(-30 "+xPos(i)+" "+(H-8)+")"}>{(s.date||"").slice(0,5)}</text></g>))}
            </g>)}
          </svg>
        </div>
        {statsParAnnee.length > 0 && (<div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>{statsParAnnee.map((sa,i)=>(<div key={sa.annee} style={{display:"flex",alignItems:"center",gap:5}}><svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={sa.color} strokeWidth="2.5"/></svg><span style={{fontSize:11,color:sa.color,fontWeight:700}}>{sa.annee}</span></div>))}</div>)}
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
          <button onClick={()=>setShowStatutGraph(v=>!v)} style={{background:showStatutGraph?"#243352":"transparent",color:showStatutGraph?"#f1f5f9":"#7a90aa",border:"1px solid "+(showStatutGraph?"#5a7090":"#3d5270"),borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{showStatutGraph?"Masquer":"Afficher"} Disparu/Inaccessible/Abime</button>
        </div>
        {showStatutGraph && <StatutGraph passagesFiltres={passagesFiltres} />}
        </>
      )}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Taux d'activité rongeurs (%) - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}

function CapturesChart({ passages, postes }) {
  const [typeFilter, setTypeFilter] = usePersistedValue("Captures_typeFilter", "tous"); // tous | RE | RI
  const [filterAnnee, setFilterAnnee] = usePersistedValue("Captures_filterAnnee", anneeDefaut(passages));
  const [selectedAnnees, setSelectedAnnees] = usePersistedValue("Captures_selectedAnnees", []);
  const [filterTrimestre, setFilterTrimestre] = usePersistedValue("Captures_filterTrimestre", "Tous");
  const [filterMois, setFilterMois] = usePersistedValue("Captures_filterMois", "Tous");
  const [fullscreen, setFullscreen] = useState(false);
  const [collapsed, setCollapsed] = usePersistedCollapsed("Captures", false);
  const [echelle, setEchelle] = usePersistedValue("Captures_echelle", "auto"); // auto | manuel | plein
  const [maxManuel, setMaxManuel] = usePersistedValue("Captures_maxManuel", 20);

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const MOIS_LABELS = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];

  const postesRongeurs = postes.filter(p => (p.nuisible||"Rongeurs") === "Rongeurs" && (typeFilter==="tous" || p.type===typeFilter));

  const annees = [...new Set(passages.filter(p=>p.type!=="Insectes volants").map(p=>{ const d=pd(p.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);

  function filterPassagesByPeriode(list, anneeOverride) {
    return list.filter(p => {
      if (p.type === "Insectes volants") return false;
      const d = pd(p.date);
      if (!d) return false;
      if (anneeOverride) {
        if (d.getFullYear() !== parseInt(anneeOverride)) return false;
      } else if (selectedAnnees.length > 0) {
        if (!selectedAnnees.includes(d.getFullYear())) return false;
      } else if (filterAnnee !== "Toutes") {
        if (d.getFullYear() !== parseInt(filterAnnee)) return false;
      }
      if (filterTrimestre !== "Tous") {
        const t = Math.ceil((d.getMonth()+1)/3);
        if (t !== parseInt(filterTrimestre)) return false;
      }
      if (filterMois !== "Tous" && d.getMonth() !== parseInt(filterMois)) return false;
      return true;
    }).sort((a,b) => pd(a.date)-pd(b.date));
  }

  function getStats(passage) {
    const saisies = typeof passage.saisies === "string" ? JSON.parse(passage.saisies||"{}") : (passage.saisies||{});
    let captures = 0;
    postesRongeurs.forEach(poste => {
      const s = saisies[poste.id];
      if (!s) return;
      const capR = (parseInt(s.cap_souris||0))+(parseInt(s.cap_ratBrun||0))+(parseInt(s.cap_ratNoir||0));
      captures += capR;
    });
    return { date: passage.date, captures };
  }

  const passagesFiltres = filterPassagesByPeriode(passages);
  const stats = passagesFiltres.map(getStats);

  const ANNEE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  // Regroupement par mois : plusieurs passages dans le meme mois sont cumules
  function statsParMois(list) {
    const parMois = {};
    list.forEach(s => {
      const d = pd(s.date);
      if (!d || isNaN(d)) return;
      const m = d.getMonth();
      if (!parMois[m]) parMois[m] = [];
      parMois[m].push(s);
    });
    return Object.keys(parMois).map(m => {
      const arr = parMois[m];
      return { mois: parseInt(m), date: arr[0].date, captures: arr.reduce((a,x)=>a+x.captures,0), nb: arr.length };
    }).sort((a,b)=>a.mois-b.mois);
  }

  const anneesAffichees = selectedAnnees.length > 0 ? [...selectedAnnees].sort() : (filterAnnee !== "Toutes" ? [parseInt(filterAnnee)] : annees);
  const statsParAnnee = anneesAffichees.map((annee, idx) => ({
    annee, color: ANNEE_COLORS[idx % ANNEE_COLORS.length],
    stats: statsParMois(filterPassagesByPeriode(passages, String(annee)).map(getStats)),
  }));

  const W = fullscreen ? 1100 : 700, H = fullscreen ? 420 : 260, PAD = 50;
  // Echelle verticale : auto (ajustee aux donnees) | manuel | plein
  const toutesValeurs = statsParAnnee.reduce((acc,sa)=>acc.concat(sa.stats.map(x=>x.captures)), []).concat(stats.map(x=>x.captures));
  const maxDonnees = Math.max(...toutesValeurs, 1);
  const maxAuto = Math.max(5, Math.ceil(maxDonnees*1.25/5)*5);
  const maxCaptures = echelle === "manuel" ? Math.max(1, parseInt(maxManuel)||10) : maxAuto;
  function xPos(i) { return PAD + (stats.length > 1 ? i/(stats.length-1)*(W-PAD*2) : (W-PAD*2)/2); }
  function xMois(m) { return PAD + (m/11)*(W-PAD*2); }
  function yCapt(v) { return H - PAD - (Math.min(v, maxCaptures)/maxCaptures)*(H-PAD*2); }
  const inpStyle = { background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"6px 10px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };

  function exportThisChart() {
    const W2=W, H2=H, PAD2=PAD;
    const maxCap2 = maxCaptures;
    const xM2 = m => PAD2 + (m/11)*(W2-PAD2*2);
    const yC2 = v => H2-PAD2-(Math.min(v,maxCap2)/maxCap2)*(H2-PAD2*2);
    const moisSvg = MOIS_LABELS.map(function(lbl,m){ return "<text x='"+xM2(m)+"' y='"+(H2-8)+"' font-size='8' fill='#6b7280' text-anchor='middle'>"+lbl+"</text>"; }).join("");
    const barsSvg = moisSvg + statsParAnnee.map(function(sa){
      if (sa.stats.length < 1) return "";
      const poly = sa.stats.map(function(x){ return xM2(x.mois)+","+yC2(x.captures); }).join(" ");
      const ligne = sa.stats.length>1 ? "<polyline points='"+poly+"' fill='none' stroke='"+sa.color+"' stroke-width='2'/>" : "";
      const circles = sa.stats.map(function(x){ const y=yC2(x.captures); return "<circle cx='"+xM2(x.mois)+"' cy='"+y+"' r='3.5' fill='"+sa.color+"'/><text x='"+xM2(x.mois)+"' y='"+(y-8)+"' font-size='8' fill='"+sa.color+"' text-anchor='middle'>"+x.captures+"</text>"; }).join("");
      return ligne + circles;
    }).join("") + statsParAnnee.map(function(sa,i){ return "<line x1='"+(PAD2+i*70)+"' x2='"+(PAD2+i*70+20)+"' y1='14' y2='14' stroke='"+sa.color+"' stroke-width='3'/><text x='"+(PAD2+i*70+25)+"' y='18' font-size='10' fill='"+sa.color+"'>"+sa.annee+"</text>"; }).join("");
    const svgCap = "<svg width='"+W2+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+barsSvg+"</svg>";

    const typeLabel = typeFilter==="RE"?"Rongeurs exterieurs":typeFilter==="RI"?"Rongeurs interieurs":"Tous rongeurs";
    const rows = stats.map(s=>"<tr><td>"+s.date+"</td><td style='font-weight:700'>"+s.captures+"</td></tr>").join("");

    exportHTML("Captures rongeurs - "+CLIENT_CONFIG.nom,
      "<h1>Captures rongeurs - "+typeLabel+"</h1>"+
      "<p style='color:#6b7280;margin-bottom:16px'>"+CLIENT_CONFIG.nom+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+
      svgCap+
      "<table style='width:100%;border-collapse:collapse;margin-top:16px'><thead><tr><th>Date</th><th>Captures</th></tr></thead><tbody>"+rows+"</tbody></table>"
    );
  }

  const filtersJsx = (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14,paddingBottom:14,borderBottom:"1px solid #243352"}}>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Type</label>
        <div style={{display:"flex",gap:4}}>
          {[["tous","Tous"],["RE","Exterieurs"],["RI","Interieurs"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTypeFilter(id)}
              style={{background:typeFilter===id?"#1d4ed8":"#243352",color:typeFilter===id?"#fff":"#94a3b8",border:"1px solid "+(typeFilter===id?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:typeFilter===id?700:500,cursor:"pointer",fontFamily:"inherit"}}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Annee(s)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {annees.map(a=>{
            const isSel = selectedAnnees.includes(a);
            return (<button key={a} onClick={()=>setSelectedAnnees(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])}
              style={{background:isSel?"#1d4ed8":"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>);
          })}
          {selectedAnnees.length>0&&<button onClick={()=>setSelectedAnnees([])} style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"6px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Trimestre</label>
        <select value={filterTrimestre} onChange={e=>setFilterTrimestre(e.target.value)} style={inpStyle}>
          <option value="Tous">Tous</option>
          {[1,2,3,4].map(t=><option key={t} value={t}>T{t}</option>)}
        </select>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Mois</label>
        <select value={filterMois} onChange={e=>setFilterMois(e.target.value)} style={inpStyle}>
          <option value="Tous">Tous</option>
          {MOIS_LABELS.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Echelle Y</label>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <select value={echelle} onChange={e=>setEchelle(e.target.value)} style={inpStyle}>
            <option value="auto">Auto</option>
            <option value="manuel">Manuel</option>
          </select>
          {echelle==="manuel" && <input type="number" min="1" value={maxManuel} onChange={e=>setMaxManuel(e.target.value)} style={{...inpStyle,width:60}}/>}
        </div>
      </div>
      <button onClick={()=>{setTypeFilter("tous");setFilterAnnee("Toutes");setSelectedAnnees([]);setFilterTrimestre("Tous");setFilterMois("Tous");setEchelle("auto");}}
        style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
        Reset
      </button>
    </div>
  );

  const bodyJsx = stats.length===0 && statsParAnnee.length===0 ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucun passage pour cette periode.</div>
  ) : (
    <>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {[0,25,50,75,100].map(pct=>{ const v=Math.round(maxCaptures*pct/100); const y=yCapt(v); return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>); })}
        {MOIS_LABELS.map((lbl,mi)=>(<text key={mi} x={xMois(mi)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle">{lbl}</text>))}
        {statsParAnnee.map((sa)=>{ if(sa.stats.length<1) return null; const poly=sa.stats.map(x=>xMois(x.mois)+","+yCapt(x.captures)).join(" "); return(<g key={sa.annee}>{sa.stats.length>1&&<polyline points={poly} fill="none" stroke={sa.color} strokeWidth="2" strokeLinejoin="round"/>}{sa.stats.map((x,i)=>(<g key={i}><circle cx={xMois(x.mois)} cy={yCapt(x.captures)} r="4" fill={sa.color} stroke="#1a2540" strokeWidth="1.5"/>{x.captures>0&&<text x={xMois(x.mois)} y={yCapt(x.captures)-8} fontSize="8" fill={sa.color} textAnchor="middle">{x.captures}</text>}</g>))}</g>); })}
      </svg>
    </div>
    {statsParAnnee.length > 0 && (<div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>{statsParAnnee.map((sa,i)=>(<div key={sa.annee} style={{display:"flex",alignItems:"center",gap:5}}><svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={sa.color} strokeWidth="2.5"/></svg><span style={{fontSize:11,color:sa.color,fontWeight:700}}>{sa.annee}</span></div>))}</div>)}
    </>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Captures rongeurs</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {filtersJsx}
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}

    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Captures rongeurs</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {filtersJsx}
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Captures rongeurs - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}


function PostesTouchesChart({ passages, postes }) {
  const [typeFilter, setTypeFilter] = usePersistedValue("PostesTouches_typeFilter", "tous"); // tous | RE | RI
  const [filterAnnee, setFilterAnnee] = usePersistedValue("PostesTouches_filterAnnee", anneeDefaut(passages));
  const [selectedAnnees, setSelectedAnnees] = usePersistedValue("PostesTouches_selectedAnnees", []);
  const [filterTrimestre, setFilterTrimestre] = usePersistedValue("PostesTouches_filterTrimestre", "Tous");
  const [filterMois, setFilterMois] = usePersistedValue("PostesTouches_filterMois", "Tous");
  const [fullscreen, setFullscreen] = useState(false);
  const [collapsed, setCollapsed] = usePersistedCollapsed("PostesTouches", false);
  const [showTotal, setShowTotal] = usePersistedBool("PostesTouches_showTotal", true);
  const [echelle, setEchelle] = usePersistedValue("PostesTouches_echelle", "auto"); // auto | manuel | plein
  const [maxManuel, setMaxManuel] = usePersistedValue("PostesTouches_maxManuel", 20);

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const MOIS_LABELS = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];

  const postesRongeurs = postes.filter(p => (p.nuisible||"Rongeurs") === "Rongeurs" && (typeFilter==="tous" || p.type===typeFilter));
  const totalPostes = postesRongeurs.length;

  const annees = [...new Set(passages.filter(p=>p.type!=="Insectes volants").map(p=>{ const d=pd(p.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);

  function filterPassagesByPeriode(list, anneeOverride) {
    return list.filter(p => {
      if (p.type === "Insectes volants") return false;
      const d = pd(p.date);
      if (!d) return false;
      if (anneeOverride) {
        if (d.getFullYear() !== parseInt(anneeOverride)) return false;
      } else if (selectedAnnees.length > 0) {
        if (!selectedAnnees.includes(d.getFullYear())) return false;
      } else if (filterAnnee !== "Toutes") {
        if (d.getFullYear() !== parseInt(filterAnnee)) return false;
      }
      if (filterTrimestre !== "Tous") {
        const t = Math.ceil((d.getMonth()+1)/3);
        if (t !== parseInt(filterTrimestre)) return false;
      }
      if (filterMois !== "Tous" && d.getMonth() !== parseInt(filterMois)) return false;
      return true;
    }).sort((a,b) => pd(a.date)-pd(b.date));
  }

  function getStats(passage) {
    const saisies = typeof passage.saisies === "string" ? JSON.parse(passage.saisies||"{}") : (passage.saisies||{});
    let touches = 0;
    postesRongeurs.forEach(poste => {
      const s = saisies[poste.id];
      if (!s) return;
      const etat = s.etat||"";
      const capR = (parseInt(s.cap_souris||0))+(parseInt(s.cap_ratBrun||0))+(parseInt(s.cap_ratNoir||0));
      const isTouche = estConsoQuelconque(etat)||capR>0;
      if (isTouche) touches++;
    });
    return { date: passage.date, touches };
  }

  const passagesFiltres = filterPassagesByPeriode(passages);
  const stats = passagesFiltres.map(getStats);

  const ANNEE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  // Regroupement par mois : plusieurs passages dans le meme mois sont moyennes
  function statsParMois(list) {
    const parMois = {};
    list.forEach(s => {
      const d = pd(s.date);
      if (!d || isNaN(d)) return;
      const m = d.getMonth();
      if (!parMois[m]) parMois[m] = [];
      parMois[m].push(s);
    });
    return Object.keys(parMois).map(m => {
      const arr = parMois[m];
      return { mois: parseInt(m), date: arr[0].date, touches: Math.round(arr.reduce((a,x)=>a+x.touches,0)/arr.length), nb: arr.length };
    }).sort((a,b)=>a.mois-b.mois);
  }

  const anneesAffichees = selectedAnnees.length > 0 ? [...selectedAnnees].sort() : (filterAnnee !== "Toutes" ? [parseInt(filterAnnee)] : annees);
  const statsParAnnee = anneesAffichees.map((annee, idx) => ({
    annee, color: ANNEE_COLORS[idx % ANNEE_COLORS.length],
    stats: statsParMois(filterPassagesByPeriode(passages, String(annee)).map(getStats)),
  }));

  const W = fullscreen ? 1100 : 700, H = fullscreen ? 420 : 260, PAD = 50;
  // Echelle verticale : auto (ajustee aux donnees) | manuel | plein (parc complet)
  const toutesValeurs = statsParAnnee.reduce((acc,sa)=>acc.concat(sa.stats.map(x=>x.touches)), []).concat(stats.map(x=>x.touches));
  const maxDonnees = Math.max(...toutesValeurs, showTotal ? 0 : 0, 1);
  const maxAuto = Math.min(totalPostes||100, Math.max(5, Math.ceil(maxDonnees*1.25/5)*5));
  const maxVal = echelle === "plein" ? Math.max(totalPostes,1) : echelle === "manuel" ? Math.max(1, parseInt(maxManuel)||10) : maxAuto;

  function xPos(i) { return PAD + (stats.length > 1 ? i/(stats.length-1)*(W-PAD*2) : (W-PAD*2)/2); }
  function xMois(m) { return PAD + (m/11)*(W-PAD*2); }
  function yVal(v) { return H - PAD - (Math.min(v, maxVal)/maxVal)*(H-PAD*2); }
  const yTotal = yVal(totalPostes);
  const inpStyle = { background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"6px 10px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };

  function exportThisChart() {
    const W2=W, H2=H, PAD2=PAD;
    const maxVal2 = maxVal;
    function yVal2(v) { return H2-PAD2-(v/maxVal2)*(H2-PAD2*2); }
    const yTotal2 = yVal2(totalPostes);
    const totalLineSvg = (showTotal && totalPostes <= maxVal2) ? "<line x1='"+PAD2+"' x2='"+(W2-PAD2)+"' y1='"+yTotal2+"' y2='"+yTotal2+"' stroke='#ef4444' stroke-dasharray='5,3' stroke-width='1.5'/><text x='"+(W2-PAD2+4)+"' y='"+(yTotal2+4)+"' font-size='9' fill='#ef4444'>Total ("+totalPostes+")</text>" : "";
    const xM2 = m => PAD2 + (m/11)*(W2-PAD2*2);
    const moisSvg = MOIS_LABELS.map(function(lbl,m){ return "<text x='"+xM2(m)+"' y='"+(H2-8)+"' font-size='8' fill='#6b7280' text-anchor='middle'>"+lbl+"</text>"; }).join("");
    const barsSvg = moisSvg + statsParAnnee.map(function(sa){
      if (sa.stats.length < 1) return "";
      const poly = sa.stats.map(function(x){ return xM2(x.mois)+","+yVal2(x.touches); }).join(" ");
      const ligne = sa.stats.length>1 ? "<polyline points='"+poly+"' fill='none' stroke='"+sa.color+"' stroke-width='2'/>" : "";
      const circles = sa.stats.map(function(x){ const y=yVal2(x.touches); return "<circle cx='"+xM2(x.mois)+"' cy='"+y+"' r='3.5' fill='"+sa.color+"'/><text x='"+xM2(x.mois)+"' y='"+(y-8)+"' font-size='8' fill='"+sa.color+"' text-anchor='middle'>"+x.touches+"</text>"; }).join("");
      return ligne + circles;
    }).join("") + statsParAnnee.map(function(sa,i){ return "<line x1='"+(PAD2+i*70)+"' x2='"+(PAD2+i*70+20)+"' y1='14' y2='14' stroke='"+sa.color+"' stroke-width='3'/><text x='"+(PAD2+i*70+25)+"' y='18' font-size='10' fill='"+sa.color+"'>"+sa.annee+"</text>"; }).join("");
    const svgChart = "<svg width='"+W2+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+totalLineSvg+barsSvg+"</svg>";

    const typeLabel = typeFilter==="RE"?"Rongeurs exterieurs":typeFilter==="RI"?"Rongeurs interieurs":"Tous rongeurs";
    const rows = stats.map(s=>"<tr><td>"+s.date+"</td><td style='font-weight:700'>"+s.touches+" / "+totalPostes+"</td></tr>").join("");

    exportHTML("Postes rongeurs touchés - "+CLIENT_CONFIG.nom,
      "<h1>Postes rongeurs touchés - "+typeLabel+"</h1>"+
      "<p style='color:#6b7280;margin-bottom:16px'>"+CLIENT_CONFIG.nom+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+
      svgChart+
      "<table style='width:100%;border-collapse:collapse;margin-top:16px'><thead><tr><th>Date</th><th>Postes rongeurs touchés</th></tr></thead><tbody>"+rows+"</tbody></table>"
    );
  }

  const filtersJsx = (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14,paddingBottom:14,borderBottom:"1px solid #243352"}}>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Type</label>
        <div style={{display:"flex",gap:4}}>
          {[["tous","Tous"],["RE","Exterieurs"],["RI","Interieurs"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTypeFilter(id)}
              style={{background:typeFilter===id?"#1d4ed8":"#243352",color:typeFilter===id?"#fff":"#94a3b8",border:"1px solid "+(typeFilter===id?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:typeFilter===id?700:500,cursor:"pointer",fontFamily:"inherit"}}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Annee(s)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {annees.map(a=>{
            const isSel = selectedAnnees.includes(a);
            return (<button key={a} onClick={()=>setSelectedAnnees(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])}
              style={{background:isSel?"#1d4ed8":"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>);
          })}
          {selectedAnnees.length>0&&<button onClick={()=>setSelectedAnnees([])} style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"6px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Trimestre</label>
        <select value={filterTrimestre} onChange={e=>setFilterTrimestre(e.target.value)} style={inpStyle}>
          <option value="Tous">Tous</option>
          {[1,2,3,4].map(t=><option key={t} value={t}>T{t}</option>)}
        </select>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Mois</label>
        <select value={filterMois} onChange={e=>setFilterMois(e.target.value)} style={inpStyle}>
          <option value="Tous">Tous</option>
          {MOIS_LABELS.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Echelle Y</label>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <select value={echelle} onChange={e=>setEchelle(e.target.value)} style={inpStyle}>
            <option value="auto">Auto</option>
            <option value="manuel">Manuel</option>
            <option value="plein">Parc complet</option>
          </select>
          {echelle==="manuel" && <input type="number" min="1" value={maxManuel} onChange={e=>setMaxManuel(e.target.value)} style={{...inpStyle,width:60}}/>}
        </div>
      </div>
      <button onClick={()=>setShowTotal(v=>!v)}
        style={{background:showTotal?"#243352":"transparent",color:showTotal?"#f1f5f9":"#7a90aa",border:"1px solid "+(showTotal?"#5a7090":"#3d5270"),borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
        {showTotal?"Masquer":"Afficher"} ligne totale
      </button>
      <button onClick={()=>{setTypeFilter("tous");setFilterAnnee("Toutes");setSelectedAnnees([]);setFilterTrimestre("Tous");setFilterMois("Tous");setShowTotal(true);setEchelle("auto");}}
        style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
        Reset
      </button>
    </div>
  );

  const bodyJsx = stats.length===0 && statsParAnnee.length===0 ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucun passage pour cette periode.</div>
  ) : (
    <>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {[0,25,50,75,100].map(pct=>{ const v=Math.round(maxVal*pct/100); const y=yVal(v); return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>); })}
        {showTotal && totalPostes <= maxVal && (<>
        <line x1={PAD} x2={W-PAD} y1={yTotal} y2={yTotal} stroke="#ef4444" strokeDasharray="5,3" strokeWidth="1.5"/>
        <text x={W-PAD+4} y={yTotal+4} fontSize="9" fill="#ef4444">Total ({totalPostes})</text>
        </>)}
        {MOIS_LABELS.map((lbl,mi)=>(<text key={mi} x={xMois(mi)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle">{lbl}</text>))}
        {statsParAnnee.map((sa)=>{
          if(sa.stats.length < 1) return null;
          const poly = sa.stats.map(x=>xMois(x.mois)+","+yVal(x.touches)).join(" ");
          return (<g key={sa.annee}>
            {sa.stats.length>1&&<polyline points={poly} fill="none" stroke={sa.color} strokeWidth="2" strokeLinejoin="round"/>}
            {sa.stats.map((x,i)=>(<g key={i}><circle cx={xMois(x.mois)} cy={yVal(x.touches)} r="4" fill={sa.color} stroke="#1a2540" strokeWidth="1.5"/>{x.touches>0&&<text x={xMois(x.mois)} y={yVal(x.touches)-8} fontSize="8" fill={sa.color} textAnchor="middle">{x.touches}</text>}</g>))}
          </g>);
        })}
      </svg>
    </div>
    {statsParAnnee.length > 0 && (<div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>{statsParAnnee.map((sa,i)=>(<div key={sa.annee} style={{display:"flex",alignItems:"center",gap:5}}><svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={sa.color} strokeWidth="2.5"/></svg><span style={{fontSize:11,color:sa.color,fontWeight:700}}>{sa.annee}</span></div>))}</div>)}
    </>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Postes rongeurs touchés</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {filtersJsx}
            <div style={{fontSize:11,color:"#7a90aa",marginBottom:12}}>{totalPostes} postes rongeurs au total</div>
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}

    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Postes rongeurs touchés</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {filtersJsx}
      <div style={{fontSize:11,color:"#7a90aa",marginBottom:12}}>{totalPostes} postes rongeurs au total</div>
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Postes rongeurs touchés - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}


function DeivEvolutionStandaloneChart({ passages }) {
  const CATS = ["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"];
  const CAT_COLORS = {"Moucherons":"#f59e0b","Mouches":"#ef4444","Moustiques":"#3b82f6","Hyménoptères":"#22c55e","Lépidoptères":"#8b5cf6","Coléoptères":"#06b6d4","Punaises":"#f97316","Tipules":"#7a90aa"};
  const DEFAULT_SEUILS = {
    Moucherons:   { leger:350, moyen:500 },
    Mouches:      { leger:150, moyen:250 },
    Moustiques:   { leger:60,  moyen:100 },
    Hyménoptères: { leger:50,  moyen:100 },
    Lépidoptères: { leger:45,  moyen:100 },
    Coléoptères:  { leger:15,  moyen:30  },
    Punaises:     { leger:5,   moyen:10  },
    Tipules:      { leger:10,  moyen:20  },
  };

  const [selectedCats, setSelectedCats] = usePersistedValue("DeivEvolution_selectedCats", []); // [] = Total toutes especes
  const [filterAnnee, setFilterAnnee] = usePersistedValue("DeivEvolution_filterAnnee", anneeDefaut(passages.filter(p=>p.type==="Insectes volants")));
  const [selectedAnnees, setSelectedAnnees] = usePersistedValue("DeivEvolution_selectedAnnees", []);
  const [filterTrimestre, setFilterTrimestre] = usePersistedValue("DeivEvolution_filterTrimestre", "Tous");
  const [filterMois, setFilterMois] = usePersistedValue("DeivEvolution_filterMois", "Tous");
  const [showSeuils, setShowSeuils] = usePersistedBool("DeivEvolution_showSeuils", true);
  const [fullscreen, setFullscreen] = useState(false);
  const [collapsed, setCollapsed] = usePersistedCollapsed("DeivEvolution", false);
  const [seuilsIV, setSeuilsIV] = useState(DEFAULT_SEUILS);
  const [echelle, setEchelle] = usePersistedValue("DeivEvolution_echelle", "auto"); // auto | manuel
  const [maxManuel, setMaxManuel] = usePersistedValue("DeivEvolution_maxManuel", 20);

  useEffect(() => {
    sbGet("seuils").then(data => {
      if (data && data.length > 0 && data[0].data) {
        try {
          const parsed = typeof data[0].data === "string" ? JSON.parse(data[0].data) : data[0].data;
          if (parsed.iv) setSeuilsIV({...DEFAULT_SEUILS, ...parsed.iv});
        } catch(_e) { return; }
      }
    }).catch(()=>{});
  }, []);

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const MOIS_LABELS = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];

  // Ne garder QUE les passages DEIV
  const passagesDeiv = passages.filter(p => p.type === "Insectes volants");

  const annees = [...new Set(passagesDeiv.map(p=>{ const d=pd(p.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);

  function filterPassagesByPeriode(list, anneeOverride) {
    return list.filter(p => {
      const d = pd(p.date);
      if (!d) return false;
      if (anneeOverride) {
        if (d.getFullYear() !== parseInt(anneeOverride)) return false;
      } else if (selectedAnnees.length > 0) {
        if (!selectedAnnees.includes(d.getFullYear())) return false;
      } else if (filterAnnee !== "Toutes") {
        if (d.getFullYear() !== parseInt(filterAnnee)) return false;
      }
      if (filterTrimestre !== "Tous") {
        const t = Math.ceil((d.getMonth()+1)/3);
        if (t !== parseInt(filterTrimestre)) return false;
      }
      if (filterMois !== "Tous" && d.getMonth() !== parseInt(filterMois)) return false;
      return true;
    }).sort((a,b) => pd(a.date)-pd(b.date));
  }

  const catsActives = selectedCats.length > 0 ? selectedCats : ["__TOTAL__"];

  function getStats(passage) {
    const saisies = typeof passage.saisies === "string" ? JSON.parse(passage.saisies||"{}") : (passage.saisies||{});
    const result = { date: passage.date };
    if (selectedCats.length === 0) {
      let total = 0;
      Object.values(saisies).forEach(s=>{ CATS.forEach(cat=>{ total += parseInt(s["iv_"+cat]||0); }); });
      result.__TOTAL__ = total;
    } else {
      selectedCats.forEach(cat=>{
        let val = 0;
        Object.values(saisies).forEach(s=>{ val += parseInt(s["iv_"+cat]||0); });
        result[cat] = val;
      });
    }
    return result;
  }

  const passagesFiltres = filterPassagesByPeriode(passagesDeiv);
  const stats = passagesFiltres.map(getStats);

  const ANNEE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];

  // Valeur tracee : somme des especes selectionnees (ou total toutes especes)
  function valeurDe(s) { return catsActives.reduce((acc,c)=>acc+(s[c]||0), 0); }

  // Regroupement par mois : plusieurs passages dans le meme mois sont cumules
  function statsParMois(list) {
    const parMois = {};
    list.forEach(s => {
      const d = pd(s.date);
      if (!d || isNaN(d)) return;
      const m = d.getMonth();
      if (!parMois[m]) parMois[m] = [];
      parMois[m].push(s);
    });
    return Object.keys(parMois).map(m => {
      const arr = parMois[m];
      return { mois: parseInt(m), date: arr[0].date, valeur: arr.reduce((a,x)=>a+valeurDe(x),0), nb: arr.length };
    }).sort((a,b)=>a.mois-b.mois);
  }

  const anneesAffichees = selectedAnnees.length > 0 ? [...selectedAnnees].sort() : (filterAnnee !== "Toutes" ? [parseInt(filterAnnee)] : annees);
  const statsParAnnee = anneesAffichees.map((annee, idx) => ({
    annee, color: ANNEE_COLORS[idx % ANNEE_COLORS.length],
    stats: statsParMois(filterPassagesByPeriode(passagesDeiv, String(annee)).map(getStats)),
  }));

  const W = fullscreen ? 1100 : 700, H = fullscreen ? 420 : 260, PAD = 50;
  // Echelle verticale : auto (ajustee aux donnees) | manuel
  const toutesValeurs = statsParAnnee.reduce((acc,sa)=>acc.concat(sa.stats.map(x=>x.valeur)), []);
  const seuilRef = (showSeuils && selectedCats.length === 1 && seuilsIV[selectedCats[0]]) ? seuilsIV[selectedCats[0]].moyen : 0;
  const maxDonnees = Math.max(...toutesValeurs, seuilRef, 1);
  const maxAuto = Math.max(5, Math.ceil(maxDonnees*1.25/5)*5);
  const maxVal = echelle === "manuel" ? Math.max(1, parseInt(maxManuel)||10) : maxAuto;
  function xPos(i) { return PAD + (stats.length > 1 ? i/(stats.length-1)*(W-PAD*2) : (W-PAD*2)/2); }
  function xMois(m) { return PAD + (m/11)*(W-PAD*2); }
  function yVal(v) { return H - PAD - (Math.min(v, maxVal)/maxVal)*(H-PAD*2); }
  const inpStyle = { background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"6px 10px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };
  const showSeuilsLine = showSeuils && selectedCats.length === 1;
  const activeSeuil = showSeuilsLine ? seuilsIV[selectedCats[0]] : null;

  function exportThisChart() {
    const W2=W, H2=H, PAD2=PAD;
    const maxVal2 = maxVal;
    function yVal2(v) { return H2-PAD2-(Math.min(v,maxVal2)/maxVal2)*(H2-PAD2*2); }
    const xM2 = m => PAD2 + (m/11)*(W2-PAD2*2);
    let seuilsSvg = "";
    if (showSeuilsLine && activeSeuil) {
      const yLeger = yVal2(activeSeuil.leger), yMoyen = yVal2(activeSeuil.moyen);
      seuilsSvg = "<line x1='"+PAD2+"' x2='"+(W2-PAD2)+"' y1='"+yLeger+"' y2='"+yLeger+"' stroke='orange' stroke-dasharray='5,3' stroke-width='1.5'/><text x='"+(W2-PAD2+4)+"' y='"+(yLeger+4)+"' font-size='9' fill='orange'>Vig.</text><line x1='"+PAD2+"' x2='"+(W2-PAD2)+"' y1='"+yMoyen+"' y2='"+yMoyen+"' stroke='red' stroke-dasharray='5,3' stroke-width='1.5'/><text x='"+(W2-PAD2+4)+"' y='"+(yMoyen+4)+"' font-size='9' fill='red'>Crit.</text>";
    }
    const linesSvg = statsParAnnee.map(function(sa){
      if (!sa.stats.length) return "";
      const pts = sa.stats.map(function(x){ return xM2(x.mois)+","+yVal2(x.valeur); }).join(" ");
      const ligne = sa.stats.length>1 ? "<polyline points='"+pts+"' fill='none' stroke='"+sa.color+"' stroke-width='2'/>" : "";
      const circles = sa.stats.map(function(x){ const y=yVal2(x.valeur); return "<circle cx='"+xM2(x.mois)+"' cy='"+y+"' r='3.5' fill='"+sa.color+"'/><text x='"+xM2(x.mois)+"' y='"+(y-8)+"' font-size='8' fill='"+sa.color+"' text-anchor='middle'>"+x.valeur+"</text>"; }).join("");
      return ligne + circles;
    }).join("") + statsParAnnee.map(function(sa,i){ return "<line x1='"+(PAD2+i*70)+"' x2='"+(PAD2+i*70+20)+"' y1='14' y2='14' stroke='"+sa.color+"' stroke-width='3'/><text x='"+(PAD2+i*70+25)+"' y='18' font-size='10' fill='"+sa.color+"'>"+sa.annee+"</text>"; }).join("");
    const datesSvg = MOIS_LABELS.map(function(lbl,m){ return "<text x='"+xM2(m)+"' y='"+(H2-8)+"' font-size='8' fill='#6b7280' text-anchor='middle'>"+lbl+"</text>"; }).join("");
    const svgChart = "<svg width='"+W2+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+seuilsSvg+linesSvg+datesSvg+"</svg>";

    const labelStr = selectedCats.length===0 ? "Total toutes especes" : selectedCats.join(", ");
    const rows = statsParAnnee.map(function(sa){ return sa.stats.map(function(x){ return "<tr><td>"+MOIS_LABELS[x.mois]+" "+sa.annee+"</td><td style='font-weight:700'>"+x.valeur+"</td></tr>"; }).join(""); }).join("");
    const headerCols = "<th>Valeur</th>";

    exportHTML("Évolution insectes volants DEIV - "+CLIENT_CONFIG.nom,
      "<h1>Évolution insectes volants DEIV - "+labelStr+"</h1>"+
      "<p style='color:#6b7280;margin-bottom:16px'>"+CLIENT_CONFIG.nom+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+
      svgChart+
      "<table style='width:100%;border-collapse:collapse;margin-top:16px'><thead><tr><th>Mois</th>"+headerCols+"</tr></thead><tbody>"+rows+"</tbody></table>"
    );
  }

  const filtersJsx = (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14,paddingBottom:14,borderBottom:"1px solid #243352"}}>
      <div style={{flexBasis:"100%"}}>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Espece(s)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          <button onClick={()=>setSelectedCats([])}
            style={{background:selectedCats.length===0?"#1d4ed8":"#243352",color:selectedCats.length===0?"#fff":"#94a3b8",border:"1px solid "+(selectedCats.length===0?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:selectedCats.length===0?700:500,cursor:"pointer",fontFamily:"inherit"}}>
            Total toutes especes
          </button>
          {CATS.map(cat=>{
            const isSel = selectedCats.includes(cat);
            return (
              <button key={cat} onClick={()=>setSelectedCats(prev=>isSel?prev.filter(x=>x!==cat):[...prev,cat])}
                style={{display:"flex",alignItems:"center",gap:5,background:isSel?"#243352":"transparent",color:isSel?"#f1f5f9":"#7a90aa",border:"1px solid "+(isSel?CAT_COLORS[cat]:"#3d5270"),borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[cat],display:"inline-block"}}/>
                {cat}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Annee(s)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {annees.map(a=>{
            const isSel = selectedAnnees.includes(a);
            return (<button key={a} onClick={()=>setSelectedAnnees(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])}
              style={{background:isSel?"#1d4ed8":"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>);
          })}
          {selectedAnnees.length>0&&<button onClick={()=>setSelectedAnnees([])} style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"6px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Trimestre</label>
        <select value={filterTrimestre} onChange={e=>setFilterTrimestre(e.target.value)} style={inpStyle}>
          <option value="Tous">Tous</option>
          {[1,2,3,4].map(t=><option key={t} value={t}>T{t}</option>)}
        </select>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Mois</label>
        <select value={filterMois} onChange={e=>setFilterMois(e.target.value)} style={inpStyle}>
          <option value="Tous">Tous</option>
          {MOIS_LABELS.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Echelle Y</label>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <select value={echelle} onChange={e=>setEchelle(e.target.value)} style={inpStyle}>
            <option value="auto">Auto</option>
            <option value="manuel">Manuel</option>
          </select>
          {echelle==="manuel" && <input type="number" min="1" value={maxManuel} onChange={e=>setMaxManuel(e.target.value)} style={{...inpStyle,width:70}}/>}
        </div>
      </div>
      <button onClick={()=>{setSelectedCats([]);setFilterAnnee("Toutes");setSelectedAnnees([]);setFilterTrimestre("Tous");setFilterMois("Tous");setEchelle("auto");}}
        style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
        Reset
      </button>
    </div>
  );

  const bodyJsx = stats.length===0 ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucun passage DEIV pour cette periode.</div>
  ) : (
    <>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {[0,25,50,75,100].map(pct=>{ const v=Math.round(maxVal*pct/100); const y=yVal(v); return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>); })}
        {MOIS_LABELS.map((lbl,mi)=>(<text key={mi} x={xMois(mi)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle">{lbl}</text>))}
        {statsParAnnee.map((sa)=>{
          if (!sa.stats.length) return null;
          const pts = sa.stats.map(x=>xMois(x.mois)+","+yVal(x.valeur)).join(" ");
          return (
            <g key={sa.annee}>
              {sa.stats.length>1&&<polyline points={pts} fill="none" stroke={sa.color} strokeWidth="2" strokeLinejoin="round"/>}
              {sa.stats.map((x,i)=>(
                <g key={i}>
                  <circle cx={xMois(x.mois)} cy={yVal(x.valeur)} r="4" fill={sa.color} stroke="#1a2540" strokeWidth="1.5"/>
                  {x.valeur>0 && <text x={xMois(x.mois)} y={yVal(x.valeur)-9} fontSize="8" fill={sa.color} textAnchor="middle">{x.valeur}</text>}
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
    {statsParAnnee.length > 0 && (
      <div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>
        {statsParAnnee.map(sa=>(
          <div key={sa.annee} style={{display:"flex",alignItems:"center",gap:5}}>
            <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={sa.color} strokeWidth="2.5"/></svg>
            <span style={{fontSize:11,color:sa.color,fontWeight:700}}>{sa.annee}</span>
          </div>
        ))}
      </div>
    )}
    </>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Évolution insectes volants DEIV</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {filtersJsx}
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}

    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Évolution insectes volants DEIV</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {filtersJsx}
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Évolution insectes volants DEIV - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}


function DeivParAppareilChart({ passages, postes }) {
  const [selectedDeiv, setSelectedDeiv] = usePersistedValue("DeivParAppareil_selectedDeiv", "");
  const [filterAnnee, setFilterAnnee] = usePersistedValue("DeivParAppareil_filterAnnee", anneeDefaut(passages.filter(p=>p.type==="Insectes volants")));
  const [selectedAnnees, setSelectedAnnees] = usePersistedValue("DeivParAppareil_selectedAnnees", []);
  const [filterTrimestre, setFilterTrimestre] = usePersistedValue("DeivParAppareil_filterTrimestre", "Tous");
  const [filterMois, setFilterMois] = usePersistedValue("DeivParAppareil_filterMois", "Tous");
  const [selectedCats, setSelectedCats] = usePersistedValue("DeivParAppareil_selectedCats", []);
  const [showSeuils, setShowSeuils] = usePersistedValue("DeivParAppareil_showSeuils", true);
  const [fullscreen, setFullscreen] = useState(false);
  const [collapsed, setCollapsed] = usePersistedCollapsed("DeivParAppareil", false);
  const [echelle, setEchelle] = usePersistedValue("DeivParAppareil_echelle", "auto"); // auto | manuel
  const [maxManuel, setMaxManuel] = usePersistedValue("DeivParAppareil_maxManuel", 20);
  const [seuilCat, setSeuilCat] = usePersistedValue("DeivParAppareil_seuilCat", "auto"); // auto = suit les especes affichees, sinon un type precis

  const DEFAULT_SEUILS_IV = {
    Moucherons:   { leger:350, moyen:500 },
    Mouches:      { leger:150, moyen:250 },
    Moustiques:   { leger:60,  moyen:100 },
    Hyménoptères: { leger:50,  moyen:100 },
    Lépidoptères: { leger:45,  moyen:100 },
    Coléoptères:  { leger:15,  moyen:30  },
    Punaises:     { leger:5,   moyen:10  },
    Tipules:      { leger:10,  moyen:20  },
  };
  const [seuilsIV, setSeuilsIV] = useState(DEFAULT_SEUILS_IV);

  useEffect(() => {
    sbGet("seuils").then(data => {
      if (data && data.length > 0 && data[0].data) {
        try {
          const parsed = typeof data[0].data === "string" ? JSON.parse(data[0].data) : data[0].data;
          if (parsed.iv) setSeuilsIV({...DEFAULT_SEUILS_IV, ...parsed.iv});
        } catch(_e) { return; }
      }
    }).catch(()=>{});
  }, []);

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const MOIS_LABELS = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];
  const CATS = ["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"];
  const CAT_COLORS = {"Moucherons":"#f59e0b","Mouches":"#ef4444","Moustiques":"#3b82f6","Hyménoptères":"#22c55e","Lépidoptères":"#8b5cf6","Coléoptères":"#06b6d4","Punaises":"#f97316","Tipules":"#7a90aa"};

  const deivList = postes.filter(p => p.type === "DEIV").sort((a,b) => {
    const na = parseInt((a.id.match(/\d+/)||["0"])[0]);
    const nb = parseInt((b.id.match(/\d+/)||["0"])[0]);
    return na - nb;
  });

  const passagesDeiv = passages.filter(p => p.type === "Insectes volants");
  const annees = [...new Set(passagesDeiv.map(p=>{ const d=pd(p.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);

  function filterPassagesByPeriode(list, anneeOverride) {
    return list.filter(p => {
      const d = pd(p.date);
      if (!d) return false;
      if (anneeOverride) {
        if (d.getFullYear() !== parseInt(anneeOverride)) return false;
      } else if (selectedAnnees.length > 0) {
        if (!selectedAnnees.includes(d.getFullYear())) return false;
      } else if (filterAnnee !== "Toutes") {
        if (d.getFullYear() !== parseInt(filterAnnee)) return false;
      }
      if (filterTrimestre !== "Tous") {
        const t = Math.ceil((d.getMonth()+1)/3);
        if (t !== parseInt(filterTrimestre)) return false;
      }
      if (filterMois !== "Tous" && d.getMonth() !== parseInt(filterMois)) return false;
      return true;
    }).sort((a,b) => pd(a.date)-pd(b.date));
  }

  // Calcul des totaux par DEIV (pour identifier les plus sollicites, utilise si aucun DEIV selectionne)
  const totauxParDeiv = {};
  deivList.forEach(d => { totauxParDeiv[d.id] = 0; });
  passagesDeiv.forEach(passage => {
    const saisies = typeof passage.saisies === "string" ? JSON.parse(passage.saisies||"{}") : (passage.saisies||{});
    Object.entries(saisies).forEach(([id, s]) => {
      if (totauxParDeiv[id] === undefined) return;
      const total = CATS.reduce((acc,cat)=>acc+(parseInt(s["iv_"+cat]||0)),0);
      totauxParDeiv[id] += total;
    });
  });
  const topDeivSorted = [...deivList].sort((a,b)=>(totauxParDeiv[b.id]||0)-(totauxParDeiv[a.id]||0));
  const deivActif = selectedDeiv || (topDeivSorted.length>0 ? topDeivSorted[0].id : "");

  function getStats(passage) {
    const saisies = typeof passage.saisies === "string" ? JSON.parse(passage.saisies||"{}") : (passage.saisies||{});
    const s = saisies[deivActif];
    if (!s) return null; // DEIV non vérifié ce passage → exclure
    const catsToUse = selectedCats.length > 0 ? selectedCats : CATS;
    const total = catsToUse.reduce((acc,cat)=>acc+(parseInt(s["iv_"+cat]||0)),0);
    return { date: passage.date, total };
  }

  const passagesFiltres = filterPassagesByPeriode(passagesDeiv);
  const stats = passagesFiltres.map(getStats).filter(Boolean);

  const ANNEE_COLORS = ["#f59e0b","#22c55e","#3b82f6","#ef4444","#8b5cf6","#06b6d4"];
  const anneesAffichees = selectedAnnees.length > 0 ? selectedAnnees.sort() : (filterAnnee !== "Toutes" ? [parseInt(filterAnnee)] : []);
  const statsParAnnee = anneesAffichees.map((annee, idx) => ({
    annee, color: ANNEE_COLORS[idx % ANNEE_COLORS.length],
    stats: filterPassagesByPeriode(passagesDeiv, String(annee)).map(getStats).filter(Boolean),
  }));

  const W = fullscreen ? 1100 : 700, H = fullscreen ? 420 : 260, PAD = 50;
  // Echelle verticale : auto (ajustee aux donnees) | manuel
  // Seuils traces : soit le type choisi explicitement, soit les especes affichees
  const seuilCats = seuilCat !== "auto" ? [seuilCat] : (selectedCats.length > 0 ? selectedCats : CATS);
  const seuilRef = !showSeuils ? 0
    : seuilCat !== "auto" ? ((seuilsIV[seuilCat]||{}).moyen || 0)
    : (selectedCats.length === 1 && seuilsIV[selectedCats[0]]) ? seuilsIV[selectedCats[0]].moyen : 0;
  const maxDonnees = Math.max(...stats.map(s=>s.total), ...statsParAnnee.flatMap(sa=>sa.stats.map(s=>s.total)), seuilRef, 1);
  const maxAuto = Math.max(5, Math.ceil(maxDonnees*1.25/5)*5);
  const maxVal = echelle === "manuel" ? Math.max(1, parseInt(maxManuel)||10) : maxAuto;
  function xPos(i) { return PAD + (stats.length > 1 ? i/(stats.length-1)*(W-PAD*2) : (W-PAD*2)/2); }
  function yVal(v) { return H - PAD - (Math.min(v,maxVal)/maxVal)*(H-PAD*2); }
  const inpStyle = { background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"6px 10px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };

  const deivPoste = deivList.find(d=>d.id===deivActif);
  const totalGeneral = stats.reduce((a,s)=>a+s.total,0);
  const moyenne = stats.length>0 ? Math.round(totalGeneral/stats.length*10)/10 : 0;

  function exportThisChart() {
    const W2=W, H2=H, PAD2=PAD;
    const maxVal2 = maxVal;
    function yVal2(v) { return H2-PAD2-(Math.min(v,maxVal2)/maxVal2)*(H2-PAD2*2); }
    let chartBody = "";
    if (statsParAnnee.length > 1) {
      chartBody = statsParAnnee.map(function(sa){
        if (sa.stats.length < 1) return "";
        const pts = sa.stats.map(function(s,i){ const x = sa.stats.length>1?PAD2+i/(sa.stats.length-1)*(W2-PAD2*2):W2/2; return x+","+yVal2(s.total); }).join(" ");
        const circles = sa.stats.map(function(s,i){ const x=sa.stats.length>1?PAD2+i/(sa.stats.length-1)*(W2-PAD2*2):W2/2; const y=yVal2(s.total); return "<circle cx='"+x+"' cy='"+y+"' r='4' fill='"+sa.color+"'/>"+(s.total>0?"<text x='"+x+"' y='"+(y-9)+"' font-size='8' fill='"+sa.color+"' text-anchor='middle'>"+s.total+"</text>":""); }).join("");
        return (sa.stats.length>1?"<polyline points='"+pts+"' fill='none' stroke='"+sa.color+"' stroke-width='2'/>":"")+circles;
      }).join("");
    } else {
      const pts = stats.map(function(s,i){ const x = stats.length>1?PAD2+i/(stats.length-1)*(W2-PAD2*2):W2/2; return x+","+yVal2(s.total); }).join(" ");
      const circles = stats.map(function(s,i){ const x=stats.length>1?PAD2+i/(stats.length-1)*(W2-PAD2*2):W2/2; const y=yVal2(s.total); return "<circle cx='"+x+"' cy='"+y+"' r='4' fill='#f59e0b'/>"+(s.total>0?"<text x='"+x+"' y='"+(y-9)+"' font-size='9' fill='#f59e0b' text-anchor='middle'>"+s.total+"</text>":"")+"<text x='"+x+"' y='"+(H2-8)+"' font-size='8' fill='#6b7280' text-anchor='middle'>"+s.date.slice(0,5)+"</text>"; }).join("");
      chartBody = (stats.length>1?"<polyline points='"+pts+"' fill='none' stroke='#f59e0b' stroke-width='2'/>":"")+circles;
    }
    const svgChart = "<svg width='"+W2+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+chartBody+"</svg>";

    const rows = statsParAnnee.length > 1
      ? statsParAnnee.map(sa=>"<h3>"+sa.annee+"</h3><table style='width:100%;border-collapse:collapse;margin-bottom:12px'><thead><tr><th>Date</th><th>Captures</th></tr></thead><tbody>"+sa.stats.map(s=>"<tr><td>"+s.date+"</td><td style='font-weight:700'>"+s.total+"</td></tr>").join("")+"</tbody></table>").join("")
      : "<table style='width:100%;border-collapse:collapse;margin-top:16px'><thead><tr><th>Date</th><th>Captures</th></tr></thead><tbody>"+stats.map(s=>"<tr><td>"+s.date+"</td><td style='font-weight:700'>"+s.total+"</td></tr>").join("")+"</tbody></table>";

    exportHTML("Évolution DEIV "+deivActif+" - "+CLIENT_CONFIG.nom,
      "<h1>Évolution captures - "+deivActif+(deivPoste?" ("+deivPoste.zone+")":"")+"</h1>"+
      "<p style='color:#6b7280;margin-bottom:16px'>"+CLIENT_CONFIG.nom+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+
      "<p style='color:#374151;margin-bottom:16px'>Total : <strong>"+totalGeneral+"</strong> - Moyenne par passage : <strong>"+moyenne+"</strong></p>"+
      svgChart+
      rows
    );
  }

  const filtersJsx = (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14,paddingBottom:14,borderBottom:"1px solid #243352"}}>
      <div style={{flexBasis:"100%"}}>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>DEIV</label>
        <select value={deivActif} onChange={e=>setSelectedDeiv(e.target.value)} style={{...inpStyle,minWidth:220}}>
          {deivList.map(d=>(
            <option key={d.id} value={d.id}>{d.id} - {(d.zone||"").slice(0,30)} ({totauxParDeiv[d.id]||0} cap. total)</option>
          ))}
        </select>
      </div>
      <div style={{flexBasis:"100%"}}>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Espèce(s)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          <button onClick={()=>setSelectedCats([])}
            style={{background:selectedCats.length===0?"#1d4ed8":"#243352",color:selectedCats.length===0?"#fff":"#94a3b8",border:"1px solid "+(selectedCats.length===0?"#3b82f6":"#3d5270"),borderRadius:6,padding:"5px 10px",fontSize:10,fontWeight:selectedCats.length===0?700:400,cursor:"pointer",fontFamily:"inherit"}}>
            Toutes espèces
          </button>
          {CATS.map(cat=>{
            const isSel = selectedCats.includes(cat);
            return (
              <button key={cat} onClick={()=>setSelectedCats(prev=>isSel?prev.filter(x=>x!==cat):[...prev,cat])}
                style={{display:"flex",alignItems:"center",gap:5,background:isSel?"#243352":"transparent",color:isSel?"#f1f5f9":"#7a90aa",border:"1px solid "+(isSel?CAT_COLORS[cat]:"#3d5270"),borderRadius:6,padding:"5px 10px",fontSize:10,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:CAT_COLORS[cat],display:"inline-block"}}/>
                {cat}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Année(s)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {annees.map(a=>{
            const isSel = selectedAnnees.includes(a);
            return (<button key={a} onClick={()=>setSelectedAnnees(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])}
              style={{background:isSel?"#1d4ed8":"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>);
          })}
          {selectedAnnees.length>0&&<button onClick={()=>setSelectedAnnees([])} style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"6px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Trimestre</label>
        <select value={filterTrimestre} onChange={e=>setFilterTrimestre(e.target.value)} style={inpStyle}>
          <option value="Tous">Tous</option>
          {[1,2,3,4].map(t=><option key={t} value={t}>T{t}</option>)}
        </select>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Mois</label>
        <select value={filterMois} onChange={e=>setFilterMois(e.target.value)} style={inpStyle}>
          <option value="Tous">Tous</option>
          {MOIS_LABELS.map((m,i)=><option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Echelle Y</label>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <select value={echelle} onChange={e=>setEchelle(e.target.value)} style={inpStyle}>
            <option value="auto">Auto</option>
            <option value="manuel">Manuel</option>
          </select>
          {echelle==="manuel" && <input type="number" min="1" value={maxManuel} onChange={e=>setMaxManuel(e.target.value)} style={{...inpStyle,width:70}}/>}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Seuil affiché</label>
        <select value={seuilCat} onChange={e=>setSeuilCat(e.target.value)} style={inpStyle}>
          <option value="auto">Espèces affichées</option>
          {CATS.filter(c=>seuilsIV[c]).map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <button onClick={()=>{setSelectedDeiv("");setFilterAnnee("Toutes");setSelectedAnnees([]);setFilterTrimestre("Tous");setFilterMois("Tous");setSelectedCats([]);setEchelle("auto");setSeuilCat("auto");}}
        style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
        Réinitialiser
      </button>
      <button onClick={()=>setShowSeuils(v=>!v)}
        style={{background:showSeuils?"#243352":"transparent",color:showSeuils?"#f1f5f9":"#7a90aa",border:"1px solid "+(showSeuils?"#5a7090":"#3d5270"),borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
        {showSeuils?"Masquer":"Afficher"} seuils
      </button>
    </div>
  );

  const bodyJsx = stats.length===0 && statsParAnnee.length===0 ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucun passage DEIV pour cette période.</div>
  ) : (
    <>
    <div style={{display:"flex",gap:16,marginBottom:12}}>
      <div style={{background:"#243352",borderRadius:8,padding:"8px 14px"}}>
        <div style={{fontSize:18,fontWeight:900,color:"#f59e0b"}}>{totalGeneral}</div>
        <div style={{fontSize:9,color:"#7a90aa"}}>Total captures</div>
      </div>
      <div style={{background:"#243352",borderRadius:8,padding:"8px 14px"}}>
        <div style={{fontSize:18,fontWeight:900,color:"#f59e0b"}}>{moyenne}</div>
        <div style={{fontSize:9,color:"#7a90aa"}}>Moyenne / passage</div>
      </div>
    </div>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {[0,25,50,75,100].map(pct=>{ const v=Math.round(maxVal*pct/100); const y=yVal(v); return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>); })}
        {showSeuils && (()=>{
          const catsToShow = seuilCats;
          return catsToShow.filter(cat=>seuilsIV[cat]).map(cat=>{
            const sl = seuilsIV[cat].leger;
            const sm = seuilsIV[cat].moyen;
            const col = CAT_COLORS[cat]||"#f59e0b";
            return (<g key={cat}>
              {sl<=maxVal && (<>
                <line x1={PAD} x2={W-PAD} y1={yVal(sl)} y2={yVal(sl)} stroke={col} strokeWidth="1" strokeDasharray="5,3"/>
                <text x={W-PAD+4} y={yVal(sl)+4} fontSize="8" fill={col}>{cat.slice(0,4)} {sl}</text>
              </>)}
              {sm<=maxVal && (<>
                <line x1={PAD} x2={W-PAD} y1={yVal(sm)} y2={yVal(sm)} stroke={col} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.7"/>
                <text x={W-PAD+4} y={yVal(sm)+4} fontSize="8" fill={col} opacity="0.7">{cat.slice(0,4)} {sm}</text>
              </>)}
            </g>);
          });
        })()}
        {statsParAnnee.length > 1 ? statsParAnnee.map((sa,ai)=>{
          if(sa.stats.length < 1) return null;
          const poly = sa.stats.map((s,i)=>{ const x=sa.stats.length>1?PAD+i/(sa.stats.length-1)*(W-PAD*2):W/2; return x+","+yVal(s.total); }).join(" ");
          return (<g key={sa.annee}>
            {sa.stats.length>1&&<polyline points={poly} fill="none" stroke={sa.color} strokeWidth="2.5" strokeLinejoin="round"/>}
            {sa.stats.map((s,i)=>{ const x=sa.stats.length>1?PAD+i/(sa.stats.length-1)*(W-PAD*2):W/2; return (<g key={i}><circle cx={x} cy={yVal(s.total)} r="4" fill={sa.color} stroke="#1a2540" strokeWidth="2"/>{s.total>0&&<text x={x} y={yVal(s.total)-9} fontSize="8" fill={sa.color} textAnchor="middle">{s.total}</text>}{ai===0&&<text x={x} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle" transform={"rotate(-30 "+x+" "+(H-8)+")"}>{(s.date||"").slice(0,5)}</text>}</g>); })}
          </g>);
        }) : (<g>
          {stats.length>1&&<polyline points={stats.map((s,i)=>xPos(i)+","+yVal(s.total)).join(" ")} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round"/>}
          {stats.map((s,i)=>(
            <g key={i}>
              <circle cx={xPos(i)} cy={yVal(s.total)} r="5" fill="#f59e0b" stroke="#1a2540" strokeWidth="2"/>
              {s.total>0 && <text x={xPos(i)} y={yVal(s.total)-10} fontSize="9" fill="#94a3b8" textAnchor="middle">{s.total}</text>}
              <text x={xPos(i)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle" transform={"rotate(-30 "+xPos(i)+" "+(H-8)+")"}>{(s.date||"").slice(0,5)}</text>
            </g>
          ))}
        </g>)}
      </svg>
    </div>
    {statsParAnnee.length > 1 && (<div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>{statsParAnnee.map((sa,i)=>(<div key={sa.annee} style={{display:"flex",alignItems:"center",gap:5}}><svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={sa.color} strokeWidth="2.5"/></svg><span style={{fontSize:11,color:sa.color,fontWeight:700}}>{sa.annee}</span></div>))}</div>)}
    </>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Évolution captures par DEIV - {deivActif}</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {filtersJsx}
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}

    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Évolution captures par DEIV individuel - {deivActif}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {filtersJsx}
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Évolution captures par DEIV individuel - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}


function TeignesEvolutionChart({ passages, postes }) {
  const W=700, H=260, PAD=48;
  const ANNEE_COLORS = ["#f59e0b","#3b82f6","#22c55e","#ef4444","#8b5cf6","#06b6d4","#f97316"];

  const teignesPostes = postes.filter(p=>(p.nuisible||"").toLowerCase().includes("teigne"));

  const [selectedPostes, setSelectedPostes] = usePersistedBool ? [[], ()=>{}] : [[], ()=>{}];
  const [_sel, _setSel] = useState([]);
  const selPostes = _sel;
  const setSelPostes = _setSel;

  const [selectedAnnees, setSelectedAnnees] = usePersistedValue("TeignesEvolution_selectedAnnees", anneeDefaut(passages)==="Toutes" ? [] : [ANNEE_COURANTE]);
  const [showSeuils, setShowSeuils] = usePersistedValue("TeignesEvolution_showSeuils", true);
  const [collapsed, setCollapsed] = usePersistedCollapsed("TeignesEvolution", false);
  const [fullscreen, setFullscreen] = useState(false);
  const [echelle, setEchelle] = usePersistedValue("TeignesEvolution_echelle", "auto"); // auto | manuel
  const [maxManuel, setMaxManuel] = usePersistedValue("TeignesEvolution_maxManuel", 150);

  const annees = [...new Set(passages.map(p=>(p.date||"").split("/")[2]).filter(Boolean))].sort();
  const MOIS_LABELS = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];

  const postesToShow = selPostes.length > 0 ? teignesPostes.filter(p=>selPostes.includes(p.id)) : teignesPostes;

  const POSTE_COLORS = ["#8b5cf6","#f59e0b","#22c55e","#ef4444","#3b82f6","#06b6d4","#f97316","#ec4899","#84cc16","#14b8a6"];

  function getVal(saisies, posteId) {
    const s = saisies[posteId];
    if (!s || s.etat===undefined || s.etat==="") return null;
    const v = parseFloat(s.etat||"");
    return isNaN(v) ? null : v;
  }

  // Une courbe par annee. Valeur mensuelle = cumul des captures des pieges selectionnes.
  function statsParMois(annee) {
    const parMois = {};
    passages.forEach(p=>{
      const parts = (p.date||"").split("/");
      if (parts.length !== 3) return;
      if (parts[2] !== annee) return;
      const m = parseInt(parts[1], 10) - 1;
      if (isNaN(m) || m < 0 || m > 11) return;
      const saisies = typeof p.saisies==="string"?JSON.parse(p.saisies||"{}"):p.saisies||{};
      let somme = null;
      postesToShow.forEach(pt=>{
        const v = getVal(saisies, pt.id);
        if (v === null) return;
        somme = (somme===null?0:somme) + v;
      });
      if (somme === null) return;
      parMois[m] = (parMois[m]||0) + somme;
    });
    return MOIS_LABELS.map((lbl,m)=>({ date: lbl, mois: m, val: parMois[m]===undefined ? null : parMois[m] }));
  }

  const anneesAffichees = selectedAnnees.length>0 ? [...selectedAnnees].sort() : annees;
  const series = anneesAffichees.map((a,i)=>({ id: a, annee: a, color: ANNEE_COLORS[i % ANNEE_COLORS.length], data: statsParMois(a) }));
  const axeLabels = MOIS_LABELS;
  const aDesDonnees = series.some(s=>s.data.some(d=>d.val!==null));

  const SEUIL_LEGER = 100;
  const SEUIL_MOYEN = 150;
  const allVals = series.flatMap(s=>s.data.map(d=>d.val||0));
  // Echelle verticale : auto (ajustee aux donnees) | manuel
  const seuilRef = (showSeuils && selPostes.length===1) ? SEUIL_MOYEN : 0;
  const maxDonnees = Math.max(...allVals, seuilRef, 10);
  const maxAuto = Math.max(5, Math.ceil(maxDonnees*1.25/5)*5);
  const maxVal = echelle === "manuel" ? Math.max(1, parseInt(maxManuel)||10) : maxAuto;
  const inpStyle = { background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"6px 10px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };

  function yVal(v) { return PAD + (H-PAD*2)*(1-Math.min(v,maxVal)/maxVal); }
  function xPos(i, len) { return len>1 ? PAD+i/(len-1)*(W-PAD*2) : W/2; }

  function exportThisChart() {
    const labelStr = selectedAnnees.length>0 ? selectedAnnees.join(", ") : "Toutes années";
    const postesStr = selPostes.length>0 ? selPostes.join(", ") : "Tous les pieges teignes";
    const W2=W, H2=H, PAD2=PAD;
    const maxVal2 = maxVal;
    function yVal2(v){ return PAD2+(H2-PAD2*2)*(1-Math.min(v,maxVal2)/maxVal2); }
    function xPos2(i,len){ return len>1?PAD2+i/(len-1)*(W2-PAD2*2):W2/2; }
    // Grille
    let gridSvg = [0,25,50,75,100].map(pct=>{ const v=Math.round(maxVal2*pct/100); const y=yVal2(v); return "<line x1='"+PAD2+"' x2='"+(W2-PAD2)+"' y1='"+y+"' y2='"+y+"' stroke='#e5e7eb' stroke-width='1'/><text x='"+(PAD2-4)+"' y='"+(y+4)+"' font-size='9' fill='#94a3b8' text-anchor='end'>"+v+"</text>"; }).join("");
    // Seuils
    let seuilsSvg = "";
    if (showSeuils && selPostes.length===1) {
      const svgLeger = SEUIL_LEGER<=maxVal2 ? "<line x1='"+PAD2+"' x2='"+(W2-PAD2)+"' y1='"+yVal2(SEUIL_LEGER)+"' y2='"+yVal2(SEUIL_LEGER)+"' stroke='#f59e0b' stroke-dasharray='6,3' stroke-width='1.5'/><text x='"+(W2-PAD2+4)+"' y='"+(yVal2(SEUIL_LEGER)+4)+"' font-size='9' fill='#f59e0b'>Leger "+SEUIL_LEGER+"</text>" : "";
      const svgMoyen = SEUIL_MOYEN<=maxVal2 ? "<line x1='"+PAD2+"' x2='"+(W2-PAD2)+"' y1='"+yVal2(SEUIL_MOYEN)+"' y2='"+yVal2(SEUIL_MOYEN)+"' stroke='#ef4444' stroke-dasharray='6,3' stroke-width='1.5'/><text x='"+(W2-PAD2+4)+"' y='"+(yVal2(SEUIL_MOYEN)+4)+"' font-size='9' fill='#ef4444'>Moyen "+SEUIL_MOYEN+"</text>" : "";
      seuilsSvg = svgLeger + svgMoyen;
    }
    // Dates en bas
    const datesSvg = axeLabels.map(function(d,i){ const x=xPos2(i,axeLabels.length); return "<text x='"+x+"' y='"+(H2-6)+"' font-size='8' fill='#6b7280' text-anchor='middle'>"+d+"</text>"; }).join("");
    // Courbes
    const linesSvg = series.map(function(s){
      const validPts = s.data.map((d,i)=>({...d,i})).filter(d=>d.val!==null);
      if (!validPts.length) return "";
      const pts = validPts.map(d=>xPos2(d.i,axeLabels.length)+","+yVal2(d.val)).join(" ");
      const circles = validPts.map(d=>"<circle cx='"+xPos2(d.i,axeLabels.length)+"' cy='"+yVal2(d.val)+"' r='4' fill='"+s.color+"' stroke='#fff' stroke-width='1'/>"+((d.val||0)>0?"<text x='"+xPos2(d.i,axeLabels.length)+"' y='"+(yVal2(d.val)-8)+"' font-size='8' fill='"+s.color+"' text-anchor='middle'>"+d.val+"</text>":"")).join("");
      return (validPts.length>1?"<polyline points='"+pts+"' fill='none' stroke='"+s.color+"' stroke-width='2'/>":"")+circles;
    }).join("");
    // Légende
    const legendSvg = series.map(function(s,i){ return "<line x1='"+(PAD2+i*70)+"' x2='"+(PAD2+i*70+20)+"' y1='14' y2='14' stroke='"+s.color+"' stroke-width='3'/><text x='"+(PAD2+i*70+25)+"' y='18' font-size='10' fill='"+s.color+"'>"+s.annee+"</text>"; }).join("");
    const svgChart = "<svg width='"+W2+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+gridSvg+seuilsSvg+linesSvg+datesSvg+legendSvg+"</svg>";
    // Tableau
    const rows = axeLabels.map(function(d,i){ return "<tr><td>"+d+"</td>"+series.map(function(s){ const pt=s.data[i]; return "<td style='font-weight:700;color:"+s.color+"'>"+(pt&&pt.val!==null?pt.val:"—")+"</td>"; }).join("")+"</tr>"; }).join("");
    const headerCols = series.map(function(s){ return "<th>"+s.annee+"</th>"; }).join("");
    exportHTML("Évolution captures Teignes - "+CLIENT_CONFIG.nom,
      "<h1>Évolution captures Teignes</h1>"+
      "<p style='color:#6b7280;margin-bottom:16px'>"+postesStr+" — "+labelStr+" — Cumul mensuel — "+new Date().toLocaleDateString("fr-FR")+"</p>"+
      svgChart+
      "<table style='width:100%;border-collapse:collapse;margin-top:16px'><thead><tr><th>Date</th>"+headerCols+"</tr></thead><tbody>"+rows+"</tbody></table>"
    );
  }

  const filtersJsx = (
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14,alignItems:"flex-end"}}>
      <div style={{flexBasis:"100%"}}>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:4}}>Pièges Teignes (une courbe par piège)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          <button onClick={()=>setSelPostes([])}
            style={{background:selPostes.length===0?"#8b5cf6":"#243352",color:selPostes.length===0?"#fff":"#7a90aa",border:"1px solid "+(selPostes.length===0?"#8b5cf6":"#3d5270"),borderRadius:6,padding:"4px 9px",fontSize:10,fontWeight:selPostes.length===0?700:400,cursor:"pointer",fontFamily:"inherit"}}>
            Tous ({teignesPostes.length})
          </button>
          {teignesPostes.map((p,i)=>{
            const isSel = selPostes.includes(p.id);
            const col = POSTE_COLORS[teignesPostes.indexOf(p) % POSTE_COLORS.length];
            return (
              <button key={p.id} onClick={()=>setSelPostes(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])}
                style={{background:isSel?col+"22":"#243352",color:isSel?col:"#7a90aa",border:"1px solid "+(isSel?col:"#3d5270"),borderRadius:6,padding:"4px 9px",fontSize:10,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                <div style={{fontWeight:700}}>{p.id}</div>
                {p.zone&&<div style={{fontSize:9,opacity:0.8,marginTop:1}}>{p.zone}</div>}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Année</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {annees.map((a)=>{
            const isSel = selectedAnnees.includes(a);
            return (
              <button key={a} onClick={()=>setSelectedAnnees(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])}
                style={{background:isSel?ANNEE_COLORS[selectedAnnees.indexOf(a)%ANNEE_COLORS.length]:"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?ANNEE_COLORS[selectedAnnees.indexOf(a)%ANNEE_COLORS.length]:"#3d5270"),borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                {a}
              </button>
            );
          })}
          {selectedAnnees.length>0&&<button onClick={()=>setSelectedAnnees([])} style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"6px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Echelle Y</label>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <select value={echelle} onChange={e=>setEchelle(e.target.value)} style={inpStyle}>
            <option value="auto">Auto</option>
            <option value="manuel">Manuel</option>
          </select>
          {echelle==="manuel" && <input type="number" min="1" value={maxManuel} onChange={e=>setMaxManuel(e.target.value)} style={{...inpStyle,width:70}}/>}
        </div>
      </div>
      <button onClick={()=>setShowSeuils(v=>!v)}
        style={{background:showSeuils?"#8b5cf622":"transparent",color:"#8b5cf6",border:"1px solid "+(showSeuils?"#8b5cf6":"#3d5270"),borderRadius:6,padding:"6px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
        {showSeuils?"Masquer seuils":"Afficher seuils"}
      </button>
    </div>
  );

  const bodyJsx = !aDesDonnees || teignesPostes.length===0 ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>
      {teignesPostes.length===0 ? "Aucun poste Teignes trouve." : "Aucune donnee pour cette periode."}
    </div>
  ) : (
    <>
    <div style={{marginBottom:8,fontSize:11,color:"#7a90aa"}}>Cumul mensuel des captures, une courbe par annee. Les seuils Leger/Moyen valent pour un releve : ils ne sont traces que si un seul piege est selectionne.</div>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {[0,25,50,75,100].map(pct=>{ const v=Math.round(maxVal*pct/100); const y=yVal(v); return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>); })}
        {showSeuils && selPostes.length===1 && (<>
          {SEUIL_LEGER<=maxVal && (<>
            <line x1={PAD} x2={W-PAD} y1={yVal(SEUIL_LEGER)} y2={yVal(SEUIL_LEGER)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6,3"/>
            <text x={W-PAD+4} y={yVal(SEUIL_LEGER)+4} fontSize="9" fill="#f59e0b">Leger {SEUIL_LEGER}</text>
          </>)}
          {SEUIL_MOYEN<=maxVal && (<>
            <line x1={PAD} x2={W-PAD} y1={yVal(SEUIL_MOYEN)} y2={yVal(SEUIL_MOYEN)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6,3"/>
            <text x={W-PAD+4} y={yVal(SEUIL_MOYEN)+4} fontSize="9" fill="#ef4444">Moyen {SEUIL_MOYEN}</text>
          </>)}
        </>)}
        {axeLabels.map((d,i)=>(
          <text key={i} x={xPos(i,axeLabels.length)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle">{d}</text>
        ))}
        {series.map((s)=>{
          const validPts = s.data.map((d,i)=>({...d,i})).filter(d=>d.val!==null);
          if (validPts.length===0) return null;
          const polyPts = validPts.map(d=>xPos(d.i,axeLabels.length)+","+yVal(d.val)).join(" ");
          return (<g key={s.id}>
            {validPts.length>1&&<polyline points={polyPts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round"/>}
            {validPts.map(d=>(
              <g key={d.i}>
                <circle cx={xPos(d.i,axeLabels.length)} cy={yVal(d.val)} r="4" fill={s.color} stroke="#1a2540" strokeWidth="2"/>
                {d.val>0&&<text x={xPos(d.i,axeLabels.length)} y={yVal(d.val)-8} fontSize="8" fill={s.color} textAnchor="middle">{d.val}</text>}
              </g>
            ))}
          </g>);
        })}
      </svg>
    </div>
    <div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>
      {series.map((s)=>(
        <div key={s.id} style={{display:"flex",alignItems:"center",gap:5}}>
          <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={s.color} strokeWidth="2.5"/></svg>
          <span style={{fontSize:11,color:s.color,fontWeight:700}}>{s.annee}</span>
        </div>
      ))}
    </div>
    </>
  );

  return (
    <>
    {fullscreen&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}} onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Évolution captures Teignes</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {filtersJsx}
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}
    {!collapsed&&(
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Évolution captures Teignes{selPostes.length>0?" — "+selPostes.join(", "):""}</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setCollapsed(true)} style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>− Masquer</button>
            <button onClick={()=>setFullscreen(true)} style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>⛶ Agrandir</button>
            <ChartExportBtn onClick={exportThisChart}/>
          </div>
        </div>
        {filtersJsx}
        {bodyJsx}
      </Card>
    )}
    {collapsed&&(
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Évolution captures Teignes — masqué</span>
        <span style={{fontSize:11,color:"#8b5cf6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}

// ============================================================
// GRAPHE PART TOXIQUE PAR MOIS
// ============================================================
function ToxiquePlaceboChart({ passages, postes }) {
  const [filterAnnee, setFilterAnnee] = usePersistedValue("ToxiquePlacebo_filterAnnee", anneeDefaut(passages.filter(p=>p.type!=="Insectes volants")));
  const [selectedAnnees, setSelectedAnnees] = usePersistedValue("ToxiquePlacebo_selectedAnnees", []);
  const [fullscreen, setFullscreen] = useState(false);
  const [collapsed, setCollapsed] = usePersistedCollapsed("ToxiquePlacebo", false);
  const [echelle, setEchelle] = usePersistedValue("ToxiquePlacebo_echelle", "plein"); // auto | manuel | plein
  const [maxManuel, setMaxManuel] = usePersistedValue("ToxiquePlacebo_maxManuel", 50);

  const pd = d => { if(!d)return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const MOIS_LABELS = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];
  const ANNEE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  const annees = [...new Set(passages.filter(p=>p.type!=="Insectes volants").map(p=>{ const d=pd(p.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);

  const postesRongeurs = postes.filter(p=>(p.nuisible||"Rongeurs")==="Rongeurs");

  function buildStats(anneeFilter) {
    const passagesFiltres = passages.filter(p=>{
      if (p.type==="Insectes volants") return false;
      const d=pd(p.date); if(!d||isNaN(d)) return false;
      if (anneeFilter && d.getFullYear()!==parseInt(anneeFilter)) return false;
      if (!anneeFilter && selectedAnnees.length>0 && !selectedAnnees.includes(d.getFullYear())) return false;
      if (!anneeFilter && filterAnnee!=="Toutes" && d.getFullYear()!==parseInt(filterAnnee)) return false;
      return true;
    });

    // Regrouper par mois de l annee (0-11) pour superposer les annees
    const byMois = {};
    passagesFiltres.forEach(passage=>{
      const d=pd(passage.date);
      const key = d.getMonth();
      const label = MOIS_LABELS[d.getMonth()];
      if (!byMois[key]) byMois[key] = {key,mois:d.getMonth(),label,toxique:0,placebo:0,total:0};
      const saisies=typeof passage.saisies==="string"?JSON.parse(passage.saisies||"{}"):passage.saisies||{};
      postesRongeurs.forEach(poste=>{
        const s=saisies[poste.id];
        if (!s || !s.molecule) return;
        byMois[key].total++;
        if (s.molecule==="Placebo") byMois[key].placebo++;
        else byMois[key].toxique++;
      });
    });
    return Object.values(byMois).sort((a,b)=>a.mois-b.mois).filter(m=>m.total>0);
  }

  const anneesAff = selectedAnnees.length>0 ? [...selectedAnnees].sort() : (filterAnnee!=="Toutes"?[parseInt(filterAnnee)]:annees);
  const statsParAnnee = anneesAff.map((a,i)=>({annee:a,color:ANNEE_COLORS[i%ANNEE_COLORS.length],stats:buildStats(String(a))}));
  const stats = [];

  const W=700, H=260, PAD=50;

  // Echelle verticale : auto (ajustee aux donnees) | manuel | plein (0-100%)
  const toutesValeurs = statsParAnnee.reduce((acc,sa)=>acc.concat(sa.stats.map(s=>s.total>0?Math.round(s.toxique/s.total*100):0)), []);
  const maxDonnees = Math.max(...toutesValeurs, 1);
  const maxAuto = Math.min(100, Math.max(5, Math.ceil(maxDonnees*1.25/5)*5));
  const maxY = echelle === "plein" ? 100 : echelle === "manuel" ? Math.min(100, Math.max(1, parseInt(maxManuel)||100)) : maxAuto;
  const graduations = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxY*f));
  const showLigne50 = maxY >= 50;
  const inpStyle = { background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"6px 10px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };

  function yPct(pct) { return PAD+(H-PAD*2)*(1-Math.min(pct,maxY)/maxY); }
  function xPos(i,len) { return len>1?PAD+i/(len-1)*(W-PAD*2):W/2; }
  function xMois(m) { return PAD + (m/11)*(W-PAD*2); }

  function buildSvgLines(dataStats, color, dashed) {
    if (dataStats.length===0) return "";
    const pts = dataStats.map((s)=>{
      const pct = s.total>0?Math.round(s.toxique/s.total*100):0;
      return xMois(s.mois)+","+yPct(pct);
    }).join(" ");
    const circles = dataStats.map((s)=>{
      const pct=s.total>0?Math.round(s.toxique/s.total*100):0;
      const x=xMois(s.mois); const y=yPct(pct);
      return "<circle cx='"+x+"' cy='"+y+"' r='4' fill='"+color+"' stroke='#1a2540' stroke-width='2'/>"
        +"<text x='"+x+"' y='"+(y-9)+"' font-size='8' fill='"+color+"' text-anchor='middle'>"+pct+"%</text>"
    }).join("");
    return (dataStats.length>1?"<polyline points='"+pts+"' fill='none' stroke='"+color+"' stroke-width='2.5'"+(dashed?" stroke-dasharray='6,3'":"")+"/>":"")+circles;
  }

  function exportThisChart() {
    const grid = graduations.map(v=>{ const y=yPct(v); return "<line x1='"+PAD+"' x2='"+(W-PAD)+"' y1='"+y+"' y2='"+y+"' stroke='#e5e7eb' stroke-width='1'/><text x='"+(PAD-4)+"' y='"+(y+4)+"' font-size='9' fill='#94a3b8' text-anchor='end'>"+v+"%</text>"; }).join("");
    const thresh50 = showLigne50 ? "<line x1='"+PAD+"' x2='"+(W-PAD)+"' y1='"+yPct(50)+"' y2='"+yPct(50)+"' stroke='#f59e0b' stroke-dasharray='5,3' stroke-width='1.5'/><text x='"+(W-PAD+4)+"' y='"+(yPct(50)+4)+"' font-size='9' fill='#f59e0b'>50%</text>" : "";
    const moisSvg = MOIS_LABELS.map(function(lbl,m){ return "<text x='"+xMois(m)+"' y='"+(H-8)+"' font-size='8' fill='#6b7280' text-anchor='middle'>"+lbl+"</text>"; }).join("");
    const legende = statsParAnnee.map(function(sa,i){ return "<line x1='"+(PAD+i*70)+"' x2='"+(PAD+i*70+20)+"' y1='14' y2='14' stroke='"+sa.color+"' stroke-width='3'/><text x='"+(PAD+i*70+25)+"' y='18' font-size='10' fill='"+sa.color+"'>"+sa.annee+"</text>"; }).join("");
    const lines = moisSvg + statsParAnnee.map((sa)=>buildSvgLines(sa.stats,sa.color,false)).join("") + legende;
    const svg = "<svg width='"+W+"' height='"+H+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+grid+thresh50+lines+"</svg>";
    const src = statsParAnnee.reduce((acc,sa)=>acc.concat(sa.stats.map(x=>({...x,label:x.label+" "+sa.annee}))), []);
    const rows = src.map(s=>"<tr><td>"+s.label+"</td><td style='color:#ef4444;font-weight:700'>"+s.toxique+"</td><td style='color:#3b82f6;font-weight:700'>"+s.placebo+"</td><td style='font-weight:700'>"+Math.round(s.toxique/(s.total||1)*100)+"%</td></tr>").join("");
    exportChartCard("Part d'utilisation du toxique par mois", svg+"<table style='width:100%;border-collapse:collapse;margin-top:16px'><thead><tr><th style='padding:6px 10px;border:1px solid #e5e7eb'>Mois</th><th style='padding:6px 10px;border:1px solid #e5e7eb;color:#ef4444'>Toxique</th><th style='padding:6px 10px;border:1px solid #e5e7eb;color:#3b82f6'>Placebo</th><th style='padding:6px 10px;border:1px solid #e5e7eb'>% Toxique</th></tr></thead><tbody>"+rows+"</tbody></table>");
  }

  const filtersJsx = (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14}}>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Année(s)</label>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          <select value={filterAnnee} onChange={e=>{setFilterAnnee(e.target.value);setSelectedAnnees([]);}}
            style={{background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"5px 8px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit"}}>
            <option value="Toutes">Toutes années</option>
            {annees.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          {annees.map((a,i)=>{ const isSel=selectedAnnees.includes(a); return(<button key={a} onClick={()=>setSelectedAnnees(prev=>isSel?prev.filter(x=>x!==a):[...prev,a])}
            style={{background:isSel?ANNEE_COLORS[selectedAnnees.indexOf(a)%ANNEE_COLORS.length]:"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?ANNEE_COLORS[selectedAnnees.indexOf(a)%ANNEE_COLORS.length]:"#3d5270"),borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>); })}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Echelle Y</label>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <select value={echelle} onChange={e=>setEchelle(e.target.value)} style={inpStyle}>
            <option value="auto">Auto</option>
            <option value="manuel">Manuel</option>
            <option value="plein">0-100%</option>
          </select>
          {echelle==="manuel" && <input type="number" min="1" max="100" value={maxManuel} onChange={e=>setMaxManuel(e.target.value)} style={{...inpStyle,width:70}}/>}
        </div>
      </div>
      <button onClick={()=>{setFilterAnnee("Toutes");setSelectedAnnees([]);setEchelle("plein");}}
        style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Reset</button>
    </div>
  );

  const noData = statsParAnnee.every(sa=>sa.stats.length===0);

  const bodyJsx = noData ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucune donnée — saisissez les molécules (Toxique/Placebo) lors des passages.</div>
  ) : (
    <>
    <div style={{marginBottom:8,fontSize:11,color:"#7a90aa"}}>% de postes avec molécule toxique sur le total saisi ce mois — la ligne à 50% est le seuil équilibre.</div>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {graduations.map((v,gi)=>{ const y=yPct(v); return(<g key={gi}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}%</text></g>); })}
        {showLigne50 && (<>
          <line x1={PAD} x2={W-PAD} y1={yPct(50)} y2={yPct(50)} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,3"/>
          <text x={W-PAD+4} y={yPct(50)+4} fontSize="9" fill="#f59e0b">50%</text>
        </>)}
        {MOIS_LABELS.map((lbl,mi)=>(<text key={mi} x={xMois(mi)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle">{lbl}</text>))}
        {statsParAnnee.map((sa)=>{
          if (!sa.stats.length) return null;
          const poly = sa.stats.map(x=>xMois(x.mois)+","+yPct(x.total>0?Math.round(x.toxique/x.total*100):0)).join(" ");
          return (<g key={sa.annee}>
            {sa.stats.length>1&&<polyline points={poly} fill="none" stroke={sa.color} strokeWidth="2.5" strokeLinejoin="round"/>}
            {sa.stats.map((x,i)=>{ const pct=x.total>0?Math.round(x.toxique/x.total*100):0; return (<g key={i}><circle cx={xMois(x.mois)} cy={yPct(pct)} r="4" fill={sa.color} stroke="#1a2540" strokeWidth="2"/><text x={xMois(x.mois)} y={yPct(pct)-9} fontSize="8" fill={sa.color} textAnchor="middle">{pct}%</text></g>); })}
          </g>);
        })}
      </svg>
    </div>
    {statsParAnnee.length>0&&(<div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>{statsParAnnee.map((sa,i)=>(<div key={sa.annee} style={{display:"flex",alignItems:"center",gap:5}}><svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={sa.color} strokeWidth="2.5"/></svg><span style={{fontSize:11,color:sa.color,fontWeight:700}}>{sa.annee}</span></div>))}</div>)}
    </>
  );

  return (
    <>
    {fullscreen&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}} onClick={()=>setFullscreen(false)}>
      <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}><div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Part d&apos;utilisation du toxique par mois</div><div style={{display:"flex",gap:8}}><ChartExportBtn onClick={exportThisChart}/><button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button></div></div>{filtersJsx}{bodyJsx}</Card>
      </div>
    </div>)}
    {!collapsed&&(<Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Part d&apos;utilisation du toxique par mois</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>− Masquer</button>
          <button onClick={()=>setFullscreen(true)} style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>⛶ Agrandir</button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {filtersJsx}{bodyJsx}
    </Card>)}
    {collapsed&&(<div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:12,color:"#94a3b8"}}>Part d&apos;utilisation du toxique par mois — masqué</span>
      <span style={{fontSize:11,color:"#ef4444",fontWeight:700}}>+ Afficher</span>
    </div>)}
    </>
  );
}

function MoleculesChart({ passages, postes }) {
  const [filterAnnee, setFilterAnnee] = usePersistedValue("Molecules_filterAnnee", anneeDefaut(passages));
  const [selectedAnnees, setSelectedAnnees] = usePersistedValue("Molecules_selectedAnnees", []);
  const [fullscreen, setFullscreen] = useState(false);
  const [collapsed, setCollapsed] = usePersistedCollapsed("Molecules", false);

  const pd = d => { if(!d)return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const annees = [...new Set(passages.filter(p=>p.type!=="Insectes volants").map(p=>{ const d=pd(p.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);
  const ANNEE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  const BAR_COLORS = ["#8b5cf6","#3b82f6","#22c55e","#f59e0b","#ef4444","#06b6d4","#f97316","#ec4899","#84cc16","#14b8a6"];

  const postesRongeurs = postes.filter(p=>(p.nuisible||"Rongeurs")==="Rongeurs");

  function filterPassages(list) {
    return list.filter(p=>{
      if (p.type==="Insectes volants") return false;
      const d = pd(p.date); if (!d) return false;
      if (selectedAnnees.length>0) return selectedAnnees.includes(d.getFullYear());
      if (filterAnnee!=="Toutes") return d.getFullYear()===parseInt(filterAnnee);
      return true;
    });
  }

  function getMoleculeStats() {
    const counts = {};
    filterPassages(passages).forEach(passage=>{
      const saisies = typeof passage.saisies==="string"?JSON.parse(passage.saisies||"{}"):passage.saisies||{};
      postesRongeurs.forEach(poste=>{
        const s = saisies[poste.id];
        if (!s || !s.molecule) return;
        const mol = s.molecule;
        if (mol === "Placebo") return; // le placebo n est pas une molecule biocide
        counts[mol] = (counts[mol]||0)+1;
      });
    });
    // Aussi depuis molecule_actuelle des postes (état actuel)
    postesRongeurs.forEach(p=>{ if (p.molecule_actuelle && p.molecule_actuelle !== "Placebo") counts[p.molecule_actuelle] = (counts[p.molecule_actuelle]||0); });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  }

  const molStats = getMoleculeStats();
  const maxCount = Math.max(...molStats.map(([,c])=>c), 1);
  const W = fullscreen?700:600, BAR_H = 28, PAD_L = 160, PAD_R = 60;
  const H2 = Math.max(molStats.length*(BAR_H+8)+40, 80);

  function exportThisChart() {
    const bars = molStats.map(([mol,count],i)=>{
      const bw = (count/maxCount)*(W-PAD_L-PAD_R);
      const y = 20+i*(BAR_H+8);
      return "<rect x='"+PAD_L+"' y='"+y+"' width='"+bw+"' height='"+BAR_H+"' fill='"+BAR_COLORS[i%BAR_COLORS.length]+"' rx='4'/>"
        +"<text x='"+(PAD_L-8)+"' y='"+(y+BAR_H/2+4)+"' font-size='11' fill='#374151' text-anchor='end'>"+mol+"</text>"
        +"<text x='"+(PAD_L+bw+6)+"' y='"+(y+BAR_H/2+4)+"' font-size='11' fill='"+BAR_COLORS[i%BAR_COLORS.length]+"' font-weight='bold'>"+count+"</text>";
    }).join("");
    const svg = "<svg width='"+W+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+bars+"</svg>";
    const rows = molStats.map(([mol,c],i)=>"<tr><td style='padding:6px 10px;border:1px solid #e5e7eb'><span style='display:inline-block;width:10px;height:10px;border-radius:2px;background:"+BAR_COLORS[i%BAR_COLORS.length]+";margin-right:8px'></span>"+mol+"</td><td style='padding:6px 10px;border:1px solid #e5e7eb;font-weight:700;text-align:right'>"+c+" utilisations</td></tr>").join("");
    exportChartCard("Molécules les plus utilisées", svg+"<table style='width:100%;border-collapse:collapse;margin-top:16px'><thead><tr><th style='padding:6px 10px;border:1px solid #e5e7eb'>Molécule</th><th style='padding:6px 10px;border:1px solid #e5e7eb'>Utilisations</th></tr></thead><tbody>"+rows+"</tbody></table>");
  }

  const filtersJsx = (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14}}>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Année(s)</label>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          <select value={filterAnnee} onChange={e=>{setFilterAnnee(e.target.value);setSelectedAnnees([]);}}
            style={{background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"5px 8px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit"}}>
            <option value="Toutes">Toutes années</option>
            {annees.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          {annees.map((a,i)=>{ const isSel=selectedAnnees.includes(a); return(<button key={a} onClick={()=>setSelectedAnnees(prev=>isSel?prev.filter(x=>x!==a):[...prev,a])}
            style={{background:isSel?ANNEE_COLORS[selectedAnnees.indexOf(a)%ANNEE_COLORS.length]:"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?ANNEE_COLORS[selectedAnnees.indexOf(a)%ANNEE_COLORS.length]:"#3d5270"),borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>); })}
        </div>
      </div>
      <button onClick={()=>{setFilterAnnee("Toutes");setSelectedAnnees([]);}}
        style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"6px 12px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Reset</button>
    </div>
  );

  const bodyJsx = molStats.length===0 ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucune molécule enregistrée — saisissez les molécules lors des passages.</div>
  ) : (
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H2} style={{width:"100%",maxWidth:W,display:"block"}}>
        {molStats.map(([mol,count],i)=>{
          const bw = (count/maxCount)*(W-PAD_L-PAD_R);
          const y = 20+i*(BAR_H+8);
          return (<g key={mol}>
            <rect x={PAD_L} y={y} width={bw} height={BAR_H} fill={BAR_COLORS[i%BAR_COLORS.length]} rx="4"/>
            <text x={PAD_L-8} y={y+BAR_H/2+4} fontSize="11" fill="#f1f5f9" textAnchor="end">{mol}</text>
            <text x={PAD_L+bw+8} y={y+BAR_H/2+4} fontSize="11" fill={BAR_COLORS[i%BAR_COLORS.length]} fontWeight="bold">{count}</text>
          </g>);
        })}
      </svg>
    </div>
  );

  return (
    <>
    {fullscreen&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}} onClick={()=>setFullscreen(false)}>
      <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <Card><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}><div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Molécules les plus utilisées</div><div style={{display:"flex",gap:8}}><ChartExportBtn onClick={exportThisChart}/><button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button></div></div>{filtersJsx}{bodyJsx}</Card>
      </div>
    </div>)}
    {!collapsed&&(<Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Molécules les plus utilisées</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>− Masquer</button>
          <button onClick={()=>setFullscreen(true)} style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>⛶ Agrandir</button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {filtersJsx}{bodyJsx}
    </Card>)}
    {collapsed&&(<div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:12,color:"#94a3b8"}}>Molécules les plus utilisées — masqué</span>
      <span style={{fontSize:11,color:"#8b5cf6",fontWeight:700}}>+ Afficher</span>
    </div>)}
    </>
  );
}

function Statistiques() {
  const [passages, setPassages]       = useState([]);
  const [postes, setPostes]           = useState(POSTES_INIT);
  const [actions, setActions]         = useState([]);
  const [reinterventions, setReinterventions] = useState([]);
  const [filterNuisible, setFilterNuisible] = useState("Tous");
  const [filterMacro, setFilterMacro]       = useState("Toutes");
  const [filterPoste, setFilterPoste]       = useState("Tous");
  const [filterAnnee, setFilterAnnee]       = useState("Toutes");
  const [selectedAnnees, setSelectedAnnees] = useState([]);
  const [filterTrimestre, setFilterTrimestre] = useState("Tous");
  const [filterMois, setFilterMois]         = useState("Tous");
  const [showStatutGraph, setShowStatutGraph] = useState(false);

  const NUISIBLES_ALL = ["Tous","Rongeurs","Blattes","Insectes volants","Teignes","IPS"];
  const MACROS_ALL    = ["Toutes",...MACROS];
  const MOIS_LABELS   = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];
  const CATS_IV = ["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"];

  useEffect(() => {
    sbGet("passages").then(data => { if (data && data.length > 0) setPassages(data); }).catch(()=>{});
    sbGet("postes").then(data => { if (data && data.length > 0) setPostes(data); }).catch(()=>{});
    sbGet("plan_actions").then(data => { if (data && data.length > 0) setActions(data); }).catch(()=>{});
    sbGet("reinterventions").then(data => { if (data && data.length > 0) setReinterventions(data); }).catch(()=>{});
  }, []);

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };

  // Annees disponibles
  const annees = [...new Set(passages.map(p=>{ const d=pd(p.date); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);

  // Filtrer passages par periode
  function filterPassagesByPeriode(list, anneeFilter) {
    return list.filter(p => {
      const d = pd(p.date);
      if (!d) return false;
      if (anneeFilter && anneeFilter !== "Toutes") {
        if (d.getFullYear() !== parseInt(anneeFilter)) return false;
      } else if (selectedAnnees.length > 0) {
        if (!selectedAnnees.includes(d.getFullYear())) return false;
      } else if (filterAnnee !== "Toutes") {
        if (d.getFullYear() !== parseInt(filterAnnee)) return false;
      }
      if (filterTrimestre !== "Tous") {
        const t = Math.ceil((d.getMonth()+1)/3);
        if (t !== parseInt(filterTrimestre)) return false;
      }
      if (filterMois !== "Tous" && d.getMonth() !== parseInt(filterMois)) return false;
      return true;
    }).sort((a,b) => pd(a.date)-pd(b.date));
  }

  // Postes filtres par macro et nuisible
  const postesFiltres = postes.filter(p => {
    if (filterNuisible !== "Tous" && (p.nuisible||"Rongeurs") !== filterNuisible) return false;
    if (filterMacro !== "Toutes" && p.macro !== filterMacro) return false;
    if (filterPoste !== "Tous" && p.id !== filterPoste) return false;
    return true;
  });
  const posteIds = new Set(postesFiltres.map(p => p.id));

  function getPassageStats(passage) {
    const saisies = typeof passage.saisies === "string" ? JSON.parse(passage.saisies||"{}") : (passage.saisies||{});
    let actifs = 0, total = 0, captures = 0;
    // Taux d'activité ne porte QUE sur les postes Rongeurs, peu importe le filtre nuisible actif
    // Le total est le nombre REEL de postes rongeurs du site (pas seulement ceux saisis)
    const postesRongeurs = postes.filter(p => (p.nuisible||"Rongeurs") === "Rongeurs");
    total = postesRongeurs.length;
    postesRongeurs.forEach(poste => {
      const id = poste.id;
      const s = saisies[id];
      if (!s) return; // poste non saisi = considere non actif, mais compte dans le total
      const etat = s.etat||"";
      const capR = (parseInt(s.cap_souris||0))+(parseInt(s.cap_ratBrun||0))+(parseInt(s.cap_ratNoir||0));
      const isActif = estConsoQuelconque(etat)||capR>0;
      if (!isNaN(parseFloat(etat)) && parseFloat(etat)>0) captures += parseFloat(etat);
      captures += capR;
      if (isActif) actifs++;
    });
    const tauxActivite = total > 0 ? Math.round(actifs/total*100) : 0;
    return { date: passage.date, tauxActivite, captures, actifs, total };
  }

  const passagesFiltres = filterPassagesByPeriode(passages);
  const stats = passagesFiltres.map(getPassageStats);
  const anneeRef = selectedAnnees.length>0 ? selectedAnnees[0] : filterAnnee!=="Toutes" ? parseInt(filterAnnee) : new Date().getFullYear();

  const ANNEE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  const anneesAffichees = selectedAnnees.length > 0 ? selectedAnnees.sort() : (filterAnnee !== "Toutes" ? [parseInt(filterAnnee)] : []);
  const statsParAnnee = anneesAffichees.map((annee, idx) => {
    const passagesAnnee = filterPassagesByPeriode(passages, String(annee));
    return { annee, color: ANNEE_COLORS[idx % ANNEE_COLORS.length], stats: passagesAnnee.map(p => getPassageStats(p)), passages: passagesAnnee };
  });

  const W = 600, H = 200, PAD = 40;
  const maxTaux = 100;
  const maxCaptures = Math.max(...stats.map(s=>s.captures), 1);
  function xPos(i) { return PAD + (stats.length > 1 ? i/(stats.length-1)*(W-PAD*2) : (W-PAD*2)/2); }
  function yTaux(v) { return H - PAD - (v/maxTaux)*(H-PAD*2); }
  function yCapt(v) { return H - PAD - (v/maxCaptures)*(H-PAD*2); }
  const seuils = { vigilance: CLIENT_CONFIG.seuil_vigilance||5, critique: CLIENT_CONFIG.seuil_critique||10 };
  const yVigilance = yTaux(seuils.vigilance);
  const yCritique = yTaux(seuils.critique);
  const inpStyle = { background:"#243352", border:"1px solid #3d5270", borderRadius:7, padding:"6px 10px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };

  return (
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4,flexWrap:"wrap",gap:10}}>
        <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9"}}>Tendances</div>
        <button onClick={()=>{
          const zone = document.getElementById("tendances-export-zone");
          if (!zone) return;
          const w = window.open("","_blank");
          w.document.write("<html><head><title>Tendances - "+CLIENT_CONFIG.nom+"</title>");
          w.document.write("<style>body{font-family:sans-serif;margin:20px;color:#111827;} svg{max-width:100%;} table{border-collapse:collapse;width:100%;margin-bottom:8px;} h1{color:#0f2864;border-bottom:3px solid #0f2864;padding-bottom:8px;} h2,h3{color:#0f2864;margin-top:24px;} .chart-block{page-break-inside:avoid;margin-bottom:28px;border-bottom:1px solid #e5e7eb;padding-bottom:20px;} @media print{body{margin:0;padding:16px;}}</style>");
          w.document.write("</head><body>");
          if (TOQUE_LOGO) w.document.write("<div style='display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #0f2864'><img src='"+TOQUE_LOGO+"' alt='Logo client' style='height:50px;width:auto;object-fit:contain'/><div style='font-size:11px;color:#6b7280'>"+CLIENT_CONFIG.nom+"<br/>Contrat "+CLIENT_CONFIG.contrat+"</div></div>");
          w.document.write("<h1>Tendances - "+CLIENT_CONFIG.nom+"</h1>");
          w.document.write("<p style='color:#6b7280;margin-bottom:20px'>"+new Date().toLocaleDateString("fr-FR")+"</p>");
          // Cloner chaque carte de la zone, en retirant les boutons d'export individuels
          const cards = zone.querySelectorAll(".export-card-block");
          cards.forEach(card=>{
            const clone = card.cloneNode(true);
            clone.querySelectorAll("button").forEach(b=>b.remove());
            // Si le graphique est actuellement masque (bandeau "+ Afficher"), on l'indique
            const collapsedBanner = clone.querySelector("span");
            const isCollapsedBlock = clone.children.length===1 && clone.textContent.includes("masque");
            if (isCollapsedBlock) {
              w.document.write("<div class='chart-block'><p style='color:#9ca3af;font-style:italic'>"+clone.textContent.replace(" + Afficher","").trim()+" (graphique masque dans l'interface - non inclus)</p></div>");
            } else {
              w.document.write("<div class='chart-block'>"+clone.innerHTML+"</div>");
            }
          });
          w.document.write("<div style='display:flex;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid #e5e7eb;padding-top:10px;margin-top:20px;font-size:9px;color:#6b7280'><div style='display:flex;align-items:center;gap:10px'>"+(BANNER_IMG?"<img src='"+BANNER_IMG+"' alt='AADS' style='height:24px;width:auto;object-fit:contain'/>":"")+"<div><div style='font-weight:700;color:#374151'>ANJOU ASSAINISSEMENT DERATISATION SERVICES</div><div>"+(AADS_CONFIG.adresse||"")+(AADS_CONFIG.siret?" - SIRET "+AADS_CONFIG.siret:"")+"</div></div></div><div>"+CLIENT_CONFIG.nom+" - Contrat "+CLIENT_CONFIG.contrat+" - "+new Date().toLocaleDateString("fr-FR")+"</div></div>");
          w.document.write("</body></html>");
          w.document.close();
          setTimeout(()=>w.print(),600);
        }} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:9,padding:"10px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          Export PDF - Tout
        </button>
      </div>

      {passages.length === 0 ? (
        <Card><div style={{textAlign:"center",color:"#5a7090",padding:30}}>Aucun passage saisi.</div></Card>
      ) : stats.length === 0 ? (
        <Card><div style={{textAlign:"center",color:"#5a7090",padding:30}}>Aucun passage pour cette periode.</div></Card>
      ) : (
        <div id="tendances-export-zone">
          {/* Taux d activite - composant autonome avec ses propres filtres */}
          <div className="export-card-block">
            <TauxActiviteChart passages={passages} postes={postes} />
          </div>

          {/* Postes touchés - composant autonome avec ses propres filtres */}
          <div className="export-card-block">
            <PostesTouchesChart passages={passages} postes={postes} />
          </div>

          {/* Captures - composant autonome avec ses propres filtres */}
          <div className="export-card-block">
            <CapturesChart passages={passages} postes={postes} />
          </div>
          <div className="export-card-block">
            <ToxiquePlaceboChart passages={passages} postes={postes} />
          </div>
          <div className="export-card-block">
            <MoleculesChart passages={passages} postes={postes} />
          </div>

          {/* Graphes avances */}
          <div className="export-card-block"><DeivEvolutionStandaloneChart passages={passages} /></div>
          <div className="export-card-block"><TeignesEvolutionChart passages={passages} postes={postes} /></div>
          <div className="export-card-block"><DeivParAppareilChart passages={passages} postes={postes} /></div>
          <div className="export-card-block"><ReinterPassagesChart passages={passages} reinterventions={reinterventions} /></div>
          <div className="export-card-block"><Top10PostesChart passages={passages} postes={postes} /></div>
          <div className="export-card-block"><PassagesParAnneeChart passages={passages} reinterventions={reinterventions} /></div>
          <div className="export-card-block"><PlanActionsPieChart actions={actions} /></div>
          <div className="export-card-block"><PostesNuisiblePieChart postes={postes} /></div>
        </div>
      )}
    </div>
  );
}

function BarChartHorizontal({ data, title, chartKey, color }) {
  const key = chartKey || title.replace(/[^a-zA-Z0-9]/g,"_");
  const [collapsed, setCollapsed] = usePersistedCollapsed(key, false);
  const [fullscreen, setFullscreen] = useState(false);

  const sorted = (data||[]).filter(d=>d.value>0).sort((a,b)=>b.value-a.value);
  const total = sorted.reduce((s,d)=>s+d.value,0);
  const isEmpty = sorted.length === 0;
  const maxVal = Math.max(...sorted.map(d=>d.value), 1);

  function exportThisChart() {
    if (isEmpty) { exportChartCard(title, "<p style='color:#9ca3af'>Aucune donnee disponible.</p>"); return; }
    const rows = sorted.map(d=>"<tr><td style='padding:6px 10px;border:1px solid #e5e7eb'>"+d.label+"</td><td style='padding:6px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700'>"+d.value+"</td></tr>").join("");
    exportChartCard(title, "<table style='width:100%;border-collapse:collapse'><thead><tr><th style='padding:6px 10px;border:1px solid #e5e7eb;text-align:left'>Categorie</th><th style='padding:6px 10px;border:1px solid #e5e7eb'>Nb actions</th></tr></thead><tbody>"+rows+"</tbody></table><p style='margin-top:12px;font-weight:700'>Total : "+total+"</p>");
  }

  const bodyJsx = isEmpty ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucune donnee disponible.</div>
  ) : (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {sorted.map((d,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:11,color:"#f1f5f9",width:160,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={d.label}>{d.label}</div>
          <div style={{flex:1,background:"#1a2540",borderRadius:4,height:16,overflow:"hidden"}}><div style={{background:color||"#3b82f6",width:(d.value/maxVal*100)+"%",height:"100%",borderRadius:4}}/></div>
          <div style={{fontSize:11,fontWeight:700,color:color||"#3b82f6",width:30,textAlign:"right",flexShrink:0}}>{d.value}</div>
        </div>
      ))}
    </div>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:700,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>{title} ({total})</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}
    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{title} ({total})</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>{title} - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}

function EvolutionActionsChart({ actions }) {
  const [collapsed, setCollapsed] = usePersistedCollapsed("EvolutionActions", false);
  const [fullscreen, setFullscreen] = useState(false);
  const [filterAnnee, setFilterAnnee] = usePersistedValue("EvolutionActions_filterAnnee", anneeDefaut(actions, "dateDetection"));

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const MOIS_LABELS = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];
  const annees = [...new Set(actions.map(a=>{ const d=pd(a.dateDetection); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);

  const actionsFiltrees = filterAnnee==="Toutes" ? actions : actions.filter(a=>{ const d=pd(a.dateDetection); return d && d.getFullYear()===parseInt(filterAnnee); });

  // Grouper par mois (cree) et par mois (resolue, approxime via meme date faute de date de resolution trackee)
  const byMois = {};
  actionsFiltrees.forEach(a=>{
    const d = pd(a.dateDetection);
    if (!d || isNaN(d)) return;
    const key = filterAnnee==="Toutes" ? d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0") : MOIS_LABELS[d.getMonth()];
    if (!byMois[key]) byMois[key] = { créées: 0, résolues: 0 };
    byMois[key].créées++;
    if (a.statut === "Résolue") byMois[key].résolues++;
  });
  const moisKeys = Object.keys(byMois).sort();
  const isEmpty = moisKeys.length === 0;

  const W = fullscreen ? 1100 : 700, H = fullscreen ? 420 : 260, PAD = 50;
  const maxVal = Math.max(...moisKeys.map(k=>byMois[k].créées), 1);
  function xPos(i) { return PAD + (moisKeys.length > 1 ? i/(moisKeys.length-1)*(W-PAD*2) : (W-PAD*2)/2); }
  function yVal(v) { return H - PAD - (v/maxVal)*(H-PAD*2); }

  function exportThisChart() {
    if (isEmpty) { exportChartCard("Évolution des actions", "<p style='color:#9ca3af'>Aucune donnee disponible.</p>"); return; }
    const W2=W, H2=H, PAD2=PAD;
    function xPos2(i) { return PAD2 + (moisKeys.length > 1 ? i/(moisKeys.length-1)*(W2-PAD2*2) : (W2-PAD2*2)/2); }
    function yVal2(v) { return H2-PAD2-(v/maxVal)*(H2-PAD2*2); }
    const ptsCreees = moisKeys.map(function(k,i){ return xPos2(i)+","+yVal2(byMois[k].créées); }).join(" ");
    const ptsResolues = moisKeys.map(function(k,i){ return xPos2(i)+","+yVal2(byMois[k].résolues); }).join(" ");
    const circles = moisKeys.map(function(k,i){
      const x=xPos2(i);
      return "<circle cx='"+x+"' cy='"+yVal2(byMois[k].créées)+"' r='4' fill='#3b82f6'/>"+
             "<circle cx='"+x+"' cy='"+yVal2(byMois[k].résolues)+"' r='4' fill='#22c55e'/>"+
             "<text x='"+x+"' y='"+(H2-8)+"' font-size='8' fill='#6b7280' text-anchor='middle'>"+k+"</text>";
    }).join("");
    const svgChart = "<svg width='"+W2+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+
      (moisKeys.length>1?"<polyline points='"+ptsCreees+"' fill='none' stroke='#3b82f6' stroke-width='2'/><polyline points='"+ptsResolues+"' fill='none' stroke='#22c55e' stroke-width='2'/>":"")+
      circles+"</svg>";
    const legendHtml = "<span style='display:inline-flex;align-items:center;gap:6px;margin-right:18px'><span style='width:11px;height:11px;border-radius:50%;background:#3b82f6;display:inline-block'></span>Créées</span><span style='display:inline-flex;align-items:center;gap:6px'><span style='width:11px;height:11px;border-radius:50%;background:#22c55e;display:inline-block'></span>Résolues</span>";
    const rows = moisKeys.map(k=>"<tr><td>"+k+"</td><td style='font-weight:700;color:#3b82f6'>"+byMois[k].créées+"</td><td style='font-weight:700;color:#22c55e'>"+byMois[k].résolues+"</td></tr>").join("");
    exportChartCard("Évolution des actions (créées vs résolues)",
      svgChart+
      "<div style='padding:10px 0;font-size:12px;color:#374151'>"+legendHtml+"</div>"+
      "<table style='width:100%;border-collapse:collapse;margin-top:8px'><thead><tr><th>Periode</th><th>Créées</th><th>Résolues</th></tr></thead><tbody>"+rows+"</tbody></table>"
    );
  }

  const bodyJsx = isEmpty ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucune donnee disponible.</div>
  ) : (
    <>
    <div style={{display:"flex",gap:14,marginBottom:8}}>{[["#3b82f6","Créées"],["#22c55e","Résolues"]].map(([c,l])=>(<div key={l} style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:12,height:12,background:c,borderRadius:2,display:"inline-block"}}/><span style={{fontSize:10,color:"#7a90aa"}}>{l}</span></div>))}</div>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {[0,25,50,75,100].map(pct=>{ const v=Math.round(maxVal*pct/100); const y=yVal(v); return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>); })}
        {moisKeys.length>1&&<polyline points={moisKeys.map((k,i)=>xPos(i)+","+yVal(byMois[k].créées)).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round"/>}
        {moisKeys.length>1&&<polyline points={moisKeys.map((k,i)=>xPos(i)+","+yVal(byMois[k].résolues)).join(" ")} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round"/>}
        {moisKeys.map((k,i)=>(
          <g key={k}>
            <circle cx={xPos(i)} cy={yVal(byMois[k].créées)} r="4" fill="#3b82f6" stroke="#1a2540" strokeWidth="1.5"/>
            <circle cx={xPos(i)} cy={yVal(byMois[k].résolues)} r="4" fill="#22c55e" stroke="#1a2540" strokeWidth="1.5"/>
            <text x={xPos(i)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle" transform={"rotate(-30 "+xPos(i)+" "+(H-8)+")"}>{k}</text>
          </g>
        ))}
      </svg>
    </div>
    </>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Évolution des actions (créées vs résolues)</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <select value={filterAnnee} onChange={e=>setFilterAnnee(e.target.value)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:7,padding:"6px 10px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit"}}>
                <option value="Toutes">Toutes années</option>
                {annees.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}
    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Évolution des actions (créées vs résolues)</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <select value={filterAnnee} onChange={e=>setFilterAnnee(e.target.value)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:7,padding:"6px 10px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit"}}>
          <option value="Toutes">Toutes années</option>
          {annees.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Evolution des actions - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}


function ComparaisonAnneesActionsChart({ actions }) {
  const [collapsed, setCollapsed] = usePersistedCollapsed("ComparaisonAnnees", false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = usePersistedValue("ComparaisonAnneesActions_mode", "créées"); // créées | résolues
  const [selectedAnnees, setSelectedAnnees] = usePersistedValue("ComparaisonAnneesActions_selectedAnnees", []);

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const MOIS_LABELS = ["Jan.","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Dec"];

  const actionsFiltrees = mode === "résolues" ? actions.filter(a=>a.statut==="Résolue") : actions;
  const annees = [...new Set(actionsFiltrees.map(a=>{ const d=pd(a.dateDetection); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);
  const anneesAffichees = selectedAnnees.length > 0 ? selectedAnnees : annees;

  const ANNEE_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4"];
  const statsParAnnee = anneesAffichees.sort().map((annee, idx) => {
    const byMois = Array(12).fill(0);
    actionsFiltrees.forEach(a=>{
      const d = pd(a.dateDetection);
      if (d && !isNaN(d) && d.getFullYear()===annee) byMois[d.getMonth()]++;
    });
    return { annee, color: ANNEE_COLORS[idx % ANNEE_COLORS.length], byMois };
  });

  const isEmpty = statsParAnnee.length === 0 || statsParAnnee.every(sa=>sa.byMois.every(v=>v===0));
  const W = fullscreen ? 1100 : 700, H = fullscreen ? 420 : 260, PAD = 50;
  const maxVal = Math.max(...statsParAnnee.flatMap(sa=>sa.byMois), 1);
  function xPos(i) { return PAD + i/11*(W-PAD*2); }
  function yVal(v) { return H - PAD - (v/maxVal)*(H-PAD*2); }

  function exportThisChart() {
    if (isEmpty) { exportChartCard("Comparaison années — actions "+(mode==="résolues"?"résolues":"créées"), "<p style='color:#9ca3af'>Aucune donnee disponible.</p>"); return; }
    const W2=W, H2=H, PAD2=PAD;
    function xPos2(i) { return PAD2 + i/11*(W2-PAD2*2); }
    function yVal2(v) { return H2-PAD2-(v/maxVal)*(H2-PAD2*2); }
    const linesSvg = statsParAnnee.map(function(sa){
      const pts = sa.byMois.map(function(v,i){ return xPos2(i)+","+yVal2(v); }).join(" ");
      const circles = sa.byMois.map(function(v,i){ const x=xPos2(i),y=yVal2(v); return "<circle cx='"+x+"' cy='"+y+"' r='4' fill='"+sa.color+"'/>"+(v>0?"<text x='"+x+"' y='"+(y-9)+"' font-size='8' fill='"+sa.color+"' text-anchor='middle'>"+v+"</text>":""); }).join("");
      return "<polyline points='"+pts+"' fill='none' stroke='"+sa.color+"' stroke-width='2'/>"+circles;
    }).join("");
    const moisLabelsSvg = MOIS_LABELS.map(function(m,i){ return "<text x='"+xPos2(i)+"' y='"+(H2-8)+"' font-size='9' fill='#6b7280' text-anchor='middle'>"+m+"</text>"; }).join("");
    const svgChart = "<svg width='"+W2+"' height='"+H2+"' xmlns='http://www.w3.org/2000/svg' style='background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb'>"+linesSvg+moisLabelsSvg+"</svg>";
    const legendHtml = statsParAnnee.map(sa=>"<span style='display:inline-flex;align-items:center;gap:6px;margin-right:18px'><span style='width:11px;height:11px;border-radius:50%;background:"+sa.color+";display:inline-block'></span>"+sa.annee+" ("+sa.byMois.reduce((a,b)=>a+b,0)+")</span>").join("");
    const header = "<th>Mois</th>"+statsParAnnee.map(sa=>"<th style='color:"+sa.color+"'>"+sa.annee+"</th>").join("");
    const rows = MOIS_LABELS.map((m,i)=>"<tr><td>"+m+"</td>"+statsParAnnee.map(sa=>"<td style='font-weight:700'>"+sa.byMois[i]+"</td>").join("")+"</tr>").join("");
    exportChartCard("Comparaison années — actions "+(mode==="résolues"?"résolues":"créées"),
      svgChart+
      "<div style='padding:10px 0;font-size:12px;color:#374151'>"+legendHtml+"</div>"+
      "<table style='width:100%;border-collapse:collapse;margin-top:8px'><thead><tr>"+header+"</tr></thead><tbody>"+rows+"</tbody></table>"
    );
  }

  const bodyJsx = isEmpty ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucune donnee disponible.</div>
  ) : (
    <>
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {[0,25,50,75,100].map(pct=>{ const v=Math.round(maxVal*pct/100); const y=yVal(v); return(<g key={pct}><line x1={PAD} x2={W-PAD} y1={y} y2={y} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={y+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}</text></g>); })}
        {MOIS_LABELS.map((m,i)=>(<text key={m} x={xPos(i)} y={H-8} fontSize="9" fill="#5a7090" textAnchor="middle">{m}</text>))}
        {statsParAnnee.map((sa,ai)=>(
          <g key={sa.annee}>
            <polyline points={sa.byMois.map((v,i)=>xPos(i)+","+yVal(v)).join(" ")} fill="none" stroke={sa.color} strokeWidth="2.5" strokeDasharray={ai>0?"6,3":""} strokeLinejoin="round"/>
            {sa.byMois.map((v,i)=>(<g key={i}><circle cx={xPos(i)} cy={yVal(v)} r="4" fill={sa.color} stroke="#1a2540" strokeWidth="1.5"/>{v>0&&<text x={xPos(i)} y={yVal(v)-9} fontSize="8" fill={sa.color} textAnchor="middle">{v}</text>}</g>))}
          </g>
        ))}
      </svg>
    </div>
    <div style={{display:"flex",gap:16,marginTop:10,flexWrap:"wrap"}}>
      {statsParAnnee.map(sa=>(<div key={sa.annee} style={{display:"flex",alignItems:"center",gap:5}}><svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke={sa.color} strokeWidth="2.5"/></svg><span style={{fontSize:11,color:sa.color,fontWeight:700}}>{sa.annee} ({sa.byMois.reduce((a,b)=>a+b,0)})</span></div>))}
    </div>
    </>
  );

  const filtersJsx = (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:14,paddingBottom:14,borderBottom:"1px solid #243352"}}>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Mode</label>
        <div style={{display:"flex",gap:4}}>
          {[["créées","Créées"],["résolues","Résolues"]].map(([id,label])=>(
            <button key={id} onClick={()=>setMode(id)}
              style={{background:mode===id?"#1d4ed8":"#243352",color:mode===id?"#fff":"#94a3b8",border:"1px solid "+(mode===id?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 12px",fontSize:11,fontWeight:mode===id?700:500,cursor:"pointer",fontFamily:"inherit"}}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Annee(s)</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {annees.map(a=>{
            const isSel = selectedAnnees.includes(a);
            return (<button key={a} onClick={()=>setSelectedAnnees(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])}
              style={{background:isSel?"#1d4ed8":"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?"#3b82f6":"#3d5270"),borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>);
          })}
          {selectedAnnees.length>0&&<button onClick={()=>setSelectedAnnees([])} style={{background:"transparent",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"6px 8px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>x</button>}
        </div>
      </div>
    </div>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Comparaison annees - actions {mode==="résolues"?"résolues":"créées"}</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {filtersJsx}
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}
    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Comparaison annees - actions {mode==="résolues"?"résolues":"créées"}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {filtersJsx}
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Comparaison annees - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}


function PrioriteActionsChart({ actions }) {
  const [collapsed, setCollapsed] = usePersistedCollapsed("PlanActions_Priorite", false);
  const [fullscreen, setFullscreen] = useState(false);
  const [filterAnnee, setFilterAnnee] = usePersistedValue("PrioriteActions_filterAnnee", anneeDefaut(actions, "dateDetection"));

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const annees = [...new Set(actions.map(a=>{ const d=pd(a.dateDetection); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>a-b);

  const actionsFiltrees = filterAnnee==="Toutes" ? actions : actions.filter(a=>{ const d=pd(a.dateDetection); return d && d.getFullYear()===parseInt(filterAnnee); });

  const PRIORITES = ["haute","moyenne","basse"];
  const PCOLOR = { haute:"#ef4444", moyenne:"#f59e0b", basse:"#3b82f6" };
  const sorted = PRIORITES.map(p=>({label:p.charAt(0).toUpperCase()+p.slice(1), value: actionsFiltrees.filter(a=>a.priorite===p).length, color: PCOLOR[p]})).filter(d=>d.value>0).sort((a,b)=>b.value-a.value);
  const total = sorted.reduce((s,d)=>s+d.value,0);
  const isEmpty = sorted.length === 0;
  const maxVal = Math.max(...sorted.map(d=>d.value), 1);

  function exportThisChart() {
    if (isEmpty) { exportChartCard("Répartition par priorité", "<p style='color:#9ca3af'>Aucune donnee disponible.</p>"); return; }
    const rows = sorted.map(d=>"<tr><td style='padding:6px 10px;border:1px solid #e5e7eb'>"+d.label+"</td><td style='padding:6px 10px;border:1px solid #e5e7eb;text-align:right;font-weight:700'>"+d.value+"</td></tr>").join("");
    exportChartCard("Répartition par priorité", "<p style='color:#6b7280'>Periode : "+(filterAnnee==="Toutes"?"Toutes années":filterAnnee)+"</p><table style='width:100%;border-collapse:collapse'><thead><tr><th style='padding:6px 10px;border:1px solid #e5e7eb;text-align:left'>Priorité</th><th style='padding:6px 10px;border:1px solid #e5e7eb'>Nb actions</th></tr></thead><tbody>"+rows+"</tbody></table><p style='margin-top:12px;font-weight:700'>Total : "+total+"</p>");
  }

  const filtersJsx = (
    <div style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #243352"}}>
      <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:3}}>Annee</label>
      <select value={filterAnnee} onChange={e=>setFilterAnnee(e.target.value)}
        style={{background:"#243352",border:"1px solid #3d5270",borderRadius:7,padding:"6px 10px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit"}}>
        <option value="Toutes">Toutes années</option>
        {annees.map(a=><option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );

  const bodyJsx = isEmpty ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucune donnee disponible.</div>
  ) : (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {sorted.map((d,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:11,color:"#f1f5f9",width:80,flexShrink:0}}>{d.label}</div>
          <div style={{flex:1,background:"#1a2540",borderRadius:4,height:16,overflow:"hidden"}}><div style={{background:d.color,width:(d.value/maxVal*100)+"%",height:"100%",borderRadius:4}}/></div>
          <div style={{fontSize:11,fontWeight:700,color:d.color,width:30,textAlign:"right",flexShrink:0}}>{d.value}</div>
        </div>
      ))}
    </div>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:700,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Répartition par priorité ({total})</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {filtersJsx}
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}
    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Répartition par priorité ({total})</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {filtersJsx}
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Répartition par priorité - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}


function PlanActions() {
  const TECHNICIENS = useTechniciens();
  const [actions, setActions] = useState(ACTIONS_INIT.map(a => ({ ...a, photos: a.photos || [] })));
  const [prevActions, setPrevActions] = useState(null);
  const [filter, setFilter] = useState("Toutes");
  const [filterAnneeTable, setFilterAnneeTable] = useState("Toutes");
  const [filterMoisTable, setFilterMoisTable] = useState("Tous");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState({ titre5m: "Méthode", type: "corrective", priorite: "haute", zone: "", description: "", recommandation: "", technicien: "", piegeRef: "", dateDetection: new Date().toLocaleDateString("fr-FR") });
  const [draftPhotos, setDraftPhotos] = useState([]);
  const [zonesList, setZonesList] = useState(["Extérieur", "Intérieur", "Locaux techniques", "Combles", "Emballages", "Conditionnement", "Maintenance", "Stockage"]);
  const [newZoneInput, setNewZoneInput] = useState("");

  const ZONES_CONFIG_ID = CLIENT_CONFIG.contrat + "_zones_actions";

  function addZone(value) {
    const v = value.trim();
    if (!v || zonesList.includes(v)) return;
    const next = [...zonesList, v];
    setZonesList(next);
    setDraft(p => ({ ...p, zone: v }));
    setNewZoneInput("");
    sbUpsert("seuils", { id: ZONES_CONFIG_ID, contrat: CLIENT_CONFIG.contrat, data: JSON.stringify(next) })
      .catch(()=>{});
  }

  const SCOLOR = { "En cours": "#f59e0b", "Planifiée": "#3b82f6", "Résolue": "#22c55e", Vigilance: "#f59e0b" };
  const PCOLOR = { haute: "#ef4444", moyenne: "#f59e0b", basse: "#3b82f6" };
  const CINQ_M = ["Méthode", "Milieu", "Matière", "Main d'oeuvre", "Matériel"];
  const ZONES = zonesList;

  // Charger la liste des zones sauvegardee cote serveur
  useEffect(() => {
    sbFetch("seuils?id=eq." + encodeURIComponent(ZONES_CONFIG_ID), "GET").then(data => {
      if (data && data.length > 0 && data[0].data) {
        try {
          const parsed = typeof data[0].data === "string" ? JSON.parse(data[0].data) : data[0].data;
          if (Array.isArray(parsed) && parsed.length > 0) setZonesList(parsed);
        } catch(_e) { return; }
      }
    }).catch(()=>{});
  }, []);

  // Charger depuis Supabase
  useEffect(() => {
    sbGet("plan_actions").then(data => {
      if (data && data.length > 0) {
        setActions(data.map(a => ({
          ...a,
          titre5m: a.titre5m||a.titre||"Méthode",
          dateDetection: a.date_detection||a.dateDetection||"",
          piegeRef: a.piege_ref||a.piegeRef||"",
          photos: typeof a.photos === "string" ? JSON.parse(a.photos || "[]") : (a.photos || [])
        })).sort((x,y)=>{
          const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0);};
          return pd(y.dateDetection)-pd(x.dateDetection);
        }));
      }
    }).catch(() => {});
  }, []);

  function resetDraft() {
    setDraft({ titre5m: "Méthode", type: "corrective", priorite: "haute", zone: "", description: "", recommandation: "", technicien: "", piegeRef: "", dateDetection: new Date().toLocaleDateString("fr-FR") });
    setDraftPhotos([]);
    setEditId(null);
  }

  function openNew() {
    resetDraft();
    setShowForm(true);
  }

  function openEdit(a) {
    setDraft({ titre5m: a.titre5m||"Méthode", type: a.type, priorite: a.priorite, zone: a.zone, description: a.description, recommandation: a.recommandation, technicien: a.technicien || "", piegeRef: a.piegeRef || "", dateDetection: a.dateDetection || new Date().toLocaleDateString("fr-FR") });
    setDraftPhotos(a.photos || []);
    setEditId(a.id);
    setShowForm(true);
  }

  function handlePhotoAdd(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => {
        const photo = { url: ev.target.result, name: file.name, date: new Date().toLocaleDateString("fr-FR") };
        setDraftPhotos(prev => [...prev, photo]);
      };
      r.readAsDataURL(file);
    });
  }

  function saveAction() {
    setPrevActions(actions);
    if (editId !== null) {
      setActions(prev => prev.map(a => {
        if (a.id !== editId) return a;
        const updated = { ...a, ...draft, photos: draftPhotos };
        sbUpsert("plan_actions", { id:updated.id, contrat:CLIENT_CONFIG.contrat, titre5m:draft.titre5m, type:draft.type, priorite:draft.priorite, zone:draft.zone, description:draft.description, recommandation:draft.recommandation, technicien:draft.technicien, piege_ref:draft.piegeRef||"", statut:updated.statut||"Planifiée", date_detection:updated.dateDetection||"", photos:JSON.stringify(draftPhotos) });
        return updated;
      }));
    } else {
      const newId = String(Date.now());
      const newAction = { ...draft, id: newId, statut: "Planifiée", photos: draftPhotos, dateDetection: draft.dateDetection || new Date().toLocaleDateString("fr-FR") };
      setActions(prev => [newAction, ...prev]);
      const actionData = { id:newId, contrat:CLIENT_CONFIG.contrat, titre5m:draft.titre5m, type:draft.type, priorite:draft.priorite, zone:draft.zone, description:draft.description, recommandation:draft.recommandation, technicien:draft.technicien, piege_ref:draft.piegeRef||"", statut:"Planifiée", date_detection:newAction.dateDetection, photos:JSON.stringify(draftPhotos) };
      if (navigator.onLine) {
        sbUpsert("plan_actions", actionData);
      } else {
        savePendingSaisie({ id:"pending_action_"+newId, data:actionData, table:"plan_actions" }).then(()=>{
          if (window.__setPendingCount) getPendingSaisies().then(p=>window.__setPendingCount(p.length)).catch(()=>{});
          alert("Action sauvegardée localement. Elle sera synchronisée dès que vous serez en ligne.");
        }).catch(()=>{});
      }
    }
    resetDraft();
    setShowForm(false);
  }

  function deleteAction(id) {
    setPrevActions(actions);
    setActions(prev => prev.filter(a => a.id !== id));
    sbDelete("plan_actions", id);
  }

  function changeStatut(id, statut) {
    setActions(prev => prev.map(a => {
      if (a.id !== id) return a;
      const updated = { ...a, statut };
      sbUpsert("plan_actions", {
        id: updated.id, contrat: CLIENT_CONFIG.contrat,
        titre5m: updated.titre5m, type: updated.type, priorite: updated.priorite, zone: updated.zone,
        description: updated.description, recommandation: updated.recommandation, technicien: updated.technicien,
        piege_ref: updated.piegeRef||"",
        statut: updated.statut, date_detection: updated.dateDetection||"",
        photos: JSON.stringify(updated.photos || [])
      });
      return updated;
    }));
  }

  const filteredByStatut = filter === "Toutes" ? actions : actions.filter(a => a.statut === filter);
  const pdFilter = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const anneesDispoTable = [...new Set(actions.map(a=>{ const d=pdFilter(a.dateDetection); return d&&!isNaN(d)?d.getFullYear():null; }).filter(Boolean))].sort((a,b)=>b-a);
  const MOIS_LABELS_TABLE = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];
  const filtered = filteredByStatut.filter(a => {
    const d = pdFilter(a.dateDetection);
    if (filterAnneeTable !== "Toutes") {
      if (!d || isNaN(d) || d.getFullYear() !== parseInt(filterAnneeTable)) return false;
    }
    if (filterMoisTable !== "Tous") {
      if (!d || isNaN(d) || d.getMonth() !== parseInt(filterMoisTable)) return false;
    }
    return true;
  }).slice().sort((a, b) => pdFilter(b.dateDetection) - pdFilter(a.dateDetection));

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 2 }}>Plan d'actions</div>
          <div style={{ fontSize: 13, color: "#7a90aa" }}>{actions.length} fiches — correctives et préventives</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {prevActions && (
            <button onClick={()=>{setActions(prevActions);setPrevActions(null);}}
              style={{ background:"#f59e0b22", color:"#f59e0b", border:"1px solid #f59e0b44", borderRadius:9, padding:"10px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              ↩ Annuler
            </button>
          )}
          <ExportBtn label="Actions" onClick={() => {
            const PCOLOR = { haute:"#ef4444", moyenne:"#f59e0b", basse:"#3b82f6" };
            const SCOLOR = { "En cours":"#f59e0b", "Planifiée":"#3b82f6", "Résolue":"#22c55e", Vigilance:"#f59e0b" };
            const MCOLOR = { "Méthode":"#3b82f6","Milieu":"#22c55e","Matière":"#f59e0b","Main d'oeuvre":"#8b5cf6","Matériel":"#ef4444" };
            const badge = (val, color) => `<span style='background:${color}22;color:${color};border:1px solid ${color}44;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700'>${val}</span>`;
            const rows = filtered.map(a => {
              const pc = PCOLOR[a.priorite]||"#7a90aa";
              const sc = SCOLOR[a.statut]||"#7a90aa";
              const mc = MCOLOR[a.titre5m]||"#7a90aa";
              const photosHtml = (a.photos||[]).length > 0
                ? "<br/><div style='margin-top:6px'>"+(a.photos||[]).map(p=>"<img src='"+p.url+"' style='max-width:80px;max-height:60px;border-radius:4px;margin:2px;object-fit:cover;border:1px solid #e5e7eb'/>").join("")+"</div>"
                : "";
              return "<tr><td>"+a.type+"</td><td>"+(a.dateDetection||"—")+"</td><td>"+(a.zone||"")+"</td><td>"+badge(a.titre5m||"",mc)+photosHtml+"</td><td>"+badge(a.priorite,pc)+"</td><td>"+badge(a.statut,sc)+"</td><td>"+(a.description||"")+"</td></tr>";
            }).join("");
            exportHTML("Plan d'actions - " + CLIENT_CONFIG.nom,
              "<h1>Plan d'actions</h1><p style='color:#6b7280;margin-bottom:12px'>Filtre : "+filter+" — "+filtered.length+" action(s)</p><table><thead><tr><th>Type</th><th>Date de création</th><th>Zone</th><th>5M</th><th>Priorité</th><th>Statut</th><th>Action</th></tr></thead><tbody>"+rows+"</tbody></table>");
          }} />
          <button onClick={() => {
            const headers = ["Type","Date creation","Zone","5M","Priorité","Statut","Poste(s)","Technicien","Description","Nb photos","Noms photos"];
            const rows = filtered.map(a => [
              a.type, a.dateDetection||"", a.zone||"", a.titre5m||"", a.priorite, a.statut,
              a.piegeRef||"", a.technicien||"", a.description||"",
              (a.photos||[]).length, (a.photos||[]).map(p=>p.name).join(", ")
            ]);
            exportCSV("plan_actions_"+filter.replace(/\s+/g,"_")+"_"+CLIENT_CONFIG.nom.replace(/\s+/g,"_"), headers, rows);
          }}
            style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:9, padding:"10px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Export Excel
          </button>
          <button onClick={()=>window.__isAdmin&&openNew()}
            style={{ background: "#1d4ed8", opacity:window.__isAdmin?1:0.4, cursor:window.__isAdmin?"pointer":"not-allowed", color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            + Nouvelle action
          </button>
        </div>
      </div>

      {/* Formulaire création/édition */}
      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>{editId ? "Modifier l'action" : "Nouvelle fiche action"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 10 }}>
            {[
              ["piegeRef", "Poste(s)", "text"],
            ].map(([key, label, type]) => (
              <div key={key}>
                <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>{label}</label>
                <input type={type} value={draft[key]} onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))} style={inp()} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>5M *</label>
              <select value={draft.titre5m} onChange={e => setDraft(p => ({ ...p, titre5m: e.target.value }))} style={inp()}>
                {CINQ_M.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Date de création</label>
              <input type="date"
                value={draft.dateDetection ? draft.dateDetection.split("/").reverse().join("-") : ""}
                onChange={e => {
                  const v = e.target.value; // YYYY-MM-DD
                  const fmt = v ? v.split("-").reverse().join("/") : ""; // DD/MM/YYYY
                  setDraft(p => ({ ...p, dateDetection: fmt }));
                }}
                style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Technicien</label>
              <select value={draft.technicien||""} onChange={e => setDraft(p => ({ ...p, technicien: e.target.value }))} style={inp()}>
                <option value="">--</option>
                {TECHNICIENS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Zone</label>
              <select value={draft.zone} onChange={e => setDraft(p => ({ ...p, zone: e.target.value }))} style={inp()}>
                <option value="">--</option>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              <div style={{display:"flex",gap:4,marginTop:4}}>
                <input value={newZoneInput} onChange={e=>setNewZoneInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addZone(newZoneInput);}}} placeholder="+ Nouvelle zone" style={{...inp(),fontSize:10,padding:"4px 8px"}}/>
                <button onClick={()=>addZone(newZoneInput)} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:5,padding:"4px 9px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Type</label>
              <select value={draft.type} onChange={e => setDraft(p => ({ ...p, type: e.target.value }))} style={inp()}>
                <option value="corrective">Corrective</option>
                <option value="preventive">Préventive</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Priorité</label>
              <select value={draft.priorite} onChange={e => setDraft(p => ({ ...p, priorite: e.target.value }))} style={inp()}>
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>
          </div>
          {["description", "recommandation"].map(f => (
            <div key={f} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>{f}</label>
              <textarea rows={2} value={draft[f]} onChange={e => setDraft(p => ({ ...p, [f]: e.target.value }))}
                style={{ ...inp(), resize: "vertical" }} />
            </div>
          ))}

          {/* Photos */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Photos ({draftPhotos.length})
            </label>
            {draftPhotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 6, marginBottom: 8 }}>
                {draftPhotos.map((p, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 6, overflow: "hidden", aspectRatio: "1", background: "#1a2540" }}>
                    <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                      onClick={() => setLightbox(p)} />
                    <button onClick={() => setDraftPhotos(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: 2, right: 2, background: "#ef4444cc", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1a2540", border: "1px dashed #3d5270", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#7a90aa", fontWeight: 600 }}>
                📷 Prendre une photo
                <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhotoAdd} />
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1a2540", border: "1px dashed #3d5270", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#7a90aa", fontWeight: 600 }}>
                🖼 Galerie
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoAdd} />
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveAction} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {editId ? "Enregistrer" : "Créer"}
            </button>
            <button onClick={() => { resetDraft(); setShowForm(false); }}
              style={{ background: "transparent", color: "#7a90aa", border: "1px solid #3d5270", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Filtres */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        {["Toutes", "En cours", "Planifiée", "Résolue", "Vigilance"].map(f => {
          const count = f === "Toutes" ? actions.length : actions.filter(a => a.statut === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              style={{ background: filter === f ? "#1d4ed8" : "#243352", color: filter === f ? "#fff" : "#7a90aa", border: "1px solid " + (filter === f ? "#1d4ed8" : "#3d5270"), borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {f} ({count})
            </button>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <div>
            <label style={{ fontSize: 9, color: "#7a90aa", display: "block", marginBottom: 2 }}>Annee</label>
            <select value={filterAnneeTable} onChange={e => setFilterAnneeTable(e.target.value)}
              style={{ background: "#243352", border: "1px solid #3d5270", borderRadius: 7, padding: "5px 10px", color: "#f1f5f9", fontSize: 11, fontFamily: "inherit" }}>
              <option value="Toutes">Toutes</option>
              {anneesDispoTable.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 9, color: "#7a90aa", display: "block", marginBottom: 2 }}>Mois</label>
            <select value={filterMoisTable} onChange={e => setFilterMoisTable(e.target.value)}
              style={{ background: "#243352", border: "1px solid #3d5270", borderRadius: 7, padding: "5px 10px", color: "#f1f5f9", fontSize: 11, fontFamily: "inherit" }}>
              <option value="Tous">Tous</option>
              {MOIS_LABELS_TABLE.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          {(filterAnneeTable !== "Toutes" || filterMoisTable !== "Tous") && (
            <button onClick={() => { setFilterAnneeTable("Toutes"); setFilterMoisTable("Tous"); }}
              style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 7, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-end" }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ background: "#1a2540", padding: "9px 16px", display: "grid", gridTemplateColumns: "60px 90px 100px 110px 80px 90px 80px", gap: 8, fontSize: 10, fontWeight: 700, color: "#7a90aa", textTransform: "uppercase" }}>
          <div>Type</div><div>Date creation</div><div>Zone</div><div>5M</div><div>Priorité</div><div>Statut</div><div>Actions</div>
        </div>
        <div style={{ maxHeight: 500, overflowY: "auto" }}>
          {filtered.map((a, i) => {
            const isSel = sel === a.id;
            return (
              <div key={a.id}>
                <div onClick={()=>setSel(isSel?null:a.id)} style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "60px 90px 100px 110px 80px 90px 80px", gap: 8, alignItems: "center", borderTop: "1px solid #243352", background: isSel?"#243352":i%2===0?"transparent":"#ffffff04", cursor:"pointer" }}>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 700, background: a.type === "corrective" ? "#ef444422" : "#3b82f622", color: a.type === "corrective" ? "#ef4444" : "#3b82f6", border: "1px solid " + (a.type === "corrective" ? "#ef444444" : "#3b82f644"), borderRadius: 4, padding: "1px 5px" }}>
                      {a.type === "corrective" ? "COR" : "PRÉ"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.dateDetection || "—"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.zone || "—"}</div>
                  <div style={{ fontSize: 11, color: "#f1f5f9", fontWeight: 600 }}>
                    {a.titre5m || "—"}
                    {a.photos && a.photos.length > 0 && (
                      <span style={{ fontSize: 9, color: "#7a90aa", display:"block" }}>{a.photos.length} photo(s)</span>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: PCOLOR[a.priorite] || "#7a90aa", background: (PCOLOR[a.priorite] || "#7a90aa") + "18", borderRadius: 4, padding: "2px 6px" }}>{a.priorite}</span>
                  </div>
                  <div>
                    <select value={a.statut} onChange={e => { e.stopPropagation(); changeStatut(a.id, e.target.value); }}
                      style={{ background: (SCOLOR[a.statut] || "#7a90aa") + "22", color: SCOLOR[a.statut] || "#7a90aa", border: "1px solid " + (SCOLOR[a.statut] || "#7a90aa") + "44", borderRadius: 6, padding: "3px 7px", fontSize: 10, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
                      onClick={e => e.stopPropagation()}>
                      {["En cours", "Planifiée", "Résolue", "Vigilance"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 4 }} onClick={e=>e.stopPropagation()}>
                    <button onClick={() => openEdit(a)}
                      style={{ background: "#1d4ed822", color: "#3b82f6", border: "1px solid #3b82f644", borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✏</button>
                    <button onClick={() => deleteAction(a.id)}
                      style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                    <button onClick={()=>{
                      const photosHtml = (a.photos||[]).map(p=>`<img src="${p.url}" style="max-width:200px;max-height:150px;border-radius:6px;margin:4px;object-fit:cover;border:1px solid #e2e8f0"/>`).join("");
                      exportHTML("Fiche action - "+(a.titre5m||""),
                        `<h1>Fiche action</h1>
                        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb;width:35%">5M</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.titre5m||"—"}</td></tr>
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb">Type</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.type}</td></tr>
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb">Priorité</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.priorite}</td></tr>
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb">Zone</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.zone||"—"}</td></tr>
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb">Poste(s)</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.piegeRef||"—"}</td></tr>
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb">Technicien</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.technicien||"—"}</td></tr>
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb">Date de creation</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.dateDetection||"—"}</td></tr>
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb">Statut</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.statut}</td></tr>
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb">Description</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.description||"—"}</td></tr>
                          <tr><td style="font-weight:700;background:#f9fafb;padding:7px 12px;border:1px solid #e5e7eb">Recommandation</td><td style="padding:7px 12px;border:1px solid #e5e7eb">${a.recommandation||"—"}</td></tr>
                        </table>
                        ${photosHtml?`<div style="margin-top:12px"><strong>Photos :</strong><br/>${photosHtml}</div>`:""}`
                      );
                    }} style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:5, padding:"3px 7px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>PDF</button>
                    <button onClick={()=>{
                      const headers = ["5M","Type","Priorité","Zone","Poste(s)","Technicien","Date creation","Statut","Description","Recommandation","Nb photos","Noms photos"];
                      const row = [a.titre5m||"", a.type, a.priorite, a.zone||"", a.piegeRef||"", a.technicien||"", a.dateDetection||"", a.statut, a.description||"", a.recommandation||"", (a.photos||[]).length, (a.photos||[]).map(p=>p.name).join(", ")];
                      exportCSV("fiche_action_"+a.id, headers, [row]);
                      // Telecharger aussi chaque photo individuellement
                      (a.photos||[]).forEach((p,idx)=>{
                        setTimeout(()=>{
                          const link = document.createElement("a");
                          link.href = p.url;
                          link.download = p.name || ("photo_"+a.id+"_"+idx+".jpg");
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }, 300*(idx+1));
                      });
                    }} style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:5, padding:"3px 7px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Excel</button>
                  </div>
                </div>

                {/* Détails au clic */}
                {isSel && (
                  <div style={{ padding:"12px 16px", background:"#1a2540", borderTop:"1px solid #243352" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:10 }}>
                      {a.description&&<div><div style={{fontSize:10,color:"#7a90aa",fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Description</div><div style={{fontSize:12,color:"#94a3b8"}}>{a.description}</div></div>}
                      {a.recommandation&&<div><div style={{fontSize:10,color:"#7a90aa",fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Recommandation</div><div style={{fontSize:12,color:"#94a3b8"}}>{a.recommandation}</div></div>}
                      {a.technicien&&<div><div style={{fontSize:10,color:"#7a90aa",fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Technicien</div><div style={{fontSize:12,color:"#f1f5f9"}}>{a.technicien}</div></div>}
                      {a.dateDetection&&<div><div style={{fontSize:10,color:"#7a90aa",fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Détection</div><div style={{fontSize:12,color:"#f1f5f9"}}>{a.dateDetection}</div></div>}
                    </div>
                    {a.photos&&a.photos.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                        {a.photos.map((ph,j)=>(
                          <img key={j} src={ph.url} alt={ph.name} onClick={()=>setLightbox(ph)}
                            style={{width:80,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270",cursor:"zoom-in"}}/>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "#5a7090" }}>Aucune action pour ce filtre</div>
          )}
        </div>
      </Card>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "zoom-out" }}>
          <div style={{ maxWidth: "90vw", maxHeight: "90vh" }} onClick={e=>e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: 10 }} />
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 8, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              <span>{lightbox.name}</span>
              <a href={lightbox.url} download={lightbox.name||"photo.jpg"}
                style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:6, padding:"4px 12px", fontSize:11, fontWeight:700, textDecoration:"none", cursor:"pointer" }}>
                ↓ Telecharger
              </a>
              <button onClick={()=>setLightbox(null)} style={{ background:"transparent", color:"#94a3b8", border:"1px solid #3d5270", borderRadius:6, padding:"4px 12px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Graphes statistiques */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
        <button onClick={()=>{
          const headers = ["5M","Nb actions"];
          const rows = CINQ_M.map(m=>[m, actions.filter(a=>a.titre5m===m).length]);
          exportCSV("repartition_5M_"+CLIENT_CONFIG.nom.replace(/\s+/g,"_"), headers, rows);
        }} title="Exporter la répartition 5M en Excel"
          style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:6, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          ↓ Excel (Répartition 5M)
        </button>
      </div>
      <PieChart
        title="Répartition par 5M"
        chartKey="PlanActions_5M"
        data={CINQ_M.map((m,i)=>({label:m, value: actions.filter(a=>a.titre5m===m).length, color:["#8b5cf6","#3b82f6","#22c55e","#f59e0b","#ef4444"][i]}))}
      />
      <BarChartHorizontal
        title="Répartition par zone"
        chartKey="PlanActions_Zone"
        color="#3b82f6"
        data={Object.entries(actions.reduce((acc,a)=>{const z=a.zone||"Non renseigne";acc[z]=(acc[z]||0)+1;return acc;},{})).map(([label,value])=>({label,value}))}
      />
      <EvolutionActionsChart actions={actions} />
      <ComparaisonAnneesActionsChart actions={actions} />
      <PrioriteActionsChart actions={actions} />
      <BarChartHorizontal
        title="Top zones recurrentes (12 derniers mois)"
        chartKey="PlanActions_TopZones"
        color="#f59e0b"
        data={(() => {
          const now = new Date();
          const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
          const limite = new Date(now.getFullYear()-1, now.getMonth(), now.getDate());
          const recentes = actions.filter(a => pd(a.dateDetection) >= limite);
          const counts = recentes.reduce((acc,a)=>{const z=a.zone||"Non renseigne";acc[z]=(acc[z]||0)+1;return acc;},{});
          return Object.entries(counts).map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,10);
        })()}
      />

    </div>
  );
}

// ============================================================
// SAISIE PASSAGE — avec matière active + type rongeur
// ============================================================
function SaisiePassage({ seuilsGlobaux, setSeuilsGlobaux, setReinterventions, setPassagesGlobaux }) {
  const TECHNICIENS    = useTechniciens();
  const TYPES_PASSAGE  = ["Rongeurs exterieurs", "Rongeurs interieurs", "Blattes", "Teignes", "IPS", "Mixte"];
  const TYPES_RONGEUR  = ["souris", "ratBrun", "ratNoir"];
  const LABELS_RONGEUR = { souris:"Souris", ratBrun:"Rat brun", ratNoir:"Rat noir" };
  const INSECTES_TYPES = ["Blattes", "Insectes volants", "Teignes", "IPS"];
  const CATS_IV        = ["Moucherons","Mouches","Moustiques","Hyménoptères","Lépidoptères","Coléoptères","Punaises","Tipules"];
  const ACTIONS_LIST   = ["Remplacement appat","Ajout poste","Inspection renforcee","Pose tapette","Traitement curatif","Bouchage","Autre"];
  const inpS = { background:"#1a2540", border:"1px solid #3d5270", borderRadius:6, padding:"4px 8px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" };

  const [passagesData, setPassagesData] = useState([]);
  const [view, setView]       = useState("liste");
  const [form, setForm]       = useState({ date:"", technicien:"", type:"Rongeurs", notes:"" });
  const [saisies, setSaisies] = useState({});
  const [postes, setPostes]   = useState(POSTES_INIT);
  const [produitsBiocides, setProduitsBiocides] = useState([]);
  const [showReinvForm, setShowReinvForm] = useState(false);
  const [reinvForm, setReinvForm] = useState({ date:"", technicien:"", poste:"", anomalie:"", statut:"En cours", observations:"", actions:[] });
  const [reinvPhotos, setReinvPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState("saisie_tab");
  const [filterTypeMol, setFilterTypeMol] = useState("tous");
  const [deivForm, setDeivForm] = useState({ date:"", technicien:"" });
  const [deivSaisies, setDeivSaisies] = useState({});
  // Seuils partagés via props App
  const seuils = seuilsGlobaux;
  const setSeuils = setSeuilsGlobaux;

  useEffect(() => {
    sbGet("passages").then(data => {
      if (data && data.length > 0) {
        const sorted = data.sort((a,b) => {
          const pd = d => { const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d||0); };
          return pd(b.date)-pd(a.date);
        });
        setPassagesData(sorted);
        saveCacheData("passages_"+CLIENT_CONFIG.contrat, sorted).catch(()=>{});
      }
    }).catch(()=>{
      // Hors ligne — charger depuis le cache
      getCacheData("passages_"+CLIENT_CONFIG.contrat).then(cached => {
        if (cached && cached.length > 0) setPassagesData(cached);
      }).catch(()=>{});
    });
    sbGet("postes").then(data => {
      if(data&&data.length>0) {
        setPostes(data);
        saveCacheData("postes_"+CLIENT_CONFIG.contrat, data).catch(()=>{});
      }
    }).catch(()=>{
      getCacheData("postes_"+CLIENT_CONFIG.contrat).then(cached => {
        if (cached && cached.length > 0) setPostes(cached);
      }).catch(()=>{});
    });
    sbGet("produits_biocides").then(data => { if(data&&data.length>0) setProduitsBiocides(data); }).catch(()=>{});
  }, []);

  function startNew() { setForm({date:"",technicien:"",type:"Rongeurs",notes:""}); setSaisies(initSaisiesAvecMolecule({})); setView("saisie"); }

  const [editingPassage, setEditingPassage] = useState(null);

  function startEdit(p) {
    const saisiesData = typeof p.saisies === "string" ? JSON.parse(p.saisies||"{}") : (p.saisies||{});
    // Convert date dd/mm/yyyy to yyyy-mm-dd for input
    const dateParts = (p.date||"").split("/");
    const dateInput = dateParts.length===3 ? dateParts[2]+"-"+dateParts[1]+"-"+dateParts[0] : p.date;
    setForm({ date:dateInput, technicien:p.technicien||"", type:p.type||"Rongeurs", notes:p.notes||"" });
    setSaisies(initSaisiesAvecMolecule(saisiesData));
    setEditingPassage(p.id);
    setView("saisie");
  }

  function savePassage() {
    if (!form.date) { alert("Veuillez saisir une date."); return; }
    if (!form.technicien) { alert("Veuillez choisir un technicien."); return; }
    const dateFmt = form.date.includes("-") ? form.date.split("-").reverse().join("/") : form.date;
    if (editingPassage) {
      setPassagesData(prev=>prev.map(p=>String(p.id)===String(editingPassage)?{...p,date:dateFmt,technicien:form.technicien,type:form.type,notes:form.notes,saisies}:p));
      sbUpdate("passages", editingPassage, {date:dateFmt,technicien:form.technicien,type:form.type,notes:form.notes||"",saisies:JSON.stringify(saisies)});
      setEditingPassage(null);
    } else {
      const id = String(Date.now());
      const passageData = {id, contrat:CLIENT_CONFIG.contrat, date:dateFmt, technicien:form.technicien, type:form.type, statut:"Termine", notes:form.notes||"", saisies:JSON.stringify(saisies)};
      const newP = {...passageData, saisies};
      setPassagesData(prev=>[newP,...prev]);
      if (navigator.onLine) {
        sbUpsert("passages", passageData);
      } else {
        // Sauvegarder offline pour sync ultérieure
        savePendingSaisie({ id: "pending_"+id, data: passageData }).then(() => {
          getPendingSaisies().then(p => {
            if (window.__setPendingCount) window.__setPendingCount(p.length);
          }).catch(()=>{});
          alert("Passage sauvegardé localement. Il sera synchronisé dès que vous serez en ligne.");
        }).catch(()=>{});
      }
    }
    setView("liste");
  }

  const [prevPassagesData, setPrevPassagesData] = useState(null);

  function deletePassage(id) {
    setPrevPassagesData(passagesData);
    setPassagesData(prev=>prev.filter(p=>String(p.id)!==String(id)));
    sbDelete("passages", id);
  }

  function toggleReinvAction(a) {
    setReinvForm(prev=>({...prev, actions:prev.actions.includes(a)?prev.actions.filter(x=>x!==a):[...prev.actions,a]}));
  }

  function submitReinv() {
    if (!reinvForm.date) { alert("La date est obligatoire"); return; }
    const dateFmt = reinvForm.date.includes("-")?reinvForm.date.split("-").reverse().join("/"):reinvForm.date;
    const id = String(Date.now());
    const newReinv = {id, contrat:CLIENT_CONFIG.contrat, date:dateFmt, technicien:reinvForm.technicien, poste:reinvForm.poste, anomalie:reinvForm.anomalie, statut:reinvForm.statut, observations:reinvForm.observations, actions:JSON.stringify(reinvForm.actions), photos:JSON.stringify(reinvPhotos)};
    sbUpsert("reinterventions", newReinv);
    if (typeof setReinterventions === "function") {
      setReinterventions(prev => [{...newReinv, actions:reinvForm.actions, photos:reinvPhotos}, ...prev]);
    }
    setShowReinvForm(false);
    setReinvForm({date:"",technicien:"",poste:"",anomalie:"",statut:"En cours",observations:"",actions:[]});
    setReinvPhotos([]);
  }

  function sortPostes(list, ignorePrefix) {
    const TYPE_ORDER = { "RE": 0, "RI": 1 };
    return list.slice().sort((a,b)=>{
      const ta = TYPE_ORDER[a.type] !== undefined ? TYPE_ORDER[a.type] : 99;
      const tb = TYPE_ORDER[b.type] !== undefined ? TYPE_ORDER[b.type] : 99;
      if (ta !== tb) return ta - tb;
      const parse = id => {
        const m = id.match(/^([A-Za-z]+)[.\-]?(\d+)([A-Za-z]*)$/);
        return m ? [m[1].toUpperCase(), parseInt(m[2]), m[3].toUpperCase()] : [id.toUpperCase(), 0, ""];
      };
      const [ap,an,as_] = parse(a.id);
      const [bp,bn,bs] = parse(b.id);
      // Pour les RI : trier uniquement par numéro (ignorer S/R)
      if (ignorePrefix) {
        if (an!==bn) return an-bn;
        return as_.localeCompare(bs);
      }
      if (ap!==bp) return ap.localeCompare(bp);
      if (an!==bn) return an-bn;
      return as_.localeCompare(bs);
    });
  }

  function getPostesForType(type) {
    if (type==="Mixte") return sortPostes(postes);
    if (type==="Rongeurs exterieurs") return sortPostes(postes.filter(p=>(p.nuisible||"Rongeurs")==="Rongeurs" && p.type==="RE"));
    if (type==="Rongeurs interieurs") return sortPostes(postes.filter(p=>(p.nuisible||"Rongeurs")==="Rongeurs" && p.type==="RI"), true); // ignorer préfixe R/S
    if (INSECTES_TYPES.includes(type)) return sortPostes(postes.filter(p=>p.nuisible===type));
    return sortPostes(postes.filter(p=>(p.nuisible||"Rongeurs")===type));
  }

  function setSaisieField(posteId, field, value) {
    setSaisies(prev=>({...prev,[posteId]:{...prev[posteId],[field]:value}}));
    // Sauvegarder la molécule dans le poste pour pré-remplissage futur
    if (field === "molecule" && value) {
      setPostes(prev=>prev.map(p=>p.id===posteId?{...p,molecule_actuelle:value}:p));
      sbUpsert("postes", {id:posteId, contrat:CLIENT_CONFIG.contrat, molecule_actuelle:value});
    }
  }

  // Pré-remplir la molécule depuis le poste au chargement de la saisie
  function initSaisiesAvecMolecule(saisiesData) {
    const enriched = {...saisiesData};
    postes.forEach(p=>{
      if ((p.nuisible||"Rongeurs")!=="Rongeurs") return;
      if (!enriched[p.id]) enriched[p.id] = {};
      // Molecule pre-remplie depuis la derniere saisie connue, Placebo par defaut
      if (!enriched[p.id].molecule) enriched[p.id].molecule = p.molecule_actuelle || "Placebo";
      // Etat pre-rempli sur Aucune : le poste compte comme controle sans clic
      if (enriched[p.id].etat === undefined) enriched[p.id].etat = "";
    });
    return enriched;
  }

  function getCodeCouleur(p, s) {
    const nuisible = p.nuisible||"Rongeurs";
    if (nuisible==="Rongeurs") {
      const total = (parseInt(s.cap_souris||0))+(parseInt(s.cap_ratBrun||0))+(parseInt(s.cap_ratNoir||0));
      if (total >= seuils.rongeurs.capture_rouge || estConsoTotale(s.etat) || s.etat==="75%") return "#ef4444";
      if (estConsoPartielle(s.etat)) return "#f59e0b";
      return "#22c55e";
    }
    if (nuisible==="Blattes") {
      const v = parseInt(s.etat||0);
      return v>=seuils.blattes.moyen?"#ef4444":v>=seuils.blattes.leger?"#f59e0b":"#22c55e";
    }
    if (nuisible==="Teignes") {
      const v = parseInt(s.etat||0);
      return v>=seuils.teignes.moyen?"#ef4444":v>=seuils.teignes.leger?"#f59e0b":"#22c55e";
    }
    if (nuisible==="Insectes volants") {
      let max = 0;
      CATS_IV.forEach(cat => {
        const v = parseInt(s["iv_"+cat]||0);
        const sv = seuils.iv[cat]||{leger:999,moyen:9999};
        if (v>=sv.moyen) max = Math.max(max,2);
        else if (v>=sv.leger) max = Math.max(max,1);
      });
      return max===2?"#ef4444":max===1?"#f59e0b":"#22c55e";
    }
    if (nuisible==="IPS") {
      const v = parseInt(s.etat||0);
      return v>=seuils.ips.moyen?"#ef4444":v>=seuils.ips.leger?"#f59e0b":"#22c55e";
    }
    return "#7a90aa";
  }

  const inpStyle = inp();

  return (
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9",marginBottom:2}}>Saisie de passage</div>
          <div style={{fontSize:13,color:"#7a90aa"}}>{passagesData.length} passages enregistres</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setActiveTab("liste_tab")}
            style={{background:activeTab==="liste_tab"?"#1a2540":"transparent",color:activeTab==="liste_tab"?"#22c55e":"#7a90aa",border:"1px solid "+(activeTab==="liste_tab"?"#22c55e":"#3d5270"),borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Liste
          </button>
          <button onClick={()=>setActiveTab("saisie_tab")}
            style={{background:activeTab==="saisie_tab"?"#1a2540":"transparent",color:activeTab==="saisie_tab"?"#3b82f6":"#7a90aa",border:"1px solid "+(activeTab==="saisie_tab"?"#3b82f6":"#3d5270"),borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Saisie
          </button>
          <button onClick={()=>setActiveTab("seuils_tab")}
            style={{background:activeTab==="seuils_tab"?"#1a2540":"transparent",color:activeTab==="seuils_tab"?"#ef4444":"#7a90aa",border:"1px solid "+(activeTab==="seuils_tab"?"#ef4444":"#3d5270"),borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Seuils
          </button>
          <button onClick={()=>setActiveTab("molecules_tab")}
            style={{background:activeTab==="molecules_tab"?"#1a2540":"transparent",color:activeTab==="molecules_tab"?"#8b5cf6":"#7a90aa",border:"1px solid "+(activeTab==="molecules_tab"?"#8b5cf6":"#3d5270"),borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Molécules
          </button>
        </div>
      </div>

      {/* ONGLET LISTE */}
      {activeTab==="liste_tab" && (
        <div>
          {passagesData.length===0 && <Card><div style={{textAlign:"center",color:"#5a7090",padding:20}}>Aucun passage enregistré.</div></Card>}
          {passagesData.map(p=>(
            <Card key={p.id} style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{p.date}</div>
                  <div style={{fontSize:11,color:"#7a90aa"}}>{p.technicien} — {p.type}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{setEditingPassage(p.id);const saisiesData=typeof p.saisies==="string"?JSON.parse(p.saisies||"{}"):p.saisies||{};setSaisies(saisiesData);const d=p.date&&p.date.includes("/")?p.date.split("/").reverse().join("-"):p.date;setForm({date:d,technicien:p.technicien,type:p.type,notes:p.notes||""});setActiveTab("saisie_tab");setView("saisie");}}
                    style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    Modifier
                  </button>
                  {prevPassagesData && <button onClick={()=>{setPassagesData(prevPassagesData);setPrevPassagesData(null);}}
                    style={{background:"#f59e0b22",color:"#f59e0b",border:"1px solid #f59e0b44",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    ↩
                  </button>}
                  <button onClick={()=>deletePassage(p.id)}
                    style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    Supprimer
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {/* ONGLET PASSAGE DEIV */}
      {activeTab==="deiv_tab" && (
        <div>
          <Card style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>Nouveau passage DEIV</div>
              <button onClick={()=>sbGet("postes").then(data=>{if(data&&data.length>0)setPostes(data);}).catch(()=>{})}
                title="Recharger les postes DEIV"
                style={{background:"transparent",border:"1px solid #3d5270",borderRadius:6,color:"#7a90aa",fontSize:13,cursor:"pointer",padding:"3px 8px"}}>
                ↻
              </button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:16}}>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date *</label>
                <input type="date" value={deivForm.date} onChange={e=>setDeivForm(p=>({...p,date:e.target.value}))} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:7,padding:"6px 10px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit",width:"100%"}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Technicien</label>
                <select value={deivForm.technicien} onChange={e=>setDeivForm(p=>({...p,technicien:e.target.value}))} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:7,padding:"6px 10px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit",width:"100%"}}>
                  <option value="">--</option>
                  {TECHNICIENS.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Tableau saisie DEIV */}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#1a2540"}}>
                    <th style={{padding:"6px 10px",textAlign:"left",color:"#7a90aa",fontWeight:700,fontSize:10,textTransform:"uppercase",borderBottom:"1px solid #3d5270",minWidth:80}}>DEIV</th>
                    <th style={{padding:"6px 10px",textAlign:"left",color:"#7a90aa",fontWeight:700,fontSize:10,textTransform:"uppercase",borderBottom:"1px solid #3d5270"}}>Zone</th>
                    {CATS_IV.map(cat=>(
                      <th key={cat} style={{padding:"6px 8px",textAlign:"center",color:"#f59e0b",fontWeight:700,fontSize:9,textTransform:"uppercase",borderBottom:"1px solid #3d5270",minWidth:70}}>{cat.slice(0,6)}</th>
                    ))}
                    <th style={{padding:"6px 10px",textAlign:"center",color:"#22c55e",fontWeight:700,fontSize:10,borderBottom:"1px solid #3d5270",minWidth:60}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortPostes(postes.filter(p=>p.type==="DEIV")).map((p,i)=>{
                    const s = deivSaisies[p.id] || {};
                    const total = CATS_IV.reduce((acc,cat)=>acc+(parseInt(s[cat]||0)),0);
                    return (
                      <tr key={p.id} style={{background:i%2===0?"transparent":"#ffffff04",borderBottom:"1px solid #243352"}}>
                        <td style={{padding:"5px 10px",color:"#f59e0b",fontWeight:700,fontFamily:"monospace"}}>{p.id}</td>
                        <td style={{padding:"5px 10px",color:"#7a90aa",fontSize:10}}>{(p.zone||"").slice(0,20)}</td>
                        {CATS_IV.map(cat=>(
                          <td key={cat} style={{padding:"4px 6px",textAlign:"center"}}>
                            <input
                              type="number" min="0"
                              value={s[cat]||""}
                              onChange={e=>setDeivSaisies(prev=>({...prev,[p.id]:{...prev[p.id],[cat]:e.target.value}}))}
                              style={{width:58,background:"#243352",border:"1px solid #3d5270",borderRadius:5,padding:"3px 5px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit",textAlign:"center"}}
                            />
                          </td>
                        ))}
                        <td style={{padding:"5px 10px",textAlign:"center",fontWeight:700,color:total>0?"#22c55e":"#3d5270",fontSize:12}}>{total||"-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{display:"flex",gap:8,marginTop:14}}>
              <button onClick={()=>{
                if (!deivForm.date) { alert("La date est obligatoire"); return; }
                const dateFmt = deivForm.date.includes("-")?deivForm.date.split("-").reverse().join("/"):deivForm.date;
                const id = String(Date.now());
                // Construire saisies au format iv_Cat
                const saisies = {};
                Object.entries(deivSaisies).forEach(([posteId, vals])=>{
                  const hasData = CATS_IV.some(cat=>parseInt(vals[cat]||0)>0);
                  if (hasData) {
                    saisies[posteId] = {};
                    CATS_IV.forEach(cat=>{ if(parseInt(vals[cat]||0)>0) saisies[posteId]["iv_"+cat]=vals[cat]; });
                  }
                });
                const newPassage = {id, contrat:CLIENT_CONFIG.contrat, date:dateFmt, technicien:deivForm.technicien, type:"Insectes volants", statut:"Termine", notes:"Passage DEIV", saisies};
                sbUpsert("passages", {...newPassage, saisies:JSON.stringify(saisies)});
                setPassagesData(prev=>[newPassage,...prev]);
                if (typeof setPassagesGlobaux === "function") setPassagesGlobaux(prev=>[newPassage,...prev]);
                setDeivSaisies({});
                setDeivForm({date:"",technicien:""});
                setActiveTab("liste_tab");
                alert("Passage DEIV enregistre !");
              }} style={{background:"#f59e0b",color:"#000",border:"none",borderRadius:8,padding:"8px 18px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                Enregistrer le passage DEIV
              </button>
              <button onClick={()=>setDeivSaisies({})} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                Effacer
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ONGLET SEUILS */}
      {activeTab==="seuils_tab" && (
        <div>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>Seuils Rongeurs</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Captures min rouge</label>
                <input type="number" min="0" value={seuils.rongeurs.capture_rouge}
                  onChange={e=>setSeuils(prev=>({...prev,rongeurs:{...prev.rongeurs,capture_rouge:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Taux activite vigilance (%)</label>
                <input type="number" min="0" max="100" value={seuils.rongeurs.taux_vigilance||5}
                  onChange={e=>setSeuils(prev=>({...prev,rongeurs:{...prev.rongeurs,taux_vigilance:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Taux activite critique (%)</label>
                <input type="number" min="0" max="100" value={seuils.rongeurs.taux_critique||10}
                  onChange={e=>setSeuils(prev=>({...prev,rongeurs:{...prev.rongeurs,taux_critique:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#f59e0b",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Conso. appât → Orange</label>
                <select value={seuils.rongeurs.conso_orange||"25%"}
                  onChange={e=>setSeuils(prev=>({...prev,rongeurs:{...prev.rongeurs,conso_orange:e.target.value}}))}
                  style={{...inpStyle,width:100}}>
                  <option value="25%">25%</option>
                  <option value="50%">50%</option>
                  <option value="75%">75%</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:10,color:"#ef4444",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Conso. appât → Rouge</label>
                <select value={seuils.rongeurs.conso_rouge||"75%"}
                  onChange={e=>setSeuils(prev=>({...prev,rongeurs:{...prev.rongeurs,conso_rouge:e.target.value}}))}
                  style={{...inpStyle,width:100}}>
                  <option value="50%">50%</option>
                  <option value="75%">75%</option>
                  <option value="Totale">Totale</option>
                </select>
              </div>
            </div>
          </Card>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1e40af",marginBottom:6}}>Seuils Rongeurs Extérieurs</div>
            <div style={{fontSize:11,color:"#7a90aa",marginBottom:12}}>Postes RE — captures par passage</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Orange min (captures)</label>
                <input type="number" min="0" value={(seuils.rongeursExt||{}).leger||1}
                  onChange={e=>setSeuils(prev=>({...prev,rongeursExt:{...(prev.rongeursExt||{}),leger:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Rouge min (captures)</label>
                <input type="number" min="0" value={(seuils.rongeursExt||{}).moyen||3}
                  onChange={e=>setSeuils(prev=>({...prev,rongeursExt:{...(prev.rongeursExt||{}),moyen:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
            </div>
          </Card>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#60a5fa",marginBottom:6}}>Seuils Rongeurs Intérieurs</div>
            <div style={{fontSize:11,color:"#7a90aa",marginBottom:12}}>Postes RI, R+chiffre, S+chiffre — captures par passage</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Orange min (captures)</label>
                <input type="number" min="0" value={(seuils.rongeursInt||{}).leger||1}
                  onChange={e=>setSeuils(prev=>({...prev,rongeursInt:{...(prev.rongeursInt||{}),leger:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Rouge min (captures)</label>
                <input type="number" min="0" value={(seuils.rongeursInt||{}).moyen||3}
                  onChange={e=>setSeuils(prev=>({...prev,rongeursInt:{...(prev.rongeursInt||{}),moyen:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
            </div>
          </Card>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#22c55e",marginBottom:6}}>Seuil Audit interne 3D</div>
            <div style={{fontSize:11,color:"#7a90aa",marginBottom:12}}>Score minimum pour chaque statut (%)</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div>
                <label style={{fontSize:10,color:"#22c55e",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Conforme (%)</label>
                <input type="number" min="0" max="100" value={(seuils.audit||{}).conforme??85}
                  onChange={e=>setSeuils(prev=>({...prev,audit:{...(prev.audit||{}),conforme:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#f59e0b",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Partiel (%)</label>
                <input type="number" min="0" max="100" value={(seuils.audit||{}).partiel??60}
                  onChange={e=>setSeuils(prev=>({...prev,audit:{...(prev.audit||{}),partiel:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
            </div>
          </Card>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>Seuils Blattes</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Orange min</label>
                <input type="number" min="0" value={seuils.blattes.leger}
                  onChange={e=>setSeuils(prev=>({...prev,blattes:{...prev.blattes,leger:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Rouge min</label>
                <input type="number" min="0" value={seuils.blattes.moyen}
                  onChange={e=>setSeuils(prev=>({...prev,blattes:{...prev.blattes,moyen:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
            </div>
          </Card>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>Seuils Teignes</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Orange min</label>
                <input type="number" min="0" value={seuils.teignes.leger}
                  onChange={e=>setSeuils(prev=>({...prev,teignes:{...prev.teignes,leger:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Rouge min</label>
                <input type="number" min="0" value={seuils.teignes.moyen}
                  onChange={e=>setSeuils(prev=>({...prev,teignes:{...prev.teignes,moyen:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
            </div>
          </Card>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>Seuils Insectes volants</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
              {CATS_IV.map(cat=>(
                <div key={cat} style={{background:"#1a2540",borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:8}}>{cat}</div>
                  <div style={{display:"flex",gap:8}}>
                    <div style={{flex:1}}>
                      <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:2}}>Orange min</label>
                      <input type="number" min="0" value={(seuils.iv[cat]||{}).leger||0}
                        onChange={e=>setSeuils(prev=>({...prev,iv:{...prev.iv,[cat]:{...(prev.iv[cat]||{}),leger:parseInt(e.target.value)||0}}}))}
                        style={{...inpStyle,fontSize:11,padding:"3px 6px",width:60}}/>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:2}}>Rouge min</label>
                      <input type="number" min="0" value={(seuils.iv[cat]||{}).moyen||0}
                        onChange={e=>setSeuils(prev=>({...prev,iv:{...prev.iv,[cat]:{...(prev.iv[cat]||{}),moyen:parseInt(e.target.value)||0}}}))}
                        style={{...inpStyle,fontSize:11,padding:"3px 6px",width:60}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>Seuils IPS</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Orange min</label>
                <input type="number" min="0" value={seuils.ips.leger}
                  onChange={e=>setSeuils(prev=>({...prev,ips:{...prev.ips,leger:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Rouge min</label>
                <input type="number" min="0" value={seuils.ips.moyen}
                  onChange={e=>setSeuils(prev=>({...prev,ips:{...prev.ips,moyen:parseInt(e.target.value)||0}}))}
                  style={{...inpStyle,width:80}}/>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ONGLET SAISIE */}
      {activeTab==="saisie_tab" && (
        <div>
          {view==="liste" && (
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <button onClick={startNew} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                + Passage periodique
              </button>
              <button onClick={()=>setActiveTab("deiv_tab")} style={{background:"#f59e0b",color:"#000",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                + Passage DEIV
              </button>
              <button onClick={()=>setShowReinvForm(v=>!v)} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                + Reintervention
              </button>
              {prevPassagesData && (
                <button onClick={()=>{setPassagesData(prevPassagesData);setPrevPassagesData(null);}}
                  style={{background:"#f59e0b22",color:"#f59e0b",border:"1px solid #f59e0b44",borderRadius:9,padding:"10px 16px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  ↩ Annuler
                </button>
              )}
            </div>
          )}
          {view==="saisie" && (
            <div style={{marginBottom:16}}>
              <button onClick={()=>{setView("liste");setEditingPassage(null);}} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:9,padding:"10px 18px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                Retour
              </button>
              {editingPassage && <span style={{marginLeft:12,fontSize:12,color:"#f59e0b",fontWeight:600}}>Mode modification</span>}
            </div>
          )}

          {showReinvForm && view==="liste" && (
            <Card style={{marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>Nouvelle reintervention</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:10}}>
                <div><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date *</label>
                  <input type="date" value={reinvForm.date} onChange={e=>setReinvForm(p=>({...p,date:e.target.value}))} style={inpStyle}/></div>
                <div><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Technicien</label>
                  <select value={reinvForm.technicien} onChange={e=>setReinvForm(p=>({...p,technicien:e.target.value}))} style={inpStyle}>
                    <option value="">--</option>{TECHNICIENS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Poste(s) *</label>
                  <input value={reinvForm.poste} onChange={e=>setReinvForm(p=>({...p,poste:e.target.value}))} placeholder="ex: RE26" style={inpStyle}/></div>
                <div><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Statut</label>
                  <select value={reinvForm.statut} onChange={e=>setReinvForm(p=>({...p,statut:e.target.value}))} style={inpStyle}>
                    <option value="En cours">En cours</option><option value="Traite">Traite</option><option value="Planifie">Planifie</option>
                  </select></div>
              </div>
              <div style={{marginBottom:10}}><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Anomalie</label>
                <input value={reinvForm.anomalie} onChange={e=>setReinvForm(p=>({...p,anomalie:e.target.value}))} style={inpStyle}/></div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:8}}>Actions</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {ACTIONS_LIST.map(a=>{const checked=reinvForm.actions.includes(a);return(
                    <button key={a} onClick={()=>toggleReinvAction(a)} style={{background:checked?"#1d4ed822":"#1a2540",color:checked?"#3b82f6":"#7a90aa",border:"1px solid "+(checked?"#3b82f6":"#3d5270"),borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:checked?700:400,cursor:"pointer",fontFamily:"inherit"}}>{a}</button>
                  );})}
                </div>
              </div>
              <div style={{marginBottom:12}}><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Observations</label>
                <textarea rows={2} value={reinvForm.observations} onChange={e=>setReinvForm(p=>({...p,observations:e.target.value}))} style={{...inpStyle,resize:"vertical"}}/></div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Photos ({reinvPhotos.length})</label>
                <label style={{background:"#243352",border:"1px dashed #3d5270",borderRadius:8,padding:"7px 14px",fontSize:11,color:"#7a90aa",cursor:"pointer"}}>
                  + Ajouter photos
                  <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={e=>{
                    Array.from(e.target.files).forEach(file=>{
                      const r=new FileReader();
                      r.onload=ev=>setReinvPhotos(prev=>[...prev,{url:ev.target.result,name:file.name}]);
                      r.readAsDataURL(file);
                    });
                  }}/>
                </label>
                {reinvPhotos.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                    {reinvPhotos.map((ph,i)=>(
                      <div key={i} style={{position:"relative"}}>
                        <img src={ph.url} alt={ph.name} style={{width:60,height:60,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270"}}/>
                        <button onClick={()=>setReinvPhotos(prev=>prev.filter((_,j)=>j!==i))}
                          style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:16,height:16,fontSize:9,cursor:"pointer"}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="aads-action-btn" onClick={submitReinv} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Enregistrer</button>
                <button onClick={()=>setShowReinvForm(false)} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:8,padding:"8px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
              </div>
            </Card>
          )}

          {view==="saisie" && (
            <div>
              <Card style={{marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>Informations du passage</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginBottom:10}}>
                  <div><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date *</label>
                    <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={inpStyle}/></div>
                  <div><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Technicien *</label>
                    <select value={form.technicien} onChange={e=>setForm(p=>({...p,technicien:e.target.value}))} style={inpStyle}>
                      <option value="">--</option>{TECHNICIENS.map(t=><option key={t} value={t}>{t}</option>)}
                    </select></div>
                  <div><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Type</label>
                    <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inpStyle}>
                      {TYPES_PASSAGE.map(t=><option key={t} value={t}>{t}</option>)}
                    </select></div>
                </div>
                <div><label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{...inpStyle,resize:"vertical"}}/></div>
              </Card>

              <Card style={{padding:0,overflow:"hidden",marginBottom:16}}>
                <div style={{padding:"12px 18px",borderBottom:"1px solid #3d5270",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>Saisie par poste</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button onClick={()=>{
                      const postesRI = postes.filter(p=>(p.nuisible||"Rongeurs")==="Rongeurs" && p.type==="RI");
                      setSaisies(prev=>{
                        const next = {...prev};
                        postesRI.forEach(p=>{ next[p.id] = {...(next[p.id]||{}), molecule:"Placebo"}; });
                        return next;
                      });
                    }} style={{background:"#3b82f622",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      🔵 Tout Placebo (RI)
                    </button>
                    <button onClick={()=>{
                      const postesRE = postes.filter(p=>(p.nuisible||"Rongeurs")==="Rongeurs" && p.type==="RE");
                      setSaisies(prev=>{
                        const next = {...prev};
                        postesRE.forEach(p=>{ next[p.id] = {...(next[p.id]||{}), molecule:"Placebo"}; });
                        return next;
                      });
                    }} style={{background:"#1e40af22",color:"#1e40af",border:"1px solid #1e40af44",borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      🔵 Tout Placebo (RE)
                    </button>
                    <span style={{fontSize:12,color:"#7a90aa"}}>{Object.keys(saisies).filter(k=>saisies[k]&&(saisies[k].etat||Object.keys(saisies[k]).some(f=>f.startsWith("cap_")||f.startsWith("iv_")))).length} saisis / {getPostesForType(form.type).length}</span>
                  </div>
                </div>
                <div style={{maxHeight:520,overflowY:"auto"}}>
                  {getPostesForType(form.type).map((p,i)=>{
                    const s = saisies[p.id]||{};
                    const nuisible = p.nuisible||"Rongeurs";
                    const codeCouleur = getCodeCouleur(p,s);
                    const totalCaptures = (parseInt(s.cap_souris||0))+(parseInt(s.cap_ratBrun||0))+(parseInt(s.cap_ratNoir||0));
                    return (
                      <div key={p.id} style={{padding:"12px 18px",borderTop:"1px solid #243352",background:i%2===0?"transparent":"#ffffff04",borderLeft:"3px solid "+codeCouleur}}>
                        <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center",marginBottom:10}}>
                          <div style={{minWidth:70,fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#f1f5f9"}}>{p.id}</div>
                          <div style={{flex:1,fontSize:11,color:"#7a90aa"}}>{(p.zone||"").slice(0,30)}</div>
                          <span style={{fontSize:9,fontWeight:700,background:"#243352",color:NUISIBLE_COLORS[nuisible]||"#7a90aa",borderRadius:4,padding:"1px 6px"}}>{nuisible}</span>
                          <span style={{width:12,height:12,borderRadius:"50%",background:codeCouleur,display:"inline-block",boxShadow:"0 0 5px "+codeCouleur,flexShrink:0}}/>
                        </div>

                        {/* Statut poste */}
                        <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
                          {[["Disparu","#ef4444"],["Inaccessible","#f59e0b"],["Abimé","#f59e0b"]].map(([opt,co])=>{
                            const active = s.statut_poste===opt;
                            return (
                              <button key={opt} onClick={()=>setSaisieField(p.id,"statut_poste",active?"":opt)}
                                style={{background:active?co+"33":"#1a2540",color:active?co:"#5a7090",border:"1px solid "+(active?co:"#3d5270"),borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                                {opt}
                              </button>
                            );
                          })}
                          {(s.statut_poste==="Abimé"||s.statut_poste==="Disparu") && <span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>→ Poste remplacé</span>}
                        </div>

                        {nuisible==="Rongeurs" && !s.statut_poste && (
                          <div>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                              {[["Aucune","#22c55e"],["25%","#f59e0b"],["50%","#f59e0b"],["75%","#ef4444"],["Totale","#ef4444"]].map(([opt,co])=>{
                                const active = (s.etat===opt)||(opt==="Aucune"&&!s.etat);
                                return (
                                  <button key={opt} onClick={()=>setSaisieField(p.id,"etat",opt==="Aucune"?"":opt)}
                                    style={{background:active?co+"33":"#1a2540",color:co,border:"1px solid "+co+"55",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",marginBottom:8}}>
                              {TYPES_RONGEUR.map(key=>(
                                <div key={key} style={{display:"flex",alignItems:"center",gap:6}}>
                                  <span style={{fontSize:10,color:"#7a90aa",minWidth:55}}>{LABELS_RONGEUR[key]}</span>
                                  <input type="number" min="0" value={s["cap_"+key]||""}
                                    onChange={e=>setSaisieField(p.id,"cap_"+key,e.target.value)}
                                    style={{background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"3px 8px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit",width:55}}/>
                                </div>
                              ))}
                              {totalCaptures>0 && <span style={{fontSize:11,fontWeight:700,color:"#ef4444"}}>Total: {totalCaptures}</span>}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontSize:10,color:"#7a90aa",minWidth:70}}>Molécule :</span>
                              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                {[{id:"Placebo",nom:"Placebo",label:"🔵 Placebo"}, ...produitsBiocides.map(pr=>({...pr,label:pr.nom||pr.id}))].map(pr=>{
                                  const val = pr.nom||pr.id;
                                  const isSel = s.molecule===val;
                                  return (
                                    <button key={pr.id} onClick={()=>setSaisieField(p.id,"molecule",isSel?"":val)}
                                      style={{background:isSel?"#8b5cf6":"#243352",color:isSel?"#fff":"#7a90aa",border:"1px solid "+(isSel?"#8b5cf6":"#3d5270"),borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:isSel?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                                      {pr.label||val}
                                    </button>
                                  );
                                })}
                              </div>
                              {p.molecule_actuelle && !s.molecule && (
                                <span style={{fontSize:9,color:"#5a7090"}}>Dernière : {p.molecule_actuelle}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {nuisible==="Blattes" && !s.statut_poste && (
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <span style={{fontSize:11,color:"#7a90aa"}}>Captures :</span>
                            <input type="number" min="0" value={s.etat||""}
                              onChange={e=>setSaisieField(p.id,"etat",e.target.value)}
                              style={{background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"3px 8px",color:"#f1f5f9",fontSize:12,fontFamily:"inherit",width:70}}/>
                            {s.etat && <span style={{fontSize:10,fontWeight:700,color:codeCouleur,background:codeCouleur+"22",borderRadius:4,padding:"2px 8px"}}>
                              {parseInt(s.etat||0)>=seuils.blattes.moyen?"Eleve":parseInt(s.etat||0)>=seuils.blattes.leger?"Moyen":"Leger"}
                            </span>}
                          </div>
                        )}

                        {nuisible==="Insectes volants" && !s.statut_poste && (
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:6}}>
                            {CATS_IV.map(cat=>{
                              const v = parseInt(s["iv_"+cat]||0);
                              const sv = seuils.iv[cat]||{leger:999,moyen:9999};
                              const col = v>=sv.moyen?"#ef4444":v>=sv.leger?"#f59e0b":"#22c55e";
                              return (
                                <div key={cat} style={{display:"flex",alignItems:"center",gap:6,background:"#1a2540",borderRadius:6,padding:"5px 8px"}}>
                                  <span style={{fontSize:10,color:"#7a90aa",flex:1}}>{cat}</span>
                                  <input type="number" min="0" value={s["iv_"+cat]||""}
                                    onChange={e=>setSaisieField(p.id,"iv_"+cat,e.target.value)}
                                    style={{background:"#243352",border:"1px solid #3d5270",borderRadius:5,padding:"2px 6px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit",width:55}}/>
                                  {v>0 && <span style={{width:8,height:8,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}/>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {nuisible==="Teignes" && !s.statut_poste && (
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <span style={{fontSize:11,color:"#7a90aa"}}>Captures :</span>
                            <input type="number" min="0" value={s.etat||""}
                              onChange={e=>setSaisieField(p.id,"etat",e.target.value)}
                              style={{background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"3px 8px",color:"#f1f5f9",fontSize:12,fontFamily:"inherit",width:70}}/>
                            {s.etat && <span style={{fontSize:10,fontWeight:700,color:codeCouleur,background:codeCouleur+"22",borderRadius:4,padding:"2px 8px"}}>
                              {parseInt(s.etat||0)>=seuils.teignes.moyen?"Eleve":parseInt(s.etat||0)>=seuils.teignes.leger?"Moyen":"Leger"}
                            </span>}
                          </div>
                        )}

                        {nuisible==="IPS" && !s.statut_poste && (
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <span style={{fontSize:11,color:"#7a90aa"}}>Captures :</span>
                            <input type="number" min="0" value={s.etat||""}
                              onChange={e=>setSaisieField(p.id,"etat",e.target.value)}
                              style={{background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"3px 8px",color:"#f1f5f9",fontSize:12,fontFamily:"inherit",width:70}}/>
                            {s.etat && <span style={{fontSize:10,fontWeight:700,color:codeCouleur,background:codeCouleur+"22",borderRadius:4,padding:"2px 8px"}}>
                              {parseInt(s.etat||0)>=seuils.ips.moyen?"Eleve":parseInt(s.etat||0)>=seuils.ips.leger?"Moyen":"Leger"}
                            </span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>window.__isAdmin&&savePassage()} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:9,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  {editingPassage ? "Mettre a jour" : "Enregistrer le passage"}
                </button>
                <button onClick={()=>setView("liste")} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:9,padding:"10px 18px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {view==="liste" && (
            <Card>
              <div style={{textAlign:"center",color:"#5a7090",padding:20,fontSize:13}}>
                Les passages enregistres sont visibles dans l'onglet <strong style={{color:"#3b82f6"}}>Passages</strong>.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ONGLET MOLÉCULES */}
      {activeTab==="molecules_tab" && (()=>{
        // Couleurs par molécule
        const MOL_COLORS = ["#8b5cf6","#22c55e","#f59e0b","#ef4444","#06b6d4","#f97316","#ec4899","#84cc16","#14b8a6","#a78bfa","#fb923c","#34d399"];
        const allMols = [...new Set([
          ...postes.filter(p=>(p.nuisible||"Rongeurs")==="Rongeurs").map(p=>p.molecule_actuelle).filter(Boolean),
          ...passagesData.flatMap(pa=>{ const s=typeof pa.saisies==="string"?JSON.parse(pa.saisies||"{}"):pa.saisies||{}; return Object.values(s).map(x=>x?.molecule).filter(Boolean); })
        ])];
        const getMolColor = mol => { if(!mol)return "#3d5270"; if(mol==="Placebo")return "#3b82f6"; const others=allMols.filter(m=>m!=="Placebo"); const idx=others.indexOf(mol); return idx>=0?MOL_COLORS[idx%MOL_COLORS.length]:"#7a90aa"; };

        // Tri naturel des postes : RE1,RE2,...RE10,RE11 puis RI1,...
        function sortNaturel(arr) {
          return [...arr].sort((a,b)=>{
            const parse = id => { const m=id.match(/^([A-Za-z]+)(\d+)/); return m?[m[1],parseInt(m[2])]:[id,0]; };
            const [aL,aN]=parse(a.id), [bL,bN]=parse(b.id);
            if (aL<bL) return -1; if (aL>bL) return 1; return aN-bN;
          });
        }

        const filterType = filterTypeMol;
        const setFilterType = setFilterTypeMol;
        const passages6 = [...passagesData.filter(pa=>pa.type!=="Insectes volants")].sort((a,b)=>{
          const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0);};
          return pd(a.date)-pd(b.date); // plus ancienne à gauche
        });

        const postesRongeurs = sortNaturel(postes.filter(p=>(p.nuisible||"Rongeurs")==="Rongeurs"));
        const postesFiltres = filterType==="RE" ? postesRongeurs.filter(p=>p.type==="RE")
                            : filterType==="RI" ? postesRongeurs.filter(p=>p.type==="RI")
                            : postesRongeurs;

        function exportPdf() {
          const headerCols = passages6.map(pa=>"<th style='padding:4px 6px;border:1px solid #e5e7eb;font-size:10px'>"+pa.date+"</th>").join("");
          const rows = postesFiltres.map(p=>{
            const mc = getMolColor(p.molecule_actuelle||"");
            const molCols = passages6.map(pa=>{
              const saisiesP=typeof pa.saisies==="string"?JSON.parse(pa.saisies||"{}"):pa.saisies||{};
              const mol=saisiesP[p.id]?.molecule;
              return "<td style='padding:4px 6px;border:1px solid #e5e7eb;text-align:center;font-size:9px"+(mol?";color:"+getMolColor(mol)+";font-weight:bold":"")+"'>"+(mol||"—")+"</td>";
            }).join("");
            return "<tr><td style='padding:4px 6px;border:1px solid #e5e7eb;font-weight:bold;font-family:monospace'>"+p.id+"</td><td style='padding:4px 6px;border:1px solid #e5e7eb;font-size:10px'>"+p.type+"</td><td style='padding:4px 6px;border:1px solid #e5e7eb;font-size:10px'>"+p.zone+"</td><td style='padding:4px 6px;border:1px solid #e5e7eb;color:"+mc+";font-weight:bold;font-size:10px'>"+(p.molecule_actuelle||"—")+"</td>"+molCols+"</tr>";
          }).join("");
          exportHTML("Suivi molécules - "+CLIENT_CONFIG.nom,
            "<h1>Suivi des molécules par poste</h1>"+
            "<table style='width:100%;border-collapse:collapse;font-size:11px'><thead><tr>"+
            "<th style='padding:4px 6px;border:1px solid #e5e7eb'>Poste</th>"+
            "<th style='padding:4px 6px;border:1px solid #e5e7eb'>Type</th>"+
            "<th style='padding:4px 6px;border:1px solid #e5e7eb'>Zone</th>"+
            
            headerCols+"</tr></thead><tbody>"+rows+"</tbody></table>"
          );
        }

        function exportExcel() {
          const headers = ["Poste","Type","Zone",...passages6.map(pa=>pa.date)];
          const dataRows = postesFiltres.map(p=>{
            const saisiesCols = passages6.map(pa=>{
              const saisiesP=typeof pa.saisies==="string"?JSON.parse(pa.saisies||"{}"):pa.saisies||{};
              return saisiesP[p.id]?.molecule||"";
            });
            return [p.id, p.type||"", p.zone||"", ...saisiesCols];
          });
          const ws = [headers,...dataRows].map(r=>r.join("\t")).join("\n");
          const blob = new Blob([ws],{type:"text/tab-separated-values"});
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href=url; a.download="suivi_molecules.xls"; a.click();
          URL.revokeObjectURL(url);
        }

        return (
        <div>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>Suivi des molécules par poste</div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {/* Filtre RE/RI */}
              {["tous","RE","RI"].map(t=>(
                <button key={t} onClick={()=>setFilterType(t)}
                  style={{background:filterType===t?"#1d4ed8":"#243352",color:filterType===t?"#fff":"#7a90aa",border:"1px solid "+(filterType===t?"#3b82f6":"#3d5270"),borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:filterType===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                  {t==="tous"?"Tous":t==="RE"?"Ext. (RE)":"Int. (RI)"}
                </button>
              ))}
              <button onClick={exportPdf} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📄 PDF</button>
              <button onClick={exportExcel} style={{background:"#16a34a22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📊 Excel</button>
            </div>
          </div>

          {/* Légende couleurs molécules */}
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
            {allMols.map(mol=>(
              <span key={mol} style={{background:getMolColor(mol)+"22",color:getMolColor(mol),border:"1px solid "+getMolColor(mol)+"44",borderRadius:5,padding:"2px 10px",fontSize:10,fontWeight:700}}>
                {mol}
              </span>
            ))}
          </div>

          {/* Tableau */}
          <div style={{overflowX:"auto",marginBottom:24}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#243352",position:"sticky",top:0}}>
                  <th style={{padding:"8px 10px",textAlign:"left",color:"#7a90aa",fontWeight:600,fontSize:10,minWidth:70}}>Poste</th>
                  <th style={{padding:"8px 10px",textAlign:"left",color:"#7a90aa",fontWeight:600,fontSize:10}}>Type</th>
                  <th style={{padding:"8px 10px",textAlign:"left",color:"#7a90aa",fontWeight:600,fontSize:10,minWidth:100}}>Zone</th>
                  {passages6.map(pa=>(
                    <th key={pa.id} style={{padding:"8px 6px",textAlign:"center",color:"#7a90aa",fontWeight:600,fontSize:9,minWidth:72}}>{pa.date}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {postesFiltres.map((p,i)=>{
                  const mc = getMolColor(p.molecule_actuelle||"");
                  return (
                    <tr key={p.id} style={{borderBottom:"1px solid #24335233",background:i%2===0?"#1a2540":"transparent"}}>
                      <td style={{padding:"6px 10px",fontWeight:700,color:"#f1f5f9",fontFamily:"monospace",fontSize:11}}>{p.id}</td>
                      <td style={{padding:"6px 10px",fontSize:10}}>
                        <span style={{background:p.type==="RE"?"#1e40af22":"#3b82f622",color:p.type==="RE"?"#1e40af":"#60a5fa",borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:700}}>{p.type||"—"}</span>
                      </td>
                      <td style={{padding:"6px 10px",color:"#7a90aa",fontSize:10}}>{p.zone||"—"}</td>
                      {passages6.map(pa=>{
                        const saisiesP=typeof pa.saisies==="string"?JSON.parse(pa.saisies||"{}"):pa.saisies||{};
                        const s=saisiesP[p.id];
                        const mol=s?.molecule;
                        const isActif=s?.etat&&s.etat!=="";
                        const mc2=mol?getMolColor(mol):null;
                        return (
                          <td key={pa.id} style={{padding:"6px 6px",textAlign:"center"}}>
                            {mol
                              ? <span style={{fontSize:9,fontWeight:700,color:mc2,background:mc2+"22",borderRadius:4,padding:"2px 6px",display:"inline-block"}}>{mol}</span>
                              : isActif
                                ? <span style={{fontSize:10,color:"#3d5270"}}>—</span>
                                : <span style={{fontSize:10,color:"#243352"}}>·</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Résumé par molécule */}
          <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",marginBottom:12}}>Résumé par molécule (molécule actuelle)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            {allMols.map(mol=>{
              const ids = postesFiltres.filter(p=>p.molecule_actuelle===mol).map(p=>p.id);
              if (!ids.length) return null;
              const mc = getMolColor(mol);
              return (
                <div key={mol} style={{background:"#243352",borderRadius:10,padding:"12px 16px",minWidth:160,borderLeft:"3px solid "+mc}}>
                  <div style={{fontSize:13,fontWeight:700,color:mc,marginBottom:6}}>{mol}</div>
                  <div style={{fontSize:11,color:"#7a90aa",marginBottom:4}}>{ids.length} poste(s)</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                    {ids.slice(0,10).map(id=><span key={id} style={{background:mc+"22",color:mc,borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:700}}>{id}</span>)}
                    {ids.length>10&&<span style={{fontSize:9,color:"#5a7090"}}>+{ids.length-10}</span>}
                  </div>
                </div>
              );
            })}
            {postesFiltres.filter(p=>!p.molecule_actuelle).length>0&&(
              <div style={{background:"#243352",borderRadius:10,padding:"12px 16px",minWidth:160,borderLeft:"3px solid #3d5270"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#5a7090",marginBottom:6}}>Non renseigné</div>
                <div style={{fontSize:11,color:"#7a90aa"}}>{postesFiltres.filter(p=>!p.molecule_actuelle).length} poste(s)</div>
              </div>
            )}
          </div>
        </div>
        );
      })()}

    </div>
  );
}

// ============================================================
// RÉINTERVENTIONS
// ============================================================
function Reinterventions({ reinterventions, setReinterventions }) {
  const TECHNICIENS = useTechniciens();
  const ACTIONS_LIST = ["Remplacement appâts", "Renouvellement pièges", "Pose piège supplémentaire", "Colmatage passage", "Nettoyage poste", "Inspection renforcée", "Traitement curatif", "Photo prise"];
  const [sel, setSel] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", technicien: "", poste: "", anomalie: "", actions: [], observations: "", statut: "En cours" });

  function toggleAction(a) { setForm(p => ({ ...p, actions: p.actions.includes(a) ? p.actions.filter(x => x !== a) : [...p.actions, a] })); }

  function submit() {
    if (!form.date || !form.technicien || !form.poste) return;
    const newItem = { ...form, id: Date.now(), contrat: CLIENT_CONFIG.contrat };
    setReinterventions(prev => [newItem, ...prev]);
    sbUpsert("reinterventions", newItem);
    setShowForm(false);
    setForm({ date: "", technicien: "", poste: "", anomalie: "", actions: [], observations: "", statut: "En cours" });
  }

  const SCOLOR = { Traité: "#22c55e", "En cours": "#f59e0b", Planifié: "#3b82f6" };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 2 }}>Réinterventions curatives</div>
          <div style={{ fontSize: 13, color: "#7a90aa" }}>{reinterventions.length} interventions</div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          + Nouvelle réintervention
        </button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>Saisie réintervention</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Technicien *</label>
              <select value={form.technicien} onChange={e => setForm(p => ({ ...p, technicien: e.target.value }))} style={inp()}>
                <option value="">--</option>
                {TECHNICIENS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Poste(s) *</label>
              <input value={form.poste} onChange={e => setForm(p => ({ ...p, poste: e.target.value }))} placeholder="ex: RE26, RE29" style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Statut</label>
              <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))} style={inp()}>
                <option value="En cours">En cours</option>
                <option value="Traité">Traité</option>
                <option value="Planifié">Planifié</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Anomalie</label>
            <input value={form.anomalie} onChange={e => setForm(p => ({ ...p, anomalie: e.target.value }))} style={inp()} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, display: "block", marginBottom: 8, textTransform: "uppercase" }}>Actions</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ACTIONS_LIST.map(a => {
                const checked = form.actions.includes(a);
                return (
                  <button key={a} onClick={() => toggleAction(a)}
                    style={{ background: checked ? "#1d4ed822" : "#1a2540", color: checked ? "#3b82f6" : "#7a90aa", border: "1px solid " + (checked ? "#3b82f6" : "#3d5270"), borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: checked ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Observations</label>
            <textarea rows={2} value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))}
              style={{ ...inp(), resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={submit} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Enregistrer</button>
            <button onClick={() => setShowForm(false)} style={{ background: "transparent", color: "#7a90aa", border: "1px solid #3d5270", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {reinterventions.map(item => {
          const isOpen = sel === item.id;
          return (
            <Card key={item.id} selected={isOpen} onClick={() => setSel(isOpen ? null : item.id)}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 90, fontSize: 13, fontWeight: 700, color: "#f1f5f9", fontFamily: "monospace" }}>{item.date}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{item.technicien}</div>
                  <div style={{ fontSize: 11, color: "#7a90aa" }}>Postes : {item.poste}</div>
                </div>
                {(item.actions || []).slice(0, 2).map(a => (
                  <span key={a} style={{ fontSize: 10, fontWeight: 600, background: "#1d4ed822", color: "#3b82f6", border: "1px solid #3b82f644", borderRadius: 4, padding: "2px 7px" }}>{a}</span>
                ))}
                <Badge label={item.statut} color={SCOLOR[item.statut] || "#7a90aa"} />
                <button onClick={e => { e.stopPropagation(); setReinterventions(prev => prev.filter(i => i.id !== item.id)); sbDelete("reinterventions", item.id); setSel(null); }}
                  style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  ✕
                </button>
              </div>
              {isOpen && item.observations && (
                <div style={{ marginTop: 12, background: "#1a3360", border: "1px solid #1d4ed844", borderRadius: 10, padding: "10px 13px" }}>
                  <div style={{ fontSize: 13, color: "#93c5fd" }}>{item.observations}</div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// PRODUITS
// ============================================================
function Produits() {
  const STATUTS  = ["Actif", "En alerte", "Inactif", "Expire"];
  const ZONES    = ["Exterieur", "Interieur", "Tous"];
  const DOC_TYPES = ["Fiche technique (FT)", "Fiche de données de sécurité (FDS)", "Autorisation AMM", "Autre"];
  const inpStyle = inp();

  const [produits, setProduits] = useState(PRODUITS.map(p => ({...p, id: String(p.id)})));
  const [docs, setDocs]         = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ nom:"", fournisseur:"", ref:"", sa:"", amm:"", statut:"Actif", zone:"Exterieur" });
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [search, setSearch]     = useState("");
  const [uploading, setUploading] = useState(null);
  const [newDocType, setNewDocType] = useState("Fiche technique (FT)");
  const [sel, setSel]           = useState(null);

  useEffect(() => {
    sbGet("produits_biocides").then(data => {
      if (data && data.length > 0) setProduits(data);
      else PRODUITS.forEach(p => sbUpsert("produits_biocides", { id:String(p.id), contrat:CLIENT_CONFIG.contrat, nom:p.nom, fournisseur:p.fournisseur, ref:p.ref, sa:p.sa, amm:p.amm, statut:p.statut, zone:p.zone }));
    }).catch(()=>{});
    sbGet("produits_docs").then(data => {
      if (data && data.length > 0) {
        const byId = {};
        data.forEach(d => { if (!byId[d.produit_id]) byId[d.produit_id] = []; byId[d.produit_id].push(d); });
        setDocs(byId);
      }
    }).catch(()=>{});
  }, []);

  const filtered = produits.filter(p => {
    if (filterStatut !== "Tous" && p.statut !== filterStatut) return false;
    if (search) { const s = search.toLowerCase(); return (p.nom||"").toLowerCase().includes(s) || (p.sa||"").toLowerCase().includes(s) || (p.ref||"").toLowerCase().includes(s); }
    return true;
  });

  function startAdd() { setForm({ nom:"", fournisseur:"", ref:"", sa:"", amm:"", statut:"Actif", zone:"Exterieur" }); setEditing(null); setShowForm(true); }
  function startEdit(p) { setForm({...p}); setEditing(p.id); setShowForm(true); }

  function save() {
    if (!form.nom) return;
    if (editing) {
      setProduits(prev => prev.map(p => p.id === editing ? {...form, id:editing} : p));
      sbUpdate("produits_biocides", editing, { nom:form.nom, fournisseur:form.fournisseur, ref:form.ref, sa:form.sa, amm:form.amm, statut:form.statut, zone:form.zone });
    } else {
      const id = String(Date.now());
      setProduits(prev => [...prev, {...form, id}]);
      sbUpsert("produits_biocides", { id, contrat:CLIENT_CONFIG.contrat, ...form });
    }
    setShowForm(false); setEditing(null);
  }

  function deleteProduit(id) {
    setProduits(prev => prev.filter(p => p.id !== id));
    sbDelete("produits_biocides", id);
    if (sel === id) setSel(null);
  }

  async function uploadDoc(produitId, file, type) {
    if (!file) return;
    setUploading(produitId+"_"+type);
    const path = CLIENT_CONFIG.contrat + "/produits/" + produitId + "_" + Date.now() + "_" + file.name;
    try {
      const res = await fetch(SUPABASE_URL + "/storage/v1/object/documents/" + path, {
        method:"POST",
        headers:{ apikey:SUPABASE_KEY, Authorization:"Bearer "+SUPABASE_KEY, "Content-Type":file.type },
        body: file
      });
      if (res.ok) {
        const url = SUPABASE_URL + "/storage/v1/object/public/documents/" + path;
        const id = String(Date.now());
        const newDoc = { id, contrat:CLIENT_CONFIG.contrat, produit_id:produitId, type, nom:file.name, url };
        sbUpsert("produits_docs", newDoc);
        setDocs(prev => ({ ...prev, [produitId]: [...(prev[produitId]||[]), newDoc] }));
      }
    } catch(e) { console.error(e); }
    setUploading(null);
  }

  function deleteDoc(produitId, docId) {
    setDocs(prev => ({ ...prev, [produitId]: (prev[produitId]||[]).filter(d => d.id !== docId) }));
    sbDelete("produits_docs", docId);
  }

  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9", marginBottom:2 }}>Produits biocides</div>
          <div style={{ fontSize:13, color:"#7a90aa" }}>{produits.length} produits enregistres</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            const rows = filtered.map(p=>"<tr><td style='font-weight:700'>"+p.nom+"</td><td>"+(p.fournisseur||"")+"</td><td style='color:#a78bfa'>"+(p.sa||"")+"</td><td>"+(p.amm||"")+"</td><td>"+(p.zone||"")+"</td><td style='font-weight:700;color:"+(p.statut==="Actif"?"#22c55e":p.statut==="Expire"?"#ef4444":"#f59e0b")+"'>"+p.statut+"</td></tr>").join("");
            exportHTML("Produits biocides - "+CLIENT_CONFIG.nom,
              "<h1>Produits biocides</h1><p style='color:#6b7280;margin-bottom:12px'>"+CLIENT_CONFIG.nom+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+
              "<table><thead><tr><th>Nom</th><th>Fournisseur</th><th>Matière active</th><th>N° AMM</th><th>Zone</th><th>Statut</th></tr></thead><tbody>"+rows+"</tbody></table>"
            );
          }} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:9,padding:"10px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Export PDF
          </button>
          <button onClick={startAdd} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + Ajouter un produit
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:16 }}>
        <Kpi label="Total produits" value={produits.length} color="#3b82f6"/>
        <Kpi label="Actifs" value={produits.filter(p=>p.statut==="Actif").length} color="#22c55e"/>
        <Kpi label="Expires" value={produits.filter(p=>p.statut==="Expire").length} color="#ef4444"/>
        <Kpi label="Matieres actives" value={new Set(produits.map(p=>p.sa).filter(Boolean)).size} color="#a78bfa"/>
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", marginBottom:14 }}>
            {editing ? "Modifier le produit" : "Nouveau produit biocide"}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:10 }}>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Nom *</label>
              <input value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))} style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Fournisseur</label>
              <input value={form.fournisseur} onChange={e=>setForm(p=>({...p,fournisseur:e.target.value}))} style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Reference</label>
              <input value={form.ref} onChange={e=>setForm(p=>({...p,ref:e.target.value}))} style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Matiere active (SA)</label>
              <input value={form.sa} onChange={e=>setForm(p=>({...p,sa:e.target.value}))} style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>N° AMM</label>
              <input value={form.amm} onChange={e=>setForm(p=>({...p,amm:e.target.value}))} style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Zone</label>
              <select value={form.zone} onChange={e=>setForm(p=>({...p,zone:e.target.value}))} style={inpStyle}>
                {ZONES.map(z=><option key={z}>{z}</option>)}
              </select></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Statut</label>
              <select value={form.statut} onChange={e=>setForm(p=>({...p,statut:e.target.value}))} style={inpStyle}>
                {STATUTS.map(s=><option key={s}>{s}</option>)}
              </select></div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={save} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {editing ? "Mettre a jour" : "Enregistrer"}
            </button>
            <button onClick={()=>{setShowForm(false);setEditing(null);}} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:8, padding:"8px 14px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Filtres */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
          style={{ background:"#243352", border:"1px solid #3d5270", borderRadius:8, padding:"7px 14px", color:"#f1f5f9", fontSize:12, fontFamily:"inherit", width:200 }}/>
        {["Tous","Actif","En alerte","Inactif","Expire"].map(s=>(
          <button key={s} onClick={()=>setFilterStatut(s)}
            style={{ background:filterStatut===s?"#1d4ed8":"transparent", color:filterStatut===s?"#fff":"#7a90aa", border:"1px solid "+(filterStatut===s?"#1d4ed8":"#3d5270"), borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            {s}
          </button>
        ))}
        <span style={{ fontSize:12, color:"#5a7090", alignSelf:"center" }}>{filtered.length} produit(s)</span>
      </div>

      {/* Liste */}
      {filtered.map((p,i) => {
        const isS = sel === p.id;
        const pDocs = docs[p.id]||[];
        const col = p.statut==="Actif"?"#22c55e":p.statut==="Expire"?"#ef4444":"#f59e0b";
        return (
          <Card key={p.id} style={{ marginBottom:8, borderLeft:"3px solid "+col }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
              <div onClick={()=>setSel(isS?null:p.id)} style={{ flex:1, cursor:"pointer" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"#f1f5f9" }}>{p.nom}</span>
                  <span style={{ fontSize:9, fontWeight:700, color:col, background:col+"22", border:"1px solid "+col+"44", borderRadius:4, padding:"1px 6px" }}>{p.statut}</span>
                  {pDocs.length>0 && <span style={{ fontSize:10, color:"#3b82f6", fontWeight:700 }}>{pDocs.length} doc(s)</span>}
                </div>
                <div style={{ fontSize:11, color:"#7a90aa" }}>
                  {p.fournisseur&&<span style={{ marginRight:10 }}>{p.fournisseur}</span>}
                  {p.sa&&<span style={{ color:"#a78bfa", fontWeight:600, marginRight:10 }}>{p.sa}</span>}
                  {p.amm&&<span>AMM: {p.amm}</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                <button onClick={()=>startEdit(p)} style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:5, padding:"3px 8px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Edit</button>
                <button onClick={()=>deleteProduit(p.id)} style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444433", borderRadius:5, padding:"3px 6px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>X</button>
              </div>
            </div>

            {/* Documents section */}
            {isS && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #3d5270" }}>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                  <select value={newDocType} onChange={e=>setNewDocType(e.target.value)}
                    style={{ background:"#1a2540", border:"1px solid #3d5270", borderRadius:6, padding:"4px 8px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" }}>
                    {DOC_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                  <label style={{ fontSize:11, color:"#3b82f6", fontWeight:700, cursor:"pointer", background:"#1d4ed822", border:"1px solid #3b82f644", borderRadius:6, padding:"4px 10px" }}>
                    {uploading===p.id+"_"+newDocType?"Envoi...":"+ Ajouter document"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }}
                      onChange={e=>uploadDoc(p.id, e.target.files[0], newDocType)}/>
                  </label>
                </div>
                {pDocs.length===0 ? (
                  <div style={{ fontSize:11, color:"#5a7090" }}>Aucun document</div>
                ) : pDocs.map(d=>(
                  <div key={d.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, background:"#1a2540", borderRadius:6, padding:"5px 10px" }}>
                    <span style={{ fontSize:9, fontWeight:700, background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:4, padding:"1px 6px", whiteSpace:"nowrap" }}>{d.type}</span>
                    <span style={{ fontSize:11, color:"#cbd5e1", flex:1 }}>{d.nom}</span>
                    <a href={d.url} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, color:"#22c55e", fontWeight:700, textDecoration:"none" }}>Voir</a>
                    <button onClick={()=>deleteDoc(p.id, d.id)}
                      style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444433", borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>X</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Habilitations() {
  const ROLES = ["Technicien", "Chef d'equipe", "Technicien titulaire", "Responsable", "Stagiaire", "Chauffeur technicien", "Technicien ITV"];
  const CERTIFS = [
    { key:"certiphyto",   label:"Certiphyto" },
    { key:"certibiocide", label:"Certibiocide" },
    { key:"hab_elec",     label:"Habilitation electrique" },
    { key:"caces",        label:"CACES" },
    { key:"pack_sec",     label:"Pack securite" },
  ];
  const DOC_TYPES_3D = ["Certiphyto", "Certibiocide", "Habilitation electrique", "CACES", "Pack securite", "Contrat", "Diplome", "Formation", "Autre"];
  const DOC_TYPES_ASSAIN = ["CATEC", "Permis C", "CACES hydrocureur", "Habilitation EU/EP", "Visite medicale", "Contrat", "Diplome", "Formation", "Autre"];
  const inpStyle = inp();

  const [techniciens, setTechniciens] = useState(HABILITATIONS.map(h => ({...h, id: String(h.id), equipe: h.equipe||"3d"})));
  const [docs, setDocs]               = useState({});
  const [sel, setSel]                 = useState(null);
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [activeEquipe, setActiveEquipe] = useState("3d");
  const [form, setForm]               = useState({ nom:"", role:"Technicien", actif:true, certiphyto:false, certibiocide:false, hab_elec:false, caces:false, pack_sec:false, telephone:"", email:"", equipe:"3d" });
  const [uploading, setUploading]     = useState(null);
  const [newDocType, setNewDocType]   = useState("Certiphyto");
  const [hiddenIds, setHiddenIds]     = useState([]);
  const [draggingId, setDraggingId]   = useState(null);
  const [showHidden, setShowHidden]   = useState(false);

  const DOC_TYPES = activeEquipe === "assainissement" ? DOC_TYPES_ASSAIN : DOC_TYPES_3D;

  useEffect(() => {
    sbGet("habilitations").then(data => {
      if (data && data.length > 0) {
        try {
          const savedOrder = localStorage.getItem("aads_hab_order");
          if (savedOrder) {
            const order = JSON.parse(savedOrder);
            const sorted = [...data].sort((a,b) => {
              const ia = order.indexOf(a.id);
              const ib = order.indexOf(b.id);
              return (ia===-1?999:ia) - (ib===-1?999:ib);
            });
            setTechniciens(sorted.map(h=>({...h, equipe:h.equipe||"3d"})));
          } else {
            setTechniciens(data.map(h=>({...h, equipe:h.equipe||"3d"})));
          }
        } catch(e) { setTechniciens(data.map(h=>({...h, equipe:h.equipe||"3d"}))); }
      } else {
        HABILITATIONS.forEach(h => sbUpsert("habilitations", { id:String(h.id), contrat:CLIENT_CONFIG.contrat, nom:h.nom, role:h.role, actif:h.actif, certiphyto:h.certiphyto, certibiocide:h.certibiocide, hab_elec:h.habElec||false, caces:h.caces, pack_sec:h.packSec||false, telephone:h.telephone||"", email:h.email||"", equipe:"3d" }));
      }
    }).catch(()=>{});
    sbGet("habilitations_docs").then(data => {
      if (data && data.length > 0) {
        const byTech = {};
        data.forEach(d => { if (!byTech[d.habilitation_id]) byTech[d.habilitation_id] = []; byTech[d.habilitation_id].push(d); });
        setDocs(byTech);
      }
    }).catch(()=>{});
  }, []);

  function startAdd() { setForm({ nom:"", role:"Technicien", actif:true, certiphyto:false, certibiocide:false, hab_elec:false, caces:false, pack_sec:false, telephone:"", email:"", equipe:activeEquipe }); setEditing(null); setShowForm(true); }
  function startEdit(t) { setForm({...t, equipe:t.equipe||"3d"}); setEditing(t.id); setShowForm(true); }

  function save() {
    if (!form.nom) return;
    if (editing) {
      setTechniciens(prev => prev.map(t => t.id === editing ? {...form, id:editing} : t));
      sbUpdate("habilitations", editing, { nom:form.nom, role:form.role, actif:form.actif, certiphyto:form.certiphyto, certibiocide:form.certibiocide, hab_elec:form.hab_elec, caces:form.caces, pack_sec:form.pack_sec, telephone:form.telephone||"", email:form.email||"", equipe:form.equipe||"3d" });
      if (sel && sel.id === editing) setSel({...form, id:editing});
    } else {
      const id = String(Date.now());
      const newT = {...form, id};
      setTechniciens(prev => [...prev, newT]);
      sbUpsert("habilitations", { id, contrat:CLIENT_CONFIG.contrat, ...form, telephone:form.telephone||"", email:form.email||"", equipe:form.equipe||"3d" });
    }
    setShowForm(false); setEditing(null);
  }

  function deleteTech(id) {
    setTechniciens(prev => prev.filter(t => t.id !== id));
    sbDelete("habilitations", id);
    if (sel && sel.id === id) setSel(null);
  }

  async function uploadDoc(techId, file, type) {
    if (!file) return;
    setUploading(techId+"_"+type);
    const path = CLIENT_CONFIG.contrat + "/hab/" + techId + "_" + type.replace(/ /g,"_") + "_" + file.name;
    try {
      const res = await fetch(SUPABASE_URL + "/storage/v1/object/documents/" + path, {
        method:"POST",
        headers: { apikey:SUPABASE_KEY, Authorization:"Bearer "+SUPABASE_KEY, "Content-Type":file.type },
        body: file
      });
      if (res.ok) {
        const url = SUPABASE_URL + "/storage/v1/object/public/documents/" + path;
        const id = String(Date.now());
        const newDoc = { id, contrat:CLIENT_CONFIG.contrat, habilitation_id:techId, type, nom:file.name, url };
        sbUpsert("habilitations_docs", newDoc);
        setDocs(prev => ({ ...prev, [techId]: [...(prev[techId]||[]), newDoc] }));
      }
    } catch(e) { console.error(e); }
    setUploading(null);
  }

  function deleteDoc(techId, docId) {
    setDocs(prev => ({ ...prev, [techId]: (prev[techId]||[]).filter(d => d.id !== docId) }));
    sbDelete("habilitations_docs", docId);
  }

  const selTech = sel ? techniciens.find(t => t.id === sel.id) : null;
  const selDocs = sel ? (docs[sel.id]||[]) : [];

  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9", marginBottom:2 }}>Habilitations</div>
          <div style={{ fontSize:13, color:"#7a90aa" }}>{techniciens.length} techniciens — {techniciens.filter(t=>t.actif).length} actifs</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            const rows = techniciens.filter(t=>!hiddenIds.includes(t.id) && t.equipe===activeEquipe).map(t=>{
              const certifsCols = CERTIFS.map(c=>"<td style='text-align:center;color:"+(t[c.key]?"#22c55e":"#ef4444")+"'>"+(t[c.key]?"✓":"✗")+"</td>").join("");
              return "<tr><td style='font-weight:700'>"+t.nom+"</td><td>"+(t.role||"")+"</td><td>"+(t.telephone||"")+"</td>"+certifsCols+"<td style='font-weight:700;color:"+(t.actif?"#22c55e":"#ef4444")+"'>"+(t.actif?"Actif":"Inactif")+"</td></tr>";
            }).join("");
            const titre = activeEquipe==="3d" ? "Equipe 3D" : "Equipe Assainissement";
            exportHTML("Habilitations "+titre+" - "+CLIENT_CONFIG.nom,
              "<h1>Habilitations techniciens — "+titre+"</h1><p style='color:#6b7280;margin-bottom:12px'>"+CLIENT_CONFIG.nom+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+
              "<table><thead><tr><th>Nom</th><th>Role</th><th>Telephone</th>"+CERTIFS.map(c=>"<th>"+c.label+"</th>").join("")+"<th>Statut</th></tr></thead><tbody>"+rows+"</tbody></table>"
            );
          }} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:9,padding:"10px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Export PDF
          </button>
          <button onClick={startAdd} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + Nouveau technicien
          </button>
        </div>
      </div>

      {/* Onglets équipes */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"2px solid #243352"}}>
        {[{id:"3d",label:"Equipe 3D",color:"#3b82f6"},{id:"assainissement",label:"Equipe Assainissement",color:"#0ea5e9"}].map(eq=>{
          const active = activeEquipe===eq.id;
          const nb = techniciens.filter(t=>t.equipe===eq.id).length;
          return (
            <button key={eq.id} onClick={()=>{setActiveEquipe(eq.id);setSel(null);setShowForm(false);}}
              style={{background:"transparent",border:"none",borderBottom:"3px solid "+(active?eq.color:"transparent"),color:active?eq.color:"#7a90aa",fontWeight:active?700:400,fontSize:13,padding:"10px 20px",cursor:"pointer",fontFamily:"inherit",marginBottom:-2}}>
              {eq.label} <span style={{fontSize:11,background:active?eq.color+"22":"#243352",color:active?eq.color:"#5a7090",borderRadius:10,padding:"1px 7px",marginLeft:4}}>{nb}</span>
            </button>
          );
        })}
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", marginBottom:14 }}>{editing?"Modifier":"Nouveau technicien"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:12 }}>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Nom *</label>
              <input value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))} style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Equipe</label>
              <div style={{display:"flex",gap:6}}>
                {[{id:"3d",label:"Equipe 3D",color:"#3b82f6"},{id:"assainissement",label:"Assainissement",color:"#0ea5e9"}].map(eq=>{
                  const active=form.equipe===eq.id;
                  return <button key={eq.id} type="button" onClick={()=>setForm(p=>({...p,equipe:eq.id}))}
                    style={{background:active?eq.color+"22":"#243352",color:active?eq.color:"#7a90aa",border:"1px solid "+(active?eq.color:"#3d5270"),borderRadius:6,padding:"4px 9px",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",flex:1}}>{eq.label}</button>;
                })}
              </div>
            </div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Role</label>
              <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} style={inpStyle}>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </select></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Telephone</label>
              <input value={form.telephone||""} onChange={e=>setForm(p=>({...p,telephone:e.target.value}))} placeholder="06 xx xx xx xx" style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Email</label>
              <input type="email" value={form.email||""} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="nom@aads.fr" style={inpStyle}/></div>
            <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:14 }}>
              <input type="checkbox" checked={form.actif} onChange={e=>setForm(p=>({...p,actif:e.target.checked}))} style={{ accentColor:"#22c55e" }}/>
              <label style={{ fontSize:12, color:"#f1f5f9" }}>Actif</label>
            </div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginBottom:12 }}>
            {CERTIFS.map(c=>(
              <label key={c.key} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
                <input type="checkbox" checked={!!form[c.key]} onChange={e=>setForm(p=>({...p,[c.key]:e.target.checked}))} style={{ accentColor:"#3b82f6" }}/>
                <span style={{ fontSize:12, color:"#f1f5f9" }}>{c.label}</span>
              </label>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={save} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {editing?"Mettre a jour":"Enregistrer"}
            </button>
            <button onClick={()=>{setShowForm(false);setEditing(null);}} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:8, padding:"8px 14px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Contrôles tri/masquage */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>setShowHidden(v=>!v)}
          style={{background:showHidden?"#243352":"transparent",color:showHidden?"#f1f5f9":"#7a90aa",border:"1px solid #3d5270",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
          {showHidden?"Masquer les cachés":"Voir tous ("+(hiddenIds.length)+" masqués)"}
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:sel?"1fr 1fr":"1fr", gap:16 }}>
        {/* Liste techniciens */}
        <div>
          {techniciens.filter(t=>(t.equipe||"3d")===activeEquipe).filter(t=>showHidden||!hiddenIds.includes(t.id)).map((t,i,arr) => {
            const isS = sel && sel.id === t.id;
            const nbCertifs = CERTIFS.filter(c=>t[c.key]).length;
            const tDocs = docs[t.id]||[];
            const isHidden = hiddenIds.includes(t.id);
            const realIdx = techniciens.findIndex(x=>x.id===t.id);
            return (
              <Card key={t.id}
                onClick={()=>setSel(isS?null:t)}
                style={{ marginBottom:10, border:"1px solid "+(isS?"#3b82f6":"#3d5270"), background:isS?"#2d4a7a":isHidden?"#1a2540":"#243352", opacity:isHidden?0.5:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{flex:1}}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <div style={{display:"flex",flexDirection:"column",gap:1}} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>{if(realIdx===0)return;const l=[...techniciens];const[m]=l.splice(realIdx,1);l.splice(realIdx-1,0,m);setTechniciens(l);try{localStorage.setItem("aads_hab_order",JSON.stringify(l.map(x=>x.id)));}catch(e){}}}
                          style={{background:"transparent",border:"none",color:"#7a90aa",cursor:"pointer",fontSize:10,padding:"0 2px",lineHeight:1}}>▲</button>
                        <button onClick={()=>{if(realIdx===techniciens.length-1)return;const l=[...techniciens];const[m]=l.splice(realIdx,1);l.splice(realIdx+1,0,m);setTechniciens(l);try{localStorage.setItem("aads_hab_order",JSON.stringify(l.map(x=>x.id)));}catch(e){}}}
                          style={{background:"transparent",border:"none",color:"#7a90aa",cursor:"pointer",fontSize:10,padding:"0 2px",lineHeight:1}}>▼</button>
                      </div>
                      <span style={{ width:8, height:8, borderRadius:"50%", background:t.actif?"#22c55e":"#5a7090", display:"inline-block", flexShrink:0 }}/>
                      <div style={{ fontSize:14, fontWeight:800, color:"#f1f5f9" }}>{t.nom}</div>
                      {t.telephone && <a href={"tel:"+t.telephone} onClick={e=>e.stopPropagation()} style={{fontSize:11,color:"#f1f5f9",textDecoration:"none",fontWeight:600}}>📞 {t.telephone}</a>}
                      {t.email && <a href={"mailto:"+t.email} onClick={e=>e.stopPropagation()} style={{fontSize:11,color:"#f1f5f9",textDecoration:"none",fontWeight:600}}>✉ {t.email}</a>}
                    </div>
                    <div style={{ fontSize:11, color:"#7a90aa", marginBottom:8 }}>{t.role}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {CERTIFS.map(c=>(
                        <span key={c.key} style={{ fontSize:9, fontWeight:700, color:t[c.key]?"#22c55e":"#3d5270", background:t[c.key]?"#22c55e22":"#1a2540", border:"1px solid "+(t[c.key]?"#22c55e44":"#243352"), borderRadius:4, padding:"1px 6px" }}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                    {tDocs.length > 0 && <span style={{ fontSize:10, color:"#3b82f6", fontWeight:700 }}>{tDocs.length} doc(s)</span>}
                    <div style={{ display:"flex", gap:4 }} onClick={e=>e.stopPropagation()}>
                      <label style={{ background:"#22c55e22", color:"#22c55e", border:"1px solid #22c55e44", borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, cursor:"pointer" }}
                        title="Ajouter un document">
                        + Doc
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }}
                          onChange={e=>{ if(e.target.files[0]) uploadDoc(t.id, e.target.files[0], newDocType); }}/>
                      </label>
                      <button onClick={e=>{e.stopPropagation();setHiddenIds(prev=>prev.includes(t.id)?prev.filter(x=>x!==t.id):[...prev,t.id]);}} style={{ background:isHidden?"#f59e0b22":"#243352", color:isHidden?"#f59e0b":"#7a90aa", border:"1px solid "+(isHidden?"#f59e0b44":"#3d5270"), borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{isHidden?"Afficher":"Masquer"}</button>
                      <button onClick={e=>{e.stopPropagation();startEdit(t);}} style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Edit</button>
                      <button onClick={e=>{e.stopPropagation();deleteTech(t.id);}} style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444433", borderRadius:5, padding:"2px 6px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>X</button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Fiche detail + documents */}
        {sel && selTech && (
          <div>
            <Card style={{ marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:800, color:"#f1f5f9", marginBottom:2 }}>{selTech.nom}</div>
              <div style={{ fontSize:12, color:"#7a90aa", marginBottom:4 }}>{selTech.role}</div>
              {selTech.telephone && <div style={{ fontSize:12, color:"#94a3b8", marginBottom:2 }}>📞 {selTech.telephone}</div>}
              {selTech.email && <div style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>✉ {selTech.email}</div>}
              {!selTech.telephone && !selTech.email && <div style={{ marginBottom:12 }}/>}
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                {CERTIFS.map(c=>(
                  <span key={c.key} style={{ fontSize:10, fontWeight:700, color:selTech[c.key]?"#22c55e":"#5a7090", background:selTech[c.key]?"#22c55e22":"#1a2540", border:"1px solid "+(selTech[c.key]?"#22c55e44":"#3d5270"), borderRadius:6, padding:"2px 8px" }}>
                    {selTech[c.key]?"✓":""} {c.label}
                  </span>
                ))}
              </div>

              {/* Upload document */}
              <div style={{ borderTop:"1px solid #3d5270", paddingTop:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#7a90aa", textTransform:"uppercase", marginBottom:8 }}>Ajouter un document</div>
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <select value={newDocType} onChange={e=>setNewDocType(e.target.value)} style={{...inpStyle, fontSize:11, padding:"4px 8px"}}>
                    {DOC_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                  <label style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:7, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    {uploading?"Envoi...":"+ Importer PDF"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }}
                      onChange={e=>uploadDoc(sel.id, e.target.files[0], newDocType)}/>
                  </label>
                </div>
              </div>
            </Card>

            {/* Liste documents */}
            {selDocs.length > 0 && (
              <Card style={{ padding:0, overflow:"hidden" }}>
                <div style={{ padding:"10px 14px", fontSize:11, fontWeight:700, color:"#7a90aa", textTransform:"uppercase", borderBottom:"1px solid #3d5270" }}>
                  Documents ({selDocs.length})
                </div>
                {selDocs.map(d=>(
                  <div key={d.id} style={{ padding:"8px 14px", display:"flex", alignItems:"center", gap:10, borderTop:"1px solid #243352" }}>
                    <span style={{ fontSize:9, fontWeight:700, background:"#3b82f622", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:4, padding:"1px 6px", whiteSpace:"nowrap" }}>{d.type}</span>
                    <span style={{ fontSize:11, color:"#cbd5e1", flex:1 }}>{d.nom}</span>
                    <a href={d.url} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, color:"#22c55e", fontWeight:700, textDecoration:"none" }}>Voir</a>
                    <button onClick={()=>deleteDoc(sel.id, d.id)}
                      style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444433", borderRadius:4, padding:"1px 6px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>X</button>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function Agrements() {
  const TYPES   = ["Certification", "Assurance", "Agrement", "Autorisation", "Autre"];
  const STATUTS = ["Valide", "En cours", "Expire", "En alerte"];
  const inpStyle = inp();

  const [agrements, setAgrements] = useState(AGREMENTS.map(a => ({...a, id:String(a.id)})));
  const [docs, setDocs]           = useState({});
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({ type:"Certification", nom:"", statut:"Valide" });
  const [uploading, setUploading] = useState(null);
  const [sel, setSel]             = useState(null);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    sbGet("agrements").then(data => {
      if (data && data.length > 0) {
        try {
          const savedOrder = localStorage.getItem("aads_agr_order");
          if (savedOrder) {
            const order = JSON.parse(savedOrder);
            const sorted = [...data].sort((a,b) => {
              const ia = order.indexOf(a.id);
              const ib = order.indexOf(b.id);
              return (ia===-1?999:ia) - (ib===-1?999:ib);
            });
            setAgrements(sorted);
          } else {
            setAgrements(data);
          }
        } catch(e) { setAgrements(data); }
      } else AGREMENTS.forEach(a => sbUpsert("agrements", { id:String(a.id), contrat:CLIENT_CONFIG.contrat, type:a.type, nom:a.nom, statut:a.statut, url:"" }));
    }).catch(()=>{});
    sbGet("agrements_docs").then(data => {
      if (data && data.length > 0) {
        const byId = {};
        data.forEach(d => { if (!byId[d.agrement_id]) byId[d.agrement_id] = []; byId[d.agrement_id].push(d); });
        setDocs(byId);
      }
    }).catch(()=>{});
  }, []);

  function startAdd() { setForm({ type:"Certification", nom:"", statut:"Valide" }); setEditing(null); setShowForm(true); }
  function startEdit(a) { setForm({...a}); setEditing(a.id); setShowForm(true); }

  function save() {
    if (!form.nom) return;
    if (editing) {
      setAgrements(prev => prev.map(a => a.id===editing ? {...form, id:editing} : a));
      sbUpdate("agrements", editing, { type:form.type, nom:form.nom, statut:form.statut });
    } else {
      const id = String(Date.now());
      setAgrements(prev => [...prev, {...form, id}]);
      sbUpsert("agrements", { id, contrat:CLIENT_CONFIG.contrat, ...form });
    }
    setShowForm(false); setEditing(null);
  }

  function deleteAgrement(id) {
    setAgrements(prev => prev.filter(a => a.id !== id));
    sbDelete("agrements", id);
    if (sel === id) setSel(null);
  }

  async function uploadDoc(agId, file) {
    if (!file) return;
    setUploading(agId);
    const path = CLIENT_CONFIG.contrat + "/agrements/" + agId + "_" + Date.now() + "_" + file.name;
    try {
      const res = await fetch(SUPABASE_URL + "/storage/v1/object/documents/" + path, {
        method:"POST",
        headers:{ apikey:SUPABASE_KEY, Authorization:"Bearer "+SUPABASE_KEY, "Content-Type":file.type },
        body: file
      });
      if (res.ok) {
        const url = SUPABASE_URL + "/storage/v1/object/public/documents/" + path;
        const id = String(Date.now());
        const newDoc = { id, contrat:CLIENT_CONFIG.contrat, agrement_id:agId, nom:file.name, url };
        sbUpsert("agrements_docs", newDoc);
        setDocs(prev => ({ ...prev, [agId]: [...(prev[agId]||[]), newDoc] }));
      }
    } catch(e) { console.error(e); }
    setUploading(null);
  }

  function deleteDoc(agId, docId) {
    setDocs(prev => ({ ...prev, [agId]: (prev[agId]||[]).filter(d => d.id !== docId) }));
    sbDelete("agrements_docs", docId);
  }

  const SCOL = { Valide:"#22c55e", "En cours":"#3b82f6", Expire:"#ef4444", "En alerte":"#f59e0b" };

  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9", marginBottom:2 }}>Agrements et certifications</div>
          <div style={{ fontSize:13, color:"#7a90aa" }}>{agrements.length} documents — {agrements.filter(a=>a.statut==="Valide").length} valides</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            const rows = agrements.filter(a=>!hiddenIds.includes(a.id)).map(a=>{
              const col = SCOL[a.statut]||"#7a90aa";
              const agDocs = docs[a.id]||[];
              return "<tr><td style='font-weight:700'>"+a.nom+"</td><td>"+a.type+"</td><td style='font-weight:700;color:"+col+"'>"+a.statut+"</td><td>"+agDocs.length+" document(s)</td></tr>";
            }).join("");
            exportHTML("Agrements et certifications - "+CLIENT_CONFIG.nom,
              "<h1>Agrements et certifications</h1><p style='color:#6b7280;margin-bottom:12px'>"+CLIENT_CONFIG.nom+" - "+new Date().toLocaleDateString("fr-FR")+"</p>"+
              "<table><thead><tr><th>Nom</th><th>Type</th><th>Statut</th><th>Documents</th></tr></thead><tbody>"+rows+"</tbody></table>"
            );
          }} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:9,padding:"10px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Export PDF
          </button>
          <button onClick={startAdd} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:9, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            + Ajouter
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:16 }}>
        {Object.entries(SCOL).map(([s,c])=>(
          <Kpi key={s} label={s} value={agrements.filter(a=>a.statut===s).length} color={c}/>
        ))}
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", marginBottom:14 }}>{editing?"Modifier":"Nouvel agrement"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:10 }}>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Type</label>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={inpStyle}>
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Nom *</label>
              <input value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))} style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Statut</label>
              <select value={form.statut} onChange={e=>setForm(p=>({...p,statut:e.target.value}))} style={inpStyle}>
                {STATUTS.map(s=><option key={s}>{s}</option>)}
              </select></div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={save} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {editing?"Mettre a jour":"Enregistrer"}
            </button>
            <button onClick={()=>{setShowForm(false);setEditing(null);}} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:8, padding:"8px 14px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Contrôles tri/masquage */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <button onClick={()=>setShowHidden(v=>!v)}
          style={{background:showHidden?"#243352":"transparent",color:showHidden?"#f1f5f9":"#7a90aa",border:"1px solid #3d5270",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
          {showHidden?"Masquer les cachés":"Voir tous ("+(hiddenIds.length)+" masqués)"}
        </button>
      </div>

      {/* Liste */}
      {agrements.filter(a=>showHidden||!hiddenIds.includes(a.id)).map((a,i) => {
        const col = SCOL[a.statut]||"#7a90aa";
        const isS = sel === a.id;
        const agDocs = docs[a.id]||[];
        const isHidden = hiddenIds.includes(a.id);
        const realIdx = agrements.findIndex(x=>x.id===a.id);
        return (
          <Card key={a.id}
            style={{ marginBottom:8, borderLeft:"3px solid "+col, opacity:isHidden?0.5:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
              <div onClick={()=>setSel(isS?null:a.id)} style={{ cursor:"pointer", flex:1, display:"flex", alignItems:"center", gap:8 }}>
                <div style={{display:"flex",flexDirection:"column",gap:1}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>{if(realIdx===0)return;const l=[...agrements];const[m]=l.splice(realIdx,1);l.splice(realIdx-1,0,m);setAgrements(l);try{localStorage.setItem("aads_agr_order",JSON.stringify(l.map(x=>x.id)));}catch(e){}}}
                    style={{background:"transparent",border:"none",color:"#7a90aa",cursor:"pointer",fontSize:10,padding:"0 2px",lineHeight:1}}>▲</button>
                  <button onClick={()=>{if(realIdx===agrements.length-1)return;const l=[...agrements];const[m]=l.splice(realIdx,1);l.splice(realIdx+1,0,m);setAgrements(l);try{localStorage.setItem("aads_agr_order",JSON.stringify(l.map(x=>x.id)));}catch(e){}}}
                    style={{background:"transparent",border:"none",color:"#7a90aa",cursor:"pointer",fontSize:10,padding:"0 2px",lineHeight:1}}>▼</button>
                </div>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:9, fontWeight:700, background:col+"22", color:col, border:"1px solid "+col+"44", borderRadius:4, padding:"1px 6px" }}>{a.type}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#f1f5f9" }}>{a.nom}</span>
                    {agDocs.length>0 && <span style={{ fontSize:10, color:"#3b82f6", fontWeight:700 }}>{agDocs.length} doc(s)</span>}
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:col }}>{a.statut}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <label style={{ fontSize:11, color:"#3b82f6", fontWeight:700, cursor:"pointer", background:"#1d4ed822", border:"1px solid #3b82f644", borderRadius:6, padding:"4px 10px" }}>
                  {uploading===a.id?"Envoi...":"+ PDF"}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }}
                    onChange={e=>uploadDoc(a.id, e.target.files[0])}/>
                </label>
                <button onClick={()=>setHiddenIds(prev=>prev.includes(a.id)?prev.filter(x=>x!==a.id):[...prev,a.id])}
                  style={{background:isHidden?"#f59e0b22":"transparent",color:isHidden?"#f59e0b":"#7a90aa",border:"1px solid "+(isHidden?"#f59e0b44":"#3d5270"),borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  {isHidden?"Afficher":"Masquer"}
                </button>
                <button onClick={()=>startEdit(a)} style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Edit</button>
                <button onClick={()=>deleteAgrement(a.id)} style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444433", borderRadius:6, padding:"4px 8px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>X</button>
              </div>
            </div>

            {/* Documents */}
            {isS && (
              <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #3d5270" }}>
                {agDocs.length === 0 ? (
                  <div style={{ fontSize:11, color:"#5a7090" }}>Aucun document — cliquez sur "+ PDF" pour ajouter</div>
                ) : agDocs.map(d=>(
                  <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5, background:"#1a2540", borderRadius:7, padding:"6px 10px" }}>
                    <span style={{ fontSize:11, color:"#cbd5e1", flex:1 }}>{d.nom}</span>
                    <a href={d.url} target="_blank" rel="noreferrer"
                      style={{ fontSize:11, color:"#22c55e", fontWeight:700, textDecoration:"none", border:"1px solid #22c55e44", borderRadius:5, padding:"2px 8px" }}>
                      Voir
                    </a>
                    <button onClick={()=>deleteDoc(a.id, d.id)}
                      style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444433", borderRadius:5, padding:"2px 6px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ContratDevis() {
  const STATUTS = ["En cours", "Signé", "En attente de signature", "Accepté", "Refusé", "Expiré", "Archivé"];
  const SCOLOR_C = {
    "En cours": "#22c55e", "Signé": "#3b82f6", "En attente de signature": "#f59e0b",
    "Accepté": "#22c55e", "Refusé": "#ef4444", "Expiré": "#7a90aa", "Archivé": "#5a7090",
  };

  const [typesDoc, setTypesDoc] = useState(["Contrat", "Avenant", "Devis", "Bon de commande", "Facture", "Ponctuel", "Produits"]);
  const [newTypeDoc, setNewTypeDoc] = useState("");
  const [prestationsList, setPrestationsList] = useState([
    "Dératisation", "Désinsectisation", "Traitement thermique", "Deep Cleaning",
    "Maintenance Cleaning", "Assainissement", "Désinfection", "Prestation multiple",
  ]);
  const [newPrestation, setNewPrestation] = useState("");

  const [docs, setDocs] = useState([]);

  useEffect(() => {
    sbGet("contrats_devis").then(data => {
      if (data && data.length > 0) setDocs(data.map(d => ({...d, montantHT: d.montant_ht, photos:[]})));
    }).catch(()=>{});
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sel, setSel] = useState(null);
  const [filterType, setFilterType] = useState("Tous");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(null);

  async function uploadDoc(docId, file) {
    if (!file) return;
    setUploading(docId);
    const path = CLIENT_CONFIG.contrat + "/contrats/" + docId + "_" + file.name;
    try {
      const res = await fetch(SUPABASE_URL + "/storage/v1/object/documents/" + path, {
        method:"POST",
        headers:{ apikey:SUPABASE_KEY, Authorization:"Bearer "+SUPABASE_KEY, "Content-Type":file.type },
        body: file
      });
      if (res.ok) {
        const url = SUPABASE_URL + "/storage/v1/object/public/documents/" + path;
        setDocs(prev => prev.map(d => d.id===docId ? {...d, url_doc:url} : d));
      }
    } catch(e) { console.error(e); }
    setUploading(null);
  }

  const [draft, setDraft] = useState({
    type: "Devis", ref: "", intitule: "", client: CLIENT_CONFIG.nom,
    prestation: "Dératisation", montantHT: "", tva: 20,
    debut: "", fin: "", statut: "En attente de signature", notes: "", fichier: "",
    reconduction: "determinee",
  });
  const [draftPhotos, setDraftPhotos] = useState([]);

  function resetDraft() {
    setDraft({ type: "Devis", ref: "", intitule: "", client: CLIENT_CONFIG.nom, prestation: "Dératisation", montantHT: "", tva: 20, debut: "", fin: "", statut: "En attente de signature", notes: "", fichier: "", reconduction: "determinee" });
    setDraftPhotos([]); setEditId(null);
  }

  function openEdit(doc) {
    setDraft({ type: doc.type, ref: doc.ref, intitule: doc.intitule, client: doc.client, prestation: doc.prestation, montantHT: doc.montantHT, tva: doc.tva, debut: doc.debut, fin: doc.fin || "", statut: doc.statut, notes: doc.notes || "", fichier: doc.fichier || "", reconduction: doc.reconduction || "determinee" });
    setDraftPhotos(doc.photos || []);
    setEditId(doc.id); setShowForm(true);
  }

  function save() {
    if (!draft.ref || !draft.intitule) return;
    const ttcVal = draft.montantHT ? +(parseFloat(draft.montantHT) * (1 + draft.tva / 100)).toFixed(2) : 0;
    if (editId !== null) {
      setDocs(prev => prev.map(d => d.id === editId ? { ...d, ...draft, ttc:ttcVal, photos: draftPhotos } : d));
      sbUpdate("contrats_devis", editId, { type:draft.type, ref:draft.ref, intitule:draft.intitule, client:draft.client, prestation:draft.prestation, montant_ht:parseFloat(draft.montantHT)||0, tva:draft.tva, debut:draft.debut, fin:draft.reconduction==="tacite"?"":draft.fin||"", statut:draft.statut, notes:draft.notes||"", reconduction:draft.reconduction||"determinee" });
    } else {
      const id = String(Date.now());
      setDocs(prev => [{ ...draft, ttc:ttcVal, id, photos: draftPhotos }, ...prev]);
      sbUpsert("contrats_devis", { id, contrat:CLIENT_CONFIG.contrat, type:draft.type, ref:draft.ref, intitule:draft.intitule, client:draft.client, prestation:draft.prestation, montant_ht:parseFloat(draft.montantHT)||0, tva:draft.tva, debut:draft.debut, fin:draft.reconduction==="tacite"?"":draft.fin||"", statut:draft.statut, notes:draft.notes||"", reconduction:draft.reconduction||"determinee" });
    }
    resetDraft(); setShowForm(false);
  }

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => setDraftPhotos(prev => [...prev, { url: ev.target.result, name: file.name, date: new Date().toLocaleDateString("fr-FR") }]);
      r.readAsDataURL(file);
    });
  }

  function ttc(doc) {
    if (!doc.montantHT) return null;
    return (parseFloat(doc.montantHT) * (1 + (doc.tva || 20) / 100)).toFixed(2);
  }

  const filtered = docs.filter(d => {
    if (filterType !== "Tous" && d.type !== filterType) return false;
    if (filterStatut !== "Tous" && d.statut !== filterStatut) return false;
    return true;
  });

  const totalEnCours = docs.filter(d => d.statut === "En cours" || d.statut === "Signé").reduce((s, d) => s + (parseFloat(d.montantHT) || 0), 0);
  const devisEnAttente = docs.filter(d => d.type === "Devis" && d.statut === "En attente de signature").length;
  const totalTTC = docs.filter(d => d.statut === "En cours" || d.statut === "Signé").reduce((s, d) => s + (parseFloat(ttc(d)) || 0), 0);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 2 }}>Contrats / Devis</div>
          <div style={{ fontSize: 13, color: "#7a90aa" }}>{docs.length} document(s) — contrats, avenants, devis</div>
        </div>
        <button onClick={() => { resetDraft(); setShowForm(v => !v); }}
          style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          + Nouveau document
        </button>
      </div>

      {/* Alertes devis en attente */}
      {devisEnAttente > 0 && (
        <div style={{ background: "#f59e0b11", border: "1px solid #f59e0b33", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <span>📋</span>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>{devisEnAttente} devis en attente de signature</div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 20 }}>
        <Kpi label="Total docs" value={docs.length} color="#3b82f6" />
        <Kpi label="Contrats actifs" value={docs.filter(d => d.type === "Contrat" && d.statut === "En cours").length} color="#22c55e" />
        <Kpi label="Devis en cours" value={docs.filter(d => d.type === "Devis").length} color="#f59e0b" />
        <Kpi label="CA HT actif" value={totalEnCours.toLocaleString("fr-FR") + " €"} color="#a78bfa" />
        <Kpi label="CA TTC actif" value={totalTTC.toLocaleString("fr-FR") + " €"} color="#22c55e" />
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>{editId ? "Modifier le document" : "Nouveau document"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10, marginBottom: 10 }}>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Type *</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                {typesDoc.map(t=>{
                  const selected=(draft.type||"").split(",").map(x=>x.trim()).includes(t);
                  return <button key={t} type="button" onClick={()=>{
                    const cur=(draft.type||"").split(",").map(x=>x.trim()).filter(Boolean);
                    const next=selected?cur.filter(x=>x!==t):[...cur,t];
                    setDraft(p=>({...p,type:next.join(", ")}));
                  }} style={{background:selected?"#3b82f622":"#243352",color:selected?"#3b82f6":"#7a90aa",border:"1px solid "+(selected?"#3b82f6":"#3d5270"),borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:selected?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>;
                })}
              </div>
              <div style={{display:"flex",gap:4}}>
                <input value={newTypeDoc} onChange={e=>setNewTypeDoc(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(newTypeDoc.trim()&&!typesDoc.includes(newTypeDoc.trim())){const v=newTypeDoc.trim();setTypesDoc(prev=>[...prev,v]);setDraft(p=>({...p,type:(p.type?p.type+", ":"")+v}));setNewTypeDoc("");}}}}
                  placeholder="+ Nouveau type..." style={{...inp(),fontSize:10,padding:"3px 8px",flex:1}}/>
                <button onClick={()=>{if(newTypeDoc.trim()&&!typesDoc.includes(newTypeDoc.trim())){const v=newTypeDoc.trim();setTypesDoc(prev=>[...prev,v]);setDraft(p=>({...p,type:(p.type?p.type+", ":"")+v}));setNewTypeDoc("");}}}
                  style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
              {draft.type&&<div style={{fontSize:10,color:"#3b82f6",marginTop:3}}>{draft.type}</div>}
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Référence *</label>
              <input value={draft.ref} onChange={e => setDraft(p => ({ ...p, ref: e.target.value }))} placeholder="ex : DEV-2026-015" style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Intitulé *</label>
              <input value={draft.intitule} onChange={e => setDraft(p => ({ ...p, intitule: e.target.value }))} placeholder="ex : Contrat dératisation annuel" style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Client</label>
              <input value={draft.client} onChange={e => setDraft(p => ({ ...p, client: e.target.value }))} style={inp()} />
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Prestation(s)</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                {prestationsList.map(pr=>{
                  const selected=(draft.prestation||"").split(",").map(x=>x.trim()).includes(pr);
                  return <button key={pr} type="button" onClick={()=>{
                    const cur=(draft.prestation||"").split(",").map(x=>x.trim()).filter(Boolean);
                    const next=selected?cur.filter(x=>x!==pr):[...cur,pr];
                    setDraft(p=>({...p,prestation:next.join(", ")}));
                  }} style={{background:selected?"#22c55e22":"#243352",color:selected?"#22c55e":"#7a90aa",border:"1px solid "+(selected?"#22c55e":"#3d5270"),borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:selected?700:400,cursor:"pointer",fontFamily:"inherit"}}>{pr}</button>;
                })}
              </div>
              <div style={{display:"flex",gap:4}}>
                <input value={newPrestation} onChange={e=>setNewPrestation(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(newPrestation.trim()&&!prestationsList.includes(newPrestation.trim())){const v=newPrestation.trim();setPrestationsList(prev=>[...prev,v]);setDraft(p=>({...p,prestation:(p.prestation?p.prestation+", ":"")+v}));setNewPrestation("");}}}}
                  placeholder="+ Nouvelle prestation..." style={{...inp(),fontSize:10,padding:"3px 8px",flex:1}}/>
                <button onClick={()=>{if(newPrestation.trim()&&!prestationsList.includes(newPrestation.trim())){const v=newPrestation.trim();setPrestationsList(prev=>[...prev,v]);setDraft(p=>({...p,prestation:(p.prestation?p.prestation+", ":"")+v}));setNewPrestation("");}}}
                  style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
              {draft.prestation&&<div style={{fontSize:10,color:"#22c55e",marginTop:3}}>{draft.prestation}</div>}
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Montant HT (€)</label>
              <input type="number" min="0" step="0.01" value={draft.montantHT} onChange={e => setDraft(p => ({ ...p, montantHT: e.target.value }))} style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>TVA (%)</label>
              <select value={draft.tva} onChange={e => setDraft(p => ({ ...p, tva: parseFloat(e.target.value) }))} style={inp()}>
                {[0, 5.5, 10, 20].map(t => <option key={t} value={t}>{t}%</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Montant TTC</label>
              <div style={{ background: "#1a2540", border: "1px solid #3d5270", borderRadius: 7, padding: "7px 10px", color: "#22c55e", fontSize: 13, fontWeight: 700 }}>
                {draft.montantHT ? (parseFloat(draft.montantHT) * (1 + draft.tva / 100)).toFixed(2) + " €" : "—"}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Date début</label>
              <input type="date" value={draft.debut} onChange={e => setDraft(p => ({ ...p, debut: e.target.value }))} style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Reconduction</label>
              <div style={{display:"flex",gap:6}}>
                {["determinee","tacite"].map(v=>{
                  const active=draft.reconduction===v;
                  const col=v==="tacite"?"#f59e0b":"#3b82f6";
                  const label=v==="tacite"?"Tacite (sans date de fin)":"Determinee (avec date de fin)";
                  return <button key={v} type="button" onClick={()=>setDraft(p=>({...p,reconduction:v,fin:v==="tacite"?"":p.fin}))}
                    style={{background:active?col+"22":"#243352",color:active?col:"#7a90aa",border:"1px solid "+(active?col:"#3d5270"),borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",flex:1}}>
                    {v==="tacite"?"Tacite":"Determinee"}
                  </button>;
                })}
              </div>
              {draft.reconduction==="tacite" && <div style={{fontSize:10,color:"#f59e0b",marginTop:4}}>Reconduction tacite — pas de date de fin</div>}
            </div>
            {draft.reconduction!=="tacite" && (
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Date fin</label>
              <input type="date" value={draft.fin} onChange={e => setDraft(p => ({ ...p, fin: e.target.value }))} style={inp()} />
            </div>
            )}
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Statut</label>
              <select value={draft.statut} onChange={e => setDraft(p => ({ ...p, statut: e.target.value }))} style={inp()}>
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Nom fichier</label>
              <input value={draft.fichier} onChange={e => setDraft(p => ({ ...p, fichier: e.target.value }))} placeholder="ex : DEVIS_2026_015.pdf" style={inp()} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Notes / conditions</label>
            <textarea rows={2} value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))}
              placeholder="Conditions particulières, détail des prestations incluses…"
              style={{ ...inp(), resize: "vertical" }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Documents joints ({draftPhotos.length})</label>
            {draftPhotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 6, marginBottom: 8 }}>
                {draftPhotos.map((ph, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 6, overflow: "hidden", aspectRatio: "1", background: "#1a2540" }}>
                    <img src={ph.url} alt={ph.name} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} onClick={() => setLightbox(ph)} />
                    <button onClick={() => setDraftPhotos(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: 2, right: 2, background: "#ef4444cc", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1a2540", border: "1px dashed #3d5270", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#7a90aa", fontWeight: 600 }}>
              + Joindre document / scan
              <input type="file" accept="image/*,application/pdf" capture="environment" multiple style={{ display: "none" }} onChange={handlePhoto} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {editId ? "Enregistrer" : "Créer"}
            </button>
            <button onClick={() => { resetDraft(); setShowForm(false); }} style={{ background: "transparent", color: "#7a90aa", border: "1px solid #3d5270", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          </div>
        </Card>
      )}

      {/* Filtres */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, background: "#1a2540", borderRadius: 10, padding: 3 }}>
          {["Tous", ...typesDoc].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{ background: filterType === t ? "#1d4ed8" : "transparent", color: filterType === t ? "#fff" : "#7a90aa", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {t}
            </button>
          ))}
        </div>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          style={{ background: "#243352", border: "1px solid #3d5270", borderRadius: 8, padding: "7px 12px", color: "#f1f5f9", fontSize: 12, fontFamily: "inherit" }}>
          <option value="Tous">Tous statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "#5a7090" }}>{filtered.length} document(s)</span>
      </div>

      {/* Tableau */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ background: "#1a2540", padding: "9px 16px", display: "grid", gridTemplateColumns: "70px 100px 1fr 110px 90px 90px 100px 80px 70px", gap: 8, fontSize: 10, fontWeight: 700, color: "#7a90aa", textTransform: "uppercase" }}>
          <div>Type</div><div>Réf.</div><div>Intitulé</div><div>Prestation</div><div>HT</div><div>TTC</div><div>Période</div><div>Statut</div><div>Actions</div>
        </div>
        <div style={{ maxHeight: 500, overflowY: "auto" }}>
          {filtered.map((doc, i) => {
            const sc2 = SCOLOR_C[doc.statut] || "#7a90aa";
            const ttcVal = ttc(doc);
            return (
              <div key={doc.id}
                style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "70px 100px 1fr 110px 90px 90px 100px 100px 70px", gap: 8, alignItems: "center", borderTop: "1px solid #243352", background: i % 2 === 0 ? "transparent" : "#ffffff04", cursor: "pointer" }}
                onClick={() => setSel(sel === doc.id ? null : doc.id)}>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, background: "#243352", color: "#94a3b8", border: "1px solid #3d5270", borderRadius: 4, padding: "2px 6px" }}>{doc.type}</span>
                </div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#3b82f6", fontWeight: 700 }}>{doc.ref}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}>{doc.intitule}</div>
                  {doc.notes && <div style={{ fontSize: 10, color: "#7a90aa" }}>{doc.notes.slice(0, 40)}{doc.notes.length > 40 ? "…" : ""}</div>}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{doc.prestation}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}>{doc.montantHT ? parseFloat(doc.montantHT).toLocaleString("fr-FR") + " €" : "—"}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{ttcVal ? parseFloat(ttcVal).toLocaleString("fr-FR") + " €" : "—"}</div>
                <div style={{ fontSize: 10, color: "#7a90aa" }}>{doc.debut}{doc.reconduction==="tacite" ? " → Tacite" : doc.fin ? " → " + doc.fin : ""}</div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, background: sc2 + "22", color: sc2, border: "1px solid " + sc2 + "44", borderRadius: 10, padding: "2px 8px", whiteSpace: "nowrap" }}>{doc.statut}</span>
                </div>
                <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(doc)} style={{ background: "#1d4ed822", color: "#3b82f6", border: "1px solid #3b82f644", borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✏</button>
                  <button onClick={() => { setDocs(prev => prev.filter(x => x.id !== doc.id)); setSel(null); sbDelete("contrats_devis", doc.id); }}
                    style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#5a7090" }}>Aucun document</div>}
        </div>
      </Card>

      {/* Détail */}
      {sel && (() => {
        const doc = docs.find(d => d.id === sel);
        if (!doc) return null;
        const ttcVal = ttc(doc);
        return (
          <Card selected style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, background: "#243352", color: "#94a3b8", border: "1px solid #3d5270", borderRadius: 4, padding: "2px 8px", marginRight: 8 }}>{doc.type}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>{doc.intitule}</span>
              </div>
              <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: "#7a90aa", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 12 }}>
              {[
                ["Référence", doc.ref],
                ["Client", doc.client],
                ["Prestation", doc.prestation],
                ["Montant HT", doc.montantHT ? parseFloat(doc.montantHT).toLocaleString("fr-FR") + " €" : "—"],
                ["TVA", doc.tva + " %"],
                ["Montant TTC", ttcVal ? parseFloat(ttcVal).toLocaleString("fr-FR") + " €" : "—"],
                ["Début", doc.debut || "—"],
                ["Fin", doc.reconduction==="tacite" ? "Tacite (reconduction)" : doc.fin || "—"],
                ["Statut", doc.statut],
                ["Fichier", doc.url_doc
                  ? <a href={doc.url_doc} target="_blank" rel="noreferrer" style={{ color:"#22c55e", fontWeight:700, textDecoration:"none" }}>Voir PDF</a>
                  : <label style={{ color:"#3b82f6", fontWeight:700, cursor:"pointer" }}>
                      {uploading===doc.id?"Envoi...":"+ Importer PDF"}
                      <input type="file" accept=".pdf,.doc,.docx" style={{ display:"none" }}
                        onChange={e=>uploadDoc(doc.id, e.target.files[0])}/>
                    </label>
                ],
              ].map(kv => (
                <div key={kv[0]} style={{ background: "#1a2540", borderRadius: 7, padding: "7px 10px" }}>
                  <div style={{ fontSize: 9, color: "#7a90aa", textTransform: "uppercase", marginBottom: 2 }}>{kv[0]}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: kv[0] === "Montant TTC" ? "#22c55e" : "#f1f5f9" }}>{kv[1]}</div>
                </div>
              ))}
            </div>
            {doc.notes && (
              <div style={{ background: "#1a3360", border: "1px solid #1d4ed844", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#93c5fd", lineHeight: 1.6 }}>
                {doc.notes}
              </div>
            )}
            {doc.photos && doc.photos.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "#7a90aa", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>Documents joints ({doc.photos.length})</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 6 }}>
                  {doc.photos.map((ph, i) => (
                    <img key={i} src={ph.url} alt={ph.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, cursor: "pointer" }} onClick={() => setLightbox(ph)} />
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "zoom-out" }}>
          <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 10 }} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// RÉGLEMENTATIONS 3D — nettoyées
// ============================================================
function Reglementations() {
  const FAMILLES_INIT = ["Biocides", "Certiphyto", "IFS", "Desinsectisation", "General"];
  const STATUTS  = ["En vigueur", "Applicable", "Abroge"];
  const FCOL_BASE = { Biocides:"#3b82f6", Certiphyto:"#8b5cf6", IFS:"#22c55e", Desinsectisation:"#f59e0b", General:"#7a90aa" };
  const EXTRA_COLORS = ["#ef4444","#06b6d4","#f97316","#ec4899","#14b8a6","#a855f7","#84cc16","#fb923c"];
  const inpStyle = inp();

  const REGLEMENTS_INIT = [
    { id:"1", ref:"Reglement UE 528/2012", titre:"Mise sur le marche des produits biocides", famille:"Biocides", statut:"En vigueur", impact:"Verification AMM SECUVIA et KRYPTO — renouvellement obligatoire avant expiration." },
    { id:"2", ref:"Arrete du 7 fevrier 2012", titre:"Agrements et certifications — protection des vegetaux", famille:"Certiphyto", statut:"En vigueur", impact:"Certiphyto obligatoire — validite 5 ans — recyclage obligatoire." },
    { id:"3", ref:"IFS Food v8 — Section 4.14", titre:"Lutte antiparasitaire en sites de production alimentaire", famille:"IFS", statut:"En vigueur", impact:"Plan documente, cartographie, inspections regulieres, enregistrement des resultats." },
    { id:"4", ref:"Reglement UE 2021/1099", titre:"Approbation conditionnelle anticoagulants 2e generation", famille:"Biocides", statut:"En vigueur", impact:"Usage SECUVIA restreint aux BOBBYBOX exterieurs fermes — aucun appat libre." },
    { id:"5", ref:"Circulaire DGS 2004-185", titre:"Lutte contre insectes vecteurs en milieu alimentaire", famille:"Desinsectisation", statut:"En vigueur", impact:"Plan de gestion et historique des traitements obligatoires." },
    { id:"6", ref:"NF X50-790 AFNOR", titre:"Entreprises de services 3D — bonnes pratiques", famille:"General", statut:"Applicable", impact:"AADS respecte les principes de cette norme dans toutes ses prestations." },
    { id:"7", ref:"Paquet hygiene CE 852/2004", titre:"Hygiene des denrees alimentaires", famille:"IFS", statut:"En vigueur", impact:"Applicable aux sites de production alimentaire — tracabilite obligatoire." },
    { id:"8", ref:"Arrete du 9 octobre 2013 — Art. 6", titre:"Alternance des molecules rodenticides", famille:"Biocides", statut:"En vigueur", impact:"Obligation de rotation des matieres actives anticoagulantes. L alternance doit etre documentee." },
    { id:"9", ref:"Arrete du 9 octobre 2013 — Art. 8", titre:"Appatage non permanent — sauf justification ecrite", famille:"Biocides", statut:"En vigueur", impact:"L appatage permanent est interdit sauf justification ecrite motivee. Postes interieurs en placebo par defaut." },
  ];

  const [reglements, setReglements] = useState(REGLEMENTS_INIT);
  const [filter, setFilter]         = useState("Tous");
  const [sel, setSel]               = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState({ ref:"", titre:"", famille:"Biocides", statut:"En vigueur", impact:"" });
  const [famillesList, setFamillesList] = useState(FAMILLES_INIT);
  const [newFamille, setNewFamille]     = useState("");

  useEffect(() => {
    sbGet("reglementations").then(data => {
      if (data && data.length > 0) setReglements(data);
      else REGLEMENTS_INIT.forEach(r => sbUpsert("reglementations", { ...r, contrat:CLIENT_CONFIG.contrat }));
    }).catch(()=>{});
  }, []);

  function startAdd() { setForm({ ref:"", titre:"", famille:"Biocides", statut:"En vigueur", impact:"" }); setEditing(null); setShowForm(true); }
  function startEdit(r) { setForm({...r}); setEditing(r.id); setShowForm(true); setSel(null); }

  function save() {
    if (!form.titre) return;
    if (editing) {
      setReglements(prev => prev.map(r => r.id===editing ? {...form, id:editing} : r));
      sbUpdate("reglementations", editing, { ref:form.ref, titre:form.titre, famille:form.famille, statut:form.statut, impact:form.impact });
    } else {
      const id = String(Date.now());
      setReglements(prev => [...prev, {...form, id}]);
      sbUpsert("reglementations", { id, contrat:CLIENT_CONFIG.contrat, ...form });
    }
    setShowForm(false); setEditing(null);
  }

  function deleteRegl(id) {
    setReglements(prev => prev.filter(r => r.id !== id));
    sbDelete("reglementations", id);
    if (sel === id) setSel(null);
  }

  function getFCol(f) {
    if (FCOL_BASE[f]) return FCOL_BASE[f];
    const extras = famillesList.filter(x => !FCOL_BASE[x]);
    const idx = extras.indexOf(f);
    return EXTRA_COLORS[idx % EXTRA_COLORS.length] || "#7a90aa";
  }

  const familles = ["Tous", ...famillesList];
  const filtered = filter === "Tous" ? reglements : reglements.filter(r => {
    const rf = (r.famille||"").split(",").map(x=>x.trim());
    return rf.includes(filter);
  });

  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4, flexWrap:"wrap", gap:10 }}>
        <div style={{ fontSize:22, fontWeight:800, color:"#f1f5f9" }}>Réglementations 3D</div>
        <button onClick={() => {
          const rows = filtered.map(r => {
            const fc = getFCol(r.famille);
            return `<tr>
              <td style="font-weight:700;color:${fc};width:15%">${r.famille}</td>
              <td style="font-family:monospace;font-size:11px;width:20%">${r.ref}</td>
              <td style="font-weight:700;width:30%">${r.titre}</td>
              <td style="width:10%;text-align:center;font-weight:700;color:${r.statut==="En vigueur"?"#16a34a":"#d97706"}">${r.statut}</td>
              <td style="font-size:12px">${r.impact||""}</td>
            </tr>`;
          }).join("");
          exportHTML("Réglementations 3D - "+CLIENT_CONFIG.nom,
            `<h1>Réglementations 3D</h1>
            <p style="color:#6b7280;margin-bottom:16px">${CLIENT_CONFIG.nom} — ${new Date().toLocaleDateString("fr-FR")}</p>
            <table style="width:100%;border-collapse:collapse">
              <thead><tr style="background:#f3f4f6">
                <th style="padding:8px;text-align:left;border:1px solid #e5e7eb">Famille</th>
                <th style="padding:8px;text-align:left;border:1px solid #e5e7eb">Référence</th>
                <th style="padding:8px;text-align:left;border:1px solid #e5e7eb">Titre</th>
                <th style="padding:8px;text-align:center;border:1px solid #e5e7eb">Statut</th>
                <th style="padding:8px;text-align:left;border:1px solid #e5e7eb">Impact / Application</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>`
          );
        }}
          style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:8, padding:"9px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          Export PDF
        </button>
        <button onClick={startAdd} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:9, padding:"9px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          + Ajouter
        </button>
      </div>
      <div style={{ fontSize:13, color:"#7a90aa", marginBottom:16 }}>Textes applicables — Deratisation, Desinsectisation, Desinfection, IFS Food</div>

      {/* Formulaire */}
      {showForm && (
        <Card style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", marginBottom:14 }}>{editing?"Modifier":"Nouvelle reglementation"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:10, marginBottom:10 }}>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Reference</label>
              <input value={form.ref} onChange={e=>setForm(p=>({...p,ref:e.target.value}))} style={inpStyle}/></div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Titre *</label>
              <input value={form.titre} onChange={e=>setForm(p=>({...p,titre:e.target.value}))} style={inpStyle}/></div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:6 }}>Famille(s)</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                {famillesList.map(f=>{
                  const selected=(form.famille||"").split(",").map(x=>x.trim()).includes(f);
                  const col=getFCol(f);
                  return <button key={f} type="button" onClick={()=>{
                    const cur=(form.famille||"").split(",").map(x=>x.trim()).filter(Boolean);
                    const next=selected?cur.filter(x=>x!==f):[...cur,f];
                    setForm(p=>({...p,famille:next.join(", ")}));
                  }} style={{background:selected?col+"22":"#243352",color:selected?col:"#7a90aa",border:"1px solid "+(selected?col:"#3d5270"),borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:selected?700:400,cursor:"pointer",fontFamily:"inherit"}}>{f}</button>;
                })}
              </div>
              <div style={{display:"flex",gap:4}}>
                <input value={newFamille} onChange={e=>setNewFamille(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(newFamille.trim()&&!famillesList.includes(newFamille.trim())){const v=newFamille.trim();setFamillesList(prev=>[...prev,v]);setForm(p=>({...p,famille:(p.famille?p.famille+", ":"")+v}));setNewFamille("");}}}}
                  placeholder="+ Nouvelle famille..."
                  style={{...inpStyle,fontSize:10,padding:"3px 8px",flex:1}}/>
                <button onClick={()=>{if(newFamille.trim()&&!famillesList.includes(newFamille.trim())){const v=newFamille.trim();setFamillesList(prev=>[...prev,v]);setForm(p=>({...p,famille:(p.famille?p.famille+", ":"")+v}));setNewFamille("");}}}
                  style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
              {form.famille&&<div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>{form.famille}</div>}
            </div>
            <div><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Statut</label>
              <select value={form.statut} onChange={e=>setForm(p=>({...p,statut:e.target.value}))} style={inpStyle}>
                {STATUTS.map(s=><option key={s}>{s}</option>)}
              </select></div>
          </div>
          <div style={{ marginBottom:10 }}><label style={{ fontSize:10, color:"#7a90aa", fontWeight:600, textTransform:"uppercase", display:"block", marginBottom:3 }}>Impact / Description</label>
            <textarea rows={3} value={form.impact} onChange={e=>setForm(p=>({...p,impact:e.target.value}))} style={{ ...inpStyle, resize:"vertical" }}/></div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={save} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {editing?"Mettre a jour":"Enregistrer"}
            </button>
            <button onClick={()=>{setShowForm(false);setEditing(null);}} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:8, padding:"8px 14px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Filtres */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {familles.map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{ background:filter===f?"#1d4ed8":"#243352", color:filter===f?"#fff":"#7a90aa", border:"1px solid "+(filter===f?"#1d4ed8":"#3d5270"), borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.map(r => {
        const isOpen = sel === r.id;
        const famArray = (r.famille||"").split(",").map(x=>x.trim()).filter(Boolean);
        return (
          <Card key={r.id} style={{ marginBottom:8, cursor:"pointer" }} onClick={()=>setSel(isOpen?null:r.id)}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"center" }}>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {famArray.map(f=>{const fc=getFCol(f);return <span key={f} style={{ fontSize:10, fontWeight:700, background:fc+"22", color:fc, border:"1px solid "+fc+"44", borderRadius:4, padding:"2px 8px" }}>{f}</span>;})}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:"#7a90aa", fontFamily:"monospace", marginBottom:1 }}>{r.ref}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9" }}>{r.titre}</div>
              </div>
              <Badge label={r.statut} color={r.statut==="En vigueur"?"#22c55e":"#f59e0b"}/>
              <div style={{ display:"flex", gap:4 }} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>startEdit(r)} style={{ background:"#1d4ed822", color:"#3b82f6", border:"1px solid #3b82f644", borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Edit</button>
                <button onClick={()=>deleteRegl(r.id)} style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444433", borderRadius:5, padding:"2px 6px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>X</button>
              </div>
            </div>
            {isOpen && (
              <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #3d5270", background:"#1a3360", border:"1px solid #1d4ed844", borderRadius:10, padding:"10px 14px" }}>
                <div style={{ fontSize:10, color:"#3b82f6", fontWeight:700, textTransform:"uppercase", marginBottom:4 }}>Impact pour AADS / le client</div>
                <div style={{ fontSize:13, color:"#93c5fd", lineHeight:1.6 }}>{r.impact}</div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function TraitementThermique() {
  const TECHNICIENS = useTechniciens();
  const ZONES_DEFAUT = ["Production", "Stockage", "Emballages", "Locaux techniques", "Combles", "Conditionnement", "Bureaux", "Maintenance"];
  const NUISIBLES_TT = ["Punaises de lit", "Blattes", "Charançons", "IPS — Insectes des stocks", "Teignes", "Acariens", "Autre"];
  const STATUTS_TT = ["Planifié", "En cours", "Terminé", "Annulé"];

  const [interventions, setInterventions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sel, setSel] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [draft, setDraft] = useState({ date: "", technicien: "", zone: "", nuisible: "", tempCible: 56, duree: 4, tempAtteinte: "", statut: "Planifié", observations: "" });
  const [draftPhotos, setDraftPhotos] = useState([]);

  useEffect(() => {
    sbGet("traitement_thermique").then(data => {
      if (data && data.length > 0) {
        setInterventions(data.map(d => ({
          ...d,
          tempCible: d.temp_cible,
          tempAtteinte: d.temp_atteinte,
          photos: []
        })));
      }
    }).catch(()=>{});
  }, []);

  function resetDraft() { setDraft({ date: "", technicien: "", zone: "", nuisible: "", tempCible: 56, duree: 4, tempAtteinte: "", statut: "Planifié", observations: "", superficie: "" }); setDraftPhotos([]); setEditId(null); }

  function openEdit(item) {
    setDraft({ date: item.date, technicien: item.technicien, zone: item.zone, nuisible: item.nuisible, tempCible: item.tempCible, duree: item.duree, tempAtteinte: item.tempAtteinte || "", statut: item.statut, observations: item.observations || "" });
    setDraftPhotos(item.photos || []);
    setEditId(item.id);
    setShowForm(true);
  }

  function save() {
    if (!draft.date || !draft.zone) return;
    const dateFmt = draft.date.includes("-") ? draft.date.split("-").reverse().join("/") : draft.date;
    if (editId !== null) {
      setInterventions(prev => prev.map(i => i.id === editId ? { ...i, ...draft, date:dateFmt, photos: draftPhotos } : i));
      sbUpdate("traitement_thermique", editId, { date:dateFmt, technicien:draft.technicien, zone:draft.zone, nuisible:draft.nuisible, temp_cible:draft.tempCible, duree:draft.duree, temp_atteinte:draft.tempAtteinte||"", statut:draft.statut, observations:draft.observations||"" });
    } else {
      const id = String(Date.now());
      setInterventions(prev => [{ ...draft, date:dateFmt, id, photos: draftPhotos }, ...prev]);
      sbUpsert("traitement_thermique", { id, contrat:CLIENT_CONFIG.contrat, date:dateFmt, technicien:draft.technicien, zone:draft.zone, nuisible:draft.nuisible, temp_cible:draft.tempCible, duree:draft.duree, temp_atteinte:draft.tempAtteinte||"", statut:draft.statut, observations:draft.observations||"" });
    }
    resetDraft(); setShowForm(false);
  }

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => setDraftPhotos(prev => [...prev, { url: ev.target.result, name: file.name, date: new Date().toLocaleDateString("fr-FR") }]);
      r.readAsDataURL(file);
    });
  }

  const SCOLOR = { Terminé: "#22c55e", "En cours": "#f59e0b", Planifié: "#3b82f6", Annulé: "#ef4444" };

  const effic = item => {
    if (!item.tempAtteinte || item.statut !== "Terminé") return null;
    return parseFloat(item.tempAtteinte) >= item.tempCible;
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 2 }}>Traitement thermique</div>
          <div style={{ fontSize: 13, color: "#7a90aa" }}>{interventions.length} intervention(s) — Chaleur</div>
        </div>
        <button onClick={() => { resetDraft(); setShowForm(v => !v); }}
          style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          + Nouvelle intervention
        </button>
      </div>

      {/* Info réglementaire */}
      <div style={{ background: "#7c2d1222", border: "1px solid #ef444433", borderRadius: 12, padding: "12px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 20 }}>🌡️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fca5a5", marginBottom: 4 }}>Principe du traitement thermique</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            La chaleur est portée à <strong style={{ color: "#fbbf24" }}>55–60 °C</strong> minimum pendant <strong style={{ color: "#fbbf24" }}>4 à 20 heures</strong> selon le nuisible ciblé et la superficie à traiter. Efficace contre tous les stades biologiques (œufs, larves, adultes). Aucun résidu chimique.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        <Kpi noborder label="Total" value={interventions.length} color="#ef4444" />
        <Kpi noborder label="Terminées" value={interventions.filter(i => i.statut === "Terminé").length} color="#22c55e" />
        <Kpi noborder label="Planifiées" value={interventions.filter(i => i.statut === "Planifié").length} color="#3b82f6" />
        <Kpi noborder label="Succès thermique" value={interventions.filter(i => effic(i) === true).length + "/" + interventions.filter(i => i.statut === "Terminé").length} color="#f59e0b" />
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 14 }}>{editId ? "Modifier l'intervention" : "Nouvelle intervention thermique"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Date *</label>
              <input type="date" value={draft.date} onChange={e => setDraft(p => ({ ...p, date: e.target.value }))} style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Techniciens</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {TECHNICIENS.map(t => {
                  const selected = (draft.technicien||"").split(",").map(x=>x.trim()).includes(t);
                  return (
                    <button key={t} type="button" onClick={() => {
                      const current = (draft.technicien||"").split(",").map(x=>x.trim()).filter(Boolean);
                      const next = selected ? current.filter(x=>x!==t) : [...current, t];
                      setDraft(p=>({...p, technicien: next.join(", ")}));
                    }}
                      style={{ background:selected?"#1d4ed822":"#1a2540", color:selected?"#3b82f6":"#7a90aa", border:"1px solid "+(selected?"#3b82f6":"#3d5270"), borderRadius:6, padding:"3px 8px", fontSize:10, fontWeight:selected?700:400, cursor:"pointer", fontFamily:"inherit" }}>
                      {t.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Zone * (texte libre)</label>
              <input value={draft.zone} onChange={e => setDraft(p => ({ ...p, zone: e.target.value }))} placeholder="ex: Stockage T4, Zone emballages..." style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Superficie (m²)</label>
              <input type="number" min="0" value={draft.superficie||""} onChange={e => setDraft(p => ({ ...p, superficie: e.target.value }))} placeholder="ex: 120" style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Nuisibles ciblés</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {NUISIBLES_TT.map(n => {
                  const selected = (draft.nuisible||"").split(",").map(x=>x.trim()).includes(n);
                  return (
                    <button key={n} type="button" onClick={() => {
                      const current = (draft.nuisible||"").split(",").map(x=>x.trim()).filter(Boolean);
                      const next = selected ? current.filter(x=>x!==n) : [...current, n];
                      setDraft(p=>({...p, nuisible: next.join(", ")}));
                    }}
                      style={{ background:selected?"#ef444422":"#1a2540", color:selected?"#ef4444":"#7a90aa", border:"1px solid "+(selected?"#ef4444":"#3d5270"), borderRadius:6, padding:"3px 8px", fontSize:10, fontWeight:selected?700:400, cursor:"pointer", fontFamily:"inherit" }}>
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Temp. cible (°C)</label>
              <input type="number" value={draft.tempCible} onChange={e => setDraft(p => ({ ...p, tempCible: parseFloat(e.target.value) || 0 }))} style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Durée (h)</label>
              <input type="number" min="1" max="20" value={draft.duree} onChange={e => setDraft(p => ({ ...p, duree: parseFloat(e.target.value) || 0 }))} style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Temp. atteinte (°C)</label>
              <input type="number" step="0.1" placeholder="ex : 57.2" value={draft.tempAtteinte} onChange={e => setDraft(p => ({ ...p, tempAtteinte: e.target.value }))} style={inp()} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Statut</label>
              <select value={draft.statut} onChange={e => setDraft(p => ({ ...p, statut: e.target.value }))} style={inp()}>
                {STATUTS_TT.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {draft.statut === "Planifié" && (
              <div>
                <label style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Date d'intervention planifiée</label>
                <input type="date" value={draft.datePlanif||""} onChange={e => setDraft(p => ({ ...p, datePlanif: e.target.value }))} style={{...inp(), borderColor:"#3b82f6"}} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 3 }}>Observations</label>
            <textarea rows={2} value={draft.observations} onChange={e => setDraft(p => ({ ...p, observations: e.target.value }))} style={{ ...inp(), resize: "vertical" }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: "#7a90aa", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Photos ({draftPhotos.length})</label>
            {draftPhotos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 6, marginBottom: 8 }}>
                {draftPhotos.map((ph, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 6, overflow: "hidden", aspectRatio: "1", background: "#1a2540" }}>
                    <img src={ph.url} alt={ph.name} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} onClick={() => setLightbox(ph)} />
                    <button onClick={() => setDraftPhotos(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: 2, right: 2, background: "#ef4444cc", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, cursor: "pointer", padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#1a2540", border: "1px dashed #3d5270", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, color: "#7a90aa", fontWeight: 600 }}>
              + Ajouter photos
              <input type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={handlePhoto} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {editId ? "Enregistrer" : "Créer"}
            </button>
            <button onClick={() => { resetDraft(); setShowForm(false); }} style={{ background: "transparent", color: "#7a90aa", border: "1px solid #3d5270", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
          </div>
        </Card>
      )}

      {/* Tableau */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ background: "#1a2540", padding: "9px 16px", display: "grid", gridTemplateColumns: "90px 1fr 120px 80px 80px 70px 80px 80px", gap: 8, fontSize: 10, fontWeight: 700, color: "#7a90aa", textTransform: "uppercase" }}>
          <div>Date</div><div>Zone</div><div>Nuisible</div><div>T° cible</div><div>T° att.</div><div>Durée</div><div>Résultat</div><div>Actions</div>
        </div>
        <div style={{ maxHeight: 480, overflowY: "auto" }}>
          {interventions.map((item, i) => {
            const ok = effic(item);
            return (
              <div key={item.id}
                style={{ padding: "10px 16px", display: "grid", gridTemplateColumns: "90px 1fr 120px 80px 80px 70px 80px 80px", gap: 8, alignItems: "center", borderTop: "1px solid #243352", background: i % 2 === 0 ? "transparent" : "#ffffff04", cursor: "pointer" }}
                onClick={() => setSel(sel === item.id ? null : item.id)}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", fontFamily: "monospace" }}>{item.date}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}>{item.zone}</div>
                  {item.technicien && <div style={{ fontSize: 10, color: "#7a90aa" }}>{item.technicien}</div>}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.nuisible || "—"}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{item.tempCible}°C</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: ok === true ? "#22c55e" : ok === false ? "#ef4444" : "#7a90aa" }}>{item.tempAtteinte ? item.tempAtteinte + "°C" : "—"}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{item.duree}h</div>
                <div>
                  {item.statut === "Terminé"
                    ? ok === true
                      ? <Badge label="✓ Succès" color="#22c55e" />
                      : ok === false
                        ? <Badge label="✗ Échec" color="#ef4444" />
                        : <Badge label={item.statut} color={SCOLOR[item.statut]} />
                    : <Badge label={item.statut} color={SCOLOR[item.statut] || "#7a90aa"} />
                  }
                </div>
                <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                  {(item.statut&&(item.statut.toLowerCase().startsWith("termin"))) && <button onClick={e=>{e.stopPropagation();exportRapport("Traitement thermique",item);}} style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>PDF</button>}
                  <button onClick={() => openEdit(item)} style={{ background: "#1d4ed822", color: "#3b82f6", border: "1px solid #3b82f644", borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✏</button>
                  <button onClick={() => { setInterventions(prev => prev.filter(x => x.id !== item.id)); setSel(null); sbDelete("traitement_thermique", item.id); }}
                    style={{ background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                </div>
              </div>
            );
          })}
          {interventions.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#5a7090" }}>Aucune intervention enregistrée</div>}
        </div>
      </Card>

      {/* Détail étendu */}
      {sel && (() => {
        const item = interventions.find(i => i.id === sel);
        if (!item) return null;
        return (
          <Card selected style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Détail — {item.zone} — {item.date}</div>
              <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: "#7a90aa", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            {item.observations && <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10, fontStyle: "italic" }}>{item.observations}</div>}
            {item.photos && item.photos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 6 }}>
                {item.photos.map((ph, i) => (
                  <img key={i} src={ph.url} alt={ph.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, cursor: "pointer" }} onClick={() => setLightbox(ph)} />
                ))}
              </div>
            )}
          </Card>
        );
      })()}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "zoom-out" }}>
          <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 10 }} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// DEEP CLEANING
// ============================================================
function DeepCleaning() {
  const TECHNICIENS = useTechniciens();
  const TYPES_NETTOYAGE = ["Dégraissage haute pression", "Désinfection chimique", "Nettoyage vapeur", "Décapage sol", "Nettoyage mécanique", "Nettoyage manuel approfondi", "Traitement anti-mousse", "Soufflage des hauteurs", "Soufflage du RDC", "Autre"];
  const STATUTS_DC = ["Planifié", "En cours", "Terminé", "Annulé"];

  const [interventions, setInterventions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState({ date:"", technicien:"", zone:"", superficie:"", types_nettoyage:"", produits:"", statut:"Planifié", date_planif:"", observations:"" });
  const [draftPhotos, setDraftPhotos] = useState([]);

  useEffect(() => {
    sbGet("deep_cleaning").then(data => {
      if (data && data.length > 0) setInterventions(data.map(d => ({...d, photos:[]})));
    }).catch(()=>{});
  }, []);

  function resetDraft() { setDraft({ date:"", technicien:"", zone:"", superficie:"", types_nettoyage:"", produits:"", statut:"Planifié", date_planif:"", observations:"" }); setDraftPhotos([]); setEditId(null); }

  function openEdit(item) {
    setDraft({ date:item.date||"", technicien:item.technicien||"", zone:item.zone||"", superficie:item.superficie||"", types_nettoyage:item.types_nettoyage||"", produits:item.produits||"", statut:item.statut||"Planifié", date_planif:item.date_planif||"", observations:item.observations||"" });
    setDraftPhotos(item.photos||[]);
    setEditId(item.id); setShowForm(true);
  }

  function fmt(d) { return d && d.includes("-") ? d.split("-").reverse().join("/") : d; }

  function save() {
    if (!draft.zone) return;
    const dateFmt = fmt(draft.date);
    const datePlanifFmt = fmt(draft.date_planif);
    if (editId !== null) {
      setInterventions(prev => prev.map(i => i.id===editId ? {...i,...draft,date:dateFmt,date_planif:datePlanifFmt,photos:draftPhotos} : i));
      sbUpdate("deep_cleaning", editId, {...draft, date:dateFmt, date_planif:datePlanifFmt});
    } else {
      const id = String(Date.now());
      setInterventions(prev => [{...draft, date:dateFmt, date_planif:datePlanifFmt, id, photos:draftPhotos}, ...prev]);
      sbUpsert("deep_cleaning", {id, contrat:CLIENT_CONFIG.contrat, ...draft, date:dateFmt, date_planif:datePlanifFmt});
    }
    resetDraft(); setShowForm(false);
  }

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => setDraftPhotos(prev => [...prev, { url:ev.target.result, name:file.name, date:new Date().toLocaleDateString("fr-FR") }]);
      r.readAsDataURL(file);
    });
  }

  function toggleTech(t) {
    const current = (draft.technicien||"").split(",").map(x=>x.trim()).filter(Boolean);
    const next = current.includes(t) ? current.filter(x=>x!==t) : [...current, t];
    setDraft(p=>({...p, technicien:next.join(", ")}));
  }

  function toggleType(t) {
    const current = (draft.types_nettoyage||"").split(",").map(x=>x.trim()).filter(Boolean);
    const next = current.includes(t) ? current.filter(x=>x!==t) : [...current, t];
    setDraft(p=>({...p, types_nettoyage:next.join(", ")}));
  }

  const SCOLOR = { Terminé:"#22c55e", "En cours":"#f59e0b", Planifié:"#3b82f6", Annulé:"#ef4444" };

  return (
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9",marginBottom:2}}>Deep Cleaning</div>
          <div style={{fontSize:13,color:"#7a90aa"}}>{interventions.length} intervention(s) — Nettoyage approfondi et désinfection</div>
        </div>
        <button onClick={()=>{resetDraft();setShowForm(v=>!v);}}
          style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          + Nouvelle intervention
        </button>
      </div>

      <div style={{background:"#2d4a7a22",border:"1px solid #3b82f633",borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{fontSize:20}}>🧹</span>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#3b82f6",marginBottom:4}}>Deep Cleaning — Nettoyage en profondeur</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Opération de nettoyage intensif ciblant les zones difficiles d'accès, les biofilms, dépôts organiques et résidus accumulés. Complémentaire aux nettoyages opérationnels quotidiens. Conforme IFS Food v8 section 4.9.</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
        <Kpi plain label="Total" value={interventions.length} color="#3b82f6"/>
        <Kpi plain label="Terminees" value={interventions.filter(i=>i.statut==="Terminé").length} color="#22c55e"/>
        <Kpi plain label="Planifiees" value={interventions.filter(i=>i.statut==="Planifié").length} color="#3b82f6"/>
        <Kpi plain label="En cours" value={interventions.filter(i=>i.statut==="En cours").length} color="#f59e0b"/>
      </div>

      {showForm && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>{editId?"Modifier":"Nouvelle intervention Deep Cleaning"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date</label>
              <input type="date" value={draft.date} onChange={e=>setDraft(p=>({...p,date:e.target.value}))} style={inp()}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Techniciens</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {TECHNICIENS.map(t=>{
                  const sel2 = (draft.technicien||"").split(",").map(x=>x.trim()).includes(t);
                  return <button key={t} type="button" onClick={()=>toggleTech(t)}
                    style={{background:sel2?"#1d4ed822":"#1a2540",color:sel2?"#3b82f6":"#7a90aa",border:"1px solid "+(sel2?"#3b82f6":"#3d5270"),borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:sel2?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                    {t.split(" ")[0]}
                  </button>;
                })}
              </div>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Zone * (texte libre)</label>
              <input value={draft.zone} onChange={e=>setDraft(p=>({...p,zone:e.target.value}))} placeholder="ex: Production ligne 5..." style={inp()}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Superficie (m²)</label>
              <input type="number" value={draft.superficie||""} onChange={e=>setDraft(p=>({...p,superficie:e.target.value}))} placeholder="ex: 200" style={inp()}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Statut</label>
              <select value={draft.statut} onChange={e=>setDraft(p=>({...p,statut:e.target.value}))} style={inp()}>
                {STATUTS_DC.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            {draft.statut==="Planifié" && (
              <div>
                <label style={{fontSize:10,color:"#3b82f6",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date d'intervention planifiée</label>
                <input type="date" value={draft.date_planif||""} onChange={e=>setDraft(p=>({...p,date_planif:e.target.value}))} style={{...inp(),borderColor:"#3b82f6"}}/>
              </div>
            )}
          </div>
          {/* Types de nettoyage */}
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Types de nettoyage</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {TYPES_NETTOYAGE.map(t=>{
                const sel2 = (draft.types_nettoyage||"").split(",").map(x=>x.trim()).includes(t);
                return <button key={t} type="button" onClick={()=>toggleType(t)}
                  style={{background:sel2?"#1d4ed822":"#1a2540",color:sel2?"#3b82f6":"#7a90aa",border:"1px solid "+(sel2?"#3b82f6":"#3d5270"),borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:sel2?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                  {t}
                </button>;
              })}
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Materiels utilisés</label>
            <input value={draft.materiels||""} onChange={e=>setDraft(p=>({...p,materiels:e.target.value}))} placeholder="ex: Karcher 200 bars, autolaveuse, souffleur..." style={inp()}/>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Produits utilisés</label>
            <input value={draft.produits||""} onChange={e=>setDraft(p=>({...p,produits:e.target.value}))} placeholder="ex: Acide phosphorique 15%, Javel 2,6%..." style={inp()}/>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Observations</label>
            <textarea rows={2} value={draft.observations} onChange={e=>setDraft(p=>({...p,observations:e.target.value}))} style={{...inp(),resize:"vertical"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Photos ({draftPhotos.length})</label>
            <label style={{background:"#243352",border:"1px dashed #3d5270",borderRadius:8,padding:"8px 14px",fontSize:11,color:"#7a90aa",cursor:"pointer"}}>
              + Ajouter photos
              <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={handlePhoto}/>
            </label>
            {draftPhotos.length>0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                {draftPhotos.map((ph,i)=>(
                  <div key={i} style={{position:"relative"}}>
                    <img src={ph.url} alt={ph.name} style={{width:70,height:70,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270"}}/>
                    <button onClick={()=>setDraftPhotos(prev=>prev.filter((_,j)=>j!==i))}
                      style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:16,height:16,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {editId?"Mettre a jour":"Enregistrer"}
            </button>
            <button onClick={()=>{resetDraft();setShowForm(false);}} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Liste */}
      {interventions.map((item,i) => {
        const isS = sel===item.id;
        const col = SCOLOR[item.statut]||"#7a90aa";
        return (
          <Card key={item.id} style={{marginBottom:10,borderLeft:"3px solid "+col,cursor:"pointer"}} onClick={()=>setSel(isS?null:item.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div style={{flex:1}}>
                {item.travail && <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",marginBottom:6,lineHeight:1.5}}>{item.travail}</div>}
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                  <Badge label={item.statut} color={col}/>
                  <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{item.zone}</span>
                  {item.superficie && <span style={{fontSize:11,color:"#7a90aa"}}>{item.superficie} m²</span>}
                </div>
                <div style={{fontSize:11,color:"#7a90aa"}}>
                  {item.date||item.date_planif} — {item.technicien}
                </div>
                {item.types_nettoyage && <div style={{fontSize:11,color:"#3b82f6",marginTop:3}}>{item.types_nettoyage}</div>}
              </div>
              <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                {(item.statut&&(item.statut.toLowerCase().startsWith("termin"))) && <button onClick={e=>{e.stopPropagation();exportRapport("Deep Cleaning",item);}} style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>PDF</button>}
                <button onClick={()=>openEdit(item)} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                <button onClick={()=>{setInterventions(prev=>prev.filter(x=>x.id!==item.id));setSel(null);sbDelete("deep_cleaning",item.id);}}
                  style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:5,padding:"3px 6px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X</button>
              </div>
            </div>
            {isS && (
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #3d5270"}}>
                {item.produits && <div style={{fontSize:12,color:"#94a3b8",marginBottom:4}}><strong style={{color:"#7a90aa"}}>Produits :</strong> {item.produits}</div>}
                {item.observations && <div style={{fontSize:12,color:"#94a3b8",marginBottom:8}}><strong style={{color:"#7a90aa"}}>Observations :</strong> {item.observations}</div>}
                {item.photos && item.photos.length>0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {item.photos.map((ph,j)=>(
                      <img key={j} src={ph.url} alt={ph.name} style={{width:80,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270"}}/>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {interventions.length===0 && (
        <Card><div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:13}}>Aucune intervention. Cliquez sur "+ Nouvelle intervention".</div></Card>
      )}
    </div>
  );
}


function MaintenanceCleaning() {
  const TECHNICIENS = useTechniciens();
  const STATUTS = ["Planifié", "En cours", "Terminé", "Annulé"];

  const [interventions, setInterventions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState({ date:"", technicien:"", zone:"", materiels:"", produits:"", travail:"", statut:"Planifié", date_planif:"", observations:"" });
  const [draftPhotos, setDraftPhotos] = useState([]);

  useEffect(() => {
    sbGet("maintenance_cleaning").then(data => {
      if (data && data.length > 0) setInterventions(data.map(d => ({...d, photos:[]})));
    }).catch(()=>{});
  }, []);

  function resetDraft() { setDraft({ date:"", technicien:"", zone:"", materiels:"", produits:"", travail:"", statut:"Planifié", date_planif:"", observations:"" }); setDraftPhotos([]); setEditId(null); }

  function openEdit(item) {
    setDraft({ date:item.date||"", technicien:item.technicien||"", zone:item.zone||"", materiels:item.materiels||"", produits:item.produits||"", travail:item.travail||"", statut:item.statut||"Planifié", date_planif:item.date_planif||"", observations:item.observations||"" });
    setDraftPhotos(item.photos||[]);
    setEditId(item.id); setShowForm(true);
  }

  function fmt(d) { return d && d.includes("-") ? d.split("-").reverse().join("/") : d; }

  function save() {
    if (!draft.zone) return;
    const dateFmt = fmt(draft.date);
    const datePlanifFmt = fmt(draft.date_planif);
    if (editId !== null) {
      setInterventions(prev => prev.map(i => i.id===editId ? {...i,...draft,date:dateFmt,date_planif:datePlanifFmt,photos:draftPhotos} : i));
      sbUpdate("maintenance_cleaning", editId, {...draft, date:dateFmt, date_planif:datePlanifFmt})
        .then(res=>{ if(!res) console.error("MC update failed"); }).catch(e=>{ alert("Erreur sauvegarde: "+(e.message||e)); });
    } else {
      const id = String(Date.now());
      setInterventions(prev => [{...draft, date:dateFmt, date_planif:datePlanifFmt, id, photos:draftPhotos}, ...prev]);
      sbUpsert("maintenance_cleaning", {id, contrat:CLIENT_CONFIG.contrat, ...draft, date:dateFmt, date_planif:datePlanifFmt})
        .then(res=>{ if(!res) console.error("MC upsert failed"); }).catch(e=>{ alert("Erreur sauvegarde: "+(e.message||e)); });
    }
    resetDraft(); setShowForm(false);
  }

  function toggleTech(t) {
    const current = (draft.technicien||"").split(",").map(x=>x.trim()).filter(Boolean);
    const next = current.includes(t) ? current.filter(x=>x!==t) : [...current, t];
    setDraft(p=>({...p, technicien:next.join(", ")}));
  }

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => setDraftPhotos(prev => [...prev, { url:ev.target.result, name:file.name }]);
      r.readAsDataURL(file);
    });
  }

  const SCOLOR = { Terminé:"#22c55e", "En cours":"#f59e0b", Planifié:"#3b82f6", Annulé:"#ef4444" };

  return (
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9",marginBottom:2}}>Maintenance Cleaning</div>
          <div style={{fontSize:13,color:"#7a90aa"}}>{interventions.length} intervention(s) — Nettoyage de maintenance régulier</div>
        </div>
        <button onClick={()=>{resetDraft();setShowForm(v=>!v);}}
          style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          + Nouvelle intervention
        </button>
      </div>

      <div style={{background:"#14532d22",border:"1px solid #22c55e33",borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{fontSize:20}}>🔧</span>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#22c55e",marginBottom:4}}>Maintenance et Étanchéité — Lutte préventive contre les accès rongeurs</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Bouchage de trous, travaux d'étanchéité (joints, portes, passages de câbles), pose de grillages anti-rongeurs et maintenance de 1er niveau. Ces interventions réduisent les points d'entrée et complètent le dispositif de dératisation. Traçabilité IFS Food v8 section 4.14.</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
        <Kpi plain label="Total" value={interventions.length} color="#3b82f6"/>
        <Kpi plain label="Terminees" value={interventions.filter(i=>i.statut==="Terminé").length} color="#22c55e"/>
        <Kpi plain label="Planifiees" value={interventions.filter(i=>i.statut==="Planifié").length} color="#3b82f6"/>
        <Kpi plain label="En cours" value={interventions.filter(i=>i.statut==="En cours").length} color="#f59e0b"/>
      </div>

      {showForm && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>{editId?"Modifier":"Nouvelle intervention Maintenance Cleaning"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date</label>
              <input type="date" value={draft.date} onChange={e=>setDraft(p=>({...p,date:e.target.value}))} style={inp()}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Techniciens</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {TECHNICIENS.map(t=>{
                  const active = (draft.technicien||"").split(",").map(x=>x.trim()).includes(t);
                  return <button key={t} type="button" onClick={()=>toggleTech(t)}
                    style={{background:active?"#1d4ed822":"#1a2540",color:active?"#3b82f6":"#7a90aa",border:"1px solid "+(active?"#3b82f6":"#3d5270"),borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                    {t.split(" ")[0]}
                  </button>;
                })}
              </div>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Zone * (texte libre)</label>
              <input value={draft.zone} onChange={e=>setDraft(p=>({...p,zone:e.target.value}))} placeholder="ex: Couloir vestiaires, RDC..." style={inp()}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Statut</label>
              <select value={draft.statut} onChange={e=>setDraft(p=>({...p,statut:e.target.value}))} style={inp()}>
                {STATUTS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            {draft.statut==="Planifié" && (
              <div>
                <label style={{fontSize:10,color:"#3b82f6",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date planifiée</label>
                <input type="date" value={draft.date_planif||""} onChange={e=>setDraft(p=>({...p,date_planif:e.target.value}))} style={{...inp(),borderColor:"#3b82f6"}}/>
              </div>
            )}
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Description du travail réalisé *</label>
            <textarea rows={3} value={draft.travail} onChange={e=>setDraft(p=>({...p,travail:e.target.value}))} placeholder="Décrivez les travaux effectués..." style={{...inp(),resize:"vertical"}}/>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Matériels utilisés</label>
            <input value={draft.materiels||""} onChange={e=>setDraft(p=>({...p,materiels:e.target.value}))} placeholder="ex: autolaveuse, aspirateur..." style={inp()}/>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Produits utilisés</label>
            <input value={draft.produits||""} onChange={e=>setDraft(p=>({...p,produits:e.target.value}))} placeholder="ex: détergent neutre..." style={inp()}/>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Observations</label>
            <textarea rows={2} value={draft.observations} onChange={e=>setDraft(p=>({...p,observations:e.target.value}))} style={{...inp(),resize:"vertical"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Photos ({draftPhotos.length})</label>
            <label style={{background:"#243352",border:"1px dashed #3d5270",borderRadius:8,padding:"8px 14px",fontSize:11,color:"#7a90aa",cursor:"pointer"}}>
              + Ajouter photos
              <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={handlePhoto}/>
            </label>
            {draftPhotos.length>0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                {draftPhotos.map((ph,i)=>(
                  <div key={i} style={{position:"relative"}}>
                    <img src={ph.url} alt={ph.name} style={{width:70,height:70,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270"}}/>
                    <button onClick={()=>setDraftPhotos(prev=>prev.filter((_,j)=>j!==i))}
                      style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:16,height:16,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {editId?"Mettre a jour":"Enregistrer"}
            </button>
            <button onClick={()=>{resetDraft();setShowForm(false);}} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {interventions.length===0 && !showForm && (
        <Card><div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:13}}>Aucune intervention. Cliquez sur "+ Nouvelle intervention".</div></Card>
      )}

      {interventions.map((item) => {
        const isS = sel===item.id;
        const col = SCOLOR[item.statut]||"#7a90aa";
        return (
          <Card key={item.id} style={{marginBottom:10,borderLeft:"3px solid "+col,cursor:"pointer"}} onClick={()=>setSel(isS?null:item.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div style={{flex:1}}>
                {item.travail && <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",marginBottom:6,lineHeight:1.5}}>{item.travail}</div>}
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                  <Badge label={item.statut} color={col}/>
                  <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{item.zone}</span>
                  {item.superficie && <span style={{fontSize:11,color:"#7a90aa"}}>{item.superficie} m²</span>}
                </div>
                <div style={{fontSize:11,color:"#7a90aa"}}>{item.date||item.date_planif} — {item.technicien}</div>
              </div>
              <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                {(item.statut&&(item.statut.toLowerCase().startsWith("termin"))) && <button onClick={e=>{e.stopPropagation();exportRapport("Maintenance Cleaning",item);}} style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>PDF</button>}
                <button onClick={()=>openEdit(item)} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                <button onClick={()=>{setInterventions(prev=>prev.filter(x=>x.id!==item.id));setSel(null);sbDelete("maintenance_cleaning",item.id);}}
                  style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:5,padding:"3px 6px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X</button>
              </div>
            </div>
            {isS && (
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #3d5270"}}>
                {item.materiels && <div style={{fontSize:12,color:"#94a3b8",marginBottom:4}}><strong style={{color:"#7a90aa"}}>Materiels :</strong> {item.materiels}</div>}
                {item.produits && <div style={{fontSize:12,color:"#94a3b8",marginBottom:4}}><strong style={{color:"#7a90aa"}}>Produits :</strong> {item.produits}</div>}
                {item.observations && <div style={{fontSize:12,color:"#94a3b8"}}><strong style={{color:"#7a90aa"}}>Observations :</strong> {item.observations}</div>}
                {item.photos && item.photos.length>0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                    {item.photos.map((ph,j)=>(
                      <img key={j} src={ph.url} alt={ph.name} style={{width:80,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270"}}/>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Assainissement() {
  const TECHNICIENS = useTechniciens();
  const [typesAssain, setTypesAssain] = useState([
    "Curage haute pression", "Curage manuel", "Debouchage canalisation",
    "Nettoyage separateur a graisses", "Nettoyage bac a graisses",
    "Vidange fosse toutes eaux", "Inspection camera", "Detartrage",
    "Desinfection reseau", "Traitement enzymatique anti-graisse",
    "Nettoyage grilles / siphons de sol", "Pose / remplacement siphon",
    "Reparation canalisation", "Controle pompe de relevage", "Autre",
  ]);
  const [newTypeAssain, setNewTypeAssain] = useState("");
  const URGENCES = ["Normale", "Urgente", "Critique"];
  const URGENCE_COLOR = { Normale:"#22c55e", Urgente:"#f59e0b", Critique:"#ef4444" };
  const SCOLOR = { Termine:"#22c55e", "En cours":"#f59e0b", Planifie:"#3b82f6", Annule:"#7a90aa" };

  const [interventions, setInterventions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState({ date:"", technicien:"", zone:"", type_prestation:"", produits:"", urgence:"Normale", statut:"Planifie", date_planif:"", conforme:true, odeurs:false, volume:"", observations:"" });
  const [draftPhotos, setDraftPhotos] = useState([]);

  useEffect(() => {
    sbGet("assainissement").then(data => {
      if (data && data.length > 0) setInterventions(data.map(d => ({...d, photos:[]})));
    }).catch(()=>{});
  }, []);

  function resetDraft() { setDraft({ date:"", technicien:"", zone:"", type_prestation:"", produits:"", urgence:"Normale", statut:"Planifie", date_planif:"", conforme:true, odeurs:false, volume:"", observations:"" }); setDraftPhotos([]); setEditId(null); }

  function openEdit(item) {
    setDraft({ date:item.date||"", technicien:item.technicien||"", zone:item.zone||"", type_prestation:item.type_prestation||"", produits:item.produits||"", urgence:item.urgence||"Normale", statut:item.statut||"Planifie", date_planif:item.date_planif||"", conforme:item.conforme!==false, odeurs:!!item.odeurs, volume:item.volume||"", observations:item.observations||"" });
    setDraftPhotos(item.photos||[]); setEditId(item.id); setShowForm(true);
  }

  function fmt(d) { return d && d.includes("-") ? d.split("-").reverse().join("/") : d; }

  function save() {
    if (!draft.zone) return;
    const dateFmt = fmt(draft.date);
    const datePlanifFmt = fmt(draft.date_planif);
    if (editId !== null) {
      setInterventions(prev => prev.map(i => i.id===editId ? {...i,...draft,date:dateFmt,date_planif:datePlanifFmt,photos:draftPhotos} : i));
      sbUpdate("assainissement", editId, {...draft, date:dateFmt, date_planif:datePlanifFmt});
    } else {
      const id = String(Date.now());
      setInterventions(prev => [{...draft, date:dateFmt, date_planif:datePlanifFmt, id, photos:draftPhotos}, ...prev]);
      sbUpsert("assainissement", {id, contrat:CLIENT_CONFIG.contrat, ...draft, date:dateFmt, date_planif:datePlanifFmt});
    }
    resetDraft(); setShowForm(false);
  }

  function toggleTech(t) {
    const current = (draft.technicien||"").split(",").map(x=>x.trim()).filter(Boolean);
    const next = current.includes(t) ? current.filter(x=>x!==t) : [...current, t];
    setDraft(p=>({...p, technicien:next.join(", ")}));
  }

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => setDraftPhotos(prev => [...prev, { url:ev.target.result, name:file.name }]);
      r.readAsDataURL(file);
    });
  }

  return (
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9",marginBottom:2}}>Assainissement</div>
          <div style={{fontSize:13,color:"#7a90aa"}}>{interventions.length} intervention(s) — Réseaux EU, séparateurs à graisses, siphons</div>
        </div>
        <button onClick={()=>{resetDraft();setShowForm(v=>!v);}}
          style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          + Nouvelle intervention
        </button>
      </div>

      <div style={{background:"#0c4a6e22",border:"1px solid #0ea5e933",borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{fontSize:20}}>💧</span>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#0ea5e9",marginBottom:4}}>Assainissement — Réseaux EU, graisses, curage</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Interventions sur les réseaux d'eaux usées, séparateurs à graisses, siphons de sol et canalisations. Un réseau EU défaillant peut être vecteur de nuisibles (cafards, mouches, rongeurs). Traçabilité conforme IFS Food v8 sections 4.9 et 4.14.</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:20}}>
        <Kpi plain label="Total" value={interventions.length} color="#3b82f6"/>
        <Kpi plain label="Terminees" value={interventions.filter(i=>i.statut==="Termine").length} color="#22c55e"/>
        <Kpi plain label="Planifiees" value={interventions.filter(i=>i.statut==="Planifie").length} color="#3b82f6"/>
        <Kpi plain label="Urgentes" value={interventions.filter(i=>i.urgence==="Urgente"||i.urgence==="Critique").length} color="#ef4444"/>
      </div>

      {showForm && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>{editId?"Modifier":"Nouvelle intervention Assainissement"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date</label>
              <input type="date" value={draft.date} onChange={e=>setDraft(p=>({...p,date:e.target.value}))} style={inp()}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Techniciens</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {TECHNICIENS.map(t=>{
                  const active=(draft.technicien||"").split(",").map(x=>x.trim()).includes(t);
                  return <button key={t} type="button" onClick={()=>toggleTech(t)}
                    style={{background:active?"#1d4ed822":"#1a2540",color:active?"#3b82f6":"#7a90aa",border:"1px solid "+(active?"#3b82f6":"#3d5270"),borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                    {t.split(" ")[0]}
                  </button>;
                })}
              </div>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Zone / Equipement *</label>
              <input value={draft.zone} onChange={e=>setDraft(p=>({...p,zone:e.target.value}))} placeholder="ex: Separateur a graisses..." style={inp()}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Type(s) de prestation</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                {typesAssain.map(t=>{
                  const selected=(draft.type_prestation||"").split(",").map(x=>x.trim()).includes(t);
                  return <button key={t} type="button" onClick={()=>{
                    const cur=(draft.type_prestation||"").split(",").map(x=>x.trim()).filter(Boolean);
                    const next=selected?cur.filter(x=>x!==t):[...cur,t];
                    setDraft(p=>({...p,type_prestation:next.join(", ")}));
                  }} style={{background:selected?"#0ea5e922":"#243352",color:selected?"#0ea5e9":"#7a90aa",border:"1px solid "+(selected?"#0ea5e9":"#3d5270"),borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:selected?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>;
                })}
              </div>
              <div style={{display:"flex",gap:4}}>
                <input value={newTypeAssain} onChange={e=>setNewTypeAssain(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(newTypeAssain.trim()&&!typesAssain.includes(newTypeAssain.trim())){const v=newTypeAssain.trim();setTypesAssain(prev=>[...prev.filter(t=>t!=="Autre"),v,"Autre"]);setDraft(p=>({...p,type_prestation:((p.type_prestation?p.type_prestation+", ":"")+v)}));setNewTypeAssain("");}}}}
                  placeholder="+ Nouveau type..."
                  style={{...inp(),fontSize:10,padding:"3px 8px",flex:1}}/>
                <button onClick={()=>{if(newTypeAssain.trim()&&!typesAssain.includes(newTypeAssain.trim())){const v=newTypeAssain.trim();setTypesAssain(prev=>[...prev.filter(t=>t!=="Autre"),v,"Autre"]);setDraft(p=>({...p,type_prestation:((p.type_prestation?p.type_prestation+", ":"")+v)}));setNewTypeAssain("");}}}
                  style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
              {draft.type_prestation&&<div style={{fontSize:10,color:"#0ea5e9",marginTop:4}}>{draft.type_prestation}</div>}
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Urgence</label>
              <select value={draft.urgence} onChange={e=>setDraft(p=>({...p,urgence:e.target.value}))} style={inp()}>
                {URGENCES.map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Statut</label>
              <select value={draft.statut} onChange={e=>setDraft(p=>({...p,statut:e.target.value}))} style={inp()}>
                {["Planifie","En cours","Termine","Annule"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            {draft.statut==="Planifie" && (
              <div>
                <label style={{fontSize:10,color:"#3b82f6",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date planifiee</label>
                <input type="date" value={draft.date_planif||""} onChange={e=>setDraft(p=>({...p,date_planif:e.target.value}))} style={{...inp(),borderColor:"#3b82f6"}}/>
              </div>
            )}
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Volume extrait (L)</label>
              <input type="number" value={draft.volume||""} onChange={e=>setDraft(p=>({...p,volume:e.target.value}))} placeholder="ex: 80" style={inp()}/>
            </div>
          </div>
          <div style={{display:"flex",gap:16,marginBottom:10}}>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
              <input type="checkbox" checked={!!draft.conforme} onChange={e=>setDraft(p=>({...p,conforme:e.target.checked}))} style={{accentColor:"#22c55e"}}/>
              <span style={{fontSize:12,color:"#f1f5f9"}}>Conforme</span>
            </label>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
              <input type="checkbox" checked={!!draft.odeurs} onChange={e=>setDraft(p=>({...p,odeurs:e.target.checked}))} style={{accentColor:"#f59e0b"}}/>
              <span style={{fontSize:12,color:"#f1f5f9"}}>Odeurs detectees</span>
            </label>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Produits utilises</label>
            <input value={draft.produits||""} onChange={e=>setDraft(p=>({...p,produits:e.target.value}))} placeholder="ex: BIOCLEAN GRAISSE, DESOL..." style={inp()}/>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Observations</label>
            <textarea rows={3} value={draft.observations} onChange={e=>setDraft(p=>({...p,observations:e.target.value}))} style={{...inp(),resize:"vertical"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Photos ({draftPhotos.length})</label>
            <label style={{background:"#243352",border:"1px dashed #3d5270",borderRadius:8,padding:"8px 14px",fontSize:11,color:"#7a90aa",cursor:"pointer"}}>
              + Ajouter photos
              <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={handlePhoto}/>
            </label>
            {draftPhotos.length>0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                {draftPhotos.map((ph,i)=>(
                  <div key={i} style={{position:"relative"}}>
                    <img src={ph.url} alt={ph.name} style={{width:70,height:70,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270"}}/>
                    <button onClick={()=>setDraftPhotos(prev=>prev.filter((_,j)=>j!==i))}
                      style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:16,height:16,fontSize:9,cursor:"pointer"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {editId?"Mettre a jour":"Enregistrer"}
            </button>
            <button onClick={()=>{resetDraft();setShowForm(false);}} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {interventions.length===0 && !showForm && (
        <Card><div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:13}}>Aucune intervention. Cliquez sur "+ Nouvelle intervention".</div></Card>
      )}

      {interventions.map(item => {
        const isS = sel===item.id;
        const col = SCOLOR[item.statut]||"#7a90aa";
        const ucol = URGENCE_COLOR[item.urgence]||"#7a90aa";
        return (
          <Card key={item.id} style={{marginBottom:10,borderLeft:"3px solid "+col,cursor:"pointer"}} onClick={()=>setSel(isS?null:item.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div style={{flex:1}}>
                {item.observations && <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",marginBottom:6,lineHeight:1.5}}>{item.observations}</div>}
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                  <Badge label={item.statut} color={col}/>
                  {item.urgence!=="Normale"&&<Badge label={item.urgence} color={ucol}/>}
                  <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{item.zone}</span>
                </div>
                <div style={{fontSize:11,color:"#7a90aa"}}>{item.date||item.date_planif} — {item.technicien}</div>
                {item.type_prestation&&<div style={{fontSize:11,color:"#3b82f6",marginTop:2}}>{item.type_prestation}</div>}
                <div style={{display:"flex",gap:10,marginTop:4}}>
                  {item.conforme&&<span style={{fontSize:10,color:"#22c55e",fontWeight:700}}>Conforme</span>}
                  {item.odeurs&&<span style={{fontSize:10,color:"#f59e0b",fontWeight:700}}>Odeurs</span>}
                  {item.volume&&<span style={{fontSize:10,color:"#7a90aa"}}>{item.volume} L</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                {(item.statut&&(item.statut.toLowerCase().startsWith("termin"))) && <button onClick={e=>{e.stopPropagation();exportRapport("Assainissement",item);}} style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>PDF</button>}
                <button onClick={()=>openEdit(item)} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                <button onClick={()=>{setInterventions(prev=>prev.filter(x=>x.id!==item.id));setSel(null);sbDelete("assainissement",item.id);}}
                  style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:5,padding:"3px 6px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X</button>
              </div>
            </div>
            {isS && (
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #3d5270"}}>
                {item.produits&&<div style={{fontSize:12,color:"#94a3b8",marginBottom:4}}><strong style={{color:"#7a90aa"}}>Produits :</strong> {item.produits}</div>}
                {item.photos&&item.photos.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {item.photos.map((ph,j)=>(
                      <img key={j} src={ph.url} alt={ph.name} style={{width:80,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270"}}/>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
function Desinsectisation() {
  const TECHNICIENS = useTechniciens();
  const [typesDesin, setTypesDesin] = useState([
    "Thermo nebulisation", "Pulverisation", "Fumigation",
    "Nid de guepes", "Nid de frelons asiatiques", "Nid d'abeilles",
    "Traitement des chenilles", "Fourmis", "Autre",
  ]);
  const [newTypeDesin, setNewTypeDesin] = useState("");
  const URGENCES = ["Normale", "Urgente", "Critique"];
  const URGENCE_COLOR = { Normale:"#22c55e", Urgente:"#f59e0b", Critique:"#ef4444" };
  const SCOLOR = { Termine:"#22c55e", "En cours":"#f59e0b", Planifie:"#3b82f6", Annule:"#7a90aa" };

  const [interventions, setInterventions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState({ date:"", technicien:"", zone:"", type_intervention:"", produits:"", urgence:"Normale", statut:"Planifie", date_planif:"", observations:"" });
  const [draftPhotos, setDraftPhotos] = useState([]);

  useEffect(() => {
    sbGet("desinsectisation").then(data => {
      if (data && data.length > 0) setInterventions(data.map(d => ({...d, photos:[]})));
    }).catch(()=>{});
  }, []);

  function resetDraft() { setDraft({ date:"", technicien:"", zone:"", type_intervention:"", produits:"", urgence:"Normale", statut:"Planifie", date_planif:"", observations:"" }); setDraftPhotos([]); setEditId(null); }

  function openEdit(item) {
    setDraft({ date:item.date||"", technicien:item.technicien||"", zone:item.zone||"", type_intervention:item.type_intervention||"", produits:item.produits||"", urgence:item.urgence||"Normale", statut:item.statut||"Planifie", date_planif:item.date_planif||"", observations:item.observations||"" });
    setDraftPhotos(item.photos||[]); setEditId(item.id); setShowForm(true);
  }

  function fmt(d) { return d && d.includes("-") ? d.split("-").reverse().join("/") : d; }

  function save() {
    if (!draft.zone && !draft.type_intervention) return;
    const dateFmt = fmt(draft.date);
    const datePlanifFmt = fmt(draft.date_planif);
    if (editId !== null) {
      setInterventions(prev => prev.map(i => i.id===editId ? {...i,...draft,date:dateFmt,date_planif:datePlanifFmt,photos:draftPhotos} : i));
      sbUpdate("desinsectisation", editId, {...draft, date:dateFmt, date_planif:datePlanifFmt});
    } else {
      const id = String(Date.now());
      setInterventions(prev => [{...draft, date:dateFmt, date_planif:datePlanifFmt, id, photos:draftPhotos}, ...prev]);
      sbUpsert("desinsectisation", {id, contrat:CLIENT_CONFIG.contrat, ...draft, date:dateFmt, date_planif:datePlanifFmt});
    }
    resetDraft(); setShowForm(false);
  }

  function toggleTech(t) {
    const current = (draft.technicien||"").split(",").map(x=>x.trim()).filter(Boolean);
    const next = current.includes(t) ? current.filter(x=>x!==t) : [...current, t];
    setDraft(p=>({...p, technicien:next.join(", ")}));
  }

  function handlePhoto(e) {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onload = ev => setDraftPhotos(prev => [...prev, { url:ev.target.result, name:file.name }]);
      r.readAsDataURL(file);
    });
  }

  return (
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9",marginBottom:2}}>Desinsectisation</div>
          <div style={{fontSize:13,color:"#7a90aa"}}>{interventions.length} intervention(s)</div>
        </div>
        <button onClick={()=>{resetDraft();setShowForm(v=>!v);}}
          style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          + Nouvelle intervention
        </button>
      </div>

      <div style={{background:"#4c1d9522",border:"1px solid #8b5cf633",borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{fontSize:20}}>🐝</span>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#8b5cf6",marginBottom:4}}>Désinsectisation — Traitement des insectes nuisibles</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Interventions ciblées contre les insectes nuisibles par thermo nébulisation, pulvérisation ou fumigation. Inclut le traitement des nids (guêpes, frelons, abeilles), chenilles et fourmis. Traçabilité conforme IFS Food v8 section 4.14.</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:20}}>
        <Kpi plain label="Total" value={interventions.length} color="#3b82f6"/>
        <Kpi plain label="Terminees" value={interventions.filter(i=>i.statut==="Termine").length} color="#22c55e"/>
        <Kpi plain label="Planifiees" value={interventions.filter(i=>i.statut==="Planifie").length} color="#3b82f6"/>
        <Kpi plain label="Urgentes" value={interventions.filter(i=>i.urgence==="Urgente"||i.urgence==="Critique").length} color="#ef4444"/>
      </div>

      {showForm && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>{editId?"Modifier":"Nouvelle intervention Desinsectisation"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date</label>
              <input type="date" value={draft.date} onChange={e=>setDraft(p=>({...p,date:e.target.value}))} style={inp()}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Techniciens</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {TECHNICIENS.map(t=>{
                  const active=(draft.technicien||"").split(",").map(x=>x.trim()).includes(t);
                  return <button key={t} type="button" onClick={()=>toggleTech(t)}
                    style={{background:active?"#1d4ed822":"#1a2540",color:active?"#3b82f6":"#7a90aa",border:"1px solid "+(active?"#3b82f6":"#3d5270"),borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                    {t.split(" ")[0]}
                  </button>;
                })}
              </div>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Zone / Localisation</label>
              <input value={draft.zone} onChange={e=>setDraft(p=>({...p,zone:e.target.value}))} placeholder="ex: Toiture, exterieur nord..." style={inp()}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Type(s) d'intervention</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                {typesDesin.map(t=>{
                  const selected=(draft.type_intervention||"").split(",").map(x=>x.trim()).includes(t);
                  return <button key={t} type="button" onClick={()=>{
                    const cur=(draft.type_intervention||"").split(",").map(x=>x.trim()).filter(Boolean);
                    const next=selected?cur.filter(x=>x!==t):[...cur,t];
                    setDraft(p=>({...p,type_intervention:next.join(", ")}));
                  }} style={{background:selected?"#8b5cf622":"#243352",color:selected?"#8b5cf6":"#7a90aa",border:"1px solid "+(selected?"#8b5cf6":"#3d5270"),borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:selected?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>;
                })}
              </div>
              <div style={{display:"flex",gap:4}}>
                <input value={newTypeDesin} onChange={e=>setNewTypeDesin(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(newTypeDesin.trim()&&!typesDesin.includes(newTypeDesin.trim())){const v=newTypeDesin.trim();setTypesDesin(prev=>[...prev.filter(t=>t!=="Autre"),v,"Autre"]);setDraft(p=>({...p,type_intervention:((p.type_intervention?p.type_intervention+", ":"")+v)}));setNewTypeDesin("");}}}}
                  placeholder="+ Nouveau type..."
                  style={{...inp(),fontSize:10,padding:"3px 8px",flex:1}}/>
                <button onClick={()=>{if(newTypeDesin.trim()&&!typesDesin.includes(newTypeDesin.trim())){const v=newTypeDesin.trim();setTypesDesin(prev=>[...prev.filter(t=>t!=="Autre"),v,"Autre"]);setDraft(p=>({...p,type_intervention:((p.type_intervention?p.type_intervention+", ":"")+v)}));setNewTypeDesin("");}}}
                  style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
              {draft.type_intervention&&<div style={{fontSize:10,color:"#8b5cf6",marginTop:4}}>{draft.type_intervention}</div>}
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Urgence</label>
              <select value={draft.urgence} onChange={e=>setDraft(p=>({...p,urgence:e.target.value}))} style={inp()}>
                {URGENCES.map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Statut</label>
              <select value={draft.statut} onChange={e=>setDraft(p=>({...p,statut:e.target.value}))} style={inp()}>
                {["Planifie","En cours","Termine","Annule"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            {draft.statut==="Planifie" && (
              <div>
                <label style={{fontSize:10,color:"#3b82f6",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date planifiee</label>
                <input type="date" value={draft.date_planif||""} onChange={e=>setDraft(p=>({...p,date_planif:e.target.value}))} style={{...inp(),borderColor:"#3b82f6"}}/>
              </div>
            )}
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Produits utilises</label>
            <input value={draft.produits||""} onChange={e=>setDraft(p=>({...p,produits:e.target.value}))} placeholder="ex: SOLFAC EW 50, FICAM 80..." style={inp()}/>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Observations</label>
            <textarea rows={3} value={draft.observations} onChange={e=>setDraft(p=>({...p,observations:e.target.value}))} style={{...inp(),resize:"vertical"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Photos ({draftPhotos.length})</label>
            <label style={{background:"#243352",border:"1px dashed #3d5270",borderRadius:8,padding:"8px 14px",fontSize:11,color:"#7a90aa",cursor:"pointer"}}>
              + Ajouter photos
              <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={handlePhoto}/>
            </label>
            {draftPhotos.length>0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                {draftPhotos.map((ph,i)=>(
                  <div key={i} style={{position:"relative"}}>
                    <img src={ph.url} alt={ph.name} style={{width:70,height:70,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270"}}/>
                    <button onClick={()=>setDraftPhotos(prev=>prev.filter((_,j)=>j!==i))}
                      style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:16,height:16,fontSize:9,cursor:"pointer"}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {editId?"Mettre a jour":"Enregistrer"}
            </button>
            <button onClick={()=>{resetDraft();setShowForm(false);}} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {interventions.length===0 && !showForm && (
        <Card><div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:13}}>Aucune intervention. Cliquez sur "+ Nouvelle intervention".</div></Card>
      )}

      {interventions.map(item => {
        const isS = sel===item.id;
        const col = SCOLOR[item.statut]||"#7a90aa";
        const ucol = URGENCE_COLOR[item.urgence]||"#7a90aa";
        return (
          <Card key={item.id} style={{marginBottom:10,borderLeft:"3px solid "+col,cursor:"pointer"}} onClick={()=>setSel(isS?null:item.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div style={{flex:1}}>
                {item.observations && <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",marginBottom:6,lineHeight:1.5}}>{item.observations}</div>}
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                  <Badge label={item.statut} color={col}/>
                  {item.urgence!=="Normale"&&<Badge label={item.urgence} color={ucol}/>}
                  <span style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{item.type_intervention||item.zone}</span>
                </div>
                <div style={{fontSize:11,color:"#7a90aa"}}>{item.date||item.date_planif} — {item.technicien}</div>
                {item.zone&&item.type_intervention&&<div style={{fontSize:11,color:"#3b82f6",marginTop:2}}>{item.zone}</div>}
              </div>
              <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                {(item.statut&&(item.statut.toLowerCase().startsWith("termin"))) && <button onClick={e=>{e.stopPropagation();exportRapport("Desinsectisation",item);}} style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>PDF</button>}
                <button onClick={()=>openEdit(item)} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:5,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                <button onClick={()=>{setInterventions(prev=>prev.filter(x=>x.id!==item.id));setSel(null);sbDelete("desinsectisation",item.id);}}
                  style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:5,padding:"3px 6px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X</button>
              </div>
            </div>
            {isS && (
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #3d5270"}}>
                {item.produits&&<div style={{fontSize:12,color:"#94a3b8",marginBottom:4}}><strong style={{color:"#7a90aa"}}>Produits :</strong> {item.produits}</div>}
                {item.photos&&item.photos.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {item.photos.map((ph,j)=>(
                      <img key={j} src={ph.url} alt={ph.name} style={{width:80,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #3d5270"}}/>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function GestionPostes({ postes, setPostes }) {
  const STATUTS_POSTES = ["Actif", "Disparu", "Inaccessible", "Abimé"];
  const NUISIBLES_P  = ["Rongeurs","Blattes","Insectes volants","Teignes","IPS"];
  const [search, setSearch]         = useState("");
  const [filterMacro, setFilterMacro] = useState("Toutes");
  const [filterNuisible, setFilterNuisible] = useState("Tous");
  const [showAdd, setShowAdd]       = useState(false);
  const [newP, setNewP]             = useState({ id:"", zone:"", macro:"Extérieur", type:"RE", nuisible:"Rongeurs", appat:"Toxique", statut:"Actif" });
  const [editId, setEditId]         = useState(null);
  const [editData, setEditData]     = useState({});
  const [prevPostes, setPrevPostes] = useState(null);
  const [macrosList, setMacrosList] = useState(MACROS);
  const [newMacroInput, setNewMacroInput] = useState("");
  const [typesList, setTypesList] = useState(["RE", "RI", "DEIV", "PIV", "PC", "Autre"]);
  const [newTypeInput, setNewTypeInput] = useState("");
  const [showManageLists, setShowManageLists] = useState(false);

  function addMacro(value, applyTo) {
    const v = value.trim();
    if (!v || macrosList.includes(v)) return;
    setMacrosList(prev => [...prev.filter(m=>m!=="Autres"), v, "Autres"]);
    if (applyTo === "new") setNewP(p=>({...p, macro:v}));
    if (applyTo === "edit") setEditData(d=>({...d, macro:v}));
    setNewMacroInput("");
  }
  function removeMacro(v) {
    if (!window.confirm("Supprimer \""+v+"\" de la liste des macro-zones ?")) return;
    setMacrosList(prev => prev.filter(m=>m!==v));
  }
  function addType(value, applyTo) {
    const v = value.trim();
    if (!v || typesList.includes(v)) return;
    setTypesList(prev => [...prev.filter(t=>t!=="Autre"), v, "Autre"]);
    if (applyTo === "new") setNewP(p=>({...p, type:v}));
    if (applyTo === "edit") setEditData(d=>({...d, type:v}));
    setNewTypeInput("");
  }
  function removeType(v) {
    if (!window.confirm("Supprimer \""+v+"\" de la liste des types ?")) return;
    setTypesList(prev => prev.filter(t=>t!==v));
  }

  function addPoste() {
    if (!newP.id||postes.find(p=>p.id===newP.id.trim())) { alert("N° déjà existant ou vide."); return; }
    setPrevPostes(postes);
    const p = {...newP, id:newP.id.trim()};
    setPostes(prev=>[...prev,p]);
    sbUpsert("postes",{...p,contrat:CLIENT_CONFIG.contrat,statut:p.statut||"Actif"});
    setNewP({id:"",zone:"",macro:"Extérieur",type:"RE",nuisible:"Rongeurs",appat:"Toxique"});
    setShowAdd(false);
  }

  function startEdit(p) { setEditId(p.id); setEditData({...p}); }
  function saveEdit() {
    setPrevPostes(postes);
    setPostes(prev=>prev.map(p=>p.id===editId?{...editData}:p));
    sbUpdate("postes",editId,editData);
    setEditId(null);
  }
  function deletePoste(id) {
    if (!window.confirm("Supprimer ce poste ?")) return;
    setPrevPostes(postes);
    setPostes(prev=>prev.filter(p=>p.id!==id));
    sbDelete("postes",id);
  }

  const inpS = {background:"#1a2540",border:"1px solid #3d5270",borderRadius:6,padding:"4px 8px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit"};

  function sortPostesNat(list) {
    const TYPE_ORDER = { "RE": 0, "RI": 1 };
    return list.slice().sort((a,b)=>{
      const ta = TYPE_ORDER[a.type] !== undefined ? TYPE_ORDER[a.type] : 99;
      const tb = TYPE_ORDER[b.type] !== undefined ? TYPE_ORDER[b.type] : 99;
      if (ta !== tb) return ta - tb;
      const parse = id => {
        const m = id.match(/^([A-Za-z]+)[.\-]?(\d+)([A-Za-z]*)$/);
        return m ? [m[1].toUpperCase(), parseInt(m[2]), m[3].toUpperCase()] : [id.toUpperCase(), 0, ""];
      };
      const [ap,an,as_]=parse(a.id); const [bp,bn,bs]=parse(b.id);
      if(ap!==bp)return ap.localeCompare(bp);
      if(an!==bn)return an-bn;
      return as_.localeCompare(bs);
    });
  }

  const filtered = sortPostesNat(postes.filter(p => {
    if (filterNuisible !== "Tous" && (p.nuisible||"Rongeurs") !== filterNuisible) return false;
    if (search) { const s = search.toLowerCase(); return p.id.toLowerCase().includes(s)||(p.zone||"").toLowerCase().includes(s); }
    return true;
  }));

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9"}}>Gestion des postes ({postes.length})</div>
        <div style={{display:"flex",gap:6}}>
          {prevPostes && (
            <button onClick={()=>{setPostes(prevPostes);setPrevPostes(null);}}
              style={{background:"#f59e0b22",color:"#f59e0b",border:"1px solid #f59e0b44",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              ↩ Annuler
            </button>
          )}
          <button onClick={()=>setShowManageLists(v=>!v)} style={{background:"#8b5cf622",color:"#8b5cf6",border:"1px solid #8b5cf644",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Gerer les listes</button>
          <button onClick={()=>{
            const headers = ["N°","Zone","Macro-zone","Type","Nuisible","Appat","Statut"];
            const rows = filtered.map(p => [p.id, p.zone||"", p.macro||"", p.type||"", p.nuisible||"Rongeurs", p.appat||"", p.statut||""]);
            exportCSV("liste_postes_"+CLIENT_CONFIG.nom.replace(/\s+/g,"_"), headers, rows);
          }}
            style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Export Excel
          </button>
          <button onClick={()=>setShowAdd(v=>!v)} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+ Ajouter poste</button>
        </div>
      </div>
      {showManageLists && (
        <Card style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
            <div>
              <div style={{fontSize:10,color:"#3b82f6",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Macro-zones</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                {macrosList.map(m=>(
                  <span key={m} style={{display:"flex",alignItems:"center",gap:4,background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"3px 8px",fontSize:11,color:"#f1f5f9"}}>
                    {m}
                    <button onClick={()=>removeMacro(m)} style={{background:"transparent",border:"none",color:"#ef4444",cursor:"pointer",fontSize:10,padding:0,lineHeight:1}}>✕</button>
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:4}}>
                <input value={newMacroInput} onChange={e=>setNewMacroInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addMacro(newMacroInput);}}} placeholder="Nouvelle macro..." style={{...inpS,flex:1}}/>
                <button onClick={()=>addMacro(newMacroInput)} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
            </div>
            <div>
              <div style={{fontSize:10,color:"#f59e0b",fontWeight:700,marginBottom:6,textTransform:"uppercase"}}>Types de postes</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                {typesList.map(t=>(
                  <span key={t} style={{display:"flex",alignItems:"center",gap:4,background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"3px 8px",fontSize:11,color:"#f1f5f9"}}>
                    {t}
                    <button onClick={()=>removeType(t)} style={{background:"transparent",border:"none",color:"#ef4444",cursor:"pointer",fontSize:10,padding:0,lineHeight:1}}>✕</button>
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:4}}>
                <input value={newTypeInput} onChange={e=>setNewTypeInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){addType(newTypeInput);}}} placeholder="Nouveau type..." style={{...inpS,flex:1}}/>
                <button onClick={()=>addType(newTypeInput)} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
            </div>
          </div>
        </Card>
      )}
      {showAdd && (
        <Card style={{marginBottom:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:8}}>
            <div><label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:2}}>N° *</label><input value={newP.id} onChange={e=>setNewP(p=>({...p,id:e.target.value}))} style={inpS}/></div>
            <div><label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:2}}>Zone</label><input value={newP.zone} onChange={e=>setNewP(p=>({...p,zone:e.target.value}))} style={inpS}/></div>
            <div><label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:2}}>Macro-zone</label>
              <select value={newP.macro} onChange={e=>setNewP(p=>({...p,macro:e.target.value}))} style={inpS}>{macrosList.map(m=><option key={m}>{m}</option>)}</select>
              <div style={{display:"flex",gap:3,marginTop:3}}>
                <input value={newMacroInput} onChange={e=>setNewMacroInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addMacro(newMacroInput,"new");}}} placeholder="+ Nouvelle macro" style={{...inpS,fontSize:9,padding:"3px 6px"}}/>
                <button onClick={()=>addMacro(newMacroInput,"new")} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:5,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
            </div>
            <div><label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:2}}>Type</label>
              <select value={newP.type} onChange={e=>setNewP(p=>({...p,type:e.target.value}))} style={inpS}>{typesList.map(t=><option key={t}>{t}</option>)}</select>
              <div style={{display:"flex",gap:3,marginTop:3}}>
                <input value={newTypeInput} onChange={e=>setNewTypeInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addType(newTypeInput,"new");}}} placeholder="+ Nouveau type" style={{...inpS,fontSize:9,padding:"3px 6px"}}/>
                <button onClick={()=>addType(newTypeInput,"new")} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:5,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>+</button>
              </div>
            </div>
            <div><label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:2}}>Nuisible</label>
              <select value={newP.nuisible} onChange={e=>setNewP(p=>({...p,nuisible:e.target.value}))} style={inpS}>{NUISIBLES_P.map(n=><option key={n}>{n}</option>)}</select></div>
            <div><label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:2}}>Appât</label><input value={newP.appat} onChange={e=>setNewP(p=>({...p,appat:e.target.value}))} style={inpS}/></div>
            <div><label style={{fontSize:9,color:"#7a90aa",display:"block",marginBottom:2}}>Statut</label><select value={newP.statut||"Actif"} onChange={e=>setNewP(p=>({...p,statut:e.target.value}))} style={inpS}>{STATUTS_POSTES.map(s=><option key={s}>{s}</option>)}</select></div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={addPoste} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Ajouter</button>
            <button onClick={()=>setShowAdd(false)} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"6px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
          </div>
        </Card>
      )}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher N°, zone..."
          style={{background:"#243352",border:"1px solid #3d5270",borderRadius:7,padding:"5px 10px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit",flex:1,minWidth:140}}/>
        <select value={filterNuisible} onChange={e=>setFilterNuisible(e.target.value)} style={{...inpS,fontSize:11}}>
          <option value="Tous">Tous nuisibles</option>
          {NUISIBLES_P.map(n=><option key={n}>{n}</option>)}
        </select>
        <span style={{fontSize:11,color:"#5a7090",alignSelf:"center"}}>{filtered.length} postes</span>
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{background:"#1a2540",padding:"8px 14px",display:"grid",gridTemplateColumns:"70px 1fr 110px 70px 80px 70px 80px 80px",gap:8,fontSize:9,fontWeight:700,color:"#7a90aa",textTransform:"uppercase"}}>
          <div>N°</div><div>Zone</div><div>Macro</div><div>Type</div><div>Nuisible</div><div>Capture</div><div>Statut</div><div>Actions</div>
        </div>
        <div style={{maxHeight:400,overflowY:"auto"}}>
          {filtered.map((p,i)=>(
            <div key={p.id} style={{padding:"7px 14px",display:"grid",gridTemplateColumns:"70px 1fr 110px 70px 80px 70px 80px 80px",gap:8,alignItems:"center",borderTop:"1px solid #243352",background:i%2===0?"transparent":"#ffffff04"}}>
              {editId===p.id ? (
                <>
                  <input value={editData.id} onChange={e=>setEditData(d=>({...d,id:e.target.value}))} style={{...inpS,width:"100%"}}/>
                  <input value={editData.zone||""} onChange={e=>setEditData(d=>({...d,zone:e.target.value}))} style={{...inpS,width:"100%"}}/>
                  <select value={editData.macro||""} onChange={e=>setEditData(d=>({...d,macro:e.target.value}))} style={inpS}>{macrosList.map(m=><option key={m}>{m}</option>)}</select>
                  <select value={editData.type||""} onChange={e=>setEditData(d=>({...d,type:e.target.value}))} style={inpS}>{typesList.map(t=><option key={t}>{t}</option>)}</select>
                  <select value={editData.nuisible||""} onChange={e=>setEditData(d=>({...d,nuisible:e.target.value}))} style={inpS}>{NUISIBLES_P.map(n=><option key={n}>{n}</option>)}</select>
                  <select value={editData.appat||""} onChange={e=>setEditData(d=>({...d,appat:e.target.value}))} style={inpS}>
                    <option value="">—</option>
                    <option value="Glue">Glue</option>
                    <option value="Grille">Grille</option>
                    <option value="Toxique">Toxique</option>
                    <option value="Lumiere">Lumiere</option>
                    <option value="Autre">Autre</option>
                  </select>
                  <select value={editData.statut||"Actif"} onChange={e=>setEditData(d=>({...d,statut:e.target.value}))} style={inpS}>{STATUTS_POSTES.map(s=><option key={s}>{s}</option>)}</select>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={saveEdit} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:5,padding:"2px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>OK</button>
                    <button onClick={()=>setEditId(null)} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:5,padding:"2px 6px",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>X</button>
                  </div>
                </>
              ):(
                <>
                  <div style={{fontSize:11,fontWeight:700,color:"#f1f5f9",fontFamily:"monospace"}}>{p.id}</div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{(p.zone||"").slice(0,30)}</div>
                  <div style={{fontSize:10,color:"#7a90aa"}}>{p.macro}</div>
                  <div style={{fontSize:10,color:"#7a90aa"}}>{p.type}</div>
                  <div style={{fontSize:10,color:NUISIBLE_COLORS[p.nuisible||"Rongeurs"]||"#7a90aa",fontWeight:600}}>{p.nuisible||"Rongeurs"}</div>
                  <div style={{fontSize:10,color:p.appat?"#f1f5f9":"#5a7090"}}>{p.appat||"—"}</div>
                  <div style={{fontSize:10,color:p.statut==="Actif"||!p.statut?"#22c55e":p.statut==="Disparu"?"#ef4444":"#f59e0b",fontWeight:600}}>{p.statut||"Actif"}</div>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>startEdit(p)} style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                    <button onClick={()=>deletePoste(p.id)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:5,padding:"2px 6px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// EDITEUR DE PLAN (dessin manuel)
// ============================================================
function PlanEditor({ onClose, onSaved, existingPlan, backgroundImg, sourcePlanId }) {
  const [label, setLabel] = useState(existingPlan?.label || "");
  const grilleSauvee = (existingPlan?.elements || []).filter(e => e.type === "__grille")[0] || null;
  const [elements, setElements] = useState((existingPlan?.elements || []).filter(e => e.type !== "__grille"));
  const [tool, setTool] = useState("trait"); // trait, rect, texte, select
  const [drawing, setDrawing] = useState(null);
  const [selectedEl, setSelectedEl] = useState(null);
  const [color, setColor] = useState("#3b82f6");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fillShape, setFillShape] = useState(false); // formes pleines
  const [textInput, setTextInput] = useState("");
  const [pendingTextPos, setPendingTextPos] = useState(null);
  const [txtBold, setTxtBold] = useState(false);
  const [txtItalic, setTxtItalic] = useState(false);
  const [txtHighlight, setTxtHighlight] = useState(false);
  const [dragEl, setDragEl] = useState(null);       // {id, startX, startY, orig} en cours de deplacement
  const [clipboard, setClipboard] = useState(null); // element copie
  const [editingText, setEditingText] = useState(null); // id du texte en cours de modification
  const elementsRef = React.useRef(elements);
  React.useEffect(()=>{ elementsRef.current = elements; }, [elements]);
  const [polyPoints, setPolyPoints] = useState(null); // pour outil polygone
  // Grille : nombre de cases reglable, aimantation et reperage A1/B2 optionnels.
  // Persistee avec le plan pour que les reperes restent stables entre deux ouvertures.
  const [gridCols, setGridCols] = useState((grilleSauvee && grilleSauvee.gridCols) || existingPlan?.gridCols || 6);
  const [gridRows, setGridRows] = useState((grilleSauvee && grilleSauvee.gridRows) || existingPlan?.gridRows || 4);
  const [gridOn, setGridOn]     = useState(grilleSauvee ? grilleSauvee.gridOn : (existingPlan?.gridOn !== undefined ? existingPlan.gridOn : true));
  const [snapOn, setSnapOn]     = useState(grilleSauvee ? grilleSauvee.snapOn : (existingPlan?.snapOn !== undefined ? existingPlan.snapOn : true));
  // Ancrage dans la case facon Excel : 9 positions. anchorH gauche|centre|droite,
  // anchorV haut|milieu|bas. Applique au point aimante et a l alignement du texte.
  const [anchorH, setAnchorH] = useState((grilleSauvee && grilleSauvee.anchorH) || "centre");
  const [anchorV, setAnchorV] = useState((grilleSauvee && grilleSauvee.anchorV) || "milieu");
  const svgRef = React.useRef(null);

  const W = 900, H = 600;
  const cellW = W / gridCols, cellH = H / gridRows;

  // Lettre(s) de colonne facon tableur : A..Z puis AA, AB...
  function colonneLabel(i) {
    var s = "", n = i;
    do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
    return s;
  }
  // Aimante une coordonnee au centre de la case la plus proche.
  function snap(x, y) {
    if (!snapOn || !gridOn) return { x: Math.round(x), y: Math.round(y) };
    var col = Math.min(gridCols - 1, Math.max(0, Math.floor(x / cellW)));
    var row = Math.min(gridRows - 1, Math.max(0, Math.floor(y / cellH)));
    var padX = cellW * 0.12, padY = cellH * 0.16;
    var fx = anchorH === "gauche" ? padX : anchorH === "droite" ? cellW - padX : cellW / 2;
    var fy = anchorV === "haut" ? padY : anchorV === "bas" ? cellH - padY : cellH / 2;
    return { x: Math.round(col * cellW + fx), y: Math.round(row * cellH + fy) };
  }
  // Reference de case A1/B2 pour une coordonnee.
  function repereCase(x, y) {
    var col = Math.min(gridCols - 1, Math.max(0, Math.floor(x / cellW)));
    var row = Math.min(gridRows - 1, Math.max(0, Math.floor(y / cellH)));
    return colonneLabel(col) + (row + 1);
  }

  function getSvgCoords(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    return snap(x, y);
  }

  function handleMouseDown(e) {
    if (tool === "select") {
      // Le drag est amorce par le onMouseDown de l element (setDragEl).
      // Un clic dans le vide deselectionne.
      if (!dragEl) setSelectedEl(null);
      return;
    }
    if (tool === "gomme") return; // géré au clic sur les éléments
    const { x, y } = getSvgCoords(e);
    if (tool === "texte") {
      setPendingTextPos({ x, y });
      if (gridOn && !textInput.trim()) setTextInput(repereCase(x, y));
      return;
    }
    if (tool === "polygone") {
      if (!polyPoints) {
        setPolyPoints([{x,y}]);
      } else {
        setPolyPoints(prev => [...prev, {x,y}]);
      }
      return;
    }
    setDrawing({ tool, x1: x, y1: y, x2: x, y2: y, color, strokeWidth });
  }

  // Translate un element de (dx,dy), quel que soit son type.
  React.useEffect(() => {
    function onKey(e) {
      // On ignore les raccourcis quand on tape dans un champ.
      var t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      var ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (e.key === "c" || e.key === "C") && selectedEl) {
        var el = elementsRef.current.filter(x => x.id === selectedEl)[0];
        if (el) setClipboard(el);
      } else if (ctrl && (e.key === "v" || e.key === "V") && clipboard) {
        e.preventDefault();
        var copie = decalerElement({ ...clipboard, id: String(Date.now()) }, 18, 18);
        setElements(prev => prev.concat([copie]));
        setSelectedEl(copie.id);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedEl && tool === "select") {
        e.preventDefault();
        setElements(prev => prev.filter(x => x.id !== selectedEl));
        setSelectedEl(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEl, clipboard, tool]);

  function decalerElement(el, dx, dy) {
    var n = { ...el };
    if (n.x1 !== undefined) { n.x1 += dx; n.y1 += dy; }
    if (n.x2 !== undefined) { n.x2 += dx; n.y2 += dy; }
    if (n.points) n.points = n.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
    return n;
  }

  // Centre geometrique d un element, axe de rotation / miroir.
  function centreEl(el) {
    if (el.points && el.points.length) {
      var sx=0, sy=0; el.points.forEach(pt=>{ sx+=pt.x; sy+=pt.y; });
      return { cx: sx/el.points.length, cy: sy/el.points.length };
    }
    var ax = el.x1||0, bx = (el.x2!==undefined?el.x2:el.x1)||0;
    var ay = el.y1||0, by = (el.y2!==undefined?el.y2:el.y1)||0;
    return { cx: (ax+bx)/2, cy: (ay+by)/2 };
  }
  // Chaine transform SVG (rotation + miroir horizontal) autour du centre.
  function transformEl(el) {
    var c = centreEl(el);
    var parts = [];
    if (el.rotation) parts.push("rotate("+el.rotation+" "+c.cx+" "+c.cy+")");
    if (el.flip) parts.push("translate("+(2*c.cx)+" 0) scale(-1 1)");
    return parts.length ? parts.join(" ") : undefined;
  }

  function finishPolygon() {
    if (!polyPoints || polyPoints.length < 3) { setPolyPoints(null); return; }
    const newEl = { id: String(Date.now()), type: "polygone", points: polyPoints, color, strokeWidth, filled: fillShape };
    setElements(prev => [...prev, newEl]);
    setPolyPoints(null);
  }

  function handleMouseMove(e) {
    if (dragEl) {
      const rect = svgRef.current.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * W;
      const my = ((e.clientY - rect.top) / rect.height) * H;
      var dx = mx - dragEl.startX, dy = my - dragEl.startY;
      setElements(prev => prev.map(el => el.id === dragEl.id ? decalerElement(dragEl.orig, dx, dy) : el));
      return;
    }
    if (!drawing) return;
    const { x, y } = getSvgCoords(e);
    setDrawing(prev => ({ ...prev, x2: x, y2: y }));
  }

  function handleMouseUp() {
    if (dragEl) {
      // A la depose, on aimante le point d ancrage du texte sur la grille.
      if (snapOn && gridOn) {
        setElements(prev => prev.map(el => {
          if (el.id !== dragEl.id || el.type !== "texte") return el;
          var s = snap(el.x1, el.y1);
          return { ...el, x1: s.x, y1: s.y };
        }));
      }
      setDragEl(null);
      return;
    }
    if (!drawing) return;
    if (Math.abs(drawing.x2 - drawing.x1) < 3 && Math.abs(drawing.y2 - drawing.y1) < 3) {
      setDrawing(null);
      return;
    }
    const newEl = { id: String(Date.now()), type: drawing.tool, x1: drawing.x1, y1: drawing.y1, x2: drawing.x2, y2: drawing.y2, color: drawing.color, strokeWidth: drawing.strokeWidth, filled: fillShape };
    setElements(prev => [...prev, newEl]);
    setDrawing(null);
  }

  function addText() {
    if (editingText) {
      setElements(prev => prev.map(el => el.id === editingText
        ? { ...el, text: textInput, bold: txtBold, italic: txtItalic, highlight: txtHighlight }
        : el));
      setEditingText(null); setTextInput("");
      return;
    }
    if (!textInput.trim() || !pendingTextPos) { setPendingTextPos(null); return; }
    const newEl = { id: String(Date.now()), type: "texte", x1: pendingTextPos.x, y1: pendingTextPos.y, text: textInput, color, fontSize: 14, anchorH: snapOn && gridOn ? anchorH : "gauche", anchorV: snapOn && gridOn ? anchorV : "haut", bold: txtBold, italic: txtItalic, highlight: txtHighlight };
    setElements(prev => [...prev, newEl]);
    setTextInput("");
    setPendingTextPos(null);
  }

  // Handlers communs a tous les elements : selection, gomme, amorce de drag,
  // et double-clic pour rouvrir un texte en edition.
  function amorcerDrag(el, e) {
    if (tool !== "select") return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const my = ((e.clientY - rect.top) / rect.height) * H;
    setSelectedEl(el.id);
    setDragEl({ id: el.id, startX: mx, startY: my, orig: el });
  }
  function elHandlers(el) {
    return {
      transform: transformEl(el),
      onMouseDown: (e) => { if (tool === "select") { e.stopPropagation(); amorcerDrag(el, e); } },
      onClick: () => { if (tool === "gomme") setElements(prev => prev.filter(e => e.id !== el.id)); else if (tool === "select") setSelectedEl(el.id); },
      onDoubleClick: () => { if (el.type === "texte" && tool === "select") { setEditingText(el.id); setTextInput(el.text || ""); setTxtBold(!!el.bold); setTxtItalic(!!el.italic); setTxtHighlight(!!el.highlight); } },
      style: { cursor: tool === "gomme" ? "crosshair" : tool === "select" ? "move" : "default" }
    };
  }

  function deleteElement(id) {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedEl(null);
  }

  function undoLast() {
    setElements(prev => prev.slice(0, -1));
  }

  async function savePlan() {
    if (!label.trim()) { alert("Donnez un nom au plan"); return; }
    const id = existingPlan?.id || String(Date.now());
    // La grille voyage dans le JSON elements sous une entree meta (type "__grille"),
    // ce qui evite d ajouter des colonnes a plans_dessines. Le rendu ignore ce type.
    const grilleMeta = { id: "__grille", type: "__grille", gridCols, gridRows, gridOn, snapOn, anchorH, anchorV };
    const elementsAvecMeta = elements.filter(e => e.type !== "__grille").concat([grilleMeta]);
    const planData = { id, contrat: CLIENT_CONFIG.contrat, label: label.trim(), elements: JSON.stringify(elementsAvecMeta), background_img: backgroundImg || existingPlan?.backgroundImg || "" };
    await sbUpsert("plans_dessines", planData);
    if (onSaved) onSaved({ id, label: label.trim(), elements: elementsAvecMeta, backgroundImg: backgroundImg || existingPlan?.backgroundImg, gridCols, gridRows, gridOn, snapOn, anchorH, anchorV });
    if (onClose) onClose();
  }

  const COLORS = ["#3b82f6", "#1e40af", "#06b6d4", "#22c55e", "#84cc16", "#eab308", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#7a90aa", "#000000", "#ffffff"];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#1a2540", borderRadius:14, padding:20, maxWidth:980, width:"100%", maxHeight:"95vh", overflowY:"auto", border:"1px solid #3d5270" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
          <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Nom du plan (ex: Etage 1)"
            style={{ background:"#243352", border:"1px solid #3d5270", borderRadius:8, padding:"8px 14px", color:"#f1f5f9", fontSize:14, fontFamily:"inherit", fontWeight:700, flex:1, minWidth:200 }}/>
          <button onClick={onClose} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Fermer</button>
        </div>

        {/* Toolbar */}
        <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
          {[["trait","Trait"],["rect","Rectangle"],["cercle","Cercle"],["fleche","Fleche"],["triangle","Triangle"],["polygone","Polygone"],["porte","Porte"],["porte_biais","Porte biais"],["escalier","Escalier"],["fenetre","Fenetre"],["texte","Texte"],["select","Selection"],["gomme","🧹 Gomme"]].map(([t,l])=>(
            <button key={t} onClick={()=>{setTool(t);setPolyPoints(null);}}
              style={{ background:tool===t?"#1d4ed8":"#243352", color:tool===t?"#fff":"#94a3b8", border:"1px solid "+(tool===t?"#3b82f6":"#3d5270"), borderRadius:7, padding:"6px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              {l}
            </button>
          ))}
          {tool==="polygone" && polyPoints && polyPoints.length>=3 && (
            <button onClick={finishPolygon} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Terminer ({polyPoints.length} pts)
            </button>
          )}
          <div style={{ display:"flex", gap:4, marginLeft:8 }}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setColor(c)}
                style={{ width:24, height:24, borderRadius:"50%", background:c, border:color===c?(c==="#ffffff"?"3px solid #3b82f6":"3px solid #fff"):"1px solid #3d5270", cursor:"pointer", padding:0 }}/>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:8 }}>
            <span style={{ fontSize:11, color:"#7a90aa" }}>Epaisseur</span>
            <input type="range" min="1" max="8" value={strokeWidth} onChange={e=>setStrokeWidth(parseInt(e.target.value))} style={{ width:60 }}/>
            <button onClick={()=>setFillShape(v=>!v)} title="Remplir les formes de couleur"
              style={{ marginLeft:8, background:fillShape?"#1d4ed8":"#243352", color:fillShape?"#fff":"#94a3b8", border:"1px solid "+(fillShape?"#3b82f6":"#3d5270"), borderRadius:7, padding:"6px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Rempli
            </button>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:8, paddingLeft:12, borderLeft:"1px solid #3d5270" }}>
            <button onClick={()=>setGridOn(v=>!v)} title="Afficher la grille et les reperes de case"
              style={{ background:gridOn?"#1d4ed8":"#243352", color:gridOn?"#fff":"#94a3b8", border:"1px solid "+(gridOn?"#3b82f6":"#3d5270"), borderRadius:7, padding:"6px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
              Grille
            </button>
            <button onClick={()=>setSnapOn(v=>!v)} disabled={!gridOn} title="Aimanter les elements au centre des cases"
              style={{ background:snapOn&&gridOn?"#1d4ed8":"#243352", color:snapOn&&gridOn?"#fff":"#94a3b8", border:"1px solid "+(snapOn&&gridOn?"#3b82f6":"#3d5270"), borderRadius:7, padding:"6px 12px", fontSize:11, fontWeight:600, cursor:gridOn?"pointer":"default", opacity:gridOn?1:0.5, fontFamily:"inherit" }}>
              Aimant
            </button>
            <span style={{ fontSize:11, color:"#7a90aa" }}>Cols</span>
            <input type="number" min="1" max="26" value={gridCols} onChange={e=>setGridCols(Math.min(26,Math.max(1,parseInt(e.target.value)||1)))}
              style={{ width:44, background:"#243352", border:"1px solid #3d5270", borderRadius:6, padding:"4px 6px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" }}/>
            <span style={{ fontSize:11, color:"#7a90aa" }}>Lignes</span>
            <input type="number" min="1" max="40" value={gridRows} onChange={e=>setGridRows(Math.min(40,Math.max(1,parseInt(e.target.value)||1)))}
              style={{ width:44, background:"#243352", border:"1px solid #3d5270", borderRadius:6, padding:"4px 6px", color:"#f1f5f9", fontSize:11, fontFamily:"inherit" }}/>
            {snapOn && gridOn && (
              <div title="Position dans la case" style={{ display:"grid", gridTemplateColumns:"repeat(3,14px)", gridTemplateRows:"repeat(3,14px)", gap:2, marginLeft:4, background:"#243352", border:"1px solid #3d5270", borderRadius:6, padding:3 }}>
                {["haut","milieu","bas"].map(v => ["gauche","centre","droite"].map(h => {
                  var actif = anchorH===h && anchorV===v;
                  return <button key={h+v} onClick={()=>{ setAnchorH(h); setAnchorV(v); }} title={h+" "+v}
                    style={{ width:14, height:14, padding:0, borderRadius:2, cursor:"pointer",
                             background: actif ? "#1d4ed8" : "#1a2540",
                             border:"1px solid "+(actif?"#3b82f6":"#3d5270") }}/>;
                }))}
              </div>
            )}
          </div>
          <button onClick={undoLast} disabled={elements.length===0}
            style={{ background:"#f59e0b22", color:"#f59e0b", border:"1px solid #f59e0b44", borderRadius:7, padding:"6px 12px", fontSize:12, fontWeight:700, cursor:elements.length?"pointer":"default", fontFamily:"inherit", opacity:elements.length?1:0.4, marginLeft:"auto" }}>
            ↩ Annuler dernier
          </button>
          <button onClick={()=>{ if(window.confirm("Effacer tout le dessin ?")) setElements([]); }}
            style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444444", borderRadius:7, padding:"6px 12px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Tout effacer
          </button>
        </div>

        {/* Zone de dessin */}
        <div style={{ background:"#fff", borderRadius:10, overflow:"hidden", position:"relative" }}>
          <svg ref={svgRef} viewBox={"0 0 "+W+" "+H} style={{ width:"100%", height:"auto", display:"block", cursor: tool==="select"?"default":"crosshair" }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={()=>setDrawing(null)}
            onDoubleClick={()=>{ if(tool==="polygone") finishPolygon(); }}>
            <rect width={W} height={H} fill="#fff"/>
            {backgroundImg && <image href={backgroundImg} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid meet" opacity="0.85"/>}
            {/* Grille reglable, tracee au-dessus du plan pour rester lisible */}
            {gridOn && (
              <g pointerEvents="none">
                {Array.from({length: gridCols - 1}).map((_, i) => (
                  <line key={"vc"+i} x1={(i+1)*cellW} y1={0} x2={(i+1)*cellW} y2={H} stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="4 4"/>
                ))}
                {Array.from({length: gridRows - 1}).map((_, i) => (
                  <line key={"hr"+i} x1={0} y1={(i+1)*cellH} x2={W} y2={(i+1)*cellH} stroke="#93c5fd" strokeWidth="0.8" strokeDasharray="4 4"/>
                ))}
                {Array.from({length: gridCols}).map((_, c) => (
                  <text key={"cl"+c} x={(c+0.5)*cellW} y={13} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2563eb">{colonneLabel(c)}</text>
                ))}
                {Array.from({length: gridRows}).map((_, r) => (
                  <text key={"rl"+r} x={9} y={(r+0.5)*cellH+4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2563eb">{r+1}</text>
                ))}
              </g>
            )}

            {/* Elements existants */}
            {elements.map(el => {
              const isSel = selectedEl === el.id;
              if (el.type === "trait") {
                return <line key={el.id} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"
                  {...elHandlers(el)}
                  opacity={isSel?0.6:1}/>;
              }
              if (el.type === "rect") {
                const x = Math.min(el.x1, el.x2), y = Math.min(el.y1, el.y2);
                const w = Math.abs(el.x2-el.x1), h = Math.abs(el.y2-el.y1);
                return <rect key={el.id} x={x} y={y} width={w} height={h} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}
                  {...elHandlers(el)}
                  opacity={isSel?0.6:1}/>;
              }
              if (el.type === "cercle") {
                const cx = (el.x1+el.x2)/2, cy = (el.y1+el.y2)/2;
                const rx = Math.abs(el.x2-el.x1)/2, ry = Math.abs(el.y2-el.y1)/2;
                return <ellipse key={el.id} cx={cx} cy={cy} rx={rx} ry={ry} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}
                  {...elHandlers(el)}
                  opacity={isSel?0.6:1}/>;
              }
              if (el.type === "triangle") {
                const x1=el.x1, y1=el.y2, x2=el.x2, y2=el.y2, x3=(el.x1+el.x2)/2, y3=el.y1;
                return <polygon key={el.id} points={x1+","+y1+" "+x2+","+y2+" "+x3+","+y3} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}
                  {...elHandlers(el)}
                  opacity={isSel?0.6:1}/>;
              }
              if (el.type === "fleche") {
                const angle = Math.atan2(el.y2-el.y1, el.x2-el.x1);
                const len = 14;
                const ax1 = el.x2 - len*Math.cos(angle-Math.PI/6), ay1 = el.y2 - len*Math.sin(angle-Math.PI/6);
                const ax2 = el.x2 - len*Math.cos(angle+Math.PI/6), ay2 = el.y2 - len*Math.sin(angle+Math.PI/6);
                return (
                  <g key={el.id} {...elHandlers(el)} opacity={isSel?0.6:1}>
                    <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/>
                    <line x1={el.x2} y1={el.y2} x2={ax1} y2={ay1} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/>
                    <line x1={el.x2} y1={el.y2} x2={ax2} y2={ay2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/>
                  </g>
                );
              }
              if (el.type === "polygone") {
                const pts = el.points.map(p=>p.x+","+p.y).join(" ");
                return <polygon key={el.id} points={pts} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}
                  {...elHandlers(el)}
                  opacity={isSel?0.6:1}/>;
              }
              if (el.type === "porte") {
                const x = Math.min(el.x1,el.x2), y = Math.min(el.y1,el.y2);
                const w = Math.abs(el.x2-el.x1) || 40;
                return (
                  <g key={el.id} {...elHandlers(el)} opacity={isSel?0.6:1}>
                    <line x1={x} y1={y} x2={x} y2={y+w} stroke={el.color} strokeWidth={el.strokeWidth}/>
                    <path d={"M "+x+" "+y+" A "+w+" "+w+" 0 0 1 "+(x+w)+" "+y} fill="none" stroke={el.color} strokeWidth="1" strokeDasharray="3,3"/>
                    <line x1={x} y1={y} x2={x+w} y2={y} stroke={el.color} strokeWidth={el.strokeWidth}/>
                  </g>
                );
              }
              if (el.type === "fenetre") {
                const x = Math.min(el.x1,el.x2), y = Math.min(el.y1,el.y2);
                const w = Math.abs(el.x2-el.x1) || 40, h = Math.abs(el.y2-el.y1) || 10;
                return (
                  <g key={el.id} {...elHandlers(el)} opacity={isSel?0.6:1}>
                    <rect x={x} y={y} width={w} height={h} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>
                    <line x1={x} y1={y+h/2} x2={x+w} y2={y+h/2} stroke={el.color} strokeWidth={el.strokeWidth}/>
                  </g>
                );
              }
              if (el.type === "escalier") {
                const x = Math.min(el.x1,el.x2), y = Math.min(el.y1,el.y2);
                const w = Math.abs(el.x2-el.x1)||60, h = Math.abs(el.y2-el.y1)||40;
                const n = 4;
                return (
                  <g key={el.id} {...elHandlers(el)} opacity={isSel?0.6:1}>
                    <rect x={x} y={y} width={w} height={h} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>
                    {Array.from({length:n-1}).map((_,i)=>(
                      <line key={i} x1={x} y1={y+(i+1)*h/n} x2={x+w} y2={y+(i+1)*h/n} stroke={el.color} strokeWidth={el.strokeWidth}/>
                    ))}
                  </g>
                );
              }
              if (el.type === "porte_biais") {
                return (
                  <g key={el.id} {...elHandlers(el)} opacity={isSel?0.6:1}>
                    <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/>
                  </g>
                );
              }
              if (el.type === "texte") {
                return renderTexteSVG(el, { ...elHandlers(el), opacity: isSel ? 0.6 : 1 });
              }
              return null;
            })}

            {/* Élément en cours de dessin */}
            {drawing && drawing.tool === "trait" && (
              <line x1={drawing.x1} y1={drawing.y1} x2={drawing.x2} y2={drawing.y2} stroke={drawing.color} strokeWidth={drawing.strokeWidth} strokeDasharray="4,3"/>
            )}
            {drawing && drawing.tool === "rect" && (
              <rect x={Math.min(drawing.x1,drawing.x2)} y={Math.min(drawing.y1,drawing.y2)} width={Math.abs(drawing.x2-drawing.x1)} height={Math.abs(drawing.y2-drawing.y1)} fill="none" stroke={drawing.color} strokeWidth={drawing.strokeWidth} strokeDasharray="4,3"/>
            )}
            {drawing && drawing.tool === "cercle" && (
              <ellipse cx={(drawing.x1+drawing.x2)/2} cy={(drawing.y1+drawing.y2)/2} rx={Math.abs(drawing.x2-drawing.x1)/2} ry={Math.abs(drawing.y2-drawing.y1)/2} fill="none" stroke={drawing.color} strokeWidth={drawing.strokeWidth} strokeDasharray="4,3"/>
            )}
            {drawing && drawing.tool === "triangle" && (
              <polygon points={drawing.x1+","+drawing.y2+" "+drawing.x2+","+drawing.y2+" "+((drawing.x1+drawing.x2)/2)+","+drawing.y1} fill="none" stroke={drawing.color} strokeWidth={drawing.strokeWidth} strokeDasharray="4,3"/>
            )}
            {drawing && drawing.tool === "fleche" && (
              <line x1={drawing.x1} y1={drawing.y1} x2={drawing.x2} y2={drawing.y2} stroke={drawing.color} strokeWidth={drawing.strokeWidth} strokeDasharray="4,3"/>
            )}
            {drawing && (drawing.tool === "porte" || drawing.tool === "fenetre") && (
              <rect x={Math.min(drawing.x1,drawing.x2)} y={Math.min(drawing.y1,drawing.y2)} width={Math.abs(drawing.x2-drawing.x1)} height={Math.abs(drawing.y2-drawing.y1)||10} fill="none" stroke={drawing.color} strokeWidth={drawing.strokeWidth} strokeDasharray="4,3"/>
            )}
            {/* Polygone en cours */}
            {polyPoints && (
              <g>
                <polyline points={polyPoints.map(p=>p.x+","+p.y).join(" ")} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray="4,3"/>
                {polyPoints.map((p,i)=>(<circle key={i} cx={p.x} cy={p.y} r="3" fill={color}/>))}
              </g>
            )}
          </svg>

          {/* Popup ajout texte */}
          {editingText && (
            <div style={{ position:"absolute", left:"50%", top:12, transform:"translateX(-50%)", background:"#243352", border:"1px solid #3b82f6", borderRadius:8, padding:8, display:"flex", gap:6, zIndex:11, alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#7a90aa", fontWeight:700 }}>Modifier</span>
              <input autoFocus value={textInput} onChange={e=>setTextInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addText();if(e.key==="Escape"){setEditingText(null);setTextInput("");}}}
                style={{ background:"#1a2540", border:"1px solid #3d5270", borderRadius:5, padding:"4px 8px", color:"#f1f5f9", fontSize:12, fontFamily:"inherit", fontWeight:txtBold?800:400, fontStyle:txtItalic?"italic":"normal" }}/>
              <button onClick={()=>setTxtBold(v=>!v)} style={{ background:txtBold?"#1d4ed8":"#1a2540", color:txtBold?"#fff":"#94a3b8", border:"1px solid "+(txtBold?"#3b82f6":"#3d5270"), borderRadius:5, padding:"4px 9px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>B</button>
              <button onClick={()=>setTxtItalic(v=>!v)} style={{ background:txtItalic?"#1d4ed8":"#1a2540", color:txtItalic?"#fff":"#94a3b8", border:"1px solid "+(txtItalic?"#3b82f6":"#3d5270"), borderRadius:5, padding:"4px 9px", fontSize:12, fontStyle:"italic", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>I</button>
              <button onClick={()=>setTxtHighlight(v=>!v)} style={{ background:txtHighlight?"#facc15":"#1a2540", color:txtHighlight?"#1a2540":"#94a3b8", border:"1px solid "+(txtHighlight?"#facc15":"#3d5270"), borderRadius:5, padding:"4px 9px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>S</button>
              <div style={{ display:"flex", gap:3, paddingLeft:6, marginLeft:2, borderLeft:"1px solid #3d5270" }}>
                {COLORS.map(c=>{
                  var courant = elements.filter(x=>x.id===editingText)[0];
                  var actif = courant && courant.color === c;
                  return <button key={c} title="Couleur du texte"
                    onClick={()=>setElements(prev=>prev.map(el=>el.id===editingText?{...el,color:c}:el))}
                    style={{ width:20, height:20, borderRadius:"50%", background:c, border:actif?"3px solid #fff":"1px solid #3d5270", cursor:"pointer", padding:0 }}/>;
                })}
              </div>
              <button onClick={addText} style={{ background:"#22c55e", color:"#fff", border:"none", borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>OK</button>
              <button onClick={()=>{setEditingText(null);setTextInput("");}} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:5, padding:"4px 8px", fontSize:11, cursor:"pointer" }}>Annuler</button>
            </div>
          )}
          {pendingTextPos && !editingText && (
            <div style={{ position:"absolute", left:(pendingTextPos.x/W*100)+"%", top:(pendingTextPos.y/H*100)+"%", background:"#243352", border:"1px solid #3b82f6", borderRadius:8, padding:8, display:"flex", gap:6, zIndex:10 }}>
              <input autoFocus value={textInput} onChange={e=>setTextInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addText();if(e.key==="Escape")setPendingTextPos(null);}}
                placeholder="Texte..." style={{ background:"#1a2540", border:"1px solid #3d5270", borderRadius:5, padding:"4px 8px", color:"#f1f5f9", fontSize:12, fontFamily:"inherit", fontWeight:txtBold?800:400, fontStyle:txtItalic?"italic":"normal" }}/>
              <button onClick={()=>setTxtBold(v=>!v)} title="Gras"
                style={{ background:txtBold?"#1d4ed8":"#1a2540", color:txtBold?"#fff":"#94a3b8", border:"1px solid "+(txtBold?"#3b82f6":"#3d5270"), borderRadius:5, padding:"4px 9px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>B</button>
              <button onClick={()=>setTxtItalic(v=>!v)} title="Italique"
                style={{ background:txtItalic?"#1d4ed8":"#1a2540", color:txtItalic?"#fff":"#94a3b8", border:"1px solid "+(txtItalic?"#3b82f6":"#3d5270"), borderRadius:5, padding:"4px 9px", fontSize:12, fontStyle:"italic", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>I</button>
              <button onClick={()=>setTxtHighlight(v=>!v)} title="Surligner"
                style={{ background:txtHighlight?"#facc15":"#1a2540", color:txtHighlight?"#1a2540":"#94a3b8", border:"1px solid "+(txtHighlight?"#facc15":"#3d5270"), borderRadius:5, padding:"4px 9px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>S</button>
              <button onClick={addText} style={{ background:"#22c55e", color:"#fff", border:"none", borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>OK</button>
            </div>
          )}
        </div>

        {/* Selection info */}
        {selectedEl && tool==="select" && (
          <div style={{ marginTop:10, display:"flex", justifyContent:"space-between", alignItems:"center", background:"#243352", borderRadius:8, padding:"8px 14px" }}>
            <span style={{ fontSize:12, color:"#94a3b8" }}>Element selectionne</span>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
              {(()=>{ var pivote=(deg)=>setElements(prev=>prev.map(e=>e.id===selectedEl?{...e,rotation:(((e.rotation||0)+deg)%360+360)%360}:e));
                return <>
                  <button onClick={()=>pivote(-45)} title="Tourner a gauche 45" style={{ background:"#1a2540", color:"#94a3b8", border:"1px solid #3d5270", borderRadius:6, padding:"4px 9px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>↺</button>
                  <button onClick={()=>pivote(45)} title="Tourner a droite 45" style={{ background:"#1a2540", color:"#94a3b8", border:"1px solid #3d5270", borderRadius:6, padding:"4px 9px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>↻</button>
                  <button onClick={()=>pivote(90)} title="Quart de tour" style={{ background:"#1a2540", color:"#94a3b8", border:"1px solid #3d5270", borderRadius:6, padding:"4px 9px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>90°</button>
                </>;
              })()}
              <input type="range" min="0" max="359" title="Angle precis"
                value={(elements.filter(e=>e.id===selectedEl)[0]||{}).rotation||0}
                onChange={e=>{ var v=parseInt(e.target.value); setElements(prev=>prev.map(x=>x.id===selectedEl?{...x,rotation:v}:x)); }}
                style={{ width:80 }}/>
              <button onClick={()=>setElements(prev=>prev.map(e=>e.id===selectedEl?{...e,flip:!e.flip}:e))} title="Miroir / changer de sens"
                style={{ background:"#1a2540", color:"#94a3b8", border:"1px solid #3d5270", borderRadius:6, padding:"4px 9px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>⇄</button>
              <button onClick={()=>deleteElement(selectedEl)} style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444444", borderRadius:6, padding:"4px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Supprimer
              </button>
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginTop:14, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:8, padding:"9px 18px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Annuler</button>
          <button onClick={savePlan} style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Enregistrer le plan</button>
        </div>
      </div>
    </div>
  );
}


// Label complet affiche dans une pastille de poste sur le plan.
// Renvoie toujours l'identifiant complet (prefixe + numero entier), sans jamais
// couper un numero en plein milieu (ex: "DEIV47" reste "DEIV47", pas "DEIV4").
// La taille d'affichage s'adapte ensuite via posteLabelFontSize selon la longueur.
function posteLabel(id) {
  return String(id || "");
}

// Taille de police (en px) adaptee a la longueur du label, pour que les identifiants
// longs (ex: DEIV47) restent lisibles et tiennent dans la pastille sans etre tronques.
function posteLabelFontSize(label, base) {
  const len = String(label || "").length;
  if (len <= 4) return base;
  if (len === 5) return Math.max(base - 1, 6);
  if (len === 6) return Math.max(base - 2, 5);
  return Math.max(base - 3, 4);
}

function PlanImplantation({ seuilsGlobaux }) {
  const [postes, setPostes]           = useState(POSTES_INIT.map(p=>({...p})));
  const [passages, setPassages]       = useState([]);
  const [plans, setPlans]             = useState([]);
  const [posByPlan, setPosByPlan]     = useState({"plan-masse":[]});
  const posByPlanRef = React.useRef(posByPlan);
  React.useEffect(()=>{ posByPlanRef.current = posByPlan; }, [posByPlan]);
  const [prevPosByPlan, setPrevPosByPlan] = useState(null);
  const [activePlan, setActivePlan] = useState(()=>{
    try { const s = localStorage.getItem("aads_active_plan"); return s || "plan-masse"; } catch(e) { return "plan-masse"; }
  });
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [selDate, setSelDate]         = useState(null);
  const [filterNuisibleArr, setFilterNuisibleArr] = useState([]);
  const [modeColor, setModeColor]     = useState("type");
  const [zoom, setZoom]               = useState(()=>{
    try { const saved = window.localStorage && window.localStorage.getItem("aads_plan_zoom"); return saved ? parseInt(saved) : 80; } catch(e) { return 80; }
  });
  function updateZoom(newZoom) {
    setZoom(newZoom);
    try { window.localStorage && window.localStorage.setItem("aads_plan_zoom", String(newZoom)); } catch(_e) { return; }
  }
  function setActivePlanPersisted(id) {
    setActivePlan(id);
    try { localStorage.setItem("aads_active_plan", id); } catch(_e) { return; }
  }
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlanLabel, setNewPlanLabel] = useState("");
  const [newPlanImg, setNewPlanImg]   = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editingPlanLabel, setEditingPlanLabel] = useState("");
  const [hover, setHover]             = useState(null);
  const [placingPoste, setPlacingPoste] = useState("");
  const [showAddPosteMenu, setShowAddPosteMenu] = useState(false);
  const [selectedPostesToAdd, setSelectedPostesToAdd] = useState([]);
  const [movingPoste, setMovingPoste] = useState(null);
  const [showGestion, setShowGestion] = useState(false);
  const [filterYear, setFilterYear]   = useState(null);
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [editingDrawnPlan, setEditingDrawnPlan] = useState(null);
  const [planColors, setPlanColors] = useState(() => {
    try { const s = localStorage.getItem("aads_plan_colors"); return s ? JSON.parse(s) : {}; } catch(e) { return {}; }
  });
  const [editingPlanColor, setEditingPlanColor] = useState(null);
  const [showPlanActions, setShowPlanActions] = useState(false); // id du plan dont on édite la couleur
  const [nuisibleColors, setNuisibleColors] = useState(()=>{
    try { const s = localStorage.getItem("aads_nuisible_colors"); return s ? {...NUISIBLE_COLORS,...JSON.parse(s)} : {...NUISIBLE_COLORS}; } catch(e) { return {...NUISIBLE_COLORS}; }
  });
  const [editingNuisibleColor, setEditingNuisibleColor] = useState(null);
  const [posteFormes, setPosteFormes] = useState(()=>{
    try { const s = localStorage.getItem("aads_poste_formes"); return s ? {...POSTE_FORMES_DEFAUT,...JSON.parse(s)} : {...POSTE_FORMES_DEFAUT}; } catch(e) { return {...POSTE_FORMES_DEFAUT}; }
  });
  const [showFormesEditor, setShowFormesEditor] = useState(false);
  // Categories de nuisibles masquees dans les legendes et le filtre (cochees = cachees).
  const [nuisiblesMasques, setNuisiblesMasques] = useState(()=>{
    try { const s = localStorage.getItem("aads_nuisibles_masques"); return s ? JSON.parse(s) : []; } catch(e) { return []; }
  });
  function toggleNuisibleMasque(cle) {
    setNuisiblesMasques(prev=>{
      var next = prev.indexOf(cle)>=0 ? prev.filter(x=>x!==cle) : prev.concat([cle]);
      try { localStorage.setItem("aads_nuisibles_masques", JSON.stringify(next)); } catch(_e) {}
      return next;
    });
  }

  function setNuisibleColor(nuisible, color) {
    const next = {...nuisibleColors, [nuisible]: color};
    setNuisibleColors(next);
    try { localStorage.setItem("aads_nuisible_colors", JSON.stringify(next)); } catch(_e) { return; }
  }
  function setPosteForme(categorie, forme) {
    const next = {...posteFormes, [categorie]: forme};
    setPosteFormes(next);
    try { localStorage.setItem("aads_poste_formes", JSON.stringify(next)); } catch(_e) { return; }
  }
  // Rend une pastille de poste dans la forme voulue, couleur pilotee par le mode.
  // Le label est centre par-dessus. isHov agrandit legerement au survol.
  function renderPastille(forme, taille, col, labelNode, isHov) {
    var scale = isHov ? "scale(1.2)" : "scale(1)";
    var ombre = "0 2px 8px rgba(0,0,0,0.7)";
    var labelWrap = { position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" };
    if (forme === "triangle") {
      var w = taille * 1.25, h = taille * 1.1;
      return (
        <div style={{ position:"relative", width:w, height:h, transform:scale, transition:"transform 0.05s", cursor:"grab", filter:"drop-shadow("+ombre+")" }}>
          <svg width={w} height={h} viewBox="0 0 100 90" style={{ display:"block" }}>
            <polygon points="50,4 96,86 4,86" fill={col} stroke="#fff" strokeWidth="7" strokeLinejoin="round"/>
          </svg>
          <div style={{ ...labelWrap, top:"18%" }}>{labelNode}</div>
        </div>
      );
    }
    var st = { width:taille, height:taille, background:col, border:"2px solid #fff", boxShadow:ombre, display:"flex", alignItems:"center", justifyContent:"center", cursor:"grab", userSelect:"none", boxSizing:"border-box", transform:scale, transition:"transform 0.05s", position:"relative" };
    if (forme === "carre") st.borderRadius = 3;
    else if (forme === "rect") { st.width = taille * 1.5; st.height = taille * 0.75; st.borderRadius = 3; }
    else if (forme === "ovale") { st.width = taille * 1.35; st.height = taille * 0.8; st.borderRadius = "50%"; }
    else st.borderRadius = "50%";
    return <div style={st}>{labelNode}</div>;
  }

  useEffect(() => {
    sbGet("postes").then(data=>{if(data&&data.length>0)setPostes(data);}).catch(()=>{});
    sbGet("passages").then(data=>{if(data&&data.length>0){setPassages(data);setSelDate(data.sort((a,b)=>{const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0)};return pd(b.date)-pd(a.date);})[0].date);}}).catch(()=>{});
    Promise.all([
      sbGet("plans").catch(()=>[]),
      sbGet("plans_dessines").catch(()=>[]),
    ]).then(([planImgs, planDessines]) => {
      const imgPlans = (planImgs||[]).map(p=>({...p, img: p.img_url || p.img}));
      const parseEls = e => typeof e==="string" ? JSON.parse(e||"[]") : (e||[]);
      const dessines = [];
      (planDessines||[]).forEach(d=>{
        // Une ligne plans_dessines qui porte le meme id qu une ligne plans est une
        // annotation en place : on enrichit le plan existant au lieu de creer un
        // second plan, sinon poste_positions.plan_id pointerait dans le vide.
        var base = imgPlans.filter(p=>String(p.id)===String(d.id))[0];
        if (base) {
          base.dessine = true;
          base.annote = true;
          base.elements = parseEls(d.elements);
          base.backgroundImg = d.background_img || base.img;
          base.img = null; // le rendu passe par la branche SVG, sinon les annotations sont masquees
          if (d.label) base.label = d.label;
        } else {
          dessines.push({id:"dessine_"+d.id, label:d.label, img:null, dessine:true, elements: parseEls(d.elements), backgroundImg: d.background_img||null});
        }
      });
      const allPlans = [...imgPlans, ...dessines];
      if (allPlans.length > 0) {
        setPlans(allPlans);
        // Restaurer le plan actif sauvegardé, sinon prendre le premier
        try {
          const savedPlan = localStorage.getItem("aads_active_plan");
          const found = savedPlan && allPlans.find(p=>p.id===savedPlan);
          setActivePlan(found ? savedPlan : allPlans[0].id);
        } catch(_e) { setActivePlan(allPlans[0].id); }
      }
    });
    sbGet("poste_positions").then(data=>{
      if(data&&data.length>0){
        const byPlan={};
        data.forEach(d=>{if(!byPlan[d.plan_id])byPlan[d.plan_id]=[];byPlan[d.plan_id].push({id:d.poste_id||d.id,x:d.x,y:d.y});});
        setPosByPlan(prev=>({...prev,...byPlan}));
      }
    }).catch(()=>{});
  },[]);

  function getPts(planId){return posByPlan[planId]||[];}
  function setPts(planId,pts){
    setPrevPosByPlan(posByPlan);
    setPosByPlan(prev=>({...prev,[planId]:pts}));
  }

  // Get saisie for a poste on a date — fusionne tous les passages de cette date (rongeurs + DEIV)
  function getSaisie(posteId, date) {
    const passagesDate = passages.filter(p=>p.date===date);
    if (!passagesDate.length) return null;
    const merged = {};
    passagesDate.forEach(passage=>{
      const saisies = typeof passage.saisies==="string"?JSON.parse(passage.saisies||"{}"):passage.saisies||{};
      Object.entries(saisies).forEach(([id, s])=>{
        if (!merged[id]) merged[id] = {...s};
        else {
          Object.keys(s).forEach(k=>{
            if (k.startsWith("iv_")) merged[id][k] = (parseInt(merged[id][k]||0)+parseInt(s[k]||0));
            else if (!merged[id][k]) merged[id][k] = s[k];
          });
        }
      });
    });
    return merged[posteId]||null;
  }

  function getPosteColor(poste, date) {
    if (modeColor==="type") {
      const nuisible = poste.nuisible||"Rongeurs";
      if (nuisible==="Rongeurs") {
        if (poste.type==="RE") return nuisibleColors["__RE"]||"#1e40af";
        if (poste.type==="RI") return nuisibleColors["__RI"]||"#60a5fa";
        return nuisibleColors["Rongeurs"]||"#3b82f6";
      }
      return nuisibleColors[nuisible]||"#7a90aa";
    }
    if (modeColor==="zone") {
      const zoneColors = {"Extérieur":"#3b82f6","Locaux techniques":"#f59e0b","Combles / Faux-plafonds":"#8b5cf6","Emballages":"#22c55e","Conditionnement":"#ef4444","Bureaux / R&D":"#06b6d4","Maintenance":"#84cc16","Stockage":"#f97316","Autres":"#7a90aa"};
      return zoneColors[poste.macro]||"#7a90aa";
    }
    // Mode état (par défaut)
    if (!date) return "#22c55e";
    const s = getSaisie(poste.id, date);
    if (!s) return "#22c55e";
    const etat = s.etat||"";
    // Consommation appât rongeurs — seuils configurables
    const consoOrange = seuilsGlobaux?.rongeurs?.conso_orange || "25%";
    const consoRouge  = seuilsGlobaux?.rongeurs?.conso_rouge  || "75%";
    const NIVEAUX = ["25%","50%","75%","Totale","CONSOMMATION TOTALE","CONSOMMATION PARTIELLE"];
    function niveauIdx(n) {
      if (estConsoTotale(n)) return 4;
      if (n==="75%") return 3;
      if (n==="50%") return 2;
      if (n==="25%"||n==="CONSOMMATION PARTIELLE") return 1;
      return 0;
    }
    const etatIdx = niveauIdx(etat);
    if (etatIdx > 0) {
      if (etatIdx >= niveauIdx(consoRouge)) return "#ef4444";
      if (etatIdx >= niveauIdx(consoOrange)) return "#f59e0b";
      return "#22c55e";
    }
    // Captures rongeurs — avec seuils configurables selon ext/int
    const totalCap = (parseInt(s.cap_souris||0))+(parseInt(s.cap_ratBrun||0))+(parseInt(s.cap_ratNoir||0));
    if (totalCap > 0) {
      const id = poste.id || "";
      const isExt = /^RE/i.test(id);
      const isInt = /^(RI|R\d|S\d)/i.test(id) && !isExt;
      if (isExt) {
        const sl = (seuilsGlobaux?.rongeursExt?.leger) ?? 1;
        const sm = (seuilsGlobaux?.rongeursExt?.moyen) ?? 3;
        if (totalCap >= sm) return "#ef4444";
        if (totalCap >= sl) return "#f59e0b";
        return "#22c55e";
      } else if (isInt) {
        const sl = (seuilsGlobaux?.rongeursInt?.leger) ?? 1;
        const sm = (seuilsGlobaux?.rongeursInt?.moyen) ?? 3;
        if (totalCap >= sm) return "#ef4444";
        if (totalCap >= sl) return "#f59e0b";
        return "#22c55e";
      }
      return "#ef4444"; // Rongeurs sans préfixe RE/RI → rouge dès 1 capture
    }
    // Insectes volants (DEIV) — comparer aux seuils configurés
    const ivCats = ["Moucherons","Mouches","Moustiques","Hymenopteres","Lepidopteres","Coleopteres","Punaises","Tipules"];
    const ivParCat = {};
    ivCats.forEach(cat=>{ ivParCat[cat] = parseInt(s["iv_"+cat]||0); });
    const ivTotal = ivCats.reduce((acc,cat)=>acc+ivParCat[cat],0);
    if (ivTotal > 0) {
      // Vérifier si au moins une espèce dépasse son seuil
      let maxNiveau = 0; // 0=vert, 1=orange, 2=rouge
      ivCats.forEach(cat=>{
        const v = ivParCat[cat];
        if (v <= 0) return;
        const sl = (seuilsGlobaux?.iv?.[cat]?.leger) ?? (cat==="Moucherons"?350:cat==="Mouches"?150:cat==="Moustiques"?60:cat==="Hymenopteres"?50:cat==="Lepidopteres"?45:cat==="Coleopteres"?15:cat==="Punaises"?5:10);
        const sm = (seuilsGlobaux?.iv?.[cat]?.moyen) ?? (cat==="Moucherons"?500:cat==="Mouches"?250:cat==="Moustiques"?100:cat==="Hymenopteres"?100:cat==="Lepidopteres"?100:cat==="Coleopteres"?30:cat==="Punaises"?10:20);
        if (v >= sm) maxNiveau = Math.max(maxNiveau, 2);
        else if (v >= sl) maxNiveau = Math.max(maxNiveau, 1);
        // else : sous le seuil leger → vert, ne change pas maxNiveau
      });
      if (maxNiveau >= 2) return "#ef4444";
      if (maxNiveau >= 1) return "#f59e0b";
      return "#22c55e"; // Captures mais sous tous les seuils
    }
    // Valeur numérique (teignes, IPS, blattes...) — exclure les postes DEIV
    const nuisible = poste.nuisible||"Rongeurs";
    if (nuisible==="Insectes volants") return "#22c55e"; // DEIV sans capture IV → vert
    const valNum = parseFloat(etat);
    if (!isNaN(valNum) && valNum > 0) {
      const nuisible = poste.nuisible||"Rongeurs";
      // Récupérer les seuils selon le nuisible
      let seuilLeger = null;
      let seuilMoyen = null;
      if (nuisible==="Teigne"||nuisible==="Teignes") {
        seuilLeger = seuilsGlobaux?.Teignes?.leger ?? 100;
        seuilMoyen = seuilsGlobaux?.Teignes?.moyen ?? 150;
      } else if (nuisible==="IPS") {
        seuilLeger = seuilsGlobaux?.IPS?.leger ?? 3;
        seuilMoyen = seuilsGlobaux?.IPS?.moyen ?? 8;
      } else if (nuisible==="Blattes") {
        seuilLeger = seuilsGlobaux?.Blattes?.leger ?? 5;
        seuilMoyen = seuilsGlobaux?.Blattes?.moyen ?? 10;
      } else if (nuisible==="Insectes volants") {
        seuilLeger = seuilsGlobaux?.Hymenopteres?.leger ?? 350;
        seuilMoyen = seuilsGlobaux?.Hymenopteres?.moyen ?? 500;
      }
      if (seuilLeger !== null) {
        if (valNum >= seuilMoyen) return "#ef4444"; // Elevé → rouge
        if (valNum >= seuilLeger) return "#f59e0b"; // Moyen → orange
        return "#22c55e"; // Léger → vert
      }
      // Fallback si nuisible inconnu : orange dès qu'il y a une valeur
      return "#f59e0b";
    }
    return "#22c55e";
  }

  // Passage stats for a date — ne compte que les postes du type de passage
  function getPassageStats(date) {
    const passagesDate = passages.filter(p=>p.date===date);
    if (!passagesDate.length) return {tot:0,part:0,ok:0,total:0};
    // Ne compter que les postes reellement saisis ce jour la
    const idsSaisis = {};
    passagesDate.forEach(passage=>{
      let saisies = {};
      try { saisies = typeof passage.saisies==="string"?JSON.parse(passage.saisies||"{}"):(passage.saisies||{}); }
      catch(_e) { saisies = {}; }
      Object.keys(saisies).forEach(id=>{ idsSaisis[id] = true; });
    });
    let postesRelev = postes.filter(p=>idsSaisis[p.id]);
    if (postesRelev.length === 0) {
      // Repli : aucune saisie exploitable, on retombe sur le type de passage
      const hasDeiv = passagesDate.some(p=>(p.type||"")==="Insectes volants");
      const hasRongeurs = passagesDate.some(p=>(p.type||"")!=="Insectes volants");
      postesRelev = postes.filter(p=>{
        const isIV = (p.nuisible||"Rongeurs")==="Insectes volants";
        if (hasDeiv && hasRongeurs) return true;
        if (hasDeiv) return isIV;
        return !isIV;
      });
    }
    let tot=0, part=0;
    postesRelev.forEach(p=>{
      const col = getPosteColor(p, date);
      if (col==="#ef4444") tot++;
      else if (col==="#f59e0b") part++;
    });
    return {tot, part, ok:postesRelev.length-tot-part, total:postesRelev.length};
  }

  // All unique dates sorted
  const allDates = [...new Set(passages.map(p=>p.date))].sort((a,b)=>{
    const pd=d=>{const p=(d||"").split("/");return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(0)};
    return pd(a)-pd(b);
  });
  const years = [...new Set(allDates.map(d=>d.split("/")[2]).filter(Boolean))].sort((a,b)=>b-a);
  const yearsKey = years.join(",");

  // Annee affichee par defaut : l annee en cours si elle a des passages, sinon la plus recente
  useEffect(() => {
    if (filterYear === null && years.length > 0) {
      const courante = String(new Date().getFullYear());
      setFilterYear(years.indexOf(courante) !== -1 ? courante : years[0]);
    }
  }, [yearsKey]);

  const filteredDates = (filterYear===null||filterYear==="Tous")?allDates:allDates.filter(d=>d.split("/")[2]===filterYear);

  // Si la date selectionnee n appartient plus a l annee affichee, on la deselectionne
  useEffect(() => {
    if (selDate && filterYear && filterYear !== "Tous" && selDate.split("/")[2] !== filterYear) {
      setSelDate(null);
    }
  }, [filterYear]);

  const planPostes = getPts(activePlan);
  const activePlanData = plans.find(p=>p.id===activePlan);
  const filteredPostes = filterNuisibleArr.length===0 ? postes : postes.filter(p => {
    const nuisible = p.nuisible||"Rongeurs";
    const id = p.id||"";
    return filterNuisibleArr.some(f => {
      if (f === "__RE") return /^RE/i.test(id);
      if (f === "__RI") return /^(RI|R\d|S\d)/i.test(id) && !/^RE/i.test(id);
      return nuisible === f;
    });
  });

  // KPIs for selected date
  const kpi = selDate ? getPassageStats(selDate) : {tot:0, part:0, ok:postes.length, total:postes.length};

  async function handlePlanClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX-rect.left)/rect.width*100).toFixed(2);
    const yPct = ((e.clientY-rect.top)/rect.height*100).toFixed(2);
    if (movingPoste) {
      const pts = getPts(activePlan).map(pt=>pt.id===movingPoste?{...pt,x:parseFloat(xPct),y:parseFloat(yPct)}:pt);
      setPts(activePlan,pts);
      const movedId = movingPoste;
      setMovingPoste(null);
      try {
        await savePostePosition(activePlan, movedId, parseFloat(xPct), parseFloat(yPct));
      } catch(err) {
        alert("Le deplacement du poste "+movedId+" n'a pas pu etre enregistre sur le serveur ("+(err.message||err)+"). Reessayez.");
      }
      return;
    }
    if (placingPoste) {
      if (getPts(activePlan).find(pt=>pt.id===placingPoste)) return;
      const placedId = placingPoste;
      const pts = [...getPts(activePlan),{id:placedId,x:parseFloat(xPct),y:parseFloat(yPct)}];
      setPts(activePlan,pts);
      setPlacingPoste("");
      try {
        await savePostePosition(activePlan, placedId, parseFloat(xPct), parseFloat(yPct));
      } catch(err) {
        alert("Le poste "+placedId+" n'a pas pu etre enregistre sur le serveur ("+(err.message||err)+"). Reessayez de l'ajouter.");
      }
    }
  }

  function removePosteFromPlan(posteId) {
    setPts(activePlan,getPts(activePlan).filter(pt=>pt.id!==posteId));
    sbDelete("poste_positions",activePlan+"_"+posteId);
  }

  function handleAddPlan() {
    const label=newPlanLabel.trim()||("Plan "+(plans.length+1));
    const id="plan-"+Date.now();
    setPlans(prev=>[...prev,{id,label,img:newPlanImg}]);
    setPosByPlan(prev=>({...prev,[id]:[]}));
    sbUpsert("plans",{id,contrat:CLIENT_CONFIG.contrat,label,img_url:newPlanImg||""});
    setNewPlanLabel("");setNewPlanImg(null);setShowAddPlan(false);
    setActivePlanPersisted(id);
  }

  function handlePlanUpload(e) {
    const file=e.target.files[0];if(!file)return;
    const r=new FileReader();r.onload=ev=>setNewPlanImg(ev.target.result);r.readAsDataURL(file);
  }

  function deletePlan(id) {
    const plan = plans.find(p=>p.id===id);
    if(!window.confirm("Supprimer le plan \""+(plan?plan.label:id)+"\" et toutes ses pastilles ?")) return;
    setPlans(prev=>prev.filter(p=>p.id!==id));
    if (plan && plan.annote) {
      // Plan annote : une ligne plans (image) + une ligne plans_dessines (annotations).
      sbDelete("plans_dessines", id);
      sbDelete("plans", id);
    } else if (plan && plan.dessine) {
      sbDelete("plans_dessines", id.replace("dessine_",""));
    } else {
      sbDelete("plans",id);
    }
    // Supprimer aussi les positions de postes liees a ce plan
    const pts = posByPlan[id]||[];
    pts.forEach(pt=>sbDelete("poste_positions", id+"_"+pt.id));
    setPosByPlan(prev=>{ const n={...prev}; delete n[id]; return n; });
    if(activePlan===id) {
      const remaining = plans.filter(p=>p.id!==id);
      setActivePlanPersisted(remaining.length>0 ? remaining[0].id : "");
    }
  }

  function saveLabel() {
    setPlans(prev=>prev.map(p=>p.id===editingPlanId?{...p,label:editingPlanLabel}:p));
    sbUpdate("plans",editingPlanId,{label:editingPlanLabel});
    setEditingPlanId(null);
  }

  function exportPlanPdf() {
    const activePlanData2 = plans.find(p=>p.id===activePlan);
    if (!activePlanData2) { alert("Aucun plan a exporter"); return; }
    const pts = getPts(activePlan);

    // Export pour plans dessinés (sans image PNG/JPG)
    if (!activePlanData2.img && activePlanData2.dessine) {
      const svgEl = document.querySelector("#plan-export-zone svg");
      if (!svgEl) { alert("Plan introuvable"); return; }
      const svgClone = svgEl.cloneNode(true);
      svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svgClone.setAttribute("width", "900");
      svgClone.setAttribute("height", "600");

      // Ajouter pastilles au clone SVG
      pts.forEach(pt => {
        const p = postes.find(x=>x.id===pt.id);
        if (!p) return;
        if (filterNuisibleArr.length>0 && !filterNuisibleArr.some(f=>{const id=p.id||"";if(f==="__RE")return /^RE/i.test(id);if(f==="__RI")return /^(RI|R\d|S\d)/i.test(id)&&!/^RE/i.test(id);return (p.nuisible||"Rongeurs")===f;})) return;
        const col = getPosteColor(p, selDate);
        const x = (parseFloat(pt.x)/100) * 900;
        const y = (parseFloat(pt.y)/100) * 600;
        const label = posteLabel(p.id);
        const ns = "http://www.w3.org/2000/svg";
        svgClone.appendChild(svgPastilleForme(posteFormes[categorieForme(p)]||"rond", x, y, 12, col, ns));
        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", x); text.setAttribute("y", y+3); text.setAttribute("font-size", posteLabelFontSize(label,8));
        text.setAttribute("fill", "#fff"); text.setAttribute("text-anchor", "middle"); text.setAttribute("font-weight", "900");
        text.textContent = label;
        svgClone.appendChild(text);
      });

      // Légende selon mode de couleur — défini ici pour SVG et canvas
      let legends = [];
      if (modeColor==="etat") {
        legends = [["#22c55e","Sans activité"],["#f59e0b","Partielle"],["#ef4444","Totale / Capture"]];
      } else if (modeColor==="type") {
        legends = [[nuisibleColors["__RE"]||"#1e40af","Rongeurs ext. (RE)",posteFormes["RE"]||"rond","__RE"],[nuisibleColors["__RI"]||"#60a5fa","Rongeurs int. (RI)",posteFormes["RI"]||"rond","__RI"], ...NUISIBLES_LIST.filter(n=>n!=="Rongeurs").map(n=>[nuisibleColors[n]||"#7a90aa",n,posteFormes[n]||"rond",n])].filter(e=>nuisiblesMasques.indexOf(e[3])<0);
      } else if (modeColor==="zone") {
        const zoneColors = {"Exterieur":"#3b82f6","Locaux techniques":"#f59e0b","Combles":"#8b5cf6","Emballages":"#22c55e","Conditionnement":"#ef4444","Bureaux":"#06b6d4","Maintenance":"#84cc16","Stockage":"#f97316","Autres":"#7a90aa"};
        legends = Object.entries(zoneColors);
      }

      // Ajouter titre et légende dans le SVG
      const titleEl = document.createElementNS("http://www.w3.org/2000/svg","text");
      titleEl.setAttribute("x","10"); titleEl.setAttribute("y","18");
      titleEl.setAttribute("font-size","13"); titleEl.setAttribute("font-weight","bold");
      titleEl.setAttribute("fill","#0f2864"); titleEl.setAttribute("font-family","Arial,sans-serif");
      titleEl.textContent = activePlanData2.label+" - "+CLIENT_CONFIG.nom+(selDate && modeColor!=="type"?" - "+selDate:"");
      svgClone.insertBefore(titleEl, svgClone.firstChild);

      // Logo client en haut à droite dans le SVG
      if (TOQUE_LOGO) {
        const logoEl = document.createElementNS("http://www.w3.org/2000/svg","image");
        logoEl.setAttribute("href", TOQUE_LOGO);
        logoEl.setAttribute("x", 810); logoEl.setAttribute("y", 4); // 900 (largeur plan) - 90
        logoEl.setAttribute("width", "80"); logoEl.setAttribute("height", "40");
        logoEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svgClone.insertBefore(logoEl, svgClone.firstChild);
      }

      // Légende en bas du SVG
      let lx2 = 10; const legendY2 = 585;
      legends.forEach(([c,l,forme])=>{
        const ns2="http://www.w3.org/2000/svg";
        svgClone.appendChild(svgPastilleForme(forme||"rond",lx2+6,legendY2,6,c,ns2));
        const txt=document.createElementNS(ns2,"text");
        txt.setAttribute("x",lx2+16);txt.setAttribute("y",legendY2+4);
        txt.setAttribute("font-size","9");txt.setAttribute("fill","#374151");
        txt.setAttribute("font-family","Arial,sans-serif");txt.textContent=l;
        svgClone.appendChild(txt);
        lx2+=l.length*5.5+25;
      });

      const svgString = new XMLSerializer().serializeToString(svgClone);
      const w = window.open("","_blank");
      w.document.write('<html><head><title>Plan '+activePlanData2.label+'</title><style>*{margin:0;padding:0;}body{background:#fff;}@page{size:A4 landscape;margin:4mm;}@media print{svg{width:100%;height:100%;display:block;}}</style></head><body>');
      w.document.write(svgString);
      w.document.close();
      setTimeout(()=>w.print(),500);
      return;
    }

    if (!activePlanData2.img) { alert("Aucune image à exporter"); return; }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function() {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);

      // Draw plan image
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Draw pastilles
      pts.forEach(pt => {
        const p = postes.find(x=>x.id===pt.id);
        if (!p) return;
        if (filterNuisibleArr.length>0 && !filterNuisibleArr.some(f=>{const id=p.id||"";if(f==="__RE")return /^RE/i.test(id);if(f==="__RI")return /^(RI|R\d|S\d)/i.test(id)&&!/^RE/i.test(id);return (p.nuisible||"Rongeurs")===f;})) return;
        const col = getPosteColor(p, selDate);
        const x = (parseFloat(pt.x)/100) * img.width;
        const y = (parseFloat(pt.y)/100) * img.height;
        const r = 12;

        // Pastille (forme selon le type de poste)
        canvasPastilleForme(ctx, posteFormes[categorieForme(p)]||"rond", x, y, r, col);

        // Label
        const label = posteLabel(p.id);
        ctx.fillStyle = "#fff";
        ctx.font = "bold "+posteLabelFontSize(label,8)+"px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x, y);
      });

      // Legend based on modeColor
      const legendY = img.height - 30;
      let legendsC = [];
      if (modeColor==="etat") {
        legendsC = [["#22c55e","Sans activité"],["#f59e0b","Partielle"],["#ef4444","Totale / Capture"]];
      } else if (modeColor==="type") {
        legendsC = [[nuisibleColors["__RE"]||"#1e40af","Rongeurs ext.",posteFormes["RE"]||"rond","__RE"],[nuisibleColors["__RI"]||"#60a5fa","Rongeurs int.",posteFormes["RI"]||"rond","__RI"], ...NUISIBLES_LIST.filter(n=>n!=="Rongeurs").map(n=>[nuisibleColors[n]||"#7a90aa",n,posteFormes[n]||"rond",n])].filter(e=>nuisiblesMasques.indexOf(e[3])<0);
      } else if (modeColor==="zone") {
        const zoneColors = {"Exterieur":"#3b82f6","Locaux techniques":"#f59e0b","Combles":"#8b5cf6","Emballages":"#22c55e","Conditionnement":"#ef4444","Bureaux":"#06b6d4","Maintenance":"#84cc16","Stockage":"#f97316","Autres":"#7a90aa"};
        legendsC = Object.entries(zoneColors);
      }
      let lx = 10;
      ctx.font = "bold 9px sans-serif";
      legendsC.forEach(([c,l,forme]) => {
        canvasPastilleForme(ctx, forme||"rond", lx+6, legendY+8, 6, c);
        ctx.fillStyle = "#000";
        ctx.textAlign = "left";
        ctx.fillText(l, lx+16, legendY+8);
      lx += ctx.measureText(l).width + 30;
      });

      // Titre + logo client dans le canvas en haut
      ctx.fillStyle = "rgba(15,40,100,0.85)";
      ctx.fillRect(0, 0, img.width, 32);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Arial,sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(activePlanData2.label+" - "+CLIENT_CONFIG.nom+(selDate && modeColor!=="type"?" - "+selDate:""), 10, 16);

      // Open in new window — avec logo client en haut à droite via HTML
      const dataUrl = canvas.toDataURL("image/png");
      const w = window.open("","_blank");
      w.document.write('<html><head><title>Plan '+activePlanData2.label+'</title><style>*{margin:0;padding:0;}body{background:#fff;position:relative;}@page{size:A4 landscape;margin:4mm;}@media print{.logo{position:fixed;top:4mm;right:4mm;z-index:10;}img.plan{width:100%;height:100vh;object-fit:contain;display:block;}}</style></head><body>');
      if (TOQUE_LOGO) w.document.write('<img class="logo" src="'+TOQUE_LOGO+'" style="position:absolute;top:8px;right:8px;height:40px;width:auto;object-fit:contain;z-index:10;" alt="logo"/>');
      w.document.write('<img class="plan" src="'+dataUrl+'" style="width:100%;height:100vh;object-fit:contain;display:block;max-height:100vh;"/>');
      w.document.write('</body></html>');
      w.document.close();
      setTimeout(()=>w.print(),800);
    };
    img.src = activePlanData2.img;
  }

  function exportAllPlans() {
    exportPlanPdf();
  }

  return (
    <div style={{paddingBottom:40}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9",marginBottom:2}}>Plan d'implantation</div>
          <div style={{fontSize:13,color:"#7a90aa"}}>{CLIENT_CONFIG.nom} — {postes.length} postes</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={exportAllPlans}
            style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Export PDF complet
          </button>
          {prevPosByPlan && (
            <button onClick={()=>{setPosByPlan(prevPosByPlan);setPrevPosByPlan(null);}}
              style={{background:"#f59e0b22",color:"#f59e0b",border:"1px solid #f59e0b44",borderRadius:9,padding:"9px 14px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              ↩ Annuler
            </button>
          )}
          <button onClick={()=>setShowGestion(v=>!v)}
            style={{background:showGestion?"#5a7090":"#243352",color:"#fff",border:"1px solid #3d5270",borderRadius:9,padding:"9px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            Gestion des postes
          </button>
        </div>
      </div>

      {showGestion && <Card style={{marginBottom:16}}><GestionPostes postes={postes} setPostes={setPostes}/></Card>}

      {!showGestion && (
      <React.Fragment>
      {passages.length>0 && (
        <Card style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",letterSpacing:1}}>Passage affiché</div>
            <div style={{display:"flex",gap:6}}>
              {["Tous",...years].map(y=>(
                <button key={y} onClick={()=>setFilterYear(y)}
                  style={{background:filterYear===y?"#1d4ed8":"transparent",color:filterYear===y?"#fff":"#7a90aa",border:"1px solid "+(filterYear===y?"#1d4ed8":"#3d5270"),borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {filteredDates.filter(date=>{
              const passagesDate = passages.filter(p=>p.date===date);
              if (!passagesDate.length) return true;
              const hasDeiv = passagesDate.some(p=>(p.type||"")==="Insectes volants");
              const hasRongeurs = passagesDate.some(p=>(p.type||"")!=="Insectes volants");
              if (filterNuisibleArr.length === 0) return true;
              const filtreInsectesVolants = filterNuisibleArr.includes("Insectes volants");
              const filtreAutres = filterNuisibleArr.some(f=>f==="__RE"||f==="__RI"||f==="Rongeurs"||f==="Teignes"||f==="IPS"||f==="Blattes");
              if (filtreInsectesVolants && !filtreAutres) return hasDeiv;
              if (filtreAutres && !filtreInsectesVolants) return hasRongeurs;
              return true;
            }).map(date=>{
              const stats=getPassageStats(date);
              const isS=selDate===date;
              const passagesDate = passages.filter(p=>p.date===date);
              const hasDeiv = passagesDate.some(p=>(p.type||"")==="Insectes volants");
              const hasRongeurs = passagesDate.some(p=>(p.type||"")!=="Insectes volants");
              const badgeLabel = hasDeiv && hasRongeurs ? "Mix" : hasDeiv ? "DEIV" : "Rongeurs";
              const badgeColor = hasDeiv && hasRongeurs ? "#8b5cf6" : hasDeiv ? "#f59e0b" : "#3b82f6";
              return (
                <button key={date} onClick={()=>setSelDate(isS?null:date)}
                  style={{background:isS?"#1d4ed8":"#1a2540",border:"1px solid "+(isS?"#3b82f6":"#3d5270"),borderRadius:10,padding:"10px 14px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",minWidth:120}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:9,fontWeight:700,background:badgeColor+"22",color:badgeColor,border:"1px solid "+badgeColor+"44",borderRadius:4,padding:"1px 5px"}}>{badgeLabel}</span>
                    <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{date}</div>
                  </div>
                  <div style={{display:"flex",gap:6,fontSize:10}}>
                    <span style={{color:"#ef4444",fontWeight:700}}>{stats.tot} tot.</span>
                    <span style={{color:"#f59e0b",fontWeight:700}}>{stats.part} part.</span>
                    <span style={{color:"#22c55e"}}>{stats.ok} OK</span>
                    <span style={{color:"#5a7090"}}>/ {stats.total}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        <div style={{background:"#243352",borderRadius:10,padding:"14px 18px",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:900,color:"#3b82f6"}}>{selDate ? kpi.total : postes.length}</div>
          <div style={{fontSize:11,color:"#7a90aa",marginTop:2}}>{selDate ? "Postes contrôlés" : "Postes"}</div>
        </div>
        <div style={{background:"#243352",borderRadius:10,padding:"14px 18px",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:900,color:"#ef4444"}}>{kpi.tot}</div>
          <div style={{fontSize:11,color:"#7a90aa",marginTop:2}}>Conso. totale</div>
        </div>
        <div style={{background:"#243352",borderRadius:10,padding:"14px 18px",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:900,color:"#f59e0b"}}>{kpi.part}</div>
          <div style={{fontSize:11,color:"#7a90aa",marginTop:2}}>Conso. partielle</div>
        </div>
        <div style={{background:"#243352",borderRadius:10,padding:"14px 18px",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:900,color:"#22c55e"}}>{kpi.ok}</div>
          <div style={{fontSize:11,color:"#7a90aa",marginTop:2}}>Sans activité</div>
        </div>
      </div>

      {/* Mode couleur */}
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[["type","Type"],["etat","Etat"]].map(([id,label])=>(
          <button key={id} onClick={()=>setModeColor(id)}
            style={{background:modeColor===id?"#243352":"transparent",color:modeColor===id?"#f1f5f9":"#7a90aa",border:"1px solid "+(modeColor===id?"#5a7090":"#3d5270"),borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            {label}
          </button>
        ))}
      </div>

      {/* Filtre nuisible */}
      <Card style={{marginBottom:14,padding:"12px 16px"}}>
        <div style={{fontSize:10,fontWeight:700,color:"#7a90aa",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Filtrer par nuisible (selection multiple)</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setFilterNuisibleArr([])}
            style={{display:"flex",alignItems:"center",gap:6,background:filterNuisibleArr.length===0?"#fff":"transparent",color:filterNuisibleArr.length===0?"#1a2540":"#7a90aa",border:"1px solid "+(filterNuisibleArr.length===0?"#fff":"#3d5270"),borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:filterNuisibleArr.length===0?700:500,cursor:"pointer",fontFamily:"inherit"}}>
            Tous ({postes.length})
          </button>
          {/* Rongeurs Extérieurs */}
          {(()=>{
            const count = postes.filter(p=>p.id&&/^RE/i.test(p.id)).length;
            if(count===0 || nuisiblesMasques.indexOf("__RE")>=0) return null;
            const active = filterNuisibleArr.includes("__RE");
            const colRE = nuisibleColors["__RE"]||"#1e40af";
            return (
              <button key="__RE" onClick={()=>setFilterNuisibleArr(prev=>active?prev.filter(x=>x!=="__RE"):[...prev,"__RE"])}
                style={{display:"flex",alignItems:"center",gap:6,background:active?colRE+"22":"transparent",color:active?colRE:"#7a90aa",border:"1px solid "+(active?colRE:"#3d5270"),borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:active?700:500,cursor:"pointer",fontFamily:"inherit"}}>
                <PuceForme forme={posteFormes["RE"]||"rond"} col={colRE} taille={9}/>
                Rongeurs ext. ({count})
              </button>
            );
          })()}
          {/* Rongeurs Intérieurs */}
          {(()=>{
            const count = postes.filter(p=>p.id&&/^(RI|R\d|S\d)/i.test(p.id)&&!/^RE/i.test(p.id)).length;
            if(count===0 || nuisiblesMasques.indexOf("__RI")>=0) return null;
            const active = filterNuisibleArr.includes("__RI");
            const colRI = nuisibleColors["__RI"]||"#60a5fa";
            return (
              <button key="__RI" onClick={()=>setFilterNuisibleArr(prev=>active?prev.filter(x=>x!=="__RI"):[...prev,"__RI"])}
                style={{display:"flex",alignItems:"center",gap:6,background:active?colRI+"22":"transparent",color:active?colRI:"#7a90aa",border:"1px solid "+(active?colRI:"#3d5270"),borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:active?700:500,cursor:"pointer",fontFamily:"inherit"}}>
                <PuceForme forme={posteFormes["RI"]||"rond"} col={colRI} taille={9}/>
                Rongeurs int. ({count})
              </button>
            );
          })()}
          {NUISIBLES_LIST.map(n=>{
            if (nuisiblesMasques.indexOf(n)>=0) return null;
            const col=nuisibleColors[n]||"#7a90aa";
            const active=filterNuisibleArr.includes(n);
            const count=postes.filter(p=>(p.nuisible||"Rongeurs")===n).length;
            return (
              <button key={n} onClick={()=>setFilterNuisibleArr(prev=>active?prev.filter(x=>x!==n):[...prev,n])}
                style={{display:"flex",alignItems:"center",gap:6,background:active?"#fff":"transparent",color:active?"#1a2540":"#7a90aa",border:"1px solid "+(active?"#fff":"#3d5270"),borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:active?700:500,cursor:"pointer",fontFamily:"inherit"}}>
                <PuceForme forme={posteFormes[n==="Rongeurs"?"RI":n]||"rond"} col={col} taille={9}/>
                {n+" ("+count+")"}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Plan card */}
      <div style={{background:"#243352",border:"1px solid #3d5270",borderRadius:12,overflow:"hidden"}}>
        {/* Onglets plans - nouvelle barre horizontale */}
        <div style={{padding:"10px 14px 0",borderBottom:"1px solid #3d5270",background:"#1a2540"}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,flexWrap:"wrap"}}>
            {plans.map((pl,idx)=>{
              const isActive = activePlan===pl.id;
              return (
                <div key={pl.id} style={{position:"relative"}}>
                  {editingPlanId===pl.id ? (
                    <div style={{display:"flex",gap:4,padding:"6px 8px",background:"#243352",borderRadius:"8px 8px 0 0",border:"1px solid #3b82f6",borderBottom:"none"}}>
                      <input value={editingPlanLabel} onChange={e=>setEditingPlanLabel(e.target.value)}
                        style={{background:"#1a2540",border:"1px solid #3b82f6",borderRadius:5,padding:"3px 8px",color:"#f1f5f9",fontSize:12,fontFamily:"inherit",width:140}}/>
                      <button onClick={saveLabel} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:5,padding:"3px 8px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>OK</button>
                      <button onClick={()=>setEditingPlanId(null)} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:5,padding:"3px 6px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                    </div>
                  ) : (
                    <div onClick={()=>{ if(isActive){ setShowPlanActions(v=>!v); } else { setActivePlanPersisted(pl.id); setShowPlanActions(true); } }}
                      style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",cursor:"pointer",background:isActive?"#243352":"transparent",borderRadius:"8px 8px 0 0",borderTop:isActive?"2px solid #3b82f6":"2px solid transparent",borderLeft:"1px solid "+(isActive?"#3d5270":"transparent"),borderRight:"1px solid "+(isActive?"#3d5270":"transparent"),borderBottom:"none",marginBottom:isActive?-1:0,transition:"all 0.15s"}}>
                      <span style={{fontSize:14,fontWeight:isActive?700:500,color:isActive?"#f1f5f9":"#7a90aa",whiteSpace:"nowrap"}}>{pl.label}</span>
                      {isActive && <span style={{fontSize:10,color:"#5a7090"}}>{showPlanActions?"▲":"▼"}</span>}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={()=>setShowAddPlan(v=>!v)}
              style={{display:"flex",alignItems:"center",gap:4,padding:"8px 14px",background:"transparent",border:"none",borderRadius:"8px 8px 0 0",color:"#22c55e",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              <span style={{fontSize:18,lineHeight:1}}>+</span> Plan image
            </button>
            <button onClick={()=>{setEditingDrawnPlan(null);setShowPlanEditor(true);}}
              style={{display:"flex",alignItems:"center",gap:4,padding:"8px 14px",background:"transparent",border:"none",borderRadius:"8px 8px 0 0",color:"#8b5cf6",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              <span style={{fontSize:18,lineHeight:1}}>+</span> Plan dessiné
            </button>
          </div>
        </div>

        {/* Barre d'actions — visible seulement si showPlanActions */}
        {/* Barre zoom — toujours visible */}
        <div style={{padding:"6px 14px",borderBottom:"1px solid #3d5270",background:"#1a2540",display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>updateZoom(Math.max(40,zoom-10))} style={{background:"#243352",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:5,padding:"3px 10px",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>−</button>
          <span style={{fontSize:11,color:"#7a90aa",minWidth:38,textAlign:"center"}}>{zoom}%</span>
          <button onClick={()=>updateZoom(Math.min(150,zoom+10))} style={{background:"#243352",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:5,padding:"3px 10px",fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>+</button>
          <button onClick={()=>updateZoom(80)} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:5,padding:"3px 8px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>↺</button>
        </div>

        {activePlan && showPlanActions && (          <div style={{padding:"10px 14px",borderBottom:"1px solid #3d5270",background:"#243352",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>

            {/* Renommer */}
            <button onClick={()=>{setEditingPlanId(activePlan);setEditingPlanLabel(plans.find(p=>p.id===activePlan)?.label||"");}}
              style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:6,padding:"4px 9px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              Renommer
            </button>

            {/* + Ajouter des postes */}
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowAddPosteMenu(v=>!v)}
                style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,fontFamily:"inherit",cursor:"pointer",fontWeight:700}}>
                + Ajouter postes {selectedPostesToAdd.length>0?"("+selectedPostesToAdd.length+")":""}
              </button>
              {showAddPosteMenu && (
                <div style={{position:"absolute",top:"110%",left:0,zIndex:200,background:"#1a2540",border:"1px solid #3d5270",borderRadius:10,padding:12,width:260,maxHeight:320,overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
                  <div style={{fontSize:11,fontWeight:700,color:"#7a90aa",marginBottom:8}}>Sélectionner les postes :</div>
                  {filteredPostes.filter(p=>!getPts(activePlan).find(pt=>pt.id===p.id)).length===0
                    ? <div style={{fontSize:11,color:"#5a7090",textAlign:"center",padding:10}}>Tous les postes sont déjà sur ce plan.</div>
                    : filteredPostes.filter(p=>!getPts(activePlan).find(pt=>pt.id===p.id)).map(p=>(
                      <label key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",cursor:"pointer",fontSize:11,color:selectedPostesToAdd.includes(p.id)?"#3b82f6":"#cbd5e1"}}>
                        <input type="checkbox" checked={selectedPostesToAdd.includes(p.id)} onChange={e=>{setSelectedPostesToAdd(prev=>e.target.checked?[...prev,p.id]:prev.filter(x=>x!==p.id));}} style={{accentColor:"#3b82f6"}}/>
                        <span style={{fontFamily:"monospace",fontWeight:700,color:"#f59e0b"}}>{p.id}</span>
                        <span style={{color:"#7a90aa",fontSize:10}}>{(p.zone||"").slice(0,25)}</span>
                      </label>
                  ))}
                  <div style={{display:"flex",gap:6,marginTop:10}}>
                    <button onClick={async ()=>{
                      if(selectedPostesToAdd.length===0){setShowAddPosteMenu(false);return;}
                      const newPts = [...getPts(activePlan)];
                      const failed = [];
                      // Empiles en colonne serree en haut a gauche : chacun decale vers
                      // le bas pour rester attrapable. Au-dela de la hauteur du plan on
                      // repart sur une colonne a droite. A l utilisateur de les distribuer.
                      const pasY = 3.2, parCol = 28;
                      for (let i=0; i<selectedPostesToAdd.length; i++) {
                        const id = selectedPostesToAdd[i];
                        const colonne = Math.floor(i/parCol), rang = i%parCol;
                        const x = parseFloat((4 + colonne*5).toFixed(2));
                        const y = parseFloat((4 + rang*pasY).toFixed(2));
                        newPts.push({id, x, y});
                        try { await savePostePosition(activePlan, id, x, y); }
                        catch(e) { failed.push({id, message: e.message||String(e)}); }
                      }
                      setPrevPosByPlan(posByPlan); setPts(activePlan, newPts);
                      setSelectedPostesToAdd([]); setShowAddPosteMenu(false);
                      if (failed.length > 0) alert("Attention : "+failed.length+" poste(s) non enregistres :\n"+failed.map(f=>f.id).join(", "));
                    }} style={{flex:1,background:"#22c55e",color:"#fff",border:"none",borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      Ajouter {selectedPostesToAdd.length>0?"("+selectedPostesToAdd.length+")":""}
                    </button>
                    <button onClick={()=>{setShowAddPosteMenu(false);setSelectedPostesToAdd([]);}}
                      style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:6,padding:"6px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* + Tous les postes */}
            <button onClick={async ()=>{
              const nonPlaces = filteredPostes.filter(p=>!getPts(activePlan).find(pt=>pt.id===p.id));
              if(nonPlaces.length===0) return;
              const cols = Math.ceil(Math.sqrt(nonPlaces.length));
              const newPts = [...getPts(activePlan)];
              const failed = [];
              for (let i=0; i<nonPlaces.length; i++) {
                const p = nonPlaces[i];
                const col = i%cols, row = Math.floor(i/cols);
                const x = parseFloat((5 + col*(90/cols)).toFixed(2));
                const y = parseFloat((5 + row*(90/Math.ceil(nonPlaces.length/cols))).toFixed(2));
                newPts.push({id:p.id, x, y});
                try { await savePostePosition(activePlan, p.id, x, y); }
                catch(e) { failed.push({id:p.id, message:e.message||String(e)}); }
              }
              setPrevPosByPlan(posByPlan); setPts(activePlan, newPts);
              if (failed.length > 0) alert("Attention : "+failed.length+" poste(s) non enregistres.");
            }} style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              + Tous les postes
            </button>

            {/* Supprimer tous les postes */}
            <button onClick={()=>{
              const pts = getPts(activePlan);
              if(pts.length===0) return;
              if(!window.confirm("Supprimer toutes les pastilles de ce plan ?")) return;
              setPrevPosByPlan(posByPlan);
              pts.forEach(pt=>sbDelete("poste_positions", activePlan+"_"+pt.id));
              setPts(activePlan, []);
            }} style={{background:"#ef444411",color:"#ef4444",border:"1px solid #ef444433",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Supp. postes
            </button>

            {/* Export PDF */}
            <button onClick={exportPlanPdf}
              style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Export PDF
            </button>

            {/* Effacer */}
            <button onClick={()=>setPts(activePlan,[])}
              style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              Effacer
            </button>

            {/* Annoter */}
            <button onClick={()=>{
              const activePlanData = plans.find(p=>p.id===activePlan);
              if (!activePlanData) return;
              const fond = activePlanData.backgroundImg || activePlanData.img || null;
              if (String(activePlan).indexOf("dessine_") === 0) {
                // Plan dessine autonome : sa ligne plans_dessines porte l id sans le
                // prefixe. Le renvoyer prefixe creerait une ligne neuve, donc un doublon.
                setEditingDrawnPlan({
                  id: String(activePlan).replace("dessine_",""),
                  label: activePlanData.label,
                  elements: activePlanData.elements || [],
                  backgroundImg: fond,
                });
              } else {
                // Annotation en place d un plan image : meme id, les pastilles restent
                // rattachees, et on rouvre avec les annotations deja posees.
                setEditingDrawnPlan({
                  id: activePlan,
                  label: activePlanData.label,
                  elements: activePlanData.elements || [],
                  backgroundImg: fond,
                  __overwriteImgPlan: activePlan,
                });
              }
              setShowPlanEditor(true);
            }}
              style={{background:"transparent",color:"#f59e0b",border:"1px solid #3d5270",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Annoter
            </button>

            {/* Dupliquer */}
            <button onClick={async ()=>{
              const activePlanData = plans.find(p=>p.id===activePlan);
              if(!activePlanData) return;
              const newId = (activePlanData.dessine?"dessine_":"plan-")+Date.now();
              const newLabel = activePlanData.label+" (copie)";
              if (activePlanData.dessine) {
                const cleanId = newId.replace("dessine_","");
                await sbUpsert("plans_dessines", {id:cleanId, contrat:CLIENT_CONFIG.contrat, label:newLabel, elements:JSON.stringify(activePlanData.elements||[]), background_img:activePlanData.backgroundImg||""});
                setPlans(prev=>[...prev, {id:newId, label:newLabel, img:null, dessine:true, elements:activePlanData.elements, backgroundImg:activePlanData.backgroundImg}]);
              } else {
                await sbUpsert("plans", {id:newId, contrat:CLIENT_CONFIG.contrat, label:newLabel, img_url:activePlanData.img||""});
                setPlans(prev=>[...prev, {id:newId, label:newLabel, img:activePlanData.img}]);
              }
              getPts(activePlan).forEach(pt=>{ sbUpsert("poste_positions",{id:newId+"_"+pt.id, poste_id:pt.id, plan_id:newId, x:pt.x, y:pt.y, contrat:CLIENT_CONFIG.contrat}); });
              setPts(newId, [...getPts(activePlan)]);
              setActivePlanPersisted(newId);
            }} style={{background:"#8b5cf622",color:"#8b5cf6",border:"1px solid #8b5cf644",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              Dupliquer
            </button>

            {/* Modifier le dessin (plans dessinés) */}
            {plans.find(p=>p.id===activePlan)?.dessine && !plans.find(p=>p.id===activePlan)?.annote && (
              <button onClick={()=>{
                const activePlanData = plans.find(p=>p.id===activePlan);
                const original = activePlanData.id.replace("dessine_","");
                setEditingDrawnPlan({id:original, label:activePlanData.label, elements:activePlanData.elements, backgroundImg:activePlanData.backgroundImg||null});
                setShowPlanEditor(true);
              }} style={{background:"#8b5cf622",color:"#8b5cf6",border:"1px solid #8b5cf644",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                Modifier le dessin
              </button>
            )}

            {/* Zoom — déplacé sous les onglets */}

            {/* Supprimer le plan */}
            <button onClick={()=>deletePlan(activePlan)} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              ✕ Supprimer
            </button>
          </div>
        )}

        {showPlanEditor && (
          <PlanEditor
            existingPlan={editingDrawnPlan}
            backgroundImg={editingDrawnPlan
              ? (editingDrawnPlan.backgroundImg || null)
              : (activePlanData && activePlanData.img && !activePlanData.dessine ? activePlanData.img : null)}
            onClose={()=>{setShowPlanEditor(false);setEditingDrawnPlan(null);}}
            onSaved={(saved)=>{
              const overwriteId = editingDrawnPlan && editingDrawnPlan.__overwriteImgPlan;
              if (overwriteId) {
                // Annotation en place. La ligne plans est conservee : elle porte l image
                // et l id auquel poste_positions se rattache. PlanEditor a deja ecrit la
                // ligne plans_dessines sous ce meme id, il n y a rien a upserter ici.
                const fond = saved.backgroundImg || (activePlanData && activePlanData.img) || null;
                const updatedPlan = {id: overwriteId, label: saved.label, img: null, dessine: true, annote: true, elements: saved.elements, backgroundImg: fond};
                setPlans(prev=>prev.map(p=>p.id===overwriteId?updatedPlan:p));
                setActivePlanPersisted(overwriteId);
              } else {
                const newPlan = {id:"dessine_"+saved.id, label:saved.label, img:null, dessine:true, elements:saved.elements, backgroundImg:saved.backgroundImg};
                setPlans(prev=>{
                  const exists = prev.find(p=>p.id===newPlan.id);
                  if (exists) return prev.map(p=>p.id===newPlan.id?newPlan:p);
                  return [...prev, newPlan];
                });
                setActivePlanPersisted(newPlan.id);
              }
            }}
          />
        )}

        {showAddPlan && (
          <div style={{padding:"10px 14px",borderBottom:"1px solid #3d5270",background:"#1a2540",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <input value={newPlanLabel} onChange={e=>setNewPlanLabel(e.target.value)} placeholder="Nom du plan"
              style={{background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"5px 10px",color:"#f1f5f9",fontSize:11,fontFamily:"inherit",flex:1,minWidth:120}}/>
            <label style={{background:"#243352",border:"1px solid #3d5270",borderRadius:6,padding:"5px 10px",fontSize:11,color:"#7a90aa",cursor:"pointer"}}>
              {newPlanImg?"✓ Image":"+ Image"}
              <input type="file" accept="image/*" style={{display:"none"}} onChange={handlePlanUpload}/>
            </label>
            <button onClick={handleAddPlan} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Ajouter</button>
            <button onClick={()=>setShowAddPlan(false)} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:7,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Annuler</button>
          </div>
        )}

        {placingPoste && (
          <div style={{padding:"8px 14px",background:"#1d4ed822",borderBottom:"1px solid #3b82f644"}}>
            <span style={{fontSize:12,color:"#3b82f6",fontWeight:700}}>→ Cliquez sur le plan pour placer le poste {placingPoste}</span>
            <button onClick={()=>setPlacingPoste("")} style={{background:"transparent",color:"#7a90aa",border:"none",fontSize:11,cursor:"pointer",marginLeft:12}}>Annuler</button>
          </div>
        )}
        {movingPoste && (
          <div style={{padding:"8px 14px",background:"#f59e0b22",borderBottom:"1px solid #f59e0b44"}}>
            <span style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>→ Cliquez sur le plan pour déplacer le poste {movingPoste}</span>
            <button onClick={()=>setMovingPoste(null)} style={{background:"transparent",color:"#7a90aa",border:"none",fontSize:11,cursor:"pointer",marginLeft:12}}>Annuler</button>
          </div>
        )}

        {/* Vue galerie - tous les plans empiles */}
        {showAllPlans ? (
          <div style={{padding:16}}>
            {plans.map(plan=>{
              const pts = posByPlan[plan.id]||[];
              return (
                <div key={plan.id} style={{marginBottom:24}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
                    {plan.label}
                    <span style={{fontSize:10,color:"#7a90aa",fontWeight:400}}>({pts.length} postes)</span>
                    <button onClick={()=>{setActivePlanPersisted(plan.id);setShowAllPlans(false);}} style={{marginLeft:"auto",background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Ouvrir / Editer</button>
                    <button onClick={()=>deletePlan(plan.id)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Supprimer</button>
                  </div>
                  <div style={{position:"relative",background:"#fff",borderRadius:8,overflow:"hidden"}}>
                    {plan.img
                      ? <img src={plan.img} alt={plan.label} style={{width:"100%",display:"block"}}/>
                      : plan.dessine
                      ? <svg viewBox="0 0 900 600" style={{width:"100%",display:"block",background:"#fff"}}>
                          {plan.backgroundImg && <image href={plan.backgroundImg} x="0" y="0" width="900" height="600" preserveAspectRatio="xMidYMid meet"/>}
                          {(plan.elements||[]).filter(el=>el.type!=="__grille").map(el=>{
                            if (el.type==="trait") return <line key={el.id} transform={transformElGlobal(el)} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/>;
                            if (el.type==="rect") { const x=Math.min(el.x1,el.x2),y=Math.min(el.y1,el.y2),w=Math.abs(el.x2-el.x1),h=Math.abs(el.y2-el.y1); return <rect key={el.id} transform={transformElGlobal(el)} x={x} y={y} width={w} height={h} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>; }
                            if (el.type==="cercle") { const cx=(el.x1+el.x2)/2,cy=(el.y1+el.y2)/2,rx=Math.abs(el.x2-el.x1)/2,ry=Math.abs(el.y2-el.y1)/2; return <ellipse key={el.id} transform={transformElGlobal(el)} cx={cx} cy={cy} rx={rx} ry={ry} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>; }
                            if (el.type==="triangle") { const x1=el.x1,y1=el.y2,x2=el.x2,y2=el.y2,x3=(el.x1+el.x2)/2,y3=el.y1; return <polygon key={el.id} transform={transformElGlobal(el)} points={x1+","+y1+" "+x2+","+y2+" "+x3+","+y3} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>; }
                            if (el.type==="fleche") { const angle=Math.atan2(el.y2-el.y1,el.x2-el.x1); const len=14; const ax1=el.x2-len*Math.cos(angle-Math.PI/6),ay1=el.y2-len*Math.sin(angle-Math.PI/6); const ax2=el.x2-len*Math.cos(angle+Math.PI/6),ay2=el.y2-len*Math.sin(angle+Math.PI/6); return (<g key={el.id}><line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/><line x1={el.x2} y1={el.y2} x2={ax1} y2={ay1} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/><line x1={el.x2} y1={el.y2} x2={ax2} y2={ay2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/></g>); }
                            if (el.type==="polygone") { const pts2=(el.points||[]).map(p=>p.x+","+p.y).join(" "); return <polygon key={el.id} transform={transformElGlobal(el)} points={pts2} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>; }
                            if (el.type==="porte") { const x=Math.min(el.x1,el.x2),y=Math.min(el.y1,el.y2),w=Math.abs(el.x2-el.x1)||40; return (<g key={el.id} transform={transformElGlobal(el)}><line x1={x} y1={y} x2={x} y2={y+w} stroke={el.color} strokeWidth={el.strokeWidth}/><path d={"M "+x+" "+y+" A "+w+" "+w+" 0 0 1 "+(x+w)+" "+y} fill="none" stroke={el.color} strokeWidth="1" strokeDasharray="3,3"/><line x1={x} y1={y} x2={x+w} y2={y} stroke={el.color} strokeWidth={el.strokeWidth}/></g>); }
                            if (el.type==="fenetre") { const x=Math.min(el.x1,el.x2),y=Math.min(el.y1,el.y2),w=Math.abs(el.x2-el.x1)||40,h=Math.abs(el.y2-el.y1)||10; return (<g key={el.id} transform={transformElGlobal(el)}><rect x={x} y={y} width={w} height={h} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/><line x1={x} y1={y+h/2} x2={x+w} y2={y+h/2} stroke={el.color} strokeWidth={el.strokeWidth}/></g>); } if (el.type==="escalier") { const x=Math.min(el.x1,el.x2),y=Math.min(el.y1,el.y2),w=Math.abs(el.x2-el.x1)||60,h=Math.abs(el.y2-el.y1)||40; return (<g key={el.id} transform={transformElGlobal(el)}><rect x={x} y={y} width={w} height={h} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>{[1,2,3].map(i=>(<line key={i} x1={x} y1={y+i*h/4} x2={x+w} y2={y+i*h/4} stroke={el.color} strokeWidth={el.strokeWidth}/>))}</g>); } if (el.type==="porte_biais") return <line key={el.id} transform={transformElGlobal(el)} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/>;
                            if (el.type==="texte") return renderTexteSVG(el, null);
                            return null;
                          })}
                        </svg>
                      : <div style={{width:"100%",height:200,display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",fontSize:13}}>Aucune image</div>
                    }
                    {pts.map(pt=>{
                      const p = postes.find(x=>x.id===pt.id);
                      if (!p) return null;
                      const col = getPosteColor(p, selDate);
                      const label = posteLabel(p.id);
                      return (
                        <div key={pt.id} style={{position:"absolute",left:pt.x+"%",top:pt.y+"%",transform:"translate(-50%,-50%)",width:18,height:18,borderRadius:"50%",background:col,border:"1.5px solid #fff",boxShadow:"0 1px 4px rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:posteLabelFontSize(label,6),fontWeight:900,color:"#fff"}}>
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
        <>
        {/* Plan image */}
        <div style={{overflowX:"auto",overflowY:"visible"}}>
          <div id="plan-export-zone"
            style={{position:"relative",width:zoom+"%",minWidth:600,cursor:placingPoste||movingPoste?"crosshair":"default"}}
            onClick={handlePlanClick}>
            {activePlanData&&activePlanData.img
              ? <img src={activePlanData.img} alt={(activePlanData&&activePlanData.label)} style={{width:"100%",display:"block",userSelect:"none"}} draggable={false}/>
              : activePlanData&&activePlanData.dessine
              ? <svg viewBox="0 0 900 600" style={{width:"100%",display:"block",background:"#fff"}}>
                  {activePlanData.backgroundImg && <image href={activePlanData.backgroundImg} x="0" y="0" width="900" height="600" preserveAspectRatio="xMidYMid meet"/>}
                  {(activePlanData.elements||[]).filter(el=>el.type!=="__grille").map(el=>{
                    if (el.type==="trait") return <line key={el.id} transform={transformElGlobal(el)} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/>;
                    if (el.type==="rect") { const x=Math.min(el.x1,el.x2),y=Math.min(el.y1,el.y2),w=Math.abs(el.x2-el.x1),h=Math.abs(el.y2-el.y1); return <rect key={el.id} transform={transformElGlobal(el)} x={x} y={y} width={w} height={h} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>; }
                    if (el.type==="cercle") { const cx=(el.x1+el.x2)/2,cy=(el.y1+el.y2)/2,rx=Math.abs(el.x2-el.x1)/2,ry=Math.abs(el.y2-el.y1)/2; return <ellipse key={el.id} transform={transformElGlobal(el)} cx={cx} cy={cy} rx={rx} ry={ry} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>; }
                    if (el.type==="triangle") { const x1=el.x1,y1=el.y2,x2=el.x2,y2=el.y2,x3=(el.x1+el.x2)/2,y3=el.y1; return <polygon key={el.id} transform={transformElGlobal(el)} points={x1+","+y1+" "+x2+","+y2+" "+x3+","+y3} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>; }
                    if (el.type==="fleche") { const angle=Math.atan2(el.y2-el.y1,el.x2-el.x1); const len=14; const ax1=el.x2-len*Math.cos(angle-Math.PI/6),ay1=el.y2-len*Math.sin(angle-Math.PI/6); const ax2=el.x2-len*Math.cos(angle+Math.PI/6),ay2=el.y2-len*Math.sin(angle+Math.PI/6); return (<g key={el.id}><line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/><line x1={el.x2} y1={el.y2} x2={ax1} y2={ay1} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/><line x1={el.x2} y1={el.y2} x2={ax2} y2={ay2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/></g>); }
                    if (el.type==="polygone") { const pts=(el.points||[]).map(p=>p.x+","+p.y).join(" "); return <polygon key={el.id} transform={transformElGlobal(el)} points={pts} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>; }
                    if (el.type==="porte") { const x=Math.min(el.x1,el.x2),y=Math.min(el.y1,el.y2),w=Math.abs(el.x2-el.x1)||40; return (<g key={el.id} transform={transformElGlobal(el)}><line x1={x} y1={y} x2={x} y2={y+w} stroke={el.color} strokeWidth={el.strokeWidth}/><path d={"M "+x+" "+y+" A "+w+" "+w+" 0 0 1 "+(x+w)+" "+y} fill="none" stroke={el.color} strokeWidth="1" strokeDasharray="3,3"/><line x1={x} y1={y} x2={x+w} y2={y} stroke={el.color} strokeWidth={el.strokeWidth}/></g>); }
                    if (el.type==="fenetre") { const x=Math.min(el.x1,el.x2),y=Math.min(el.y1,el.y2),w=Math.abs(el.x2-el.x1)||40,h=Math.abs(el.y2-el.y1)||10; return (<g key={el.id} transform={transformElGlobal(el)}><rect x={x} y={y} width={w} height={h} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/><line x1={x} y1={y+h/2} x2={x+w} y2={y+h/2} stroke={el.color} strokeWidth={el.strokeWidth}/></g>); } if (el.type==="escalier") { const x=Math.min(el.x1,el.x2),y=Math.min(el.y1,el.y2),w=Math.abs(el.x2-el.x1)||60,h=Math.abs(el.y2-el.y1)||40; return (<g key={el.id} transform={transformElGlobal(el)}><rect x={x} y={y} width={w} height={h} fill={(el.filled?el.color:"none")} stroke={el.color} strokeWidth={el.strokeWidth}/>{[1,2,3].map(i=>(<line key={i} x1={x} y1={y+i*h/4} x2={x+w} y2={y+i*h/4} stroke={el.color} strokeWidth={el.strokeWidth}/>))}</g>); } if (el.type==="porte_biais") return <line key={el.id} transform={transformElGlobal(el)} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.color} strokeWidth={el.strokeWidth} strokeLinecap="round"/>;
                    if (el.type==="texte") return renderTexteSVG(el, null);
                    return null;
                  })}
                </svg>
              : <div style={{width:"100%",height:400,background:"#1a2540",display:"flex",alignItems:"center",justifyContent:"center",color:"#5a7090",fontSize:14}}>Aucune image — ajoutez un plan</div>
            }
            {/* Pastilles */}
            {planPostes.map(pt=>{
              const p=postes.find(p=>p.id===pt.id);
              if(!p)return null;
              if(filterNuisibleArr.length>0&&!filterNuisibleArr.some(f=>{const id=p.id||"";if(f==="__RE")return /^RE/i.test(id);if(f==="__RI")return /^(RI|R\d|S\d)/i.test(id)&&!/^RE/i.test(id);return (p.nuisible||"Rongeurs")===f;}))return null;
              const col=getPosteColor(p,selDate);
              const isHov=hover===pt.id;
              const isMov=movingPoste===pt.id;
              return (
                <div key={pt.id}
                  style={{position:"absolute",left:pt.x+"%",top:pt.y+"%",transform:"translate(-50%,-50%)",zIndex:10}}
                  onMouseDown={e=>{
                    e.stopPropagation();
                    e.preventDefault();
                    if(placingPoste) return;
                    const planEl = document.getElementById("plan-export-zone");
                    if(!planEl) return;
                    const onMove = ev => {
                      const rect = planEl.getBoundingClientRect();
                      const xPct = Math.max(0,Math.min(100,((ev.clientX-rect.left)/rect.width*100))).toFixed(2);
                      const yPct = Math.max(0,Math.min(100,((ev.clientY-rect.top)/rect.height*100))).toFixed(2);
                      setPts(activePlan, getPts(activePlan).map(p=>p.id===pt.id?{...p,x:parseFloat(xPct),y:parseFloat(yPct)}:p));
                    };
                    const onUp = ev => {
                      document.removeEventListener("mousemove", onMove);
                      document.removeEventListener("mouseup", onUp);
                      const rect = planEl.getBoundingClientRect();
                      const xPct = Math.max(0,Math.min(100,((ev.clientX-rect.left)/rect.width*100))).toFixed(2);
                      const yPct = Math.max(0,Math.min(100,((ev.clientY-rect.top)/rect.height*100))).toFixed(2);
                      const currentPts = (posByPlanRef.current[activePlan]||[]).map(p=>p.id===pt.id?{...p,x:parseFloat(xPct),y:parseFloat(yPct)}:p);
                      setPts(activePlan, currentPts);
                      savePostePosition(activePlan, pt.id, parseFloat(xPct), parseFloat(yPct))
                        .catch(err => alert("Le deplacement du poste "+pt.id+" n'a pas pu etre enregistre sur le serveur ("+(err.message||err)+"). Reessayez."));
                    };
                    document.addEventListener("mousemove", onMove);
                    document.addEventListener("mouseup", onUp);
                  }}
                  onTouchStart={e=>{
                    e.stopPropagation();
                    if(placingPoste) return;
                    const planEl = document.getElementById("plan-export-zone");
                    if(!planEl) return;
                    const onTouchMove = ev => {
                      ev.preventDefault();
                      const touch = ev.touches[0];
                      const rect = planEl.getBoundingClientRect();
                      const xPct = Math.max(0,Math.min(100,((touch.clientX-rect.left)/rect.width*100))).toFixed(2);
                      const yPct = Math.max(0,Math.min(100,((touch.clientY-rect.top)/rect.height*100))).toFixed(2);
                      setPts(activePlan, getPts(activePlan).map(p=>p.id===pt.id?{...p,x:parseFloat(xPct),y:parseFloat(yPct)}:p));
                    };
                    const onTouchEnd = ev => {
                      document.removeEventListener("touchmove", onTouchMove);
                      document.removeEventListener("touchend", onTouchEnd);
                      const touch = ev.changedTouches[0];
                      const rect = planEl.getBoundingClientRect();
                      const xPct = Math.max(0,Math.min(100,((touch.clientX-rect.left)/rect.width*100))).toFixed(2);
                      const yPct = Math.max(0,Math.min(100,((touch.clientY-rect.top)/rect.height*100))).toFixed(2);
                      const currentPts = (posByPlanRef.current[activePlan]||[]).map(p=>p.id===pt.id?{...p,x:parseFloat(xPct),y:parseFloat(yPct)}:p);
                      setPts(activePlan, currentPts);
                      savePostePosition(activePlan, pt.id, parseFloat(xPct), parseFloat(yPct))
                        .catch(err => alert("Le deplacement du poste "+pt.id+" n'a pas pu etre enregistre."));
                    };
                    document.addEventListener("touchmove", onTouchMove, { passive: false });
                    document.addEventListener("touchend", onTouchEnd);
                  }}
                  onContextMenu={e=>{e.preventDefault();e.stopPropagation();removePosteFromPlan(pt.id);}}
                  onMouseEnter={()=>setHover(pt.id)} onMouseLeave={()=>setHover(null)}>
                  {renderPastille(
                    posteFormes[categorieForme(p)] || "rond", 22, col,
                    <span style={{fontSize:posteLabelFontSize(pt.id,7),fontWeight:900,color:"#fff",textShadow:"0 1px 2px rgba(0,0,0,0.6)"}}>{posteLabel(pt.id)}</span>,
                    isHov
                  )}
                  {isHov&&(
                    <div style={{position:"absolute",left:"50%",top:-38,transform:"translateX(-50%)",background:"#243352",border:"1px solid "+col,borderRadius:7,padding:"4px 10px",fontSize:10,color:"#f1f5f9",whiteSpace:"nowrap",zIndex:20,boxShadow:"0 2px 8px rgba(0,0,0,0.5)"}}>
                      <strong>{pt.id}</strong> — {(p.zone||"").slice(0,25)}
                      <button onClick={e=>{e.stopPropagation();removePosteFromPlan(pt.id);}}
                        style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:3,padding:"0 5px",fontSize:9,cursor:"pointer",marginLeft:6}}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </>
        )}
      </div>

      {/* Légende */}
      <div style={{marginTop:12,display:"flex",flexWrap:"wrap",gap:10,alignItems:"center"}}>
        {modeColor==="etat"&&(
          <>
            {[["#22c55e","Sans activité"],["#f59e0b","Partielle"],["#ef4444","Totale / Capture"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:c,display:"inline-block"}}/>
                <span style={{fontSize:11,color:"#7a90aa"}}>{l}</span>
              </div>
            ))}
          </>
        )}
        {modeColor==="type"&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            {nuisiblesMasques.indexOf("__RE")<0 && <div style={{display:"flex",alignItems:"center",gap:5}}><PuceForme forme={posteFormes["RE"]||"rond"} col={nuisibleColors["__RE"]||"#1e40af"}/><span style={{fontSize:11,color:"#7a90aa"}}>Rongeurs ext. (RE)</span></div>}
            {nuisiblesMasques.indexOf("__RI")<0 && <div style={{display:"flex",alignItems:"center",gap:5}}><PuceForme forme={posteFormes["RI"]||"rond"} col={nuisibleColors["__RI"]||"#60a5fa"}/><span style={{fontSize:11,color:"#7a90aa"}}>Rongeurs int. (RI)</span></div>}
            {NUISIBLES_LIST.filter(n=>n!=="Rongeurs" && nuisiblesMasques.indexOf(n)<0).map(n=>{
              const col=nuisibleColors[n]||"#7a90aa";
              const count=postes.filter(p=>(p.nuisible||"Rongeurs")===n).length;
              const formeN = posteFormes[n==="Rongeurs"?"RI":n]||"rond";
              return(<div key={n} style={{display:"flex",alignItems:"center",gap:5}}><PuceForme forme={formeN} col={col}/><span style={{fontSize:11,color:"#7a90aa"}}>{n} ({count})</span></div>);
            })}
          </div>
        )}
        <button onClick={()=>setShowFormesEditor(v=>!v)} title="Choisir la forme des pastilles par type de poste"
          style={{ marginLeft:"auto", background:showFormesEditor?"#1d4ed8":"#243352", color:showFormesEditor?"#fff":"#94a3b8", border:"1px solid "+(showFormesEditor?"#3b82f6":"#3d5270"), borderRadius:7, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          Gestion des pastilles
        </button>
      </div>

      {showFormesEditor && (
        <div style={{ marginTop:10, background:"#243352", border:"1px solid #3d5270", borderRadius:10, padding:14 }}>
          <div style={{ fontSize:12, color:"#94a3b8", fontWeight:700, marginBottom:10 }}>Gestion des pastilles — forme, couleur (en mode Type), et affichage dans les legendes</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[["RE","Rongeurs exterieurs (RE)"],["RI","Rongeurs interieurs (RI)"],["Blattes","Blattes"],["Insectes volants","Insectes volants"],["Teignes","Teignes"],["IPS","IPS"]].map(([cat,lib])=>(
              <div key={cat} style={{ display:"flex", alignItems:"center", gap:10 }}>
                {(()=>{ var cleM = cat==="RE"?"__RE":cat==="RI"?"__RI":cat; var masque = nuisiblesMasques.indexOf(cleM)>=0;
                  return <button onClick={()=>toggleNuisibleMasque(cleM)} title={masque?"Masque dans les legendes et le filtre":"Affiche"}
                    style={{ width:26, height:20, borderRadius:5, border:"1px solid "+(masque?"#3d5270":"#3b82f6"), background:masque?"#1a2540":"#1d4ed8", color:masque?"#5a7090":"#fff", fontSize:11, cursor:"pointer", fontFamily:"inherit", padding:0 }}>{masque?"○":"●"}</button>;
                })()}
                <span style={{ fontSize:11, color: (nuisiblesMasques.indexOf(cat==="RE"?"__RE":cat==="RI"?"__RI":cat)>=0?"#5a7090":"#cbd5e1"), width:164, textDecoration:(nuisiblesMasques.indexOf(cat==="RE"?"__RE":cat==="RI"?"__RI":cat)>=0?"line-through":"none") }}>{lib}</span>
                <div style={{ display:"flex", gap:3, marginRight:4 }}>
                  {["#1e40af","#3b82f6","#60a5fa","#06b6d4","#22c55e","#84cc16","#eab308","#f59e0b","#f97316","#ef4444","#dc2626","#ec4899","#8b5cf6","#7c3aed","#7a90aa","#475569","#000000"].map(c=>{
                    var cle = cat==="RE"?"__RE":cat==="RI"?"__RI":cat;
                    var actifC = (nuisibleColors[cle]||"")===c;
                    return <button key={c} title="Couleur de ce type" onClick={()=>setNuisibleColor(cle,c)}
                      style={{ width:18, height:18, borderRadius:"50%", background:c, border:actifC?"3px solid #fff":"1px solid #3d5270", cursor:"pointer", padding:0 }}/>;
                  })}
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  {FORMES_DISPO.map(f=>{
                    var actif = (posteFormes[cat]||"rond")===f;
                    return <button key={f} onClick={()=>setPosteForme(cat,f)}
                      style={{ display:"flex", alignItems:"center", gap:5, background:actif?"#1d4ed8":"#1a2540", color:actif?"#fff":"#94a3b8", border:"1px solid "+(actif?"#3b82f6":"#3d5270"), borderRadius:6, padding:"4px 10px", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                      <span style={{ display:"inline-block", background:actif?"#fff":"#94a3b8",
                        width: f==="ovale"?14:f==="rect"?16:11, height: f==="ovale"?9:f==="rect"?8:11,
                        borderRadius: (f==="rond"||f==="ovale")?"50%":(f==="carre"||f==="rect")?2:0,
                        clipPath: f==="triangle"?"polygon(50% 0, 100% 100%, 0 100%)":"none" }}/>
                      {f==="rond"?"Rond":f==="carre"?"Carre":f==="rect"?"Rectangle":f==="ovale"?"Ovale":"Triangle"}
                    </button>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </React.Fragment>
      )}
    </div>
  );
}

// ============================================================
// GRAPHES — AUDIT INTERNE 3D
// ============================================================
function AuditScoreEvolutionChart({ audits }) {
  const [collapsed, setCollapsed] = usePersistedCollapsed("AuditScoreEvolution", false);
  const [fullscreen, setFullscreen] = useState(false);

  const pd = d => { if(!d) return new Date(0); const p=(d||"").split("/"); return p.length===3?new Date(p[2]+"-"+p[1]+"-"+p[0]):new Date(d); };
  const sorted = audits.slice().sort((a,b)=>pd(a.date)-pd(b.date));
  const isEmpty = sorted.length === 0;

  const W = fullscreen ? 1100 : 700, H = fullscreen ? 420 : 260, PAD = 50;
  function xPos(i) { return PAD + (sorted.length > 1 ? i/(sorted.length-1)*(W-PAD*2) : (W-PAD*2)/2); }
  function yPos(v) { return H - PAD - (v/100)*(H-PAD*2); }
  const y85 = yPos(85), y60 = yPos(60);

  function exportThisChart() {
    if (isEmpty) { exportChartCard("Évolution du score d'audit", "<p style='color:#9ca3af'>Aucune donnee disponible.</p>"); return; }
    const rows = sorted.map(a=>"<tr><td>"+a.date+"</td><td style='font-weight:700;color:"+scoreColorStatic(a.score||0)+"'>"+(a.score||0)+"%</td><td>"+(a.statut||"")+"</td><td>"+(a.auditeur||"")+"</td></tr>").join("");
    exportChartCard("Évolution du score d'audit", "<table style='width:100%;border-collapse:collapse'><thead><tr><th style='padding:6px 10px;border:1px solid #e5e7eb'>Date</th><th style='padding:6px 10px;border:1px solid #e5e7eb'>Score</th><th style='padding:6px 10px;border:1px solid #e5e7eb'>Statut</th><th style='padding:6px 10px;border:1px solid #e5e7eb'>Auditeur</th></tr></thead><tbody>"+rows+"</tbody></table>");
  }

  const bodyJsx = isEmpty ? (
    <div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:12}}>Aucun audit enregistre.</div>
  ) : (
    <div style={{overflowX:"auto"}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",maxWidth:W,display:"block"}}>
        {[0,25,50,75,100].map(v=>(<g key={v}><line x1={PAD} x2={W-PAD} y1={yPos(v)} y2={yPos(v)} stroke="#2d3f62" strokeWidth="1"/><text x={PAD-4} y={yPos(v)+4} fontSize="9" fill="#5a7090" textAnchor="end">{v}%</text></g>))}
        <line x1={PAD} x2={W-PAD} y1={y85} y2={y85} stroke="#22c55e" strokeDasharray="5,3" strokeWidth="1.5"/>
        <text x={W-PAD+4} y={y85+4} fontSize="9" fill="#22c55e">Conforme</text>
        <line x1={PAD} x2={W-PAD} y1={y60} y2={y60} stroke="#f59e0b" strokeDasharray="5,3" strokeWidth="1.5"/>
        <text x={W-PAD+4} y={y60+4} fontSize="9" fill="#f59e0b">Partiel</text>
        {sorted.length>1 && <polyline points={sorted.map((a,i)=>xPos(i)+","+yPos(a.score||0)).join(" ")} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round"/>}
        {sorted.map((a,i)=>{
          const col = scoreColorStatic(a.score||0);
          return (
            <g key={i}>
              <circle cx={xPos(i)} cy={yPos(a.score||0)} r="5" fill={col} stroke="#1a2540" strokeWidth="2"/>
              <text x={xPos(i)} y={yPos(a.score||0)-10} fontSize="9" fill="#94a3b8" textAnchor="middle">{a.score||0}%</text>
              <text x={xPos(i)} y={H-8} fontSize="8" fill="#5a7090" textAnchor="middle" transform={"rotate(-30 "+xPos(i)+" "+(H-8)+")"}>{(a.date||"").slice(0,5)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );

  return (
    <>
    {fullscreen && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}
        onClick={()=>setFullscreen(false)}>
        <div style={{maxWidth:1200,width:"100%",maxHeight:"95vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <Card style={{marginBottom:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9"}}>Évolution du score d'audit</div>
              <div style={{display:"flex",gap:8}}>
                <ChartExportBtn onClick={exportThisChart}/>
                <button onClick={()=>setFullscreen(false)} style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444444",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X Fermer</button>
              </div>
            </div>
            {bodyJsx}
          </Card>
        </div>
      </div>
    )}
    {!collapsed && (
    <Card style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>Évolution du score d'audit</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setCollapsed(true)} title="Masquer le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            − Masquer
          </button>
          <button onClick={()=>setFullscreen(true)} title="Agrandir le graphique"
            style={{background:"#243352",color:"#94a3b8",border:"1px solid #3d5270",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            ⛶ Agrandir
          </button>
          <ChartExportBtn onClick={exportThisChart}/>
        </div>
      </div>
      {bodyJsx}
    </Card>
    )}
    {collapsed && (
      <div onClick={()=>setCollapsed(false)} style={{background:"#243352",border:"1px solid #3d5270",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:12,color:"#94a3b8"}}>Évolution du score d'audit - masqué</span>
        <span style={{fontSize:11,color:"#3b82f6",fontWeight:700}}>+ Afficher</span>
      </div>
    )}
    </>
  );
}

function scoreColorStatic(s) { return s>=85?"#22c55e":s>=60?"#f59e0b":"#ef4444"; }

function AuditStatutPieChart({ audits }) {
  const counts = { "Conforme":0, "Partiel":0, "Non conforme":0 };
  audits.forEach(a => { if (counts[a.statut] !== undefined) counts[a.statut]++; });
  const SCOL = { "Conforme":"#22c55e", "Partiel":"#f59e0b", "Non conforme":"#ef4444" };
  const data = Object.entries(counts).map(([s,c])=>({label:s, value:c, color:SCOL[s]}));
  return <PieChart data={data} title="Audits - Répartition par statut" chartKey="AuditStatut"/>;
}

function AuditScoreParSectionChart({ audits, grille }) {
  const NOTES = { "Conforme": 2, "Partiel": 1, "Non conforme": 0, "Non applicable": null };
  const data = grille.filter(s => s.items.length > 0).map(section => {
    let total = 0, max = 0;
    audits.forEach(a => {
      const rep = a.reponses || {};
      section.items.forEach(item => {
        const v = rep[item.id];
        if (v && v !== "Non applicable") { max += 2; total += NOTES[v]||0; }
      });
    });
    const score = max > 0 ? Math.round(total/max*100) : 0;
    return { label: section.section, value: score };
  });
  return <BarChartHorizontal title="Score moyen par section" chartKey="AuditScoreParSection" color="#3b82f6" data={data}/>;
}

function AuditObservationsParZoneChart({ audits }) {
  const counts = {};
  audits.forEach(a => {
    (a.obsItems||[]).forEach(o => {
      const z = o.zone && o.zone.trim() ? o.zone.trim() : "Zone non precisee";
      counts[z] = (counts[z]||0) + 1;
    });
  });
  const data = Object.entries(counts).map(([label,value])=>({label,value}));
  return <BarChartHorizontal title="Observations par zone" chartKey="AuditObsParZone" color="#ef4444" data={data}/>;
}

// ============================================================
function Audit({ seuilsGlobaux }) {
  const TECHNICIENS = useTechniciens();

  const GRILLE = [
    {
      section: "Postes de contrôle",
      items: [
        { id:"p1", label:"Tous les postes sont présents et accessibles" },
        { id:"p2", label:"Les postes sont en bon état (non abimés)" },
        { id:"p3", label:"Les postes sont correctement appâtés" },
        { id:"p4", label:"Les postes sont clairement identifiés (numérotation)" },
        { id:"p5", label:"Les postes extérieurs sont sécurisés (verrouillés)" },
        { id:"p6", label:"Aucun poste disparu non remplacé" },
        { id:"p7", label:"Tous les postes sont attachés" },
      ]
    },
    {
      section: "Passages et fréquence",
      items: [
        { id:"f1", label:"Les passages sont effectués aux fréquences contractuelles" },
        { id:"f2", label:"Les dates de passage sont respectées" },
        { id:"f3", label:"Les rapports de passage sont disponibles" },
        { id:"f4", label:"Les réinterventions ont été réalisées dans les délais" },
        { id:"f5", label:"Les seuils d'alerte sont paramétrés et respectés" },
      ]
    },
    {
      section: "Documents et traçabilité",
      items: [
        { id:"d1", label:"Les habilitations techniciens sont à jour" },
        { id:"d2", label:"Les agréments et certifications sont valides" },
        { id:"d3", label:"Les fiches techniques et FDS des produits sont disponibles" },
        { id:"d4", label:"Les numéros AMM des produits utilisés sont conformes" },
        { id:"d5", label:"Le plan d'implantation est à jour" },
        { id:"d6", label:"La conformité IFS Food est documentée" },
      ]
    },
    {
      section: "Produits biocides",
      items: [
        { id:"b1", label:"Les produits utilisés sont autorisés (AMM valide)" },
        { id:"b2", label:"Les produits sont stockés correctement" },
        { id:"b3", label:"Les rotations de molécules sont respectées" },
        { id:"b4", label:"Les doses utilisées sont conformes aux préconisations" },
      ]
    },
    {
      section: "Actions correctives",
      items: [
        { id:"a1", label:"Les actions correctives sont documentées dans le plan d'actions" },
        { id:"a2", label:"Les actions en cours sont suivies avec échéances" },
        { id:"a3", label:"Les actions résolues ont été vérifiées" },
        { id:"a4", label:"Aucune action critique sans suivi" },
      ]
    },
    {
      section: "Hygiène et environnement",
      items: [
        { id:"h1", label:"Le site est propre et ne favorise pas les nuisibles" },
        { id:"h2", label:"Les entrées et accès sont étanchéifiés" },
        { id:"h3", label:"Pas de stockage de denrées favorisant les nuisibles" },
        { id:"h4", label:"La gestion des déchets est conforme" },
        { id:"h5", label:"Aucun signe d'activité de nuisibles non signalé" },
      ]
    },
    {
      section: "Observations",
      items: []
    },
  ];

  const NOTES = { "Conforme": 2, "Partiel": 1, "Non conforme": 0, "Non applicable": null };
  const NOTE_COL = { "Conforme": "#22c55e", "Partiel": "#f59e0b", "Non conforme": "#ef4444", "Non applicable": "#7a90aa" };

  const [audits, setAudits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ date:"", auditeur:"", observations:"" });
  const [obsItems, setObsItems] = useState([]); // observations dynamiques
  const [reponses, setReponses] = useState({});
  const [editId, setEditId] = useState(null);
  const [sel, setSel] = useState(null);
  const [actionsStatuts, setActionsStatuts] = useState({}); // { actionId: statut } pour le badge de suivi
  const [creatingAction, setCreatingAction] = useState(null); // id de l'observation en cours de creation

  useEffect(() => {
    sbGet("audits").then(data => {
      if (data && data.length > 0) {
        setAudits(data.map(a => ({ ...a, reponses: typeof a.reponses==="string"?JSON.parse(a.reponses||"{}"):a.reponses||{}, obsItems: typeof a.obs_items==="string"?JSON.parse(a.obs_items||"[]"):a.obs_items||[] })));
      }
    }).catch(()=>{});
    sbGet("plan_actions").then(data => {
      if (data && data.length > 0) {
        const map = {};
        data.forEach(a => { map[a.id] = a.statut || "Planifiée"; });
        setActionsStatuts(map);
      }
    }).catch(()=>{});
  }, []);

  // Cree une action dans Plan d'actions a partir d'une observation d'un audit DEJA enregistre, et lie les deux.
  async function creerActionDepuisObservation(audit, obs) {
    if (obs.actionId || creatingAction === obs.id) return;
    setCreatingAction(obs.id);
    const actionId = "audit_" + audit.id + "_" + obs.id;
    const dateFmt = audit.date || new Date().toLocaleDateString("fr-FR");
    const PRIORITE_MAP = { haute:"haute", moyenne:"moyenne", basse:"basse" };
    const priorite = PRIORITE_MAP[obs.priorite] || "moyenne";
    try {
      await sbUpsertStrict("plan_actions", {
        id: actionId, contrat: CLIENT_CONFIG.contrat,
        titre5m: "Méthode", type: "corrective", priorite,
        zone: obs.zone || "",
        description: obs.description || "",
        recommandation: obs.action || "",
        technicien: audit.auditeur || "",
        piege_ref: "",
        statut: "Planifiée",
        date_detection: dateFmt,
        photos: JSON.stringify(obs.photos || []),
      });
      setActionsStatuts(prev => ({ ...prev, [actionId]: "Planifiée" }));
      const updatedObsItems = (audit.obsItems || []).map(o => o.id === obs.id ? { ...o, actionId } : o);
      setAudits(prev => prev.map(a => a.id === audit.id ? { ...a, obsItems: updatedObsItems } : a));
      await sbUpdate("audits", audit.id, { obs_items: JSON.stringify(updatedObsItems) });
    } catch (err) {
      alert("La creation de l'action a echoue (" + (err.message||err) + "). Reessayez.");
    } finally {
      setCreatingAction(null);
    }
  }


  function calcScore(rep, obs) {
    let total = 0, max = 0;
    GRILLE.forEach(s => s.items.forEach(item => {
      const v = rep[item.id];
      if (v && v !== "Non applicable") {
        max += 2;
        total += NOTES[v]||0;
      }
    }));
    // Chaque observation compte comme un critère non conforme ou partiel
    (obs||[]).forEach(o => {
      if (o.statut) {
        max += 2;
        total += o.statut === "Partiel" ? 1 : 0; // Non conforme = 0, Partiel = 1
      }
    });
    return max > 0 ? Math.round(total/max*100) : 0;
  }

  function scoreColor(s) { return s>=85?"#22c55e":s>=60?"#f59e0b":"#ef4444"; }

  function resetForm() {
    setDraft({date:"",auditeur:"",observations:""});
    setReponses({});
    setObsItems([]);
    setEditId(null);
  }

  function openEdit(a) {
    setDraft({date:a.date||"",auditeur:a.auditeur||"",observations:a.observations||""});
    setReponses(a.reponses||{});
    setObsItems(a.obsItems||[]);
    setEditId(a.id);
    setShowForm(true);
  }

  function save() {
    if (!draft.date) return;
    const dateFmt = draft.date.includes("-")?draft.date.split("-").reverse().join("/"):draft.date;
    const score = calcScore(reponses, obsItems);
    const total = Object.values(reponses).filter(v=>v&&v!=="Non applicable").length;
    const conformes = Object.values(reponses).filter(v=>v==="Conforme").length;
    const seuilConforme = seuilsGlobaux?.audit?.conforme ?? 85;
    const seuilPartiel  = seuilsGlobaux?.audit?.partiel  ?? 60;
    const statut = score>=seuilConforme?"Conforme":score>=seuilPartiel?"Partiel":"Non conforme";
    if (editId) {
      const updated = {...audits.find(a=>a.id===editId), date:dateFmt, auditeur:draft.auditeur, observations:draft.observations, reponses, obsItems, score, statut};
      setAudits(prev=>prev.map(a=>a.id===editId?updated:a));
      sbUpdate("audits", editId, {date:dateFmt, auditeur:draft.auditeur, observations:draft.observations, reponses:JSON.stringify(reponses), score, statut, obs_items:JSON.stringify(obsItems)});
    } else {
      const id = String(Date.now());
      const newAudit = {id, contrat:CLIENT_CONFIG.contrat, date:dateFmt, auditeur:draft.auditeur, observations:draft.observations, reponses, obsItems, score, statut};
      setAudits(prev=>[newAudit,...prev]);
      const auditData = {
        id, contrat:CLIENT_CONFIG.contrat, date:dateFmt,
        auditeur:draft.auditeur, observations:draft.observations,
        reponses:JSON.stringify(reponses),
        obs_items:JSON.stringify(obsItems),
        score, statut
      };
      if (navigator.onLine) {
        sbUpsert("audits", auditData).catch(e=>console.error("Audit save error:", e));
      } else {
        savePendingSaisie({ id:"pending_audit_"+id, data:auditData, table:"audits" }).then(()=>{
          if (window.__setPendingCount) getPendingSaisies().then(p=>window.__setPendingCount(p.length)).catch(()=>{});
          alert("Audit sauvegardé localement. Il sera synchronisé dès que vous serez en ligne.");
        }).catch(()=>{});
      }
    }
    resetForm(); setShowForm(false);
  }

  function exportAudit(a) {
    const photosRows = GRILLE.map(s => {
      const itemRows = s.items.map(item => {
        const v = a.reponses[item.id]||"Non évalué";
        const col = NOTE_COL[v]||"#7a90aa";
        return "<tr><td style='padding:6px 10px;border:1px solid #e5e7eb'>"+item.label+"</td><td style='padding:6px 10px;border:1px solid #e5e7eb;font-weight:700;color:"+col+";text-align:center'>"+v+"</td></tr>";
      }).join("");
      return "<tr><td colspan='2' style='background:#f3f4f6;font-weight:700;padding:8px 10px;border:1px solid #e5e7eb'>"+s.section+"</td></tr>"+itemRows;
    }).join("");

    const scoreCol = scoreColor(a.score||0);

    const conclusionHtml = a.observations
      ? "<div style='margin-top:16px'><strong>Conclusion :</strong><p style='color:#374151;margin-top:6px'>"+a.observations+"</p></div>"
      : "";

    const obsHtml = (a.obsItems||[]).length > 0
      ? "<div style='margin-top:20px'><h2 style='color:#0f2864;border-bottom:2px solid #0f2864;padding-bottom:6px'>Observations</h2>" +
        (a.obsItems||[]).map(function(obs, i) {
          const statCol = obs.statut==="Non conforme" ? "#ef4444" : "#f59e0b";
          const PCOL = { haute:"#ef4444", moyenne:"#f59e0b", basse:"#3b82f6" };
          const prioHtml = obs.priorite ? "<span style='font-weight:700;color:"+(PCOL[obs.priorite]||"#6b7280")+";margin-left:10px;text-transform:uppercase;font-size:11px'>"+obs.priorite+"</span>" : "";
          const descHtml = obs.description ? "<p style='margin:4px 0;color:#374151'><strong>Description :</strong> "+obs.description+"</p>" : "";
          const actHtml = obs.action ? "<p style='margin:4px 0;color:#374151'><strong>Action corrective :</strong> "+obs.action+"</p>" : "";
          const picsHtml = (obs.photos||[]).length > 0
            ? "<div style='margin-top:8px'>"+(obs.photos||[]).map(function(p){ return "<img src=\""+p.url+"\" style=\"max-width:150px;max-height:120px;border-radius:5px;margin:3px;object-fit:cover;border:1px solid #e5e7eb\"/>"; }).join("")+"</div>"
            : "";
          return "<div style='margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;padding:12px'><div style='display:flex;justify-content:space-between;margin-bottom:8px'><strong>Observation "+(i+1)+" - "+(obs.zone||"Zone non précisée")+"</strong><span><span style='font-weight:700;color:"+statCol+"'>"+(obs.statut||"")+"</span>"+prioHtml+"</span></div>"+descHtml+actHtml+picsHtml+"</div>";
        }).join("") + "</div>"
      : "";

    exportHTML("Audit interne 3D - "+CLIENT_CONFIG.nom,
      "<h1>Audit interne 3D</h1>" +
      "<p style='color:#6b7280;margin-bottom:16px'>"+CLIENT_CONFIG.nom+" - "+a.date+"</p>" +
      "<div style='display:flex;gap:24px;margin-bottom:20px;flex-wrap:wrap'>" +
        "<div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 20px;text-align:center'>" +
          "<div style='font-size:32px;font-weight:900;color:"+scoreCol+"'>"+(a.score||0)+"%</div>" +
          "<div style='font-size:12px;color:#6b7280'>Score global</div>" +
        "</div>" +
        "<div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 20px'>" +
          "<div style='font-size:13px;font-weight:700;color:"+scoreCol+"'>"+(a.statut||"")+"</div>" +
          "<div style='font-size:11px;color:#6b7280;margin-top:4px'>Auditeur : "+(a.auditeur||"-")+"</div>" +
        "</div>" +
      "</div>" +
      "<table style='width:100%;border-collapse:collapse;margin-bottom:16px'>"+photosRows+"</table>" +
      conclusionHtml +
      obsHtml
    );
  }

  const allItems = GRILLE.reduce(function(acc, s){ return acc.concat(s.items); }, []);

  return (
    <div style={{paddingBottom:40}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:22,fontWeight:800,color:"#f1f5f9",marginBottom:2}}>Audit interne 3D</div>
          <div style={{fontSize:13,color:"#7a90aa"}}>{audits.length} audit(s) - {allItems.length} critères évalués</div>
        </div>
        <button onClick={()=>{resetForm();setShowForm(v=>!v);}}
          style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          + Nouvel audit
        </button>
      </div>

      <div style={{background:"#1e3a5f22",border:"1px solid #3b82f633",borderRadius:12,padding:"12px 18px",marginBottom:20,display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{fontSize:20}}>📋</span>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#3b82f6",marginBottom:4}}>Audit interne 3D — Contrôle qualité du dispositif de lutte antiparasitaire</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Vérification périodique de la conformité du dispositif 3D : état des postes, fréquence des passages, produits biocides, documents réglementaires et actions correctives. Conforme au référentiel IFS Food v8 section 4.14 et aux exigences de traçabilité du plan de lutte intégrée.</div>
        </div>
      </div>

      {showForm && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:"#f1f5f9",marginBottom:14}}>{editId?"Modifier l'audit":"Nouvel audit interne 3D"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:16}}>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Date *</label>
              <input type="date" value={draft.date} onChange={e=>setDraft(p=>({...p,date:e.target.value}))} style={inp()}/>
            </div>
            <div>
              <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Auditeur</label>
              <select value={draft.auditeur} onChange={e=>setDraft(p=>({...p,auditeur:e.target.value}))} style={inp()}>
                <option value="">--</option>
                {TECHNICIENS.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Grille d'audit */}
          {GRILLE.map(section=>(
            <div key={section.section} style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",letterSpacing:1,marginBottom:8,borderLeft:"3px solid #3b82f6",paddingLeft:8}}>
                {section.section}
              </div>
              {section.items.map(item=>{
                const val = reponses[item.id]||"";
                return (
                  <div key={item.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #243352",gap:10,flexWrap:"wrap"}}>
                    <div style={{fontSize:12,color:"#f1f5f9",flex:1}}>{item.label}</div>
                    <div style={{display:"flex",gap:4}}>
                      {Object.keys(NOTES).map(opt=>{
                        const active=val===opt;
                        const col=NOTE_COL[opt];
                        return (
                          <button key={opt} onClick={()=>setReponses(p=>({...p,[item.id]:active?"":opt}))}
                            style={{background:active?col+"33":"#1a2540",color:active?col:"#5a7090",border:"1px solid "+(active?col:"#3d5270"),borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Score en temps réel */}
          {(() => {
            const score = calcScore(reponses, obsItems);
            const col = scoreColor(score);
            const evaluated = Object.keys(reponses).filter(k=>reponses[k]&&reponses[k]!=="Non applicable").length;
            return (
              <div style={{background:"#1a2540",borderRadius:10,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:16}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:28,fontWeight:900,color:col}}>{score}%</div>
                  <div style={{fontSize:10,color:"#7a90aa"}}>Score</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{background:"#243352",borderRadius:20,height:10,overflow:"hidden"}}>
                    <div style={{background:col,width:score+"%",height:"100%",borderRadius:20,transition:"width 0.3s"}}/>
                  </div>
                  <div style={{fontSize:11,color:"#7a90aa",marginTop:4}}>{evaluated}/{allItems.length} critères évalués</div>
                </div>
              </div>
            );
          })()}

          {/* Section Observations dynamiques */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",letterSpacing:1,marginBottom:10,borderLeft:"3px solid #3b82f6",paddingLeft:8}}>
              Observations
            </div>
            {obsItems.map((obs,idx)=>(
              <div key={obs.id} style={{background:"#1a2540",borderRadius:10,padding:"12px 14px",marginBottom:10,border:"1px solid #3d5270"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#7a90aa"}}>Observation {idx+1}</span>
                  <button onClick={()=>setObsItems(prev=>prev.filter(o=>o.id!==obs.id))}
                    style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>X</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:8}}>
                  <div>
                    <label style={{fontSize:9,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:2}}>Zone</label>
                    <input value={obs.zone||""} onChange={e=>setObsItems(prev=>prev.map(o=>o.id===obs.id?{...o,zone:e.target.value}:o))} placeholder="Zone concernée" style={inp()}/>
                  </div>
                  <div>
                    <label style={{fontSize:9,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:2}}>Statut</label>
                    <div style={{display:"flex",gap:5}}>
                      {["Partiel","Non conforme"].map(s=>{
                        const active=obs.statut===s;
                        const col=s==="Partiel"?"#f59e0b":"#ef4444";
                        return <button key={s} onClick={()=>setObsItems(prev=>prev.map(o=>o.id===obs.id?{...o,statut:s}:o))}
                          style={{background:active?col+"33":"#243352",color:active?col:"#7a90aa",border:"1px solid "+(active?col:"#3d5270"),borderRadius:6,padding:"3px 10px",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                          {s}
                        </button>;
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={{fontSize:9,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:2}}>Priorité</label>
                    <div style={{display:"flex",gap:5}}>
                      {["haute","moyenne","basse"].map(p=>{
                        const active=obs.priorite===p;
                        const col=p==="haute"?"#ef4444":p==="moyenne"?"#f59e0b":"#3b82f6";
                        const label=p.charAt(0).toUpperCase()+p.slice(1);
                        return <button key={p} onClick={()=>setObsItems(prev=>prev.map(o=>o.id===obs.id?{...o,priorite:p}:o))}
                          style={{background:active?col+"33":"#243352",color:active?col:"#7a90aa",border:"1px solid "+(active?col:"#3d5270"),borderRadius:6,padding:"3px 10px",fontSize:10,fontWeight:active?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                          {label}
                        </button>;
                      })}
                    </div>
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:9,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:2}}>Description</label>
                  <textarea rows={2} value={obs.description||""} onChange={e=>setObsItems(prev=>prev.map(o=>o.id===obs.id?{...o,description:e.target.value}:o))} style={{...inp(),resize:"vertical"}}/>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:9,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:2}}>Action corrective</label>
                  <textarea rows={2} value={obs.action||""} onChange={e=>setObsItems(prev=>prev.map(o=>o.id===obs.id?{...o,action:e.target.value}:o))} style={{...inp(),resize:"vertical"}}/>
                </div>
                <div>
                  <label style={{fontSize:9,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:4}}>Photos ({(obs.photos||[]).length})</label>
                  <label style={{background:"#243352",border:"1px dashed #3d5270",borderRadius:7,padding:"5px 12px",fontSize:10,color:"#7a90aa",cursor:"pointer"}}>
                    + Ajouter photos
                    <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}} onChange={e=>{
                      Array.from(e.target.files).forEach(file=>{
                        const r=new FileReader();
                        r.onload=ev=>setObsItems(prev=>prev.map(o=>o.id===obs.id?{...o,photos:[...(o.photos||[]),{url:ev.target.result,name:file.name}]}:o));
                        r.readAsDataURL(file);
                      });
                    }}/>
                  </label>
                    {(obs.photos||[]).length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>
                      {(obs.photos||[]).map((ph,j)=>(
                        <div key={j} style={{position:"relative"}}>
                          <img src={ph.url} style={{width:55,height:55,objectFit:"cover",borderRadius:5,border:"1px solid #3d5270"}}/>
                          <button onClick={()=>setObsItems(prev=>prev.map(o=>o.id===obs.id?{...o,photos:o.photos.filter((_,k)=>k!==j)}:o))}
                            style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"#fff",border:"none",borderRadius:"50%",width:15,height:15,fontSize:8,cursor:"pointer"}}>✕</button>
                          <a href={ph.url} download={ph.name||"photo.jpg"}
                            style={{position:"absolute",bottom:-4,right:-4,background:"#3b82f6",color:"#fff",borderRadius:"50%",width:15,height:15,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none"}}>↓</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <button onClick={()=>setObsItems(prev=>[...prev,{id:String(Date.now()),zone:"",statut:"Non conforme",priorite:"moyenne",description:"",action:"",photos:[]}])}
              style={{background:"#243352",color:"#3b82f6",border:"1px dashed #3b82f644",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>
              + Ajouter une observation
            </button>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:3}}>Conclusion</label>
            <textarea rows={3} value={draft.observations} onChange={e=>setDraft(p=>({...p,observations:e.target.value}))} style={{...inp(),resize:"vertical"}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
              {editId?"Mettre à jour":"Enregistrer l'audit"}
            </button>
            <button onClick={()=>{resetForm();setShowForm(false);}} style={{background:"transparent",color:"#7a90aa",border:"1px solid #3d5270",borderRadius:8,padding:"8px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Liste audits */}
      {audits.length===0 && !showForm && (
        <Card><div style={{textAlign:"center",color:"#5a7090",padding:30,fontSize:13}}>Aucun audit. Cliquez sur "+ Nouvel audit".</div></Card>
      )}
      {audits.map(a=>{
        const isS=sel===a.id;
        const col=scoreColor(a.score||0);
        const statCol=a.statut==="Conforme"?"#22c55e":a.statut==="Partiel"?"#f59e0b":"#ef4444";
        return (
          <Card key={a.id} style={{marginBottom:10,borderLeft:"3px solid "+col,cursor:"pointer"}} onClick={()=>setSel(isS?null:a.id)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                  <div style={{fontSize:22,fontWeight:900,color:col}}>{a.score||0}%</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9"}}>{a.date}</div>
                    <div style={{fontSize:11,color:"#7a90aa"}}>{a.auditeur}</div>
                  </div>
                  <Badge label={a.statut||"-"} color={statCol}/>
                </div>
              </div>
              <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>exportAudit(a)}
                  style={{background:"#22c55e22",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  PDF
                </button>
                <button onClick={()=>openEdit(a)}
                  style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  Edit
                </button>
                <button onClick={()=>{setAudits(prev=>prev.filter(x=>x.id!==a.id));setSel(null);sbDelete("audits",a.id);}}
                  style={{background:"#ef444422",color:"#ef4444",border:"1px solid #ef444433",borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  X
                </button>
              </div>
            </div>
            {isS && (
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #3d5270"}}>
                {GRILLE.map(s=>(
                  <div key={s.section} style={{marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",marginBottom:5}}>{s.section}</div>
                    {s.items.map(item=>{
                      const v=a.reponses[item.id]||"Non évalué";
                      const col=NOTE_COL[v]||"#5a7090";
                      return (
                        <div key={item.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #24335233"}}>
                          <span style={{fontSize:11,color:"#94a3b8"}}>{item.label}</span>
                          <span style={{fontSize:10,fontWeight:700,color:col}}>{v}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {a.observations&&<div style={{marginTop:8,fontSize:12,color:"#94a3b8"}}><strong style={{color:"#7a90aa"}}>Conclusion :</strong> {a.observations}</div>}
                {(a.obsItems||[]).length>0&&(
                  <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #3d5270"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#3b82f6",textTransform:"uppercase",marginBottom:8}}>Observations ({a.obsItems.length})</div>
                    {a.obsItems.map((obs,i)=>(
                      <div key={obs.id} style={{background:"#1a2540",borderRadius:8,padding:"8px 12px",marginBottom:6}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,gap:8,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,fontWeight:700,color:"#f1f5f9"}}>{obs.zone||"Zone non précisée"}</span>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            {obs.priorite&&<span style={{fontSize:9,fontWeight:700,color:obs.priorite==="haute"?"#ef4444":obs.priorite==="moyenne"?"#f59e0b":"#3b82f6",background:(obs.priorite==="haute"?"#ef4444":obs.priorite==="moyenne"?"#f59e0b":"#3b82f6")+"22",borderRadius:4,padding:"1px 6px",textTransform:"uppercase"}}>{obs.priorite}</span>}
                            <span style={{fontSize:10,fontWeight:700,color:obs.statut==="Non conforme"?"#ef4444":"#f59e0b"}}>{obs.statut}</span>
                          </div>
                        </div>
                        {obs.description&&<div style={{fontSize:11,color:"#94a3b8",marginBottom:2}}><strong style={{color:"#7a90aa"}}>Description :</strong> {obs.description}</div>}
                        {obs.action&&<div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}><strong style={{color:"#7a90aa"}}>Action :</strong> {obs.action}</div>}
                        {(obs.photos||[]).length>0&&(
                          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                            {(obs.photos||[]).map((ph,j)=>(
                          <div key={j} style={{position:"relative"}}>
                            <img src={ph.url} style={{width:50,height:50,objectFit:"cover",borderRadius:5,border:"1px solid #3d5270"}}/>
                            <a href={ph.url} download={ph.name||"photo.jpg"}
                              style={{position:"absolute",bottom:-4,right:-4,background:"#3b82f6",color:"#fff",border:"none",borderRadius:"50%",width:16,height:16,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none"}}>↓</a>
                          </div>
                        ))}
                          </div>
                        )}
                        <div onClick={e=>e.stopPropagation()}>
                          {obs.actionId ? (() => {
                            const stAction = actionsStatuts[obs.actionId] || "Planifiée";
                            const SCOLOR_ACTION = { "En cours":"#f59e0b", "Planifiée":"#3b82f6", "Résolue":"#22c55e", Vigilance:"#f59e0b" };
                            const col = SCOLOR_ACTION[stAction] || "#7a90aa";
                            return (
                              <span style={{fontSize:10,fontWeight:700,color:col,background:col+"22",border:"1px solid "+col+"44",borderRadius:6,padding:"3px 9px",display:"inline-block"}}>
                                Action liee : {stAction}
                              </span>
                            );
                          })() : (
                            <button onClick={()=>creerActionDepuisObservation(a, obs)} disabled={creatingAction===obs.id}
                              style={{background:"#1d4ed822",color:"#3b82f6",border:"1px solid #3b82f644",borderRadius:6,padding:"4px 10px",fontSize:10,fontWeight:700,cursor:creatingAction===obs.id?"default":"pointer",fontFamily:"inherit",opacity:creatingAction===obs.id?0.6:1}}>
                              {creatingAction===obs.id ? "Creation..." : "+ Creer une action"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {/* Graphiques de suivi */}
      {audits.length > 0 && (
        <>
          <AuditScoreEvolutionChart audits={audits} />
          <AuditStatutPieChart audits={audits} />
          <AuditScoreParSectionChart audits={audits} grille={GRILLE} />
          <AuditObservationsParZoneChart audits={audits} />
        </>
      )}
    </div>
  );
}


const VIEWS = {
  dashboard: Dashboard,
  implantation: props => <PlanImplantation seuilsGlobaux={props.seuilsGlobaux}/>,
  interventions: props => <Interventions reinterventions={props.reinterventions} setReinterventions={props.setReinterventions} passagesGlobaux={props.passagesGlobaux} setPassagesGlobaux={props.setPassagesGlobaux}/>,
  saisiepassage: props => <SaisiePassage seuilsGlobaux={props.seuilsGlobaux} setSeuilsGlobaux={props.setSeuilsGlobaux} setReinterventions={props.setReinterventions} setPassagesGlobaux={props.setPassagesGlobaux}/>,
  cartographie: props => <Cartographie seuilsGlobaux={props.seuilsGlobaux}/>,
  maintenancedeiv: MaintenanceDEIV,
  statistiques: Statistiques,
  planactions: PlanActions,
  reinterventions: Reinterventions,
  conformite: Conformite,
  produits: Produits,
  habilitations: Habilitations,
  agrements: Agrements,
  contratsdevis: ContratDevis,
  reglementations: Reglementations,
  traitementthermique: TraitementThermique,
  deepcleaning: DeepCleaning,
  maintenancecleaning: MaintenanceCleaning,
  assainissement: Assainissement,
  desinsectisation: Desinsectisation,
  audit: props => <Audit seuilsGlobaux={props.seuilsGlobaux}/>,
};

// ============================================================
// NAV BUTTON
// ============================================================
function NavBtn({ id, label, page, setPage, narrow }) {
  const active = page === id;
  const iconPath = NAV_ICONS[id] || "M4 6h16M4 12h16M4 18h16";
  const paths = iconPath.split(" M ").map((p,i) => i===0?p:"M "+p);
  return (
    <button onClick={() => setPage(id)} title={narrow ? label : ""}
      style={{ width: "100%", textAlign: "left", padding: narrow ? "10px 0" : "8px 14px", display: "flex", alignItems: "center", justifyContent: narrow ? "center" : "flex-start", gap: 9, background: active ? "#1d4ed811" : "transparent", borderLeft: narrow ? "none" : (active ? "3px solid #3b82f6" : "3px solid transparent"), borderBottom: narrow && active ? "2px solid #3b82f6" : "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 400, color: active ? "#f1f5f9" : "#7a90aa", fontFamily: "inherit", transition: "all .12s" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:active?1:0.7}}>
        {paths.map((d,i) => <path key={i} d={d}/>)}
      </svg>
      {!narrow && <span>{label}</span>}
    </button>
  );
}

// ============================================================
// APP PRINCIPALE
// ============================================================
// ============================================================
// PARAMÈTRES CLIENT
// ============================================================
// Gestion des sites. config_client tient lieu de table des sites : une ligne par site,
// id = code du site, site = libelle affiche dans le selecteur de l en-tete.
function SitesTab() {
  const [sites, setSites] = useState([]);
  const [code, setCode] = useState("");
  const [libelle, setLibelle] = useState("");
  const [msg, setMsg] = useState("");

  function recharger() {
    sbFetch("config_client?order=id.asc", "GET").then(d => {
      var liste = Array.isArray(d) ? d : [];
      setSites(liste);
      // Synchroniser la globale lue par le selecteur de site en haut.
      SITES_DISPO = liste.map(x => ({ id: x.id, site: x.site || x.id }));
      // Rafraichir le selecteur en haut SANS remonter la page (contrairement a
      // un changement de site, ici on ne recharge pas les donnees).
      if (typeof __onSitesListChange === "function") __onSitesListChange();
    });
  }
  useEffect(() => { recharger(); }, []);

  function ajouter() {
    var c = (code||"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!c) { setMsg("Le code du site est obligatoire."); return; }
    if (sites.filter(s => s.id === c).length > 0) { setMsg("Le code " + c + " existe deja."); return; }
    var modele = sites[0] || {};
    sbUpsert("config_client", {
      id: c,
      site: (libelle||"").trim() || c,
      nom: modele.nom || CLIENT_CONFIG.nom,
      contrat: modele.contrat || CLIENT_CONFIG.contrat,
      type_site: modele.type_site || "",
      date_debut: modele.date_debut || "",
      date_fin: modele.date_fin || "",
      passages_an: modele.passages_an || 12,
      seuil_vigilance: modele.seuil_vigilance || 5,
      seuil_critique: modele.seuil_critique || 10,
    }).then(() => { setCode(""); setLibelle(""); setMsg("Site " + c + " cree. Il apparait dans le selecteur en haut."); recharger(); });
  }

  function renommer(s) {
    var v = window.prompt("Nouveau libelle pour le site " + s.id + " :", s.site || s.id);
    if (v === null) return;
    sbUpsert("config_client", { ...s, site: v.trim() || s.id })
      .then(() => { setMsg("Libelle mis a jour. Recharge la page pour le voir dans le selecteur."); recharger(); });
  }

  function supprimer(s) {
    if (s.id === SITE_ACTIF) { setMsg("Impossible de supprimer le site en cours. Bascule sur un autre site avant."); return; }
    if (sites.length <= 1) { setMsg("Il doit rester au moins un site."); return; }
    if (!window.confirm("Supprimer le site " + s.id + " ?\n\nSes postes, passages et plans restent en base mais deviennent inaccessibles depuis le portail. Confirmer ?")) return;
    sbDelete("config_client", s.id).then(() => { setMsg("Site " + s.id + " retire."); recharger(); });
  }

  var inp = { background:"#1a2540", border:"1px solid #3d5270", borderRadius:8, padding:"8px 10px", color:"#f1f5f9", fontSize:12, fontFamily:"inherit" };
  return (
    <div>
      <div style={{ fontSize:11, color:"#7a90aa", marginBottom:14 }}>Chaque site est independant : ses postes, passages, plans, actions et seuils lui sont propres. Le selecteur en haut de page permet de basculer.</div>
      {sites.map(s => (
        <div key={s.id} style={{ display:"flex", alignItems:"center", gap:8, background:"#243352", borderRadius:9, padding:"9px 12px", marginBottom:7, border:"1px solid " + (s.id===SITE_ACTIF ? "#8b5cf6" : "#3d5270") }}>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#f1f5f9" }}>{s.site || s.id}</span>
            <span style={{ fontSize:10, color:"#5a7090", marginLeft:8 }}>code {s.id}</span>
            {s.id===SITE_ACTIF && <span style={{ fontSize:9, fontWeight:700, color:"#8b5cf6", marginLeft:8 }}>SITE EN COURS</span>}
          </div>
          <button onClick={()=>renommer(s)} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Renommer</button>
          <button onClick={()=>supprimer(s)} style={{ background:"transparent", color:"#ef4444", border:"1px solid #ef444455", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Retirer</button>
        </div>
      ))}
      <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid #3d5270" }}>
        <div style={{ fontSize:12, fontWeight:700, color:"#f1f5f9", marginBottom:8 }}>Ajouter un site</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input value={code} onChange={e=>setCode(e.target.value)} placeholder="Code (ex BEAUFORT)" style={{ ...inp, width:170 }}/>
          <input value={libelle} onChange={e=>setLibelle(e.target.value)} placeholder="Libelle affiche" style={{ ...inp, flex:1, minWidth:150 }}/>
          <button onClick={ajouter} style={{ background:"#8b5cf6", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Ajouter</button>
        </div>
        <div style={{ fontSize:10, color:"#5a7090", marginTop:6 }}>Le code est definitif : il marque toutes les donnees du site en base. Lettres, chiffres, tiret et souligne uniquement.</div>
      </div>
      {msg && <div style={{ marginTop:12, fontSize:11, color:"#22c55e" }}>{msg}</div>}
    </div>
  );
}

function ParametresModal({ onClose }) {
  const [form, setForm] = useState({
    nom: CLIENT_CONFIG.nom,
    contrat: CLIENT_CONFIG.contrat,
    site: CLIENT_CONFIG.site,
    type_site: CLIENT_CONFIG.type_site,
    date_debut: CLIENT_CONFIG.date_debut,
    date_fin: CLIENT_CONFIG.date_fin,
    passages_an: CLIENT_CONFIG.passages_an,
    seuil_vigilance: CLIENT_CONFIG.seuil_vigilance,
    seuil_critique: CLIENT_CONFIG.seuil_critique,
    contact1_nom: CLIENT_CONFIG.contact1_nom||"",
    contact1_titre: CLIENT_CONFIG.contact1_titre||"",
    contact1_mail: CLIENT_CONFIG.contact1_mail||"",
    contact1_tel: CLIENT_CONFIG.contact1_tel||"",
    contact2_nom: CLIENT_CONFIG.contact2_nom||"",
    contact2_titre: CLIENT_CONFIG.contact2_titre||"",
    contact2_mail: CLIENT_CONFIG.contact2_mail||"",
    contact2_tel: CLIENT_CONFIG.contact2_tel||"",
  });
  const [certifications, setCertifications] = useState(CLIENT_CONFIG.certifications||[]);
  const [certifsList, setCertifsList] = useState(["IFS","BRC","ISO 22000","FSSC 22000","HACCP"]);
  const [newCertifInput, setNewCertifInput] = useState("");
  const [tab, setTab] = useState("client"); // client | aads
  const [aadsForm, setAadsForm] = useState({
    adresse: AADS_CONFIG.adresse||"",
    activites: AADS_CONFIG.activites||"",
    presentation: AADS_CONFIG.presentation||"",
    siret: AADS_CONFIG.siret||"",
    contact1_nom: AADS_CONFIG.contact1_nom||"", contact1_titre: AADS_CONFIG.contact1_titre||"", contact1_mail: AADS_CONFIG.contact1_mail||"", contact1_tel: AADS_CONFIG.contact1_tel||"",
    contact2_nom: AADS_CONFIG.contact2_nom||"", contact2_titre: AADS_CONFIG.contact2_titre||"", contact2_mail: AADS_CONFIG.contact2_mail||"", contact2_tel: AADS_CONFIG.contact2_tel||"",
    contact3_nom: AADS_CONFIG.contact3_nom||"", contact3_titre: AADS_CONFIG.contact3_titre||"", contact3_mail: AADS_CONFIG.contact3_mail||"", contact3_tel: AADS_CONFIG.contact3_tel||"",
    contact4_nom: AADS_CONFIG.contact4_nom||"", contact4_titre: AADS_CONFIG.contact4_titre||"", contact4_mail: AADS_CONFIG.contact4_mail||"", contact4_tel: AADS_CONFIG.contact4_tel||"",
  });
  const [savingAads, setSavingAads] = useState(false);
  const [savedAads, setSavedAads] = useState(false);

  async function handleSaveAads() {
    setSavingAads(true);
    Object.keys(aadsForm).forEach(k => { AADS_CONFIG[k] = aadsForm[k]; });
    await sbUpsert("config_aads", { id: "main", ...aadsForm });
    setSavingAads(false);
    setSavedAads(true);
    setTimeout(() => setSavedAads(false), 2000);
  }

  function toggleCertif(c) {
    setCertifications(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c]);
  }
  function addCertifOption() {
    const v = newCertifInput.trim();
    if (!v || certifsList.includes(v)) return;
    setCertifsList(prev => [...prev, v]);
    setCertifications(prev => [...prev, v]);
    setNewCertifInput("");
  }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    CLIENT_CONFIG.nom = form.nom;
    CLIENT_CONFIG.contrat = form.contrat;
    CLIENT_CONFIG.site = form.site;
    CLIENT_CONFIG.type_site = form.type_site;
    CLIENT_CONFIG.date_debut = form.date_debut;
    CLIENT_CONFIG.date_fin = form.date_fin;
    CLIENT_CONFIG.passages_an = parseInt(form.passages_an) || 12;
    CLIENT_CONFIG.seuil_vigilance = parseInt(form.seuil_vigilance) || 5;
    CLIENT_CONFIG.seuil_critique = parseInt(form.seuil_critique) || 10;
    CLIENT_CONFIG.contact1_nom = form.contact1_nom;
    CLIENT_CONFIG.contact1_titre = form.contact1_titre;
    CLIENT_CONFIG.contact1_mail = form.contact1_mail;
    CLIENT_CONFIG.contact1_tel = form.contact1_tel;
    CLIENT_CONFIG.contact2_nom = form.contact2_nom;
    CLIENT_CONFIG.contact2_titre = form.contact2_titre;
    CLIENT_CONFIG.contact2_mail = form.contact2_mail;
    CLIENT_CONFIG.contact2_tel = form.contact2_tel;
    CLIENT_CONFIG.certifications = certifications;

    await sbUpsert("config_client", {
      id: "main",
      nom: form.nom,
      contrat: form.contrat,
      site: form.site,
      type_site: form.type_site,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      passages_an: parseInt(form.passages_an) || 12,
      seuil_vigilance: parseInt(form.seuil_vigilance) || 5,
      seuil_critique: parseInt(form.seuil_critique) || 10,
      contact1_nom: form.contact1_nom,
      contact1_titre: form.contact1_titre,
      contact1_mail: form.contact1_mail,
      contact1_tel: form.contact1_tel,
      contact2_nom: form.contact2_nom,
      contact2_titre: form.contact2_titre,
      contact2_mail: form.contact2_mail,
      contact2_tel: form.contact2_tel,
      certifications: JSON.stringify(certifications),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inpStyle = { background:"#243352", border:"1px solid #3d5270", borderRadius:8, padding:"9px 12px", color:"#f1f5f9", fontSize:13, fontFamily:"inherit", width:"100%" };
  const labelStyle = { fontSize:10, color:"#7a90aa", fontWeight:700, textTransform:"uppercase", display:"block", marginBottom:5 };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div style={{ background:"#1a2540", borderRadius:14, padding:28, maxWidth:560, width:"100%", maxHeight:"90vh", overflowY:"auto", border:"1px solid #3d5270" }}
        onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#f1f5f9" }}>Paramètres</div>
          <button onClick={onClose} style={{ background:"transparent", color:"#7a90aa", border:"1px solid #3d5270", borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Fermer</button>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:20, background:"#243352", borderRadius:9, padding:3, width:"fit-content" }}>
          <button onClick={()=>setTab("client")} style={{ background:tab==="client"?"#1d4ed8":"transparent", color:tab==="client"?"#fff":"#94a3b8", border:"none", borderRadius:7, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Client</button>
          <button onClick={()=>setTab("aads")} style={{ background:tab==="aads"?"#1d4ed8":"transparent", color:tab==="aads"?"#fff":"#94a3b8", border:"none", borderRadius:7, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>AADS</button>
          <button onClick={()=>setTab("sites")} style={{ background:tab==="sites"?"#8b5cf6":"transparent", color:tab==="sites"?"#fff":"#94a3b8", border:"none", borderRadius:7, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Sites</button>
        </div>

        {tab==="sites" && <SitesTab/>}

        {tab==="client" && (
        <>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, color:"#7a90aa" }}>Ces informations sont utilisées dans tout le portail (PDF, en-têtes, dashboard...)</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
          <div style={{gridColumn:"1/-1"}}>
            <label style={labelStyle}>Nom du client</label>
            <input value={form.nom} onChange={e=>setForm(p=>({...p, nom:e.target.value}))} style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Numéro de contrat</label>
            <input value={form.contrat} onChange={e=>setForm(p=>({...p, contrat:e.target.value}))} style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Type de site</label>
            <input value={form.type_site} onChange={e=>setForm(p=>({...p, type_site:e.target.value}))} style={inpStyle}/>
          </div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={labelStyle}>Adresse du site</label>
            <input value={form.site} onChange={e=>setForm(p=>({...p, site:e.target.value}))} style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Date début contrat</label>
            <input value={form.date_debut} onChange={e=>setForm(p=>({...p, date_debut:e.target.value}))} placeholder="JJ/MM/AAAA" style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Date fin contrat</label>
            <input value={form.date_fin} onChange={e=>setForm(p=>({...p, date_fin:e.target.value}))} placeholder="JJ/MM/AAAA" style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Passages par an</label>
            <input type="number" value={form.passages_an} onChange={e=>setForm(p=>({...p, passages_an:e.target.value}))} style={inpStyle}/>
          </div>
        </div>

        <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:10, marginTop:6, borderTop:"1px solid #3d5270", paddingTop:16 }}>Contact 1</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
          <div>
            <label style={labelStyle}>Nom</label>
            <input value={form.contact1_nom} onChange={e=>setForm(p=>({...p, contact1_nom:e.target.value}))} style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Titre / Fonction</label>
            <input value={form.contact1_titre} onChange={e=>setForm(p=>({...p, contact1_titre:e.target.value}))} style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.contact1_mail} onChange={e=>setForm(p=>({...p, contact1_mail:e.target.value}))} style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Téléphone</label>
            <input value={form.contact1_tel} onChange={e=>setForm(p=>({...p, contact1_tel:e.target.value}))} style={inpStyle}/>
          </div>
        </div>

        <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:10, borderTop:"1px solid #3d5270", paddingTop:16 }}>Contact 2</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
          <div>
            <label style={labelStyle}>Nom</label>
            <input value={form.contact2_nom} onChange={e=>setForm(p=>({...p, contact2_nom:e.target.value}))} style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Titre / Fonction</label>
            <input value={form.contact2_titre} onChange={e=>setForm(p=>({...p, contact2_titre:e.target.value}))} style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.contact2_mail} onChange={e=>setForm(p=>({...p, contact2_mail:e.target.value}))} style={inpStyle}/>
          </div>
          <div>
            <label style={labelStyle}>Téléphone</label>
            <input value={form.contact2_tel} onChange={e=>setForm(p=>({...p, contact2_tel:e.target.value}))} style={inpStyle}/>
          </div>
        </div>

        <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:10, borderTop:"1px solid #3d5270", paddingTop:16 }}>Certifications</div>
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
            {certifsList.map(c=>{
              const active = certifications.includes(c);
              return (
                <button key={c} onClick={()=>toggleCertif(c)}
                  style={{ background:active?"#1d4ed8":"#243352", color:active?"#fff":"#94a3b8", border:"1px solid "+(active?"#3b82f6":"#3d5270"), borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:active?700:500, cursor:"pointer", fontFamily:"inherit" }}>
                  {active ? "✓ " : ""}{c}
                </button>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <input value={newCertifInput} onChange={e=>setNewCertifInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addCertifOption();}}} placeholder="Ajouter une certification..." style={{...inpStyle, flex:1}}/>
            <button onClick={addCertifOption} style={{ background:"#22c55e", color:"#fff", border:"none", borderRadius:8, padding:"9px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+</button>
          </div>
        </div>

        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={handleSave} disabled={saving}
            style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, padding:"10px 22px", fontSize:13, fontWeight:700, cursor:saving?"default":"pointer", fontFamily:"inherit", opacity:saving?0.6:1 }}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
          {saved && <span style={{ color:"#22c55e", fontSize:13, fontWeight:600 }}>✓ Enregistré — rechargez la page pour tout mettre à jour</span>}
        </div>
        </>
        )}

        {tab==="aads" && (
        <>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, color:"#7a90aa" }}>Informations sur AADS, affichées dans les rapports et documents.</div>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Adresse</label>
          <input value={aadsForm.adresse} onChange={e=>setAadsForm(p=>({...p, adresse:e.target.value}))} style={inpStyle}/>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Activités</label>
          <textarea rows={2} value={aadsForm.activites} onChange={e=>setAadsForm(p=>({...p, activites:e.target.value}))} style={{...inpStyle, resize:"vertical"}}/>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>Présentation</label>
          <textarea rows={3} value={aadsForm.presentation} onChange={e=>setAadsForm(p=>({...p, presentation:e.target.value}))} style={{...inpStyle, resize:"vertical"}}/>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>SIRET</label>
          <input value={aadsForm.siret} onChange={e=>setAadsForm(p=>({...p, siret:e.target.value}))} style={inpStyle}/>
        </div>

        {[1,2,3,4].map(n=>(
          <div key={n}>
            <div style={{ fontSize:13, fontWeight:700, color:"#f1f5f9", marginBottom:10, marginTop:6, borderTop:"1px solid #3d5270", paddingTop:16 }}>Contact {n}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
              <div>
                <label style={labelStyle}>Nom</label>
                <input value={aadsForm["contact"+n+"_nom"]} onChange={e=>setAadsForm(p=>({...p, ["contact"+n+"_nom"]:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Titre / Fonction</label>
                <input value={aadsForm["contact"+n+"_titre"]} onChange={e=>setAadsForm(p=>({...p, ["contact"+n+"_titre"]:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={aadsForm["contact"+n+"_mail"]} onChange={e=>setAadsForm(p=>({...p, ["contact"+n+"_mail"]:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input value={aadsForm["contact"+n+"_tel"]} onChange={e=>setAadsForm(p=>({...p, ["contact"+n+"_tel"]:e.target.value}))} style={inpStyle}/>
              </div>
            </div>
          </div>
        ))}

        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={handleSaveAads} disabled={savingAads}
            style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, padding:"10px 22px", fontSize:13, fontWeight:700, cursor:savingAads?"default":"pointer", fontFamily:"inherit", opacity:savingAads?0.6:1 }}>
            {savingAads ? "Enregistrement..." : "Enregistrer"}
          </button>
          {savedAads && <span style={{ color:"#22c55e", fontSize:13, fontWeight:600 }}>✓ Enregistré</span>}
        </div>
        </>
        )}
      </div>
    </div>
  );
}


export default function App() {
  // Enregistrement PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    }
  }, []);

  // OFFLINE SYNC
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  window.__setPendingCount = setPendingCount;

  useEffect(() => {
    getPendingSaisies().then(p => setPendingCount(p.length)).catch(()=>{});
  }, []);

  // Sync automatique quand on revient en ligne
  useEffect(() => {
    if (!isOnline) return;
    getPendingSaisies().then(pending => {
      if (pending.length === 0) return;
      Promise.all(pending.map(p => {
        const table = p.table || "passages";
        return sbUpsert(table, p.data).then(() => deletePendingSaisie(p.id)).catch(()=>{});
      })).then(() => {
        getPendingSaisies().then(r => setPendingCount(r.length)).catch(()=>{});
      }).catch(()=>{});
    }).catch(()=>{});
  }, [isOnline]);

  function handleSync() {
    getPendingSaisies().then(pending => {
      Promise.all(pending.map(p => {
        const table = p.table || "passages";
        return sbUpsert(table, p.data).then(() => deletePendingSaisie(p.id)).catch(()=>{});
      })).then(() => {
        getPendingSaisies().then(r => setPendingCount(r.length)).catch(()=>{});
        alert(pending.length + " élément(s) synchronisé(s) avec succès !");
      }).catch(()=>{});
    }).catch(()=>{});
  }

  // AUTH
  const [authRole, setAuthRole] = useState(() => {
    try { return localStorage.getItem("aads_auth_role") || null; } catch(e) { return null; }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInput, setAuthInput] = useState("");
  const [authPasswords, setAuthPasswords] = useState({ client: "", admin: "" });

  useEffect(() => {
    sbFetch("config_auth?id=eq.main", "GET").then(data => {
      if (data && data.length > 0) {
        setAuthPasswords({ client: data[0].password_client||"", admin: data[0].password_admin||"" });
      }
    }).catch(()=>{});
  }, []);

  function handleLogin(e) {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setTimeout(() => {
      if (authInput === authPasswords.admin) {
        setAuthRole("admin");
        try { localStorage.setItem("aads_auth_role", "admin"); } catch(_e) { return; }
      } else if (authInput === authPasswords.client) {
        setAuthRole("client");
        try { localStorage.setItem("aads_auth_role", "client"); } catch(_e) { return; }
      } else {
        setAuthError("Mot de passe incorrect");
      }
      setAuthLoading(false);
    }, 400);
  }

  function handleLogout() {
    setAuthRole(null);
    setAuthInput("");
    try { localStorage.removeItem("aads_auth_role"); } catch(_e) { return; }
  }

  const isAdmin = authRole === "admin";
  window.__isAdmin = isAdmin;

  // Page de connexion
  if (!authRole) {
    return (
      <div style={{minHeight:"100vh",background:"#0f1e38",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
        <div style={{background:"#1a2540",border:"1px solid #3d5270",borderRadius:16,padding:"40px 48px",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
          {/* Logo AADS */}
          <div style={{textAlign:"center",marginBottom:32}}>
            {BANNER_IMG
              ? <img src={BANNER_IMG} alt="AADS" style={{height:80,width:"auto",objectFit:"contain",marginBottom:12}}/>
              : <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9",marginBottom:12,letterSpacing:1}}>AADS</div>}
            <div style={{fontSize:13,color:"#7a90aa",fontWeight:600}}>Portail Client Sanitation</div>
            <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9",marginTop:4}}>{CLIENT_CONFIG.nom}</div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:11,color:"#7a90aa",fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:8}}>Mot de passe</label>
            <input
              type="password"
              value={authInput}
              onChange={e=>setAuthInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              placeholder="Saisir votre mot de passe..."
              autoFocus
              style={{width:"100%",background:"#243352",border:"1px solid "+(authError?"#ef4444":"#3d5270"),borderRadius:8,padding:"12px 14px",color:"#f1f5f9",fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}
            />
            {authError && <div style={{color:"#ef4444",fontSize:12,marginTop:6,fontWeight:600}}>{authError}</div>}
          </div>
          <button onClick={handleLogin} disabled={authLoading||!authInput}
            style={{width:"100%",background:"#1d4ed8",color:"#fff",border:"none",borderRadius:9,padding:"12px",fontSize:14,fontWeight:700,cursor:authLoading||!authInput?"default":"pointer",fontFamily:"inherit",opacity:authLoading||!authInput?0.6:1,transition:"opacity 0.2s"}}>
            {authLoading ? "Vérification..." : "Accéder au portail"}
          </button>
          <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#3d5270"}}>
            AADS — Anjou Assainissement Dératisation Services
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <NetworkIndicator pendingCount={pendingCount} onSync={handleSync} />
      <AppPortail isAdmin={isAdmin} onLogout={handleLogout} isOnline={isOnline} onPendingChange={setPendingCount} />
    </>
  );
}

function AppPortail({ isAdmin, onLogout }) {
  window.__isAdmin = isAdmin;
  // La page est persistee : changerSite recharge la fenetre, et sans ca on
  // retombait sur le tableau de bord a chaque bascule de site. Le bouton de
  // rafraichissement et F5 conservent aussi la page pour la meme raison.
  const [page, setPage] = useState(() => {
    try {
      var enregistree = window.localStorage.getItem("aads_page");
      return enregistree && VIEWS[enregistree] ? enregistree : "dashboard";
    } catch(_e) { return "dashboard"; }
  });
  useEffect(() => {
    try { window.localStorage.setItem("aads_page", page); } catch(_e) {}
  }, [page]);
  const [reinterventions, setReinterventions] = useState(REINIT_INIT);
  const [passagesGlobaux, setPassagesGlobaux] = useState([]);

  // Chargement initial des passages au niveau App pour alimenter le Dashboard immédiatement
  useEffect(() => {
    sbGet("passages").then(data => {
      if (data && data.length > 0) setPassagesGlobaux(data);
    }).catch(()=>{});
  }, []);

  const [navVisible, setNavVisible] = useState(() => {
    const init = {};
    NAV_GROUPS_CONFIG.forEach(g => g.items.forEach(item => { init[item.id] = item.default !== false; }));
    try {
      const saved = localStorage.getItem("aads_nav_visible");
      if (saved) return { ...init, ...JSON.parse(saved) };
    } catch(_e) { return; }
    return init;
  });
  const [showNavConfig, setShowNavConfig] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    try { const v = localStorage.getItem("aads_sidebar_visible"); return v === null ? true : v === "true"; } catch(e) { return true; }
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { const v = localStorage.getItem("aads_sidebar_width"); return v ? parseInt(v) : 224; } catch(e) { return 224; }
  });
  const [appZoom, setAppZoom] = useState(() => {
    try { const v = localStorage.getItem("aads_zoom"); return v ? parseFloat(v) : 1; } catch(e) { return 1; }
  });
  function changeZoom(delta) {
    setAppZoom(prev => {
      const next = Math.min(1.5, Math.max(0.6, Math.round((prev + delta) * 10) / 10));
      try { localStorage.setItem("aads_zoom", String(next)); } catch(_e) { return; }
      return next;
    });
  }

  // Ordre personnalisé des onglets (drag-and-drop), persisté en localStorage
  const allNavItems = NAV_GROUPS_CONFIG.flatMap(g => g.items);
  const [navOrder, setNavOrder] = useState(() => {
    try {
      const saved = localStorage.getItem("aads_nav_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ajouter les nouveaux items absents de l'ordre sauvegardé
        const missing = allNavItems.filter(n => !parsed.includes(n.id)).map(n => n.id);
        return [...parsed, ...missing];
      }
    } catch(_e) { return; }
    return allNavItems.map(n => n.id);
  });
  const navDragOver = React.useRef(null);
  const sidebarResizing = React.useRef(false);
  const sidebarStartX = React.useRef(0);
  const sidebarStartW = React.useRef(224);
  const [bannerUrl, setBannerUrl] = useState(BANNER_IMG);
  const [toqueLogoUrl, setToqueLogoUrl] = useState(TOQUE_LOGO);
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const [showParametres, setShowParametres] = useState(false);

  const [, forceConfigUpdate] = useState(0);
  // Miroir React de SITE_ACTIF : sert de key a View pour la remonter a chaque
  // bascule, ce qui rejoue le chargement des donnees de la page.
  const [siteCourant, setSiteCourant] = useState(SITE_ACTIF);
  const mainRef = React.useRef(null);
  const scrollAvantSite = React.useRef(0);
  const [, forceSitesRefresh] = useState(0);
  useEffect(() => {
    __onSiteChange = (id) => {
      // On memorise la position de defilement avant que la page se remonte,
      // pour ne pas ramener l utilisateur en haut a chaque changement de site.
      scrollAvantSite.current = mainRef.current ? mainRef.current.scrollTop : 0;
      setSiteCourant(id);
    };
    // Rafraichit juste le rendu (donc le selecteur de site) sans remonter la page.
    __onSitesListChange = () => forceSitesRefresh(n => n + 1);
    return () => { __onSiteChange = null; __onSitesListChange = null; };
  }, []);
  // Apres remontage (donc apres rechargement des donnees), on restaure le scroll.
  useEffect(() => {
    if (!mainRef.current || !scrollAvantSite.current) return;
    var cible = scrollAvantSite.current;
    var essais = 0;
    var timer = setInterval(() => {
      if (!mainRef.current) { clearInterval(timer); return; }
      mainRef.current.scrollTop = cible;
      essais++;
      // Le contenu se rallonge au fil du chargement asynchrone : on retente
      // quelques fois jusqu a ce que la hauteur permette d atteindre la cible.
      if (essais > 12 || mainRef.current.scrollTop >= cible - 2) clearInterval(timer);
    }, 120);
    return () => clearInterval(timer);
  }, [siteCourant]);

  useEffect(() => {
    sbFetch("config_client?order=id.asc", "GET").then(data => {
      if (data && data.length > 0) {
        SITES_DISPO = data.map(x => ({ id: x.id, site: x.site || x.id }));
        const choisi = data.filter(x => x.id === SITE_ACTIF)[0] || data[0];
        // Premier passage sur ce navigateur : on fixe le site et on recharge une fois,
        // sinon les chargements deja partis auraient tourne sans filtre de site.
        if (SITE_ACTIF !== choisi.id) {
          try { window.localStorage.setItem("aads_site_actif", choisi.id); } catch(_e) { return; }
          SITE_ACTIF = choisi.id;
          window.location.reload();
          return;
        }
        const cfg = choisi;
        if (cfg.nom) CLIENT_CONFIG.nom = cfg.nom;
        if (cfg.contrat) CLIENT_CONFIG.contrat = cfg.contrat;
        if (cfg.site) CLIENT_CONFIG.site = cfg.site;
        if (cfg.type_site) CLIENT_CONFIG.type_site = cfg.type_site;
        if (cfg.date_debut) CLIENT_CONFIG.date_debut = cfg.date_debut;
        if (cfg.date_fin) CLIENT_CONFIG.date_fin = cfg.date_fin;
        if (cfg.passages_an) CLIENT_CONFIG.passages_an = cfg.passages_an;
        if (cfg.seuil_vigilance) CLIENT_CONFIG.seuil_vigilance = cfg.seuil_vigilance;
        if (cfg.seuil_critique) CLIENT_CONFIG.seuil_critique = cfg.seuil_critique;
        if (cfg.contact1_nom) CLIENT_CONFIG.contact1_nom = cfg.contact1_nom;
        if (cfg.contact1_titre) CLIENT_CONFIG.contact1_titre = cfg.contact1_titre;
        if (cfg.contact1_mail) CLIENT_CONFIG.contact1_mail = cfg.contact1_mail;
        if (cfg.contact1_tel) CLIENT_CONFIG.contact1_tel = cfg.contact1_tel;
        if (cfg.contact2_nom) CLIENT_CONFIG.contact2_nom = cfg.contact2_nom;
        if (cfg.contact2_titre) CLIENT_CONFIG.contact2_titre = cfg.contact2_titre;
        if (cfg.contact2_mail) CLIENT_CONFIG.contact2_mail = cfg.contact2_mail;
        if (cfg.contact2_tel) CLIENT_CONFIG.contact2_tel = cfg.contact2_tel;
        if (cfg.certifications) {
          try { CLIENT_CONFIG.certifications = typeof cfg.certifications==="string" ? JSON.parse(cfg.certifications) : cfg.certifications; } catch(e) { CLIENT_CONFIG.certifications = []; }
        }
        forceConfigUpdate(n => n+1);
      }
    }).catch(()=>{});
    sbFetch("config_aads?id=eq.main", "GET").then(data => {
      if (data && data.length > 0) {
        const cfg = data[0];
        Object.keys(AADS_CONFIG).forEach(k => { if (cfg[k]) AADS_CONFIG[k] = cfg[k]; });
        forceConfigUpdate(n => n+1);
      }
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    sbFetch("config_logos?id=eq.main", "GET").then(data => {
      if (data && data.length > 0) {
        const cfg = data[0];
        if (cfg.banner_url && cfg.banner_url !== BANNER_IMG) { setBannerUrl(cfg.banner_url); BANNER_IMG = cfg.banner_url; }
        if (cfg.toque_logo_url && cfg.toque_logo_url !== TOQUE_LOGO) { setToqueLogoUrl(cfg.toque_logo_url); TOQUE_LOGO = cfg.toque_logo_url; }
      }
    }).catch(()=>{});
  }, []);

  function uploadLogo(file, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (type === "banner") { setBannerUrl(dataUrl); BANNER_IMG = dataUrl; }
      else { setToqueLogoUrl(dataUrl); TOQUE_LOGO = dataUrl; }
      sbUpsert("config_logos", {
        id: "main", contrat: CLIENT_CONFIG.contrat,
        banner_url: type==="banner" ? dataUrl : bannerUrl,
        toque_logo_url: type==="toque" ? dataUrl : toqueLogoUrl,
      });
    };
    reader.readAsDataURL(file);
  }

  // Seuils partagés entre SaisiePassage et Cartographie
  const [seuilsGlobaux, setSeuilsGlobauxState] = useState({
    rongeurs:    { capture_rouge: 1, taux_vigilance: CLIENT_CONFIG.seuil_vigilance||5, taux_critique: CLIENT_CONFIG.seuil_critique||10, conso_orange: "25%", conso_rouge: "75%" },
    rongeursExt: { leger: 1, moyen: 3 },
    rongeursInt: { leger: 1, moyen: 3 },
    audit:       { conforme: 85, partiel: 60 },
    blattes:     { leger: 5, moyen: 10 },
    teignes:     { leger: 100, moyen: 150 },
    ips:         { leger: 3, moyen: 8 },
    iv: {
      Moucherons:   { leger:350, moyen:500 },
      Mouches:      { leger:150, moyen:250 },
      Moustiques:   { leger:60,  moyen:100 },
      Hyménoptères: { leger:50,  moyen:100 },
      Lépidoptères: { leger:45,  moyen:100 },
      Coléoptères:  { leger:15,  moyen:30  },
      Punaises:     { leger:5,   moyen:10  },
      Tipules:      { leger:10,  moyen:20  },
    }
  });

  function setSeuilsGlobaux(val) {
    const newVal = typeof val === "function" ? val(seuilsGlobaux) : val;
    setSeuilsGlobauxState(newVal);
    sbUpsert("seuils", { id: CLIENT_CONFIG.contrat, contrat: CLIENT_CONFIG.contrat, data: JSON.stringify(newVal) });
  }

  useEffect(() => {
    sbGet("seuils").then(data => {
      if (data && data.length > 0 && data[0].data) {
        const parsed = typeof data[0].data === "string" ? JSON.parse(data[0].data) : data[0].data;
        setSeuilsGlobauxState(parsed);
      }
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    sbGet("reinterventions").then(data => {
      if (data && data.length > 0) setReinterventions(data.map(r => ({ ...r, actions: typeof r.actions==="string"?JSON.parse(r.actions||"[]"):(r.actions||[]), photos: typeof r.photos==="string"?JSON.parse(r.photos||"[]"):(r.photos||[]) })));
    }).catch(() => {});
  }, []);

  const View = VIEWS[page] || Dashboard;

  // Garde-fou config : pose APRES tous les hooks (regles de React). Si la base
  // n est pas renseignee, on affiche un message clair au lieu d un ecran blanc.
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return (
      <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:"#1a2540", color:"#e2e8f0", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ maxWidth:520, background:"#243352", border:"1px solid #3d5270", borderRadius:12, padding:28 }}>
          <div style={{ fontSize:18, fontWeight:800, marginBottom:12, color:"#f1f5f9" }}>Portail non configure</div>
          <div style={{ fontSize:14, lineHeight:1.6, color:"#cbd5e1" }}>
            Ce portail n est relie a aucune base de donnees. Ouvrez le fichier App.js,
            tout en haut, et renseignez SUPABASE_URL et SUPABASE_KEY avec les valeurs
            de votre projet Supabase (Settings puis API).
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: "#1a2540", minHeight: "100vh", color: "#e2e8f0", zoom: appZoom }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* SIDEBAR */}
        {sidebarVisible && (
        <aside style={{ width: sidebarWidth, minWidth: 48, maxWidth: 400, background: "#0d1526", borderRight: "1px solid #243352", padding: "0 0 16px", flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto", position: "relative", transition: sidebarResizing.current ? "none" : "width 0.05s" }}>
          {/* Poignée de redimensionnement */}
          <div
            onMouseDown={e => {
              sidebarResizing.current = true;
              sidebarStartX.current = e.clientX;
              sidebarStartW.current = sidebarWidth;
              const onMove = ev => {
                if (!sidebarResizing.current) return;
                const newW = Math.max(48, Math.min(400, sidebarStartW.current + ev.clientX - sidebarStartX.current));
                setSidebarWidth(newW);
              };
              const onUp = () => {
                sidebarResizing.current = false;
                setSidebarWidth(w => { try { localStorage.setItem("aads_sidebar_width", String(w)); } catch(_e) { return; } return w; });
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
              };
              document.addEventListener("mousemove", onMove);
              document.addEventListener("mouseup", onUp);
              e.preventDefault();
            }}
            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 5, cursor: "col-resize", zIndex: 10, background: "transparent" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#3b82f633"; }}
            onMouseLeave={e => { if (!sidebarResizing.current) e.currentTarget.style.background = "transparent"; }}
          />
          <div style={{ borderBottom: "1px solid #243352", position:"relative" }}>
            <div onClick={()=>setShowLogoEditor(v=>!v)} style={{cursor:"pointer", position:"relative"}} title="Cliquer pour modifier le logo">
              {bannerUrl
                ? <img src={bannerUrl} alt="AADS" style={{ width: "100%", height: 120, objectFit: "cover", objectPosition: "center", display: "block" }} />
                : <div style={{ padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#3b82f6" }}>AADS</div>
                  </div>
              }
              <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0)",transition:"background 0.15s",display:"flex",alignItems:"center",justifyContent:"center"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(15,23,42,0.55)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(15,23,42,0)"}>
              </div>
            </div>
            {showLogoEditor && (
              <div style={{ padding:"10px 16px", background:"#1a2540", borderTop:"1px solid #243352" }}>
                <div style={{ fontSize:9, color:"#7a90aa", fontWeight:700, textTransform:"uppercase", marginBottom:6 }}>Logos</div>
                <label style={{ display:"block", background:"#243352", border:"1px solid #3d5270", borderRadius:6, padding:"5px 10px", fontSize:10, color:"#94a3b8", cursor:"pointer", marginBottom:6, textAlign:"center" }}>
                  Changer banniere (AADS)
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ if(e.target.files[0]) uploadLogo(e.target.files[0], "banner"); }}/>
                </label>
                <label style={{ display:"block", background:"#243352", border:"1px solid #3d5270", borderRadius:6, padding:"5px 10px", fontSize:10, color:"#94a3b8", cursor:"pointer", textAlign:"center" }}>
                  Changer logo client
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ if(e.target.files[0]) uploadLogo(e.target.files[0], "toque"); }}/>
                </label>
              </div>
            )}
            <div style={{ padding: "6px 16px 10px", borderTop: "1px solid #24335244", display: "flex", alignItems: "center", gap: 8 }}>
              <div onClick={()=>setShowParametres(true)} style={{ fontSize: 10, color: CLIENT_CONFIG.nom?"#94a3b8":"#f59e0b", fontWeight: 600, flex:1, cursor:"pointer" }} title="Cliquer pour modifier les paramètres client">{CLIENT_CONFIG.nom ? "⚙ Paramètres" : "⚙ Configurer le client"}</div>
              <span style={{fontSize:9,fontWeight:700,background:isAdmin?"#1d4ed822":"#22c55e22",color:isAdmin?"#3b82f6":"#22c55e",border:"1px solid "+(isAdmin?"#3b82f644":"#22c55e44"),borderRadius:4,padding:"1px 6px"}}>{isAdmin?"Admin":"Client"}</span>
              <button onClick={onLogout} title="Se déconnecter" style={{background:"transparent",border:"1px solid #3d5270",borderRadius:6,color:"#7a90aa",fontSize:11,cursor:"pointer",padding:"2px 7px",fontFamily:"inherit"}}>⏻</button>
            </div>
          </div>

          <nav style={{ flex: 1, paddingTop: 8, overflowY: "auto" }}>
            {navOrder
              .filter(id => navVisible[id] !== false)
              .map((id, idx, arr) => {
                const item = allNavItems.find(n => n.id === id);
                if (!item) return null;
                const grp = NAV_GROUPS_CONFIG.find(g => g.items.some(n => n.id === id));
                const prevId = idx > 0 ? arr[idx-1] : null;
                const prevGrp = prevId ? NAV_GROUPS_CONFIG.find(g => g.items.some(n => n.id === prevId)) : null;
                const showGroupTitle = sidebarWidth > 80 && grp && (!prevGrp || prevGrp.group !== grp.group);
                return (
                  <React.Fragment key={id}>
                    {showGroupTitle && (
                      <div style={{ padding: "10px 16px 3px", fontSize: 9, fontWeight: 800, color: "#3d5270", letterSpacing: 1.5, textTransform: "uppercase" }}>{grp.group}</div>
                    )}
                    <div
                      draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); }}
                      onDragOver={e => { e.preventDefault(); navDragOver.current = id; }}
                      onDrop={e => {
                        e.preventDefault();
                        const dragId = e.dataTransfer.getData("text/plain");
                        const overId = navDragOver.current;
                        if (!dragId || !overId || dragId === overId) return;
                        setNavOrder(prev => {
                          const next = prev.filter(x => x !== dragId);
                          const idx2 = next.indexOf(overId);
                          next.splice(idx2, 0, dragId);
                          try { localStorage.setItem("aads_nav_order", JSON.stringify(next)); } catch(_e) { return; }
                          return next;
                        });
                        navDragOver.current = null;
                      }}
                      style={{ cursor: "grab" }}>
                      <NavBtn id={id} label={item.label} page={page} setPage={setPage} narrow={sidebarWidth <= 80} />
                    </div>
                  </React.Fragment>
                );
              })}
          </nav>

          <div style={{ padding: "10px 14px", borderTop: "1px solid #243352" }}>
            <button onClick={() => setShowNavConfig(v => !v)}
              style={{ width: "100%", background: showNavConfig ? "#1d4ed822" : "transparent", color: "#7a90aa", border: "1px solid #3d5270", borderRadius: 7, padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              {showNavConfig ? "x Fermer config" : "Configurer les onglets"}
            </button>

            {showNavConfig && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: "#7a90aa", marginBottom: 8, fontWeight: 700, textTransform: "uppercase" }}>Onglets visibles</div>
                <div style={{ fontSize: 10, color: "#5a7090", marginBottom: 8, fontStyle: "italic" }}>Glisser-déposer dans la nav pour réordonner</div>
                <button onClick={() => {
                  const reset = allNavItems.map(n => n.id);
                  setNavOrder(reset);
                  try { localStorage.setItem("aads_nav_order", JSON.stringify(reset)); } catch(_e) { return; }
                }} style={{ width:"100%", background:"transparent", color:"#5a7090", border:"1px solid #3d5270", borderRadius:6, padding:"4px 8px", fontSize:10, cursor:"pointer", fontFamily:"inherit", marginBottom:8 }}>
                  Réinitialiser l'ordre
                </button>
                {NAV_GROUPS_CONFIG.map(grp => (
                  <div key={grp.group} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: "#5a7090", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{grp.group}</div>
                    {grp.items.map(item => (
                      <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: item.required ? "default" : "pointer" }}>
                        <input type="checkbox"
                          checked={navVisible[item.id] !== false}
                          disabled={item.required}
                          onChange={e => {
                            const next = { ...navVisible, [item.id]: e.target.checked };
                            setNavVisible(next);
                            try { localStorage.setItem("aads_nav_visible", JSON.stringify(next)); } catch(_e) { return; }
                          }}
                          style={{ accentColor: "#3b82f6" }} />
                        <span style={{ fontSize: 11, color: item.required ? "#5a7090" : navVisible[item.id] !== false ? "#f1f5f9" : "#7a90aa" }}>{item.label}</span>
                        {item.required && <span style={{ fontSize: 9, color: "#5a7090" }}>(requis)</span>}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 9, color: "#3d5270" }}>Portail v5.0 - {CLIENT_CONFIG.nom}</div>
          </div>
        </aside>
        )}

        {/* MAIN */}
        <main ref={mainRef} style={{ flex: 1, padding: "32px 36px", overflowY: "auto", position:"relative" }}>
          {page !== "dashboard" && PAGES_AVEC_SITE.indexOf(page) >= 0 && (
            <div style={{ position:"absolute", top:12, left:0, right:0, zIndex:9, display:"flex", justifyContent:"center", pointerEvents:"none" }}>
              <div style={{ pointerEvents:"auto" }}><SiteSwitcher/></div>
            </div>
          )}
          <div style={{ position:"absolute", top:12, right:16, zIndex:10 }}>
            <button onClick={()=>window.location.reload()} title="Rafraîchir les données"
              style={{ background:"#243352", border:"1px solid #3d5270", borderRadius:7, color:"#7a90aa", fontSize:14, cursor:"pointer", padding:"4px 10px", lineHeight:1, fontWeight:700 }}>
              ↻
            </button>
          </div>
          <button onClick={()=>{setSidebarVisible(v=>{const next=!v;try{localStorage.setItem("aads_sidebar_visible",String(next));}catch(e){}return next;});}} title={sidebarVisible?"Masquer le menu":"Afficher le menu"}
            style={{ position:"absolute", top:8, left:8, zIndex:50, background:"#243352", border:"1px solid #3d5270", borderRadius:7, color:"#94a3b8", fontSize:14, cursor:"pointer", padding:"4px 9px", lineHeight:1 }}>
            {sidebarVisible ? "◀" : "▶"}
          </button>
          {!isAdmin && (
            <>
            <style>{`.aads-action-btn { opacity: 0.35 !important; pointer-events: none !important; cursor: not-allowed !important; }`}</style>
            <div style={{background:"#f59e0b22",border:"1px solid #f59e0b44",borderRadius:8,padding:"8px 16px",margin:"8px 16px",display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#f59e0b",fontWeight:600}}>
              <span>👁</span> Mode consultation — les modifications ne sont pas disponibles
            </div>
            </>
          )}
          <View key={"page_" + page + "_" + siteCourant} onNav={setPage} reinterventions={reinterventions} setReinterventions={setReinterventions} seuilsGlobaux={seuilsGlobaux} setSeuilsGlobaux={setSeuilsGlobaux} passagesGlobaux={passagesGlobaux} setPassagesGlobaux={setPassagesGlobaux} onLogoClick={()=>setShowLogoEditor(v=>!v)} onParamsClick={()=>setShowParametres(true)} isAdmin={isAdmin} />
        </main>
      </div>
      {showParametres && <ParametresModal onClose={()=>setShowParametres(false)} />}
    </div>
  );
}
