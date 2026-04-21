/**
 * Mock Clinical Data for Testing
 *
 * This file provides sample clinical data to populate the UI components
 * during development and testing before backend integration is complete.
 */

export const mockMedications = [
  {
    id: '1',
    name: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Once daily',
    route: 'oral',
    start_date: '2024-01-15',
    prescriber: 'Dr. John Smith',
    notes: 'Take in the morning with food',
    status: 'active' as const
  },
  {
    id: '2',
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    route: 'oral',
    start_date: '2024-02-01',
    prescriber: 'Dr. John Smith',
    notes: 'Take with meals to reduce GI upset',
    status: 'active' as const
  },
  {
    id: '3',
    name: 'Aspirin',
    dosage: '81mg',
    frequency: 'Once daily',
    route: 'oral',
    start_date: '2024-01-10',
    prescriber: 'Dr. John Smith',
    status: 'active' as const
  },
  {
    id: '4',
    name: 'Amoxicillin',
    dosage: '500mg',
    frequency: 'Three times daily',
    route: 'oral',
    start_date: '2023-11-01',
    end_date: '2023-11-10',
    prescriber: 'Dr. Jane Doe',
    notes: 'Completed course for ear infection',
    status: 'completed' as const
  }
];

export const mockLabResults = [
  {
    id: '1',
    test_name: 'Hemoglobin A1c',
    result_value: '6.8',
    unit: '%',
    reference_range: '4.0-5.6',
    status: 'abnormal' as const,
    date_collected: '2025-10-28',
    date_resulted: '2025-10-29',
    ordered_by: 'Dr. John Smith',
    lab_name: 'Quest Diagnostics',
    notes: 'Improved from last reading of 7.2%'
  },
  {
    id: '2',
    test_name: 'Total Cholesterol',
    result_value: '185',
    unit: 'mg/dL',
    reference_range: '<200',
    status: 'normal' as const,
    date_collected: '2025-10-28',
    date_resulted: '2025-10-29',
    ordered_by: 'Dr. John Smith',
    lab_name: 'Quest Diagnostics'
  },
  {
    id: '3',
    test_name: 'HDL Cholesterol',
    result_value: '55',
    unit: 'mg/dL',
    reference_range: '>40',
    status: 'normal' as const,
    date_collected: '2025-10-28',
    date_resulted: '2025-10-29',
    ordered_by: 'Dr. John Smith',
    lab_name: 'Quest Diagnostics'
  },
  {
    id: '4',
    test_name: 'LDL Cholesterol',
    result_value: '98',
    unit: 'mg/dL',
    reference_range: '<100',
    status: 'normal' as const,
    date_collected: '2025-10-28',
    date_resulted: '2025-10-29',
    ordered_by: 'Dr. John Smith',
    lab_name: 'Quest Diagnostics'
  },
  {
    id: '5',
    test_name: 'Creatinine',
    result_value: '1.1',
    unit: 'mg/dL',
    reference_range: '0.6-1.2',
    status: 'normal' as const,
    date_collected: '2025-10-28',
    date_resulted: '2025-10-29',
    ordered_by: 'Dr. John Smith',
    lab_name: 'Quest Diagnostics'
  }
];

export const mockLabOrders = [
  {
    id: '1',
    test_name: 'Lipid Panel',
    ordered_date: '2025-11-05',
    status: 'pending' as const,
    priority: 'routine' as const
  },
  {
    id: '2',
    test_name: 'Comprehensive Metabolic Panel',
    ordered_date: '2025-11-05',
    status: 'pending' as const,
    priority: 'routine' as const
  }
];

export const mockAllergies = [
  {
    id: '1',
    allergen: 'Penicillin',
    reaction: 'Hives and difficulty breathing',
    severity: 'severe' as const,
    onset_date: '2010-03-15',
    notes: 'Developed after taking amoxicillin. Use alternative antibiotics.',
    status: 'active' as const
  },
  {
    id: '2',
    allergen: 'Peanuts',
    reaction: 'Anaphylaxis',
    severity: 'life-threatening' as const,
    onset_date: '2005-08-20',
    notes: 'Carries EpiPen at all times. Strictly avoid all nut products.',
    status: 'active' as const
  },
  {
    id: '3',
    allergen: 'Latex',
    reaction: 'Skin rash and itching',
    severity: 'moderate' as const,
    onset_date: '2015-06-10',
    notes: 'Use non-latex gloves during procedures',
    status: 'active' as const
  }
];

