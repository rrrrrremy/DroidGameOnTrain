/**
 * Computer Player (Player 1) — generates a valid crossword board.
 *
 * Board word slots (from getActiveRuns):
 *   Row 1: 5-letter word at (0,1)→(4,1)
 *   Row 2: 3-letter word at (1,2)→(3,2)
 *   Row 3: 3-letter word at (1,3)→(3,3)
 *   Col 1: 4-letter word at (1,1)→(1,4)
 *   Col 2: 4-letter word at (2,0)→(2,3)
 *   Col 3: 4-letter word at (3,1)→(3,4)
 *
 * Intersection constraints:
 *   (1,1): Row1[1] = Col1[0]
 *   (2,1): Row1[2] = Col2[1]
 *   (3,1): Row1[3] = Col3[0]
 *   (1,2): Row2[0] = Col1[1]
 *   (2,2): Row2[1] = Col2[2]
 *   (3,2): Row2[2] = Col3[1]
 *   (1,3): Row3[0] = Col1[2]
 *   (2,3): Row3[1] = Col2[3]
 *   (3,3): Row3[2] = Col3[2]
 */

// ── Word lists ─────────────────────────────────────────────────────────────

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
];

const WORDS_4 = [
  'ABLE','ACID','AGED','AIDE','ALLY','ARCH','AREA','ARMY','AUNT','AXIS',
  'BACK','BAKE','BALD','BALL','BAND','BANK','BARE','BARK','BARN','BASE',
  'BATH','BEAD','BEAM','BEAN','BEAR','BEAT','BEEN','BEER','BELL','BELT',
  'BEND','BEST','BIKE','BILL','BIND','BIRD','BITE','BLOW','BLUE','BLUR',
  'BOAT','BODY','BOLD','BOLT','BOMB','BOND','BONE','BOOK','BOOM','BOOT',
  'BORE','BORN','BOSS','BOTH','BOWL','BULK','BULL','BURN','BUSH','BUSY',
  'CAFE','CAGE','CAKE','CALF','CALL','CALM','CAME','CAMP','CAPE','CARD',
  'CARE','CART','CASE','CASH','CAST','CAVE','CHAT','CHIP','CHOP','CITE',
  'CITY','CLAD','CLAM','CLAP','CLAW','CLAY','CLIP','CLUB','CLUE','COAL',
  'COAT','CODE','COIL','COIN','COLD','COME','CONE','COOK','COOL','COPE',
  'COPY','CORD','CORE','CORK','CORN','COST','COUP','CREW','CROP','CUBE',
  'CULT','CURB','CURE','CURL','CUTE','DALE','DAMP','DARE','DARK','DART',
  'DASH','DATA','DATE','DAWN','DEAD','DEAF','DEAL','DEAR','DEBT','DECK',
  'DEED','DEEM','DEEP','DEER','DEMO','DENY','DESK','DIAL','DICE','DIET',
  'DIRT','DISC','DISH','DOCK','DOES','DOME','DONE','DOOM','DOOR','DOSE',
  'DOWN','DRAG','DRAW','DREW','DROP','DRUM','DUAL','DUCK','DUEL','DUKE',
  'DULL','DUMB','DUMP','DUNE','DUSK','DUST','DUTY','EACH','EARN','EASE',
  'EAST','EASY','EDGE','EDIT','ELSE','EMIT','EPIC','EVEN','EVER','EVIL',
  'EXAM','EXEC','EXIT','FACE','FACT','FADE','FAIL','FAIR','FAKE','FALL',
  'FAME','FANG','FARE','FARM','FAST','FATE','FEAR','FEAT','FEED','FEEL',
  'FEET','FELL','FELT','FERN','FEST','FILE','FILL','FILM','FIND','FINE',
  'FIRE','FIRM','FISH','FIST','FLAG','FLAP','FLAT','FLAW','FLED','FLEW',
  'FLIP','FLOG','FLOW','FOAM','FOLD','FOLK','FOND','FONT','FOOD','FOOL',
  'FOOT','FORD','FORE','FORK','FORM','FORT','FOUL','FOUR','FREE','FROM',
  'FUEL','FULL','FUND','FURY','FUSE','GAIT','GALE','GAME','GANG','GATE',
  'GAVE','GAZE','GEAR','GENE','GIFT','GIRL','GIVE','GLAD','GLOW','GLUE',
  'GOAT','GOES','GOLD','GOLF','GONE','GOOD','GRAB','GRAM','GRAY','GREW',
  'GRID','GRIM','GRIN','GRIP','GRIT','GROW','GULF','GUST','HACK','HAIL',
  'HAIR','HALE','HALF','HALL','HALT','HAND','HANG','HARD','HARE','HARM',
  'HATE','HAUL','HAVE','HAZE','HEAD','HEAL','HEAP','HEAR','HEAT','HEEL',
  'HELD','HELP','HERB','HERD','HERE','HERO','HIDE','HIGH','HIKE','HILL',
  'HINT','HIRE','HOLD','HOLE','HOME','HOOD','HOOK','HOPE','HORN','HOST',
  'HOUR','HUGE','HULL','HUNG','HUNT','HURT','HYMN','ICON','IDEA','INCH',
  'INTO','IRON','ISLE','ITEM','JACK','JADE','JAIL','JAZZ','JERK','JEST',
  'JOBS','JOIN','JOKE','JOLT','JUMP','JURY','JUST','KEEN','KEEP','KEPT',
  'KICK','KIDS','KILL','KIND','KING','KISS','KITE','KNEE','KNEW','KNIT',
  'KNOB','KNOT','KNOW','LACE','LACK','LAID','LAKE','LAMB','LAME','LAMP',
  'LAND','LANE','LAPS','LAST','LATE','LAWN','LEAD','LEAK','LEAN','LEAP',
  'LEFT','LEND','LENS','LESS','LICK','LIED','LIFE','LIFT','LIKE','LIMB',
  'LIME','LIMP','LINE','LINK','LINT','LION','LIST','LIVE','LOAD','LOAF',
  'LOAN','LOCK','LOFT','LONE','LONG','LOOK','LOOM','LORD','LOSE','LOSS',
  'LOST','LOUD','LOVE','LUCK','LUMP','LUNG','LURE','LURK','LUSH','MACE',
  'MADE','MAIL','MAIN','MAKE','MALE','MALT','MANE','MANY','MARE','MARK',
  'MASK','MASS','MATE','MAZE','MEAL','MEAN','MEAT','MEET','MELD','MELT',
  'MEMO','MEND','MENU','MERE','MESH','MESS','MILD','MILE','MILK','MILL',
  'MIND','MINE','MINT','MISS','MIST','MODE','MOLD','MOOD','MOON','MORE',
  'MOSS','MOST','MOTH','MOVE','MUCH','MUST','MYTH','NAIL','NAME','NAVY',
  'NEAR','NEAT','NECK','NEED','NEST','NEWS','NEXT','NICE','NINE','NODE',
  'NONE','NORM','NOSE','NOTE','NOUN','OATH','OBEY','ODDS','OMIT','ONCE',
  'ONLY','ONTO','OPEN','ORAL','OVEN','OVER','PACE','PACK','PAGE','PAID',
  'PAIL','PAIN','PAIR','PALE','PALM','PANE','PARK','PART','PASS','PAST',
  'PATH','PEAK','PEAL','PEAR','PEEL','PEER','PEST','PICK','PIER','PILE',
  'PILL','PINE','PINK','PIPE','PLAN','PLAY','PLEA','PLOT','PLOD','PLUG',
  'PLUM','PLUS','POEM','POET','POLE','POLL','POLO','POND','POOL','POOR',
  'POPE','PORK','PORT','POSE','POST','POUR','PRAY','PREY','PROP','PULL',
  'PULP','PUMP','PURE','PUSH','QUIT','RACE','RACK','RAGE','RAID','RAIL',
  'RAIN','RAKE','RAMP','RANG','RANK','RARE','RASH','RATE','RAVE','READ',
  'REAL','REAR','REEF','REEL','REIN','RELY','RENT','REST','RICE','RICH',
  'RIDE','RIFT','RING','RIOT','RISE','RISK','ROAD','ROAM','ROCK','RODE',
  'ROLE','ROLL','ROOF','ROOM','ROOT','ROPE','ROSE','RUIN','RULE','RUSH',
  'RUST','SAFE','SAGE','SAID','SAIL','SAKE','SALE','SALT','SAME','SAND',
  'SANE','SANG','SANK','SAVE','SEAL','SEAM','SEAT','SEED','SEEK','SEEM',
  'SEEN','SELF','SELL','SEND','SENT','SHED','SHIN','SHIP','SHOE','SHOP',
  'SHOT','SHOW','SHUT','SICK','SIDE','SIGH','SIGN','SILK','SINK','SITE',
  'SIZE','SKIN','SKIP','SLAB','SLAM','SLAP','SLED','SLEW','SLID','SLIM',
  'SLIP','SLOT','SLOW','SLUG','SNAP','SNOB','SNOW','SOAK','SOAP','SOAR',
  'SOCK','SODA','SOFA','SOFT','SOIL','SOLD','SOLE','SOME','SONG','SOON',
  'SORE','SORT','SOUL','SOUR','SPAN','SPAR','SPEC','SPED','SPIN','SPIT',
  'SPOT','SPUR','STAB','STAR','STAY','STEM','STEP','STEW','STIR','STOP',
  'STUD','SUCH','SUCK','SUIT','SULK','SUNG','SUNK','SURE','SURF','SWAN',
  'SWAP','SWIM','TABS','TACK','TACT','TAIL','TAKE','TALE','TALK','TALL',
  'TAME','TANG','TANK','TAPE','TARE','TASK','TEAM','TEAR','TEEN','TELL',
  'TEND','TENS','TENT','TERM','TEST','TEXT','THAN','THAT','THEM','THEN',
  'THEY','THIN','THIS','TICK','TIDE','TIDY','TIED','TIER','TILE','TILL',
  'TILT','TIME','TINY','TIRE','TOAD','TOIL','TOLD','TOLL','TOMB','TONE',
  'TOOK','TOOL','TOPS','TORE','TORN','TORT','TOSS','TOUR','TOWN','TRAP',
  'TRAY','TREE','TREK','TRIM','TRIO','TRIP','TROT','TRUE','TUBE','TUCK',
  'TUNA','TUNE','TURF','TURN','TWIN','TYPE','UGLY','UNDO','UNIT','UNTO',
  'UPON','URGE','USED','USER','VAIN','VALE','VANE','VARY','VASE','VAST',
  'VEIL','VEIN','VENT','VERB','VERY','VEST','VIEW','VINE','VOID','VOLT',
  'VOTE','WADE','WAGE','WAIT','WAKE','WALK','WALL','WAND','WANT','WARD',
  'WARM','WARN','WARP','WARY','WASH','WASP','WAVE','WAVY','WAX','WEAK',
  'WEAR','WEED','WEEK','WELL','WENT','WERE','WEST','WHAT','WHEN','WHOM',
  'WIDE','WIFE','WILD','WILL','WILT','WIND','WINE','WING','WINK','WIPE',
  'WIRE','WISE','WISH','WITH','WOKE','WOLF','WOOD','WOOL','WORD','WORE',
  'WORK','WORM','WORN','WOVE','WRAP','YARD','YARN','YEAR','YELL','YOUR',
  'ZEAL','ZERO','ZONE','ZOOM',
];

