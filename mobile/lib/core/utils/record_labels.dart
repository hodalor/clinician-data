const Map<String, String> sexLabels = {
  '1': '1 Male',
  '2': '2 Female',
  '9': '9 Not recorded',
};

const Map<String, String> referralLabels = {
  '0': '0 Direct',
  '1': '1 Referred',
  '9': '9 Unknown',
};

const Map<String, String> satsCategoryLabels = {
  '1': '1 Green',
  '2': '2 Yellow',
  '3': '3 Orange',
  '4': '4 Red',
};

const Map<String, String> outcome24Labels = {
  '1': '1 ED discharge',
  '2': '2 Ward',
  '3': '3 HDU / ICU',
  '4': '4 Death',
};

const Map<String, String> outcomeSourceLabels = {
  '1': '1 ED record',
  '2': '2 Patient file',
  '3': '3 Ward register',
  '4': '4 HDU / ICU register',
  '5': '5 Mortality record',
  '6': '6 Multiple sources',
};

const Map<String, String> complaintGroupLabels = {
  '1': '1 Trauma / injury',
  '2': '2 Cardiovascular / chest pain',
  '3': '3 Respiratory',
  '4': '4 Neurological',
  '5': '5 GI / abdominal',
  '6': '6 Infectious / fever',
  '7': '7 Obstetric / gynaecological',
  '8': '8 Endocrine / metabolic',
  '9': '9 Poisoning / toxicological',
  '10': '10 Other',
};

const Map<String, String> discriminatorTypeLabels = {
  '0': '0 No discriminator documented',
  '1': '1 Shock/uncontrolled haemorrhage',
  '2': '2 Chest pain/cardiovascular',
  '3': '3 Seizure/altered consciousness',
  '4': '4 Major trauma/fracture/dislocation',
  '5': '5 Penetrating injury',
  '6': '6 Burns',
  '7': '7 Poisoning/overdose',
  '8': '8 Hypoglycaemia',
  '9': '9 Hypertensive emergency',
  '10': '10 Respiratory distress/shortness of breath',
  '11': '11 Haemoptysis',
  '12': '12 Abdominal pain/trauma',
  '13': '13 Pregnancy-related emergency',
  '14': '14 Bradycardia',
  '15': '15 Controlled haemorrhage',
  '16': '16 Persistent vomiting',
  '17': '17 PV bleeding',
  '18': '18 Other documented discriminator',
};

String decodeLabel(Map<String, String> labels, String? value) {
  if (value == null || value.trim().isEmpty) {
    return 'Not entered';
  }

  return labels[value] ?? value;
}
