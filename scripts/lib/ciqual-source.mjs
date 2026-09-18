/**
 * Acquisition de la table CIQUAL de l'ANSES.
 *
 * Source: Recherche Data Gouv (entrepôt Dataverse gouvernemental), qui publie la
 * table sous DOI avec son numéro de version, sa date de publication et sa
 * licence — les trois valeurs que le principe II exige et que le script
 * précédent portait par SAISIE À LA MAIN, donc sans garantie.
 *
 * Deux modes:
 *   - `fetchCiqual()` interroge l'API et met les fichiers en cache hors dépôt;
 *   - `readLocalCiqual(dir)` lit un répertoire déjà décompressé, pour rejouer
 *     une construction hors ligne. La version et la date sont alors déduites des
 *     noms de fichiers, et leur absence fait échouer la construction: le mode
 *     hors ligne n'exonère pas de la traçabilité.
 *
 * L'encodage n'est jamais supposé: il se déduit du BOM ou de la déclaration XML.
 * Les fichiers du millésime 2020 sont en windows-1252, ceux de 2025 en UTF-8
 * avec BOM, et décoder les seconds comme les premiers corrompt tous les accents.
 */
import fs from 'node:fs';
import path from 'node:path';

const DOI = 'doi:10.57745/RDMHWY';
const API = 'https://entrepot.recherche.data.gouv.fr/api';
const LICENCE_ATTENDUE = 'etalab 2.0';
const CACHE_DIR = '.cache/ciqual';

/** Fichiers nécessaires, par rôle. Les noms portent la date du millésime. */
const ROLES = ['alim', 'alim_grp', 'compo'];

function decodeBuffer(buf) {
  // BOM UTF-8, puis déclaration XML, puis repli windows-1252: c'est l'encodage
  // des millésimes antérieurs, qui ne le déclarent pas toujours.
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.toString('utf8').replace(/^﻿/, '');
  }
  const entete = buf.subarray(0, 120).toString('latin1');
  const declare = /encoding\s*=\s*["']([^"']+)["']/i.exec(entete);
  if (declare && /utf-?8/i.test(declare[1])) return buf.toString('utf8');
  return new TextDecoder('windows-1252').decode(buf);
}

/** Indexe les fichiers d'un répertoire par rôle: alim_2025_11_03.xml -> alim. */
function indexByRole(filenames) {
  const byRole = {};
  for (const role of ROLES) {
    // Le rôle est le préfixe avant la date. « alim » ne doit pas capter
    // « alim_grp »: on exige que la suite commence par un chiffre.
    const hit = filenames.find((f) => new RegExp('^' + role + '_\\d').test(f));
    if (hit) byRole[role] = hit;
  }
  return byRole;
}

function echec(message) {
  console.error('Construction interrompue: ' + message);
  console.error('Aucun catalogue n\'a été écrit.');
  process.exit(1);
}

export function readLocalCiqual(dir) {
  if (!fs.existsSync(dir)) echec('répertoire introuvable: ' + dir);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.xml'));
  const byRole = indexByRole(files);
  for (const role of ROLES) {
    if (!byRole[role]) echec('fichier « ' + role + '_<date>.xml » absent de ' + dir);
  }

  // La version se lit dans le nom des fichiers: alim_2025_11_03.xml -> 2025-11-03.
  const date = /_(\d{4})[_-](\d{2})[_-](\d{2})\.xml$/.exec(byRole.alim);
  if (!date) echec('impossible de lire le millésime dans « ' + byRole.alim + ' »: la version ne peut pas être saisie à la main (FR-209)');
  const version = date[1] + '-' + date[2] + '-' + date[3];

  return {
    read: (asked) => decodeBuffer(fs.readFileSync(path.join(dir, byRole[roleOf(asked)] ?? asked))),
    dataset: {
      doi: DOI,
      version: 'Ciqual ' + date[1] + ' (' + version + ')',
      published_at: version,
      license: LICENCE_ATTENDUE,
      files: ROLES.map((r) => ({
        id: 'local',
        filename: byRole[r],
        bytes: fs.statSync(path.join(dir, byRole[r])).size,
      })),
    },
    retrieved_at: new Date().toISOString().slice(0, 10),
  };
}

/** Le script demande « alim_grp », le rôle est « alim_grp ». */
const roleOf = (asked) => {
  const base = asked.replace(/_\d.*$/, '').replace(/\.xml$/, '');
  return ROLES.includes(base) ? base : asked;
};

const MAX_TENTATIVES = 6;

/**
 * Télécharge un fichier en reprenant là où il s'est arrêté.
 *
 * L'entrepôt coupe régulièrement la connexion sur le fichier de composition, qui
 * pèse près de 70 Mo: un téléchargement d'une seule traite échoue plus souvent
 * qu'il ne réussit. La reprise par en-tête `Range` transforme un échec en
 * attente, et la taille annoncée par l'API sert de contrôle final — un fichier
 * tronqué produirait un catalogue silencieusement amputé.
 */
