export type IntakeQAItem = {
  question: string
  answer: string
}

export type CarePrepAllergy = {
  severity: 'high' | 'low'
  name: string
  detail: string
}

export type CarePrepMedication = {
  name: string
  detail: string
  badge: string
}

export type CarePrepIntakeDetail = {
  avatarUrl: string
  ageSexLine: string
  chiefConcernLabel: string
  intakeDateLine: string
  reviewBadge: string
  qa: IntakeQAItem[]
  allergies: CarePrepAllergy[]
  medications: CarePrepMedication[]
  vitals: { bp: string; hr: string; subtitle: string }
}

export type CarePrepQueuePatient = {
  token: string
  tokenKey: string
  initials: string
  initialsClass: string
  name: string
  dobLine: string
  submitted: string
  /** Minutes since submission (for sort); aligns with submitted label e.g. "(14m ago)". */
  submittedMinutesAgo: number
  statusKind: 'complete' | 'progress'
  progressPct?: number
  action: 'review' | 'waiting'
  intake: CarePrepIntakeDetail | null
}

const ananyaIntake: CarePrepIntakeDetail = {
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDuf-HN86fQgEHctIXwh9Z2w87vAKMWCHYzKZZvbLzbuloRusDAWwskLCOkxb-mmuQLRZnH0dw_PNN9K-1JcmklQAxhXkEPNRlylrN3Ag7hs080ROaWkl1ifzouS1DlIiZsDh63hw92ES8XthAQPlemwu2sckV9YybILuSaklmCdlZF6cc6Anda__Dv1XCO4ab-_kjSpfz46x_3hVdRJSrZsdjhkEM164UBAYqNcyZbQkMq8outewVuB46T2eUg_87XzTbNyfbO3E5i',
  ageSexLine: '34 Years Old • Female',
  chiefConcernLabel: 'PERSISTENT MIGRAINE',
  intakeDateLine: 'Oct 24, 2023 · 09:15 AM',
  reviewBadge: 'Review Complete',
  qa: [
    {
      question: 'Can you describe the location and nature of your headache?',
      answer:
        '"It\'s primarily on the left side, behind my eye. It feels like a throbbing, pulsing pain that gets worse when I move or am in bright light."',
    },
    {
      question: 'How long has this current episode lasted, and have you had others like it?',
      answer:
        '"This one started about 18 hours ago. I get these about 2-3 times a month for the last year, usually around my menstrual cycle."',
    },
    {
      question: 'Are you experiencing any other symptoms like nausea, vision changes, or numbness?',
      answer:
        '"I definitely feel nauseous. No numbness, but I see shimmering spots (auras) right before the pain starts."',
    },
    {
      question: 'Have you tried any medications for relief so far?',
      answer: '"I took 400mg of Ibuprofen about 4 hours ago, but it hasn\'t really touched the pain."',
    },
  ],
  allergies: [
    { severity: 'high', name: 'Penicillin', detail: 'Severe Reaction: Hives/Anaphylaxis' },
    { severity: 'low', name: 'Shellfish', detail: 'Mild Rash / Gastric Upset' },
  ],
  medications: [
    { name: 'Sertraline', detail: '50mg Tablet · Daily (Morning)', badge: 'ACTIVE' },
    { name: 'Multivitamin', detail: 'Gummy · Daily', badge: 'OTC' },
  ],
  vitals: { bp: '118/76', hr: '72 bpm', subtitle: '5 mins ago' },
}

function fallbackIntake(patientName: string): CarePrepIntakeDetail {
  return {
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCuSkfvIW3phx7yHbt104mLhs656BoGQpYY09pPg3wUO_G9c3DWXj7ry68ypMznP1rTdyAPSXjX6Xk7cDbvJ1wgmWIlq_McPQW-9KpGS9qeEbJVVjt4YVfbIWGE8WyTOLE1nlg7wDw7fKdH7x-kMASiUT_StwHliRrFojXgKNfKBB79rNiWPg8DfC3FAxKDCDvu0pyNjmXjRMaDTqqlXXqHwQuQtOnhf_uKw2ti2h8FznKYlsSlVV4VYJ3tst3kLqJ3Qx1OO_BNWviI',
    ageSexLine: 'See demographics',
    chiefConcernLabel: 'INTAKE ON FILE',
    intakeDateLine: 'Today · Scheduled',
    reviewBadge: 'Review Complete',
    qa: [
      {
        question: 'What brings you in today?',
        answer: `"I'm following up on concerns documented during pre-visit intake for ${patientName.split(' ')[0]}. Detailed AI transcript will appear here."`,
      },
      {
        question: 'Any current medications or allergies we should prioritize?',
        answer: '"Patient confirmed during intake — full reconciliation will populate from connected records."',
      },
    ],
    allergies: [
      { severity: 'low', name: 'NKDA documented', detail: 'Confirm with patient at bedside' },
    ],
    medications: [
      { name: 'Pending sync', detail: 'EHR / intake merge', badge: 'REVIEW' },
    ],
    vitals: { bp: '—', hr: '—', subtitle: 'At triage' },
  }
}

export const carePrepPatients: CarePrepQueuePatient[] = [
  {
    token: '#XP-9021',
    tokenKey: 'XP-9021',
    initials: 'AS',
    initialsClass: 'bg-purple-100 text-purple-700',
    name: 'Ananya Sharma',
    dobLine: 'DOB: 08/04/1989 (34y)',
    submitted: '10:42 AM (14m ago)',
    submittedMinutesAgo: 14,
    statusKind: 'complete',
    action: 'review',
    intake: ananyaIntake,
  },
  {
    token: '#XP-8842',
    tokenKey: 'XP-8842',
    initials: 'EM',
    initialsClass: 'bg-purple-100 text-purple-700',
    name: 'Elena Martinez',
    dobLine: 'DOB: 11/24/1992 (31y)',
    submitted: '10:51 AM (5m ago)',
    submittedMinutesAgo: 5,
    statusKind: 'complete',
    action: 'review',
    intake: fallbackIntake('Elena Martinez'),
  },
  {
    token: '#XP-4105',
    tokenKey: 'XP-4105',
    initials: 'RK',
    initialsClass: 'bg-slate-100 text-slate-700',
    name: 'Robert Kagawa',
    dobLine: 'DOB: 02/03/1975 (49y)',
    submitted: '10:55 AM (1m ago)',
    submittedMinutesAgo: 1,
    statusKind: 'progress',
    progressPct: 72,
    action: 'waiting',
    intake: null,
  },
  {
    token: '#XP-1129',
    tokenKey: 'XP-1129',
    initials: 'SW',
    initialsClass: 'bg-orange-100 text-orange-700',
    name: 'Sarah Williams',
    dobLine: 'DOB: 09/30/1961 (62y)',
    submitted: '10:15 AM (41m ago)',
    submittedMinutesAgo: 41,
    statusKind: 'complete',
    action: 'review',
    intake: fallbackIntake('Sarah Williams'),
  },
  {
    token: '#XP-7603',
    tokenKey: 'XP-7603',
    initials: 'AH',
    initialsClass: 'bg-rose-100 text-rose-700',
    name: 'Amara Hassan',
    dobLine: 'DOB: 01/15/2001 (23y)',
    submitted: '10:30 AM (26m ago)',
    submittedMinutesAgo: 26,
    statusKind: 'complete',
    action: 'review',
    intake: fallbackIntake('Amara Hassan'),
  },
]

export function findCarePrepPatient(tokenKey: string): CarePrepQueuePatient | undefined {
  const norm = tokenKey.replace(/^#/i, '')
  return carePrepPatients.find((p) => p.tokenKey === norm)
}
