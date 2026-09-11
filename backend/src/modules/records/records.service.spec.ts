import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { RecordsService } from './records.service.js';

describe('RecordsService', () => {
  const user = {
    userId: '507f1f77bcf86cd799439011',
    email: 'ra@example.com',
    fullName: 'RA User',
    role: 'RA' as const,
    deviceId: 'device-1',
  };

  function createService() {
    const assignmentModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          ra_id: new Types.ObjectId(user.userId),
          date_range: {
            from: new Date(Date.now() - 60_000),
            to: new Date(Date.now() + 60_000),
          },
          status: 'active',
        } as never),
      }),
      findById: jest.fn(),
    };
    const recordModel = {
      create: jest.fn().mockImplementation(async (record) => ({
        toObject: () => record,
      })),
      findById: jest.fn(),
      find: jest.fn(),
    };

    const service = new RecordsService(
      recordModel as never,
      assignmentModel as never,
      { findOne: jest.fn() } as never,
    );

    return {
      service,
      recordModel,
    };
  }

  it('rejects invalid SpO2 values with a clear 400 response', async () => {
    const { service } = createService();

    await expect(
      service.createDraft(user, {
        study_id: 'STUDY-001',
        mode: 'PILOT',
        physiology: {
          spo2: 101,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns warnings and auto-sets missing flags', async () => {
    const { service, recordModel } = createService();

    const response = await service.createDraft(user, {
      study_id: 'STUDY-002',
      mode: 'PILOT',
      physiology: {
        hr: 200,
      },
    });

    expect(response.warnings).toContain('HR is clinically unusual');

    expect(recordModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data_quality: expect.objectContaining({
          miss_sats: true,
          miss_tews: true,
          miss_vitals: true,
        }),
      }),
    );
  });
});
