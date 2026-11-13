// ===== The Wand Chooses v2 — Catch-the-Number backend =====
// Run setup() once, then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone)

const WOODS = ['Holly','Elder','Yew','Willow','Vine','Cherry','Hawthorn','Ash','Walnut','Cedar'];
const CORES = ['Phoenix feather','Dragon heartstring','Unicorn hair','Thestral tail hair','Veela hair'];
const CLUES_EASY = {
  0: ['How many wands does a Muggle own?', 'Cookies left after Ron visits the kitchen?'],
  1: ['How many Boys Who Lived are there?', "How many Philosopher's Stones are there?"],
  2: ['How many Weasley twins are there?', 'How many eyes does a wizard have?'],
  3: ['How many heads does Fluffy have?', 'How many Deathly Hallows are there?'],
  4: ['How many feet does a dog have?', 'How many houses are in Hogwarts?'],
  5: ["How many fingers on one wizard's hand?", 'How many points does a star have?'],
  6: ['How many Weasley brothers (not counting Ginny)?', 'How many legs does a beetle have?'],
  7: ['How many years do you study at Hogwarts?', 'How many Harry Potter books are there?'],
  8: ['How many legs does Aragog the spider have?', 'How many arms does an octopus have?'],
  9: ["How many lives does Mrs Norris the cat have?", 'Platform ___ and three-quarters?']
};
// Medium riddles: runes 4 to (last-2). Simple maths plus Quidditch trivia
const CLUES_MID = {
  0: ['7 - 7 = ?', '5 x 0 = ?'], 1: ['10 / 10 = ?', '4 - 3 = ?'], 2: ['6 / 3 = ?', '8 - 6 = ?'],
  3: ['9 / 3 = ?', 'How many hoops does one Quidditch team defend?'],
  4: ['2 x 2 = ?', 'How many balls are in a Quidditch game?'], 5: ['15 / 3 = ?', '10 / 2 = ?'],
  6: ['3 x 2 = ?', '12 / 2 = ?'], 7: ['How many players on one Quidditch team?', '14 / 2 = ?'],
  8: ['16 / 2 = ?', '2 x 4 = ?'], 9: ['3 x 3 = ?', '18 / 2 = ?']
};
// Dark Arts riddles: the last 2 runes. Two-step thinking
const CLUES_HARD = {
  0: ['(9 - 3) - 6 = ?', '(4 x 5) - 20 = ?'], 1: ['(2 x 5) - 9 = ?', '(8 / 4) - 1 = ?'],
  2: ['(3 + 5) / 4 = ?', '(7 - 3) / 2 = ?'], 3: ['(7 + 2) / 3 = ?', '(2 x 4) - 5 = ?'],
  4: ['(10 - 2) / 2 = ?', '(3 x 3) - 5 = ?'], 5: ['(4 + 6) / 2 = ?', '(2 x 4) - 3 = ?'],
  6: ['(2 x 5) - 4 = ?', '(3 + 9) / 2 = ?'], 7: ['(3 x 3) - 2 = ?', '(5 + 9) / 2 = ?'],
  8: ['(2 x 6) - 4 = ?', '(4 x 4) / 2 = ?'], 9: ['(4 x 2) + 1 = ?', '(3 x 4) - 3 = ?']
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const API = { login: login, hit: hit, snitch: snitch, wand: wand };
  let out;
  try {
    if (!API[p.fn]) throw new Error('Unknown action.');
    out = { ok: true, data: API[p.fn].apply(null, JSON.parse(p.args || '[]')) };
  } catch (err) {
    out = { ok: false, error: String(err.message || err).replace(/^Error:\s*/, '') };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let p = ss.getSheetByName('Players');
  if (!p) {
    p = ss.insertSheet('Players');
    p.appendRow(['Code', 'Name', 'Role', 'Contact', 'Target']);
    p.appendRow(['DUMBLEDORE', 'The Boss', 'Boss', '09161234567', '']);
    p.appendRow(['HERMIONE1', 'Member One', 'Member', '09171234567', '']);
    p.appendRow(['RON2', 'Member Two', 'Member', '09181234567', '']);
    p.appendRow(['LUNA3', 'Member Three', 'Member', '09191234567', '']);
  }
  p.getRange('A:E').setNumberFormat('@');
  p.getRange('E1').setValue('Target');   // auto-filled: who each player must unlock
  const g = ss.getSheetByName('Game') || ss.insertSheet('Game');
  g.getRange('A:F').setNumberFormat('@');
  g.getRange(1, 1, 1, 6).setValues([['Code', 'Digits', 'Hits', 'Score', 'Misses', 'Snitch']]);
}

// ---------- helpers ----------
const diff_ = p => (p < 3 ? 0 : p - 2);
const digits_ = s => String(s || '').replace(/\D/g, '');
const sheet_ = n => SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n);
function lock_(fn) { const l = LockService.getScriptLock(); l.waitLock(15000); try { return fn(); } finally { l.releaseLock(); } }

