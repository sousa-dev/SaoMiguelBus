
import 'dart:math';

int levenshteinDistance(String s, String t) {
  if (s == t) {
    return 0;
  }
  if (s.isEmpty) {
    return t.length;
  }
  if (t.isEmpty) {
    return s.length;
  }

  List<int> v0 = List<int>.filled(t.length + 1, 0);
  List<int> v1 = List<int>.filled(t.length + 1, 0);

  for (int i = 0; i < v0.length; i++) {
    v0[i] = i;
  }

  for (int i = 0; i < s.length; i++) {
    v1[0] = i + 1;

    for (int j = 0; j < t.length; j++) {
      int cost = (s[i] == t[j]) ? 0 : 1;
      v1[j + 1] = [
        v1[j] + 1,
        v0[j + 1] + 1,
        v0[j] + cost,
      ].reduce((min));
    }

    for (int j = 0; j < v0.length; j++) {
      v0[j] = v1[j];
    }
  }

  return v1[t.length];
}
