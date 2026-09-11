import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import '../../../data/local/auth_session_storage.dart';
import '../../../data/models/auth_login_result.dart';
import '../../../data/models/auth_session.dart';
import '../../../data/remote/api_client.dart';
import '../../../data/remote/auth_api.dart';
import '../../../data/repositories/auth_repository.dart';

enum AuthPhase {
  bootstrapping,
  loggedOut,
  pendingApproval,
  authenticated,
  locked,
}

class AuthState {
  const AuthState({
    required this.phase,
    this.session,
    this.errorMessage,
    this.hasPin = false,
    this.biometricEnabled = false,
    this.lockPromptDismissed = false,
    this.isBusy = false,
    this.pendingMessage,
  });

  final AuthPhase phase;
  final AuthSession? session;
  final String? errorMessage;
  final bool hasPin;
  final bool biometricEnabled;
  final bool lockPromptDismissed;
  final bool isBusy;
  final String? pendingMessage;

  bool get isAuthenticated => phase == AuthPhase.authenticated;
  bool get needsUnlock => phase == AuthPhase.locked;
  bool get canUseLocalUnlock => hasPin || biometricEnabled;
  bool get shouldPromptForLocalUnlockSetup =>
      phase == AuthPhase.authenticated &&
      !lockPromptDismissed &&
      !canUseLocalUnlock;

  AuthState copyWith({
    AuthPhase? phase,
    AuthSession? session,
    String? errorMessage,
    bool clearError = false,
    bool? hasPin,
    bool? biometricEnabled,
    bool? lockPromptDismissed,
    bool? isBusy,
    String? pendingMessage,
    bool clearPendingMessage = false,
  }) {
    return AuthState(
      phase: phase ?? this.phase,
      session: session ?? this.session,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      hasPin: hasPin ?? this.hasPin,
      biometricEnabled: biometricEnabled ?? this.biometricEnabled,
      lockPromptDismissed: lockPromptDismissed ?? this.lockPromptDismissed,
      isBusy: isBusy ?? this.isBusy,
      pendingMessage: clearPendingMessage
          ? null
          : (pendingMessage ?? this.pendingMessage),
    );
  }
}

final localAuthProvider = Provider<LocalAuthentication>((ref) {
  return LocalAuthentication();
});

final authSessionStorageProvider = Provider<AuthSessionStorage>((ref) {
  return AuthSessionStorage();
});