async function telecharger(url, cible, entry) {
  const partiel = cible + '.partiel';
  for (let tentative = 1; tentative <= MAX_TENTATIVES; tentative += 1) {
    let deja = fs.existsSync(partiel) ? fs.statSync(partiel).size : 0;
    if (entry.filesize && deja === entry.filesize) break;
    // Un fragment PLUS GROS que le fichier annoncé n'est pas récupérable: il
    // demanderait une plage qui n'existe pas (416) et boucherait toutes les
    // tentatives. C'est arrivé pour de bon — deux constructions lancées en
    // parallèle écrivaient dans le même fragment. On repart de zéro.
    if (entry.filesize && deja > entry.filesize) {
      console.error('  fragment aberrant (' + deja + ' octets pour ' + entry.filesize +
        ' annoncés), reprise à zéro…');
      fs.rmSync(partiel, { force: true });
      deja = 0;
    }
    try {
      const res = await fetch(url, deja > 0 ? { headers: { Range: 'bytes=' + deja + '-' } } : undefined);
      // 416: la plage demandée n'existe pas côté serveur. Le fragment local est
      // alors inexploitable, quelle qu'en soit la raison.
      if (res.status === 416) {
        fs.rmSync(partiel, { force: true });
        throw new Error('plage refusée par le serveur, fragment écarté');
      }
      if (!res.ok && res.status !== 206) {
        throw new Error('réponse ' + res.status + ' ' + res.statusText);
      }
      // Le serveur peut ignorer la demande de reprise: on repart alors de zéro
      // plutôt que de coller un fichier complet à la suite d'un fragment.
      const reprise = res.status === 206;
      const flux = fs.createWriteStream(partiel, { flags: reprise ? 'a' : 'w' });
      try {
        for await (const morceau of res.body) flux.write(morceau);
      } finally {
        // Le flux doit être fermé même si le corps de la réponse casse en cours
        // de route. Sans ce `finally`, ses écritures en attente se mêlaient à
        // celles du flux d'ajout ouvert par la tentative suivante, sur le même
        // fichier — et le fragment finissait plus gros que le fichier annoncé.
        await new Promise((ok, ko) => flux.end((err) => (err ? ko(err) : ok())));
      }
    } catch (err) {
      if (tentative === MAX_TENTATIVES) {
        echec('téléchargement de « ' + entry.filename + ' » échoué après ' + MAX_TENTATIVES +
          ' tentatives (' + (err?.message ?? err) + ')');
      }
      console.error('  reprise de « ' + entry.filename +' » (tentative ' + (tentative + 1) + ')…');
      continue;
    }
    if (!entry.filesize || fs.statSync(partiel).size === entry.filesize) break;
  }

  const obtenu = fs.statSync(partiel).size;
  if (entry.filesize && obtenu !== entry.filesize) {
    echec('« ' + entry.filename + ' » fait ' + obtenu + ' octets au lieu des ' +
      entry.filesize + ' annoncés par l\'API');
  }
  fs.renameSync(partiel, cible);
}

export async function fetchCiqual({ version } = {}) {
  const url = API + '/datasets/:persistentId/?persistentId=' + DOI +
    (version ? '&version=' + encodeURIComponent(version) : '');

  let payload;
  try {
    const res = await fetch(url);
    if (!res.ok) echec('l\'API a répondu ' + res.status + ' ' + res.statusText);
    payload = await res.json();
  } catch (err) {
    echec('source injoignable (' + (err?.message ?? err) + ')');
  }

  const v = payload?.data?.latestVersion ?? payload?.data;
  if (!v) echec('réponse de l\'API inexploitable: aucune version de jeu de données');

  const numero = v.versionNumber !== undefined ? v.versionNumber + '.' + v.versionMinorNumber : undefined;
  const publie = v.releaseTime;
  const licence = v.license?.name ?? v.termsOfUse;
  if (!numero) echec('numéro de version absent de la réponse — il ne peut pas être suppléé (FR-209)');
  if (!publie) echec('date de publication absente de la réponse (FR-209)');
  if (!licence) echec('licence absente de la réponse (FR-210)');
  if (licence.toLowerCase() !== LICENCE_ATTENDUE) {
    echec('licence inattendue: « ' + licence +' » au lieu de « ' + LICENCE_ATTENDUE +
      ' ». Un changement de licence est une décision, pas un détail (FR-210)');
  }

  const xml = (v.files ?? []).filter((f) => f.dataFile?.filename?.endsWith('.xml'));
  const byRole = indexByRole(xml.map((f) => f.dataFile.filename));
  for (const role of ROLES) {
    if (!byRole[role]) echec('fichier « ' + role + '_<date>.xml » absent du jeu de données');
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const retenus = {};
  for (const role of ROLES) {
    const entry = xml.find((f) => f.dataFile.filename === byRole[role]).dataFile;
    const cible = path.join(CACHE_DIR, entry.filename);
    // Le fichier de composition pèse près de 70 Mo: il est mis en cache hors du
    // dépôt, et le cache n'est réutilisé que si sa taille correspond à
    // l'annonce de l'API.
    if (!fs.existsSync(cible) || fs.statSync(cible).size !== entry.filesize) {
      await telecharger(API + '/access/datafile/' + entry.id, cible, entry);
    }
    retenus[role] = { id: entry.id, filename: entry.filename, bytes: entry.filesize, path: cible };
  }

  return {
    read: (asked) => decodeBuffer(fs.readFileSync(retenus[roleOf(asked)].path)),
    dataset: {
      doi: DOI,
      version: numero,
      published_at: publie,
      license: licence,
      files: ROLES.map((r) => ({
        id: retenus[r].id, filename: retenus[r].filename, bytes: retenus[r].bytes,
      })),
    },
    retrieved_at: new Date().toISOString().slice(0, 10),
  };
}
