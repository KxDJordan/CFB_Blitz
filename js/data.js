'use strict';
// ── STATIC GAME DATA ──────────────────────────────────────────────

const DATA = (() => {
  const FIRST = ['Jalen', 'Marcus', 'Tyler', 'Devin', 'Caleb', 'Jaylen', 'Bryce', 'Malik', 'Cameron', 'Trey', 'Darius', 'Isaiah', 'Xavier', 'Quentin', 'Brandon', 'Jordan', 'Elijah', 'Josiah', 'Tre', 'Kendall', 'Avery', 'Cole', 'Hunter', 'Garrett', 'Logan', 'Mason', 'Carter', 'Brady', 'Drew', 'Spencer', 'Tanner', 'Wyatt', 'Colby', 'Reid', 'Jace', 'Kobe', 'Amari', 'Jamari', 'Kyree', 'Zion', 'DeShawn', 'Terrell', 'Andre', 'Rashad', 'Lamar', 'Desmond', 'Keon', 'Micah', 'Nico', 'Mateo', 'Luis', 'Diego', 'Gabe', 'Sam', 'Ben', 'Luke', 'Jack', 'Owen', 'Eli', 'Grant', 'Rhett', 'Bo', 'Cade', 'Kase', 'Tate', 'Jett', 'Dallas', 'Austin', 'Chase', 'Blake', 'Dominic', 'Marquise', 'Jabari', 'Tavion', 'Kamari', 'Rodney', 'Cedric', 'Omar', 'Sione', 'Kalani', 'Mekhi', 'Jaxon', 'Ty', 'Roman', 'Silas', 'Ezra', 'Brock', 'Knox', 'Deion', 'Ladarius', 'Javon', 'Trevon', 'Keenan', 'Marcel', 'Reggie', 'Damon'];
  const LAST = ['Williams', 'Johnson', 'Smith', 'Brown', 'Jackson', 'Davis', 'Harris', 'Robinson', 'Walker', 'Thompson', 'White', 'Carter', 'Mitchell', 'Turner', 'Parker', 'Collins', 'Edwards', 'Stewart', 'Morris', 'Reed', 'Cook', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Bryant', 'Alexander', 'Russell', 'Griffin', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan', 'Wallace', 'Woods', 'Cole', 'West', 'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Marshall', 'Ortiz', 'Wells', 'Webb', 'Tucker', 'Porter', 'Hicks', 'Crawford', 'Boyd', 'Kennedy', 'Warren', 'Dixon', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Knight', 'Ferguson', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Stephens', 'Pierce', 'Hansen', 'Fuimaono', 'Tuiasosopo', 'Mauga', 'Okafor', 'Adebayo', 'Nwosu', 'Delacroix', 'Beaumont', 'Castillo', 'Vega', 'Sandoval', 'Whitaker', 'Lockhart', 'Prescott', 'Calloway'];
  const TOWNS = ['Houston, TX', 'Dallas, TX', 'Austin, TX', 'San Antonio, TX', 'Tyler, TX', 'Atlanta, GA', 'Valdosta, GA', 'Savannah, GA', 'Miami, FL', 'Tampa, FL', 'Jacksonville, FL', 'Orlando, FL', 'Birmingham, AL', 'Mobile, AL', 'Baton Rouge, LA', 'New Orleans, LA', 'Jackson, MS', 'Memphis, TN', 'Nashville, TN', 'Charlotte, NC', 'Raleigh, NC', 'Columbia, SC', 'Richmond, VA', 'Baltimore, MD', 'Philadelphia, PA', 'Pittsburgh, PA', 'Cleveland, OH', 'Columbus, OH', 'Cincinnati, OH', 'Detroit, MI', 'Chicago, IL', 'Indianapolis, IN', 'St. Louis, MO', 'Kansas City, MO', 'Omaha, NE', 'Wichita, KS', 'Tulsa, OK', 'Oklahoma City, OK', 'Denver, CO', 'Phoenix, AZ', 'Las Vegas, NV', 'Los Angeles, CA', 'San Diego, CA', 'Sacramento, CA', 'Fresno, CA', 'Portland, OR', 'Seattle, WA', 'Salt Lake City, UT', 'Boise, ID', 'Honolulu, HI', 'Little Rock, AR', 'Louisville, KY', 'Newark, NJ', 'Minneapolis, MN', 'Milwaukee, WI', 'Des Moines, IA', 'Albuquerque, NM', 'El Paso, TX', 'Shreveport, LA'];

  const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
  const POS_NAME = { QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', OL: 'Offensive Line', DL: 'Defensive Line', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker' };
  const OFFENSE = ['QB', 'RB', 'WR', 'TE', 'OL'];
  const ROSTER_QUOTA = { QB: 3, RB: 4, WR: 6, TE: 3, OL: 8, DL: 8, LB: 6, CB: 5, S: 4, K: 1 };
  const STARTERS = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, CB: 2, S: 2, K: 1 };
  const ROSTER_MAX = 53, OFF_ROSTER_MAX = 60; // 53 in season; extra camp bodies are allowed until cut-down day
  // league calendar: 14-week regular season, then a 4-team bracket in each conference and the title game
  const SEASON = { REG: 14, WC: 15, CC: 16, FINAL: 17, DEADLINE: 9, ROUNDS: 7, PLAYOFF: 4 };
  // salary cap ($M per league year), free agency length, scouting budgets
  const CAP = 200, FA_DAYS = 4, SCOUT_PTS = { founding: 30, annual: 24 };
  const expLabel = p => (p.exp > 0 ? `${p.exp} yr${p.exp > 1 ? 's' : ''}` : 'Rookie');
  // draft prospects carry a scouting grade (1-5) instead of recruiting stars
  const GRADE = { 5: '1st-round grade', 4: '2nd-round grade', 3: 'Day 2 grade', 2: 'Day 3 grade', 1: 'Priority FA' };
  const GRADE_SHORT = { 5: 'R1', 4: 'R2', 3: 'D2', 2: 'D3', 1: 'FA' };

  const ATTRS = ['spd', 'str', 'awr', 'skl'];
  const SKILL_LABEL = { QB: 'THR', RB: 'ELU', WR: 'CTH', TE: 'HND', OL: 'BLK', DL: 'RSH', LB: 'TKL', CB: 'COV', S: 'COV', K: 'KPW' };
  const ATTR_LABEL = { spd: 'SPD', str: 'STR', awr: 'AWR' };
  const ATTR_LONG = { spd: 'Speed', str: 'Strength', awr: 'Awareness', THR: 'Throwing', ELU: 'Elusiveness', CTH: 'Catching', HND: 'Hands & Routes', BLK: 'Blocking', RSH: 'Pass Rush', TKL: 'Tackling', COV: 'Coverage', KPW: 'Kick Power' };
  const OVR_W = {
    QB: { spd: 0.10, str: 0.05, awr: 0.35, skl: 0.50 },
    RB: { spd: 0.40, str: 0.20, awr: 0.10, skl: 0.30 },
    WR: { spd: 0.40, str: 0.05, awr: 0.15, skl: 0.40 },
    TE: { spd: 0.15, str: 0.35, awr: 0.15, skl: 0.35 },
    OL: { spd: 0.05, str: 0.50, awr: 0.15, skl: 0.30 },
    DL: { spd: 0.15, str: 0.45, awr: 0.10, skl: 0.30 },
    LB: { spd: 0.20, str: 0.25, awr: 0.20, skl: 0.35 },
    CB: { spd: 0.45, str: 0.05, awr: 0.15, skl: 0.35 },
    S:  { spd: 0.30, str: 0.10, awr: 0.25, skl: 0.35 },
    K:  { spd: 0.00, str: 0.10, awr: 0.20, skl: 0.70 },
  };
  const NUMBERS = {
    QB: [1, 19], RB: [20, 39], WR: [1, 19], TE: [80, 89], OL: [50, 79],
    DL: [90, 99], LB: [40, 59], CB: [20, 39], S: [20, 49], K: [90, 99],
  };

  // Fictional pro franchises for the AI side of the league (real cities, invented nicknames).
  const FRANCHISES = [
    { name: 'Portland', mascot: 'Lumberjacks', abbr: 'POR', logo: { shape: 'shield', icon: 'mountain', primary: '#0F4D2C', secondary: '#C8A24A' } },
    { name: 'San Antonio', mascot: 'Stallions', abbr: 'SAS', logo: { shape: 'circle', icon: 'horns', primary: '#13294B', secondary: '#C0C6CF' } },
    { name: 'Orlando', mascot: 'Thunder', abbr: 'ORL', logo: { shape: 'diamond', icon: 'bolt', primary: '#4338CA', secondary: '#FBBF24' } },
    { name: 'St. Louis', mascot: 'Archers', abbr: 'STL', logo: { shape: 'hex', icon: 'star', primary: '#B3122E', secondary: '#F4F5F7' } },
    { name: 'Salt Lake', mascot: 'Summit', abbr: 'SLC', logo: { shape: 'shield', icon: 'mountain', primary: '#5B9BD5', secondary: '#13294B' } },
    { name: 'Columbus', mascot: 'Captains', abbr: 'CLB', logo: { shape: 'crest', icon: 'anchor', primary: '#1C1F26', secondary: '#F2B705' } },
    { name: 'Sacramento', mascot: 'Gold', abbr: 'SAC', logo: { shape: 'circle', icon: 'crown', primary: '#F2B705', secondary: '#1C1F26' } },
    { name: 'Oklahoma City', mascot: 'Outlaws', abbr: 'OKC', logo: { shape: 'shield', icon: 'flame', primary: '#D2601A', secondary: '#111418' } },
    { name: 'Memphis', mascot: 'Blues', abbr: 'MEM', logo: { shape: 'hex', icon: 'wing', primary: '#1F4FBF', secondary: '#E5E7EB' } },
    { name: 'Louisville', mascot: 'Thoroughbreds', abbr: 'LOU', logo: { shape: 'crest', icon: 'horns', primary: '#6D1A36', secondary: '#C8A24A' } },
    { name: 'Birmingham', mascot: 'Ironmen', abbr: 'BIR', logo: { shape: 'diamond', icon: 'helmet', primary: '#334155', secondary: '#E0262F' } },
    { name: 'Austin', mascot: 'Outriders', abbr: 'AUS', logo: { shape: 'circle', icon: 'star', primary: '#E5671B', secondary: '#F4F5F7' } },
    { name: 'Omaha', mascot: 'Stampede', abbr: 'OMA', logo: { shape: 'shield', icon: 'horns', primary: '#7A3E1D', secondary: '#F2B705' } },
    { name: 'Honolulu', mascot: 'Waves', abbr: 'HON', logo: { shape: 'circle', icon: 'anchor', primary: '#0E8C8C', secondary: '#F4F5F7' } },
    { name: 'San Diego', mascot: 'Sea Lions', abbr: 'SD', logo: { shape: 'hex', icon: 'paw', primary: '#0E5E8C', secondary: '#FBBF24' } },
    { name: 'Virginia Beach', mascot: 'Admirals', abbr: 'VAB', logo: { shape: 'crest', icon: 'anchor', primary: '#13294B', secondary: '#E0262F' } },
    { name: 'Hartford', mascot: 'Monarchs', abbr: 'HFD', logo: { shape: 'shield', icon: 'crown', primary: '#4B2A85', secondary: '#F2B705' } },
    { name: 'Albuquerque', mascot: 'Roadrunners', abbr: 'ABQ', logo: { shape: 'diamond', icon: 'wing', primary: '#B4531B', secondary: '#13294B' } },
    { name: 'Raleigh', mascot: 'Pines', abbr: 'RAL', logo: { shape: 'circle', icon: 'mountain', primary: '#1F8A3C', secondary: '#111418' } },
    { name: 'Milwaukee', mascot: 'Huskies', abbr: 'MKE', logo: { shape: 'hex', icon: 'claw', primary: '#15181E', secondary: '#A7B1BC' } },
  ];
  // Colleges the draft prospects come from.
  const SCHOOLS = [
    { name: 'Ashford', mascot: 'Aviators', abbr: 'ASH', logo: { shape: 'shield', icon: 'wing', primary: '#13294B', secondary: '#C8A24A' } },
    { name: 'Bayport', mascot: 'Mariners', abbr: 'BAY', logo: { shape: 'circle', icon: 'anchor', primary: '#0E5E8C', secondary: '#F4F5F7' } },
    { name: 'Cedar Ridge', mascot: 'Timberwolves', abbr: 'CRU', logo: { shape: 'hex', icon: 'claw', primary: '#0F4D2C', secondary: '#C0C6CF' } },
    { name: 'Dunmore', mascot: 'Dukes', abbr: 'DUN', logo: { shape: 'crest', icon: 'crown', primary: '#4B2A85', secondary: '#F2B705' } },
    { name: 'Eastmont', mascot: 'Elks', abbr: 'EMT', logo: { shape: 'shield', icon: 'horns', primary: '#6D1A36', secondary: '#F4F5F7' } },
    { name: 'Falcon Bluff', mascot: 'Falcons', abbr: 'FBU', logo: { shape: 'diamond', icon: 'wing', primary: '#D2601A', secondary: '#111418' } },
    { name: 'Granite Peak', mascot: 'Miners', abbr: 'GPK', logo: { shape: 'pennant', icon: 'mountain', primary: '#334155', secondary: '#F2B705' } },
    { name: 'Harlow', mascot: 'Hornets', abbr: 'HAR', logo: { shape: 'hex', icon: 'bolt', primary: '#111418', secondary: '#F2B705' } },
    { name: 'Iron Valley', mascot: 'Forge', abbr: 'IVU', logo: { shape: 'crest', icon: 'flame', primary: '#B3122E', secondary: '#111418' } },
    { name: 'Juniper', mascot: 'Coyotes', abbr: 'JUN', logo: { shape: 'circle', icon: 'paw', primary: '#8C5A2B', secondary: '#F4E3C3' } },
    { name: 'Lakeshore', mascot: 'Lancers', abbr: 'LKS', logo: { shape: 'shield', icon: 'star', primary: '#1F4FBF', secondary: '#F4F5F7' } },
    { name: 'Marrow Creek', mascot: 'Mustangs', abbr: 'MCK', logo: { shape: 'pennant', icon: 'football', primary: '#0E8C8C', secondary: '#111418' } },
    { name: 'Northgate', mascot: 'Knights', abbr: 'NGT', logo: { shape: 'shield', icon: 'helmet', primary: '#1C1F26', secondary: '#C0C6CF' } },
    { name: 'Oakhaven', mascot: 'Owls', abbr: 'OAK', logo: { shape: 'circle', icon: 'star', primary: '#1F8A3C', secondary: '#F2B705' } },
    { name: 'Prairie State', mascot: 'Bison', abbr: 'PRS', logo: { shape: 'crest', icon: 'horns', primary: '#7A3E1D', secondary: '#F2B705' } },
    { name: 'Redstone', mascot: 'Raptors', abbr: 'RED', logo: { shape: 'diamond', icon: 'claw', primary: '#E0262F', secondary: '#F4F5F7' } },
    { name: 'Silverlake', mascot: 'Sentinels', abbr: 'SLV', logo: { shape: 'hex', icon: 'helmet', primary: '#5B9BD5', secondary: '#13294B' } },
    { name: 'Thunder Mesa', mascot: 'Storm', abbr: 'TMU', logo: { shape: 'circle', icon: 'bolt', primary: '#4338CA', secondary: '#FBBF24' } },
    { name: 'Westbrook', mascot: 'Wildcats', abbr: 'WBK', logo: { shape: 'pennant', icon: 'paw', primary: '#5B2C83', secondary: '#E5E7EB' } },
    { name: 'Copper Hills', mascot: 'Comets', abbr: 'CHU', logo: { shape: 'diamond', icon: 'star', primary: '#B4531B', secondary: '#1C1F26' } },
  ];

  const COLORS = [
    { id: 'crimson', hex: '#B3122E', name: 'Crimson' }, { id: 'scarlet', hex: '#E0262F', name: 'Scarlet' },
    { id: 'orange', hex: '#E5671B', name: 'Burnt Orange' }, { id: 'gold', hex: '#F2B705', name: 'Gold' },
    { id: 'oldgold', hex: '#C8A24A', name: 'Old Gold' }, { id: 'kelly', hex: '#1F8A3C', name: 'Kelly Green' },
    { id: 'forest', hex: '#0F4D2C', name: 'Forest' }, { id: 'teal', hex: '#0E8C8C', name: 'Teal' },
    { id: 'columbia', hex: '#6CACE4', name: 'Columbia' }, { id: 'royal', hex: '#1F4FBF', name: 'Royal' },
    { id: 'navy', hex: '#13294B', name: 'Navy' }, { id: 'purple', hex: '#4B2A85', name: 'Purple' },
    { id: 'maroon', hex: '#6D1A36', name: 'Maroon' }, { id: 'black', hex: '#15181E', name: 'Black' },
    { id: 'silver', hex: '#A7B1BC', name: 'Silver' }, { id: 'white', hex: '#F4F5F7', name: 'White' },
  ];

  const COLLEGES = SCHOOLS.map(s => s.name).concat(['Lone Pine State', 'Bayou Tech', 'Northern Plains', 'Coastal Carolina A&M', 'Desert State', 'Great Lakes', 'Mid-Valley', 'Tidewater', 'Blue Ridge', 'Gulf Coast']);

  // Two conferences of two divisions each; division winners and two wild cards make the playoffs.
  const CONFS = [
    { id: 0, name: 'American', long: 'American Conference', short: 'AC' },
    { id: 1, name: 'National', long: 'National Conference', short: 'NC' },
  ];
  const DIVS = [
    { id: 0, conf: 0, name: 'AC East' }, { id: 1, conf: 0, name: 'AC West' },
    { id: 2, conf: 1, name: 'NC East' }, { id: 3, conf: 1, name: 'NC West' },
  ];

  const DIFFICULTY = [
    { id: 'dynasty', label: 'Dynasty', desc: 'A stacked roster built to win the Blitz Bowl right now.', prestige: 4.5, tag: 'Easy' },
    { id: 'contender', label: 'Contender', desc: 'A playoff-caliber team one good draft away from the top.', prestige: 3, tag: 'Normal' },
    { id: 'rebuild', label: 'Rebuild', desc: 'Thin depth and an aging core. Build through the draft and trades.', prestige: 1.5, tag: 'Hard' },
  ];

  // Training groups — offense / defense split as the off-season camp works.
  const TRAINING = {
    offense: [
      { id: 'OL', label: 'O-Linemen', sub: 'Tackles, guards & centers', pos: ['OL'], attrs: ['str', 'skl', 'awr'] },
      { id: 'WRTE', label: "WR's & TE's", sub: 'Receivers & tight ends', pos: ['WR', 'TE'], attrs: ['skl', 'spd', 'awr'] },
      { id: 'RB', label: "RB's", sub: 'Running backs', pos: ['RB'], attrs: ['spd', 'skl', 'str'] },
    ],
    defense: [
      { id: 'DL', label: 'D-Linemen', sub: 'Ends & tackles', pos: ['DL'], attrs: ['str', 'skl', 'spd'] },
      { id: 'BACKS', label: 'Backs', sub: 'Linebackers & safeties', pos: ['LB', 'S'], attrs: ['skl', 'awr', 'spd'] },
      { id: 'CB', label: 'Corners', sub: 'Cornerbacks', pos: ['CB'], attrs: ['spd', 'skl', 'awr'] },
    ],
  };
  const ALL_GROUPS = [...TRAINING.offense, ...TRAINING.defense];
  const groupById = id => ALL_GROUPS.find(g => g.id === id);
  const sideOfGroup = id => (TRAINING.offense.some(g => g.id === id) ? 'offense' : 'defense');

  const INTENSITY = [
    { id: 'light', label: 'Light', mult: 0.6, inj: 0, desc: 'Walk-throughs. Modest gains, zero injury risk.' },
    { id: 'standard', label: 'Standard', mult: 1.0, inj: 0.025, desc: 'Full pads. Solid gains, low injury risk.' },
    { id: 'intense', label: 'Intense', mult: 1.5, inj: 0.08, desc: 'Two-a-days. Big gains, real injury risk.' },
  ];
  const CAMP_SESSIONS = [
    { name: 'OTAs', desc: 'Install the playbook and get the rookies up to speed.' },
    { name: 'Minicamp', desc: 'Full-squad work: strength, speed and stamina.' },
    { name: 'Training Camp', desc: 'Pads on, depth chart battles, final tune-up before Week 1.' },
  ];

  const PLANS = {
    off: [
      { id: 'ground', label: 'Ground & Pound', short: 'Ground', pass: 0.36, desc: 'Lean on the run game and the line.' },
      { id: 'balanced', label: 'Balanced', short: 'Balanced', pass: 0.5, desc: 'Keep the defense guessing.' },
      { id: 'air', label: 'Air Raid', short: 'Air Raid', pass: 0.66, desc: 'Spread it out and let it fly.' },
    ],
    def: [
      { id: 'base', label: 'Base 4-3', short: 'Base', desc: 'Sound, balanced defense.' },
      { id: 'blitz', label: 'Blitz Heavy', short: 'Blitz', desc: 'Sacks and chaos, but big plays allowed.' },
      { id: 'cover', label: 'Cover Zone', short: 'Cover', desc: 'Take away the pass, give up the run.' },
      { id: 'runstop', label: 'Stack the Box', short: 'Run Stop', desc: 'Stuff the run, risk the deep ball.' },
    ],
  };

  // Weather: gameplay modifiers used by the engine.
  //  pass/deep = completion logit shift, int = interception logit shift, fum = fumble multiplier,
  //  fg = field goal probability shift, yac = run-after-catch multiplier,
  //  runPass = how much coordinators lean away from passing, drain = stamina drain multiplier
  const WEATHER = {
    clear:  { label: 'Clear', desc: 'Perfect football weather.', pass: 0, deep: 0, int: 0, fum: 1, fg: 0, yac: 1, runPass: 1, drain: 1 },
    cloudy: { label: 'Overcast', desc: 'Grey skies, no real impact.', pass: 0, deep: 0, int: 0, fum: 1, fg: 0, yac: 1, runPass: 1, drain: 1 },
    rain:   { label: 'Rain', desc: 'Wet ball: more fumbles, tougher passing and kicking.', pass: -0.22, deep: -0.15, int: 0.1, fum: 1.8, fg: -0.04, yac: 0.9, runPass: 0.85, drain: 1 },
    storm:  { label: 'Thunderstorm', desc: 'Downpour: ball security and the deep game suffer badly.', pass: -0.4, deep: -0.3, int: 0.2, fum: 2.4, fg: -0.09, yac: 0.85, runPass: 0.7, drain: 1.05 },
    snow:   { label: 'Snow', desc: 'Slick footing: slower, sloppier, run-first football.', pass: -0.25, deep: -0.2, int: 0.1, fum: 1.6, fg: -0.07, yac: 0.8, runPass: 0.75, drain: 1.1 },
    fog:    { label: 'Fog', desc: 'Low visibility: deep shots are a gamble.', pass: -0.05, deep: -0.45, int: 0.15, fum: 1, fg: -0.02, yac: 1, runPass: 0.9, drain: 1 },
    wind:   { label: 'Windy', desc: 'Gusts affect kicks, punts and the deep ball.', pass: -0.05, deep: 0, int: 0.05, fum: 1, fg: 0, yac: 1, runPass: 0.92, drain: 1 },
    heat:   { label: 'Heat', desc: 'Scorching: stamina drains fast, rotate your guys.', pass: 0, deep: 0, int: 0, fum: 1.1, fg: 0, yac: 1, runPass: 1, drain: 1.35 },
  };
  const WEATHER_TIME = { day: 'Day game', dusk: 'Twilight kickoff', night: 'Night game' };

  // ── BADGES (stored as "stickers": STICKERS, p.stk) ──
  // Situational badges. 'mag' badges always apply in their situation (tier scales
  // the bonus); 'proc' badges have a tier-scaled chance to fire.
  const STICKER_TIERS = [
    { id: 'bronze', label: 'Bronze', mult: 1.0, proc: 0.25, color: '#d6905a' },
    { id: 'silver', label: 'Silver', mult: 1.6, proc: 0.40, color: '#d8dee6' },
    { id: 'gold', label: 'Gold', mult: 2.3, proc: 0.55, color: '#fbbf24' },
    { id: 'elite', label: 'Elite', mult: 3.2, proc: 0.75, color: '#c084fc' },
  ];
  const STICKERS = {
    // QB
    pocket: { name: 'Pocket Presence', pos: ['QB'], kind: 'mag', base: 0.12, glyph: 'PP', desc: 'Stays calm under pressure: smaller accuracy penalty and fewer sacks when the rush gets home.' },
    dime: { name: 'Dime Dropper', pos: ['QB'], kind: 'mag', base: 0.1, glyph: 'DD', desc: 'Pinpoint accuracy on throws of 15+ yards.' },
    general: { name: 'Field General', pos: ['QB'], kind: 'mag', base: 0.05, glyph: 'FG', desc: 'Reads the field faster: fewer misreads, finds the open man.' },
    escape: { name: 'Escape Artist', pos: ['QB'], kind: 'proc', base: 1, glyph: 'EA', desc: 'Chance to slip a would-be sack and scramble.' },
    iceveins: { name: 'Ice in the Veins', pos: ['QB'], kind: 'mag', base: 0.12, glyph: 'IV', desc: 'Accuracy boost in the 4th quarter and OT of one-score games.' },
    trigger: { name: 'Quick Trigger', pos: ['QB'], kind: 'mag', base: 0.12, glyph: 'QT', desc: 'Lightning release on quick game, screens and against the blitz.' },
    // RB
    wrecking: { name: 'Wrecking Ball', pos: ['RB'], kind: 'mag', base: 1.5, glyph: 'WB', desc: 'Runs through linebackers and safeties instead of around them.' },
    jukebox: { name: 'Juke Box', pos: ['RB'], kind: 'proc', base: 1, glyph: 'JB', desc: 'Chance to make the first second-level defender miss.' },
    homerun: { name: 'Home Run Hitter', pos: ['RB'], kind: 'mag', base: 2, glyph: 'HR', desc: 'Turns breakaways into long gains and touchdowns.' },
    irongrip: { name: 'Iron Grip', pos: ['RB'], kind: 'mag', base: 0.18, glyph: 'IG', desc: 'Protects the football — fumbles way down, even in the rain.' },
    hammer: { name: 'Goal-Line Hammer', pos: ['RB'], kind: 'mag', base: 0.9, glyph: 'GH', desc: 'Extra push inside the 5 and on 3rd/4th & short.' },
    bellcow: { name: 'Bell Cow', pos: ['RB'], kind: 'mag', base: 0.08, glyph: 'BC', desc: 'Handles a heavy workload — tires much more slowly.' },
    // WR / TE
    routetech: { name: 'Route Technician', pos: ['WR', 'TE'], kind: 'mag', base: 0.4, glyph: 'RT', desc: 'Crisp breaks create separation on short and intermediate routes.' },
    burner: { name: 'Burner', pos: ['WR'], kind: 'mag', base: 0.45, glyph: 'BU', desc: 'Pure speed on the deep ball (15+ yards).' },
    gluehands: { name: 'Glue Hands', pos: ['WR', 'TE', 'RB'], kind: 'mag', base: 0.15, glyph: 'GL', desc: 'Catches it in traffic — completion boost in tight windows.' },
    mossd: { name: "Moss'd", pos: ['WR', 'TE'], kind: 'proc', base: 1, glyph: 'MO', desc: 'Chance to win a contested deep ball over the defender.' },
    yac: { name: 'YAC Monster', pos: ['WR', 'TE', 'RB'], kind: 'mag', base: 1.6, glyph: 'YM', desc: 'Breaks tackles and piles up yards after the catch.' },
    redzone: { name: 'Red Zone Target', pos: ['TE', 'WR'], kind: 'mag', base: 0.5, glyph: 'RZ', desc: 'Body-control and separation boost inside the 20.' },
    // OL
    brickwall: { name: 'Brick Wall', pos: ['OL'], kind: 'mag', base: 1.8, glyph: 'BW', desc: 'Pass protection anchor — rushers rarely win clean.' },
    grader: { name: 'Road Grader', pos: ['OL', 'TE'], kind: 'mag', base: 1.5, glyph: 'RG', desc: 'Drives defenders off the ball on running plays.' },
    anchor: { name: 'Anchor', pos: ['OL'], kind: 'mag', base: 1.8, glyph: 'AN', desc: 'Sits down against power — neutralizes bull rushes.' },
    puller: { name: 'Pulling Guard', pos: ['OL'], kind: 'mag', base: 1.5, glyph: 'PG', desc: 'Leads the way on outside runs.' },
    ironman: { name: 'Iron Man', pos: ['OL', 'DL'], kind: 'mag', base: 0.15, glyph: 'IM', desc: 'Never comes off the field — stamina drains slower.' },
    // DL
    bender: { name: 'Edge Bender', pos: ['DL'], kind: 'mag', base: 2.5, glyph: 'EB', desc: 'Dips and bends around the edge (defensive ends).' },
    bullrush: { name: 'Bull Rusher', pos: ['DL', 'LB'], kind: 'mag', base: 2.0, glyph: 'BR', desc: 'Walks blockers back into the quarterback.' },
    stuffer: { name: 'Run Stuffer', pos: ['DL'], kind: 'mag', base: 2.5, glyph: 'RS', desc: 'Sheds blocks and blows up runs in the backfield.' },
    strip: { name: 'Strip Sack', pos: ['DL', 'LB'], kind: 'proc', base: 0.4, glyph: 'SS', desc: 'Chance a sack knocks the ball loose.' },
    closer: { name: 'Closer', pos: ['DL'], kind: 'mag', base: 2.5, glyph: 'CL', desc: 'Extra juice rushing in the 4th quarter with a lead.' },
    // LB
    thumper: { name: 'Run Thumper', pos: ['LB'], kind: 'mag', base: 2.5, glyph: 'TH', desc: 'Fills the hole and stops runners cold at the second level.' },
    sideline: { name: 'Sideline to Sideline', pos: ['LB', 'S'], kind: 'mag', base: 2.5, glyph: 'SL', desc: 'Range to chase down outside runs and screens.' },
    blitzer: { name: 'Blitz Specialist', pos: ['LB', 'S'], kind: 'mag', base: 3, glyph: 'BS', desc: 'Times the snap perfectly on blitzes.' },
    covlb: { name: 'Coverage Linebacker', pos: ['LB'], kind: 'mag', base: 0.8, glyph: 'CV', desc: 'Blankets tight ends and backs in coverage.' },
    enforcer: { name: 'Enforcer', pos: ['LB', 'S'], kind: 'proc', base: 0.25, glyph: 'EN', desc: 'Chance a big hit jars the ball loose.' },
    // CB / S
    lockdown: { name: 'Lockdown', pos: ['CB'], kind: 'mag', base: 0.6, glyph: 'LD', desc: 'Smothers receivers in man coverage.' },
    ballhawk: { name: 'Ballhawk', pos: ['CB', 'S'], kind: 'proc', base: 0.6, glyph: 'BH', desc: 'Chance to jump contested throws for interceptions.' },
    zonehawk: { name: 'Zone Hawk', pos: ['CB', 'S', 'LB'], kind: 'mag', base: 0.6, glyph: 'ZH', desc: 'Reads the QB and closes windows in Cover 3.' },
    centerfield: { name: 'Center Fielder', pos: ['S', 'CB'], kind: 'mag', base: 0.7, glyph: 'CF', desc: 'Takes away the deep ball over the top.' },
    suretackle: { name: 'Sure Tackler', pos: ['CB', 'S', 'LB'], kind: 'mag', base: 2.5, glyph: 'ST', desc: 'Wraps up — receivers rarely break his tackles.' },
    pick6: { name: 'Pick-Six Artist', pos: ['CB', 'S'], kind: 'mag', base: 0.03, glyph: 'P6', desc: 'Interceptions turn into long returns and touchdowns.' },
    // K
    bigleg: { name: 'Big Leg', pos: ['K'], kind: 'mag', base: 0.03, glyph: 'BL', desc: 'Range on 45+ yard field goals and longer punts.' },
    icecold: { name: 'Ice Cold', pos: ['K'], kind: 'mag', base: 0.04, glyph: 'IC', desc: 'Money in the 4th quarter and overtime.' },
    allweather: { name: 'All-Weather', pos: ['K'], kind: 'mag', base: 0.3, glyph: 'AW', desc: 'Wind, rain and snow barely affect his kicks.' },
    coffin: { name: 'Coffin Corner', pos: ['K'], kind: 'proc', base: 1, glyph: 'CC', desc: 'Chance to pin punts inside the 10 instead of a touchback.' },
  };
  const stickersFor = pos => Object.keys(STICKERS).filter(id => STICKERS[id].pos.includes(pos));

  const WEEK_LABEL = w => (w <= SEASON.REG ? `Week ${w}` : w === SEASON.WC ? 'Wild Card Round' : w === SEASON.CC ? 'Conference Championships' : 'The Blitz Bowl');
  const WEEK_SHORT = w => (w <= SEASON.REG ? `Wk ${w}` : w === SEASON.WC ? 'WC' : w === SEASON.CC ? 'CONF' : 'BOWL');

  return {
    FIRST, LAST, TOWNS, POSITIONS, POS_NAME, OFFENSE, ROSTER_QUOTA, STARTERS, ROSTER_MAX, OFF_ROSTER_MAX, SEASON, CAP, FA_DAYS, SCOUT_PTS, expLabel, GRADE, GRADE_SHORT,
    ATTRS, SKILL_LABEL, ATTR_LABEL, ATTR_LONG, OVR_W, NUMBERS, FRANCHISES, SCHOOLS, COLLEGES, COLORS, CONFS, DIVS, DIFFICULTY,
    STICKER_TIERS, STICKERS, stickersFor, WEATHER, WEATHER_TIME, TRAINING, ALL_GROUPS, groupById, sideOfGroup, INTENSITY, CAMP_SESSIONS, PLANS, WEEK_LABEL, WEEK_SHORT,
    attrLabel: (pos, a) => (a === 'skl' ? SKILL_LABEL[pos] : ATTR_LABEL[a]),
  };
})();
