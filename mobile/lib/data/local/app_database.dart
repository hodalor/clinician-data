import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3/open.dart';
import 'package:sqlcipher_flutter_libs/sqlcipher_flutter_libs.dart';
import 'database_key_service.dart';

part 'app_database.g.dart';
part 'daos/research_record_dao.dart';

class ResearchRecords extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get clientUuid => text().named('client_uuid')();
  TextColumn get studyId => text().named('study_id')();
  TextColumn get linkageId => text().named('linkage_id').nullable()();
  TextColumn get status => text().withDefault(const Constant('Draft'))();
  TextColumn get mode => text().withDefault(const Constant('TRAINING'))();
  TextColumn get extractorId => text().named('extractor_id').nullable()();
  DateTimeColumn get abstractDate =>
      dateTime().named('abstract_date').nullable()();
  TextColumn get deviceId => text().named('device_id').nullable()();
  TextColumn get appVersion => text().named('app_version').nullable()();
  TextColumn get dataDictionaryVersion =>
      text().named('data_dictionary_version').nullable()();
  IntColumn get version => integer().withDefault(const Constant(1))();
  TextColumn get syncState =>
      text().named('sync_state').withDefault(const Constant('pending'))();
  DateTimeColumn get lastSyncAttemptAt =>
      dateTime().named('last_sync_attempt_at').nullable()();
  DateTimeColumn get lastSyncedAt =>
      dateTime().named('last_synced_at').nullable()();
  TextColumn get syncErrorDetail =>
      text().named('sync_error_detail').nullable()();
  IntColumn get syncAttemptCount =>
      integer().named('sync_attempt_count').withDefault(const Constant(0))();
  DateTimeColumn get nextRetryAt =>
      dateTime().named('next_retry_at').nullable()();
  TextColumn get initialDestination =>
      text().named('initial_destination').nullable()();
  TextColumn get duplicateFlagsJson =>
      text().named('duplicate_flags_json').nullable()();
  DateTimeColumn get createdAt =>
      dateTime().named('created_at').withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt =>
      dateTime().named('updated_at').withDefault(currentDateAndTime)();

  @override
  List<String> get customConstraints => [
        'UNIQUE(client_uuid)',
        'UNIQUE(study_id)',
        "CHECK (status IN ('Draft', 'Clinical Data Complete - Outcome Pending', 'Complete', 'Needs Review', 'Pending Sync', 'Sync Failed', 'Synced', 'QC Required', 'Returned for Correction', 'Verified', 'Locked', 'Excluded'))",
        "CHECK (mode IN ('PILOT', 'TRAINING', 'PRODUCTION'))",
        "CHECK (sync_state IN ('pending', 'syncing', 'synced', 'failed', 'conflict'))",
      ];
}

