class ActiveAssignment {
  const ActiveAssignment({
    required this.hasActiveAssignment,
    this.assignment,
  });

  final bool hasActiveAssignment;
  final AssignmentDetail? assignment;

  factory ActiveAssignment.fromJson(Map<String, dynamic> json) {
    final assignmentJson = json['assignment'];
    return ActiveAssignment(
      hasActiveAssignment: json['has_active_assignment'] == true,
      assignment: assignmentJson is Map<String, dynamic>
          ? AssignmentDetail.fromJson(assignmentJson)
          : null,
    );
  }
}

class AssignmentDetail {
  const AssignmentDetail({
    required this.id,
    required this.from,
    required this.to,
    required this.status,
    this.registerPages = const <String>[],
    this.fileRanges = const <String>[],
  });

  final String id;
  final DateTime from;
  final DateTime to;
  final String status;
  final List<String> registerPages;
  final List<String> fileRanges;

  factory AssignmentDetail.fromJson(Map<String, dynamic> json) {
    final dateRange = json['date_range'] as Map<String, dynamic>? ?? const {};
    return AssignmentDetail(
      id: json['id'] as String,
      from: DateTime.parse(dateRange['from'] as String),
      to: DateTime.parse(dateRange['to'] as String),
      status: json['status'] as String? ?? '',
      registerPages: ((json['register_pages'] as List?) ?? const [])
          .map((item) => item.toString())
          .toList(growable: false),
      fileRanges: ((json['file_ranges'] as List?) ?? const [])
          .map((item) => item.toString())
          .toList(growable: false),
    );
  }
}
