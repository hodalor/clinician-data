import '../models/ra_record_draft.dart';

enum WizardStep {
  eligibility,
  patient,
  sats,
  physiology,
  presentation,
  destination,
  process,
  outcome,
  review,
}

class StepValidationResult {
  const StepValidationResult({
    this.hardErrors = const <String>[],
    this.softWarnings = const <String>[],
  });

  final List<String> hardErrors;
  final List<String> softWarnings;

  bool get hasHardErrors => hardErrors.isNotEmpty;
  bool get hasSoftWarnings => softWarnings.isNotEmpty;
}

StepValidationResult validateStep({
  required WizardStep step,
  required RaRecordDraft draft,
}) {
  switch (step) {
    case WizardStep.eligibility:
      return _validateEligibility(draft);
    case WizardStep.patient:
      return _validatePatient(draft);
    case WizardStep.sats:
      return _validateSats(draft);
    case WizardStep.physiology:
      return _validatePhysiology(draft);
    case WizardStep.presentation:
      return _validatePresentation(draft);
    case WizardStep.destination:
      return _validateDestination(draft);
    case WizardStep.process:
      return const StepValidationResult();
    case WizardStep.outcome:
      return _validateOutcome(draft);
    case WizardStep.review:
      return _validateReview(draft);
  }
}

StepValidationResult _validateEligibility(RaRecordDraft draft) {
  final errors = <String>[];

  if (draft.studyId.trim().isEmpty) {
    errors.add('Study ID is required.');
  }

  if (draft.age != null && draft.age! < 0) {
    errors.add('Age cannot be negative.');
  }

  if (draft.eligible == false) {
    if ((draft.exclusionCode ?? '').isEmpty) {
      errors.add('Choose an exclusion reason for an ineligible record.');
    }
    if (draft.exclusionCode == '9' &&
        (draft.exclusionReason ?? '').trim().isEmpty) {
      errors.add('Enter the exclusion detail for code 9 Other.');
    }
  }

  return StepValidationResult(hardErrors: errors);
}

StepValidationResult _validatePatient(RaRecordDraft draft) {
  final errors = <String>[];
  if (draft.otherComorb == true &&
      (draft.otherComorbText ?? '').trim().isEmpty) {
    errors.add('Describe the other comorbidity.');
  }

  return StepValidationResult(hardErrors: errors);
}

StepValidationResult _validateSats(RaRecordDraft draft) {
  final errors = <String>[];
  if (draft.tewsTotal != null && draft.tewsTotal! < 0) {
    errors.add('TEWS must be 0 or higher.');
  }
  if (draft.discriminatorYes == true &&
      (draft.discriminatorType ?? '').trim().isEmpty) {
    errors.add('Choose the discriminator type.');
  }

  return StepValidationResult(hardErrors: errors);
}

StepValidationResult _validatePhysiology(RaRecordDraft draft) {
  final errors = <String>[];
  final warnings = <String>[];

  void validateNumber(
    String label,
    num? value, {
    num min = 0,
    num? max,
    num? softMin,
    num? softMax,
    String? warningMessage,
    bool rejectZeroAsMissing = false,
  }) {
    if (value == null) {
      return;
    }
    if (value < min) {
      errors.add('$label must be at least $min.');
    }
    if (max != null && value > max) {
      errors.add('$label must be at most $max.');
    }
    if (rejectZeroAsMissing && value == 0) {
      errors.add(
          '$label must be left blank when it was not recorded. Do not use 0 as a placeholder.');
    }
    if (softMin != null &&
        softMax != null &&
        (value < softMin || value > softMax)) {
      warnings.add(warningMessage ?? '$label looks unusual.');
    }
  }

  validateNumber('Temperature', draft.temp,
      softMin: 35,
      softMax: 41,
      warningMessage: 'Temperature is clinically unusual.');
  validateNumber('HR', draft.hr,
      softMin: 30,
      softMax: 180,
      warningMessage: 'HR is clinically unusual.',
      rejectZeroAsMissing: true);
  validateNumber('RR', draft.rr,
      softMin: 8,
      softMax: 40,
      warningMessage: 'RR is clinically unusual.',
      rejectZeroAsMissing: true);
  validateNumber('SBP', draft.sbp,
      softMin: 70,
      softMax: 220,
      warningMessage: 'SBP is clinically unusual.',
      rejectZeroAsMissing: true);
  validateNumber('DBP', draft.dbp,
      softMin: 40,
      softMax: 130,
      warningMessage: 'DBP is clinically unusual.',
      rejectZeroAsMissing: true);
  validateNumber('SpO2', draft.spo2,
      max: 100,
      softMin: 80,
      softMax: 100,
      warningMessage: 'SpO2 is clinically unusual.');
  validateNumber('RBS', draft.rbs,
      softMin: 3,
      softMax: 20,
      warningMessage: 'RBS is clinically unusual.',
      rejectZeroAsMissing: true);

  return StepValidationResult(hardErrors: errors, softWarnings: warnings);
}

StepValidationResult _validatePresentation(RaRecordDraft draft) {
  return const StepValidationResult();
}

StepValidationResult _validateDestination(RaRecordDraft draft) {
  if ((draft.initialDestination ?? '').trim().isEmpty) {
    return const StepValidationResult(
      hardErrors: ['Choose the immediate destination.'],
    );
  }
  return const StepValidationResult();
}

StepValidationResult _validateOutcome(RaRecordDraft draft) {
  final errors = <String>[];

  final hasAnyOutcomeField = draft.outcome24 != null ||
      draft.outcomeDatetime != null ||
      draft.outcomeSource != null;

  if (hasAnyOutcomeField && draft.outcome24 == null) {
    errors.add('Choose the 24-hour outcome.');
  }
  if (hasAnyOutcomeField && draft.outcomeDatetime == null) {
    errors.add('Choose the 24-hour outcome date and time.');
  }
  if (hasAnyOutcomeField && draft.outcomeSource == null) {
    errors.add('Choose the outcome source.');
  }

  return StepValidationResult(hardErrors: errors);
}

StepValidationResult _validateReview(RaRecordDraft draft) {
  final errors = <String>[];
  if (draft.studyId.trim().isEmpty) {
    errors.add('Study ID is required before saving.');
  }
  return StepValidationResult(hardErrors: errors);
}