const WORDS_3 = [
  'ACE','ACT','ADD','AGE','AGO','AID','AIM','AIR','ALE','ALL','AND','ANT',
  'ANY','APE','ARC','ARE','ARK','ARM','ART','ASH','ASK','ATE','AWE','AXE',
  'BAD','BAG','BAN','BAR','BAT','BAY','BED','BET','BIG','BIN','BIT','BOW',
  'BOX','BOY','BUD','BUG','BUN','BUS','BUY','BUT','CAB','CAN','CAP','CAR',
  'CAT','COP','COT','COW','CRY','CUB','CUD','CUP','CUR','CUT','DAB','DAD',
  'DAM','DAY','DEN','DEW','DID','DIG','DIM','DIP','DOC','DOG','DOT','DRY',
  'DUB','DUD','DUE','DUG','DUN','DUO','DYE','EAR','EAT','EEL','EGG','ELF',
  'ELK','ELM','EMU','END','ERA','EVE','EWE','EYE','FAN','FAR','FAT','FAX',
  'FED','FEE','FEW','FIG','FIN','FIR','FIT','FIX','FLU','FLY','FOB','FOE',
  'FOG','FOR','FOX','FRY','FUN','FUR','GAB','GAG','GAP','GAS','GAY','GEL',
  'GEM','GET','GIN','GNU','GOD','GOT','GUM','GUN','GUT','GUY','GYM','HAD',
  'HAM','HAS','HAT','HAY','HEN','HER','HEW','HID','HIM','HIP','HIS','HIT',
  'HOB','HOG','HOP','HOT','HOW','HUB','HUE','HUG','HUM','HUT','ICE','ICY',
  'ILL','IMP','INK','INN','ION','IRE','IRK','IVY','JAB','JAG','JAM','JAR',
  'JAW','JAY','JET','JOB','JOG','JOT','JOY','JUG','JUT','KEG','KEN','KEY',
  'KID','KIN','KIT','LAB','LAD','LAG','LAP','LAW','LAY','LED','LEG','LET',
  'LID','LIE','LIT','LOG','LOT','LOW','LUG','MAD','MAN','MAP','MAR','MAT',
  'MAW','MAY','MEN','MET','MIX','MOB','MOM','MOP','MOW','MUD','MUG','NAB',
  'NAG','NAP','NET','NEW','NIL','NIT','NOD','NOR','NOT','NOW','NUB','NUN',
  'NUT','OAK','OAR','OAT','ODD','ODE','OFF','OFT','OIL','OLD','ONE','OPT',
  'ORB','ORE','OUR','OUT','OWE','OWL','OWN','PAD','PAN','PAT','PAW','PAY',
  'PEA','PEG','PEN','PEP','PER','PET','PIE','PIG','PIN','PIT','PLY','POD',
  'POP','POT','POW','PRY','PUB','PUG','PUN','PUP','PUS','PUT','RAG','RAM',
  'RAN','RAP','RAT','RAW','RAY','RED','REF','RIB','RID','RIG','RIM','RIP',
  'ROB','ROD','ROT','ROW','RUB','RUG','RUM','RUN','RUT','RYE','SAD','SAG',
  'SAP','SAT','SAW','SAY','SEA','SET','SEW','SHE','SHY','SIN','SIP','SIR',
  'SIS','SIT','SIX','SKI','SKY','SLY','SOB','SOD','SON','SOP','SOT','SOW',
  'SOY','SPA','SPY','STY','SUB','SUM','SUN','TAB','TAD','TAG','TAN','TAP',
  'TAR','TAT','TAX','TEA','TEN','THE','TIE','TIN','TIP','TOE','TON','TOO',
  'TOP','TOW','TOY','TUB','TUG','TWO','URN','USE','VAN','VAT','VET','VEX',
  'VIA','VIE','VOW','WAD','WAR','WAS','WAX','WAY','WEB','WED','WET','WHO',
  'WIG','WIN','WIT','WOE','WOK','WON','WOO','WOW','YAK','YAM','YAP','YAW',
  'YEA','YES','YET','YEW','YOU','ZAP','ZEN','ZIP','ZIT','ZOO',
];

