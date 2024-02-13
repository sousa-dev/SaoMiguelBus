import 'dart:developer' as developer;

String formatDurationToReadableText(Duration? duration) {
  // Calculate days, hours, and minutes
  if (duration == null) {
    return "0 minutes";
  }
  int days = duration.inDays;
  int hours = duration.inHours - (days * 24);
  int minutes = duration.inMinutes - (days * 24 * 60) - (hours * 60);

  // Build the readable string TODO: Do it with int8l
  String result = "";
  if (days > 0) {
    result += "$days day${days > 1 ? 's' : ''}, ";
  }
  if (hours > 0) {
    result += "$hours hour${hours > 1 ? 's' : ''}, ";
  }
  if (minutes > 0) {
    result += "$minutes minute${minutes > 1 ? 's' : ''}";
  }
  // Remove trailing comma if present
  if (result.endsWith(', ')) {
    result = result.substring(0, result.length - 2);
  }
  // Handle case where duration might be less than a minute
  if (result.isEmpty) {
    result = "0 minutes";
  }
  // Replace the last comma with 'and' for grammatical correctness
  if (result.contains(',')) {
    result = result.replaceRange(
        result.lastIndexOf(','), result.lastIndexOf(',') + 1, ' and');
  }
  return result;
}
