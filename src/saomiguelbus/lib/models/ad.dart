import 'dart:convert';

class BannerAd {
  final int? id;
  final String? entity;
  final String? description;
  final String? media;
  final DateTime? start;
  final DateTime? end;
  final String? action;
  final String? target;
  final String? advertiseOn;
  final String? platform;
  final String? status;
  final int? seen;
  final int? clicked;

  BannerAd({
    required this.id,
    required this.entity,
    required this.description,
    required this.media,
    required this.start,
    required this.end,
    required this.action,
    required this.target,
    required this.advertiseOn,
    required this.platform,
    required this.status,
    required this.seen,
    required this.clicked,
  });

  factory BannerAd.fromJson(Map<String, dynamic> json) {
    return BannerAd(
      id: json['id'],
      entity: json['entity'],
      description: json['description'],
      media: json['media'],
      start: DateTime.parse(json['start']),
      end: DateTime.parse(json['end']),
      action: json['action'],
      target: json['target'],
      advertiseOn: json['advertise_on'],
      platform: json['platform'],
      status: json['status'],
      seen: json['seen'],
      clicked: json['clicked'],
    );
  }

  @override
  String toString() {
    return jsonEncode({
      'id': id,
      'entity': entity,
      'description': description,
      'media': media,
      'start': start?.toIso8601String(),
      'end': end?.toIso8601String(),
      'action': action,
      'target': target,
      'advertise_on': advertiseOn,
      'platform': platform,
      'status': status,
      'seen': seen,
      'clicked': clicked,
    });
  }
}
