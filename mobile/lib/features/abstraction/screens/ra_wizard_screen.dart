import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/utils/record_constants.dart';
import '../../../core/utils/record_labels.dart';
import '../../../data/local/app_database.dart';
import '../../../data/models/destination_option.dart';
import '../../dashboard/providers/dashboard_providers.dart';
import '../../qc/screens/qc_compare_screen.dart';
import '../models/ra_record_draft.dart';
import '../providers/abstraction_providers.dart';
import '../utils/record_payload_mapper.dart';
import '../utils/wizard_validation.dart';

enum AbstractionFlowMode { ra, qc }

class AbstractionWizardRouteArgs {
  const AbstractionWizardRouteArgs.ra({this.recordId})
      : mode = AbstractionFlowMode.ra,
        remoteRecordId = null;

  const AbstractionWizardRouteArgs.qc({required this.remoteRecordId})
      : mode = AbstractionFlowMode.qc,
        recordId = null;

  final AbstractionFlowMode mode;
  final int? recordId;
  final String? remoteRecordId;
}

class RaWizardScreen extends ConsumerStatefulWidget {
  const RaWizardScreen({
    super.key,
    this.recordId,
    this.mode = AbstractionFlowMode.ra,
    this.remoteRecordId,
  });

  final int? recordId;
  final AbstractionFlowMode mode;
  final String? remoteRecordId;

  @override
  ConsumerState<RaWizardScreen> createState() => _RaWizardScreenState();
}

class _RaWizardScreenState extends ConsumerState<RaWizardScreen> {
  final _studyIdController = TextEditingController();
  final _exclusionReasonController = TextEditingController();
  final _otherComorbTextController = TextEditingController();
  final _chiefComplaintController = TextEditingController();
  final _manualDestinationController = TextEditingController();

  RaRecordDraft _draft = const RaRecordDraft();
  int _currentStepIndex = 0;
  bool _isLoading = false;
  bool _isSaving = false;
  StepValidationResult _validationResult = const StepValidationResult();
  final Set<WizardStep> _acknowledgedWarnings = <WizardStep>{};

  @override
  void initState() {
    super.initState();
    _loadExistingDraft();
  }

  @override
  void dispose() {
    _studyIdController.dispose();
    _exclusionReasonController.dispose();
    _otherComorbTextController.dispose();
    _chiefComplaintController.dispose();
    _manualDestinationController.dispose();
    super.dispose();
  }

