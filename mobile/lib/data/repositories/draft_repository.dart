import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';
import '../local/app_database.dart';

class DraftSaveResult {
  const DraftSaveResult({
    required this.recordId,
    required this.version,
  });

  final int recordId;
  final int version;
}

class DraftRepository {
  DraftRepository({
    required AppDatabase database,
    required ResearchRecordDao recordDao,
    Uuid? uuid,
  })  : _database = database,
        _recordDao = recordDao,
        _uuid = uuid ?? const Uuid();

  final AppDatabase _database;
  final ResearchRecordDao _recordDao;
  final Uuid _uuid;

  Stream<List<ResearchRecord>> watchDrafts() => _recordDao.watchDrafts();

  Stream<List<ResearchRecord>> watchAllRecords() =>
      _recordDao.watchAllRecords();

  Stream<List<ResearchRecord>> watchRecordsByStatus(String status) {
    return _recordDao.watchRecordsByStatus(status);
  }

  Stream<List<ResearchRecord>> watchRecordsBySyncState(String syncState) {
    return _recordDao.watchRecordsBySyncState(syncState);
  }

  Stream<ResearchRecord?> watchDraftById(int recordId) {
    return _recordDao.watchDraftById(recordId);
  }

  Future<DraftRecordBundle?> getDraftBundle(int recordId) {
    return _recordDao.getDraftBundle(recordId);
  }

  Future<int> createDraft({
    required String studyId,
    String mode = 'TRAINING',
    String status = 'Draft',
    String? extractorId,
    String? deviceId,
    String? appVersion,
    String? dataDictionaryVersion,
  }) {
    final now = DateTime.now();

    return _database.transaction(() async {
      final recordId = await _recordDao.createDraft(
        ResearchRecordsCompanion.insert(
          clientUuid: _uuid.v4(),
          studyId: studyId,
          status: Value(status),
          mode: Value(mode),
          syncState: const Value('pending'),
          extractorId: Value(extractorId),
          deviceId: Value(deviceId),
          appVersion: Value(appVersion),
          dataDictionaryVersion: Value(dataDictionaryVersion),
          createdAt: Value(now),
          updatedAt: Value(now),
        ),
      );

      await _recordDao.upsertDataQuality(
        DataQualityEntriesCompanion.insert(
          recordId: Value(recordId),
          studyId: studyId,
        ),
      );

      return recordId;
    });
  }

  Future<void> updateDraftMainRecord(
    int recordId,
    ResearchRecordsCompanion record,
  ) {
    return _recordDao.updateDraftMainRecord(recordId, record);
  }

  Future<void> updateDraftStatus({
    required int recordId,
    required String status,
    required int version,
  }) {
    return _recordDao.updateDraftStatus(
      recordId: recordId,
      status: status,
      version: version,
      updatedAt: DateTime.now(),
    );
  }

  Future<void> updateSyncMetadata(
    int recordId,
    ResearchRecordsCompanion record,
  ) {
    return _recordDao.updateSyncMetadata(recordId, record);
  }

  Future<List<ResearchRecord>> getRecordsPendingSync({
    DateTime? readyAt,
    int limit = 20,
    int? recordId,
  }) {
    return _recordDao.getRecordsPendingSync(
      readyAt: readyAt,
      limit: limit,
      recordId: recordId,
    );
  }

  Future<DateTime?> getNextRetryAt() {
    return _recordDao.getNextRetryAt();
  }

  Future<void> upsertEligibility(EligibilityEntriesCompanion entry) {
    return _recordDao.upsertEligibility(entry);
  }

  Future<void> upsertPatient(PatientEntriesCompanion entry) {
    return _recordDao.upsertPatient(entry);
  }

  Future<void> upsertSats(SatsEntriesCompanion entry) {
    return _recordDao.upsertSats(entry);
  }

  Future<void> upsertPhysiology(PhysiologyEntriesCompanion entry) {
    return _recordDao.upsertPhysiology(entry);
  }

