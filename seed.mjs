// Prints SQL that seeds the MOA form definition (only if no form exists yet).
// Item ids are positional (cr-1-1, ar-2-3, ...). A v2 upload that replaces a form must keep ids stable
// for items that survive, or saved reports lose their scores.
const roles = [
  ['cr', 'Center Referee', [
    ['Match Control', [
      'Recognition of fouls',
      'Recognition of cautionable offenses: players',
      'Recognition of warnings/cautionable offenses: coaches',
      'Recognition of persistent offenses',
      'Use of advantage',
      'Management of mass confrontations',
    ]],
    ['Interaction with participants', [
      'Verbal communication, body language, mannerisms',
      'Was open to appropriate communication from participants',
      'Proactive management before ball was in play',
      'Recognized difference between frustration and dissent',
      'Showed composure in responses to match incidents',
      'Identified changes in game temperature and responded accordingly',
    ]],
    ['Game Management', [
      'Injury Management (blood/head/re-entry)',
      'Time Management (appropriate time played/additional time/etc)',
      'Restart Management (quick and ceremonial free kicks/corner kicks/penalty kicks/throw in/drop ball)',
      'Wall management (distance of defenders and attackers/timely set up/instructions)',
      'Accurate management of substitution procedures',
      'Signaling according to the laws of the game',
      'Equipment management (jewelry, shin guards, socks, tape, undergarments)',
      'Accurate completion of administrative duties before, during, and after the match',
    ]],
    ['Teamwork', [
      'Acknowledgment/overrule of AR assistance (offside, fouls, misconduct, boundary)',
      'Appropriate delegation of responsibilities to other crew members',
      'Effective use of eye contact, discrete signals, or electronic communication',
      'Cooperation with 4th official (fouls/misconduct, injury management, substitutions, team officials)',
    ]],
    ['Positioning', [
      'Took positions to achieve good viewing angles',
      'Credible proximity to attacking play or challenges',
      'Recognized low/medium and high-pressure tactics and adjusted accordingly',
      'Recognized the breakdown of play and adjusted accordingly',
      'Anticipated drop zone and adjusted position accordingly',
      'Adjusted body orientation to maximized viewing angles including view of ARs',
      'Anticipation of play vs reaction to play',
      'Frequently scanned away from active play',
    ]],
    ['Movement', [
      'Work rate matches needs of game',
      'Stamina levels displayed from beginning to end',
      'Sprinting ability and use of sprinting to stay close to play',
      'Used explosive movement, changes of pace, and changes in direction',
      'Appropriate use of backwards or lateral movements to achieve good viewing angles',
      'Appropriate use of backwards or lateral movement to stay out of active play zones',
    ]],
  ]],
  ['ar', 'Assistant Referee', [
    ['Offside', [
      'Correct identification of routine offside offenses',
      'Correct identification of difficult offside offenses',
      'Appropriately gave the benefit of doubt to the attacking team',
      'Appropriate use of "wait and see" principle',
    ]],
    ['Involvement and Assistance', [
      'Correct assistance with boundary line decisions',
      'Correct identification of fouls within their area of responsibility',
      'Correct identification of cautionable offenses within their area of responsibility (players/team officials)',
      'Appropriate switch of focus between offside, boundary line, and fouls/misconduct priorities',
      'Appropriate assistance within their area of responsibility (player/team official management/wall management/encroachment)',
      'Effective use of communication (eye contact/discreet signals/electronic systems)',
      'Appropriate participation during mass confrontations',
      'Appropriate flag mechanics and techniques',
    ]],
    ['Positioning', [
      'Correct alignment with 2nd to last opponent or the ball throughout the match',
      'Credible positioning at goal line to make boundary or goal/no-goal decisions',
    ]],
    ['Movement', [
      'Appropriate use of lateral movement',
      'Reading and anticipating transitions between lateral movements and sprinting',
      'Appropriate use of explosive movement and sprinting',
      'Work rate matches the needs of the game',
      'Stamina displayed from beginning to end',
    ]],
  ]],
  ['fo', '4th Official', [
    ['Involvement and Assistance', [
      'Proactive and preventative management for situations within area of responsibility',
      'Appropriate involvement for information for fouls and misconduct within their area of responsibility',
      'Appropriate involvement and information for incidents out of view of the referee',
      'Consistent and credible recognition of warning/cautionable offenses for team officials',
      'Accurate management of substitution procedures',
      'Appropriate assistance with injury management (medical staff, blood, re-entry of players)',
      'Accurate completion of administrative duties before, during, and after the match',
    ]],
  ]],
];

const def = {
  scale: [[0, 'N/A'], [1, 'Below expectation'], [2, 'Average'], [3, 'Above expectation'], [4, 'Excellent']],
  difficulty: ['Normal', 'Difficult', 'Very Difficult'],
  roles: roles.map(([id, name, cats]) => ({
    id,
    name,
    categories: cats.map(([cname, items], ci) => ({
      id: `${id}-${ci + 1}`,
      name: cname,
      items: items.map((text, ii) => ({ id: `${id}-${ci + 1}-${ii + 1}`, text })),
    })),
  })),
};

const q = (s) => `'${s.replaceAll("'", "''")}'`;
console.log(
  `INSERT INTO forms (name, def) SELECT ${q('MOA Scouting Report')}, ${q(JSON.stringify(def))} ` +
    'WHERE NOT EXISTS (SELECT 1 FROM forms);',
);
