import 'auth_session.dart';

enum AuthLoginStatus {
  authenticated,
  pendingApproval,
  rejected,
}

class AuthLoginResult {
  const AuthLoginResult._({
    required this.status,
    this.session,
    this.requestId,
    this.message,
  });

  const AuthLoginResult.authenticated(AuthSession session)
      : this._(
          status: AuthLoginStatus.authenticated,
          session: session,
        );

  const AuthLoginResult.pendingApproval({
    String? requestId,
    String? message,
  }) : this._(
          status: AuthLoginStatus.pendingApproval,
          requestId: requestId,
          message: message,
        );

  const AuthLoginResult.rejected({
    String? requestId,
    String? message,
  }) : this._(
          status: AuthLoginStatus.rejected,
          requestId: requestId,
          message: message,
        );

  final AuthLoginStatus status;
  final AuthSession? session;
  final String? requestId;
  final String? message;
}