class EligibilityEntries extends Table {
  IntColumn get recordId =>
      integer().named('record_id').references(ResearchRecords, #id)();
  TextColumn get studyId => text().named('study_id')();
  DateTimeColumn get edDate => dateTime().named('ed_date').nullable()();
  TextColumn get edTime => text().named('ed_time').nullable()();
  TextColumn get triageTime => text().named('triage_time').nullable()();
  IntColumn get age => integer().nullable()();
  BoolColumn get eligible => boolean().nullable()();
  TextColumn get exclusionCode => text().named('exclusion_code').nullable()();
  TextColumn get exclusionReason =>
      text().named('exclusion_reason').nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {recordId};

  @override
  List<String> get customConstraints => [
        "CHECK (exclusion_code IS NULL OR exclusion_code IN ('1', '2', '3', '4', '5', '9'))",
      ];
}

class PatientEntries extends Table {
  IntColumn get recordId =>
      integer().named('record_id').references(ResearchRecords, #id)();
  TextColumn get studyId => text().named('study_id')();
  TextColumn get sex => text().nullable()();
  TextColumn get referral => text().nullable()();
  TextColumn get referringHealthCenter =>
      text().named('referring_health_center').nullable()();
  TextColumn get dm => text().nullable()();
  TextColumn get htn => text().nullable()();
  TextColumn get asthma => text().nullable()();
  TextColumn get epilepsy => text().nullable()();
  TextColumn get rvd => text().nullable()();
  TextColumn get otherComorb => text().named('other_comorb').nullable()();
  TextColumn get otherComorbText =>
      text().named('other_comorb_text').nullable()();
  TextColumn get comorbAny => text().named('comorb_any').nullable()();
  TextColumn get pregTest => text().named('preg_test').nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {recordId};

  @override
  List<String> get customConstraints => [
        "CHECK (sex IS NULL OR sex IN ('1', '2', '9'))",
        "CHECK (referral IS NULL OR referral IN ('0', '1', '9'))",
        "CHECK (dm IS NULL OR dm IN ('0', '1', '9'))",
        "CHECK (htn IS NULL OR htn IN ('0', '1', '9'))",
        "CHECK (asthma IS NULL OR asthma IN ('0', '1', '9'))",
        "CHECK (epilepsy IS NULL OR epilepsy IN ('0', '1', '9'))",
        "CHECK (rvd IS NULL OR rvd IN ('0', '1', '9'))",
        "CHECK (other_comorb IS NULL OR other_comorb IN ('0', '1', '9'))",
        "CHECK (comorb_any IS NULL OR comorb_any IN ('0', '1', '9'))",
        "CHECK (preg_test IS NULL OR preg_test IN ('0', '1', '8', '9'))",
      ];
}

class SatsEntries extends Table {
  IntColumn get recordId =>
      integer().named('record_id').references(ResearchRecords, #id)();
  TextColumn get studyId => text().named('study_id')();
  TextColumn get satsCat => text().named('sats_cat').nullable()();
  IntColumn get tewsTotal => integer().named('tews_total').nullable()();
  BoolColumn get discriminatorYes =>
      boolean().named('discriminator_yes').nullable()();
  TextColumn get discriminatorType =>
      text().named('discriminator_type').nullable()();
  BoolColumn get documentationComplete =>
      boolean().named('documentation_complete').nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {recordId};

  @override
  List<String> get customConstraints => [
        "CHECK (sats_cat IS NULL OR sats_cat IN ('1', '2', '3', '4'))",
        "CHECK (discriminator_type IS NULL OR discriminator_type IN ('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18'))",
      ];
}

class PhysiologyEntries extends Table {
  IntColumn get recordId =>
      integer().named('record_id').references(ResearchRecords, #id)();
  TextColumn get studyId => text().named('study_id')();
  RealColumn get temp => real().nullable()();
  IntColumn get hr => integer().nullable()();
  IntColumn get rr => integer().nullable()();
  IntColumn get sbp => integer().nullable()();
  IntColumn get dbp => integer().nullable()();
  RealColumn get spo2 => real().nullable()();
  RealColumn get rbs => real().nullable()();
  TextColumn get rdt => text().nullable()();
  TextColumn get mobility => text().nullable()();
  TextColumn get avpu => text().nullable()();
  TextColumn get trauma => text().nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {recordId};

  @override
  List<String> get customConstraints => [
        "CHECK (rdt IS NULL OR rdt IN ('0', '1', '8', '9'))",
        "CHECK (mobility IS NULL OR mobility IN ('0', '1', '2', '9'))",
        "CHECK (avpu IS NULL OR avpu IN ('0', '1', '2', '3', '9'))",
        "CHECK (trauma IS NULL OR trauma IN ('0', '1', '9'))",
      ];
}

class PresentationEntries extends Table {
  IntColumn get recordId =>
      integer().named('record_id').references(ResearchRecords, #id)();
  TextColumn get studyId => text().named('study_id')();
  TextColumn get chiefComplaintVerbatim =>
      text().named('chief_complaint_verbatim').nullable()();
  TextColumn get complaintGroup => text().named('complaint_group').nullable()();
  BoolColumn get multipleComplaints =>
      boolean().named('multiple_complaints').nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {recordId};

  @override
  List<String> get customConstraints => [
        "CHECK (complaint_group IS NULL OR complaint_group IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10'))",
      ];
}

class ProcessEntries extends Table {
  IntColumn get recordId =>
      integer().named('record_id').references(ResearchRecords, #id)();
  TextColumn get studyId => text().named('study_id')();
  TextColumn get clinicianTime => text().named('clinician_time').nullable()();
  TextColumn get treatmentTime => text().named('treatment_time').nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {recordId};
}

class DataQualityEntries extends Table {
  IntColumn get recordId =>
      integer().named('record_id').references(ResearchRecords, #id)();
  TextColumn get studyId => text().named('study_id')();
  BoolColumn get missSats => boolean().named('miss_sats').nullable()();
  BoolColumn get missTews => boolean().named('miss_tews').nullable()();
  BoolColumn get missVitals => boolean().named('miss_vitals').nullable()();
  BoolColumn get missOutcome => boolean().named('miss_outcome').nullable()();
  BoolColumn get sourceConflict =>
      boolean().named('source_conflict').nullable()();
  BoolColumn get qcRequired => boolean().named('qc_required').nullable()();
  TextColumn get reviewerId => text().named('reviewer_id').nullable()();
  TextColumn get qcComment => text().named('qc_comment').nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {recordId};
}

class OutcomeEntries extends Table {
  IntColumn get recordId =>
      integer().named('record_id').references(ResearchRecords, #id)();
  TextColumn get studyId => text().named('study_id')();
  TextColumn get outcome24 => text().named('outcome24').nullable()();
  DateTimeColumn get outcomeDatetime =>
      dateTime().named('outcome_datetime').nullable()();
  TextColumn get outcomeSource => text().named('outcome_source').nullable()();
  BoolColumn get verified =>
      boolean().named('verified').withDefault(const Constant(false))();
  TextColumn get verifiedBy => text().named('verified_by').nullable()();
  DateTimeColumn get verifiedAt => dateTime().named('verified_at').nullable()();

  @override
  Set<Column<Object>>? get primaryKey => {recordId};

  @override
  List<String> get customConstraints => [
        "CHECK (outcome24 IS NULL OR outcome24 IN ('1', '2', '3', '4'))",
        "CHECK (outcome_source IS NULL OR outcome_source IN ('1', '2', '3', '4', '5', '6'))",
      ];
}

@DriftDatabase(
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
  daos: [ResearchRecordDao],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase._(super.executor);

  factory AppDatabase(DatabaseKeyService keyService) {
    return AppDatabase._(_openConnection(keyService));
  }

  @override
  int get schemaVersion => 4;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (migrator) async => migrator.createAll(),
        onUpgrade: (migrator, from, to) async {
          if (from < 2) {
            await migrator.addColumn(
                researchRecords, researchRecords.syncState);
            await migrator.addColumn(
              researchRecords,
              researchRecords.lastSyncAttemptAt,
            );
            await migrator.addColumn(
              researchRecords,
              researchRecords.lastSyncedAt,
            );
            await migrator.addColumn(
              researchRecords,
              researchRecords.syncErrorDetail,
            );
            await migrator.addColumn(
              researchRecords,
              researchRecords.syncAttemptCount,
            );
            await migrator.addColumn(
              researchRecords,
              researchRecords.nextRetryAt,
            );
          }
          if (from < 3) {
            await migrator.addColumn(patientEntries, patientEntries.epilepsy);
          }
          if (from < 4) {
            await migrator.addColumn(
              patientEntries,
              patientEntries.referringHealthCenter,
            );
          }
        },
      );
}

LazyDatabase _openConnection(DatabaseKeyService keyService) {
  return LazyDatabase(() async {
    final dbKey = await keyService.readOrCreateDatabaseKey();
    final appDir = await getApplicationDocumentsDirectory();
    final file = File(p.join(appDir.path, 'sue_mobile_encrypted.db'));

    return NativeDatabase.createInBackground(
      file,
      isolateSetup: _configureSqlCipher,
      setup: (database) {
        database.execute('PRAGMA key = "x\'$dbKey\'";');
        database.execute('PRAGMA foreign_keys = ON;');
        database.execute('PRAGMA journal_mode = WAL;');
        database.execute('PRAGMA cipher_page_size = 4096;');
        database.execute('PRAGMA kdf_iter = 256000;');
      },
    );
  });
}

bool _sqlCipherConfigured = false;

void _configureSqlCipher() {
  if (_sqlCipherConfigured) {
    return;
  }

  open.overrideFor(OperatingSystem.android, openCipherOnAndroid);
  _sqlCipherConfigured = true;
}
