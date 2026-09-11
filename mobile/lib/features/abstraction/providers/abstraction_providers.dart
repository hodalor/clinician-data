import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/local/app_database.dart';
import '../../../data/local/destination_cache_storage.dart';
import '../../../data/local/database_key_service.dart';
import '../../../data/remote/authenticated_api_client.dart';
import '../../../data/models/destination_option.dart';
import '../../../data/repositories/destination_repository.dart';
import '../../../data/repositories/draft_repository.dart';

final databaseKeyServiceProvider = Provider<DatabaseKeyService>((ref) {
  return DatabaseKeyService();
});

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final keyService = ref.watch(databaseKeyServiceProvider);
  final database = AppDatabase(keyService);

  ref.onDispose(database.close);
  return database;
});

final researchRecordDaoProvider = Provider<ResearchRecordDao>((ref) {
  final database = ref.watch(appDatabaseProvider);
  return database.researchRecordDao;
});

final draftRepositoryProvider = Provider<DraftRepository>((ref) {
  return DraftRepository(
    database: ref.watch(appDatabaseProvider),
    recordDao: ref.watch(researchRecordDaoProvider),
  );
});

final draftListProvider = StreamProvider<List<ResearchRecord>>((ref) {
  return ref.watch(draftRepositoryProvider).watchDrafts();
});

final localRecordListProvider = StreamProvider<List<ResearchRecord>>((ref) {
  return ref.watch(draftRepositoryProvider).watchAllRecords();
});

final draftBundleProvider =
    FutureProvider.family<DraftRecordBundle?, int>((ref, recordId) {
  return ref.watch(draftRepositoryProvider).getDraftBundle(recordId);
});

final destinationCacheStorageProvider =
    Provider<DestinationCacheStorage>((ref) {
  return DestinationCacheStorage();
});

final destinationRepositoryProvider = Provider<DestinationRepository>((ref) {
  return DestinationRepository(
    dio: ref.watch(authenticatedDioProvider),
    cacheStorage: ref.watch(destinationCacheStorageProvider),
  );
});

final approvedDestinationsProvider =
    FutureProvider<List<DestinationOption>>((ref) async {
  return ref.watch(destinationRepositoryProvider).fetchApprovedDestinations();
});