  Future<void> _loadExistingDraft() async {
    if (widget.mode != AbstractionFlowMode.ra || widget.recordId == null) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    final bundle = await ref
        .read(draftRepositoryProvider)
        .getDraftBundle(widget.recordId!);

    if (!mounted) {
      return;
    }

    if (bundle != null) {
      _applyDraft(RaRecordDraft.fromBundle(bundle));
    }

    setState(() {
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final destinationsAsync = ref.watch(approvedDestinationsProvider);
    final steps = _visibleSteps;
    final currentStep = steps[_currentStepIndex];
    final sectionNumber = _currentStepIndex + 1;
    final totalSections = steps.length - 1;

    return Scaffold(
      appBar: AppBar(
        title: Text(currentStep == WizardStep.review
            ? widget.mode == AbstractionFlowMode.qc
                ? 'Review & Submit'
                : 'Review & Save'
            : 'Section ${_stepLetter(currentStep)} of $totalSections'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Column(
                children: [
                  LinearProgressIndicator(
                    value: currentStep == WizardStep.review
                        ? 1
                        : sectionNumber / totalSections,
                    minHeight: 8,
                  ),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (currentStep != WizardStep.review)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Text(
                              'Section ${_stepLetter(currentStep)} of $totalSections',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                        if (_validationResult.hasHardErrors)
                          _ValidationBanner(
                            color: const Color(0xFFFFEBEE),
                            borderColor: const Color(0xFFD32F2F),
                            title: 'Please fix these before continuing',
                            messages: _validationResult.hardErrors,
                          ),
                        if (_validationResult.hasSoftWarnings)
                          _ValidationBanner(
                            color: const Color(0xFFFFF8E1),
                            borderColor: const Color(0xFFE0A84F),
                            title: 'Please review these warnings',
                            messages: _validationResult.softWarnings,
                            actionLabel:
                                _acknowledgedWarnings.contains(currentStep)
                                    ? 'Warnings acknowledged'
                                    : 'Acknowledge warnings',
                            onAction: _acknowledgedWarnings
                                    .contains(currentStep)
                                ? null
                                : () {
                                    setState(() {
                                      _acknowledgedWarnings.add(currentStep);
                                    });
                                  },
                          ),
                        _buildStepContent(
                          context: context,
                          step: currentStep,
                          destinationsAsync: destinationsAsync,
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _currentStepIndex == 0
                                ? () => Navigator.of(context).pop()
                                : _goBack,
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(54),
                            ),
                            child: Text(
                              _currentStepIndex == 0 ? 'Close' : 'Back',
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FilledButton(
                            onPressed: _isSaving
                                ? null
                                : currentStep == WizardStep.review
                                    ? _completeReviewAction
                                    : _goNext,
                            style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(54),
                            ),
                            child: Text(
                              _isSaving
                                  ? 'Saving...'
                                  : currentStep == WizardStep.review
                                      ? widget.mode == AbstractionFlowMode.qc
                                          ? 'Submit QC entry'
                                          : 'Save record'
                                      : 'Next',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  List<WizardStep> get _visibleSteps {
    if (_draft.skipsClinicalSections) {
      return const [WizardStep.eligibility, WizardStep.review];
    }

    return const [
      WizardStep.eligibility,
      WizardStep.patient,
      WizardStep.sats,
      WizardStep.physiology,
      WizardStep.presentation,
      WizardStep.destination,
      WizardStep.process,
      WizardStep.outcome,
      WizardStep.review,
    ];
  }

  Widget _buildStepContent({
    required BuildContext context,
    required WizardStep step,
    required AsyncValue<List<DestinationOption>> destinationsAsync,
  }) {
    switch (step) {
      case WizardStep.eligibility:
        return _buildEligibilityStep(context);
      case WizardStep.patient:
        return _buildPatientStep();
      case WizardStep.sats:
        return _buildSatsStep();
      case WizardStep.physiology:
        return _buildPhysiologyStep();
      case WizardStep.presentation:
        return _buildPresentationStep();
      case WizardStep.destination:
        return _buildDestinationStep(destinationsAsync);
      case WizardStep.process:
        return _buildProcessStep();
      case WizardStep.outcome:
        return _buildOutcomeStep();
      case WizardStep.review:
        return _buildReviewStep();
    }
  }

  Widget _buildEligibilityStep(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _QuestionCard(
          title: 'Study ID',
          variableName: 'study_id',
          child: _LargeTextFormField(
            controller: _studyIdController,
            hintText: 'Enter the study ID',
            onChanged: (value) => _updateDraft(_draft.copyWith(studyId: value)),
          ),
        ),
        _QuestionCard(
          title: 'ED presentation date',
          variableName: 'eligibility.ed_date',
          child: _PickerButton(
            label: _draft.edDate == null
                ? 'Choose date'
                : DateFormat('dd MMM yyyy').format(_draft.edDate!),
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _draft.edDate ?? DateTime.now(),
                firstDate: DateTime(2020),
                lastDate: DateTime(2100),
              );
              if (picked != null) {
                _updateDraft(_draft.copyWith(edDate: picked));
              }
            },
          ),
        ),
        _QuestionCard(
          title: 'ED presentation time',
          variableName: 'eligibility.ed_time',
          child: _TimePickerField(
            value: _draft.edTime,
            onChanged: (value) => _updateDraft(_draft.copyWith(edTime: value)),
          ),
        ),
        _QuestionCard(
          title: 'Triage time',
          variableName: 'eligibility.triage_time',
          child: _TimePickerField(
            value: _draft.triageTime,
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(triageTime: value)),
          ),
        ),
        _QuestionCard(
          title: 'Age in years',
          variableName: 'eligibility.age',
          child: _LargeTextFormField(
            hintText: 'Enter age',
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            initialValue: _draft.age?.toString(),
            onChanged: (value) => _updateDraft(
              _draft.copyWith(age: int.tryParse(value)),
            ),
          ),
        ),
        _QuestionCard(
          title: 'Was this patient eligible?',
          variableName: 'eligibility.eligible',
          child: _BooleanChoiceField(
            value: _draft.eligible,
            onChanged: (value) => _updateDraft(
              _draft.copyWith(
                eligible: value,
                exclusionCode: value == true ? null : _draft.exclusionCode,
                exclusionReason: value == true ? null : _draft.exclusionReason,
              ),
            ),
          ),
        ),
        if (_draft.eligible == false) ...[
          _QuestionCard(
            title: 'Why was this patient excluded?',
            variableName: 'eligibility.exclusion_code',
            child: _LargeDropdownField<String>(
              value: _draft.exclusionCode,
              hintText: 'Choose exclusion code',
              items: const [
                DropdownMenuItem(value: '1', child: Text('1 Age under 16')),
                DropdownMenuItem(
                    value: '2', child: Text('2 Dead on arrival / Blue')),
                DropdownMenuItem(
                    value: '3', child: Text('3 SATS category missing')),
                DropdownMenuItem(
                    value: '4', child: Text('4 24h outcome indeterminable')),
                DropdownMenuItem(
                    value: '5',
                    child: Text('5 Transfer prevents outcome ascertainment')),
                DropdownMenuItem(value: '9', child: Text('9 Other')),
              ],
              onChanged: (value) =>
                  _updateDraft(_draft.copyWith(exclusionCode: value)),
            ),
          ),
          if (_draft.exclusionCode == '9')
            _QuestionCard(
              title: 'Other exclusion detail',
              variableName: 'eligibility.exclusion_reason',
              child: _LargeTextFormField(
                controller: _exclusionReasonController,
                hintText: 'Describe the exclusion reason',
                maxLines: 3,
                onChanged: (value) =>
                    _updateDraft(_draft.copyWith(exclusionReason: value)),
              ),
            ),
        ],
      ],
    );
  }

  Widget _buildPatientStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _QuestionCard(
          title: 'Sex',
          variableName: 'patient.sex',
          child: _LargeDropdownField<String>(
            value: _draft.sex,
            hintText: 'Choose sex',
            items: const [
              DropdownMenuItem(value: '1', child: Text('Male')),
              DropdownMenuItem(value: '2', child: Text('Female')),
              DropdownMenuItem(value: '9', child: Text('Not recorded')),
            ],
            onChanged: (value) => _updateDraft(
              _draft.copyWith(
                sex: value,
                pregTest: value == '1' ? null : _draft.pregTest,
              ),
            ),
          ),
        ),
        _QuestionCard(
          title: 'Referral status',
          variableName: 'patient.referral',
          child: _LargeDropdownField<String>(
            value: _draft.referral,
            hintText: 'Choose referral status',
            items: const [
              DropdownMenuItem(value: '0', child: Text('0 Direct')),
              DropdownMenuItem(value: '1', child: Text('1 Referred')),
              DropdownMenuItem(value: '9', child: Text('9 Unknown')),
            ],
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(referral: value)),
          ),
        ),
        _buildBooleanClinicalCard(
          title: 'Diabetes mellitus',
          variableName: 'patient.comorbidities.dm',
          value: _draft.dm,
          onChanged: (value) => _updateDraft(_draft.copyWith(dm: value)),
        ),
        _buildBooleanClinicalCard(
          title: 'Hypertension',
          variableName: 'patient.comorbidities.htn',
          value: _draft.htn,
          onChanged: (value) => _updateDraft(_draft.copyWith(htn: value)),
        ),
        _buildBooleanClinicalCard(
          title: 'Asthma',
          variableName: 'patient.comorbidities.asthma',
          value: _draft.asthma,
          onChanged: (value) => _updateDraft(_draft.copyWith(asthma: value)),
        ),
        _buildBooleanClinicalCard(
          title: 'Epilepsy',
          variableName: 'patient.comorbidities.epilepsy',
          value: _draft.epilepsy,
          onChanged: (value) => _updateDraft(_draft.copyWith(epilepsy: value)),
        ),
        _buildBooleanClinicalCard(
          title: 'HIV',
          variableName: 'patient.comorbidities.rvd',
          value: _draft.rvd,
          onChanged: (value) => _updateDraft(_draft.copyWith(rvd: value)),
        ),
        _buildBooleanClinicalCard(
          title: 'Other comorbidity',
          variableName: 'patient.comorbidities.other',
          value: _draft.otherComorb,
          onChanged: (value) =>
              _updateDraft(_draft.copyWith(otherComorb: value)),
        ),
        if (_draft.otherComorb == true)
          _QuestionCard(
            title: 'Other comorbidity detail',
            variableName: 'patient.comorbidities.other_text',
            child: _LargeTextFormField(
              controller: _otherComorbTextController,
              hintText: 'Describe the other comorbidity',
              onChanged: (value) =>
                  _updateDraft(_draft.copyWith(otherComorbText: value)),
            ),
          ),
        _QuestionCard(
          title: 'Any comorbidity',
          variableName: 'patient.comorb_any',
          child: Text(
            _draft.comorbAny == '1'
                ? 'Derived as Yes from the answers above.'
                : _draft.comorbAny == '0'
                    ? 'Derived as No from the answers above.'
                    : 'This will be derived when comorbidity answers are entered.',
          ),
        ),
        _QuestionCard(
          title: 'Pregnancy test',
          variableName: 'patient.preg_test',
          helperText: _draft.sex == '1'
              ? 'Pregnancy status can only be entered for Female or Not recorded.'
              : null,
          child: _LargeDropdownField<String>(
            value: _draft.sex == '1' ? null : _draft.pregTest,
            hintText: _draft.sex == '1'
                ? 'Not available when Male is selected'
                : 'Choose pregnancy test result',
            items: const [
              DropdownMenuItem(value: '0', child: Text('Negative')),
              DropdownMenuItem(value: '1', child: Text('Positive')),
              DropdownMenuItem(value: '8', child: Text('Not done / N-A')),
              DropdownMenuItem(value: '9', child: Text('Not recorded')),
            ],
            enabled: _draft.sex != '1',
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(pregTest: value)),
          ),
        ),
      ],
    );
  }

  Widget _buildSatsStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _QuestionCard(
          title: 'SATS category',
          variableName: 'sats.sats_cat',
          child: _LargeDropdownField<String>(
            value: _draft.satsCat,
            hintText: 'Choose SATS category',
            items: const [
              DropdownMenuItem(value: '1', child: Text('1 Green')),
              DropdownMenuItem(value: '2', child: Text('2 Yellow')),
              DropdownMenuItem(value: '3', child: Text('3 Orange')),
              DropdownMenuItem(value: '4', child: Text('4 Red')),
            ],
            onChanged: (value) => _updateDraft(_draft.copyWith(satsCat: value)),
          ),
        ),
        _QuestionCard(
          title: 'TEWS total',
          variableName: 'sats.tews_total',
          child: _LargeTextFormField(
            hintText: 'Enter TEWS total',
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            initialValue: _draft.tewsTotal?.toString(),
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(tewsTotal: int.tryParse(value))),
          ),
        ),
        _QuestionCard(
          title: 'Was a discriminator documented?',
          variableName: 'sats.discriminator_yes',
          child: _BooleanChoiceField(
            value: _draft.discriminatorYes,
            onChanged: (value) => _updateDraft(
              _draft.copyWith(
                discriminatorYes: value,
                discriminatorType:
                    value == true ? _draft.discriminatorType : '0',
              ),
            ),
          ),
        ),
        if (_draft.discriminatorYes == true)
          _QuestionCard(
            title: 'Discriminator type',
            variableName: 'sats.discriminator_type',
            child: _LargeDropdownField<String>(
              value: _draft.discriminatorType,
              hintText: 'Choose discriminator type',
              items: discriminatorTypeCodes
                  .map(
                    (code) => DropdownMenuItem(
                      value: code,
                      child: Text(_discriminatorLabel(code)),
                    ),
                  )
                  .toList(growable: false),
              onChanged: (value) =>
                  _updateDraft(_draft.copyWith(discriminatorType: value)),
            ),
          ),
        _QuestionCard(
          title: 'Was the SATS documentation complete?',
          variableName: 'sats.documentation_complete',
          child: _BooleanChoiceField(
            value: _draft.documentationComplete,
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(documentationComplete: value)),
          ),
        ),
      ],
    );
  }

  Widget _buildPhysiologyStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Padding(
          padding: EdgeInsets.only(bottom: 8),
          child: Text(
            'Leave a field blank if it was not recorded. Do not enter 0 as a placeholder.',
          ),
        ),
        _numericQuestion(
          title: 'Temperature',
          variable: 'physiology.temp',
          initialValue: _draft.temp?.toString(),
          onChanged: (value) =>
              _updateDraft(_draft.copyWith(temp: double.tryParse(value))),
        ),
        _numericQuestion(
          title: 'Heart rate',
          variable: 'physiology.hr',
          initialValue: _draft.hr?.toString(),
          integerOnly: true,
          onChanged: (value) =>
              _updateDraft(_draft.copyWith(hr: int.tryParse(value))),
        ),
        _numericQuestion(
          title: 'Respiratory rate',
          variable: 'physiology.rr',
          initialValue: _draft.rr?.toString(),
          integerOnly: true,
          onChanged: (value) =>
              _updateDraft(_draft.copyWith(rr: int.tryParse(value))),
        ),
        _numericQuestion(
          title: 'Systolic blood pressure',
          variable: 'physiology.sbp',
          initialValue: _draft.sbp?.toString(),
          integerOnly: true,
          onChanged: (value) =>
              _updateDraft(_draft.copyWith(sbp: int.tryParse(value))),
        ),
        _numericQuestion(
          title: 'Diastolic blood pressure',
          variable: 'physiology.dbp',
          initialValue: _draft.dbp?.toString(),
          integerOnly: true,
          onChanged: (value) =>
              _updateDraft(_draft.copyWith(dbp: int.tryParse(value))),
        ),
        _numericQuestion(
          title: 'Oxygen saturation',
          variable: 'physiology.spo2',
          initialValue: _draft.spo2?.toString(),
          onChanged: (value) =>
              _updateDraft(_draft.copyWith(spo2: double.tryParse(value))),
        ),
        _numericQuestion(
          title: 'Random blood sugar',
          variable: 'physiology.rbs',
          initialValue: _draft.rbs?.toString(),
          onChanged: (value) =>
              _updateDraft(_draft.copyWith(rbs: double.tryParse(value))),
        ),
        _QuestionCard(
          title: 'Mobility',
          variableName: 'physiology.mobility',
          child: _LargeDropdownField<String>(
            value: _draft.mobility,
            hintText: 'Choose mobility',
            items: const [
              DropdownMenuItem(value: '0', child: Text('Walking')),
              DropdownMenuItem(
                  value: '1', child: Text('Wheelchair / assisted')),
              DropdownMenuItem(value: '2', child: Text('Stretcher / bed')),
              DropdownMenuItem(value: '9', child: Text('Not recorded')),
            ],
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(mobility: value)),
          ),
        ),
        _QuestionCard(
          title: 'AVPU',
          variableName: 'physiology.avpu',
          child: _LargeDropdownField<String>(
            value: _draft.avpu,
            hintText: 'Choose AVPU level',
            items: const [
              DropdownMenuItem(value: '0', child: Text('Alert')),
              DropdownMenuItem(value: '1', child: Text('Voice')),
              DropdownMenuItem(value: '2', child: Text('Pain')),
              DropdownMenuItem(value: '3', child: Text('Unresponsive')),
              DropdownMenuItem(value: '9', child: Text('Not recorded')),
            ],
            onChanged: (value) => _updateDraft(_draft.copyWith(avpu: value)),
          ),
        ),
        _QuestionCard(
          title: 'Trauma',
          variableName: 'physiology.trauma',
          child: _LargeDropdownField<String>(
            value: _draft.trauma,
            hintText: 'Choose trauma status',
            items: const [
              DropdownMenuItem(value: '1', child: Text('Yes')),
              DropdownMenuItem(value: '0', child: Text('No')),
              DropdownMenuItem(value: '9', child: Text('Not recorded')),
            ],
            onChanged: (value) => _updateDraft(_draft.copyWith(trauma: value)),
          ),
        ),
      ],
    );
  }

  Widget _buildPresentationStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _QuestionCard(
          title: 'Chief complaint in the source record',
          variableName: 'presentation.chief_complaint_verbatim',
          child: _LargeTextFormField(
            controller: _chiefComplaintController,
            hintText: 'Type the complaint exactly as written',
            maxLines: 4,
            onChanged: (value) => _updateDraft(
              _draft.copyWith(chiefComplaintVerbatim: value),
            ),
          ),
        ),
        _QuestionCard(
          title: 'Complaint group',
          variableName: 'presentation.complaint_group',
          child: _LargeDropdownField<String>(
            value: _draft.complaintGroup,
            hintText: 'Choose complaint group',
            items: const [
              DropdownMenuItem(value: '1', child: Text('Trauma / injury')),
              DropdownMenuItem(
                  value: '2', child: Text('Cardiovascular / chest pain')),
              DropdownMenuItem(value: '3', child: Text('Respiratory')),
              DropdownMenuItem(value: '4', child: Text('Neurological')),
              DropdownMenuItem(value: '5', child: Text('GI / abdominal')),
              DropdownMenuItem(value: '6', child: Text('Infectious / fever')),
              DropdownMenuItem(
                  value: '7', child: Text('Obstetric / gynaecological')),
              DropdownMenuItem(
                  value: '8', child: Text('Endocrine / metabolic')),
              DropdownMenuItem(
                  value: '9', child: Text('Poisoning / toxicological')),
              DropdownMenuItem(value: '10', child: Text('Other')),
            ],
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(complaintGroup: value)),
          ),
        ),
        _QuestionCard(
          title: 'Were there multiple complaints?',
          variableName: 'presentation.multiple_complaints',
          child: _BooleanChoiceField(
            value: _draft.multipleComplaints,
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(multipleComplaints: value)),
          ),
        ),
      ],
    );
  }

  Widget _buildDestinationStep(
    AsyncValue<List<DestinationOption>> destinationsAsync,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _QuestionCard(
          title: 'Immediate destination',
          variableName: 'initial_destination',
          child: destinationsAsync.when(
            data: (destinations) {
              if (destinations.isEmpty) {
                return _buildManualDestinationFallback();
              }

              return _LargeDropdownField<String>(
                value: _draft.initialDestination,
                hintText: 'Choose immediate destination',
                items: destinations
                    .map(
                      (option) => DropdownMenuItem<String>(
                        value: option.code,
                        child: Text('${option.code} ${option.label}'),
                      ),
                    )
                    .toList(growable: false),
                onChanged: (value) =>
                    _updateDraft(_draft.copyWith(initialDestination: value)),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => _buildManualDestinationFallback(),
          ),
        ),
      ],
    );
  }

  Widget _buildProcessStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Padding(
          padding: EdgeInsets.only(bottom: 8),
          child: Text(
            'Only enter these times if they are actually written in the source record. Do not enter the printed SATS target time here.',
          ),
        ),
        _QuestionCard(
          title: 'Clinician time',
          variableName: 'process.clinician_time',
          child: _TimePickerField(
            value: _draft.clinicianTime,
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(clinicianTime: value)),
          ),
        ),
        _QuestionCard(
          title: 'Treatment time',
          variableName: 'process.treatment_time',
          child: _TimePickerField(
            value: _draft.treatmentTime,
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(treatmentTime: value)),
          ),
        ),
      ],
    );
  }

  Widget _buildOutcomeStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _QuestionCard(
          title: '24-hour outcome',
          variableName: 'outcome24',
          helperText:
              'Use the most severe outcome in this hierarchy: Death > HDU/ICU > Ward > Discharge.',
          child: _LargeDropdownField<String>(
            value: _draft.outcome24,
            hintText: 'Choose 24-hour outcome',
            items: const [
              DropdownMenuItem(value: '4', child: Text('4 Death')),
              DropdownMenuItem(value: '3', child: Text('3 HDU / ICU')),
              DropdownMenuItem(value: '2', child: Text('2 Ward')),
              DropdownMenuItem(value: '1', child: Text('1 ED discharge')),
            ],
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(outcome24: value)),
          ),
        ),
        _QuestionCard(
          title: 'Outcome date and time',
          variableName: 'outcome_datetime',
          child: _DateTimePickerField(
            value: _draft.outcomeDatetime,
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(outcomeDatetime: value)),
          ),
        ),
        _QuestionCard(
          title: 'Outcome source',
          variableName: 'outcome_source',
          child: _LargeDropdownField<String>(
            value: _draft.outcomeSource,
            hintText: 'Choose outcome source',
            items: const [
              DropdownMenuItem(value: '1', child: Text('ED record')),
              DropdownMenuItem(value: '2', child: Text('Patient file')),
              DropdownMenuItem(value: '3', child: Text('Ward register')),
              DropdownMenuItem(value: '4', child: Text('HDU / ICU register')),
              DropdownMenuItem(value: '5', child: Text('Mortality record')),
              DropdownMenuItem(value: '6', child: Text('Multiple sources')),
            ],
            onChanged: (value) =>
                _updateDraft(_draft.copyWith(outcomeSource: value)),
          ),
        ),
      ],
    );
  }

  Widget _buildReviewStep() {
    final statusOptions = _draft.skipsClinicalSections
        ? const ['Draft', 'Excluded', 'Pending Sync']
        : const [
            'Draft',
            'Clinical Data Complete - Outcome Pending',
            'Complete',
            'Pending Sync',
            'Sync Failed',
            'Returned for Correction',
          ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _ReviewCard(
          title: 'Eligibility',
          summary:
              'Study ID: ${_draft.studyId.isEmpty ? 'Not entered' : _draft.studyId}',
          onEdit: () => _jumpToStep(WizardStep.eligibility),
        ),
        if (!_draft.skipsClinicalSections) ...[
          _ReviewCard(
            title: 'Patient characteristics',
            summary:
                'Sex: ${decodeLabel(sexLabels, _draft.sex)} | Referral: ${decodeLabel(referralLabels, _draft.referral)}',
            onEdit: () => _jumpToStep(WizardStep.patient),
          ),
          _ReviewCard(
            title: 'SATS / TEWS',
            summary:
                'SATS: ${decodeLabel(satsCategoryLabels, _draft.satsCat)} | TEWS: ${_labelOrBlank(_draft.tewsTotal?.toString())}',
            onEdit: () => _jumpToStep(WizardStep.sats),
          ),
          _ReviewCard(
            title: 'Physiology',
            summary:
                'HR: ${_labelOrBlank(_draft.hr?.toString())} | SpO2: ${_labelOrBlank(_draft.spo2?.toString())}',
            onEdit: () => _jumpToStep(WizardStep.physiology),
          ),
          _ReviewCard(
            title: 'Clinical presentation',
            summary: _draft.chiefComplaintVerbatim?.trim().isNotEmpty == true
                ? '${_draft.chiefComplaintVerbatim!} | ${decodeLabel(complaintGroupLabels, _draft.complaintGroup)}'
                : decodeLabel(complaintGroupLabels, _draft.complaintGroup),
            onEdit: () => _jumpToStep(WizardStep.presentation),
          ),
          _ReviewCard(
            title: 'Immediate destination',
            summary: _labelOrBlank(_draft.initialDestination),
            onEdit: () => _jumpToStep(WizardStep.destination),
          ),
          _ReviewCard(
            title: 'Process',
            summary:
                'Clinician: ${_labelOrBlank(_draft.clinicianTime)} | Treatment: ${_labelOrBlank(_draft.treatmentTime)}',
            onEdit: () => _jumpToStep(WizardStep.process),
          ),
          _ReviewCard(
            title: '24-hour outcome',
            summary:
                '${decodeLabel(outcome24Labels, _draft.outcome24)} | ${decodeLabel(outcomeSourceLabels, _draft.outcomeSource)}',
            onEdit: () => _jumpToStep(WizardStep.outcome),
          ),
        ],
        if (widget.mode == AbstractionFlowMode.ra)
          _QuestionCard(
            title: 'Record status',
            variableName: 'status',
            child: _LargeDropdownField<String>(
              value: _draft.status,
              hintText: 'Choose status',
              items: statusOptions
                  .map(
                    (status) => DropdownMenuItem<String>(
                      value: status,
                      child: Text(status),
                    ),
                  )
                  .toList(growable: false),
              onChanged: (value) =>
                  _updateDraft(_draft.copyWith(status: value ?? _draft.status)),
            ),
          ),
      ],
    );
  }

  Widget _buildBooleanClinicalCard({
    required String title,
    required String variableName,
    required bool? value,
    required ValueChanged<bool?> onChanged,
  }) {
    return _QuestionCard(
      title: title,
      variableName: variableName,
      child: _BooleanChoiceField(
        value: value,
        onChanged: onChanged,
      ),
    );
  }

  Widget _numericQuestion({
    required String title,
    required String variable,
    required String? initialValue,
    required ValueChanged<String> onChanged,
    bool integerOnly = false,
  }) {
    return _QuestionCard(
      title: title,
      variableName: variable,
      child: _LargeTextFormField(
        initialValue: initialValue,
        hintText: 'Enter value',
        keyboardType: TextInputType.numberWithOptions(decimal: !integerOnly),
        inputFormatters: [
          FilteringTextInputFormatter.allow(
            RegExp(integerOnly ? r'[0-9]' : r'[0-9.]'),
          ),
        ],
        onChanged: onChanged,
      ),
    );
  }

  String _stepLetter(WizardStep step) {
    switch (step) {
      case WizardStep.eligibility:
        return 'A';
      case WizardStep.patient:
        return 'B';
      case WizardStep.sats:
        return 'C';
      case WizardStep.physiology:
        return 'D';
      case WizardStep.presentation:
        return 'E';
      case WizardStep.destination:
        return 'F';
      case WizardStep.process:
        return 'G';
      case WizardStep.outcome:
        return 'H';
      case WizardStep.review:
        return 'R';
    }
  }

  String _discriminatorLabel(String code) {
    return decodeLabel(discriminatorTypeLabels, code);
  }

  String _labelOrBlank(String? value) =>
      value?.isNotEmpty == true ? value! : 'Not entered';

  Widget _buildManualDestinationFallback() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Approved destination codes could not be loaded from the backend. Enter the approved code manually.',
        ),
        const SizedBox(height: 12),
        _LargeTextFormField(
          controller: _manualDestinationController,
          hintText: 'Enter destination code',
          onChanged: (value) =>
              _updateDraft(_draft.copyWith(initialDestination: value)),
        ),
      ],
    );
  }

  void _jumpToStep(WizardStep step) {
    setState(() {
      _currentStepIndex = _visibleSteps.indexOf(step);
      _validationResult = const StepValidationResult();
    });
  }

  void _goBack() {
    setState(() {
      _currentStepIndex -= 1;
      _validationResult = const StepValidationResult();
    });
  }

  void _goNext() {
    final currentStep = _visibleSteps[_currentStepIndex];
    final validation = validateStep(step: currentStep, draft: _draft);

    setState(() {
      _validationResult = validation;
    });

    if (validation.hasHardErrors) {
      return;
    }

    if (validation.hasSoftWarnings &&
        !_acknowledgedWarnings.contains(currentStep)) {
      return;
    }

    setState(() {
      _validationResult = const StepValidationResult();
      _currentStepIndex += 1;
    });
  }

  Future<void> _completeReviewAction() async {
    if (widget.mode == AbstractionFlowMode.qc) {
      await _submitQcReview();
      return;
    }

    await _saveDraft();
  }

  Future<void> _saveDraft() async {
    final validation = validateStep(step: WizardStep.review, draft: _draft);
    setState(() {
      _validationResult = validation;
    });

    if (validation.hasHardErrors) {
      return;
    }

    setState(() {
      _isSaving = true;
    });

    final now = DateTime.now();
    final studyId = _draft.studyId.trim();
    final computedStatus = _draft.skipsClinicalSections
        ? (_draft.status == 'Excluded' ? 'Excluded' : _draft.status)
        : _draft.status;
    final saveResult = await ref.read(draftRepositoryProvider).saveDraftBundle(
          existingRecordId: _draft.recordId,
          studyId: studyId,
          mode: _draft.mode,
          status: computedStatus,
          now: now,
          initialDestination: _draft.initialDestination?.trim(),
          duplicateFlagsJson: _draft.duplicateFlagsJson,
          currentVersion: _draft.version,
          eligibility: EligibilityEntriesCompanion(
            recordId: drift.Value(_draft.recordId ?? 0),
            studyId: drift.Value(studyId),
            edDate: drift.Value(_draft.edDate),
            edTime: drift.Value(_draft.edTime),
            triageTime: drift.Value(_draft.triageTime),
            age: drift.Value(_draft.age),
            eligible: drift.Value(_draft.eligible),
            exclusionCode: drift.Value(_draft.exclusionCode),
            exclusionReason: drift.Value(_draft.exclusionReason?.trim()),
          ),
          patient: _draft.skipsClinicalSections
              ? null
              : PatientEntriesCompanion(
                  recordId: drift.Value(_draft.recordId ?? 0),
                  studyId: drift.Value(studyId),
                  sex: drift.Value(_draft.sex),
                  referral: drift.Value(_draft.referral),
                  dm: drift.Value(_encodeBinary(_draft.dm)),
                  htn: drift.Value(_encodeBinary(_draft.htn)),
                  asthma: drift.Value(_encodeBinary(_draft.asthma)),
                  epilepsy: drift.Value(_encodeBinary(_draft.epilepsy)),
                  rvd: drift.Value(_encodeBinary(_draft.rvd)),
                  otherComorb: drift.Value(_encodeBinary(_draft.otherComorb)),
                  otherComorbText: drift.Value(_draft.otherComorbText?.trim()),
                  comorbAny: drift.Value(_draft.comorbAny),
                  pregTest:
                      drift.Value(_draft.sex == '1' ? null : _draft.pregTest),
                ),
          sats: _draft.skipsClinicalSections
              ? null
              : SatsEntriesCompanion(
                  recordId: drift.Value(_draft.recordId ?? 0),
                  studyId: drift.Value(studyId),
                  satsCat: drift.Value(_draft.satsCat),
                  tewsTotal: drift.Value(_draft.tewsTotal),
                  discriminatorYes: drift.Value(_draft.discriminatorYes),
                  discriminatorType: drift.Value(_draft.discriminatorType),
                  documentationComplete:
                      drift.Value(_draft.documentationComplete),
                ),
          physiology: _draft.skipsClinicalSections
              ? null
              : PhysiologyEntriesCompanion(
                  recordId: drift.Value(_draft.recordId ?? 0),
                  studyId: drift.Value(studyId),
                  temp: drift.Value(_draft.temp),
                  hr: drift.Value(_draft.hr),
                  rr: drift.Value(_draft.rr),
                  sbp: drift.Value(_draft.sbp),
                  dbp: drift.Value(_draft.dbp),
                  spo2: drift.Value(_draft.spo2),
                  rbs: drift.Value(_draft.rbs),
                  rdt: const drift.Value(null),
                  mobility: drift.Value(_draft.mobility),
                  avpu: drift.Value(_draft.avpu),
                  trauma: drift.Value(_draft.trauma),
                ),
          presentation: _draft.skipsClinicalSections
              ? null
              : PresentationEntriesCompanion(
                  recordId: drift.Value(_draft.recordId ?? 0),
                  studyId: drift.Value(studyId),
                  chiefComplaintVerbatim:
                      drift.Value(_draft.chiefComplaintVerbatim?.trim()),
                  complaintGroup: drift.Value(_draft.complaintGroup),
                  multipleComplaints: drift.Value(_draft.multipleComplaints),
                ),
          process: _draft.skipsClinicalSections
              ? null
              : ProcessEntriesCompanion(
                  recordId: drift.Value(_draft.recordId ?? 0),
                  studyId: drift.Value(studyId),
                  clinicianTime: drift.Value(_draft.clinicianTime),
                  treatmentTime: drift.Value(_draft.treatmentTime),
                ),
          dataQuality: _draft.skipsClinicalSections
              ? null
              : DataQualityEntriesCompanion(
                  recordId: drift.Value(_draft.recordId ?? 0),
                  studyId: drift.Value(studyId),
                  missSats: drift.Value(_draft.spo2 == null),
                  missTews: drift.Value(_draft.tewsTotal == null),
                  missVitals: drift.Value(_missingAnyVitalFields),
                  missOutcome: drift.Value(!_draft.hasCompleteOutcome),
                  sourceConflict: const drift.Value(false),
                  qcRequired: const drift.Value(false),
                ),
          outcome: _draft.skipsClinicalSections
              ? null
              : OutcomeEntriesCompanion(
                  recordId: drift.Value(_draft.recordId ?? 0),
                  studyId: drift.Value(studyId),
                  outcome24: drift.Value(_draft.outcome24),
                  outcomeDatetime: drift.Value(_draft.outcomeDatetime),
                  outcomeSource: drift.Value(_draft.outcomeSource),
                  verified: const drift.Value(false),
                  verifiedBy: const drift.Value(null),
                  verifiedAt: const drift.Value(null),
                ),
        );

    if (!mounted) {
      return;
    }

    setState(() {
      _isSaving = false;
      _draft = _draft.copyWith(
        recordId: saveResult.recordId,
        version: saveResult.version,
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Record saved and queued for sync.')),
    );
    Navigator.of(context).pop();
  }

  Future<void> _submitQcReview() async {
    final validation = validateStep(step: WizardStep.review, draft: _draft);
    setState(() {
      _validationResult = validation;
    });

    if (validation.hasHardErrors) {
      return;
    }

    if (widget.remoteRecordId == null) {
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      final payload = buildRecordPayloadFromDraft(_draft);
      await ref.read(recordsRepositoryProvider).submitQcReabstract(
            recordId: widget.remoteRecordId!,
            values: payload,
          );

      if (!mounted) {
        return;
      }

      Navigator.of(context).pushReplacementNamed(
        AppRouter.qcCompareRoute,
        arguments: QcCompareRouteArgs(
          recordId: widget.remoteRecordId!,
          correctedValues: payload,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  bool get _missingAnyVitalFields =>
      _draft.temp == null ||
      _draft.hr == null ||
      _draft.rr == null ||
      _draft.sbp == null ||
      _draft.dbp == null ||
      _draft.rbs == null;

  String? _encodeBinary(bool? value) {
    if (value == null) {
      return null;
    }
    return value ? '1' : '0';
  }

  void _updateDraft(RaRecordDraft nextDraft) {
    setState(() {
      _draft = nextDraft;
      _validationResult = const StepValidationResult();
    });
  }

  void _applyDraft(RaRecordDraft draft) {
    _studyIdController.text = draft.studyId;
    _exclusionReasonController.text = draft.exclusionReason ?? '';
    _otherComorbTextController.text = draft.otherComorbText ?? '';
    _chiefComplaintController.text = draft.chiefComplaintVerbatim ?? '';
    _manualDestinationController.text = draft.initialDestination ?? '';
    _draft = draft;
  }
}

class _QuestionCard extends StatelessWidget {
  const _QuestionCard({
    required this.title,
    required this.variableName,
    required this.child,
    this.helperText,
  });

  final String title;
  final String variableName;
  final Widget child;
  final String? helperText;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              variableName,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
            if (helperText != null) ...[
              const SizedBox(height: 8),
              Text(helperText!),
            ],
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _ValidationBanner extends StatelessWidget {
  const _ValidationBanner({
    required this.color,
    required this.borderColor,
    required this.title,
    required this.messages,
    this.actionLabel,
    this.onAction,
  });

  final Color color;
  final Color borderColor;
  final String title;
  final List<String> messages;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ...messages.map((message) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text('• $message'),
              )),
          if (actionLabel != null) ...[
            const SizedBox(height: 8),
            FilledButton.tonal(
              onPressed: onAction,
              child: Text(actionLabel!),
            ),
          ],
        ],
      ),
    );
  }
}

class _LargeTextFormField extends StatelessWidget {
  const _LargeTextFormField({
    this.controller,
    this.initialValue,
    this.hintText,
    this.keyboardType,
    this.inputFormatters,
    this.maxLines = 1,
    this.onChanged,
  });

  final TextEditingController? controller;
  final String? initialValue;
  final String? hintText;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final int maxLines;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      initialValue: controller == null ? initialValue : null,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      maxLines: maxLines,
      onChanged: onChanged,
      decoration: InputDecoration(
        hintText: hintText,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 18,
        ),
      ),
    );
  }
}

