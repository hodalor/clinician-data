import '../../../data/local/app_database.dart';
import '../models/ra_record_draft.dart';

Map<String, dynamic> buildRecordPayloadFromDraft(RaRecordDraft draft) {
  return {
    'study_id': draft.studyId.trim(),
    'status': draft.status,
    'mode': draft.mode,
    if (draft.initialDestination?.trim().isNotEmpty == true)
      'initial_destination': draft.initialDestination!.trim(),
    'eligibility': {
      if (draft.edDate != null) 'ed_date': draft.edDate!.toIso8601String(),
      if (draft.edTime?.isNotEmpty == true) 'ed_time': draft.edTime,
      if (draft.triageTime?.isNotEmpty == true) 'triage_time': draft.triageTime,
      if (draft.age != null) 'age': draft.age,
      if (draft.eligible != null) 'eligible': draft.eligible,
      if (draft.exclusionCode?.isNotEmpty == true)
        'exclusion_code': draft.exclusionCode,
      if (draft.exclusionReason?.trim().isNotEmpty == true)
        'exclusion_reason': draft.exclusionReason!.trim(),
    },
    'patient': {
      if (draft.sex?.isNotEmpty == true) 'sex': draft.sex,
      if (draft.referral?.isNotEmpty == true) 'referral': draft.referral,
      'comorbidities': {
        if (_encodeBinaryCode(draft.dm) != null)
          'dm': _encodeBinaryCode(draft.dm),
        if (_encodeBinaryCode(draft.htn) != null)
          'htn': _encodeBinaryCode(draft.htn),
        if (_encodeBinaryCode(draft.asthma) != null)
          'asthma': _encodeBinaryCode(draft.asthma),
        if (_encodeBinaryCode(draft.rvd) != null)
          'rvd': _encodeBinaryCode(draft.rvd),
        if (_encodeBinaryCode(draft.otherComorb) != null)
          'other': _encodeBinaryCode(draft.otherComorb),
        if (draft.otherComorbText?.trim().isNotEmpty == true)
          'other_text': draft.otherComorbText!.trim(),
      },
      if (draft.comorbAny != null) 'comorb_any': draft.comorbAny,
      if (draft.pregTest?.isNotEmpty == true) 'preg_test': draft.pregTest,
    },
    'sats': {
      if (draft.satsCat?.isNotEmpty == true) 'sats_cat': draft.satsCat,
      if (draft.tewsTotal != null) 'tews_total': draft.tewsTotal,
      if (draft.discriminatorYes != null)
        'discriminator_yes': draft.discriminatorYes,
      if (draft.discriminatorYes == true &&
          draft.discriminatorType?.isNotEmpty == true)
        'discriminator_type': draft.discriminatorType,
      if (draft.discriminatorYes == false) 'discriminator_type': '0',
      if (draft.documentationComplete != null)
        'documentation_complete': draft.documentationComplete,
    },
    'physiology': {
      if (draft.temp != null) 'temp': draft.temp,
      if (draft.hr != null) 'hr': draft.hr,
      if (draft.rr != null) 'rr': draft.rr,
      if (draft.sbp != null) 'sbp': draft.sbp,
      if (draft.dbp != null) 'dbp': draft.dbp,
      if (draft.spo2 != null) 'spo2': draft.spo2,
      if (draft.rbs != null) 'rbs': draft.rbs,
      if (draft.rdt?.isNotEmpty == true) 'rdt': draft.rdt,
      if (draft.mobility?.isNotEmpty == true) 'mobility': draft.mobility,
      if (draft.avpu?.isNotEmpty == true) 'avpu': draft.avpu,
      if (draft.trauma?.isNotEmpty == true) 'trauma': draft.trauma,
    },
    'presentation': {
      if (draft.chiefComplaintVerbatim?.trim().isNotEmpty == true)
        'chief_complaint_verbatim': draft.chiefComplaintVerbatim!.trim(),
      if (draft.complaintGroup?.isNotEmpty == true)
        'complaint_group': draft.complaintGroup,
      if (draft.multipleComplaints != null)
        'multiple_complaints': draft.multipleComplaints,
    },
    'process': {
      if (draft.clinicianTime?.isNotEmpty == true)
        'clinician_time': draft.clinicianTime,
      if (draft.treatmentTime?.isNotEmpty == true)
        'treatment_time': draft.treatmentTime,
    },
    'data_quality': {
      'miss_sats': draft.spo2 == null,
      'miss_tews': draft.tewsTotal == null,
      'miss_vitals': _hasMissingVitals(draft),
      'miss_outcome': !draft.hasCompleteOutcome,
      'source_conflict': false,
      'qc_required': false,
    },
  }..removeWhere((key, value) => value is Map && value.isEmpty);
}

Map<String, dynamic> buildSyncRecordPayloadFromBundle(
    DraftRecordBundle bundle) {
  return buildRecordPayloadFromDraft(RaRecordDraft.fromBundle(bundle));
}

Map<String, dynamic>? buildOutcomePayloadFromBundle(DraftRecordBundle bundle) {
  final draft = RaRecordDraft.fromBundle(bundle);
  if (!draft.hasCompleteOutcome) {
    return null;
  }

  return {
    'outcome24': draft.outcome24,
    'outcome_datetime': draft.outcomeDatetime!.toIso8601String(),
    'outcome_source': draft.outcomeSource,
  };
}

bool _hasMissingVitals(RaRecordDraft draft) {
  return draft.temp == null ||
      draft.hr == null ||
      draft.rr == null ||
      draft.sbp == null ||
      draft.dbp == null ||
      draft.rbs == null;
}

String? _encodeBinaryCode(bool? value) {
  if (value == null) {
    return null;
  }
  return value ? '1' : '0';
}
