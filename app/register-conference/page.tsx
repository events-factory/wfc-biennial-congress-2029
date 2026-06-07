'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PaymentModal from '@/components/PaymentModal';
import SearchableSelect from '@/components/SearchableSelect';
import {
  registrationApi,
  authApi,
  RegistrationCategory,
  FormInputGroup,
} from '@/lib/api';
import {
  initializePayment,
  processPayment,
  requiresPayment,
  parseFeeAmount,
  extractCurrency,
  PaymentResult,
  PaymentSession,
  PaymentGuest,
} from '@/lib/payment';

type AttendanceType = 'PHYSICAL' | 'VIRTUAL';
type RegistrationType = 'single' | 'group';

interface FormValues {
  [key: string]: string | string[];
}

interface Guest {
  firstName: string;
  lastName: string;
  email: string;
  categoryId: number;
  badgeId?: string; // Store pre-generated badge ID
}

export default function RegisterConferencePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventType, setEventType] = useState<
    'HYBRID' | 'PHYSICAL' | 'VIRTUAL' | null
  >(null);
  const [attendanceType, setAttendanceType] = useState<AttendanceType | null>(
    null,
  );
  const [categories, setCategories] = useState<RegistrationCategory[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<RegistrationCategory | null>(null);
  const [formGroups, setFormGroups] = useState<FormInputGroup[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [paymentData, setPaymentData] = useState({
    orderId: '',
    paymentToken: '',
    paymentSession: '',
    transactionId: '',
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [showRegistrationTypeModal, setShowRegistrationTypeModal] = useState(false);
  const [registrationType, setRegistrationType] = useState<RegistrationType>('single');
  const [pendingCategory, setPendingCategory] = useState<RegistrationCategory | null>(null);
  const [guests, setGuests] = useState<Guest[]>([{ firstName: '', lastName: '', email: '', categoryId: 0 }]);
  const [guestErrors, setGuestErrors] = useState<Record<number, Record<string, string>>>({});

  // Excel upload state
  const [inputMethod, setInputMethod] = useState<'manual' | 'excel'>('manual');
  const [excelRawData, setExcelRawData] = useState<Record<string, string>[]>([]);
  const [excelFileColumns, setExcelFileColumns] = useState<string[]>([]);
  const [excelColumnMapping, setExcelColumnMapping] = useState({
    email: '',
    firstName: '',
    lastName: ''
  });
  const [excelMappingConfirmed, setExcelMappingConfirmed] = useState(false);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelError, setExcelError] = useState('');

  useEffect(() => {
    loadRegistrationPage();
  }, []);

  const loadRegistrationPage = async () => {
    setLoading(true);
    try {
      const response = await registrationApi.getRegistrationPage();
      setEventType(response.event_description.event_type);

      // If not hybrid, automatically set attendance type and load categories
      if (response.event_description.event_type !== 'HYBRID') {
        setAttendanceType(
          response.event_description.event_type as AttendanceType,
        );
        await loadCategories(
          response.event_description.event_type as AttendanceType,
        );
      }
    } catch (err) {
      setError('Failed to load registration page');
      console.error(err);
    }
    setLoading(false);
  };

  const loadCategories = async (type: AttendanceType) => {
    setLoading(true);
    try {
      const response = await registrationApi.getCategories(type);
      setCategories(response.data || []);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    }
    setLoading(false);
  };

  const selectAttendance = async (type: AttendanceType) => {
    setAttendanceType(type);
    await loadCategories(type);
  };

  const selectCategory = async (category: RegistrationCategory) => {
    setSelectedCategory(category);
    setLoading(true);

    // Check if payment is required
    const needsPayment = requiresPayment(category.fee);
    setPaymentRequired(needsPayment);

    // Generate order ID if payment is required
    if (needsPayment) {
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setPaymentData(prev => ({ ...prev, orderId }));
    }

    try {
      const response = await registrationApi.getCategoryForm(
        category.id,
        attendanceType!,
      );
      setFormGroups(response.data || []);
      setCurrentStep(0);
    } catch (err) {
      setError('Failed to load registration form');
      console.error(err);
    }
    setLoading(false);
  };

  const handleRegisterClick = (category: RegistrationCategory) => {
    setPendingCategory(category);
    setShowRegistrationTypeModal(true);
  };

  const handleRegistrationTypeSelect = async (type: RegistrationType) => {
    setRegistrationType(type);
    setShowRegistrationTypeModal(false);
    if (type === 'group') {
      setGuests([{ firstName: '', lastName: '', email: '', categoryId: pendingCategory?.id || 0 }]);
    }
    if (pendingCategory) {
      await selectCategory(pendingCategory);
    }
  };

  const addGuest = () => {
    setGuests((prev) => [...prev, { firstName: '', lastName: '', email: '', categoryId: selectedCategory?.id || 0 }]);
  };

  const removeGuest = (index: number) => {
    setGuests((prev) => prev.filter((_, i) => i !== index));
    setGuestErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  const updateGuest = (index: number, field: keyof Guest, value: string | number) => {
    setGuests((prev) =>
      prev.map((guest, i) => (i === index ? { ...guest, [field]: value } : guest)),
    );
    // Clear field error on change
    if (guestErrors[index]?.[field]) {
      setGuestErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[index]) {
          delete newErrors[index][field];
          if (Object.keys(newErrors[index]).length === 0) delete newErrors[index];
        }
        return newErrors;
      });
    }
  };

  const validateGuests = (): boolean => {
    const errors: Record<number, Record<string, string>> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    guests.forEach((guest, index) => {
      const guestErrs: Record<string, string> = {};
      if (!guest.firstName.trim()) guestErrs.firstName = 'First name is required';
      if (!guest.lastName.trim()) guestErrs.lastName = 'Last name is required';
      if (!guest.email.trim()) {
        guestErrs.email = 'Email is required';
      } else if (!emailRegex.test(guest.email)) {
        guestErrs.email = 'Invalid email address';
      }
      if (!guest.categoryId || guest.categoryId === 0) {
        guestErrs.categoryId = 'Category is required';
      }
      if (Object.keys(guestErrs).length > 0) errors[index] = guestErrs;
    });

    setGuestErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Excel upload helper functions
  const guessColumnMapping = (columns: string[]): { email: string; firstName: string; lastName: string } => {
    const mapping = { email: '', firstName: '', lastName: '' };

    const normalizeForMatching = (str: string): string => {
      return str.toLowerCase().trim().replace(/[\s_-]+/g, '');
    };

    const emailPatterns = ['email', 'emailaddress', 'mail', 'e-mail', 'courriel'];
    const firstNamePatterns = ['firstname', 'first', 'givenname', 'prenom', 'prénom', 'fname'];
    const lastNamePatterns = ['lastname', 'last', 'surname', 'familyname', 'nom', 'lname'];

    columns.forEach((col) => {
      const normalized = normalizeForMatching(col);

      if (!mapping.email && emailPatterns.some((p) => normalized.includes(p))) {
        mapping.email = col;
      }
      if (!mapping.firstName && firstNamePatterns.some((p) => normalized.includes(p))) {
        mapping.firstName = col;
      }
      if (!mapping.lastName && lastNamePatterns.some((p) => normalized.includes(p))) {
        mapping.lastName = col;
      }
    });

    return mapping;
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelError('');
    setExcelRawData([]);
    setExcelMappingConfirmed(false);
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          setExcelError('The file appears to be empty');
          setExcelRawData([]);
          setExcelFileColumns([]);
          return;
        }

        const columns = Object.keys(jsonData[0]);
        setExcelFileColumns(columns);
        setExcelRawData(jsonData);

        const guessedMapping = guessColumnMapping(columns);
        setExcelColumnMapping(guessedMapping);
      } catch (err) {
        setExcelError('Failed to parse the file. Please ensure it is a valid CSV or Excel file.');
        setExcelRawData([]);
        setExcelFileColumns([]);
      }
    };

    reader.onerror = () => {
      setExcelError('Failed to read the file');
      setExcelRawData([]);
      setExcelFileColumns([]);
    };

    reader.readAsBinaryString(file);
  };

  const handleExcelMappingChange = (field: 'email' | 'firstName' | 'lastName', value: string) => {
    setExcelColumnMapping((prev) => ({ ...prev, [field]: value }));
  };

  const isExcelMappingComplete = (): boolean => {
    return !!(excelColumnMapping.email && excelColumnMapping.firstName && excelColumnMapping.lastName);
  };

  const getUnmappedExcelColumns = (currentField: 'email' | 'firstName' | 'lastName'): string[] => {
    const usedColumns = Object.entries(excelColumnMapping)
      .filter(([key, value]) => key !== currentField && value)
      .map(([_, value]) => value);

    return excelFileColumns.filter((col) => !usedColumns.includes(col));
  };

  const confirmExcelMapping = () => {
    if (!isExcelMappingComplete()) {
      setExcelError('Please map all required fields');
      return;
    }

    setExcelError('');

    const mapped: Guest[] = excelRawData.map((row) => ({
      email: String(row[excelColumnMapping.email] || '').trim(),
      firstName: String(row[excelColumnMapping.firstName] || '').trim(),
      lastName: String(row[excelColumnMapping.lastName] || '').trim(),
      categoryId: selectedCategory?.id || 0,
    }));

    const validRows = mapped.filter(
      (row) => row.email && row.firstName && row.lastName
    );

    if (validRows.length === 0) {
      setExcelError('No valid rows found after applying the column mapping.');
      return;
    }

    if (validRows.length < mapped.length) {
      setExcelError(
        `${mapped.length - validRows.length} row(s) were skipped due to missing required fields.`
      );
    }

    setGuests(validRows);
    setExcelMappingConfirmed(true);
  };

  const resetExcelUpload = () => {
    setExcelRawData([]);
    setExcelFileColumns([]);
    setExcelColumnMapping({ email: '', firstName: '', lastName: '' });
    setExcelMappingConfirmed(false);
    setExcelFileName('');
    setExcelError('');
  };

  const switchInputMethod = (method: 'manual' | 'excel') => {
    setInputMethod(method);

    // Clear Excel state when switching to manual
    if (method === 'manual') {
      resetExcelUpload();
    }
  };

  // Determine the total steps: for group registration, insert a "Group Members" step before the last form step
  const isGroupRegistration = registrationType === 'group';
  const groupMembersStepIndex = isGroupRegistration && formGroups.length > 0
    ? formGroups.length - 1
    : -1;
  const totalSteps = isGroupRegistration ? formGroups.length + 1 : formGroups.length;

  // Map currentStep to either a form group or the group members step
  const isOnGroupMembersStep = isGroupRegistration && currentStep === groupMembersStepIndex;
  const actualFormGroupIndex = isGroupRegistration && currentStep > groupMembersStepIndex
    ? currentStep - 1
    : currentStep;

  // For group registration, sum individual category fees for all participants
  const totalParticipants = isGroupRegistration ? 1 + guests.length : 1;
  const getPaymentAmount = (fee: string) => {
    if (!isGroupRegistration) {
      return parseFeeAmount(fee);
    }

    // Start with main registrant's fee
    let total = parseFeeAmount(fee);

    // Add each guest's category fee
    guests.forEach((guest) => {
      const guestCategory = categories.find((cat) => cat.id === guest.categoryId);
      if (guestCategory) {
        total += parseFeeAmount(guestCategory.fee);
      }
    });

    return total;
  };

  const handleInputChange = (inputCode: string, value: string | string[]) => {
    setFormValues((prev) => ({
      ...prev,
      [inputCode]: value,
    }));

    // Clear field error when user starts typing
    if (fieldErrors[inputCode]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[inputCode];
        return newErrors;
      });

      // Update general errors list as well
      setFormErrors((prev) =>
        prev.filter(err => !err.startsWith(
          formGroups[currentStep]?.inputs.find(({ input }) => input.inputcode === inputCode)?.input.nameEnglish || ''
        ))
      );
    }
  };

  const validateStep = useCallback(() => {
    // If on group members step, validate guests instead
    if (isOnGroupMembersStep) {
      return validateGuests();
    }

    const currentGroup = formGroups[actualFormGroupIndex];
    if (!currentGroup) return true;

    const errors: string[] = [];
    const fieldErrs: Record<string, string> = {};

    currentGroup.inputs.forEach(({ input }) => {
      const value = formValues[input.inputcode];
      const isEmpty = !value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === '');

      // Check if required field is empty
      if (input.is_mandatory === 'YES' && isEmpty) {
        const errorMsg = `${input.nameEnglish} is required`;
        errors.push(errorMsg);
        fieldErrs[input.inputcode] = errorMsg;
        return;
      }

      // Additional validation for specific input types
      if (!isEmpty && typeof value === 'string') {
        switch (input.inputtype.id) {
          case 5: // Email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              const errorMsg = `${input.nameEnglish} must be a valid email address`;
              errors.push(errorMsg);
              fieldErrs[input.inputcode] = errorMsg;
            }
            break;

          case 12: // Phone
            const phoneRegex = /^[\d\s+()-]+$/;
            if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 7) {
              const errorMsg = `${input.nameEnglish} must be a valid phone number`;
              errors.push(errorMsg);
              fieldErrs[input.inputcode] = errorMsg;
            }
            break;
        }
      }
    });

    setFormErrors(errors);
    setFieldErrors(fieldErrs);

    // Scroll to top of form to show errors
    if (errors.length > 0) {
      const formElement = document.querySelector('form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    return errors.length === 0;
  }, [currentStep, formGroups, formValues, isOnGroupMembersStep, actualFormGroupIndex, guests]);

  const nextStep = () => {
    if (validateStep()) {
      setFormErrors([]);
      setFieldErrors({});
      setGuestErrors({});
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const prevStep = () => {
    setFormErrors([]);
    setFieldErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    if (!selectedCategory) {
      setFormErrors(['Please select a category before submitting']);
      return;
    }

    setSubmitting(true);
    setFormErrors([]);

    try {
      // Process payment if required
      let paymentResult: PaymentResult | null = null;

      // Check if payment method is Bank Transfer
      const paymentMethod = Object.values(formValues).find((value) =>
        typeof value === 'string' &&
        (value.toLowerCase().includes('bank transfer') ||
         value.toLowerCase().includes('bank-transfer') ||
         value.toLowerCase().includes('banktransfer'))
      );

      const isBankTransfer = !!paymentMethod;

      console.log('[Payment] paymentRequired:', paymentRequired, '| selectedCategory:', selectedCategory?.name_english, '| isBankTransfer:', isBankTransfer);

      if (paymentRequired && selectedCategory && !isBankTransfer) {
        setProcessingPayment(true);

        // Get customer info from form
        const customerEmail = (formValues['input_id_52307'] as string) || '';
        const firstName = (formValues['input_id_21576'] as string) || '';
        const lastName = (formValues['input_id_35129'] as string) || '';

        console.log('[Payment] Customer info - email:', customerEmail, '| name:', `${firstName} ${lastName}`.trim());

        if (!customerEmail) {
          setFormErrors(['Email is required for payment processing']);
          setSubmitting(false);
          setProcessingPayment(false);
          return;
        }

        // Build guests array for group registration
        const paymentGuests: PaymentGuest[] = registrationType === 'group' && guests.length > 0
          ? guests.map((guest) => {
              const guestCategory = categories.find((cat) => cat.id === guest.categoryId);
              return {
                order_id: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                amount: guestCategory ? parseFeeAmount(guestCategory.fee) : 0,
                currency: guestCategory ? extractCurrency(guestCategory.fee) : extractCurrency(selectedCategory.fee),
                category_id: guest.categoryId,
                category_name: guestCategory?.name_english || selectedCategory.name_english,
                attendence_type: attendanceType || 'PHYSICAL',
                customer_email: guest.email,
                customer_name: `${guest.firstName} ${guest.lastName}`.trim(),
              };
            })
          : [];

        const paymentConfig = {
          orderId: paymentData.orderId,
          amount: getPaymentAmount(selectedCategory.fee),
          currency: extractCurrency(selectedCategory.fee),
          categoryName: selectedCategory.name_english,
          categoryId: selectedCategory.id,
          attendenceType: attendanceType || 'PHYSICAL',
          customerEmail,
          customerName: `${firstName} ${lastName}`.trim(),
          ...(paymentGuests.length > 0 && { guests: paymentGuests }),
        };

        console.log('[Payment] Calling initializePayment with config:', paymentConfig);

        // Initialize payment
        const paymentSession = await initializePayment(paymentConfig);

        console.log('[Payment] initializePayment result:', paymentSession);

        if (!paymentSession) {
          setFormErrors(['Failed to initialize payment. Please try again.']);
          setSubmitting(false);
          setProcessingPayment(false);
          return;
        }

        // Store payment session and show modal
        setPaymentSession(paymentSession);
        setShowPaymentModal(true);
        setProcessingPayment(false);

        console.log('[Payment] Payment modal opened, calling processPayment...');

        // Setup payment callback
        const paymentPromise = processPayment(paymentSession, paymentConfig);

        // Wait for payment result
        paymentResult = await paymentPromise;

        console.log('[Payment] processPayment result:', paymentResult);

        // Close modal
        setShowPaymentModal(false);

        if (!paymentResult.success) {
          console.log('[Payment] Payment failed:', paymentResult.error);
          setFormErrors([
            paymentResult.error || 'Payment was not completed. Please try again.',
          ]);
          setSubmitting(false);
          return;
        }

        console.log('[Payment] Payment succeeded, updating payment data');

        // Update payment data
        setPaymentData({
          orderId: paymentResult.orderId,
          paymentToken: paymentResult.paymentToken || '',
          paymentSession: paymentResult.paymentSession || '',
          transactionId: paymentResult.transactionId || '',
        });
      }

      // Prepare registration data
      const formData = new FormData();
      const delegateData: Array<{
        input_code: string;
        input_type: string;
        input_value: string;
        input_name: string;
      }> = [];

      formGroups.forEach((group) => {
        group.inputs.forEach(({ input }) => {
          const value = formValues[input.inputcode];
          if (value) {
            const valueStr = Array.isArray(value) ? value.join(', ') : value;
            delegateData.push({
              input_code: input.inputcode,
              input_type: String(input.inputtype.id),
              input_value: valueStr,
              input_name: input.nameEnglish,
            });

            // Special fields for registration
            if (input.inputcode === 'input_id_52307') {
              formData.append('registration_email', valueStr);
            }
            if (input.inputcode === 'input_id_21576') {
              formData.append('first_name', valueStr);
            }
            if (input.inputcode === 'input_id_35129') {
              formData.append('last_name', valueStr);
            }
          }
        });
      });

      formData.append('delegate_data', JSON.stringify(delegateData));
      formData.append('ticket_id', String(selectedCategory.id));
      formData.append('attendence_type', attendanceType || 'PHYSICAL');
      formData.append('user_language', 'english');
      formData.append('accompanied', isGroupRegistration ? 'YES' : 'NO');

      // Add registration type
      if (isGroupRegistration && guests.length > 0) {
        formData.append('registration_type', 'group');

        // Generate badge IDs for all guests and collect them into group_ids array
        const groupIds: string[] = [];
        const guestsWithBadgeIds = guests.map((guest, index) => {
          const badgeId = `${Date.now()}${guest.categoryId}${index}${Math.random().toString().substring(2, 8)}`;
          groupIds.push(badgeId);
          return { ...guest, badgeId };
        });

        // Store guests with their badge IDs for later use in bulk invite
        setGuests(guestsWithBadgeIds);

        // Add group_ids array to the main registration
        formData.append('group_ids', JSON.stringify(groupIds));
      } else {
        formData.append('registration_type', 'single');
      }

      // Add payment data if payment was processed
      if (paymentResult && paymentResult.success) {
        formData.append('order_id', paymentResult.orderId);
        formData.append('payment_token', paymentResult.paymentToken || '');
        formData.append('payment_session', paymentResult.paymentSession || '');
        formData.append('acknowleadgment', paymentResult.transactionId || '');
      } else {
        formData.append('order_id', '');
        formData.append('payment_token', '');
        formData.append('payment_session', '');
        formData.append('acknowleadgment', '');
      }

      // Submit main registration
      const response = await registrationApi.submitRegistration(formData);

      if (response.success) {
        // Create abstract account for the main registrant (not for invited guests)
        try {
          const registrationEmail = formData.get('registration_email') as string;
          const firstName = formData.get('first_name') as string;
          const lastName = formData.get('last_name') as string;

          if (registrationEmail && firstName && lastName) {
            // Generate a default password from email and timestamp
            const defaultPassword = `${registrationEmail.split('@')[0]}${Date.now().toString().slice(-4)}`;

            // Create abstract account
            await authApi.register({
              email: registrationEmail,
              password: defaultPassword,
              firstName: firstName,
              lastName: lastName,
            });

            console.log('Abstract account created for:', registrationEmail);
          }
        } catch (accountErr) {
          console.error('Failed to create abstract account:', accountErr);
          // Don't fail the whole registration if abstract account creation fails
        }

        // If group registration with guests, invite them via bulk endpoint
        if (isGroupRegistration && guests.length > 0) {
          try {
            // Group guests by categoryId
            const guestsByCategory = guests.reduce((acc, guest) => {
              if (!acc[guest.categoryId]) {
                acc[guest.categoryId] = [];
              }
              acc[guest.categoryId].push(guest);
              return acc;
            }, {} as Record<number, Guest[]>);

            // Send bulk invite for each category
            for (const [categoryId, categoryGuests] of Object.entries(guestsByCategory)) {
              const category = categories.find((cat) => cat.id === parseInt(categoryId));
              if (!category) continue;

              // Format guests data for this category
              const guestsInputs = categoryGuests.map((guest) => {
                // Use pre-generated badgeId from guest object
                const badgeId = guest.badgeId || `${Date.now()}${parseInt(categoryId)}${Math.random().toString().substring(2, 8)}`;

                return [
                  {
                    inputName: 'First Name',
                    inputId: 'input_id_21576',
                    inputVal: guest.firstName,
                    badgeId,
                  },
                  {
                    inputName: 'Last Name',
                    inputId: 'input_id_35129',
                    inputVal: guest.lastName,
                    badgeId,
                  },
                  {
                    inputName: 'Email',
                    inputId: 'input_id_52307',
                    inputVal: guest.email,
                    badgeId,
                  },
                ];
              });

              const bulkFormData = new FormData();
              bulkFormData.append('inputs', JSON.stringify(guestsInputs));
              bulkFormData.append('category', categoryId);
              bulkFormData.append('attendence_type', attendanceType || 'PHYSICAL');
              bulkFormData.append('accompanied', 'NO');
              bulkFormData.append('free_ticket', requiresPayment(category.fee) ? 'NO' : 'YES');
              bulkFormData.append('language_ticket', 'english');

              await registrationApi.inviteBulkDelegates(bulkFormData);
            }
          } catch (bulkErr) {
            console.error('Failed to invite guests:', bulkErr);
            // Don't fail the whole registration if bulk invite fails
          }
        }

        setSubmitted(true);
      } else {
        // Handle registration failure
        const errorMessage = Array.isArray(response.message)
          ? response.message
          : [response.message];
        setFormErrors(errorMessage);
      }
    } catch (err) {
      setFormErrors(['Failed to submit registration. Please try again.']);
      console.error(err);
    }
    setSubmitting(false);
  };

  const renderInput = (
    input: FormInputGroup['inputs'][0]['input'],
    options: FormInputGroup['inputs'][0]['options'],
    value: string,
  ) => {
    const inputValue = formValues[input.inputcode] || value || '';
    const isRequired = input.is_mandatory === 'YES';
    const hasError = !!fieldErrors[input.inputcode];
    const errorClass = hasError
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-primary-500 focus:border-transparent';

    switch (input.inputtype.id) {
      case 1: // Text
        return (
          <>
            <input
              type="text"
              id={input.inputcode}
              value={inputValue as string}
              onChange={(e) => handleInputChange(input.inputcode, e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${errorClass}`}
              required={isRequired}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );

      case 2: // Select
        return (
          <>
            <SearchableSelect
              id={input.inputcode}
              value={inputValue as string}
              onChange={(newValue) => handleInputChange(input.inputcode, newValue)}
              options={options}
              placeholder="Select..."
              required={isRequired}
              hasError={hasError}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${errorClass}`}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );

      case 4: // Date
        return (
          <>
            <input
              type="date"
              id={input.inputcode}
              value={inputValue as string}
              onChange={(e) => handleInputChange(input.inputcode, e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${errorClass}`}
              required={isRequired}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );

      case 5: // Email
        return (
          <>
            <input
              type="email"
              id={input.inputcode}
              value={inputValue as string}
              onChange={(e) => handleInputChange(input.inputcode, e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${errorClass}`}
              required={isRequired}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );

      case 8: // Number
        return (
          <>
            <input
              type="number"
              id={input.inputcode}
              value={inputValue as string}
              onChange={(e) => handleInputChange(input.inputcode, e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${errorClass}`}
              required={isRequired}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );

      case 12: // Phone
        return (
          <>
            <input
              type="tel"
              id={input.inputcode}
              value={inputValue as string}
              onChange={(e) => handleInputChange(input.inputcode, e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${errorClass}`}
              required={isRequired}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );

      case 15: // Textarea
        return (
          <>
            <textarea
              id={input.inputcode}
              value={inputValue as string}
              onChange={(e) => handleInputChange(input.inputcode, e.target.value)}
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${errorClass}`}
              required={isRequired}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );

      case 10: // Radio
        return (
          <>
            <div className={`space-y-2 ${hasError ? 'p-3 border-2 border-red-500 rounded-lg' : ''}`}>
              {options.map((option) => (
                <label key={option.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={input.inputcode}
                    value={option.contentEnglish}
                    checked={inputValue === option.contentEnglish}
                    onChange={(e) =>
                      handleInputChange(input.inputcode, e.target.value)
                    }
                    className="w-4 h-4 text-primary-500"
                    required={isRequired}
                  />
                  <span>{option.contentEnglish}</span>
                </label>
              ))}
            </div>
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );

      case 16: // Checkbox (multiple)
        return (
          <>
            <div className={`space-y-2 ${hasError ? 'p-3 border-2 border-red-500 rounded-lg' : ''}`}>
              {options.map((option) => (
                <label key={option.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={option.contentEnglish}
                    checked={
                      Array.isArray(inputValue)
                        ? inputValue.includes(option.contentEnglish)
                        : inputValue === option.contentEnglish
                    }
                    onChange={(e) => {
                      const current = Array.isArray(inputValue)
                        ? inputValue
                        : inputValue
                          ? [inputValue]
                          : [];
                      if (e.target.checked) {
                        handleInputChange(input.inputcode, [
                          ...current,
                          e.target.value,
                        ]);
                      } else {
                        handleInputChange(
                          input.inputcode,
                          current.filter((v) => v !== e.target.value),
                        );
                      }
                    }}
                    className="w-4 h-4 text-primary-500"
                  />
                  <span>{option.contentEnglish}</span>
                </label>
              ))}
            </div>
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );

      case 17: // Paragraph (display only)
        return (
          <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
            {input.nameEnglish}
          </p>
        );

      default:
        return (
          <>
            <input
              type="text"
              id={input.inputcode}
              value={inputValue as string}
              onChange={(e) => handleInputChange(input.inputcode, e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${errorClass}`}
              required={isRequired}
            />
            {hasError && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors[input.inputcode]}</p>
            )}
          </>
        );
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-primary-100">
        <Header />
        <div className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Registration {paymentData.transactionId ? 'and Payment' : ''} Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for registering for the conference. You will receive a
              confirmation email shortly.
            </p>

            {/* Payment Details */}
            {paymentData.transactionId && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-left">
                <h3 className="text-sm font-semibold text-green-800 mb-3">
                  Payment Details
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono font-medium">
                      {paymentData.transactionId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono font-medium">
                      {paymentData.orderId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Paid
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  A receipt has been sent to your email address.
                </p>
              </div>
            )}

            <Link
              href="/"
              className="inline-block bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition-colors mt-6"
            >
              Back to Home
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-primary-100">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/"
              className="text-primary-600 hover:text-primary-700 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Home
            </Link>
          </div>

          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-primary-700 mb-2">
              Congress Registration
            </h1>
            <p className="text-gray-600">
              Register to attend the WFC Biennial Congress 2029 — Kigali, Rwanda
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading registration form...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadRegistrationPage}
                className="mt-4 bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600"
              >
                Try Again
              </button>
            </div>
          ) : eventType === 'HYBRID' && !attendanceType ? (
            /* Attendance Type Selection */
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-semibold text-center mb-6">
                Select Your Attendance Type
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <button
                  onClick={() => selectAttendance('PHYSICAL')}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-center"
                >
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Physical Attendance
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Attend the event in person at the venue
                  </p>
                </button>
                <button
                  onClick={() => selectAttendance('VIRTUAL')}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-center"
                >
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Virtual Attendance
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Attend the event online from anywhere
                  </p>
                </button>
              </div>
            </div>
          ) : !selectedCategory ? (
            /* Category Selection */
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  Select Registration Category
                </h2>
                {eventType === 'HYBRID' && (
                  <button
                    onClick={() => setAttendanceType(null)}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    Change attendance type
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-3">
                All registration fees are listed in <strong>USD</strong>.{' '}
                <strong>Early Bird rates apply to registrations completed before the published deadline.</strong>{' '}
                The platform accepts <strong>card payments</strong>; your registration is approved automatically once payment is confirmed.
              </p>
              <p className="text-sm text-gray-700 mb-4">
                <strong>Note:</strong> <strong>Group rates apply to a group of 8.</strong>{' '}
                Registration includes access to congress sessions and materials, optional activities
                may require separate registration. An automated receipt will be issued after payment, invoices
                are available on request. For support or payment questions, contact:{' '}
                <a href="mailto:info@wfc2029.rw" className="text-primary-600 hover:underline">
                  info@wfc2029.rw
                </a>
              </p>
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
                <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800">
                  <strong>Registration fees are non-refundable.</strong> Please ensure you have reviewed your selection before proceeding with payment.
                </p>
              </div>
              {categories.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  No registration categories available at this time.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => {
                    const isFree = !requiresPayment(category.fee);
                    return (
                      <div
                        key={category.id}
                        className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary-500 hover:shadow-lg transition-all relative overflow-hidden"
                      >
                        {isFree && (
                          <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            FREE
                          </div>
                        )}
                        <h3 className="text-lg font-semibold mb-2">
                          {category.name_english}
                        </h3>
                        <p className={`text-2xl font-bold mb-4 ${isFree ? 'text-green-600' : 'text-primary-600'}`}>
                          {category.fee}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                          {category.early_payment_date
                            ? `Early bird ends: ${category.early_payment_date}`
                            : `Registration closes: ${category.end_date}`}
                        </p>
                        <button
                          onClick={() => handleRegisterClick(category)}
                          className={`w-full py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            isFree
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-primary-500 text-white hover:bg-primary-600'
                          }`}
                        >
                          {!isFree && (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                              />
                            </svg>
                          )}
                          Register
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Registration Form */
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Form Steps / Tabs */}
              {totalSteps > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex gap-2 overflow-x-auto">
                    {(() => {
                      const tabs: { key: string; label: string }[] = [];
                      formGroups.forEach((group, index) => {
                        // Insert "Group Members" tab before the last form group
                        if (isGroupRegistration && index === groupMembersStepIndex) {
                          tabs.push({ key: 'group-members', label: 'Group Members' });
                        }
                        tabs.push({ key: `group-${index}`, label: group.group.name });
                      });
                      return tabs.map((tab, index) => (
                        <button
                          key={tab.key}
                          onClick={() => {
                            if (index < currentStep) setCurrentStep(index);
                          }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            index === currentStep
                              ? 'bg-primary-500 text-white'
                              : index < currentStep
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-6">
                {formErrors.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6 shadow-sm">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-800 mb-2">
                          Please fix the following errors:
                        </h3>
                        <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                          {formErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Group Members Step */}
                {isOnGroupMembersStep ? (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">
                        Group Members
                      </h3>
                      <span className="text-sm text-gray-500">
                        {guests.length} guest{guests.length !== 1 ? 's' : ''} added
                      </span>
                    </div>

                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200">
                      <nav className="flex gap-2" aria-label="Input method">
                        <button
                          type="button"
                          onClick={() => switchInputMethod('manual')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            inputMethod === 'manual'
                              ? 'border-primary-600 text-primary-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Manual Entry
                        </button>
                        <button
                          type="button"
                          onClick={() => switchInputMethod('excel')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            inputMethod === 'excel'
                              ? 'border-primary-600 text-primary-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Excel Upload
                        </button>
                      </nav>
                    </div>

                    {/* Manual Entry Content */}
                    {inputMethod === 'manual' && (
                      <>
                        <p className="text-sm text-gray-600">
                          Add the details of the guests you would like to invite to register as part of your group.
                        </p>

                        {guests.map((guest, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-4 relative"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">
                                Guest {index + 1}
                              </span>
                              {guests.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeGuest(index)}
                                  className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Remove
                                </button>
                              )}
                            </div>
                            <div className="space-y-4">
                              <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={guest.firstName}
                                    onChange={(e) => updateGuest(index, 'firstName', e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${
                                      guestErrors[index]?.firstName
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                                    }`}
                                    placeholder="First name"
                                  />
                                  {guestErrors[index]?.firstName && (
                                    <p className="mt-1 text-sm text-red-600">{guestErrors[index].firstName}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={guest.lastName}
                                    onChange={(e) => updateGuest(index, 'lastName', e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${
                                      guestErrors[index]?.lastName
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                                    }`}
                                    placeholder="Last name"
                                  />
                                  {guestErrors[index]?.lastName && (
                                    <p className="mt-1 text-sm text-red-600">{guestErrors[index].lastName}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="email"
                                    value={guest.email}
                                    onChange={(e) => updateGuest(index, 'email', e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${
                                      guestErrors[index]?.email
                                        ? 'border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                                    }`}
                                    placeholder="email@example.com"
                                  />
                                  {guestErrors[index]?.email && (
                                    <p className="mt-1 text-sm text-red-600">{guestErrors[index].email}</p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Registration Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={guest.categoryId}
                                  onChange={(e) => updateGuest(index, 'categoryId', parseInt(e.target.value))}
                                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 ${
                                    guestErrors[index]?.categoryId
                                      ? 'border-red-500 focus:ring-red-500'
                                      : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
                                  }`}
                                >
                                  <option value="0">-- Select Category --</option>
                                  {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                      {cat.name_english} ({cat.fee})
                                    </option>
                                  ))}
                                </select>
                                {guestErrors[index]?.categoryId && (
                                  <p className="mt-1 text-sm text-red-600">{guestErrors[index].categoryId}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addGuest}
                          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Another Guest
                        </button>
                      </>
                    )}

                    {/* Excel Upload Content */}
                    {inputMethod === 'excel' && (
                      <div className="space-y-6">
                        {/* FileUploadSection */}
                        {!excelRawData.length && (
                          <div className="space-y-4">
                            {/* Info Card */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-blue-900 mb-2">
                                Excel Upload Requirements
                              </h4>
                              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>File must be in CSV, XLSX, or XLS format</li>
                                <li>Should contain columns for Email, First Name, and Last Name</li>
                                <li>First row should contain column headers</li>
                              </ul>
                            </div>

                            {/* Upload Zone */}
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
                              <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleExcelFileUpload}
                                className="hidden"
                                id="excel-file-input"
                              />
                              <label
                                htmlFor="excel-file-input"
                                className="cursor-pointer flex flex-col items-center"
                              >
                                <svg
                                  className="w-12 h-12 text-gray-400 mb-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                  />
                                </svg>
                                <span className="text-sm font-medium text-gray-700 mb-1">
                                  Click to upload or drag and drop
                                </span>
                                <span className="text-xs text-gray-500">
                                  CSV, XLSX, or XLS files only
                                </span>
                              </label>
                            </div>

                            {/* Error Display */}
                            {excelError && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-800">{excelError}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ColumnMappingSection */}
                        {excelRawData.length > 0 && !excelMappingConfirmed && (
                          <div className="space-y-6">
                            {/* File Info Header */}
                            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {excelFileName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {excelRawData.length} row{excelRawData.length !== 1 ? 's' : ''} found
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={resetExcelUpload}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                Change File
                              </button>
                            </div>

                            {/* Column Mapping */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-4">
                                Map your columns to the required fields
                              </h4>
                              <div className="grid md:grid-cols-3 gap-4">
                                {/* Email Mapping */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Column <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    value={excelColumnMapping.email}
                                    onChange={(e) => handleExcelMappingChange('email', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                      excelColumnMapping.email
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-300'
                                    }`}
                                  >
                                    <option value="">-- Select Column --</option>
                                    {getUnmappedExcelColumns('email').map((col) => (
                                      <option key={col} value={col}>
                                        {col}
                                      </option>
                                    ))}
                                    {excelColumnMapping.email && (
                                      <option value={excelColumnMapping.email}>
                                        {excelColumnMapping.email}
                                      </option>
                                    )}
                                  </select>
                                </div>

                                {/* First Name Mapping */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name Column <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    value={excelColumnMapping.firstName}
                                    onChange={(e) => handleExcelMappingChange('firstName', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                      excelColumnMapping.firstName
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-300'
                                    }`}
                                  >
                                    <option value="">-- Select Column --</option>
                                    {getUnmappedExcelColumns('firstName').map((col) => (
                                      <option key={col} value={col}>
                                        {col}
                                      </option>
                                    ))}
                                    {excelColumnMapping.firstName && (
                                      <option value={excelColumnMapping.firstName}>
                                        {excelColumnMapping.firstName}
                                      </option>
                                    )}
                                  </select>
                                </div>

                                {/* Last Name Mapping */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name Column <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    value={excelColumnMapping.lastName}
                                    onChange={(e) => handleExcelMappingChange('lastName', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                                      excelColumnMapping.lastName
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-300'
                                    }`}
                                  >
                                    <option value="">-- Select Column --</option>
                                    {getUnmappedExcelColumns('lastName').map((col) => (
                                      <option key={col} value={col}>
                                        {col}
                                      </option>
                                    ))}
                                    {excelColumnMapping.lastName && (
                                      <option value={excelColumnMapping.lastName}>
                                        {excelColumnMapping.lastName}
                                      </option>
                                    )}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Preview Table */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Preview (first 3 rows)
                              </h4>
                              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Email
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        First Name
                                      </th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Last Name
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {excelRawData.slice(0, 3).map((row, index) => (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                          {excelColumnMapping.email ? String(row[excelColumnMapping.email] || '-') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                          {excelColumnMapping.firstName ? String(row[excelColumnMapping.firstName] || '-') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                          {excelColumnMapping.lastName ? String(row[excelColumnMapping.lastName] || '-') : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Error Display */}
                            {excelError && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-800">{excelError}</p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={confirmExcelMapping}
                                disabled={!isExcelMappingComplete()}
                                className={`px-6 py-2 rounded-lg font-medium text-sm transition-colors ${
                                  isExcelMappingComplete()
                                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                Continue
                              </button>
                              <button
                                type="button"
                                onClick={resetExcelUpload}
                                className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ReviewDataSection */}
                        {excelMappingConfirmed && (
                          <div className="space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                  Review Imported Guests
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  {guests.length} guest{guests.length !== 1 ? 's' : ''} imported successfully
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExcelMappingConfirmed(false)}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                ← Back to Mapping
                              </button>
                            </div>

                            {/* Success Message */}
                            {excelError && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <p className="text-sm text-yellow-800">{excelError}</p>
                              </div>
                            )}

                            {/* Guests Table */}
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                      #
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                      Email
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                      First Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                      Last Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                      Category
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {guests.map((guest, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 text-sm text-gray-500">
                                        {index + 1}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900">
                                        {guest.email}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900">
                                        {guest.firstName}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-900">
                                        {guest.lastName}
                                      </td>
                                      <td className="px-4 py-3">
                                        <select
                                          value={guest.categoryId || ''}
                                          onChange={(e) => updateGuest(index, 'categoryId', parseInt(e.target.value))}
                                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                                            guestErrors[index]?.categoryId
                                              ? 'border-red-300 focus:ring-red-500'
                                              : 'border-gray-300 focus:ring-primary-500'
                                          }`}
                                        >
                                          <option value="">Select Category</option>
                                          {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                              {cat.name_english} - {cat.fee}
                                            </option>
                                          ))}
                                        </select>
                                        {guestErrors[index]?.categoryId && (
                                          <p className="text-xs text-red-600 mt-1">
                                            {guestErrors[index].categoryId}
                                          </p>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        <button
                                          type="button"
                                          onClick={() => removeGuest(index)}
                                          className="text-red-600 hover:text-red-800 font-medium"
                                        >
                                          Remove
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Info Message */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-sm text-blue-800">
                                ℹ️ You can remove individual guests from the table above. Click "Next" below to proceed with the registration.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : formGroups[actualFormGroupIndex] ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      {formGroups[actualFormGroupIndex].group.name}
                    </h3>
                    {formGroups[actualFormGroupIndex].inputs.map(
                      ({ input, options, value }) => (
                        <div key={input.inputcode}>
                          {input.inputtype.id !== 17 && (
                            <label
                              htmlFor={input.inputcode}
                              className="block text-sm font-medium text-gray-700 mb-2"
                            >
                              {input.nameEnglish}
                              {input.is_mandatory === 'YES' && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                          )}
                          {renderInput(input, options, value)}
                        </div>
                      ),
                    )}
                  </div>
                ) : null}

                {/* Payment Processing Indicator */}
                {processingPayment && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Processing Payment
                        </p>
                        <p className="text-xs text-blue-600">
                          Please complete the payment in the popup window...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Required Notice */}
                {paymentRequired && selectedCategory && currentStep === totalSteps - 1 && !processingPayment && (
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 mb-1">
                          Payment Required
                        </p>
                        <p className="text-sm text-amber-700">
                          {isGroupRegistration ? (
                            <>
                              Total registration fee for {totalParticipants} participants: <span className="font-semibold">{extractCurrency(selectedCategory.fee)} {getPaymentAmount(selectedCategory.fee).toLocaleString()}</span>
                            </>
                          ) : (
                            <>
                              Registration fee: <span className="font-semibold">{selectedCategory.fee}</span>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          You will be redirected to a secure payment page after clicking Submit.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <div>
                    {currentStep > 0 ? (
                      <button
                        type="button"
                        onClick={prevStep}
                        disabled={submitting || processingPayment}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory(null)}
                        disabled={submitting || processingPayment}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Change Category
                      </button>
                    )}
                  </div>
                  <div>
                    {currentStep < totalSteps - 1 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        disabled={submitting || processingPayment}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={submitting || processingPayment}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {processingPayment ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Processing Payment...
                          </>
                        ) : submitting ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            {paymentRequired && (
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                />
                              </svg>
                            )}
                            {paymentRequired ? 'Proceed to Payment' : 'Submit Registration'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
      <Footer />

      {/* Registration Type Modal */}
      {showRegistrationTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">
              How would you like to register?
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Choose your registration type to continue
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Single Registration */}
              <button
                onClick={() => handleRegistrationTypeSelect('single')}
                className="p-5 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-center group"
              >
                <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-200 transition-colors">
                  <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold mb-1">Single</h3>
                <p className="text-xs text-gray-500">
                  Register yourself only
                </p>
              </button>

              {/* Group Registration */}
              <button
                onClick={() => handleRegistrationTypeSelect('group')}
                className="p-5 border-2 border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-center group"
              >
                <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-200 transition-colors">
                  <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold mb-1">Group</h3>
                <p className="text-xs text-gray-500">
                  Register with guests
                </p>
              </button>
            </div>

            <button
              onClick={() => {
                setShowRegistrationTypeModal(false);
                setPendingCategory(null);
              }}
              className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mastercard Payment Modal */}
      {paymentSession && (
        <PaymentModal
          session={paymentSession}
          amount={getPaymentAmount(selectedCategory?.fee || '0')}
          currency={extractCurrency(selectedCategory?.fee || 'USD')}
          categoryName={selectedCategory?.name_english || ''}
          customerEmail={(formValues['input_id_52307'] as string) || ''}
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setProcessingPayment(false);
            setSubmitting(false);
          }}
        />
      )}
    </div>
  );
}
