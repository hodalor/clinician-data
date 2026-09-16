import '../../../data/local/app_database.dart';

const _unset = Object();

class RaRecordDraft {
  const RaRecordDraft({
    this.recordId,
    this.clientUuid,
    this.studyId = '',
    this.status = 'Draft',
    this.mode = 'TRAINING',
    this.edDate,
    this.edTime,
    this.triageTime,
    this.age,
    this.eligible,
    this.exclusionCode,
    this.exclusionReason,
    this.sex,
    this.referral,
    this.dm,
    this.htn,
    this.asthma,
    this.epilepsy,
    this.rvd,
    this.otherComorb,
    this.otherComorbText,
    this.pregTest,
    this.satsCat,
    this.tewsTotal,
    this.discriminatorYes,
    this.discriminatorType,
    this.documentationComplete,
    this.temp,
    this.hr,
    this.rr,
    this.sbp,
    this.dbp,
    this.spo2,
    this.rbs,
    this.rdt,
    this.mobility,
    this.avpu,
    this.trauma,
    this.chiefComplaintVerbatim,
    this.complaintGroup,
    this.multipleComplaints,
    this.initialDestination,
    this.clinicianTime,
    this.treatmentTime,
    this.outcome24,
    this.outcomeDatetime,
    this.outcomeSource,
    this.duplicateFlagsJson,
    this.version = 1,
  });

  final int? recordId;
  final String? clientUuid;
  final String studyId;
  final String status;
  final String mode;
  final DateTime? edDate;
  final String? edTime;
  final String? triageTime;
  final int? age;
  final bool? eligible;
  final String? exclusionCode;
  final String? exclusionReason;
  final String? sex;
  final String? referral;
  final bool? dm;
  final bool? htn;
  final bool? asthma;
  final bool? epilepsy;
  final bool? rvd;
  final bool? otherComorb;
  final String? otherComorbText;
  final String? pregTest;
  final String? satsCat;
  final int? tewsTotal;
  final bool? discriminatorYes;
  final String? discriminatorType;
  final bool? documentationComplete;
  final double? temp;
  final int? hr;
  final int? rr;
  final int? sbp;
  final int? dbp;
  final double? spo2;
  final double? rbs;
  final String? rdt;
  final String? mobility;
  final String? avpu;
  final String? trauma;
  final String? chiefComplaintVerbatim;
  final String? complaintGroup;
  final bool? multipleComplaints;
  final String? initialDestination;
  final String? clinicianTime;
  final String? treatmentTime;
  final String? outcome24;
  final DateTime? outcomeDatetime;
  final String? outcomeSource;
  final String? duplicateFlagsJson;
  final int version;

  String? get comorbAny {
    final flags = [dm, htn, asthma, epilepsy, rvd, otherComorb];
    if (flags.every((flag) => flag == null)) {
      return null;
    }
    if (flags.any((flag) => flag == true)) {
      return '1';
    }
    return '0';
  }

  bool get hasCompleteOutcome =>
      outcome24 != null && outcomeDatetime != null && outcomeSource != null;

  bool get skipsClinicalSections => eligible == false;