class _LargeDropdownField<T> extends StatelessWidget {
  const _LargeDropdownField({
    required this.value,
    required this.hintText,
    required this.items,
    required this.onChanged,
    this.enabled = true,
  });

  final T? value;
  final String hintText;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<T>(
      initialValue: value,
      isExpanded: true,
      items: items,
      onChanged: enabled ? onChanged : null,
      decoration: InputDecoration(
        hintText: hintText,
        filled: !enabled,
        fillColor: enabled ? null : const Color(0xFFF5F5F5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
      ),
    );
  }
}

class _BooleanChoiceField extends StatelessWidget {
  const _BooleanChoiceField({
    required this.value,
    required this.onChanged,
  });

  final bool? value;
  final ValueChanged<bool?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _ChoiceButton(
            label: 'Yes',
            selected: value == true,
            onTap: () => onChanged(true),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ChoiceButton(
            label: 'No',
            selected: value == false,
            onTap: () => onChanged(false),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ChoiceButton(
            label: 'Clear',
            selected: value == null,
            onTap: () => onChanged(null),
          ),
        ),
      ],
    );
  }
}

class _ChoiceButton extends StatelessWidget {
  const _ChoiceButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 54,
      child: selected
          ? FilledButton(
              onPressed: onTap,
              child: Text(label),
            )
          : OutlinedButton(
              onPressed: onTap,
              child: Text(label),
            ),
    );
  }
}

