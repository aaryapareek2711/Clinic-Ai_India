/**
 * API Client for Healthcare Application
 * Handles all communication with the FastAPI backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Use relative URL so requests go through Next.js proxy (/api/* → backend)
// This avoids CORS entirely - the proxy runs server-side
const API_BASE_URL = '';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // Clear token cookie
      document.cookie = 'token=; path=/; max-age=0';
      // Clear auth_token cookie (used by middleware)
      document.cookie = 'auth_token=; path=/; max-age=0';
    }
  }

  // ==================== Authentication ====================

  async register(data: {
    email: string;
    username: string;
    password: string;
    full_name: string;
    role: string;
  }) {
    const response = await this.client.post('/api/auth/register', data);
    if (response.data.access_token) {
      this.setToken(response.data.access_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Also set cookie with token for server-side rendering (used by middleware)
        document.cookie = `token=${response.data.access_token}; path=/; max-age=1800; SameSite=Lax`;
        document.cookie = `auth_token=${response.data.access_token}; path=/; max-age=1800; SameSite=Lax`;
      }
    }
    return response.data;
  }

  async login(username: string, password: string) {
    const response = await this.client.post('/api/auth/login', {
      username,
      password,
    });
    if (response.data.access_token) {
      this.setToken(response.data.access_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Also set cookie with token for server-side rendering (used by middleware)
        document.cookie = `token=${response.data.access_token}; path=/; max-age=1800; SameSite=Lax`;
        document.cookie = `auth_token=${response.data.access_token}; path=/; max-age=1800; SameSite=Lax`;
      }
    }
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/api/auth/logout');
    } catch (error) {
      // Ignore errors during logout (e.g., expired token causing 403)
      // Token will be cleared regardless in the finally block
      console.log('Logout API call failed (likely expired token), clearing local auth state');
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  async getUsers() {
    const response = await this.client.get('/api/auth/users');
    return response.data;
  }

  async updateUserRole(userId: string, role: string) {
    const response = await this.client.put(`/api/auth/users/${userId}/role`, { role });
    return response.data;
  }

  // ==================== Tenants ====================

  async getTenants(params?: {
    skip?: number;
    limit?: number;
    status_filter?: string;
    plan_filter?: string;
  }) {
    const response = await this.client.get('/api/tenants', { params });
    return response.data;
  }

  async getTenant(tenantId: string) {
    const response = await this.client.get(`/api/tenants/${tenantId}`);
    return response.data;
  }

  async getTenantStats(tenantId: string) {
    const response = await this.client.get(`/api/tenants/${tenantId}/stats`);
    return response.data;
  }

  async createTenant(data: any) {
    const response = await this.client.post('/api/tenants', data);
    return response.data;
  }

  async updateTenant(tenantId: string, data: any) {
    const response = await this.client.patch(`/api/tenants/${tenantId}`, data);
    return response.data;
  }

  async suspendTenant(tenantId: string) {
    const response = await this.client.post(`/api/tenants/${tenantId}/suspend`);
    return response.data;
  }

  async activateTenant(tenantId: string) {
    const response = await this.client.post(`/api/tenants/${tenantId}/activate`);
    return response.data;
  }

  async createInvitation(tenantId: string, data: { email: string; role: string }) {
    const response = await this.client.post(`/api/tenants/${tenantId}/invitations`, data);
    return response.data;
  }

  async getInvitations(tenantId: string) {
    const response = await this.client.get(`/api/tenants/${tenantId}/invitations`);
    return response.data;
  }

  async getTenantAnalytics(tenantId: string, period: string = '30d') {
    const response = await this.client.get(`/api/tenants/${tenantId}/analytics`, {
      params: { period },
    });
    return response.data;
  }

  async getGlobalAnalytics() {
    const response = await this.client.get('/api/tenants/admin/analytics');
    return response.data;
  }

  async getGlobalAuditLogs(params?: { skip?: number; limit?: number }) {
    const response = await this.client.get('/api/tenants/admin/audit-logs', { params });
    return response.data;
  }

  // ==================== CarePrep ====================

  async analyzeSymptoms(data: {
    symptoms: Array<{
      name: string;
      severity: string;
      duration: string;
      description?: string;
    }>;
    vital_signs?: Record<string, any>;
  }) {
    const response = await this.client.post('/api/careprep/analyze-symptoms', data);
    return response.data;
  }

  async triageAssessment(data: {
    symptoms: Array<{
      name: string;
      severity: string;
      duration: string;
      description?: string;
    }>;
    vital_signs?: Record<string, any>;
    age?: number;
    existing_conditions?: string[];
  }) {
    const response = await this.client.post('/api/careprep/triage-assessment', data);
    return response.data;
  }

  async generateQuestionnaire(data: {
    chief_complaint: string;
    symptoms?: string[];
  }) {
    const response = await this.client.post('/api/careprep/generate-questionnaire', data);
    return response.data;
  }

  /**
   * Get unified patient-facing appointment summary.
   *
   * This endpoint combines CarePrep symptom analysis with ContextAI
   * appointment preparation data into a single patient-friendly view.
   *
   * Implements the API "firewall" pattern that hides clinical metrics.
   */
  async getPatientSummary(patientId: string, options?: {
    include_appointment_prep?: boolean;
  }) {
    const params = new URLSearchParams();
    if (options?.include_appointment_prep !== undefined) {
      params.append('include_appointment_prep', String(options.include_appointment_prep));
    }

    const queryString = params.toString();
    const url = `/api/careprep/${patientId}/summary${queryString ? '?' + queryString : ''}`;

    const response = await this.client.get(url);
    return response.data;
  }

  // ==================== CarePrep Forms ====================

  async sendCarePrepViaWhatsApp(patientId: string, data?: {
    appointment_id?: string;
    phone?: string;
    language?: string;
    use_bilingual?: boolean;
  }) {
    const response = await this.client.post(`/api/careprep/forms/send-whatsapp/${patientId}`, {
      appointment_id: data?.appointment_id,
      phone: data?.phone,
      language: data?.language || 'hi',
      use_bilingual: data?.use_bilingual ?? true,
    });
    return response.data;
  }

  async startWhatsAppChat(patientId: string, data: {
    phone: string;
    appointment_id?: string;
    language?: string;
  }) {
    const response = await this.client.post(
      `/api/careprep/forms/start-whatsapp-chat/${patientId}`,
      {
        phone: data.phone,
        appointment_id: data.appointment_id,
        language: data.language || 'hi',
      }
    );
    return response.data as {
      session_id: string;
      phone: string;
      first_message: string;
    };
  }

  async sendCarePrepLink(patientId: string, appointmentId?: string) {
    const response = await this.client.post(`/api/careprep/forms/send/${patientId}`, null, {
      params: appointmentId ? { appointment_id: appointmentId } : undefined,
    });
    return response.data;
  }

  async getCarePrepStatus(appointmentId: string) {
    const response = await this.client.get(`/api/careprep/forms/${appointmentId}/status`);
    return response.data;
  }

  async validateCarePrepToken(token: string) {
    const response = await this.client.get(`/api/careprep/forms/token/${token}`);
    return response.data;
  }

  async getCarePrepFormByToken(token: string) {
    const response = await this.client.get(`/api/careprep/forms/form/${token}`);
    return response.data;
  }

  async submitCarePrepFormByToken(token: string, data: {
    medical_history?: Record<string, any>;
    symptoms?: Record<string, any>;
  }) {
    const response = await this.client.post(`/api/careprep/forms/form/${token}/submit`, data);
    return response.data;
  }

  // ==================== ContextAI ====================

  async getAppointmentContext(patientId: string, options?: {
    include_fhir?: boolean;
    include_previsit?: boolean;
  }) {
    const params = new URLSearchParams();
    if (options?.include_fhir !== undefined) {
      params.append('include_fhir', String(options.include_fhir));
    }
    if (options?.include_previsit !== undefined) {
      params.append('include_previsit', String(options.include_previsit));
    }

    const response = await this.client.get(
      `/api/contextai/context/${patientId}?${params.toString()}`
    );
    return response.data;
  }

  async getCareGaps(patientId: string) {
    const response = await this.client.get(`/api/contextai/care-gaps/${patientId}`);
    return response.data;
  }

  async getRiskAssessment(patientId: string) {
    const response = await this.client.get(`/api/contextai/risk-assessment/${patientId}`);
    return response.data;
  }

  async getTestResults(patientId: string) {
    const response = await this.client.get(`/api/contextai/test-results/${patientId}`);
    return response.data;
  }

  async getMedicationReview(patientId: string) {
    const response = await this.client.get(`/api/contextai/medication-review/${patientId}`);
    return response.data;
  }

  // ==================== Patients ====================

  async getPatients(page: number = 1, pageSize: number = 20) {
    const response = await this.client.get('/api/patients', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  async getPatient(patientId: string) {
    const response = await this.client.get(`/api/patients/${patientId}`);
    return response.data;
  }

  async createPatient(data: Record<string, any>) {
    const response = await this.client.post('/api/patients', data);
    return response.data;
  }

  async updatePatient(patientId: string, data: Record<string, any>) {
    const response = await this.client.put(`/api/patients/${patientId}`, data);
    return response.data;
  }

  // ==================== Visits ====================

  async createVisit(data: {
    patient_id: string;
    provider_id: string;
    visit_type: string;
    chief_complaint?: string;
    reason_for_visit?: string;
    scheduled_start?: string;
  }) {
    return await this.client.post('/api/visits', data);
  }

  async startVisit(visitId: string) {
    return await this.client.post(`/api/visits/${visitId}/start`);
  }

  async endVisit(visitId: string, data: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    vitals?: Record<string, any>;
    diagnoses?: Array<Record<string, any>>;
    medications?: Array<Record<string, any>>;
  }) {
    return await this.client.post(`/api/visits/${visitId}/end`, data);
  }

  async updateVisitNotes(visitId: string, data: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  }) {
    return await this.client.put(`/api/visits/${visitId}/notes`, data);
  }

  async getVisit(visitId: string) {
    return await this.client.get(`/api/visits/${visitId}`);
  }

  async getPatientVisits(patientId: string, status?: string) {
    const params = status ? { status_filter: status } : {};
    return await this.client.get(`/api/visits/patient/${patientId}`, { params });
  }

  async getProviderVisits(providerId: string, status?: string) {
    const params = status ? { status_filter: status } : {};
    return await this.client.get(`/api/visits/provider/${providerId}`, { params });
  }

  async cancelVisit(visitId: string) {
    return await this.client.delete(`/api/visits/${visitId}`);
  }

  async uploadAudioTranscription(visitId: string, audioFile: File, language: string = 'en-US') {
    const formData = new FormData();
    formData.append('audio_file', audioFile);

    return await this.client.post(`/api/visits/${visitId}/transcriptions`, formData, {
      params: { language },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async getVisitTranscriptions(visitId: string) {
    return await this.client.get(`/api/visits/${visitId}/transcriptions`);
  }

  // ==================== Notes + Transcription (current backend routes) ====================

  async uploadVisitTranscription(
    patientId: string,
    visitId: string,
    audioFile: File,
    options?: {
      language_mix?: string;
      speaker_mode?: 'two_speakers' | 'three_speakers';
    }
  ) {
    const formData = new FormData();
    formData.append('patient_id', patientId);
    formData.append('visit_id', visitId);
    formData.append('audio_file', audioFile);
    formData.append('language_mix', options?.language_mix || 'en');
    formData.append('speaker_mode', options?.speaker_mode || 'two_speakers');

    const response = await this.client.post('/notes/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getVisitTranscriptionStatus(patientId: string, visitId: string) {
    const response = await this.client.get(`/notes/transcribe/status/${encodeURIComponent(patientId)}/${encodeURIComponent(visitId)}`);
    return response.data;
  }

  async getVisitDialogue(patientId: string, visitId: string) {
    const response = await this.client.get(`/notes/${encodeURIComponent(patientId)}/visits/${encodeURIComponent(visitId)}/dialogue`, {
      validateStatus: (status) => status === 200 || status === 202,
    });
    return response;
  }

  async structureVisitDialogue(patientId: string, visitId: string) {
    const response = await this.client.post(`/notes/${encodeURIComponent(patientId)}/visits/${encodeURIComponent(visitId)}/dialogue/structure`);
    return response.data;
  }

  async generateClinicalNote(data: {
    patient_id: string;
    visit_id: string;
    transcription_job_id?: string;
    note_type?: 'india_clinical' | 'soap' | 'post_visit_summary';
    preferred_language?: string;
    follow_up_date?: string;
  }) {
    const response = await this.client.post('/notes/clinical-note', data);
    return response.data;
  }

  async getLatestClinicalNote(patientId: string, visitId: string) {
    const response = await this.client.get('/notes/clinical-note', {
      params: { patient_id: patientId, visit_id: visitId },
    });
    return response.data;
  }

  async generateSOAPNotes(visitId: string, transcriptId?: string) {
    const params = transcriptId ? { transcript_id: transcriptId } : {};
    const response = await this.client.post(`/api/visits/${visitId}/generate-soap`, null, { params });
    return response.data;
  }

  async refineSOAPSection(visitId: string, section: string, originalText: string, refinementInstructions: string) {
    const response = await this.client.post(`/api/visits/${visitId}/refine-soap-section`, {
      section,
      original_text: originalText,
      refinement_instructions: refinementInstructions,
    });
    return response.data;
  }

  // ==================== Clinical Data - Medications ====================

  async getPatientMedications(patientId: string) {
    const response = await this.client.get(`/api/clinical/patients/${patientId}/medications`);
    return response.data;
  }

  async createMedication(data: {
    patient_id: string;
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    start_date: string;
    end_date?: string;
    prescriber?: string;
    notes?: string;
    status?: string;
  }) {
    const response = await this.client.post('/api/clinical/medications', data);
    return response.data;
  }

  async updateMedication(medicationId: string, data: {
    name?: string;
    dosage?: string;
    frequency?: string;
    route?: string;
    end_date?: string;
    prescriber?: string;
    notes?: string;
    status?: string;
  }) {
    const response = await this.client.put(`/api/clinical/medications/${medicationId}`, data);
    return response.data;
  }

  async deleteMedication(medicationId: string) {
    await this.client.delete(`/api/clinical/medications/${medicationId}`);
  }

  // ==================== Clinical Data - Lab Results ====================

  async getPatientLabResults(patientId: string) {
    const response = await this.client.get(`/api/clinical/patients/${patientId}/lab-results`);
    return response.data;
  }

  async createLabResult(data: {
    patient_id: string;
    visit_id?: string;
    test_name: string;
    result_value: string;
    unit?: string;
    reference_range?: string;
    status?: string;
    date_collected: string;
    date_resulted: string;
    ordered_by?: string;
    lab_name?: string;
    notes?: string;
  }) {
    const response = await this.client.post('/api/clinical/lab-results', data);
    return response.data;
  }

  async getPatientLabOrders(patientId: string) {
    const response = await this.client.get(`/api/clinical/patients/${patientId}/lab-orders`);
    return response.data;
  }

  async createLabOrder(data: {
    patient_id: string;
    visit_id?: string;
    test_name: string;
    ordered_date: string;
    status?: string;
    priority?: string;
  }) {
    const response = await this.client.post('/api/clinical/lab-orders', data);
    return response.data;
  }

  // ==================== Clinical Data - Allergies ====================

  async getPatientAllergies(patientId: string) {
    const response = await this.client.get(`/api/clinical/patients/${patientId}/allergies`);
    return response.data;
  }

  async createAllergy(data: {
    patient_id: string;
    allergen: string;
    reaction: string;
    severity: string;
    onset_date?: string;
    notes?: string;
    status?: string;
  }) {
    const response = await this.client.post('/api/clinical/allergies', data);
    return response.data;
  }

  async updateAllergy(allergyId: string, data: {
    allergen?: string;
    reaction?: string;
    severity?: string;
    onset_date?: string;
    notes?: string;
    status?: string;
  }) {
    const response = await this.client.put(`/api/clinical/allergies/${allergyId}`, data);
    return response.data;
  }

  async deleteAllergy(allergyId: string) {
    await this.client.delete(`/api/clinical/allergies/${allergyId}`);
  }

  // ==================== Clinical Data - Conditions ====================

  async getPatientConditions(patientId: string) {
    const response = await this.client.get(`/api/clinical/patients/${patientId}/conditions`);
    return response.data;
  }

  async createCondition(data: {
    patient_id: string;
    name: string;
    icd10_code?: string;
    status?: string;
    onset_date?: string;
    resolved_date?: string;
    notes?: string;
  }) {
    const response = await this.client.post('/api/clinical/conditions', data);
    return response.data;
  }

  async updateCondition(conditionId: string, data: {
    name?: string;
    icd10_code?: string;
    status?: string;
    onset_date?: string;
    resolved_date?: string;
    notes?: string;
  }) {
    const response = await this.client.put(`/api/clinical/conditions/${conditionId}`, data);
    return response.data;
  }

  async deleteCondition(conditionId: string) {
    await this.client.delete(`/api/clinical/conditions/${conditionId}`);
  }

  // ==================== Clinical Data - Imaging Studies ====================

  async getPatientImagingStudies(patientId: string) {
    const response = await this.client.get(`/api/clinical/patients/${patientId}/imaging-studies`);
    return response.data;
  }

  async createImagingStudy(data: {
    patient_id: string;
    visit_id?: string;
    study_type: string;
    body_part: string;
    modality: string;
    study_date: string;
    ordering_provider?: string;
    radiologist?: string;
    findings?: string;
    impression?: string;
    status?: string;
    accession_number?: string;
    facility?: string;
    notes?: string;
  }) {
    const response = await this.client.post('/api/clinical/imaging-studies', data);
    return response.data;
  }

  async updateImagingStudy(studyId: string, data: {
    radiologist?: string;
    findings?: string;
    impression?: string;
    status?: string;
    notes?: string;
  }) {
    const response = await this.client.put(`/api/clinical/imaging-studies/${studyId}`, data);
    return response.data;
  }

  async deleteImagingStudy(studyId: string) {
    await this.client.delete(`/api/clinical/imaging-studies/${studyId}`);
  }

  // ==================== Clinical Data - Clinical Documents ====================

  async getPatientDocuments(patientId: string) {
    const response = await this.client.get(`/api/clinical/patients/${patientId}/documents`);
    return response.data;
  }

  async createDocument(data: {
    patient_id: string;
    visit_id?: string;
    title: string;
    document_type: string;
    file_name: string;
    file_size: number;
    file_type: string;
    file_path?: string;
    uploaded_by: string;
    notes?: string;
  }) {
    const response = await this.client.post('/api/clinical/documents', data);
    return response.data;
  }

  async deleteDocument(documentId: string) {
    await this.client.delete(`/api/clinical/documents/${documentId}`);
  }

  // ==================== Clinical Data - Care Plans ====================

  async getPatientCarePlans(patientId: string) {
    const response = await this.client.get(`/api/clinical/patients/${patientId}/care-plans`);
    return response.data;
  }

  async createCarePlan(data: {
    patient_id: string;
    title: string;
    diagnosis?: string;
    created_by: string;
    goals?: Array<{
      title: string;
      description: string;
      target_date?: string;
      status?: string;
      progress_notes?: string;
    }>;
    instructions?: Array<{
      instruction: string;
      category: string;
      priority?: string;
      frequency?: string;
    }>;
  }) {
    const response = await this.client.post('/api/clinical/care-plans', data);
    return response.data;
  }

  async addCareGoal(planId: string, data: {
    title: string;
    description: string;
    target_date?: string;
    status?: string;
    progress_notes?: string;
  }) {
    const response = await this.client.post(`/api/clinical/care-plans/${planId}/goals`, data);
    return response.data;
  }

  async updateCareGoal(goalId: string, data: {
    title?: string;
    description?: string;
    target_date?: string;
    status?: string;
    progress_notes?: string;
  }) {
    const response = await this.client.put(`/api/clinical/care-plans/goals/${goalId}`, data);
    return response.data;
  }

  async addFollowUpInstruction(planId: string, data: {
    instruction: string;
    category: string;
    priority?: string;
    frequency?: string;
  }) {
    const response = await this.client.post(`/api/clinical/care-plans/${planId}/instructions`, data);
    return response.data;
  }

  // ==================== Templates ====================

  async createTemplate(data: {
    name: string;
    description?: string;
    type?: string;
    category?: string;
    specialty?: string;
    content: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
    tags?: string[];
    appointment_types?: string[];
    is_favorite?: boolean;
    practice_id?: string;
  }) {
    const response = await this.client.post('/api/templates', data);
    return response.data;
  }

  async getTemplate(templateId: string) {
    const response = await this.client.get(`/api/templates/${templateId}`);
    return response.data;
  }

  async listTemplates(params?: {
    type?: string;
    category?: string;
    specialty?: string;
    tags?: string;
    appointment_type?: string;
    search?: string;
    is_favorite?: boolean;
    practice_id?: string;
    page?: number;
    page_size?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const response = await this.client.get(`/api/templates?${queryParams.toString()}`);
    return response.data;
  }

  async updateTemplate(templateId: string, data: {
    name?: string;
    description?: string;
    category?: string;
    specialty?: string;
    content?: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    };
    tags?: string[];
    appointment_types?: string[];
    is_favorite?: boolean;
    is_active?: boolean;
  }) {
    const response = await this.client.put(`/api/templates/${templateId}`, data);
    return response.data;
  }

  async deleteTemplate(templateId: string) {
    const response = await this.client.delete(`/api/templates/${templateId}`);
    return response.data;
  }

  async publishTemplate(templateId: string, data: {
    author_name: string;
    description?: string;
  }) {
    const response = await this.client.post(`/api/templates/${templateId}/publish`, data);
    return response.data;
  }

  async unpublishTemplate(templateId: string) {
    const response = await this.client.post(`/api/templates/${templateId}/unpublish`);
    return response.data;
  }

  async duplicateTemplate(templateId: string, data?: {
    new_name?: string;
  }) {
    const response = await this.client.post(`/api/templates/${templateId}/duplicate`, data || {});
    return response.data;
  }

  async recordTemplateUsage(templateId: string, visitId?: string, patientId?: string) {
    const response = await this.client.post(`/api/templates/${templateId}/use`, {
      visit_id: visitId,
      patient_id: patientId,
    });
    return response.data;
  }

  async toggleTemplateFavorite(templateId: string) {
    const response = await this.client.post(`/api/templates/${templateId}/favorite`);
    return response.data;
  }

  // ==================== Analytics ====================

  async getDashboard(scope?: string, scopeId?: string) {
    const params = new URLSearchParams();
    if (scope) params.append('scope', scope);
    if (scopeId) params.append('scope_id', scopeId);
    const response = await this.client.get(`/api/analytics/dashboard?${params.toString()}`);
    return response.data;
  }

  async getPlatformDashboard() {
    const response = await this.client.get('/api/analytics/dashboard/platform');
    return response.data;
  }

  async getTenantDashboard(tenantId: string) {
    const response = await this.client.get(`/api/analytics/dashboard/tenant/${tenantId}`);
    return response.data;
  }

  async getMetricTimeseries(
    metricName: string,
    params?: {
      scope?: string;
      scope_id?: string;
      start_date?: string;
      end_date?: string;
      period?: string;
    }
  ) {
    const queryParams = new URLSearchParams();
    if (params?.scope) queryParams.append('scope', params.scope);
    if (params?.scope_id) queryParams.append('scope_id', params.scope_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.period) queryParams.append('period', params.period);
    const response = await this.client.get(`/api/analytics/metrics/${metricName}/timeseries?${queryParams.toString()}`);
    return response.data;
  }

  async getMetricComparison(
    metricName: string,
    params?: {
      scope?: string;
      scope_id?: string;
      days?: number;
    }
  ) {
    const queryParams = new URLSearchParams();
    if (params?.scope) queryParams.append('scope', params.scope);
    if (params?.scope_id) queryParams.append('scope_id', params.scope_id);
    if (params?.days) queryParams.append('days', params.days.toString());
    const response = await this.client.get(`/api/analytics/metrics/${metricName}/comparison?${queryParams.toString()}`);
    return response.data;
  }

  async getMetricDefinitions(category?: string) {
    const params = category ? `?category=${category}` : '';
    const response = await this.client.get(`/api/analytics/metrics/definitions${params}`);
    return response.data;
  }

  async generateSnapshot(scope: string, scopeId?: string) {
    const params = new URLSearchParams();
    params.append('scope', scope);
    if (scopeId) params.append('scope_id', scopeId);
    const response = await this.client.post(`/api/analytics/snapshots/generate?${params.toString()}`);
    return response.data;
  }

  // ==================== User Management ====================

  async getUsers(params?: {
    tenant_id?: string;
    role?: string;
    search?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.tenant_id) queryParams.append('tenant_id', params.tenant_id);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const response = await this.client.get(`/api/users?${queryParams.toString()}`);
    return response.data;
  }

  async getUserById(userId: string) {
    const response = await this.client.get(`/api/users/${userId}`);
    return response.data;
  }

  async createUser(data: {
    email: string;
    full_name: string;
    tenant_id?: string;
    role_id?: string;
    password?: string;
    send_invitation?: boolean;
  }) {
    const response = await this.client.post('/api/users', data);
    return response.data;
  }

  async updateUser(userId: string, data: {
    full_name?: string;
    is_active?: boolean;
    tenant_id?: string;
    metadata?: Record<string, unknown>;
  }) {
    const response = await this.client.patch(`/api/users/${userId}`, data);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete(`/api/users/${userId}`);
    return response.data;
  }

  async getUserRoles(userId: string) {
    const response = await this.client.get(`/api/users/${userId}/roles`);
    return response.data;
  }

  async assignUserRole(userId: string, data: {
    role_id: string;
    scope_type: string;
    scope_id?: string;
    is_primary?: boolean;
    expires_at?: string;
  }) {
    const response = await this.client.post(`/api/users/${userId}/roles`, data);
    return response.data;
  }

  async revokeUserRole(userId: string, roleAssignmentId: string) {
    const response = await this.client.delete(`/api/users/${userId}/roles?assignment_id=${roleAssignmentId}`);
    return response.data;
  }

  async getAvailableRoles(scopeType?: string) {
    const params = scopeType ? `?scope_type=${scopeType}` : '';
    const response = await this.client.get(`/api/users/roles/available${params}`);
    return response.data;
  }

  // ==================== Support Access ====================

  async getMySupportGrants() {
    const response = await this.client.get('/api/support-access/my-grants');
    return response.data;
  }

  async requestSupportAccess(data: {
    tenant_id: string;
    access_level: 'metadata' | 'full';
    reason: string;
    requested_hours?: number;
  }) {
    const response = await this.client.post('/api/support-access/request', data);
    return response.data;
  }

  async getTenantSupportGrants(tenantId: string, includeRevoked?: boolean) {
    const params = includeRevoked !== undefined ? `?include_revoked=${includeRevoked}` : '';
    const response = await this.client.get(`/api/support-access/tenant/${tenantId}/grants${params}`);
    return response.data;
  }

  async grantSupportAccess(tenantId: string, data: {
    user_id: string;
    access_level: 'metadata' | 'full';
    duration_hours?: number;
    reason?: string;
  }) {
    const response = await this.client.post(`/api/support-access/tenant/${tenantId}/grant`, data);
    return response.data;
  }

  async revokeSupportGrant(grantId: string, reason?: string) {
    const body = reason ? { reason } : {};
    const response = await this.client.post(`/api/support-access/grant/${grantId}/revoke`, body);
    return response.data;
  }

  async getAllSupportGrants(activeOnly?: boolean, tenantId?: string) {
    const params = new URLSearchParams();
    if (activeOnly !== undefined) params.append('active_only', activeOnly.toString());
    if (tenantId) params.append('tenant_id', tenantId);
    const response = await this.client.get(`/api/support-access/all?${params.toString()}`);
    return response.data;
  }
}

export const apiClient = new APIClient();
export default apiClient;