function players_() {
  return sheet_('Players').getDataRange().getValues().slice(1).map((r, i) => ({
    id: i + 2, code: String(r[0]).trim().toUpperCase(), name: String(r[1]),
    contact: digits_(r[3]), target: String(r[4] || '').trim().toUpperCase()
  })).filter(p => p.code);
}

function who_(code, all) {
  code = String(code || '').trim().toUpperCase();
  const me = all.find(p => p.code === code);
  if (!me) throw new Error('The Sorting Hat does not know that code.');
  return me;
}

// Every player is assigned a DIFFERENT member's number (unique where possible)
function targetOf_(me, all) {
  let t = all.find(p => p.code === me.target);
  if (t && t.contact && t.code !== me.code) return t;
  const used = all.map(p => p.target).filter(Boolean);
  const pool = all.filter(p => p.code !== me.code && p.contact.length >= 7);
  if (!pool.length) throw new Error('No other member has a number yet.');
  const fresh = pool.filter(p => used.indexOf(p.code) < 0), c = fresh.length ? fresh : pool;
  t = c[Math.floor(Math.random() * c.length)];
  sheet_('Players').getRange(me.id, 5).setValue(t.code);
  me.target = t.code;
  return t;
}

function game_(code) {
  const v = sheet_('Game').getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]).toUpperCase() === code)
    return { row: i + 1, digits: String(v[i][1]), hits: Number(v[i][2]) || 0, score: Number(v[i][3]) || 0,
             misses: Number(v[i][4]) || 0, snitch: Number(v[i][5]) || 0 };
  return null;
}

function ensureGame_(me, t) {
  const blank = '-'.repeat(t.contact.length), sh = sheet_('Game');
  let g = game_(me.code);
  if (!g) { sh.appendRow([me.code, blank, '0', '0', '0', '0']); g = game_(me.code); }
  else if (g.digits.length !== blank.length) {
    sh.getRange(g.row, 2, 1, 5).setValues([[blank, '0', '0', '0', '0']]); g = game_(me.code);
  }
  return g;
}

function save_(g) {
  sheet_('Game').getRange(g.row, 2, 1, 5).setValues([[g.digits, String(g.hits), String(g.score), String(g.misses), String(g.snitch)]]);
}

function ctx_(code) {
  const all = players_(), me = who_(code, all), t = targetOf_(me, all);
  return { me: me, t: t, g: ensureGame_(me, t) };
}

// ---------- API ----------
function login(code) {
  return lock_(() => {
    const c = ctx_(code);
    const clues = c.t.contact.split('').map((d, i) => {
      const len = c.t.contact.length, list = (i < 3 ? CLUES_EASY : i >= len - 2 ? CLUES_HARD : CLUES_MID)[d], h = (c.me.code + i).split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
      return list[h % list.length];
    });
    return { name: c.me.name, code: c.me.code, target: c.t.name, len: c.t.contact.length,
             digits: c.g.digits, score: c.g.score, clues: clues };
  });
}

// Player caught a number. The wand destroys the 1st correct catch; the 2nd flies into the slot.
function hit(code, digit) {
  return lock_(() => {
    const c = ctx_(code), g = c.g, pos = g.digits.indexOf('-');
    if (pos < 0) throw new Error('This vault is already open.');
    digit = String(digit);
    if (digit !== c.t.contact[pos]) {
      const pen = 10 + 3 * diff_(pos);
      g.score = Math.max(0, g.score - pen); g.misses++; save_(g);
      return { ok: false, score: g.score, pen: pen };
    }
    g.hits++;
    if (g.hits < 2) { save_(g); return { ok: true, done: false, score: g.score }; }
    g.hits = 0; g.digits = g.digits.slice(0, pos) + digit + g.digits.slice(pos + 1); g.score += 100 + 20 * diff_(pos); save_(g);
    return { ok: true, done: true, pos: pos, digit: digit, score: g.score, complete: g.digits.indexOf('-') < 0 };
  });
}

function snitch(code) {
  return lock_(() => {
    const g = ctx_(code).g;
    if (g.snitch < 5) { g.snitch++; g.score += 50; save_(g); }
    return { score: g.score };
  });
}

function wand(code) {
  const c = ctx_(code);
  if (c.g.digits.indexOf('-') >= 0) throw new Error('The vault is still sealed.');
  const seed = (c.me.name + c.g.score).split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return { name: c.me.name, target: c.t.name, number: c.t.contact, points: c.g.score,
           max: c.t.contact.split('').reduce((s, _, p) => s + 100 + 20 * diff_(p), 250), wood: WOODS[seed % WOODS.length],
           core: CORES[(seed >> 1) % CORES.length], length: (9 + (seed % 50) / 10).toFixed(1) };
}