export const mockConditions = [
  {
    id: '1',
    name: 'Type 2 Diabetes Mellitus',
    icd10_code: 'E11.9',
    status: 'chronic' as const,
    onset_date: '2020-01-15',
    notes: 'Well-controlled with Metformin. Patient monitors blood glucose daily.'
  },
  {
    id: '2',
    name: 'Essential Hypertension',
    icd10_code: 'I10',
    status: 'chronic' as const,
    onset_date: '2019-06-20',
    notes: 'Controlled with Lisinopril. BP target <130/80.'
  },
  {
    id: '3',
    name: 'Hyperlipidemia',
    icd10_code: 'E78.5',
    status: 'active' as const,
    onset_date: '2021-03-10',
    notes: 'Managed with diet and exercise. Monitoring lipid panel every 6 months.'
  },
  {
    id: '4',
    name: 'Acute Bronchitis',
    icd10_code: 'J20.9',
    status: 'resolved' as const,
    onset_date: '2023-11-01',
    resolved_date: '2023-11-15',
    notes: 'Treated with antibiotics and cough suppressant. Fully resolved.'
  }
];

export const mockImagingStudies = [
  {
    id: '1',
    study_type: 'Chest X-Ray',
    body_part: 'Chest',
    modality: 'X-Ray' as const,
    study_date: '2025-09-15',
    ordering_provider: 'Dr. John Smith',
    radiologist: 'Dr. Sarah Johnson',
    findings: 'No acute cardiopulmonary process. Heart size is normal. Lungs are clear without consolidation, effusion, or pneumothorax. No focal infiltrates.',
    impression: 'Normal chest radiograph.',
    status: 'completed' as const,
    accession_number: 'XR-2025-09-15-001',
    facility: 'City Medical Center Radiology'
  },
  {
    id: '2',
    study_type: 'Abdominal Ultrasound',
    body_part: 'Abdomen',
    modality: 'Ultrasound' as const,
    study_date: '2025-08-20',
    ordering_provider: 'Dr. John Smith',
    radiologist: 'Dr. Michael Chen',
    findings: 'Liver is normal in size and echogenicity without focal lesions. Gallbladder is unremarkable without stones or wall thickening. Pancreas is partially obscured by bowel gas but appears unremarkable in visualized portions. Kidneys are normal in size bilaterally without hydronephrosis or stones. Spleen is normal.',
    impression: 'Normal abdominal ultrasound.',
    status: 'completed' as const,
    accession_number: 'US-2025-08-20-047',
    facility: 'City Medical Center Radiology',
    notes: 'Patient fasting as instructed'
  },
  {
    id: '3',
    study_type: 'Knee MRI',
    body_part: 'Right Knee',
    modality: 'MRI' as const,
    study_date: '2025-11-10',
    ordering_provider: 'Dr. Robert Wilson',
    status: 'scheduled' as const,
    accession_number: 'MRI-2025-11-10-012',
    facility: 'Advanced Imaging Center',
    notes: 'Patient scheduled for 2:00 PM. Evaluate for meniscal tear.'
  }
];

export const mockDocuments = [
  {
    id: '1',
    title: 'Discharge Summary - Hospital Admission Oct 2025',
    document_type: 'discharge_summary' as const,
    file_name: 'discharge_summary_oct_2025.pdf',
    file_size: 245000,
    file_type: 'application/pdf',
    uploaded_by: 'Dr. John Smith',
    upload_date: '2025-10-25',
    notes: 'Patient admitted for diabetic ketoacidosis. Discharged in stable condition.'
  },
  {
    id: '2',
    title: 'Lab Results - Annual Physical',
    document_type: 'lab_report' as const,
    file_name: 'lab_results_annual_2025.pdf',
    file_size: 128000,
    file_type: 'application/pdf',
    uploaded_by: 'Quest Diagnostics',
    upload_date: '2025-10-29'
  },
  {
    id: '3',
    title: 'Cardiology Consultation Note',
    document_type: 'consultation' as const,
    file_name: 'cardiology_consult_sept_2025.pdf',
    file_size: 180000,
    file_type: 'application/pdf',
    uploaded_by: 'Dr. Emily Carter',
    upload_date: '2025-09-28',
    notes: 'EKG and echocardiogram normal. Continue current BP medications.'
  },
  {
    id: '4',
    title: 'Consent for Treatment',
    document_type: 'consent_form' as const,
    file_name: 'consent_treatment_2025.pdf',
    file_size: 95000,
    file_type: 'application/pdf',
    uploaded_by: 'Jane Doe (Patient)',
    upload_date: '2025-01-15'
  }
];

