class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
  });

  final String id;
  final String email;
  final String fullName;
  final String role;

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'full_name': fullName,
        'role': role,
      };

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    final id = _readRequiredString(json, 'id');
    final email = _readRequiredString(json, 'email');
    final fullName = _readRequiredString(json, 'full_name');
    final role = _readRequiredString(json, 'role');

    return AuthUser(
      id: id,
      email: email,
      fullName: fullName,
      role: role,
    );
  }
}

class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
    required this.deviceId,
  });

  final String accessToken;
  final String refreshToken;
  final AuthUser user;
  final String deviceId;

  Map<String, dynamic> toJson() => {
        'access_token': accessToken,
        'refresh_token': refreshToken,
        'user': user.toJson(),
        'device_id': deviceId,
      };

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final accessToken = _readRequiredString(json, 'access_token');
    final refreshToken = _readRequiredString(json, 'refresh_token');
    final userJson = json['user'];
    final deviceId = _readRequiredString(json, 'device_id');

    if (userJson is! Map) {
      throw const FormatException('Saved session is missing user details.');
    }

    return AuthSession(
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: AuthUser.fromJson(Map<String, dynamic>.from(userJson)),
      deviceId: deviceId,
    );
  }
}

String _readRequiredString(Map<String, dynamic> json, String key) {
  final value = json[key];

  if (value is! String) {
    throw FormatException('Expected "$key" to be a string.');
  }

  final trimmed = value.trim();
  if (trimmed.isEmpty) {
    throw FormatException('Expected "$key" to be a non-empty string.');
  }

  return trimmed;
}