class _PickerButton extends StatelessWidget {
  const _PickerButton({
    required this.label,
    required this.onPressed,
  });

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 54,
      child: OutlinedButton(
        onPressed: onPressed,
        child: Align(
          alignment: Alignment.centerLeft,
          child: Text(label),
        ),
      ),
    );
  }
}

class _TimePickerField extends StatelessWidget {
  const _TimePickerField({
    required this.value,
    required this.onChanged,
  });

  final String? value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return _PickerButton(
      label: value ?? 'Choose time',
      onPressed: () async {
        final picked = await showTimePicker(
          context: context,
          initialTime: TimeOfDay.now(),
        );
        if (picked != null) {
          onChanged(
            '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}',
          );
        }
      },
    );
  }
}

class _DateTimePickerField extends StatelessWidget {
  const _DateTimePickerField({
    required this.value,
    required this.onChanged,
  });

  final DateTime? value;
  final ValueChanged<DateTime> onChanged;

  @override
  Widget build(BuildContext context) {
    return _PickerButton(
      label: value == null
          ? 'Choose date and time'
          : DateFormat('dd MMM yyyy HH:mm').format(value!),
      onPressed: () async {
        final pickedDate = await showDatePicker(
          context: context,
          initialDate: value ?? DateTime.now(),
          firstDate: DateTime(2020),
          lastDate: DateTime(2100),
        );
        if (pickedDate == null || !context.mounted) {
          return;
        }
        final pickedTime = await showTimePicker(
          context: context,
          initialTime: TimeOfDay.fromDateTime(value ?? DateTime.now()),
        );
        if (pickedTime == null) {
          return;
        }
        onChanged(
          DateTime(
            pickedDate.year,
            pickedDate.month,
            pickedDate.day,
            pickedTime.hour,
            pickedTime.minute,
          ),
        );
      },
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({
    required this.title,
    required this.summary,
    required this.onEdit,
  });

  final String title;
  final String summary;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        title: Text(title),
        subtitle: Text(summary),
        trailing: TextButton(
          onPressed: onEdit,
          child: const Text('Edit'),
        ),
      ),
    );
  }
}