export const mockCarePlans = [
  {
    id: '1',
    title: 'Diabetes Management Care Plan',
    diagnosis: 'Type 2 Diabetes Mellitus (E11.9)',
    created_by: 'Dr. John Smith',
    created_date: '2025-01-20',
    last_updated: '2025-10-30',
    goals: [
      {
        id: 'g1',
        title: 'Lower HbA1c to < 7%',
        description: 'Achieve target HbA1c through medication adherence, diet modification, and regular exercise. Monitor blood glucose daily and track in log.',
        target_date: '2026-04-01',
        status: 'in_progress' as const,
        created_date: '2025-01-20',
        progress_notes: 'Current HbA1c 6.8% (down from 7.2%). Patient reports improved diet and regular walking 30 min/day.'
      },
      {
        id: 'g2',
        title: 'Lose 15 pounds',
        description: 'Gradual weight loss through portion control, reduced carbohydrate intake, and increased physical activity. Goal is 1-2 lbs per month.',
        target_date: '2026-01-01',
        status: 'in_progress' as const,
        created_date: '2025-01-20',
        progress_notes: 'Patient has lost 8 lbs so far. Reports feeling more energetic.'
      },
      {
        id: 'g3',
        title: 'Complete diabetes education classes',
        description: 'Attend 4-week diabetes self-management education program to learn about nutrition, medication, monitoring, and complication prevention.',
        target_date: '2025-03-01',
        status: 'achieved' as const,
        created_date: '2025-01-20',
        progress_notes: 'Completed all 4 sessions. Patient demonstrated excellent understanding of disease management.'
      }
    ],
    instructions: [
      {
        id: 'i1',
        instruction: 'Take Metformin 500mg twice daily with meals',
        category: 'medication' as const,
        priority: 'high' as const,
        frequency: 'Twice daily',
        created_date: '2025-01-20'
      },
      {
        id: 'i2',
        instruction: 'Check blood glucose fasting and 2 hours after dinner. Record in log.',
        category: 'monitoring' as const,
        priority: 'high' as const,
        frequency: 'Daily',
        created_date: '2025-01-20'
      },
      {
        id: 'i3',
        instruction: 'Follow low-carb, high-fiber diet. Limit refined sugars and processed foods.',
        category: 'diet' as const,
        priority: 'high' as const,
        frequency: 'Daily',
        created_date: '2025-01-20'
      },
      {
        id: 'i4',
        instruction: 'Walk for 30 minutes at least 5 days per week',
        category: 'exercise' as const,
        priority: 'medium' as const,
        frequency: '5x per week',
        created_date: '2025-01-20'
      },
      {
        id: 'i5',
        instruction: 'Schedule HbA1c test every 3 months',
        category: 'appointment' as const,
        priority: 'medium' as const,
        frequency: 'Quarterly',
        created_date: '2025-01-20'
      },
      {
        id: 'i6',
        instruction: 'Annual eye exam with ophthalmologist for diabetic retinopathy screening',
        category: 'appointment' as const,
        priority: 'medium' as const,
        frequency: 'Annually',
        created_date: '2025-01-20'
      },
      {
        id: 'i7',
        instruction: 'Check feet daily for cuts, sores, or signs of infection',
        category: 'monitoring' as const,
        priority: 'medium' as const,
        frequency: 'Daily',
        created_date: '2025-01-20'
      }
    ]
  }
];

/**
 * Get mock data for a specific patient
 */
export function getMockClinicalData(patientId: string) {
  return {
    medications: mockMedications,
    labResults: mockLabResults,
    labOrders: mockLabOrders,
    allergies: mockAllergies,
    conditions: mockConditions,
    imagingStudies: mockImagingStudies,
    documents: mockDocuments,
    carePlans: mockCarePlans
  };
}
