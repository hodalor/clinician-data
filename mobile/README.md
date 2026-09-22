# SUE Mobile

Android-first Flutter scaffold for offline abstraction, sync, and QC workflows.

## Live backend

The mobile app is configured to use the deployed Cloud Run backend by default:

`https://suestudy-40910896851.europe-west9.run.app`

This means login, record save, and `POST /sync/records` from the release APK go
to the live API unless `API_BASE_URL` is overridden in `mobile/.env`.

## Included

- `flutter_riverpod` for state management
- `dio` for API access
- `flutter_dotenv` for API base URL configuration
- `drift` + `sqlcipher_flutter_libs` for encrypted local persistence
- `flutter_secure_storage` for Android Keystore-backed database key storage
- normalized local tables for `research_records` and its nested sections
- draft CRUD DAO + repository scaffolding

## Current limitation

This environment does not have the Flutter SDK installed, so the project was scaffolded by hand instead of running `flutter create`.

Once Flutter is available, run:

```bash
flutter create --platforms=android .
flutter pub get
dart run build_runner build --delete-conflicting-outputs
```

If you want to keep the files created here, run `flutter create` from the `mobile/` directory so the Android runner is generated around the existing `lib/` and `pubspec.yaml`.

## Release APK

To build smaller Android release APKs, use:

```bash
./build_release_apk.sh
```

This builds split APKs per ABI, which keeps each download smaller than a single
universal APK.
