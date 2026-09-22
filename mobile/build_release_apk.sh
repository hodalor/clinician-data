#!/bin/zsh

set -euo pipefail

SUE_MOBILE_ROOT="$(cd "$(dirname "$0")" && pwd)"
export HOME="$SUE_MOBILE_ROOT"
export GRADLE_USER_HOME="$SUE_MOBILE_ROOT/.gradle"
export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:-} -Duser.home=$SUE_MOBILE_ROOT"
export ANDROID_SDK_ROOT="/Users/macbook/Library/Android/sdk"
export ANDROID_HOME="$ANDROID_SDK_ROOT"

mkdir -p "$GRADLE_USER_HOME" "$SUE_MOBILE_ROOT/Library/Application Support/kotlin"

source "$SUE_MOBILE_ROOT/use_local_flutter.sh" >/dev/null

flutter pub get
flutter build apk --release

if [[ -f "$SUE_MOBILE_ROOT/build/app/outputs/flutter-apk/app-release.apk" ]]; then
  cp "$SUE_MOBILE_ROOT/build/app/outputs/flutter-apk/app-release.apk" \
    "$SUE_MOBILE_ROOT/app-release.apk"
fi

echo ""
echo "Release APK created at:"
echo "$SUE_MOBILE_ROOT/app-release.apk"