final authApiProvider = Provider<AuthApi>((ref) {
  return AuthApi(ref.watch(apiClientProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    authApi: ref.watch(authApiProvider),
    sessionStorage: ref.watch(authSessionStorageProvider),
  );
});

class AuthController extends Notifier<AuthState> {
  Timer? _approvalPollTimer;
  String? _pendingEmail;
  String? _pendingPassword;
  bool _isCheckingPendingApproval = false;

  @override
  AuthState build() {
    ref.onDispose(() {
      _approvalPollTimer?.cancel();
    });
    Future.microtask(_bootstrap);
    return const AuthState(phase: AuthPhase.bootstrapping);
  }

  Future<void> _bootstrap() async {
    _stopApprovalPolling();
    final storage = ref.read(authSessionStorageProvider);
    final session = await storage.readSession();
    final hasPin = await storage.hasPin();
    final biometricEnabled = await storage.isBiometricUnlockEnabled();
    final lockPromptDismissed = await storage.isLockPromptDismissed();

    if (session == null) {
      state = AuthState(
        phase: AuthPhase.loggedOut,
        hasPin: hasPin,
        biometricEnabled: biometricEnabled,
        lockPromptDismissed: lockPromptDismissed,
      );
      return;
    }

    final needsUnlock = hasPin || biometricEnabled;
    state = AuthState(
      phase: needsUnlock ? AuthPhase.locked : AuthPhase.authenticated,
      session: session,
      hasPin: hasPin,
      biometricEnabled: biometricEnabled,
      lockPromptDismissed: lockPromptDismissed,
    );
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    _stopApprovalPolling();
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      final result = await ref.read(authRepositoryProvider).login(
            email: email.trim(),
            password: password,
          );

      if (result.status == AuthLoginStatus.pendingApproval) {
        _pendingEmail = email.trim();
        _pendingPassword = password;
        state = state.copyWith(
          phase: AuthPhase.pendingApproval,
          isBusy: false,
          pendingMessage:
              result.message ?? 'Waiting for admin approval to use this phone.',
          clearError: true,
        );
        _startApprovalPolling();
        return;
      }

      if (result.status == AuthLoginStatus.rejected) {
        state = state.copyWith(
          phase: AuthPhase.loggedOut,
          errorMessage: result.message ?? 'This phone was not approved yet.',
          isBusy: false,
          clearPendingMessage: true,
        );
        return;
      }

      final session = result.session!;
      final storage = ref.read(authSessionStorageProvider);
      state = state.copyWith(
        phase: AuthPhase.authenticated,
        session: session,
        hasPin: await storage.hasPin(),
        biometricEnabled: await storage.isBiometricUnlockEnabled(),
        lockPromptDismissed: await storage.isLockPromptDismissed(),
        isBusy: false,
        clearPendingMessage: true,
      );
    } on DioException catch (error) {
      state = state.copyWith(
        phase: AuthPhase.loggedOut,
        errorMessage: _readDioMessage(error),
        isBusy: false,
        clearPendingMessage: true,
      );
    } catch (error) {
      state = state.copyWith(
        phase: AuthPhase.loggedOut,
        errorMessage: error.toString(),
        isBusy: false,
        clearPendingMessage: true,
      );
    }
  }

  Future<bool> tryRefreshSession() async {
    try {
      final refreshed = await ref.read(authRepositoryProvider).refresh();
      if (refreshed == null) {
        await forceLogout();
        return false;
      }

      state = state.copyWith(
        phase: state.phase == AuthPhase.locked
            ? AuthPhase.locked
            : AuthPhase.authenticated,
        session: refreshed,
        clearError: true,
      );
      return true;
    } on DioException {
      await forceLogout();
      return false;
    }
  }

  Future<void> logout() async {
    _stopApprovalPolling();
    await ref.read(authRepositoryProvider).logout();
    await _bootstrap();
  }

  Future<void> forceLogout() async {
    _stopApprovalPolling();
    await ref.read(authRepositoryProvider).logout(remote: false);
    await _bootstrap();
  }

  void leavePendingApproval() {
    _stopApprovalPolling();
    state = state.copyWith(
      phase: AuthPhase.loggedOut,
      clearPendingMessage: true,
      clearError: true,
      isBusy: false,
    );
  }

  Future<void> dismissLockPrompt() async {
    await ref.read(authSessionStorageProvider).setLockPromptDismissed(true);
    state = state.copyWith(lockPromptDismissed: true);
  }

  Future<void> savePin(String pin) async {
    await ref.read(authSessionStorageProvider).savePin(pin);
    await ref.read(authSessionStorageProvider).setLockPromptDismissed(true);
    state = state.copyWith(
      hasPin: true,
      lockPromptDismissed: true,
    );
  }

  Future<void> clearPin() async {
    await ref.read(authSessionStorageProvider).clearPin();
    state = state.copyWith(
      hasPin: false,
    );
  }

  Future<void> setBiometricEnabled(bool enabled) async {
    await ref
        .read(authSessionStorageProvider)
        .setBiometricUnlockEnabled(enabled);
    await ref.read(authSessionStorageProvider).setLockPromptDismissed(true);
    state = state.copyWith(
      biometricEnabled: enabled,
      lockPromptDismissed: true,
    );
  }

  Future<bool> unlockWithPin(String pin) async {
    final matches = await ref.read(authSessionStorageProvider).verifyPin(pin);
    if (!matches) {
      state = state.copyWith(errorMessage: 'Incorrect PIN.');
      return false;
    }

    state = state.copyWith(
      phase: AuthPhase.authenticated,
      clearError: true,
    );
    return true;
  }

  Future<bool> unlockWithBiometrics() async {
    final localAuth = ref.read(localAuthProvider);
    final isSupported = await localAuth.isDeviceSupported();
    final canCheck = await localAuth.canCheckBiometrics;

    if (!isSupported && !canCheck) {
      state = state.copyWith(
        errorMessage:
            'Biometric authentication is not available on this device.',
      );
      return false;
    }

    final authenticated = await localAuth.authenticate(
      localizedReason: 'Confirm your identity to reopen the saved session.',
      options: const AuthenticationOptions(
        biometricOnly: false,
        stickyAuth: true,
      ),
    );

    if (authenticated) {
      state = state.copyWith(
        phase: AuthPhase.authenticated,
        clearError: true,
      );
      return true;
    }

    return false;
  }

  void lockForReentry() {
    if (state.phase == AuthPhase.authenticated && state.canUseLocalUnlock) {
      state = state.copyWith(
        phase: AuthPhase.locked,
        clearError: true,
      );
    }
  }

  void _startApprovalPolling() {
    _approvalPollTimer?.cancel();
    _approvalPollTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _checkPendingApproval(),
    );
  }

  void _stopApprovalPolling() {
    _approvalPollTimer?.cancel();
    _approvalPollTimer = null;
    _pendingEmail = null;
    _pendingPassword = null;
    _isCheckingPendingApproval = false;
  }

  Future<void> _checkPendingApproval() async {
    if (_isCheckingPendingApproval ||
        state.phase != AuthPhase.pendingApproval ||
        _pendingEmail == null ||
        _pendingPassword == null) {
      return;
    }

    _isCheckingPendingApproval = true;
    try {
      final result = await ref.read(authRepositoryProvider).login(
            email: _pendingEmail!,
            password: _pendingPassword!,
            isApprovalPoll: true,
          );

      if (result.status == AuthLoginStatus.pendingApproval) {
        return;
      }

      if (result.status == AuthLoginStatus.rejected) {
        _stopApprovalPolling();
        state = state.copyWith(
          phase: AuthPhase.loggedOut,
          errorMessage:
              result.message ?? 'This phone was not approved for this account.',
          clearPendingMessage: true,
        );
        return;
      }

      final storage = ref.read(authSessionStorageProvider);
      final session = result.session!;
      _stopApprovalPolling();
      state = state.copyWith(
        phase: AuthPhase.authenticated,
        session: session,
        hasPin: await storage.hasPin(),
        biometricEnabled: await storage.isBiometricUnlockEnabled(),
        lockPromptDismissed: await storage.isLockPromptDismissed(),
        clearError: true,
        clearPendingMessage: true,
      );
    } on DioException {
      // Keep waiting quietly on transient network errors.
    } finally {
      _isCheckingPendingApproval = false;
    }
  }

  String _readDioMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map<String, dynamic>) {
      final message = data['message'];
      if (message is List && message.isNotEmpty) {
        return message.join('\n');
      }
      if (message is String && message.isNotEmpty) {
        return message;
      }
    }
    return error.message ?? 'Something went wrong.';
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
