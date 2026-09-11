part of '../app_database.dart';

class DraftRecordBundle {
  const DraftRecordBundle({
    required this.record,
    this.eligibility,
    this.patient,
    this.sats,
    this.physiology,
    this.presentation,
    this.process,
    this.dataQuality,
    this.outcome,
  });

  final ResearchRecord record;
  final EligibilityEntry? eligibility;
  final PatientEntry? patient;
  final SatsEntry? sats;
  final PhysiologyEntry? physiology;
  final PresentationEntry? presentation;
  final ProcessEntry? process;
  final DataQualityEntry? dataQuality;
  final OutcomeEntry? outcome;
}

@DriftAccessor(
  tables: [
    ResearchRecords,
    EligibilityEntries,
    PatientEntries,
    SatsEntries,
    PhysiologyEntries,
    PresentationEntries,
    ProcessEntries,
    DataQualityEntries,
    OutcomeEntries,
  ],
)
class ResearchRecordDao extends DatabaseAccessor<AppDatabase>
    with _$ResearchRecordDaoMixin {
  ResearchRecordDao(super.db);

  static const queueStatuses = [
    'Draft',
    'Clinical Data Complete - Outcome Pending',
    'Complete',
    'Needs Review',
    'Returned for Correction',
    'Verified',
    'Locked',
    'Excluded',
  ];

  Future<int> createDraft(ResearchRecordsCompanion record) {
    return into(researchRecords).insert(record);
  }

  Future<void> updateDraftMainRecord(
    int recordId,
    ResearchRecordsCompanion record,
  ) {
    return (update(researchRecords)..where((tbl) => tbl.id.equals(recordId)))
        .write(record);
  }

  Future<void> updateDraftStatus({
    required int recordId,
    required String status,
    required int version,
    required DateTime updatedAt,
  }) {
    return (update(researchRecords)..where((tbl) => tbl.id.equals(recordId)))
        .write(
      ResearchRecordsCompanion(
        status: Value(status),
        version: Value(version),
        updatedAt: Value(updatedAt),
      ),
    );
  }

  Future<void> updateSyncMetadata(
    int recordId,
    ResearchRecordsCompanion record,
  ) {
    return (update(researchRecords)..where((tbl) => tbl.id.equals(recordId)))
        .write(record);
  }

  Stream<List<ResearchRecord>> watchDrafts() {
    final query = select(researchRecords)
      ..where((tbl) => tbl.status.isIn(queueStatuses))
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.updatedAt)]);

    return query.watch();
  }

  Stream<List<ResearchRecord>> watchAllRecords() {
    return (select(researchRecords)
          ..orderBy([(tbl) => OrderingTerm.desc(tbl.updatedAt)]))
        .watch();
  }

  Stream<List<ResearchRecord>> watchRecordsBySyncState(String syncState) {
    return (select(researchRecords)
          ..where((tbl) => tbl.syncState.equals(syncState))
          ..orderBy([(tbl) => OrderingTerm.desc(tbl.updatedAt)]))
        .watch();
  }

  Stream<List<ResearchRecord>> watchRecordsByStatus(String status) {
    return (select(researchRecords)
          ..where((tbl) => tbl.status.equals(status))
          ..orderBy([(tbl) => OrderingTerm.desc(tbl.updatedAt)]))
        .watch();
  }

  Future<List<ResearchRecord>> getRecordsPendingSync({
    DateTime? readyAt,
    int limit = 20,
    int? recordId,
  }) {
    final query = select(researchRecords)
      ..where((tbl) {
        final retryReady = readyAt == null
            ? const Constant(true)
            : tbl.nextRetryAt.isNull() |
                tbl.nextRetryAt.isSmallerOrEqualValue(readyAt);
        final queueState =
            tbl.syncState.equals('pending') | tbl.syncState.equals('failed');
        final recordFilter =
            recordId == null ? const Constant(true) : tbl.id.equals(recordId);
        return queueState & retryReady & recordFilter;
      })
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.updatedAt)])
      ..limit(limit);

    return query.get();
  }

  Future<DateTime?> getNextRetryAt() async {
    final nextRecord = await (select(researchRecords)
          ..where((tbl) => tbl.nextRetryAt.isNotNull())
          ..orderBy([(tbl) => OrderingTerm.asc(tbl.nextRetryAt)])
          ..limit(1))
        .getSingleOrNull();

    return nextRecord?.nextRetryAt;
  }

  Stream<ResearchRecord?> watchDraftById(int recordId) {
    return (select(researchRecords)..where((tbl) => tbl.id.equals(recordId)))
        .watchSingleOrNull();
  }

  Future<DraftRecordBundle?> getDraftBundle(int recordId) async {
    final record = await (select(researchRecords)
          ..where((tbl) => tbl.id.equals(recordId)))
        .getSingleOrNull();

    if (record == null) {
      return null;
    }

    final eligibility = await (select(eligibilityEntries)
          ..where((tbl) => tbl.recordId.equals(recordId)))
        .getSingleOrNull();
    final patient = await (select(patientEntries)
          ..where((tbl) => tbl.recordId.equals(recordId)))
        .getSingleOrNull();
    final sats = await (select(satsEntries)
          ..where((tbl) => tbl.recordId.equals(recordId)))
        .getSingleOrNull();
    final physiology = await (select(physiologyEntries)
          ..where((tbl) => tbl.recordId.equals(recordId)))
        .getSingleOrNull();
    final presentation = await (select(presentationEntries)
          ..where((tbl) => tbl.recordId.equals(recordId)))
        .getSingleOrNull();
    final process = await (select(processEntries)
          ..where((tbl) => tbl.recordId.equals(recordId)))
        .getSingleOrNull();
    final dataQuality = await (select(dataQualityEntries)
          ..where((tbl) => tbl.recordId.equals(recordId)))
        .getSingleOrNull();
    final outcome = await (select(outcomeEntries)
          ..where((tbl) => tbl.recordId.equals(recordId)))
        .getSingleOrNull();

    return DraftRecordBundle(
      record: record,
      eligibility: eligibility,
      patient: patient,
      sats: sats,
      physiology: physiology,
      presentation: presentation,
      process: process,
      dataQuality: dataQuality,
      outcome: outcome,
    );
  }

  Future<void> upsertEligibility(EligibilityEntriesCompanion entry) {
    return into(eligibilityEntries).insertOnConflictUpdate(entry);
  }

  Future<void> upsertPatient(PatientEntriesCompanion entry) {
    return into(patientEntries).insertOnConflictUpdate(entry);
  }

  Future<void> upsertSats(SatsEntriesCompanion entry) {
    return into(satsEntries).insertOnConflictUpdate(entry);
  }

  Future<void> upsertPhysiology(PhysiologyEntriesCompanion entry) {
    return into(physiologyEntries).insertOnConflictUpdate(entry);
  }

  Future<void> upsertPresentation(PresentationEntriesCompanion entry) {
    return into(presentationEntries).insertOnConflictUpdate(entry);
  }

  Future<void> upsertProcess(ProcessEntriesCompanion entry) {
    return into(processEntries).insertOnConflictUpdate(entry);
  }

  Future<void> upsertDataQuality(DataQualityEntriesCompanion entry) {
    return into(dataQualityEntries).insertOnConflictUpdate(entry);
  }

  Future<void> upsertOutcome(OutcomeEntriesCompanion entry) {
    return into(outcomeEntries).insertOnConflictUpdate(entry);
  }

  Future<void> deleteDraft(int recordId) {
    return transaction(() async {
      await (delete(researchRecords)..where((tbl) => tbl.id.equals(recordId)))
          .go();
    });
  }
}
