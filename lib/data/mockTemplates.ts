import type { SOAPTemplate } from '@/lib/types/templates';

export const mockTemplates: SOAPTemplate[] = [
  // Personal Templates
  {
    id: 'personal-1',
    name: 'Diabetes Follow-up',
    description: 'Standard follow-up for Type 2 Diabetes patients with A1C review',
    type: 'personal',
    content: {
      subjective: 'Patient reports [compliance level] with medication regimen. Blood sugar readings average [BSL average]. [Diet/exercise adherence].',
      objective: 'BP: [BP], Weight: [Weight], A1C: [A1C], Foot exam: [Foot findings]',
      assessment: 'Type 2 Diabetes Mellitus - [controlled/uncontrolled]. Current A1C [value].',
      plan: '1. Continue current medications\n2. Recheck A1C in 3 months\n3. Referral to nutritionist if needed\n4. Follow-up in [timeframe]'
    },
    metadata: {
      category: 'General',
      specialty: 'Internal Medicine',
      appointmentTypes: ['Follow-up', 'Chronic Care'],
      tags: ['diabetes', 'chronic-care', 'endocrine'],
      version: '1.0',
      authorId: 'provider-001',
      authorName: 'Dr. Jane Smith',
      createdAt: '2025-10-15',
      updatedAt: '2025-11-01',
      usageCount: 45,
      lastUsed: '2025-11-12',
      isFavorite: true
    }
  },
  {
    id: 'personal-2',
    name: 'Hypertension Check',
    description: 'Quick hypertension management visit template',
    type: 'personal',
    content: {
      subjective: 'Patient reports [adherence] with BP medications. Home readings: [home BP readings]. [Side effects if any].',
      objective: 'BP: [BP] (repeated: [BP2]), HR: [HR], Recent labs: [lab results]',
      assessment: 'Essential Hypertension - [controlled/uncontrolled]',
      plan: '1. [Continue/adjust] current medications\n2. Lifestyle modifications reviewed\n3. Home BP monitoring\n4. Follow-up in [timeframe]'
    },
    metadata: {
      category: 'Cardiology',
      specialty: 'Cardiology',
      appointmentTypes: ['Follow-up', 'Chronic Care'],
      tags: ['hypertension', 'cardiovascular', 'chronic-care'],
      version: '1.0',
      authorId: 'provider-001',
      authorName: 'Dr. Jane Smith',
      createdAt: '2025-09-20',
      updatedAt: '2025-10-28',
      usageCount: 32,
      lastUsed: '2025-11-10',
      isFavorite: true
    }
  },
  {
    id: 'personal-3',
    name: 'Well-Child Visit',
    description: 'Pediatric well-child checkup with developmental milestones',
    type: 'personal',
    content: {
      subjective: 'Parent reports child is [status]. No concerns about growth or development. [Specific concerns if any].',
      objective: 'Weight: [Weight] ([percentile]%), Height: [Height] ([percentile]%), BMI: [BMI]\nVitals: T: [Temp], HR: [HR], RR: [RR]\nDevelopmental milestones: [milestones achieved]',
      assessment: 'Healthy [age]-year-old. Growth and development appropriate.',
      plan: '1. Immunizations per schedule: [vaccines given]\n2. Anticipatory guidance provided\n3. Next well visit at [age]\n4. Call with concerns'
    },
    metadata: {
      category: 'Pediatrics',
      specialty: 'Pediatrics',
      appointmentTypes: ['Preventive', 'Annual Physical'],
      tags: ['pediatrics', 'well-child', 'preventive'],
      version: '1.2',
      authorId: 'provider-001',
      authorName: 'Dr. Jane Smith',
      createdAt: '2025-08-10',
      updatedAt: '2025-11-05',
      usageCount: 28,
      lastUsed: '2025-11-11',
      isFavorite: false
    }
  },

  // Practice Templates
  {
    id: 'practice-1',
    name: 'Annual Physical Exam',
    description: 'Complete annual physical examination template (organizational standard)',
    type: 'practice',
    content: {
      subjective: 'Patient presents for annual physical. Review of systems negative except as noted: [exceptions].',
      objective: 'General: Well-appearing, no acute distress\nVitals: BP: [BP], HR: [HR], T: [Temp], Weight: [Weight], BMI: [BMI]\nHEENT: [findings]\nCV: [findings]\nResp: [findings]\nAbd: [findings]\nExt: [findings]\nNeuro: [findings]',
      assessment: '[Age]-year-old with [significant medical history].\n1. [Condition 1]\n2. [Condition 2]',
      plan: '1. Labs: CBC, CMP, Lipid panel, HbA1c, TSH\n2. Age-appropriate cancer screenings\n3. Immunization review\n4. Health maintenance counseling\n5. Follow-up to review labs in 2 weeks'
    },
    metadata: {
      category: 'General',
      specialty: 'Family Medicine',
      appointmentTypes: ['Annual Physical', 'Preventive'],
      tags: ['annual-physical', 'preventive', 'health-maintenance'],
      version: '2.1',
      authorId: 'practice-admin',
      authorName: 'Practice Administrator',
      createdAt: '2025-01-15',
      updatedAt: '2025-10-01',
      usageCount: 248,
      isFavorite: false
    }
  },
  {
    id: 'practice-2',
    name: 'Skin Lesion Evaluation',
    description: 'Standardized dermatology template for skin lesion assessment',
    type: 'practice',
    content: {
      subjective: 'Patient presents with concern about [lesion location]. Present for [duration]. [Changes noted]. [Associated symptoms].',
      objective: 'Lesion location: [location]\nSize: [size] mm\nShape: [shape]\nBorder: [border characteristics]\nColor: [color]\nSurface: [surface characteristics]\nSymmetry: [symmetric/asymmetric]',
      assessment: 'Skin lesion, [location] - [clinical impression]\nDifferential: [differential diagnoses]',
      plan: '1. [Biopsy/monitoring/excision]\n2. Patient education on [topic]\n3. Sun protection counseling\n4. [Follow-up plan]'
    },
    metadata: {
      category: 'Dermatology',
      specialty: 'Dermatology',
      appointmentTypes: ['Acute Visit', 'New Patient'],
      tags: ['dermatology', 'skin-lesion', 'biopsy'],
      version: '1.5',
      authorId: 'practice-admin',
      authorName: 'Practice Administrator',
      createdAt: '2025-03-20',
      updatedAt: '2025-09-15',
      usageCount: 156,
      isFavorite: false
    }
  },

  // Community Templates
  {
    id: 'community-1',
    name: 'Anxiety/Depression Screening',
    description: 'Mental health screening with PHQ-9 and GAD-7 integration',
    type: 'community',
    content: {
      subjective: 'Patient reports [mood symptoms]. Duration: [duration]. Impact on daily functioning: [impact].\nPHQ-9 Score: [score]\nGAD-7 Score: [score]',
      objective: 'Appearance: [appearance]\nMood/Affect: [mood and affect]\nThought process: [thought process]\nJudgment/Insight: [judgment and insight]\nSafety: [safety assessment]',
      assessment: '1. [Depression/Anxiety] - [severity] (PHQ-9: [score], GAD-7: [score])\n2. [Other diagnoses]',
      plan: '1. [Medication management plan]\n2. Referral to therapy/counseling\n3. Safety planning reviewed\n4. Follow-up in [timeframe]\n5. Emergency contact information provided'
    },
    metadata: {
      category: 'Mental Health',
      specialty: 'Psychiatry',
      appointmentTypes: ['New Patient', 'Follow-up'],
      tags: ['mental-health', 'depression', 'anxiety', 'phq9', 'gad7'],
      version: '1.3',
      authorId: 'community-dr-lopez',
      authorName: 'Dr. Maria Lopez',
      createdAt: '2025-07-10',
      updatedAt: '2025-10-20',
      usageCount: 892,
      isFavorite: false
    }
  },
  {
    id: 'community-2',
    name: 'Joint Pain Evaluation',
    description: 'Orthopedic assessment for joint complaints',
    type: 'community',
    content: {
      subjective: 'Patient reports [joint] pain. Onset: [onset]. Mechanism: [mechanism if traumatic]. Character: [aching/sharp/etc]. Severity: [1-10]. Aggravating factors: [factors]. Relieving factors: [factors].',
      objective: 'Inspection: [swelling/deformity/erythema]\nPalpation: [tenderness/warmth]\nROM: [range of motion]\nStrength: [muscle strength]\nSpecial tests: [specific test results]\nNeurovascular: [intact/abnormal]',
      assessment: '[Joint] pain - [diagnosis/differential]\n[Associated diagnoses]',
      plan: '1. Imaging: [X-ray/MRI/CT if indicated]\n2. Treatment: [NSAIDs/PT/injection/surgery]\n3. Activity modification\n4. Home exercises\n5. Follow-up: [timeframe] or sooner if worsening'
    },
    metadata: {
      category: 'Orthopedics',
      specialty: 'Orthopedics',
      appointmentTypes: ['Acute Visit', 'New Patient', 'Follow-up'],
      tags: ['orthopedics', 'joint-pain', 'musculoskeletal'],
      version: '2.0',
      authorId: 'community-dr-chen',
      authorName: 'Dr. Robert Chen',
      createdAt: '2025-06-01',
      updatedAt: '2025-11-01',
      usageCount: 1243,
      isFavorite: false
    }
  },
  {
    id: 'community-3',
    name: 'Headache Evaluation',
    description: 'Comprehensive headache assessment with red flags',
    type: 'community',
    content: {
      subjective: 'Patient reports headache. Location: [location]. Quality: [quality]. Onset: [onset]. Duration: [duration]. Frequency: [frequency]. Associated symptoms: [n/v/photophobia/aura].\nRed flags: [sudden onset/worst headache ever/neurologic deficits/fever]',
      objective: 'General: [appearance]\nNeuro exam: CN II-XII intact, motor [5/5] throughout, sensory intact, reflexes [2+] symmetric, gait normal\nFundoscopic: [findings]\nNeck: Supple, no meningismus',
      assessment: 'Headache - [tension/migraine/cluster/secondary]\nDifferential: [differential diagnoses]',
      plan: '1. [Imaging if red flags present]\n2. Medication: [abortive/preventive]\n3. Trigger identification and avoidance\n4. Headache diary\n5. Follow-up: [timeframe]\n6. Return precautions reviewed'
    },
    metadata: {
      category: 'General',
      specialty: 'Neurology',
      appointmentTypes: ['Acute Visit', 'New Patient'],
      tags: ['headache', 'neurology', 'migraine'],
      version: '1.4',
      authorId: 'community-dr-patel',
      authorName: 'Dr. Anita Patel',
      createdAt: '2025-05-15',
      updatedAt: '2025-10-25',
      usageCount: 1567,
      isFavorite: false
    }
  }
];
