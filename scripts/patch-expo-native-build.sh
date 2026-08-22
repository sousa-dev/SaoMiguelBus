#!/usr/bin/env bash
# Patches Expo/RN native deps for local/CI builds. Re-run after npm install.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# --- @react-native/gradle-plugin (Gradle 9 + foojay 0.5.0) ---
RN_GRADLE_SETTINGS="${ROOT}/node_modules/@react-native/gradle-plugin/settings.gradle.kts"
if [[ -f "${RN_GRADLE_SETTINGS}" ]]; then
  sed -i.bak 's/foojay-resolver-convention").version("0.5.0")/foojay-resolver-convention").version("1.0.0")/' "${RN_GRADLE_SETTINGS}"
  rm -f "${RN_GRADLE_SETTINGS}.bak"
fi

# iOS-only patches below (BSD sed -i '').
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "patched Android native build (Gradle 9 foojay); skip iOS patches (non-macOS host)"
  exit 0
fi

# --- expo-modules-jsi (Swift 6) ---
JSI="${ROOT}/node_modules/expo-modules-jsi/apple"
if [[ -d "${JSI}/Sources" ]]; then
  find "${JSI}/Sources" -name '*.swift' -exec sed -i '' 's/weak let runtime/weak var runtime/g' {} +

  sed -i '' \
    -e 's/internal final class HostFunctionContext: Sendable/internal final class HostFunctionContext: @unchecked Sendable/' \
    "${JSI}/Sources/ExpoModulesJSI/Contexts/HostFunctionContext.swift"
  sed -i '' \
    -e 's/internal final class HostObjectContext: Sendable/internal final class HostObjectContext: @unchecked Sendable/' \
    "${JSI}/Sources/ExpoModulesJSI/Contexts/HostObjectContext.swift"
  sed -i '' \
    -e 's/public final class JavaScriptPropNameID: JavaScriptType/public final class JavaScriptPropNameID: @unchecked Sendable, JavaScriptType/' \
    "${JSI}/Sources/ExpoModulesJSI/Runtime/JavaScriptPropNameID.swift"
  sed -i '' \
    -e 's/public final class JavaScriptValue: JavaScriptType/public final class JavaScriptValue: @unchecked Sendable, JavaScriptType/' \
    "${JSI}/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptValue.swift"

  RUNTIME="${JSI}/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift"
  if grep -q 'wholeMatch(of: /^' "${RUNTIME}" 2>/dev/null; then
    sed -i '' 's|wholeMatch(of: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/)|wholeMatch(of: #/^[a-zA-Z_$][a-zA-Z0-9_$]*$/#)|' "${RUNTIME}"
  fi
fi

# --- expo-modules-core ---
CORE="${ROOT}/node_modules/expo-modules-core/ios"
if [[ -d "${CORE}" ]]; then
  # Upstream writes `weak let`, which is not valid Swift at all — `weak` requires
  # a mutable binding — so this rewrite is what makes the package compile.
  find "${CORE}" -name '*.swift' -exec sed -i '' 's/weak let /weak var /g' {} +

  # ...but the rewrite above trades one Swift 6 error for another wherever the
  # property lives in a class that declares `Sendable`: an immutable stored
  # property is fine there, a mutable one is rejected outright.
  #
  #   SharedObjectRegistry.swift:37: stored property 'appContext' of
  #   'Sendable'-conforming class 'SharedObjectRegistry' is mutable
  #
  # `@unchecked` is the same escape hatch this script already applies to the
  # equivalent classes in expo-modules-jsi above, and it is sound for the same
  # reason: the reference is only ever read on the JS thread that owns the
  # registry. Idempotent — re-running finds nothing left to change.
  REGISTRY="${CORE}/Core/SharedObjects/SharedObjectRegistry.swift"
  if [[ -f "${REGISTRY}" ]]; then
    sed -i '' 's/public final class SharedObjectRegistry: Sendable/public final class SharedObjectRegistry: @unchecked Sendable/' "${REGISTRY}"
  fi
fi

# --- expo-constants (quote script paths in podspec) ---
CONSTANTS="${ROOT}/node_modules/expo-constants/ios/EXConstants.podspec"
if [[ -f "${CONSTANTS}" ]]; then
  if ! grep -q 'get-app-config-ios.sh\\"' "${CONSTANTS}"; then
    sed -i '' 's|\$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"|\\"\$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"|' "${CONSTANTS}"
  fi
  if grep -q 'PROJECT_ROOT=#{ENV' "${CONSTANTS}" && ! grep -q 'PROJECT_ROOT=\\\\"' "${CONSTANTS}"; then
    sed -i '' 's|env_vars = ENV\['\''PROJECT_ROOT'\''\] ? "PROJECT_ROOT=#{ENV\['\''PROJECT_ROOT'\''\]} " : ""|env_vars = ENV['\''PROJECT_ROOT'\''] ? "PROJECT_ROOT=\\\"#{ENV['\''PROJECT_ROOT'\'']}\\\" " : ""|' "${CONSTANTS}"
  fi
fi

# --- ios/ (if generated) ---
if [[ -d "${ROOT}/ios" ]]; then
  node "${ROOT}/scripts/fix-ios-xcode-paths.mjs"
fi

echo "patched expo native build (Gradle 9 foojay + Swift 6 + path spaces)"