// ── Index words by letter at each position ─────────────────────────────────

const buildIndex = (words) => {
  // index[pos][letter] = [words...]
  const index = {};
  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      if (!index[i]) index[i] = {};
      const ch = word[i];
      if (!index[i][ch]) index[i][ch] = [];
      index[i][ch].push(word);
    }
  }
  return index;
};

const IDX4 = buildIndex(WORDS_4);

// ── Shuffle helper ─────────────────────────────────────────────────────────

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Filter words matching constraints: { position: letter }
const filterWords = (words, index, constraints) => {
  let candidates = null;
  for (const [pos, letter] of Object.entries(constraints)) {
    const p = Number(pos);
    const matching = (index[p] && index[p][letter]) || [];
    if (candidates === null) {
      candidates = new Set(matching);
    } else {
      const matchSet = new Set(matching);
      for (const w of candidates) {
        if (!matchSet.has(w)) candidates.delete(w);
      }
    }
  }
  return candidates ? [...candidates] : [...words];
};

// ── Crossword generator using backtracking ─────────────────────────────────

/**
 * Generates a valid crossword board.
 * Returns a 5x5 2D array or null on failure.
 */
export const generateComputerBoard = () => {
  // Try multiple times with different random orderings
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = tryGenerate();
    if (result) return result;
  }
  return null;
};

