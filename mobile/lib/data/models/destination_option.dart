class DestinationOption {
  const DestinationOption({
    required this.code,
    required this.label,
  });

  final String code;
  final String label;

  Map<String, dynamic> toJson() => {
        'code': code,
        'label': label,
      };

  factory DestinationOption.fromJson(Map<String, dynamic> json) {
    return DestinationOption(
      code: (json['code'] ?? json['value'] ?? '').toString(),
      label: (json['label'] ?? json['name'] ?? json['code'] ?? '').toString(),
    );
  }
}
