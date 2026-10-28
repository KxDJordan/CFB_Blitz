'use strict';
// ── STATIC GAME DATA ──────────────────────────────────────────────

const DATA = (() => {
  const FIRST = ['Jalen', 'Marcus', 'Tyler', 'Devin', 'Caleb', 'Jaylen', 'Bryce', 'Malik', 'Cameron', 'Trey', 'Darius', 'Isaiah', 'Xavier', 'Quentin', 'Brandon', 'Jordan', 'Elijah', 'Josiah', 'Tre', 'Kendall', 'Avery', 'Cole', 'Hunter', 'Garrett', 'Logan', 'Mason', 'Carter', 'Brady', 'Drew', 'Spencer', 'Tanner', 'Wyatt', 'Colby', 'Reid', 'Jace', 'Kobe', 'Amari', 'Jamari', 'Kyree', 'Zion', 'DeShawn', 'Terrell', 'Andre', 'Rashad', 'Lamar', 'Desmond', 'Keon', 'Micah', 'Nico', 'Mateo', 'Luis', 'Diego', 'Gabe', 'Sam', 'Ben', 'Luke', 'Jack', 'Owen', 'Eli', 'Grant', 'Rhett', 'Bo', 'Cade', 'Kase', 'Tate', 'Jett', 'Dallas', 'Austin', 'Chase', 'Blake', 'Dominic', 'Marquise', 'Jabari', 'Tavion', 'Kamari', 'Rodney', 'Cedric', 'Omar', 'Sione', 'Kalani', 'Mekhi', 'Jaxon', 'Ty', 'Roman', 'Silas', 'Ezra', 'Brock', 'Knox', 'Deion', 'Ladarius', 'Javon', 'Trevon', 'Keenan', 'Marcel', 'Reggie', 'Damon'];
  const LAST = ['Williams', 'Johnson', 'Smith', 'Brown', 'Jackson', 'Davis', 'Harris', 'Robinson', 'Walker', 'Thompson', 'White', 'Carter', 'Mitchell', 'Turner', 'Parker', 'Collins', 'Edwards', 'Stewart', 'Morris', 'Reed', 'Cook', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Bryant', 'Alexander', 'Russell', 'Griffin', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan', 'Wallace', 'Woods', 'Cole', 'West', 'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Marshall', 'Ortiz', 'Wells', 'Webb', 'Tucker', 'Porter', 'Hicks', 'Crawford', 'Boyd', 'Kennedy', 'Warren', 'Dixon', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Knight', 'Ferguson', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Stephens', 'Pierce', 'Hansen', 'Fuimaono', 'Tuiasosopo', 'Mauga', 'Okafor', 'Adebayo', 'Nwosu', 'Delacroix', 'Beaumont', 'Castillo', 'Vega', 'Sandoval', 'Whitaker', 'Lockhart', 'Prescott', 'Calloway'];
  const TOWNS = ['Houston, TX', 'Dallas, TX', 'Austin, TX', 'San Antonio, TX', 'Tyler, TX', 'Atlanta, GA', 'Valdosta, GA', 'Savannah, GA', 'Miami, FL', 'Tampa, FL', 'Jacksonville, FL', 'Orlando, FL', 'Birmingham, AL', 'Mobile, AL', 'Baton Rouge, LA', 'New Orleans, LA', 'Jackson, MS', 'Memphis, TN', 'Nashville, TN', 'Charlotte, NC', 'Raleigh, NC', 'Columbia, SC', 'Richmond, VA', 'Baltimore, MD', 'Philadelphia, PA', 'Pittsburgh, PA', 'Cleveland, OH', 'Columbus, OH', 'Cincinnati, OH', 'Detroit, MI', 'Chicago, IL', 'Indianapolis, IN', 'St. Louis, MO', 'Kansas City, MO', 'Omaha, NE', 'Wichita, KS', 'Tulsa, OK', 'Oklahoma City, OK', 'Denver, CO', 'Phoenix, AZ', 'Las Vegas, NV', 'Los Angeles, CA', 'San Diego, CA', 'Sacramento, CA', 'Fresno, CA', 'Portland, OR', 'Seattle, WA', 'Salt Lake City, UT', 'Boise, ID', 'Honolulu, HI', 'Little Rock, AR', 'Louisville, KY', 'Newark, NJ', 'Minneapolis, MN', 'Milwaukee, WI', 'Des Moines, IA', 'Albuquerque, NM', 'El Paso, TX', 'Shreveport, LA'];

  const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
  const POS_NAME = { QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver', TE: 'Tight End', OL: 'Offensive Line', DL: 'Defensive Line', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker' };
  const OFFENSE = ['QB', 'RB', 'WR', 'TE', 'OL'];
  const ROSTER_QUOTA = { QB: 3, RB: 3, WR: 5, TE: 2, OL: 7, DL: 6, LB: 5, CB: 4, S: 3, K: 1 };
  const STARTERS = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, CB: 2, S: 2, K: 1 };
  const ROSTER_MAX = 52;
  const CLASS = ['FR', 'SO', 'JR', 'SR'];
  const CLASS_LONG = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

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

  // Fictional programs for the AI side of the league.
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

  const CONFS = [
    { id: 0, name: 'Heartland', long: 'Heartland Conference', short: 'HRT' },
    { id: 1, name: 'Crest', long: 'Crest Conference', short: 'CRS' },
  ];

  const DIFFICULTY = [
    { id: 'blueblood', label: 'Blue Blood', desc: 'Loaded roster, national title expectations from day one.', prestige: 4.5, tag: 'Easy' },
    { id: 'contender', label: 'Contender', desc: 'A solid program one great draft away from the top.', prestige: 3, tag: 'Normal' },
    { id: 'rebuild', label: 'Rebuild', desc: 'Thin depth, low expectations. Build it brick by brick.', prestige: 1.5, tag: 'Hard' },
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
    { name: 'Spring Practice', desc: 'Install the playbook and find out who can play.' },
    { name: 'Summer Conditioning', desc: 'Strength, speed and stamina in the heat.' },
    { name: 'Fall Camp', desc: 'Final tune-up before the season opener.' },
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

  const WEEK_LABEL = w => (w <= 11 ? `Week ${w}` : w === 12 ? 'Conference Championships' : w === 13 ? 'Playoff Semifinals' : 'National Championship');
  const WEEK_SHORT = w => (w <= 11 ? `Wk ${w}` : w === 12 ? 'CCG' : w === 13 ? 'CFP Semi' : 'Title');

  return {
    FIRST, LAST, TOWNS, POSITIONS, POS_NAME, OFFENSE, ROSTER_QUOTA, STARTERS, ROSTER_MAX, CLASS, CLASS_LONG,
    ATTRS, SKILL_LABEL, ATTR_LABEL, ATTR_LONG, OVR_W, NUMBERS, SCHOOLS, COLORS, CONFS, DIFFICULTY,
    TRAINING, ALL_GROUPS, groupById, sideOfGroup, INTENSITY, CAMP_SESSIONS, PLANS, WEEK_LABEL, WEEK_SHORT,
    attrLabel: (pos, a) => (a === 'skl' ? SKILL_LABEL[pos] : ATTR_LABEL[a]),
  };
})();
