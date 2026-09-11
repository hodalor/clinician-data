#!/bin/zsh

# Load the project-local Flutter SDK and keep Flutter config inside this folder
# so older macOS machines and restricted home directories do not block startup.

export SUE_MOBILE_ROOT="$(cd "$(dirname "$0")" && pwd)"
export FLUTTER_ROOT="$SUE_MOBILE_ROOT/.flutter-sdk"
export XDG_CONFIG_HOME="$SUE_MOBILE_ROOT/.config"
export PATH="$FLUTTER_ROOT/bin:$FLUTTER_ROOT/bin/cache/dart-sdk/bin:$PATH"

echo "Local Flutter SDK loaded from: $FLUTTER_ROOT"
echo "Local Flutter config dir: $XDG_CONFIG_HOME"
echo "You can now run: flutter run"