const tryGenerate = () => {
  // Step 1: Pick a random 5-letter word for Row 1
  const row1Candidates = shuffle(WORDS_5);

  for (const row1 of row1Candidates.slice(0, 50)) {
    // Row 1 letters at positions: row1[0]@(0,1), row1[1]@(1,1), row1[2]@(2,1), row1[3]@(3,1), row1[4]@(4,1)

    // Step 2: Pick Col 1 (4-letter) where col1[0] = row1[1]
    const col1Candidates = shuffle(filterWords(WORDS_4, IDX4, { 0: row1[1] }));
    if (col1Candidates.length === 0) continue;

    for (const col1 of col1Candidates.slice(0, 10)) {
      // col1: col1[0]@(1,1), col1[1]@(1,2), col1[2]@(1,3), col1[3]@(1,4)

      // Step 3: Pick Col 2 (4-letter) where col2[1] = row1[2]
      const col2Candidates = shuffle(filterWords(WORDS_4, IDX4, { 1: row1[2] }));
      if (col2Candidates.length === 0) continue;

      for (const col2 of col2Candidates.slice(0, 10)) {
        // col2: col2[0]@(2,0), col2[1]@(2,1), col2[2]@(2,2), col2[3]@(2,3)

        // Step 4: Pick Col 3 (4-letter) where col3[0] = row1[3]
        const col3Candidates = shuffle(filterWords(WORDS_4, IDX4, { 0: row1[3] }));
        if (col3Candidates.length === 0) continue;

        for (const col3 of col3Candidates.slice(0, 10)) {
          // col3: col3[0]@(3,1), col3[1]@(3,2), col3[2]@(3,3), col3[3]@(3,4)

          // Step 5: Row 2 (3-letter) must be: col1[1], col2[2], col3[1]
          const row2 = col1[1] + col2[2] + col3[1];

          // Step 6: Row 3 (3-letter) must be: col1[2], col2[3], col3[2]
          const row3 = col1[2] + col2[3] + col3[2];

          // Check Row 2 and Row 3 are real words
          if (WORDS_3.includes(row2) && WORDS_3.includes(row3)) {
            // Build the board!
            const board = Array(5).fill(null).map(() => Array(5).fill(null));

            // Row 1: y=1, x=0..4
            for (let x = 0; x < 5; x++) board[1][x] = row1[x];

            // Col 1: x=1, y=1..4
            for (let i = 0; i < 4; i++) board[1 + i][1] = col1[i];

            // Col 2: x=2, y=0..3
            for (let i = 0; i < 4; i++) board[i][2] = col2[i];

            // Col 3: x=3, y=1..4
            for (let i = 0; i < 4; i++) board[1 + i][3] = col3[i];

            // Row 2 & Row 3 are already set by the column fills
            // Just verify:
            // board[2][1]=col1[1], board[2][2]=col2[2], board[2][3]=col3[1] ✓

            return board;
          }
        }
      }
    }
  }

  return null;
};
