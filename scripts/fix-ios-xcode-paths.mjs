#!/usr/bin/env node
/**
 * Fixes ios/*.pbxproj bundle script + .xcode.env.local for project paths with spaces.
 * Safe to run after `expo prebuild` or when ios/ already exists.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iosDir = path.join(root, 'ios');

const BUNDLE_SCRIPT_OLD =
  '`\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\"`\\n\\n';

const BUNDLE_SCRIPT_NEW =
  'RN_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\")\\"\\n/bin/sh \\"$RN_XCODE_SCRIPT\\"\\n\\n';

function findPbxproj() {
  if (!fs.existsSync(iosDir)) return null;
  for (const name of fs.readdirSync(iosDir)) {
    if (name.endsWith('.xcodeproj')) {
      return path.join(iosDir, name, 'project.pbxproj');
    }
  }
  return null;
}

const pbxPath = findPbxproj();
if (pbxPath) {
  let contents = fs.readFileSync(pbxPath, 'utf8');
  if (!contents.includes('RN_XCODE_SCRIPT') && contents.includes(BUNDLE_SCRIPT_OLD)) {
    contents = contents.replace(BUNDLE_SCRIPT_OLD, BUNDLE_SCRIPT_NEW);
    fs.writeFileSync(pbxPath, contents);
    console.log('fixed Bundle React Native script in', path.basename(pbxPath));
  }
}

if (fs.existsSync(iosDir)) {
  const envLocal = path.join(iosDir, '.xcode.env.local');
  fs.writeFileSync(
    envLocal,
    [
      '# Required when the repo path contains spaces (e.g. "Sousa Dev").',
      `export NODE_BINARY="${process.execPath}"`,
      `export PROJECT_ROOT="${root}"`,
      '',
    ].join('\n'),
  );
  console.log('wrote', path.relative(root, envLocal));
}
