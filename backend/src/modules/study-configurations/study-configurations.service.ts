import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { isPiOrAdminRole } from '../../common/auth/role-access.util.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.interface.js';
import { UserModelName } from '../users/schemas/user.schema.js';
import { StudyConfigurationModelName } from './schemas/study-configuration.schema.js';

type StudyConfigurationValue = {
  code: string;
  label: string;
};

type StudyConfigurationRecord = {
  _id: Types.ObjectId;
  key: string;
  values: StudyConfigurationValue[];
  updated_by: Types.ObjectId | null;
  updated_at: Date;
};

type UserRecord = {
  _id: Types.ObjectId;
  full_name: string;
};

const INITIAL_DESTINATION_CODES_KEY = 'initial_destination_codes';

const STARTER_INITIAL_DESTINATION_CODES: StudyConfigurationValue[] = [
  { code: 'Resus', label: 'Resus' },
  { code: 'Surgical ward', label: 'Surgical ward' },
  { code: 'Medical ward', label: 'Medical ward' },
  { code: 'Paediatric ward', label: 'Paediatric ward' },
  { code: 'Obstetric/Gynae ward', label: 'Obstetric/Gynae ward' },
  { code: 'ICU/HDU', label: 'ICU/HDU' },
  { code: 'Operating theatre', label: 'Operating theatre' },
  { code: 'Discharged home', label: 'Discharged home' },
  { code: 'Referred/transferred', label: 'Referred/transferred' },
  { code: 'Mortuary', label: 'Mortuary' },
  { code: 'Other', label: 'Other' },
];

@Injectable()
export class StudyConfigurationsService {
  constructor(
    @InjectModel(StudyConfigurationModelName)
    private readonly configurationModel: Model<StudyConfigurationRecord>,
    @InjectModel(UserModelName)
    private readonly userModel: Model<UserRecord>,
  ) {}

  async getInitialDestinationCodes() {
    const configuration = await this.ensureInitialDestinationConfiguration();
    return this.serialize(configuration);
  }

  async updateInitialDestinationCodes(
    user: AuthenticatedUser,
    payload: { values?: Array<{ code?: string; label?: string }> },
  ) {
    if (!isPiOrAdminRole(user.role)) {
      throw new ForbiddenException(
        'Only PI and ADMIN users may update destination codes',
      );
    }

    const values = this.sanitizeValues(payload?.values ?? []);
    const updatedAt = new Date();

    await this.configurationModel.updateOne(
      { key: INITIAL_DESTINATION_CODES_KEY },
      {
        $set: {
          key: INITIAL_DESTINATION_CODES_KEY,
          values,
          updated_by: new Types.ObjectId(user.userId),
          updated_at: updatedAt,
        },
      },
      { upsert: true },
    );

    const configuration = await this.ensureInitialDestinationConfiguration();
    return this.serialize(configuration);
  }

  private async ensureInitialDestinationConfiguration() {
    const existing = await this.configurationModel
      .findOne({ key: INITIAL_DESTINATION_CODES_KEY })
      .lean();

    if (existing) {
      return existing;
    }

    const created = await this.configurationModel.create({
      key: INITIAL_DESTINATION_CODES_KEY,
      values: STARTER_INITIAL_DESTINATION_CODES,
      updated_by: null,
      updated_at: new Date(),
    });

    return created.toObject();
  }

  private async serialize(configuration: StudyConfigurationRecord) {
    const updatedByName =
      configuration.updated_by instanceof Types.ObjectId
        ? (
            await this.userModel
              .findById(configuration.updated_by, { full_name: 1 })
              .lean()
          )?.full_name ?? null
        : null;

    return {
      key: configuration.key,
      values: configuration.values ?? [],
      updated_by: configuration.updated_by?.toString() ?? null,
      updated_by_name: updatedByName,
      updated_at: configuration.updated_at ?? null,
      pending_pi_approval: configuration.updated_by == null,
    };
  }

  private sanitizeValues(values: Array<{ code?: string; label?: string }>) {
    if (!Array.isArray(values)) {
      throw new BadRequestException('values must be an array');
    }

    const sanitized = values.map((entry, index) => {
      const code = entry?.code?.trim();
      const label = entry?.label?.trim();

      if (!code) {
        throw new BadRequestException(
          `values[${index}].code is required`,
        );
      }

      if (!label) {
        throw new BadRequestException(
          `values[${index}].label is required`,
        );
      }

      return {
        code,
        label,
      };
    });

    const seenCodes = new Set<string>();

    for (const entry of sanitized) {
      const normalizedCode = entry.code.toLowerCase();
      if (seenCodes.has(normalizedCode)) {
        throw new BadRequestException(
          `Duplicate destination code: ${entry.code}`,
        );
      }
      seenCodes.add(normalizedCode);
    }

    return sanitized;
  }
}
