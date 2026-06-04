#!/usr/bin/env bash
# Patches Expo/RN iOS deps for Xcode 26 (Swift 6) and paths with spaces. Re-run after npm install.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

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
  find "${CORE}" -name '*.swift' -exec sed -i '' 's/weak let /weak var /g' {} +
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

echo "patched expo native iOS build (Swift 6 + path spaces)"
