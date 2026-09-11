class RemoteRecordSummary {
  const RemoteRecordSummary({
    required this.id,
    required this.studyId,
    required this.status,
    this.extractorId,
    this.extractorName,
    this.updatedAt,
    this.dataQuality = const {},
    this.duplicateFlags = const [],
  });

  final String id;
  final String studyId;
  final String status;
  final String? extractorId;
  final String? extractorName;
  final DateTime? updatedAt;
  final Map<String, dynamic> dataQuality;
  final List<dynamic> duplicateFlags;

  factory RemoteRecordSummary.fromJson(Map<String, dynamic> json) {
    return RemoteRecordSummary(
      id: json['_id'] as String? ?? '',
      studyId: json['study_id'] as String? ?? '',
      status: json['status'] as String? ?? '',
      extractorId: json['extractor_id']?.toString(),
      extractorName: json['extractor_name']?.toString(),
      updatedAt: json['updated_at'] is String
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
      dataQuality: (json['data_quality'] as Map<String, dynamic>?) ?? const {},
      duplicateFlags: (json['duplicate_flags'] as List?) ?? const [],
    );
  }
}

class QcComparisonResult {
  const QcComparisonResult({
    required this.agreementPct,
    required this.discrepancies,
    required this.comparisons,
  });

  final double agreementPct;
  final List<String> discrepancies;
  final List<QcComparisonRow> comparisons;

  factory QcComparisonResult.fromJson(Map<String, dynamic> json) {
    return QcComparisonResult(
      agreementPct: (json['agreement_pct'] as num?)?.toDouble() ?? 0,
      discrepancies: ((json['discrepancies'] as List?) ?? const [])
          .map((item) => item.toString())
          .toList(growable: false),
      comparisons: ((json['comparisons'] as List?) ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(QcComparisonRow.fromJson)
          .toList(growable: false),
    );
  }
}

class QcComparisonRow {
  const QcComparisonRow({
    required this.field,
    required this.raValue,
    required this.qcValue,
    required this.matches,
    required this.valueType,
  });

  final String field;
  final Object? raValue;
  final Object? qcValue;
  final bool matches;
  final String valueType;

  factory QcComparisonRow.fromJson(Map<String, dynamic> json) {
    return QcComparisonRow(
      field: json['field'] as String? ?? '',
      raValue: json['ra_value'],
      qcValue: json['qc_value'],
      matches: json['matches'] == true,
      valueType: json['value_type'] as String? ?? 'other',
    );
  }
}
