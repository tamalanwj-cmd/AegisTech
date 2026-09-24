/**
 * Exercise catalog for the participant portal (P03-P06).
 *
 * Static demo content, consistent with the admin pages' demo data. Each
 * exercise carries its scenario intro, learning objectives, playable roles
 * (P04) and event injects (P05). Progress/status is combined with the local
 * exercise session (see services/exerciseSession.js) so submitted responses
 * update the dashboard cards.
 */
import { getSession } from '../services/exerciseSession';

export const exercises = [
  {
    id: 'er-alpha',
    title: 'ER Alpha — Pandemic Surge Exercise',
    course: 'Emergency Response Practice',
    status: 'In Progress',
    progress: 67,
    due: 'Due 15 Oct 2025',
    intro:
      'A novel respiratory pathogen has spread to three major metropolitan areas. ' +
      'Your hospital emergency department is experiencing a sustained surge in presentations ' +
      'while staffing and supplies are under pressure. Work through each event inject and ' +
      'record the actions you would take in your role.',
    objectives: [
      'Prioritise patients and resources under surge conditions',
      'Coordinate a multi-agency response across health services',
      'Communicate clearly with staff, patients and the public',
    ],
    roles: [
      {
        id: 'ic',
        name: 'Incident Controller',
        desc: 'Overall command of the response. Sets priorities, allocates resources and coordinates all responding agencies.',
      },
      {
        id: 'pho',
        name: 'Public Health Officer',
        desc: 'Monitors the outbreak, advises on infection control measures and liaises with the state health department.',
      },
      {
        id: 'comms',
        name: 'Communications Lead',
        desc: 'Manages internal and public messaging, media requests and staff updates throughout the exercise.',
      },
      {
        id: 'log',
        name: 'Logistics Coordinator',
        desc: 'Tracks supplies, equipment and staffing levels, and arranges procurement and mutual aid.',
      },
    ],
    injects: [
      {
        id: 'inj-1',
        time: 'T+00:10',
        title: 'First confirmed case',
        body:
          'A patient has tested positive for the novel pathogen after presenting with severe ' +
          'respiratory symptoms. Two more patients with matching symptoms are waiting in the ' +
          'emergency department. The local media has started calling the front desk for comment.',
      },
      {
        id: 'inj-2',
        time: 'T+01:30',
        title: 'Staff shortages',
        body:
          'Fifteen percent of nursing staff have called in sick and three ICU nurses are ' +
          'isolating after exposure. The night shift cannot be fully covered. Union ' +
          'representatives are requesting an urgent meeting about staff safety.',
      },
      {
        id: 'inj-3',
        time: 'T+03:00',
        title: 'Media pressure',
        body:
          'A national broadcaster has obtained a leaked staff memo and plans to run a story ' +
          'critical of the hospital surge capacity within the hour. The Minister\'s office is ' +
          'requesting a briefing.',
      },
    ],
  },
  {
    id: 'cm-beta',
    title: 'CM Beta — Infrastructure Exercise',
    course: 'Crisis Management',
    status: 'Not Started',
    progress: 0,
    due: 'Due 30 Oct 2025',
    intro:
      'Simultaneous failure of the power grid across an entire state has triggered cascading ' +
      'failures in transport, communications and water supply. As part of the state crisis ' +
      'management team, respond to each event inject and coordinate the response.',
    objectives: [
      'Coordinate a whole-of-government response to infrastructure failure',
      'Maintain critical services during an extended outage',
      'Manage public information and expectations',
    ],
    roles: [
      {
        id: 'liaison',
        name: 'Emergency Services Liaison',
        desc: 'Coordinates police, fire and ambulance activities and maintains the common operating picture.',
      },
      {
        id: 'utilities',
        name: 'Utilities Coordinator',
        desc: 'Works with power, water and telecommunications providers to prioritise restoration efforts.',
      },
      {
        id: 'community',
        name: 'Community Support Lead',
        desc: 'Organises relief centres, welfare checks and support for vulnerable community members.',
      },
    ],
    injects: [
      {
        id: 'inj-1',
        time: 'T+00:20',
        title: 'Substation failure',
        body:
          'A major substation failure has blacked out the central business district and three ' +
          'outer suburbs. Traffic signals are out and the rail network has stopped. The utility ' +
          'estimates restoration in 6-8 hours.',
      },
      {
        id: 'inj-2',
        time: 'T+02:00',
        title: 'Hospital generator fuel low',
        body:
          'The main hospital is running on backup generators and reports four hours of fuel ' +
          'remaining. Road closures are delaying the fuel tanker.',
      },
      {
        id: 'inj-3',
        time: 'T+04:00',
        title: 'Telecommunications outage',
        body:
          'Mobile coverage has dropped to 30% across the affected area. Emergency call volumes ' +
          'are spiking and the state coordination centre is struggling to reach field teams.',
      },
      {
        id: 'inj-4',
        time: 'T+08:00',
        title: 'Recovery planning',
        body:
          'Power is being restored in stages. The Premier has requested a recovery plan covering ' +
          'business continuity, school reopening and public transport restoration by 06:00 tomorrow.',
      },
    ],
  },
  {
    id: 'storm-bravo',
    title: 'Storm Watch Bravo — Extreme Weather Event',
    course: 'Natural Disaster Response',
    status: 'Completed',
    progress: 100,
    due: '',
    intro:
      'A category 5 cyclone is tracking toward a major coastal city. Evacuation, shelter ' +
      'management and welfare support must be coordinated before landfall in 36 hours.',
    objectives: [
      'Execute a staged evacuation of high-risk zones',
      'Establish and manage evacuation centres',
      'Coordinate welfare support for affected communities',
    ],
    roles: [
      {
        id: 'evac',
        name: 'Evacuation Coordinator',
        desc: 'Plans and directs the staged evacuation of high-risk zones ahead of landfall.',
      },
      {
        id: 'shelter',
        name: 'Shelter Manager',
        desc: 'Sets up and runs evacuation centres, including registration, catering and medical support.',
      },
      {
        id: 'welfare',
        name: 'Welfare Services Lead',
        desc: 'Coordinates personal support services and reconnects displaced families.',
      },
    ],
    injects: [
      {
        id: 'inj-1',
        time: 'T-36:00',
        title: 'Cyclone warning upgraded',
        body:
          'The bureau has upgraded the cyclone to category 5 with landfall expected in 36 hours. ' +
          'Storm surge modelling shows inundation risk for coastal suburbs housing 40,000 residents.',
      },
      {
        id: 'inj-2',
        time: 'T-24:00',
        title: 'Evacuation centres at capacity',
        body:
          'Two of the five evacuation centres have reached capacity and buses are delayed by ' +
          'flooding on the northern approach roads.',
      },
      {
        id: 'inj-3',
        time: 'T-06:00',
        title: 'Last-minute arrivals',
        body:
          'A group of 60 residents from an aged care facility arrives at the main centre ' +
          'unannounced, including eight residents requiring specialist medical care.',
      },
    ],
  },
];

export const getExercise = (id) => exercises.find((e) => e.id === id);

/**
 * Current status/progress of an exercise: local session results (submitted
 * responses) override the static demo values, so the dashboard reflects what
 * the participant has actually done.
 */
export function getExerciseState(exercise) {
  const session = getSession(exercise.id);
  if (session) {
    const total = exercise.injects.length;
    const done = exercise.injects.filter((i) => session.submitted.includes(i.id)).length;
    if (total > 0 && done >= total) {
      return { status: 'Completed', progress: 100, session };
    }
    if (done > 0) {
      return { status: 'In Progress', progress: Math.round((done / total) * 100), session };
    }
  }
  return { status: exercise.status, progress: exercise.progress, session };
}