  RaRecordDraft copyWith({
    Object? recordId = _unset,
    Object? clientUuid = _unset,
    Object? studyId = _unset,
    Object? status = _unset,
    Object? mode = _unset,
    Object? edDate = _unset,
    Object? edTime = _unset,
    Object? triageTime = _unset,
    Object? age = _unset,
    Object? eligible = _unset,
    Object? exclusionCode = _unset,
    Object? exclusionReason = _unset,
    Object? sex = _unset,
    Object? referral = _unset,
    Object? dm = _unset,
    Object? htn = _unset,
    Object? asthma = _unset,
    Object? epilepsy = _unset,
    Object? rvd = _unset,
    Object? otherComorb = _unset,
    Object? otherComorbText = _unset,
    Object? pregTest = _unset,
    Object? satsCat = _unset,
    Object? tewsTotal = _unset,
    Object? discriminatorYes = _unset,
    Object? discriminatorType = _unset,
    Object? documentationComplete = _unset,
    Object? temp = _unset,
    Object? hr = _unset,
    Object? rr = _unset,
    Object? sbp = _unset,
    Object? dbp = _unset,
    Object? spo2 = _unset,
    Object? rbs = _unset,
    Object? rdt = _unset,
    Object? mobility = _unset,
    Object? avpu = _unset,
    Object? trauma = _unset,
    Object? chiefComplaintVerbatim = _unset,
    Object? complaintGroup = _unset,
    Object? multipleComplaints = _unset,
    Object? initialDestination = _unset,
    Object? clinicianTime = _unset,
    Object? treatmentTime = _unset,
    Object? outcome24 = _unset,
    Object? outcomeDatetime = _unset,
    Object? outcomeSource = _unset,
    Object? duplicateFlagsJson = _unset,
    Object? version = _unset,
  }) {
    return RaRecordDraft(
      recordId: identical(recordId, _unset) ? this.recordId : recordId as int?,
      clientUuid: identical(clientUuid, _unset)
          ? this.clientUuid
          : clientUuid as String?,
      studyId: identical(studyId, _unset) ? this.studyId : studyId as String,
      status: identical(status, _unset) ? this.status : status as String,
      mode: identical(mode, _unset) ? this.mode : mode as String,
      edDate: identical(edDate, _unset) ? this.edDate : edDate as DateTime?,
      edTime: identical(edTime, _unset) ? this.edTime : edTime as String?,
      triageTime: identical(triageTime, _unset)
          ? this.triageTime
          : triageTime as String?,
      age: identical(age, _unset) ? this.age : age as int?,
      eligible: identical(eligible, _unset) ? this.eligible : eligible as bool?,
      exclusionCode: identical(exclusionCode, _unset)
          ? this.exclusionCode
          : exclusionCode as String?,
      exclusionReason: identical(exclusionReason, _unset)
          ? this.exclusionReason
          : exclusionReason as String?,
      sex: identical(sex, _unset) ? this.sex : sex as String?,
      referral:
          identical(referral, _unset) ? this.referral : referral as String?,
      dm: identical(dm, _unset) ? this.dm : dm as bool?,
      htn: identical(htn, _unset) ? this.htn : htn as bool?,
      asthma: identical(asthma, _unset) ? this.asthma : asthma as bool?,
      epilepsy: identical(epilepsy, _unset) ? this.epilepsy : epilepsy as bool?,
      rvd: identical(rvd, _unset) ? this.rvd : rvd as bool?,
      otherComorb: identical(otherComorb, _unset)
          ? this.otherComorb
          : otherComorb as bool?,
      otherComorbText: identical(otherComorbText, _unset)
          ? this.otherComorbText
          : otherComorbText as String?,
      pregTest:
          identical(pregTest, _unset) ? this.pregTest : pregTest as String?,
      satsCat: identical(satsCat, _unset) ? this.satsCat : satsCat as String?,
      tewsTotal:
          identical(tewsTotal, _unset) ? this.tewsTotal : tewsTotal as int?,
      discriminatorYes: identical(discriminatorYes, _unset)
          ? this.discriminatorYes
          : discriminatorYes as bool?,
      discriminatorType: identical(discriminatorType, _unset)
          ? this.discriminatorType
          : discriminatorType as String?,
      documentationComplete: identical(documentationComplete, _unset)
          ? this.documentationComplete
          : documentationComplete as bool?,
      temp: identical(temp, _unset) ? this.temp : temp as double?,
      hr: identical(hr, _unset) ? this.hr : hr as int?,
      rr: identical(rr, _unset) ? this.rr : rr as int?,
      sbp: identical(sbp, _unset) ? this.sbp : sbp as int?,
      dbp: identical(dbp, _unset) ? this.dbp : dbp as int?,
      spo2: identical(spo2, _unset) ? this.spo2 : spo2 as double?,
      rbs: identical(rbs, _unset) ? this.rbs : rbs as double?,
      rdt: identical(rdt, _unset) ? this.rdt : rdt as String?,
      mobility:
          identical(mobility, _unset) ? this.mobility : mobility as String?,
      avpu: identical(avpu, _unset) ? this.avpu : avpu as String?,
      trauma: identical(trauma, _unset) ? this.trauma : trauma as String?,
      chiefComplaintVerbatim: identical(chiefComplaintVerbatim, _unset)
          ? this.chiefComplaintVerbatim
          : chiefComplaintVerbatim as String?,
      complaintGroup: identical(complaintGroup, _unset)
          ? this.complaintGroup
          : complaintGroup as String?,
      multipleComplaints: identical(multipleComplaints, _unset)
          ? this.multipleComplaints
          : multipleComplaints as bool?,
      initialDestination: identical(initialDestination, _unset)
          ? this.initialDestination
          : initialDestination as String?,
      clinicianTime: identical(clinicianTime, _unset)
          ? this.clinicianTime
          : clinicianTime as String?,
      treatmentTime: identical(treatmentTime, _unset)
          ? this.treatmentTime
          : treatmentTime as String?,
      outcome24:
          identical(outcome24, _unset) ? this.outcome24 : outcome24 as String?,
      outcomeDatetime: identical(outcomeDatetime, _unset)
          ? this.outcomeDatetime
          : outcomeDatetime as DateTime?,
      outcomeSource: identical(outcomeSource, _unset)
          ? this.outcomeSource
          : outcomeSource as String?,
      duplicateFlagsJson: identical(duplicateFlagsJson, _unset)
          ? this.duplicateFlagsJson
          : duplicateFlagsJson as String?,
      version: identical(version, _unset) ? this.version : version as int,
    );
  }

