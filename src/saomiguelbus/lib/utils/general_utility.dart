import 'dart:developer' as developer;

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

String getDateText(DateTime date) {
  // Text to 'Today' and 'Tomorrow'
  DateTime now = DateTime.now();
  if (date.year == now.year && date.month == now.month && date.day == now.day) {
    return "Today"; //TODO: intl8
  }
  DateTime tomorrow = now.add(Duration(days: 1));
  if (date.year == tomorrow.year &&
      date.month == tomorrow.month &&
      date.day == tomorrow.day) {
    return "Tomorrow"; //TODO: intl8
  }
  return DateFormat('yyyy-MM-dd').format(date);
}

String getTimeText(TimeOfDay time) {
  // 'Now' for current time
  DateTime now = DateTime.now();
  if (time.hour == now.hour && time.minute == now.minute) {
    return "Now"; //TODO: intl8
  }
  return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
}

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
