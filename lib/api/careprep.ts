/**
 * CarePrep API client
 * Functions for fetching CarePrep completion status
 */

export interface CarePrepStatus {
  appointment_id: string;
  medical_history_completed: boolean;
  symptom_checker_completed: boolean;
  all_tasks_completed: boolean;
  completion_percentage: number;
  completed_at?: string;
}

/**
 * Fetch CarePrep status for an appointment
 * @param appointmentId - The appointment ID
 * @returns CarePrep status object
 */
export async function getCarePrepStatus(appointmentId: string): Promise<CarePrepStatus | null> {
  try {
    const API_URL = process.env.API_URL || 'http://api:8000';
    const response = await fetch(`${API_URL}/api/careprep/${appointmentId}/status`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching CarePrep status:', error);
    return null;
  }
}

/**
 * Fetch CarePrep status for multiple appointments
 * @param appointmentIds - Array of appointment IDs
 * @returns Map of appointment ID to CarePrep status
 */
export async function getMultipleCarePrepStatus(
  appointmentIds: string[]
): Promise<Map<string, CarePrepStatus>> {
  const statusMap = new Map<string, CarePrepStatus>();

  // Fetch all statuses in parallel
  const promises = appointmentIds.map(async (id) => {
    const status = await getCarePrepStatus(id);
    if (status) {
      statusMap.set(id, status);
    }
  });

  await Promise.all(promises);
  return statusMap;
}