  factory RaRecordDraft.fromBundle(DraftRecordBundle bundle) {
    return RaRecordDraft(
      recordId: bundle.record.id,
      clientUuid: bundle.record.clientUuid,
      studyId: bundle.record.studyId,
      status: bundle.record.status,
      mode: bundle.record.mode,
      edDate: bundle.eligibility?.edDate,
      edTime: bundle.eligibility?.edTime,
      triageTime: bundle.eligibility?.triageTime,
      age: bundle.eligibility?.age,
      eligible: bundle.eligibility?.eligible,
      exclusionCode: bundle.eligibility?.exclusionCode,
      exclusionReason: bundle.eligibility?.exclusionReason,
      sex: bundle.patient?.sex,
      referral: bundle.patient?.referral,
      dm: _decodeBinaryCode(bundle.patient?.dm),
      htn: _decodeBinaryCode(bundle.patient?.htn),
      asthma: _decodeBinaryCode(bundle.patient?.asthma),
      epilepsy: _decodeBinaryCode(bundle.patient?.epilepsy),
      rvd: _decodeBinaryCode(bundle.patient?.rvd),
      otherComorb: _decodeBinaryCode(bundle.patient?.otherComorb),
      otherComorbText: bundle.patient?.otherComorbText,
      pregTest: bundle.patient?.pregTest,
      satsCat: bundle.sats?.satsCat,
      tewsTotal: bundle.sats?.tewsTotal,
      discriminatorYes: bundle.sats?.discriminatorYes,
      discriminatorType: bundle.sats?.discriminatorType,
      documentationComplete: bundle.sats?.documentationComplete,
      temp: bundle.physiology?.temp,
      hr: bundle.physiology?.hr,
      rr: bundle.physiology?.rr,
      sbp: bundle.physiology?.sbp,
      dbp: bundle.physiology?.dbp,
      spo2: bundle.physiology?.spo2,
      rbs: bundle.physiology?.rbs,
      rdt: bundle.physiology?.rdt,
      mobility: bundle.physiology?.mobility,
      avpu: bundle.physiology?.avpu,
      trauma: bundle.physiology?.trauma,
      chiefComplaintVerbatim: bundle.presentation?.chiefComplaintVerbatim,
      complaintGroup: bundle.presentation?.complaintGroup,
      multipleComplaints: bundle.presentation?.multipleComplaints,
      initialDestination: bundle.record.initialDestination,
      clinicianTime: bundle.process?.clinicianTime,
      treatmentTime: bundle.process?.treatmentTime,
      outcome24: bundle.outcome?.outcome24,
      outcomeDatetime: bundle.outcome?.outcomeDatetime,
      outcomeSource: bundle.outcome?.outcomeSource,
      duplicateFlagsJson: bundle.record.duplicateFlagsJson,
      version: bundle.record.version,
    );
  }
}

bool? _decodeBinaryCode(String? value) {
  switch (value) {
    case '1':
      return true;
    case '0':
      return false;
    default:
      return null;
  }
}
