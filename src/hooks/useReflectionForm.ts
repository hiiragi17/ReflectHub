import { useState, useCallback } from 'react';

interface FormData {
  [key: string]: string;
}

type SubmitStatus = 'idle' | 'success' | 'error';

export const useReflectionForm = () => {
  const [formData, setFormData] = useState<FormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const updateField = useCallback((fieldId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({});
    setErrorMessage('');
  }, []);

  const clearField = useCallback((fieldId: string) => {
    setFormData((prev) => {
      const newData = { ...prev };
      delete newData[fieldId];
      return newData;
    });
  }, []);

  return {
    formData,
    isSubmitting,
    submitStatus,
    errorMessage,
    updateField,
    resetForm,
    clearField,
    setIsSubmitting,
    setSubmitStatus,
    setErrorMessage,
  };
};