  Future<void> upsertPresentation(PresentationEntriesCompanion entry) {
    return _recordDao.upsertPresentation(entry);
  }

  Future<void> upsertProcess(ProcessEntriesCompanion entry) {
    return _recordDao.upsertProcess(entry);
  }

  Future<void> upsertDataQuality(DataQualityEntriesCompanion entry) {
    return _recordDao.upsertDataQuality(entry);
  }

  Future<void> upsertOutcome(OutcomeEntriesCompanion entry) {
    return _recordDao.upsertOutcome(entry);
  }

  Future<void> deleteDraft(int recordId) {
    return _recordDao.deleteDraft(recordId);
  }

  Future<DraftSaveResult> saveDraftBundle({
    required int? existingRecordId,
    required String studyId,
    required String mode,
    required String status,
    required DateTime now,
    required String? initialDestination,
    required String? duplicateFlagsJson,
    required int currentVersion,
    required EligibilityEntriesCompanion eligibility,
    PatientEntriesCompanion? patient,
    SatsEntriesCompanion? sats,
    PhysiologyEntriesCompanion? physiology,
    PresentationEntriesCompanion? presentation,
    ProcessEntriesCompanion? process,
    DataQualityEntriesCompanion? dataQuality,
    OutcomeEntriesCompanion? outcome,
  }) {
    return _database.transaction(() async {
      final recordId = existingRecordId ??
          await _recordDao.createDraft(
            ResearchRecordsCompanion.insert(
              clientUuid: _uuid.v4(),
              studyId: studyId,
              status: Value(status),
              mode: Value(mode),
              syncState: const Value('pending'),
              createdAt: Value(now),
              updatedAt: Value(now),
            ),
          );

      final nextVersion = existingRecordId == null ? 1 : currentVersion + 1;

      await _recordDao.updateDraftMainRecord(
        recordId,
        ResearchRecordsCompanion(
          studyId: Value(studyId),
          status: Value(status),
          mode: Value(mode),
          syncState: const Value('pending'),
          syncErrorDetail: const Value(null),
          syncAttemptCount: const Value(0),
          nextRetryAt: const Value(null),
          initialDestination: Value(initialDestination),
          duplicateFlagsJson: Value(duplicateFlagsJson),
          updatedAt: Value(now),
          version: Value(nextVersion),
        ),
      );

      await _recordDao.upsertEligibility(
        eligibility.copyWith(
          recordId: Value(recordId),
          studyId: Value(studyId),
        ),
      );

      if (patient != null) {
        await _recordDao.upsertPatient(
          patient.copyWith(
            recordId: Value(recordId),
            studyId: Value(studyId),
          ),
        );
      }
      if (sats != null) {
        await _recordDao.upsertSats(
          sats.copyWith(
            recordId: Value(recordId),
            studyId: Value(studyId),
          ),
        );
      }
      if (physiology != null) {
        await _recordDao.upsertPhysiology(
          physiology.copyWith(
            recordId: Value(recordId),
            studyId: Value(studyId),
          ),
        );
      }
      if (presentation != null) {
        await _recordDao.upsertPresentation(
          presentation.copyWith(
            recordId: Value(recordId),
            studyId: Value(studyId),
          ),
        );
      }
      if (process != null) {
        await _recordDao.upsertProcess(
          process.copyWith(
            recordId: Value(recordId),
            studyId: Value(studyId),
          ),
        );
      }
      if (dataQuality != null) {
        await _recordDao.upsertDataQuality(
          dataQuality.copyWith(
            recordId: Value(recordId),
            studyId: Value(studyId),
          ),
        );
      }
      if (outcome != null) {
        await _recordDao.upsertOutcome(
          outcome.copyWith(
            recordId: Value(recordId),
            studyId: Value(studyId),
          ),
        );
      }

      return DraftSaveResult(recordId: recordId, version: nextVersion);
    });
  }
}
