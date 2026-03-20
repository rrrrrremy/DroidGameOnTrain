/**
 * Generate synonyms/antonyms for all non-plural 5-letter words using Datamuse API.
 * Run with: node scripts/generate-synonyms.js
 * Output: src/utils/synonyms.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Replicate the word list and plural detection from computerPlayer.js
const WORDS_5 = [
  'ABOUT','ABOVE','AFTER','AGAIN','BASIC','BEACH','BLACK','BLAME','BLANK',
  'BLAST','BLAZE','BLEAK','BLEND','BLESS','BLIND','BLOCK','BLOND','BLOWN',
  'BOARD','BOAST','BONUS','BOOST','BOUND','BRAIN','BRAND','BRAVE','BREAD',
  'BREAK','BRICK','BRIDE','BRIEF','BRING','BROAD','BROKE','BROWN','BRUSH',
  'BUILD','BUILT','BUNCH','BURST','CABIN','CANDY','CARRY','CATCH','CAUSE',
  'CHAIR','CHALK','CHAMP','CHARM','CHASE','CHEAP','CHECK','CHEEK','CHEST',
  'CHIEF','CHILD','CHINA','CHUNK','CLAIM','CLASH','CLASS','CLEAN','CLEAR',
  'CLIMB','CLING','CLOCK','CLOSE','CLOTH','CLOUD','COACH','COAST','CORAL',
  'COUNT','COURT','COVER','CRACK','CRAFT','CRANE','CRASH','CRAWL','CRAZY',
  'CREAM','CRISP','CROSS','CROWD','CROWN','CRUSH','CURVE','DANCE','DEALT',
  'DECAY','DELTA','DEPOT','DEPTH','DIRTY','DOUBT','DRAFT','DRAIN','DRAKE',
  'DRAMA','DRANK','DRAWN','DREAM','DRESS','DRIFT','DRILL','DRINK','DRIVE',
  'DROIT','DROOL','DROPS','DROVE','DRUNK','DRYER','DWELT','EAGER','EARLY',
  'EARTH','EIGHT','ELITE','EMPTY','ENEMY','ENJOY','ENTER','EQUAL','ERROR',
  'EVENT','EVERY','EXACT','EXIST','EXTRA','FAINT','FAITH','FALSE','FEAST',
  'FENCE','FETCH','FEVER','FIELD','FIFTH','FIFTY','FIGHT','FINAL','FIRST',
  'FIXED','FLAME','FLASH','FLEET','FLESH','FLINT','FLOAT','FLOCK','FLOOD',
  'FLOOR','FLOUR','FLOWN','FLUID','FLUSH','FORCE','FORGE','FORTH','FORUM',
  'FOUND','FRAME','FRANK','FRAUD','FRESH','FRONT','FROST','FRUIT','GIANT',
  'GIVEN','GLAND','GLASS','GLEAM','GLIDE','GLOBE','GLOOM','GLORY','GLOSS',
  'GLYPH','GOING','GRACE','GRADE','GRAIN','GRAND','GRANT','GRAPE','GRASP',
  'GRASS','GRAVE','GREAT','GREEN','GREET','GRIEF','GRIND','GROSS','GROUP',
  'GROWN','GUARD','GUESS','GUEST','GUIDE','GUILT','HABIT','HAPPY','HARSH',
  'HAVEN','HEART','HEAVY','HENCE','HERBS','HORSE','HOTEL','HOUSE','HUMAN',
  'HUMOR','IDEAL','IMAGE','IMPLY','INDEX','INNER','INPUT','ISSUE','IVORY',
  'JOINT','JOKER','JUDGE','JUICE','KNACK','KNELT','KNIFE','KNOCK','KNOWN',
  'LABEL','LARGE','LASER','LAUGH','LAYER','LEARN','LEAST','LEAVE','LEGAL',
  'LEVEL','LIGHT','LIMIT','LINKS','LOFTY','LOGIC','LOOSE','LOVER','LOWER',
  'LOYAL','LUNCH','MAGIC','MAJOR','MAKER','MANOR','MAPLE','MARCH','MATCH',
  'MAYOR','MEDIA','MERCY','MERIT','METAL','MIDST','MIGHT','MINOR','MINUS',
  'MODEL','MONEY','MONTH','MORAL','MOTOR','MOUNT','MOUSE','MOUTH','MOVED',
  'MOVIE','MUSIC','NASAL','NERVE','NEVER','NIGHT','NOBLE','NOISE','NORTH',
  'NOTED','NOVEL','NURSE','OCEAN','OFFER','OFTEN','OLIVE','ORDER','OTHER',
  'OUTER','OWNED','OWNER','PAINT','PANEL','PANIC','PARTY','PATCH','PAUSE',
  'PEACE','PEACH','PEARL','PENNY','PERCH','PHASE','PHONE','PHOTO','PIANO',
  'PIECE','PILOT','PINCH','PITCH','PIXEL','PLACE','PLAIN','PLANE','PLANT',
  'PLATE','PLAZA','PLEAD','PLUMB','PLUME','POINT','POLAR','POUND','POWER',
  'PRESS','PRICE','PRIDE','PRIME','PRINT','PRIOR','PRIZE','PROBE','PROOF',
  'PROUD','PROVE','PROXY','PULSE','PUNCH','PUPIL','QUAKE','QUEEN','QUEST',
  'QUICK','QUIET','QUIRK','QUITE','QUOTA','QUOTE','RADAR','RADIO','RAISE',
  'RALLY','RANCH','RANGE','RAPID','RATIO','REACH','READY','REALM','REIGN',
  'RELAX','REPLY','RIDER','RIDGE','RIGHT','RIGID','RISEN','RISKY','RIVAL',
  'RIVER','ROBIN','ROCKY','ROUGH','ROUND','ROUTE','ROYAL','RULER','RURAL',
  'SAINT','SALAD','SAUCE','SCALE','SCENE','SCOPE','SCORE','SCRAP','SENSE',
  'SERVE','SETUP','SEVEN','SHALL','SHAME','SHAPE','SHARE','SHARK','SHARP',
  'SHELF','SHELL','SHIFT','SHINE','SHIRT','SHOCK','SHORE','SHORT','SHOUT',
  'SHOWN','SIGHT','SINCE','SIXTH','SIXTY','SIZED','SKILL','SKULL','SLASH',
  'SLAVE','SLEEP','SLICE','SLIDE','SLOPE','SMALL','SMART','SMELL','SMILE',
  'SMOKE','SNACK','SOLAR','SOLID','SOLVE','SOUTH','SPACE','SPARE','SPARK',
  'SPAWN','SPEAK','SPEND','SPENT','SPICE','SPINE','SPLIT','SPOKE','SPORT',
  'SPRAY','STACK','STAFF','STAGE','STAIN','STAKE','STALE','STALL','STAMP',
  'STAND','STARK','START','STATE','STAVE','STEAL','STEAM','STEEL','STEEP',
  'STEER','STERN','STICK','STILL','STOCK','STOKE','STONE','STOOD','STORE',
  'STORM','STORY','STOVE','STRAP','STRAW','STRIP','STUCK','STUFF','STUNG',
  'STUNT','STYLE','SUGAR','SUITE','SUNNY','SUPER','SURGE','SWAMP','SWEAR',
  'SWEEP','SWEET','SWEPT','SWIFT','SWING','SWORD','SWORE','SWORN','TEACH',
  'TEETH','THANK','THEME','THICK','THING','THINK','THIRD','THORN','THREE',
  'THROW','THUMB','TIGER','TIGHT','TIRED','TITLE','TODAY','TOKEN','TOTAL',
  'TOUCH','TOUGH','TOWER','TOXIC','TRACE','TRACK','TRADE','TRAIL','TRAIN',
  'TRAIT','TRASH','TREAT','TREND','TRIAL','TRIBE','TRICK','TRIED','TRUCK',
  'TRULY','TRUMP','TRUNK','TRUST','TRUTH','TULIP','TUMOR','TUNER','TWICE',
  'TWIST','ULTRA','UNCLE','UNDER','UNION','UNITE','UNITY','UNTIL','UPPER',
  'UPSET','URBAN','USAGE','USUAL','VALID','VALUE','VIDEO','VIGOR','VINYL',
  'VIOLA','VIRUS','VISIT','VITAL','VIVID','VOCAL','VOICE','VOTER','WAGES',
  'WASTE','WATCH','WATER','WEARY','WEAVE','WEDGE','WEIRD','WHALE','WHEAT',
  'WHEEL','WHERE','WHICH','WHILE','WHITE','WHOLE','WHOSE','WIDER','WOMAN',
  'WORLD','WORRY','WORSE','WORST','WORTH','WOULD','WOUND','WRATH','WRITE',
  'WRONG','WROTE','YACHT','YIELD','YOUNG','YOUTH',
  // plurals - kept for reference but filtered out below
  'ACIDS','ACRES','ALARM','ANGEL','ASKED','ATOMS','BANDS','BANKS','BARNS',
  'BEARS','BEATS','BELLS','BIKES','BIRDS','BITES','BLOWS','BOATS','BOLTS',
  'BOMBS','BONDS','BONES','BOOKS','BOOTS','BOXES','BULLS','BURNS','BUSES',
  'CAKES','CALLS','CAMPS','CAPES','CARDS','CARTS','CAVES','CELLS','CENTS',
  'CHIPS','CLAWS','CLIPS','CLUBS','CLUES','COALS','COATS','CODES','COILS',
  'ACTED','ADDED','AIMED','ASKED','BAKED','BASED','BORED','BOXED','CAGED',
  'CARED','CASED','CITED','CODED','COPED','CORED','CURED','DARED','DATED',
];

const ALL_WORDS_SET = new Set(WORDS_5);
const isPlural = (word) => word.endsWith('S') && ALL_WORDS_SET.has(word.slice(0, -1));
const NON_PLURAL = [...new Set(WORDS_5)].filter(w => !isPlural(w));

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

async function getHints(word) {
  const lower = word.toLowerCase();
  const [syns, ants] = await Promise.all([
    fetch(`https://api.datamuse.com/words?rel_syn=${lower}&max=8`),
    fetch(`https://api.datamuse.com/words?rel_ant=${lower}&max=5`),
  ]);
  const hints = [];
  for (const item of ants) {
    const h = item.word.toUpperCase();
    if (h !== word && h.length >= 3) hints.push({ word: h, type: 'antonym' });
  }
  for (const item of syns) {
    const h = item.word.toUpperCase();
    if (h !== word && h.length >= 3 && !h.includes(' ')) hints.push({ word: h, type: 'synonym' });
  }
  return hints.slice(0, 6);
}

async function main() {
  const result = {};
  const total = NON_PLURAL.length;
  let done = 0;

  for (const word of NON_PLURAL) {
    const hints = await getHints(word);
    if (hints.length > 0) result[word] = hints;
    done++;
    if (done % 50 === 0) process.stdout.write(`\r${done}/${total}...`);
    // Rate limit: ~2 requests per word, keep under 100/s
    await new Promise(r => setTimeout(r, 30));
  }

  process.stdout.write('\n');
  const outPath = path.join(__dirname, '../src/utils/synonyms.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${Object.keys(result).length} entries to synonyms.json`);
}

main().catch(console.error);
