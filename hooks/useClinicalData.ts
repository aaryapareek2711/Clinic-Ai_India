/**
 * Custom hook for managing clinical data
 * Handles loading, creating, updating, and deleting clinical records
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface UseClinicalDataOptions {
  patientId: string;
  autoLoad?: boolean;
}

export function useClinicalData({ patientId, autoLoad = true }: UseClinicalDataOptions) {
  const [medications, setMedications] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [imagingStudies, setImagingStudies] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all clinical data
  const loadAllData = async () => {
    if (!patientId) return;

    setLoading(true);
    setError(null);

    try {
      const [
        medsData,
        labResultsData,
        labOrdersData,
        allergiesData,
        conditionsData,
        imagingData,
        docsData,
        carePlansData,
      ] = await Promise.all([
        apiClient.getPatientMedications(patientId),
        apiClient.getPatientLabResults(patientId),
        apiClient.getPatientLabOrders(patientId),
        apiClient.getPatientAllergies(patientId),
        apiClient.getPatientConditions(patientId),
        apiClient.getPatientImagingStudies(patientId),
        apiClient.getPatientDocuments(patientId),
        apiClient.getPatientCarePlans(patientId),
      ]);

      setMedications(medsData);
      setLabResults(labResultsData);
      setLabOrders(labOrdersData);
      setAllergies(allergiesData);
      setConditions(conditionsData);
      setImagingStudies(imagingData);
      setDocuments(docsData);
      setCarePlans(carePlansData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load clinical data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && patientId) {
      loadAllData();
    }
  }, [patientId, autoLoad]);

  // ==================== Medications ====================

  const addMedication = async (data: any) => {
    try {
      const newMed = await apiClient.createMedication({ ...data, patient_id: patientId });
      setMedications([...medications, newMed]);
      toast.success('Medication added successfully');
      return newMed;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add medication';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateMedication = async (medicationId: string, data: any) => {
    try {
      const updated = await apiClient.updateMedication(medicationId, data);
      setMedications(medications.map(m => m.id === medicationId ? updated : m));
      toast.success('Medication updated successfully');
      return updated;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update medication';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteMedication = async (medicationId: string) => {
    try {
      await apiClient.deleteMedication(medicationId);
      setMedications(medications.filter(m => m.id !== medicationId));
      toast.success('Medication deleted successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete medication';
      toast.error(errorMessage);
      throw err;
    }
  };

  // ==================== Lab Results ====================

  const addLabResult = async (data: any) => {
    try {
      const newResult = await apiClient.createLabResult({ ...data, patient_id: patientId });
      setLabResults([...labResults, newResult]);
      toast.success('Lab result added successfully');
      return newResult;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add lab result';
      toast.error(errorMessage);
      throw err;
    }
  };

  const addLabOrder = async (data: any) => {
    try {
      const newOrder = await apiClient.createLabOrder({ ...data, patient_id: patientId });
      setLabOrders([...labOrders, newOrder]);
      toast.success('Lab order created successfully');
      return newOrder;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create lab order';
      toast.error(errorMessage);
      throw err;
    }
  };

  // ==================== Allergies ====================

  const addAllergy = async (data: any) => {
    try {
      const newAllergy = await apiClient.createAllergy({ ...data, patient_id: patientId });
      setAllergies([...allergies, newAllergy]);
      toast.success('Allergy added successfully');
      return newAllergy;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add allergy';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateAllergy = async (allergyId: string, data: any) => {
    try {
      const updated = await apiClient.updateAllergy(allergyId, data);
      setAllergies(allergies.map(a => a.id === allergyId ? updated : a));
      toast.success('Allergy updated successfully');
      return updated;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update allergy';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteAllergy = async (allergyId: string) => {
    try {
      await apiClient.deleteAllergy(allergyId);
      setAllergies(allergies.filter(a => a.id !== allergyId));
      toast.success('Allergy deleted successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete allergy';
      toast.error(errorMessage);
      throw err;
    }
  };

  // ==================== Conditions ====================

  const addCondition = async (data: any) => {
    try {
      const newCondition = await apiClient.createCondition({ ...data, patient_id: patientId });
      setConditions([...conditions, newCondition]);
      toast.success('Condition added successfully');
      return newCondition;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add condition';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateCondition = async (conditionId: string, data: any) => {
    try {
      const updated = await apiClient.updateCondition(conditionId, data);
      setConditions(conditions.map(c => c.id === conditionId ? updated : c));
      toast.success('Condition updated successfully');
      return updated;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update condition';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteCondition = async (conditionId: string) => {
    try {
      await apiClient.deleteCondition(conditionId);
      setConditions(conditions.filter(c => c.id !== conditionId));
      toast.success('Condition deleted successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete condition';
      toast.error(errorMessage);
      throw err;
    }
  };

  // ==================== Imaging Studies ====================

  const addImagingStudy = async (data: any) => {
    try {
      const newStudy = await apiClient.createImagingStudy({ ...data, patient_id: patientId });
      setImagingStudies([...imagingStudies, newStudy]);
      toast.success('Imaging study added successfully');
      return newStudy;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add imaging study';
      toast.error(errorMessage);
      throw err;
    }
  };

  const updateImagingStudy = async (studyId: string, data: any) => {
    try {
      const updated = await apiClient.updateImagingStudy(studyId, data);
      setImagingStudies(imagingStudies.map(s => s.id === studyId ? updated : s));
      toast.success('Imaging study updated successfully');
      return updated;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update imaging study';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteImagingStudy = async (studyId: string) => {
    try {
      await apiClient.deleteImagingStudy(studyId);
      setImagingStudies(imagingStudies.filter(s => s.id !== studyId));
      toast.success('Imaging study deleted successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete imaging study';
      toast.error(errorMessage);
      throw err;
    }
  };

  // ==================== Documents ====================

  const addDocument = async (data: any) => {
    try {
      const newDoc = await apiClient.createDocument({ ...data, patient_id: patientId });
      setDocuments([...documents, newDoc]);
      toast.success('Document uploaded successfully');
      return newDoc;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to upload document';
      toast.error(errorMessage);
      throw err;
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      await apiClient.deleteDocument(documentId);
      setDocuments(documents.filter(d => d.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete document';
      toast.error(errorMessage);
      throw err;
    }
  };

  // ==================== Care Plans ====================

  const addCarePlan = async (data: any) => {
    try {
      const newPlan = await apiClient.createCarePlan({ ...data, patient_id: patientId });
      setCarePlans([...carePlans, newPlan]);
      toast.success('Care plan created successfully');
      return newPlan;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create care plan';
      toast.error(errorMessage);
      throw err;
    }
  };

  return {
    // State
    medications,
    labResults,
    labOrders,
    allergies,
    conditions,
    imagingStudies,
    documents,
    carePlans,
    loading,
    error,

    // Actions
    loadAllData,

    // Medications
    addMedication,
    updateMedication,
    deleteMedication,

    // Lab Results
    addLabResult,
    addLabOrder,

    // Allergies
    addAllergy,
    updateAllergy,
    deleteAllergy,

    // Conditions
    addCondition,
    updateCondition,
    deleteCondition,

    // Imaging
    addImagingStudy,
    updateImagingStudy,
    deleteImagingStudy,

    // Documents
    addDocument,
    deleteDocument,

    // Care Plans
    addCarePlan,
  };
}
